from dotenv import load_dotenv
load_dotenv()

import os
os.makedirs(os.path.join(os.path.dirname(__file__), "exports"), exist_ok=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import engine
from core import models
from api import auth, users, scraper, writer, sender, campaigns

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Quinx Outreach Control Panel")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(scraper.router, prefix="/api/scraper", tags=["scraper"])
app.include_router(writer.router, prefix="/api/writer", tags=["writer"])
app.include_router(sender.router, prefix="/api/sender", tags=["sender"])
app.include_router(campaigns.router, prefix="/api/campaigns", tags=["campaigns"])

@app.get("/")
def read_root():
    return {"status": "Quinx SaaS API is running"}
