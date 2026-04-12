import os
import sys
import uuid
import threading
import subprocess

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.database import get_db, SessionLocal
from core.models import User, Campaign
from core.security import get_current_user
from core import task_store

router = APIRouter()

BASE = os.getenv("QUINX_BASE_DIR", r"C:/Users/Sahil/Desktop/Quinx")
WRITER_DIR = os.path.join(BASE, "Email_Writer")
EXPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'exports'))
CONFIGS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'campaign_configs'))
os.makedirs(EXPORTS_DIR, exist_ok=True)


class WriterConfig(BaseModel):
    campaign_id: int
    from_lead: int = 0
    to_lead: int = 100
    temperature: float = 0.7
    max_tokens: int = 1024
    skip_missing: bool = True
    campaign_config: str = ''


def _run_write(job_id: str, user_id: int, campaign_id: int, config: dict):
    try:
        task_store.update(job_id, "PROGRESS", log="[WRITER] Starting email generation...")

        leads_path = os.path.join(EXPORTS_DIR, f"{campaign_id}_leads.xlsx")
        if not os.path.exists(leads_path):
            raise Exception(f"Leads file not found: {leads_path}. Run the scraper first.")

        output_path = os.path.join(EXPORTS_DIR, f"{campaign_id}_emails.xlsx")

        campaign_slug = config.get('campaign_config', '')
        campaign_config_path = ''
        if campaign_slug:
            cfg_path = os.path.join(CONFIGS_DIR, f"{campaign_slug}.json")
            if os.path.exists(cfg_path):
                campaign_config_path = cfg_path

        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env["PYTHONUTF8"] = "1"

        cmd = [
            sys.executable, "-u",
            os.path.join(WRITER_DIR, "tools", "batch_write_emails.py"),
            "--input", leads_path,
            "--output", output_path,
            "--start-from", str(max(1, config.get('from_lead', 0) + 1)),
        ]
        if campaign_config_path:
            cmd.extend(["--campaign", campaign_config_path])

        proc = subprocess.Popen(
            cmd,
            cwd=WRITER_DIR,
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
            raise Exception("\n".join(log_lines[-20:]) or "Writer exited with non-zero code")

        db = SessionLocal()
        try:
            camp = db.query(Campaign).filter(Campaign.id == campaign_id).first()
            if camp:
                camp.status = "written"
            db.commit()
        finally:
            db.close()

        task_store.update(job_id, "SUCCESS", result={"status": "completed"})

    except Exception as e:
        task_store.update(job_id, "FAILURE", result={"error": str(e)})


@router.post("/stop-task/{job_id}")
def stop_writer_task(job_id: str, current_user: User = Depends(get_current_user)):
    cancelled = task_store.cancel(job_id)
    return {"ok": cancelled}


@router.post("/start-task")
def start_writer_task(config: WriterConfig, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(
        Campaign.id == config.campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    leads_path = os.path.join(EXPORTS_DIR, f"{config.campaign_id}_leads.xlsx")
    if not os.path.exists(leads_path):
        raise HTTPException(status_code=400, detail="No leads file found for this campaign. Run the scraper first.")

    job_id = str(uuid.uuid4())
    task_store.create(job_id)

    thread = threading.Thread(
        target=_run_write,
        args=(job_id, current_user.id, config.campaign_id, config.model_dump()),
        daemon=True
    )
    thread.start()

    return {"job_id": job_id}
