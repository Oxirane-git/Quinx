from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    hashed_password = Column(String, nullable=False)
    balance = Column(Float, default=0.0)
    api_limit = Column(Float, default=10.0)
    
    email_accounts = relationship("EmailAccount", back_populates="user")
    campaigns = relationship("Campaign", back_populates="user")
    leads = relationship("Lead", back_populates="user")

class EmailAccount(Base):
    __tablename__ = "email_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider = Column(String, nullable=False) # 'smtp' or 'gmail'
    credentials_json = Column(Text, nullable=False) # Encrypted
    
    user = relationship("User", back_populates="email_accounts")

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    niche = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="created")
    
    user = relationship("User", back_populates="campaigns")
    leads = relationship("Lead", back_populates="campaign")

class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    business_name = Column(String)
    email = Column(String)
    city = Column(String)
    status = Column(String, default="scraped")
    
    user = relationship("User", back_populates="leads")
    campaign = relationship("Campaign", back_populates="leads")
    emails_written = relationship("EmailWritten", back_populates="lead")
    emails_sent = relationship("EmailSent", back_populates="lead")

class EmailWritten(Base):
    __tablename__ = "emails_written"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String)
    body = Column(Text)
    status = Column(String, default="draft")
    
    lead = relationship("Lead", back_populates="emails_written")

class EmailSent(Base):
    __tablename__ = "emails_sent"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="pending")
    
    lead = relationship("Lead", back_populates="emails_sent")
