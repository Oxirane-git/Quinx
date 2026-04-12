import os
import uuid
import threading
import subprocess

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db, SessionLocal
from core.models import User, Campaign, EmailAccount
from core.security import get_current_user, decrypt_credentials
from core import task_store

router = APIRouter()

BASE = os.getenv("QUINX_BASE_DIR", r"C:/Users/Sahil/Desktop/Quinx")
SENDER_DIR = os.path.join(BASE, "Email_Sender")
EXPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'exports'))
os.makedirs(EXPORTS_DIR, exist_ok=True)


class SenderConfig(BaseModel):
    campaign_id: int
    from_lead: int = 0
    to_lead: int = 100
    account_id: int
    min_delay: int = 15
    max_delay: int = 30


def _run_send(job_id: str, campaign_id: int, smtp_email: str, smtp_password: str,
              smtp_host: str, smtp_port: int, min_delay: int, max_delay: int):
    try:
        task_store.update(job_id, "PROGRESS", log="[SENDER] Starting email dispatch...")

        emails_path = os.path.join(EXPORTS_DIR, f"{campaign_id}_emails.xlsx")
        if not os.path.exists(emails_path):
            raise Exception(f"Emails file not found: {emails_path}. Run the writer first.")

        env = os.environ.copy()
        env["HOSTINGER_EMAIL"] = smtp_email
        env["HOSTINGER_PASSWORD"] = smtp_password
        env["LEADS_FILE"] = emails_path
        if smtp_host:
            env["SMTP_HOST"] = smtp_host
        if smtp_port:
            env["SMTP_PORT"] = str(smtp_port)
        env["MIN_DELAY"] = str(min_delay)
        env["MAX_DELAY"] = str(max_delay)

        proc = subprocess.Popen(
            ["node", "src/index.js"],
            cwd=SENDER_DIR,
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
            raise Exception("\n".join(log_lines[-20:]) or "Sender exited with non-zero code")

        db = SessionLocal()
        try:
            camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if camp:
                camp.status = "sent"
            db.commit()
        finally:
            db.close()

        task_store.update(job_id, "SUCCESS", result={"status": "completed"})

    except Exception as e:
        task_store.update(job_id, "FAILURE", result={"error": str(e)})


@router.post("/stop-task/{job_id}")
def stop_sender_task(job_id: str, current_user: User = Depends(get_current_user)):
    cancelled = task_store.cancel(job_id)
    return {"ok": cancelled}


@router.post("/start-task")
def start_sender_task(config: SenderConfig, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(EmailAccount).filter(
        EmailAccount.id == config.account_id,
        EmailAccount.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found or access denied")

    emails_path = os.path.join(EXPORTS_DIR, f"{config.campaign_id}_emails.xlsx")
    if not os.path.exists(emails_path):
        raise HTTPException(status_code=400, detail="No emails file found for this campaign. Run the writer first.")

    try:
        creds = decrypt_credentials(account.credentials_json)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt account credentials")

    job_id = str(uuid.uuid4())
    task_store.create(job_id)

    thread = threading.Thread(
        target=_run_send,
        args=(
            job_id,
            config.campaign_id,
            creds.get("email", ""),
            creds.get("password", ""),
            creds.get("host", ""),
            int(creds.get("port", 465)),
            config.min_delay,
            config.max_delay,
        ),
        daemon=True
    )
    thread.start()

    return {"job_id": job_id}
