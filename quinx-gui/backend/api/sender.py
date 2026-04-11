from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User, EmailAccount
from core.security import get_current_user
from core.celery_app import send_task

router = APIRouter()

class SenderConfig(BaseModel):
    campaign_id: int
    from_lead: int
    to_lead: int
    account_id: int
    min_delay: int = 15
    max_delay: int = 30

@router.post("/start-task")
def start_sender_task(config: SenderConfig, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(EmailAccount).filter(
        EmailAccount.id == config.account_id, 
        EmailAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found or access denied")
        
    task = send_task.delay(current_user.id, config.campaign_id, config.model_dump())
    
    return {"job_id": task.id}
