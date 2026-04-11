from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import User
from core.security import get_current_user
from core.celery_app import write_task

router = APIRouter()

class WriterConfig(BaseModel):
    campaign_id: int
    from_lead: int
    to_lead: int
    temperature: float = 0.7
    max_tokens: int = 1024
    skip_missing: bool = True

@router.post("/start-task")
def start_writer_task(config: WriterConfig, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate simplistic mock cost
    lead_count = config.to_lead - config.from_lead
    estimated_cost = lead_count * 0.01

    if current_user.balance + estimated_cost > current_user.api_limit:
        raise HTTPException(status_code=400, detail="Estimated cost exceeds Anthropic API spend limit.")

    task = write_task.delay(current_user.id, config.campaign_id, config.model_dump())
    
    return {"job_id": task.id, "estimated_cost": estimated_cost}
