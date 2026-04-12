from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models import User
import os
import json
import base64
import hashlib
from cryptography.fernet import Fernet

SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# ---------------------------------------------------------------------------
# Credential encryption (Fernet / AES-128-CBC)
# Key is derived from SECRET_KEY so no extra env var is needed.
# ---------------------------------------------------------------------------
def _fernet() -> Fernet:
    key_bytes = hashlib.sha256(SECRET_KEY.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key_bytes))

def encrypt_credentials(data: dict) -> str:
    """Encrypt a credentials dict and return an opaque string safe to store in DB."""
    return _fernet().encrypt(json.dumps(data).encode()).decode()

def decrypt_credentials(token: str) -> dict:
    """Decrypt a stored credentials string back to a dict."""
    return json.loads(_fernet().decrypt(token.encode()).decode())

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(db: Session = Depends(get_db)):
    # Auth bypassed for testing — returns a dummy user with id=1
    user = db.query(User).first()
    if user is None:
        user = User(id=1, email="dev@quinx.local", name="Dev", hashed_password="")
    return user
