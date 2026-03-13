from sqlmodel import SQLModel, Field, create_engine, Session, select
from typing import Optional, List
from datetime import datetime

# ---------------------------------------------------------------------------
# Database Models (SQLModel)
# ---------------------------------------------------------------------------

class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    niche: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="active")  # active, completed, paused

class Lead(SQLModel, table=True):
    __tablename__ = "leads"
    id: Optional[int] = Field(default=None, primary_key=True)
    campaign_id: int = Field(foreign_key="campaigns.id")
    business_name: str
    owner_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    website: Optional[str] = None
    city: str
    category: Optional[str] = None

class EmailWritten(SQLModel, table=True):
    __tablename__ = "emails_written"
    id: Optional[int] = Field(default=None, primary_key=True)
    lead_id: int = Field(foreign_key="leads.id")
    subject: str
    body: str
    personalization_score: Optional[int] = None
    status: str = Field(default="pending") # pending, pass, fail, skip
    written_at: datetime = Field(default_factory=datetime.utcnow)

class EmailSent(SQLModel, table=True):
    __tablename__ = "emails_sent"
    id: Optional[int] = Field(default=None, primary_key=True)
    lead_id: int = Field(foreign_key="leads.id")
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="pending") # pending, sent, failed
    error_message: Optional[str] = None

# ---------------------------------------------------------------------------
# Database Setup
# ---------------------------------------------------------------------------

sqlite_file_name = "quinx_campaigns.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
