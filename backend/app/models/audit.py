from sqlalchemy import Column, String, DateTime, Text
from .base import Base, utcnow

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, index=True)
    entity_type = Column(String, nullable=False, index=True)  # payment, decision, action, outcome, model, policy
    entity_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)
    details_json = Column(Text, nullable=False)  # JSON payload
    created_at = Column(DateTime, default=utcnow, nullable=False)
