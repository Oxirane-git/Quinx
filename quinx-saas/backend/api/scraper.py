from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, Campaign
from core.security import get_current_user
from core.celery_app import scrape_task

router = APIRouter()

class ScraperConfig(BaseModel):
    niche: str
    cities: List[str]
    lead_limit: int = 60
    campaign_name: str

@router.post("/start-task")
def start_scraper_task(config: ScraperConfig, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Create campaign
    new_campaign = Campaign(user_id=current_user.id, name=config.campaign_name, niche=config.niche)
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    # Dispatch to Celery
    task = scrape_task.delay(current_user.id, config.niche, config.cities, config.lead_limit, new_campaign.id)
    
    return {"job_id": task.id, "campaign_id": new_campaign.id}
