import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Campaign, Lead
from core.security import get_current_user

router = APIRouter()

EXPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'exports'))


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
    from core.celery_app import celery_app
    res = celery_app.AsyncResult(job_id)
    return {
        "job_id": job_id,
        "status": res.status,
        "result": res.result if res.ready() else None
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
