import asyncio
import sys
from typing import List, Optional
from pathlib import Path

# Windows: force ProactorEventLoop so asyncio subprocesses work under uvicorn --reload
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from pydantic import BaseModel

from database import engine, create_db_and_tables, get_session, Campaign, Lead, EmailWritten, EmailSent
from runner import process_manager

# Configure project paths
# Default assumes quinx-gui is a subfolder inside the main Quinx project
BASE_DIR = Path(__file__).resolve().parent.parent.parent
EMAIL_SCRAP_DIR = BASE_DIR / "Email_Scrap"
EMAIL_WRITER_DIR = BASE_DIR / "Email_Writer"
EMAIL_SENDER_DIR = BASE_DIR / "Email_Sender"
LEADS_DIR = BASE_DIR / "Leads"    # Quinx/Leads/ — scraped lead XLSX files
EMAILS_DIR = BASE_DIR / "Emails"  # Quinx/Emails/ — generated email XLSX files

# ---------------------------------------------------------------------------
# App Initialization
# ---------------------------------------------------------------------------

app = FastAPI(title="Quinx Outreach Control Panel")

# Disable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's a local app, allowing all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# ---------------------------------------------------------------------------
# Pydantic Schemas for Requests
# ---------------------------------------------------------------------------

class ScraperRunRequest(BaseModel):
    niche: str
    cities: List[str]
    limit: int
    output_folder: str

class WriterRunRequest(BaseModel):
    input_file: str           # Full path to Quinx/Leads/{Name}_Leads.xlsx
    range_from: int = 1
    range_to: int = 9999
    temperature: float = 0.7
    max_tokens: int = 2048
    checkpoint_every: int = 10
    skip_low_personalization: bool = True
    campaign_context: str = ""  # Free-form product/service description for this campaign
    sign_off: str = ""          # Email sign-off (e.g. "Sahil | Quinx AI\nquinxai.com")

class SenderRunRequest(BaseModel):
    input_file: str           # Full path to Quinx/Emails/{Name}_Emails.xlsx
    min_delay: int = 10
    max_delay: int = 15
    from_email: str = ""
    retry_failed: bool = True
    retry_delay: int = 4
    send_limit: int = 0       # 0 = send all

# ---------------------------------------------------------------------------
# REST Endpoints: Scraper
# ---------------------------------------------------------------------------

@app.post("/api/scraper/run")
async def run_scraper(request: ScraperRunRequest, db: Session = Depends(get_session)):
    if process_manager.is_running("scraper"):
        raise HTTPException(status_code=400, detail="Scraper is already running")
    
    # Store config in DB for tracking
    campaign = Campaign(name=f"{request.niche} Auto-Scrape", niche=request.niche)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    
    # Run the full pipeline: Maps search → email scraping → CSV build → XLSX export
    cmd = [
        "python", "tools/pipeline.py",
        "--niche", request.niche,
        "--cities", ",".join(request.cities),
        "--limit", str(request.limit),
    ]

    # Kick off background task
    asyncio.create_task(
        process_manager.run_command(
            module="scraper",
            cmd=cmd,
            cwd=str(EMAIL_SCRAP_DIR)
        )
    )
    return {"status": "started", "campaign_id": campaign.id}

@app.get("/api/scraper/status")
def scraper_status():
    return {"running": process_manager.is_running("scraper")}

# ---------------------------------------------------------------------------
# REST Endpoints: Leads & Emails file lists
# ---------------------------------------------------------------------------

@app.get("/api/leads/list")
def list_lead_files():
    """Return all *_Leads.xlsx files from Quinx/Leads/ for the Writer dropdown."""
    files = []
    LEADS_DIR.mkdir(parents=True, exist_ok=True)
    for f in sorted(LEADS_DIR.glob("*_Leads.xlsx")):
        display = f.stem.replace("_Leads", "").replace("_", " ")
        files.append({"filename": f.name, "display": display, "path": str(f)})
    return files

@app.get("/api/emails/list")
def list_email_files():
    """Return all *_Emails.xlsx files from Quinx/Emails/ for the Sender dropdown."""
    files = []
    EMAILS_DIR.mkdir(parents=True, exist_ok=True)
    for f in sorted(EMAILS_DIR.glob("*_Emails.xlsx")):
        display = f.stem.replace("_Emails", "").replace("_", " ")
        files.append({"filename": f.name, "display": display, "path": str(f)})
    return files

