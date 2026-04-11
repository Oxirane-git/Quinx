from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from core.database import get_db
from core.models import User, EmailAccount
from core.security import get_current_user, encrypt_credentials, decrypt_credentials

router = APIRouter()

class EmailAccountCreate(BaseModel):
    provider: str
    host: str = None
    port: int = None
    email: str = None
    app_password: str = None

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "balance": current_user.balance,
        "api_limit": current_user.api_limit
    }

@router.get("/settings/email-accounts")
def get_email_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(EmailAccount).filter(EmailAccount.user_id == current_user.id).all()
    result = []
    for acc in accounts:
        try:
            creds = decrypt_credentials(acc.credentials_json)
            creds["password"] = "••••••••"  # never expose the real password
        except Exception:
            creds = {}
        result.append({
            "id": acc.id,
            "provider": acc.provider,
            "email": creds.get("email", ""),
            "host": creds.get("host", ""),
            "port": creds.get("port", ""),
            "password": creds.get("password", ""),
        })
    return result

@router.post("/settings/email-accounts")
def add_email_account(account: EmailAccountCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    cred_data = {
        "host": account.host,
        "port": account.port,
        "email": account.email,
        "password": account.app_password,
    }
    new_account = EmailAccount(
        user_id=current_user.id,
        provider=account.provider,
        credentials_json=encrypt_credentials(cred_data),
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    return {
        "id": new_account.id,
        "provider": new_account.provider,
        "email": account.email,
        "host": account.host,
        "port": account.port,
        "password": "••••••••",
    }
