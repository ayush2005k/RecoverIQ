from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base, utcnow

class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=False, index=True)
    merchant_id = Column(String, nullable=False, default="mer_default")
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False, default="INR")
    payment_method = Column(String, nullable=False)  # card, upi, netbanking, mandate, wallet
    payment_method_details = Column(String, nullable=False, default="")
    status = Column(String, nullable=False, default="at_risk", index=True)  # at_risk, recovering, recovered, failed, abandoned
    failure_reason = Column(String, nullable=False, index=True)  # insufficient_funds, technical_glitch, card_expired, auth_timeout, customer_dropoff, mandate_invalid, limit_exceeded
    failure_code = Column(String, nullable=False, default="ERR_GENERIC_DECLINE")
    priority = Column(String, nullable=False, default="medium", index=True)  # critical, high, medium, low
    retry_count = Column(Integer, nullable=False, default=0)
    max_retries_allowed = Column(Integer, nullable=False, default=3)
    failed_at = Column(DateTime, default=utcnow, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    customer = relationship("Customer", back_populates="payments")
    predictions = relationship("RecoveryPrediction", back_populates="payment", cascade="all, delete-orphan")
    decisions = relationship("RecoveryDecision", back_populates="payment", cascade="all, delete-orphan")
