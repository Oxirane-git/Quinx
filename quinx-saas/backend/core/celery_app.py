from celery import Celery
import os

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery(
    "worker",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND
)

celery_app.conf.task_routes = {
    "core.celery_app.scrape_task": "main-queue",
    "core.celery_app.write_task": "main-queue",
    "core.celery_app.send_task": "main-queue",
}


@celery_app.task(bind=True)
def scrape_task(self, user_id: int, niche: str, cities: list, lead_limit: int, campaign_id: int):
    import subprocess, sys, glob, csv, re, openpyxl
    from dotenv import load_dotenv
    from core.database import SessionLocal
    from core.models import Lead, Campaign

    load_dotenv()
    BASE = os.getenv("QUINX_BASE_DIR", r"C:/Users/Sahil/Desktop/Quinx")
    scrap_dir = os.path.join(BASE, "Email_Scrap")

    self.update_state(state='PROGRESS', meta={'log': '[SCRAPER] Starting pipeline...'})

    result = subprocess.run(
        [sys.executable, "tools/pipeline.py",
         "--niche", niche,
         "--cities", ",".join(cities),
         "--limit", str(lead_limit)],
        cwd=scrap_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )

    if result.returncode != 0:
        raise Exception(f"Scraper failed:\n{result.stderr[-1000:]}")

    self.update_state(state='PROGRESS', meta={'log': '[SCRAPER] Importing leads to DB...'})

    niche_slug = re.sub(r'[^\w]+', '-', niche.lower()).strip('-')
    csv_pattern = os.path.join(scrap_dir, f".tmp/leads_{niche_slug}_*.csv")
    csv_files = sorted(glob.glob(csv_pattern), key=os.path.getmtime, reverse=True)

    leads_data = []
    leads_inserted = 0

    db = SessionLocal()
    try:
        camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if camp:
            camp.status = "scraped"

        if csv_files:
            with open(csv_files[0], encoding='utf-8', errors='replace') as f:
                for row in csv.DictReader(f):
                    if not row.get('email', '').strip():
                        continue
                    exists = db.query(Lead).filter(
                        Lead.campaign_id == campaign_id,
                        Lead.email == row['email'].strip()
                    ).first()
                    if not exists:
                        db.add(Lead(
                            campaign_id=campaign_id,
                            user_id=user_id,
                            business_name=row.get('business_name', ''),
                            email=row['email'].strip(),
                            city=row.get('city', ''),
                            status='scraped'
                        ))
                        leads_data.append(row)
                        leads_inserted += 1
        db.commit()
    finally:
        db.close()

    # Save XLSX export to exports/
    exports_dir = os.path.join(os.path.dirname(__file__), '..', 'exports')
    os.makedirs(exports_dir, exist_ok=True)
    out_path = os.path.abspath(os.path.join(exports_dir, f"{campaign_id}_leads.xlsx"))

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Leads"
    headers = ['business_name', 'email', 'phone', 'website', 'city', 'category', 'niche']
    ws.append(headers)
    for row in leads_data:
        ws.append([row.get(h, '') for h in headers])
    wb.save(out_path)

    return {"status": "completed", "leads_found": leads_inserted}