# ---------------------------------------------------------------------------
# REST Endpoints: Writer
# ---------------------------------------------------------------------------

@app.post("/api/writer/run")
async def run_writer(request: WriterRunRequest):
    if process_manager.is_running("writer"):
        raise HTTPException(status_code=400, detail="Writer is already running")

    # Derive output path: Quinx/Emails/{Name}_Emails.xlsx
    input_path = Path(request.input_file)
    output_filename = input_path.name.replace("_Leads.xlsx", "_Emails.xlsx")
    output_path = str(EMAILS_DIR / output_filename)
    EMAILS_DIR.mkdir(parents=True, exist_ok=True)

    cmd = [
        "python", "tools/batch_write_emails.py",
        "--input", str(request.input_file),
        "--output", output_path,
        "--start-from", str(request.range_from),
    ]
    if request.campaign_context:
        cmd += ["--campaign-context", request.campaign_context]
    if request.sign_off:
        cmd += ["--sign-off", request.sign_off]

    asyncio.create_task(
        process_manager.run_command(
             module="writer",
             cmd=cmd,
             cwd=str(EMAIL_WRITER_DIR)
        )
    )
    return {"status": "started"}

@app.get("/api/writer/status")
def writer_status():
    return {"running": process_manager.is_running("writer")}


# ---------------------------------------------------------------------------
# REST Endpoints: Sender
# ---------------------------------------------------------------------------

@app.post("/api/sender/run")
async def run_sender(request: SenderRunRequest):
    if process_manager.is_running("sender"):
        raise HTTPException(status_code=400, detail="Sender is already running")

    env = {
        "LEADS_FILE": request.input_file,
        "MIN_DELAY": str(request.min_delay),
        "MAX_DELAY": str(request.max_delay),
        "FROM_EMAIL": request.from_email,
        "SEND_LIMIT": str(request.send_limit),
    }

    cmd = ["npm.cmd", "start"]

    asyncio.create_task(
         process_manager.run_command(
             module="sender",
             cmd=cmd,
             cwd=str(EMAIL_SENDER_DIR),
             env=env
         )
    )
    return {"status": "started"}

@app.post("/api/sender/pause")
async def pause_sender():
    # True pause usually requires the subprocess to support it. 
    # For now, we simulate by stopping or implementing a signal.
    await process_manager.stop("sender")
    return {"status": "stopped"}

@app.post("/api/sender/abort")
async def abort_sender():
    await process_manager.stop("sender")
    return {"status": "aborted"}

@app.get("/api/sender/status")
def sender_status():
    return {"running": process_manager.is_running("sender")}

# ---------------------------------------------------------------------------
# REST Endpoints: Logs
# ---------------------------------------------------------------------------

@app.get("/api/logs/campaigns")
def list_campaigns(db: Session = Depends(get_session)):
    campaigns = db.exec(select(Campaign)).all()
    return campaigns

@app.get("/api/logs/campaign/{campaign_id}")
def get_campaign(campaign_id: int, db: Session = Depends(get_session)):
    campaign = db.get(Campaign, campaign_id)
    if not campaign:
       raise HTTPException(status_code=404, detail="Campaign not found")
    # Fetch related stats
    return campaign

@app.get("/api/logs/leads")
def list_leads(db: Session = Depends(get_session)):
    leads = db.exec(select(Lead)).all()
    return leads

@app.post("/api/logs/export")
def export_logs():
    return {"message": "Export function to be implemented"}

# ---------------------------------------------------------------------------
# WebSockets for Terminal Streaming
# ---------------------------------------------------------------------------

@app.websocket("/ws/scraper")
async def websocket_scraper(websocket: WebSocket):
    await process_manager.connect("scraper", websocket)
    try:
        while True:
            # Keep connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        process_manager.disconnect("scraper", websocket)


@app.websocket("/ws/writer")
async def websocket_writer(websocket: WebSocket):
    await process_manager.connect("writer", websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        process_manager.disconnect("writer", websocket)


@app.websocket("/ws/sender")
async def websocket_sender(websocket: WebSocket):
    await process_manager.connect("sender", websocket)
    try:
         while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
         process_manager.disconnect("sender", websocket)
