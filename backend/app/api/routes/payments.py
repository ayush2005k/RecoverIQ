import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import timezone

from ..deps import get_db
from ...models.payment import Payment
from ...models.customer import Customer
from ...models.decision import RecoveryDecision
from ...models.action import RecoveryAction
from ...models.prediction import RecoveryPrediction
from ...schemas.payloads import (
    PaymentRecord,
    CustomerContext,
    CandidateAction,
    PolicyCheck,
    ScoreResponse,
    DecideResponse,
    ExecuteResponse,
    ExecuteRequest,
)
from ...schemas.common import CanonicalAction, PaymentMethod, FailureReason, PriorityLevel, PaymentStatus, PolicyStatus, ExecutionStatus
from ...ml.predictor import predict_base_recovery_probability
from ...engine.orchestrator import run_decision_pipeline
from ...simulation.simulator import simulate_action_execution

router = APIRouter(prefix="/payments", tags=["Payments"])

def payment_to_schema(payment: Payment, db: Session) -> PaymentRecord:
    cust = payment.customer or db.query(Customer).filter(Customer.id == payment.customer_id).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found for payment.")

    customer_ctx = CustomerContext(
        customerId=cust.id,
        customerName=cust.name,
        email=cust.email,
        segment=cust.segment,
        lifetimeValue=cust.lifetime_value,
        totalSuccessfulPayments=cust.successful_payments,
        totalFailedPayments=cust.failed_payments,
        historicalRecoveryRate=cust.historical_recovery_rate,
        avgRecoveryLatencyHours=cust.avg_recovery_latency_hours,
        retryFatigueScore=cust.retry_fatigue_score,
    )

    # Latest decision if any
    decision = db.query(RecoveryDecision).filter(RecoveryDecision.payment_id == payment.id).order_by(RecoveryDecision.created_at.desc()).first()
    
    cand_actions_list = None
    guardrails_list = None
    ai_explanation = None
    structured_exp = None
    rec_action = CanonicalAction.RETRY_LATER
    rec_ev = round(payment.amount * 0.70, 2)
    base_prob = 0.65

    if decision:
        base_prob = decision.base_recovery_probability
        rec_action = CanonicalAction(decision.recommended_action)
        rec_ev = decision.expected_recovery
        ai_explanation = decision.explanation
        if decision.structured_explanation_json:
            try:
                structured_exp = json.loads(decision.structured_explanation_json)
            except Exception:
                pass

        # Candidate actions
        cand_actions_list = [
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
        guardrails_list = [
            PolicyCheck(
                id=pe.id,
                ruleName=pe.rule_name,
                description=pe.description,
                status=pe.status,
                detail=pe.detail,
            )
            for pe in decision.policy_checks
        ]
    else:
        # If no persisted decision yet, predict base prob
        pred = db.query(RecoveryPrediction).filter(RecoveryPrediction.payment_id == payment.id).first()
        if pred:
            base_prob = pred.base_recovery_probability
        else:
            base_prob, _, _ = predict_base_recovery_probability(payment, cust)

    # Execution status
    latest_action = db.query(RecoveryAction).join(RecoveryDecision).filter(RecoveryDecision.payment_id == payment.id).order_by(RecoveryAction.executed_at.desc()).first()
    exec_status = ExecutionStatus(latest_action.execution_status) if latest_action else None
    recovered_amount = latest_action.outcome.recovered_amount if (latest_action and latest_action.outcome) else None

    failed_at_str = payment.failed_at.isoformat() if payment.failed_at else ""

    return PaymentRecord(
        id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        customer=customer_ctx,
        paymentMethod=PaymentMethod(payment.payment_method),
        paymentMethodDetails=payment.payment_method_details,
        failureReason=FailureReason(payment.failure_reason),
        failureCode=payment.failure_code,
        failedAt=failed_at_str,
        recoveryProbability=base_prob,
        expectedRecoveryValue=rec_ev,
        recommendedAction=rec_action,
        priority=PriorityLevel(payment.priority),
        status=PaymentStatus(payment.status),
        retryCount=payment.retry_count,
        maxRetriesAllowed=payment.max_retries_allowed,
        aiExplanation=ai_explanation,
        candidateActions=cand_actions_list,
        guardrails=guardrails_list,
        executionStatus=exec_status,
        recoveredAmount=recovered_amount,
        structuredExplanation=structured_exp,
    )

@router.get("", response_model=dict)
def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    failure_reason: Optional[str] = None,
    payment_method: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List paginated payments with optional filtering."""
    query = db.query(Payment)

    if status and status != "all":
        query = query.filter(Payment.status == status)
    if priority and priority != "all":
        query = query.filter(Payment.priority == priority)
    if failure_reason and failure_reason != "all":
        query = query.filter(Payment.failure_reason == failure_reason)
    if payment_method and payment_method != "all":
        query = query.filter(Payment.payment_method == payment_method)

    total = query.count()
    payments = query.order_by(Payment.failed_at.desc()).offset(skip).limit(limit).all()

    items = [payment_to_schema(p, db) for p in payments]
    return {"items": items, "total": total}

@router.get("/{payment_id}", response_model=PaymentRecord)
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    """Retrieve full payment intelligence record by ID."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment '{payment_id}' not found.")
    
    # If decisions are missing for this payment, auto-run decision pipeline so complete matrix is available
    decision = db.query(RecoveryDecision).filter(RecoveryDecision.payment_id == payment_id).first()
    if not decision:
        run_decision_pipeline(db, payment_id)

    return payment_to_schema(payment, db)

