import json
import uuid
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session

from ..models.payment import Payment
from ..models.customer import Customer
from ..models.prediction import RecoveryPrediction
from ..models.decision import RecoveryDecision, CandidateActionScore, PolicyEvaluation
from ..models.audit import AuditLog
from ..schemas.common import CanonicalAction, PolicyStatus
from ..ml.predictor import predict_base_recovery_probability
from .action_scoring import compute_action_probabilities
from .guardrails import evaluate_guardrails
from .explainer import generate_structured_explanation

def run_decision_pipeline(
    db: Session,
    payment_id: str
) -> Tuple[RecoveryDecision, Dict[str, Any]]:
    """
    Executes the full RecoverIQ decision pipeline for a payment:
    Payment -> Feature extraction -> ML base prediction -> 7 candidate action scores ->
    Deterministic guardrails -> Select highest-EV eligible action -> Generate explanation ->
    Persist prediction, decision, candidate scores, policy evaluations, and audit log.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError(f"Payment with ID {payment_id} not found.")

    customer = payment.customer
    if not customer:
        customer = db.query(Customer).filter(Customer.id == payment.customer_id).first()
        if not customer:
            raise ValueError(f"Customer associated with payment {payment_id} not found.")

    # 1. Predict Base ML Recovery Probability
    base_prob, confidence, features = predict_base_recovery_probability(payment, customer)
    model_version = "RecoverIQ-LogReg-v1.0.0"

    # Persist prediction
    pred_id = f"pred_{uuid.uuid4().hex[:8]}"
    prediction_record = RecoveryPrediction(
        id=pred_id,
        payment_id=payment.id,
        model_version=model_version,
        base_recovery_probability=base_prob,
        features_json=json.dumps(features),
    )
    db.add(prediction_record)

    # 2. Derive Action Probabilities and Expected Values for all 7 Canonical Actions
    candidate_actions_raw = compute_action_probabilities(payment, customer, base_prob)

    # 3. Evaluate Guardrails
    guardrails_raw = evaluate_guardrails(payment, customer)

    # 4. Filter Eligible (Non-Blocked) Actions and Select Highest Expected Value (EV)
    eligible_actions = [c for c in candidate_actions_raw if c["policy_status"] != PolicyStatus.BLOCKED]
    if not eligible_actions:
        # Fallback to stop_recovery if all active interventions are blocked
        winning_spec = next(
            (c for c in candidate_actions_raw if c["action"] == CanonicalAction.STOP_RECOVERY),
            candidate_actions_raw[-1]
        )
    else:
        # Sort eligible actions by expected_recovery descending
        eligible_actions.sort(key=lambda x: x["expected_recovery"], reverse=True)
        winning_spec = eligible_actions[0]

    winning_action = winning_spec["action"]

    # Mark is_recommended in candidate actions list and sort by EV
    for c in candidate_actions_raw:
        c["is_recommended"] = (c["action"] == winning_action)

    candidate_actions_raw.sort(
        key=lambda x: (x["is_recommended"], x["expected_recovery"]),
        reverse=True
    )

    # 5. Generate Structured Explanation
    explanation_data = generate_structured_explanation(
        payment=payment,
        customer=customer,
        winning_action=winning_action,
        base_ml_prob=base_prob,
        candidate_actions=candidate_actions_raw
    )

    # 6. Persist Decision Record
    decision_id = f"dec_{payment.id.replace('pay_', '')}"
    
    # Check if existing decision exists; delete or update
    existing_dec = db.query(RecoveryDecision).filter(RecoveryDecision.id == decision_id).first()
    if existing_dec:
        db.delete(existing_dec)
        db.flush()

    decision_record = RecoveryDecision(
        id=decision_id,
        payment_id=payment.id,
        model_version=model_version,
        base_recovery_probability=base_prob,
        recommended_action=winning_action.value,
        action_label=winning_spec["label"],
        expected_recovery=winning_spec["expected_recovery"],
        confidence=confidence,
        policy_status=winning_spec["policy_status"].value,
        explanation=explanation_data["whySelected"],
        structured_explanation_json=json.dumps(explanation_data),
    )
    db.add(decision_record)
    db.flush()

    # 7. Persist Candidate Action Scores
    for c in candidate_actions_raw:
        cas = CandidateActionScore(
            id=f"cas_{uuid.uuid4().hex[:8]}",
            decision_id=decision_id,
            action=c["action"].value,
            label=c["label"],
            estimated_probability=c["probability"],
            expected_recovery=c["expected_recovery"],
            confidence=c["confidence"],
            is_recommended=c["is_recommended"],
            policy_status=c["policy_status"].value,
            policy_notes=c.get("policy_notes"),
        )
        db.add(cas)

    # 8. Persist Policy Evaluations
    for g in guardrails_raw:
        pe = PolicyEvaluation(
            id=f"pe_{uuid.uuid4().hex[:8]}",
            decision_id=decision_id,
            rule_name=g["rule_name"],
            category=g["category"],
            description=g["description"],
            status=g["status"],
            status_label=g["status_label"],
            detail=g["detail"],
        )
        db.add(pe)

    # 9. Persist Audit Log
    audit_log = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:8]}",
        entity_type="decision",
        entity_id=decision_id,
        event_type="decided",
        details_json=json.dumps({
            "payment_id": payment.id,
            "base_ml_recovery_probability": base_prob,
            "winning_action": winning_action.value,
            "expected_recovery": winning_spec["expected_recovery"],
            "policy_status": winning_spec["policy_status"].value,
            "candidate_count": len(candidate_actions_raw),
            "guardrails_evaluated": len(guardrails_raw),
        }),
    )
    db.add(audit_log)

    # Update payment with latest decision metadata
    payment.status = "at_risk" if payment.status in ["failed", "at_risk"] else payment.status

    db.commit()
    db.refresh(decision_record)

    return decision_record, {
        "candidate_actions": candidate_actions_raw,
        "guardrails": guardrails_raw,
        "explanation": explanation_data,
        "features": features,
    }
