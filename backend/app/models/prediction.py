from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base, utcnow

class RecoveryPrediction(Base):
    __tablename__ = "recovery_predictions"

    id = Column(String, primary_key=True, index=True)
    payment_id = Column(String, ForeignKey("payments.id"), nullable=False, index=True)
    model_version = Column(String, nullable=False)
    base_recovery_probability = Column(Float, nullable=False)
    features_json = Column(Text, nullable=True)  # Serialized feature dictionary
    predicted_at = Column(DateTime, default=utcnow, nullable=False)

    payment = relationship("Payment", back_populates="predictions")
