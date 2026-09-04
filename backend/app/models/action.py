from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base, utcnow

class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(String, primary_key=True, index=True)
    decision_id = Column(String, ForeignKey("recovery_decisions.id"), nullable=False, index=True)
    action_type = Column(String, nullable=False)
    execution_status = Column(String, nullable=False, default="pending")  # pending, succeeded, failed, scheduled, skipped
    executed_at = Column(DateTime, default=utcnow, nullable=False)
    external_reference = Column(String, nullable=True)  # e.g. sim_tx_pay9F8aK29x_5819
    execution_logs_json = Column(Text, nullable=True)  # list of log strings

    decision = relationship("RecoveryDecision", back_populates="actions")
    outcome = relationship("RecoveryOutcome", back_populates="action", uselist=False, cascade="all, delete-orphan")

class RecoveryOutcome(Base):
    __tablename__ = "recovery_outcomes"

    id = Column(String, primary_key=True, index=True)
    action_id = Column(String, ForeignKey("recovery_actions.id"), unique=True, nullable=False, index=True)
    recovered = Column(Boolean, nullable=False, default=False)
    recovered_amount = Column(Float, nullable=False, default=0.0)
    recovery_time_minutes = Column(Integer, nullable=True)
    recorded_at = Column(DateTime, default=utcnow, nullable=False)

    action = relationship("RecoveryAction", back_populates="outcome")