@celery_app.task(bind=True)
def write_task(self, user_id: int, campaign_id: int, _config: dict):
    import subprocess, sys, tempfile, openpyxl
    from dotenv import load_dotenv
    from core.database import SessionLocal
    from core.models import Lead, EmailWritten, Campaign

    load_dotenv()
    BASE = os.getenv("QUINX_BASE_DIR", r"C:/Users/Sahil/Desktop/Quinx")
    writer_dir = os.path.join(BASE, "Email_Writer")

    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'log': '[WRITER] Loading leads from DB...'})

        leads = db.query(Lead).filter(
            Lead.campaign_id == campaign_id,
            Lead.user_id == user_id,
            Lead.status == 'scraped'
        ).all()

        if not leads:
            return {"status": "completed", "emails_written": 0, "reason": "No scraped leads found"}

        # Write input XLSX for batch_write_emails.py into Email_Writer/leads/
        leads_input_dir = os.path.join(writer_dir, "leads")
        os.makedirs(leads_input_dir, exist_ok=True)
        tmp_leads = tempfile.NamedTemporaryFile(suffix='.xlsx', dir=leads_input_dir, delete=False)
        tmp_leads.close()

        wb_in = openpyxl.Workbook()
        ws_in = wb_in.active
        ws_in.append(['business_name', 'email', 'phone', 'website', 'city', 'category', 'niche', 'owner_name'])
        for lead in leads:
            ws_in.append([lead.business_name or '', lead.email or '', '', '', lead.city or '', '', '', ''])
        wb_in.save(tmp_leads.name)

        # Output path: exports/{campaign_id}_emails.xlsx
        exports_dir = os.path.join(os.path.dirname(__file__), '..', 'exports')
        os.makedirs(exports_dir, exist_ok=True)
        out_path = os.path.abspath(os.path.join(exports_dir, f"{campaign_id}_emails.xlsx"))

        self.update_state(state='PROGRESS', meta={'log': f'[WRITER] Generating emails for {len(leads)} leads via OpenRouter...'})

        proc = subprocess.run(
            [sys.executable, "tools/batch_write_emails.py",
             "--input", tmp_leads.name,
             "--output", out_path],
            cwd=writer_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        if proc.returncode != 0 and not os.path.exists(out_path):
            raise Exception(f"Email writer failed:\n{proc.stderr[-1000:]}")

        emails_written = 0
        if os.path.exists(out_path):
            wb_out = openpyxl.load_workbook(out_path)
            ws_out = wb_out.active
            out_headers = [c.value for c in ws_out[1]]

            camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if camp:
                camp.status = "emails_written"

            for row in ws_out.iter_rows(min_row=2, values_only=True):
                row_dict = dict(zip(out_headers, row))
                if row_dict.get('status') != 'ready_to_send':
                    continue
                lead = db.query(Lead).filter(
                    Lead.campaign_id == campaign_id,
                    Lead.email == row_dict.get('email')
                ).first()
                if lead:
                    db.add(EmailWritten(
                        lead_id=lead.id,
                        user_id=user_id,
                        subject=row_dict.get('subject', ''),
                        body=row_dict.get('body', ''),
                        status='ready_to_send'
                    ))
                    lead.status = 'email_written'
                    emails_written += 1
            db.commit()

        try:
            os.unlink(tmp_leads.name)
        except OSError:
            pass

    finally:
        db.close()

    return {"status": "completed", "emails_written": emails_written}


@celery_app.task(bind=True)
def send_task(self, user_id: int, campaign_id: int, config: dict):
    import subprocess, tempfile, openpyxl
    from dotenv import load_dotenv
    from core.database import SessionLocal
    from core.models import Lead, EmailWritten, EmailSent, EmailAccount, Campaign
    from core.security import decrypt_credentials

    load_dotenv()
    BASE = os.getenv("QUINX_BASE_DIR", r"C:/Users/Sahil/Desktop/Quinx")
    sender_dir = os.path.join(BASE, "Email_Sender")

    db = SessionLocal()
    try:
        self.update_state(state='PROGRESS', meta={'log': '[SENDER] Loading email credentials...'})

        account = db.query(EmailAccount).filter(
            EmailAccount.id == config['account_id'],
            EmailAccount.user_id == user_id
        ).first()

        if not account:
            raise Exception("Email account not found")

        creds = decrypt_credentials(account.credentials_json)
        smtp_email = creds.get('email') or creds.get('username', '')
        smtp_password = creds.get('password', '')

        emails = db.query(EmailWritten).join(Lead).filter(
            Lead.campaign_id == campaign_id,
            EmailWritten.user_id == user_id,
            EmailWritten.status == 'ready_to_send'
        ).all()

        if not emails:
            return {"status": "completed", "emails_sent": 0, "reason": "No ready emails found"}

        self.update_state(state='PROGRESS', meta={'log': f'[SENDER] Preparing {len(emails)} emails...'})

        tmp_file = tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False)
        tmp_file.close()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(['email', 'subject', 'body', 'status'])
        for ew in emails:
            ws.append([ew.lead.email, ew.subject, ew.body, 'ready_to_send'])
        wb.save(tmp_file.name)

        self.update_state(state='PROGRESS', meta={'log': '[SENDER] Connecting to SMTP and sending...'})

        result = subprocess.run(
            ["node", "src/index.js"],
            cwd=sender_dir,
            env={**os.environ,
                 "HOSTINGER_EMAIL": smtp_email,
                 "HOSTINGER_PASSWORD": smtp_password,
                 "LEADS_FILE": tmp_file.name},
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )

        emails_sent = 0
        camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
        if camp:
            camp.status = "sent"

        success = result.returncode == 0
        for ew in emails:
            db.add(EmailSent(
                lead_id=ew.lead_id,
                user_id=user_id,
                status='sent' if success else 'failed'
            ))
            ew.lead.status = 'sent' if success else 'bounced'
            if success:
                emails_sent += 1
        db.commit()

        try:
            os.unlink(tmp_file.name)
        except OSError:
            pass

    finally:
        db.close()

    return {"status": "completed", "emails_sent": emails_sent}
