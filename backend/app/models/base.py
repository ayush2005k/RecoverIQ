from datetime import datetime, timezone
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, DateTime

Base = declarative_base()

def utcnow():
    return datetime.now(timezone.utc)
