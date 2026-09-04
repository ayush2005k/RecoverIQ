from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base, utcnow

class RecoveryDecision(Base):
    __tablename__ = "recovery_decisions"

    id = Column(String, primary_key=True, index=True)
    payment_id = Column(String, ForeignKey("payments.id"), nullable=False, index=True)
    model_version = Column(String, nullable=False)
    base_recovery_probability = Column(Float, nullable=False)
    recommended_action = Column(String, nullable=False)  # One of the 7 canonical actions
    action_label = Column(String, nullable=False)
    expected_recovery = Column(Float, nullable=False)
    confidence = Column(Float, nullable=False, default=0.90)
    policy_status = Column(String, nullable=False)  # satisfied, restricted, blocked
    explanation = Column(Text, nullable=False)
    structured_explanation_json = Column(Text, nullable=True)  # JSON with whySelected, importantFactors, alternativesTradeoffs
    created_at = Column(DateTime, default=utcnow, nullable=False)

    payment = relationship("Payment", back_populates="decisions")
    candidate_actions = relationship("CandidateActionScore", back_populates="decision", cascade="all, delete-orphan")
    policy_checks = relationship("PolicyEvaluation", back_populates="decision", cascade="all, delete-orphan")
    actions = relationship("RecoveryAction", back_populates="decision", cascade="all, delete-orphan")

class CandidateActionScore(Base):
    __tablename__ = "candidate_action_scores"

    id = Column(String, primary_key=True, index=True)
    decision_id = Column(String, ForeignKey("recovery_decisions.id"), nullable=False, index=True)
    action = Column(String, nullable=False)  # Canonical action name
    label = Column(String, nullable=False)
    estimated_probability = Column(Float, nullable=False)  # Derived action-specific probability
    expected_recovery = Column(Float, nullable=False)  # Amount * estimated_probability
    confidence = Column(Float, nullable=False, default=0.85)
    is_recommended = Column(Boolean, nullable=False, default=False)
    policy_status = Column(String, nullable=False)  # satisfied, restricted, blocked
    policy_notes = Column(Text, nullable=True)

    decision = relationship("RecoveryDecision", back_populates="candidate_actions")

class PolicyEvaluation(Base):
    __tablename__ = "policy_evaluations"

    id = Column(String, primary_key=True, index=True)
    decision_id = Column(String, ForeignKey("recovery_decisions.id"), nullable=False, index=True)
    rule_name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # retry_limit, recovery_window, contact_cooldown, method_eligibility, amount_risk
    description = Column(Text, nullable=False)
    status = Column(String, nullable=False)  # passed, warning, failed
    status_label = Column(String, nullable=False)  # PASS, RESTRICTED, BLOCK
    detail = Column(Text, nullable=False)

    decision = relationship("RecoveryDecision", back_populates="policy_checks")
