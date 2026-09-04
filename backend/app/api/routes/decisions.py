import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..deps import get_db
from ...models.decision import RecoveryDecision
from ...models.payment import Payment
from ...models.customer import Customer
from ...models.action import RecoveryAction
from ...schemas.payloads import DecisionRecord, CandidateAction, PolicyCheck
from ...schemas.common import CanonicalAction, PaymentMethod, FailureReason, PolicyStatus, ExecutionStatus

router = APIRouter(prefix="/decisions", tags=["Decisions"])

def decision_to_schema(decision: RecoveryDecision, db: Session) -> DecisionRecord:
    payment = decision.payment or db.query(Payment).filter(Payment.id == decision.payment_id).first()
    customer = payment.customer if payment else None
    customer_name = customer.name if customer else "Unknown Customer"
    customer_segment = customer.segment if customer else "SMB"

    # Execution status & recovered amount from latest recovery action
    latest_action = db.query(RecoveryAction).filter(RecoveryAction.decision_id == decision.id).order_by(RecoveryAction.executed_at.desc()).first()
    exec_status = ExecutionStatus(latest_action.execution_status) if latest_action else ExecutionStatus.PENDING
    recovered_amt = latest_action.outcome.recovered_amount if (latest_action and latest_action.outcome) else 0.0

    # Policy checks count
    checks_count = {"passed": 0, "total": len(decision.policy_checks)}
    for pc in decision.policy_checks:
        if pc.status == "passed":
            checks_count["passed"] += 1

    # Candidate actions
    cand_actions = [
        CandidateAction(
            action=CanonicalAction(ca.action),
            label=ca.label,
            probability=ca.estimated_probability,
            expectedRecovery=ca.expected_recovery,
            confidence=ca.confidence,
            isRecommended=ca.is_recommended,
            policyStatus=PolicyStatus(ca.policy_status),
            policyNotes=ca.policy_notes,
        )
        for ca in decision.candidate_actions
    ]

    # Guardrails
    guardrails = [
        PolicyCheck(
            id=g.id,
            ruleName=g.rule_name,
            description=g.description,
            status=g.status,
            detail=g.detail,
        )
        for g in decision.policy_checks
    ]

    structured_exp = json.loads(decision.structured_explanation_json) if decision.structured_explanation_json else None
    snippet = structured_exp.get("aiExplanationSnippet", decision.explanation[:160]) if structured_exp else decision.explanation[:160]

    return DecisionRecord(
        id=decision.id,
        paymentId=decision.payment_id,
        customerName=customer_name,
        customerSegment=customer_segment,
        amount=payment.amount if payment else 0.0,
        recoveryProbability=decision.base_recovery_probability,
        recommendedAction=CanonicalAction(decision.recommended_action),
        actionLabel=decision.action_label,
        expectedRecovery=decision.expected_recovery,
        policyStatus=PolicyStatus(decision.policy_status),
        policyChecksCount=checks_count,
        executionStatus=exec_status,
        recoveredAmount=recovered_amt,
        modelVersion=decision.model_version,
        aiExplanationSnippet=snippet,
        timestamp=decision.created_at.isoformat(),
        failureReason=FailureReason(payment.failure_reason) if payment else None,
        failureCode=payment.failure_code if payment else None,
        paymentMethod=PaymentMethod(payment.payment_method) if payment else None,
        paymentMethodDetails=payment.payment_method_details if payment else None,
        candidateActions=cand_actions,
        guardrails=guardrails,
        structuredExplanation=structured_exp,
    )

@router.get("", response_model=dict)
def list_decisions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    action: Optional[str] = None,
    policy_status: Optional[str] = None,
    execution_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Returns paginated decision log and audit records."""
    query = db.query(RecoveryDecision)

    if action and action != "all":
        query = query.filter(RecoveryDecision.recommended_action == action)
    if policy_status and policy_status != "all":
        query = query.filter(RecoveryDecision.policy_status == policy_status)

    total = query.count()
    decisions = query.order_by(RecoveryDecision.created_at.desc()).offset(skip).limit(limit).all()

    items = [decision_to_schema(d, db) for d in decisions]
    return {"items": items, "total": total}
