import os
import sys
import uuid
import threading
import subprocess
import glob
import csv
import re
import openpyxl

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session

from core.database import get_db, SessionLocal
from core.models import User, Campaign, Lead
from core.security import get_current_user
from core import task_store

router = APIRouter()

BASE = os.getenv("QUINX_BASE_DIR", r"C:/Users/Sahil/Desktop/Quinx")
SCRAP_DIR = os.path.join(BASE, "Email_Scrap")
EXPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'exports'))
os.makedirs(EXPORTS_DIR, exist_ok=True)


class ScraperConfig(BaseModel):
    niche: str
    cities: List[str]
    lead_limit: int = 60
    campaign_name: str


def _run_scrape(job_id: str, user_id: int, niche: str, cities: list, lead_limit: int, campaign_id: int):
    try:
        task_store.update(job_id, "PROGRESS", log="[SCRAPER] Starting pipeline...")

        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        proc = subprocess.Popen(
            [sys.executable, "-u", "tools/pipeline.py",
             "--niche", niche,
             "--cities", ",".join(cities),
             "--limit", str(lead_limit)],
            cwd=SCRAP_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            encoding="utf-8",
            errors="replace",
            env=env,
        )
        task_store.set_proc(job_id, proc)

        log_lines = []
        for line in proc.stdout:
            line = line.rstrip()
            if not line:
                continue
            if task_store.get(job_id)["status"] == "CANCELLED":
                proc.kill()
                return
            log_lines.append(line)
            task_store.update(job_id, "PROGRESS", log="\n".join(log_lines[-50:]))

        proc.wait()

        if task_store.get(job_id)["status"] == "CANCELLED":
            return

        if proc.returncode != 0:
            raise Exception("\n".join(log_lines[-20:]) or "Pipeline exited with non-zero code")

        task_store.update(job_id, "PROGRESS", log="[SCRAPER] Importing leads to DB...")

        niche_slug = re.sub(r'[^\w]+', '-', niche.lower()).strip('-')
        csv_pattern = os.path.join(SCRAP_DIR, f".tmp/leads_{niche_slug}_*.csv")
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

        # Save XLSX export
        out_path = os.path.join(EXPORTS_DIR, f"{campaign_id}_leads.xlsx")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Leads"
        headers = ['business_name', 'email', 'phone', 'website', 'city', 'category', 'niche']
        ws.append(headers)
        for row in leads_data:
            ws.append([row.get(h, '') for h in headers])
        wb.save(out_path)

        task_store.update(job_id, "SUCCESS", result={"status": "completed", "leads_found": leads_inserted})

    except Exception as e:
        task_store.update(job_id, "FAILURE", result={"error": str(e)})


@router.post("/stop-task/{job_id}")
def stop_scraper_task(job_id: str, current_user: User = Depends(get_current_user)):
    cancelled = task_store.cancel(job_id)
    return {"ok": cancelled}


@router.post("/start-task")
def start_scraper_task(
    config: ScraperConfig,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_campaign = Campaign(user_id=current_user.id, name=config.campaign_name, niche=config.niche)
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    job_id = str(uuid.uuid4())
    task_store.create(job_id)

    thread = threading.Thread(
        target=_run_scrape,
        args=(job_id, current_user.id, config.niche, config.cities, config.lead_limit, new_campaign.id),
        daemon=True
    )
    thread.start()

    return {"job_id": job_id, "campaign_id": new_campaign.id}
