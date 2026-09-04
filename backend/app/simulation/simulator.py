import json
import random
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models.payment import Payment
from ..models.decision import RecoveryDecision, CandidateActionScore
from ..models.action import RecoveryAction, RecoveryOutcome
from ..models.audit import AuditLog
from ..schemas.common import CanonicalAction, PolicyStatus, ExecutionStatus
from ..engine.orchestrator import run_decision_pipeline

def simulate_action_execution(
    db: Session,
    payment_id: str,
    action_type: Optional[CanonicalAction] = None,
    force_outcome: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Simulates recovery execution on a synthetic payment rail.
    Strictly test-mode; zero production funds movement.
    
    Validates policy guardrails, creates RecoveryAction and RecoveryOutcome records,
    updates payment status, and logs immutable audit records.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise ValueError(f"Payment {payment_id} not found.")

    # Find or create decision
    decision = db.query(RecoveryDecision).filter(RecoveryDecision.payment_id == payment_id).first()
    if not decision:
        decision, _ = run_decision_pipeline(db, payment_id)

    # Determine action to simulate
    target_action = action_type.value if action_type else decision.recommended_action

    # Find candidate action score & policy status
    cand = (
        db.query(CandidateActionScore)
        .filter(
            CandidateActionScore.decision_id == decision.id,
            CandidateActionScore.action == target_action
        )
        .first()
    )

    if not cand:
        # If candidate action score record missing, check policy directly
        if target_action == CanonicalAction.STOP_RECOVERY.value:
            pol_status = PolicyStatus.SATISFIED.value
            prob = 0.0
        else:
            pol_status = decision.policy_status
            prob = decision.expected_recovery / max(1.0, payment.amount)
    else:
        pol_status = cand.policy_status
        prob = cand.estimated_probability

    # Pre-flight guardrail enforcement: BLOCKED actions cannot be executed
    if pol_status == PolicyStatus.BLOCKED.value:
        raise ValueError(f"Action '{target_action}' is BLOCKED by deterministic policy guardrails and cannot be executed.")

    now = datetime.now(timezone.utc)
    ref_id = f"sim_tx_{payment.id.replace('pay_', '')}_{random.randint(1000, 9999)}"
    
    logs = [
        f"[{now.isoformat()}] Initiating simulated execution for action: [{target_action}].",
        f"[{now.isoformat()}] Pre-flight guardrails verified (Status: {pol_status.upper()}).",
        f"[{now.isoformat()}] Constructing simulated acquirer payload (Amount: ₹{payment.amount:,.2f}, Ref: {ref_id}).",
    ]

    # Probabilistic outcome determination
    if force_outcome is not None:
        will_succeed = force_outcome
    elif target_action == CanonicalAction.STOP_RECOVERY.value:
        will_succeed = False
    else:
        # Realistic outcome draw aligned with estimated probability
        will_succeed = (random.random() < prob)

    if will_succeed:
        exec_status = ExecutionStatus.SUCCEEDED
        recovered = True
        recovered_amount = payment.amount
        recovery_time_mins = random.randint(15, 360)
        logs.append(f"[{datetime.now(timezone.utc).isoformat()}] Simulated Gateway Response: HTTP 200 OK — Capture Authorized & Settled.")
        logs.append(f"[{datetime.now(timezone.utc).isoformat()}] Transaction {ref_id} successfully recovered ₹{payment.amount:,.2f}.")
        payment.status = "recovered"
    else:
        exec_status = ExecutionStatus.FAILED
        recovered = False
        recovered_amount = 0.0
        recovery_time_mins = None
        logs.append(f"[{datetime.now(timezone.utc).isoformat()}] Simulated Gateway Response: HTTP 402 Decline — Rail rejected representation.")
        logs.append(f"[{datetime.now(timezone.utc).isoformat()}] Zero funds recovered. Action logged for secondary escalation.")
        payment.retry_count += 1
        if payment.retry_count >= payment.max_retries_allowed:
            payment.status = "abandoned"
        else:
            payment.status = "failed"

    # Persist RecoveryAction
    action_id = f"act_{uuid.uuid4().hex[:8]}"
    action_record = RecoveryAction(
        id=action_id,
        decision_id=decision.id,
        action_type=target_action,
        execution_status=exec_status.value,
        executed_at=now,
        external_reference=ref_id,
        execution_logs_json=json.dumps(logs),
    )
    db.add(action_record)
    db.flush()

    # Persist RecoveryOutcome
    outcome_id = f"out_{uuid.uuid4().hex[:8]}"
    outcome_record = RecoveryOutcome(
        id=outcome_id,
        action_id=action_id,
        recovered=recovered,
        recovered_amount=recovered_amount,
        recovery_time_minutes=recovery_time_mins,
        recorded_at=now,
    )
    db.add(outcome_record)

    # Persist AuditLog
    audit_log = AuditLog(
        id=f"aud_{uuid.uuid4().hex[:8]}",
        entity_type="action",
        entity_id=action_id,
        event_type="action_simulated",
        details_json=json.dumps({
            "payment_id": payment.id,
            "action_type": target_action,
            "execution_status": exec_status.value,
            "recovered": recovered,
            "recovered_amount": recovered_amount,
            "external_reference": ref_id,
        }),
    )
    db.add(audit_log)

    db.commit()
    db.refresh(action_record)
    db.refresh(outcome_record)

    return {
        "action_id": action_id,
        "decision_id": decision.id,
        "payment_id": payment.id,
        "action_type": target_action,
        "execution_status": exec_status.value,
        "simulated_reference": ref_id,
        "recovered": recovered,
        "recovered_amount": recovered_amount,
        "recovery_time_minutes": recovery_time_mins,
        "execution_logs": logs,
        "executed_at": now.isoformat(),
    }
