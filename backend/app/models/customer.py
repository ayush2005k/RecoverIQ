from sqlalchemy import Column, String, Integer, Float, DateTime
from sqlalchemy.orm import relationship
from .base import Base, utcnow

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    external_customer_id = Column(String, index=True, nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    segment = Column(String, nullable=False, default="SMB")  # Enterprise, Growth, SMB, Retail
    lifetime_value = Column(Float, nullable=False, default=0.0)
    total_payments = Column(Integer, nullable=False, default=0)
    successful_payments = Column(Integer, nullable=False, default=0)
    failed_payments = Column(Integer, nullable=False, default=0)
    historical_recovery_rate = Column(Float, nullable=False, default=0.0)
    avg_recovery_latency_hours = Column(Float, nullable=False, default=0.0)
    retry_fatigue_score = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    payments = relationship("Payment", back_populates="customer", cascade="all, delete-orphan")