@router.post("/{payment_id}/score", response_model=ScoreResponse)
def score_payment(payment_id: str, db: Session = Depends(get_db)):
    """Computes base ML recovery probability for the specified payment."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment '{payment_id}' not found.")
    customer = payment.customer
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")

    prob, conf, features = predict_base_recovery_probability(payment, customer)

    return ScoreResponse(
        paymentId=payment.id,
        modelVersion="RecoverIQ-LogReg-v1.0.0",
        baseRecoveryProbability=prob,
        predictedAt=payment.failed_at.isoformat(),
        features=features,
    )

@router.post("/{payment_id}/decide", response_model=DecideResponse)
def decide_payment(payment_id: str, db: Session = Depends(get_db)):
    """Evaluates all 7 canonical candidate actions, evaluates guardrails, and selects winning action."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail=f"Payment '{payment_id}' not found.")

    decision, extra = run_decision_pipeline(db, payment_id)

    cand_actions = [
        CandidateAction(
            action=CanonicalAction(ca["action"]),
            label=ca["label"],
            probability=ca["probability"],
            expectedRecovery=ca["expected_recovery"],
            confidence=ca["confidence"],
            isRecommended=ca["is_recommended"],
            policyStatus=PolicyStatus(ca["policy_status"]),
            policyNotes=ca.get("policy_notes"),
        )
        for ca in extra["candidate_actions"]
    ]

    guardrails = [
        PolicyCheck(
            id=g["id"],
            ruleName=g["rule_name"],
            description=g["description"],
            status=g["status"],
            detail=g["detail"],
        )
        for g in extra["guardrails"]
    ]

    return DecideResponse(
        decisionId=decision.id,
        paymentId=decision.payment_id,
        modelVersion=decision.model_version,
        baseRecoveryProbability=decision.base_recovery_probability,
        recommendedAction=CanonicalAction(decision.recommended_action),
        actionLabel=decision.action_label,
        expectedRecoveryValue=decision.expected_recovery,
        policyStatus=PolicyStatus(decision.policy_status),
        candidateActions=cand_actions,
        guardrails=guardrails,
        structuredExplanation=extra["explanation"],
        aiExplanationSnippet=extra["explanation"].get("aiExplanationSnippet", decision.explanation),
        timestamp=decision.created_at.isoformat(),
    )

@router.post("/{payment_id}/execute", response_model=ExecuteResponse)
def execute_payment_simulation(
    payment_id: str,
    payload: Optional[ExecuteRequest] = None,
    action_type: Optional[CanonicalAction] = None,
    db: Session = Depends(get_db),
):
    """Simulates execution on synthetic payment rail (zero real money movement)."""
    target = (payload.action_type if payload and payload.action_type else None) or action_type
    try:
        result = simulate_action_execution(db, payment_id, action_type=target)
        return ExecuteResponse(
            actionId=result["action_id"],
            decisionId=result["decision_id"],
            paymentId=result["payment_id"],
            actionType=CanonicalAction(result["action_type"]),
            executionStatus=ExecutionStatus(result["execution_status"]),
            simulatedReference=result["simulated_reference"],
            recovered=result["recovered"],
            recoveredAmount=result["recovered_amount"],
            executionLogs=result["execution_logs"],
            executedAt=result["executed_at"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
