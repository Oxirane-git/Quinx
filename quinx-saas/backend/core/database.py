from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

_default_db = "sqlite:///" + os.path.join(os.path.dirname(__file__), "..", "quinx.db")
DATABASE_URL = os.getenv("DATABASE_URL", _default_db)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
