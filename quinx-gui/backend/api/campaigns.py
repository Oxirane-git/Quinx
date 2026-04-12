import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Campaign, Lead, EmailWritten, EmailSent
from core.security import get_current_user

router = APIRouter()

EXPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'exports'))
CONFIGS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'campaign_configs'))
os.makedirs(CONFIGS_DIR, exist_ok=True)


class CampaignConfig(BaseModel):
    filename: str
    campaignName: str
    serviceName: str
    serviceTagline: str = ''
    serviceContext: str = ''
    pricing: str = ''
    serviceWebsite: str = ''
    senderName: str = ''


@router.get("/list")
def list_campaign_configs(current_user: User = Depends(get_current_user)):
    configs = []
    for fname in os.listdir(CONFIGS_DIR):
        if not fname.endswith('.json'):
            continue
        path = os.path.join(CONFIGS_DIR, fname)
        try:
            with open(path, encoding='utf-8') as f:
                data = json.load(f)
            data['filename'] = fname[:-5]  # strip .json
            configs.append(data)
        except Exception:
            pass
    return {"data": configs}


@router.post("/save")
def save_campaign_config(config: CampaignConfig, current_user: User = Depends(get_current_user)):
    safe = config.filename.strip().replace('/', '').replace('\\', '').replace('..', '')
    if not safe:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(CONFIGS_DIR, f"{safe}.json")
    data = config.model_dump()
    data.pop('filename')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
    return {"ok": True}


@router.delete("/config/{filename}")
def delete_campaign_config(filename: str, current_user: User = Depends(get_current_user)):
    safe = filename.strip().replace('/', '').replace('\\', '').replace('..', '')
    path = os.path.join(CONFIGS_DIR, f"{safe}.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Campaign config not found")
    os.remove(path)
    return {"ok": True}


@router.get("/")
def get_campaigns(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).filter(Campaign.user_id == current_user.id).all()
    result = []
    for c in campaigns:
        result.append({
            "id": c.id,
            "name": c.name,
            "niche": c.niche,
            "status": c.status,
            "created_at": c.created_at,
            "has_leads": os.path.exists(os.path.join(EXPORTS_DIR, f"{c.id}_leads.xlsx")),
            "has_emails": os.path.exists(os.path.join(EXPORTS_DIR, f"{c.id}_emails.xlsx")),
        })
    return result


@router.delete("/all")
def delete_all_campaigns(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).filter(Campaign.user_id == current_user.id).all()
    for c in campaigns:
        for lead in c.leads:
            db.query(EmailWritten).filter(EmailWritten.lead_id == lead.id).delete()
            db.query(EmailSent).filter(EmailSent.lead_id == lead.id).delete()
        db.query(Lead).filter(Lead.campaign_id == c.id).delete()
        # Delete export files
        for suffix in ["_leads.xlsx", "_emails.xlsx"]:
            path = os.path.join(EXPORTS_DIR, f"{c.id}{suffix}")
            if os.path.exists(path):
                os.remove(path)
        db.delete(c)
    db.commit()
    return {"ok": True, "deleted": len(campaigns)}


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for lead in campaign.leads:
        db.query(EmailWritten).filter(EmailWritten.lead_id == lead.id).delete()
        db.query(EmailSent).filter(EmailSent.lead_id == lead.id).delete()
    db.query(Lead).filter(Lead.campaign_id == campaign_id).delete()
    for suffix in ["_leads.xlsx", "_emails.xlsx"]:
        path = os.path.join(EXPORTS_DIR, f"{campaign_id}{suffix}")
        if os.path.exists(path):
            os.remove(path)
    db.delete(campaign)
    db.commit()
    return {"ok": True}


@router.get("/{campaign_id}/leads")
def get_campaign_leads(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    leads = db.query(Lead).filter(Lead.campaign_id == campaign.id).all()
    return {"campaign": campaign.name, "leads": leads}


@router.get("/task/{job_id}/status")
def get_task_status(job_id: str, _current_user: User = Depends(get_current_user)):
    from core import task_store
    task = task_store.get(job_id)
    return {
        "job_id": job_id,
        "status": task["status"],
        "result": task["result"],
        "log": task["log"],
    }


@router.get("/{campaign_id}/download/leads")
def download_leads(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    path = os.path.join(EXPORTS_DIR, f"{campaign_id}_leads.xlsx")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Leads file not ready yet")

    safe_name = campaign.name.replace(" ", "_").replace("/", "-")
    return FileResponse(
        path,
        filename=f"{safe_name}_leads.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )


@router.get("/{campaign_id}/download/emails")
def download_emails(campaign_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.user_id == current_user.id
    ).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    path = os.path.join(EXPORTS_DIR, f"{campaign_id}_emails.xlsx")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Emails file not ready yet")

    safe_name = campaign.name.replace(" ", "_").replace("/", "-")
    return FileResponse(
        path,
        filename=f"{safe_name}_emails.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
