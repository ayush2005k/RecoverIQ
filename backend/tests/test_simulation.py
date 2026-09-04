import pytest
from app.simulation.simulator import simulate_action_execution
from app.models.payment import Payment
from app.models.action import RecoveryAction, RecoveryOutcome
from app.models.audit import AuditLog
from app.schemas.common import CanonicalAction, ExecutionStatus

def test_simulation_success_flow(db, sample_customer_and_payment, trained_model):
    cust, pay = sample_customer_and_payment

    result = simulate_action_execution(db, pay.id, force_outcome=True)

    assert result["payment_id"] == pay.id
    assert result["execution_status"] == ExecutionStatus.SUCCEEDED.value
    assert result["recovered"] is True
    assert result["recovered_amount"] == pay.amount
    assert result["simulated_reference"].startswith("sim_tx_")
    assert len(result["execution_logs"]) >= 3

    # Verify DB persistence
    action_rec = db.query(RecoveryAction).filter(RecoveryAction.id == result["action_id"]).first()
    assert action_rec is not None
    assert action_rec.outcome is not None
    assert action_rec.outcome.recovered is True
    assert action_rec.outcome.recovered_amount == pay.amount

    # Payment status should be updated to recovered
    assert pay.status == "recovered"

    # Audit log should be created
    audit = db.query(AuditLog).filter(AuditLog.entity_id == result["action_id"]).first()
    assert audit is not None
    assert audit.event_type == "action_simulated"

def test_simulation_blocks_forbidden_action(db, sample_customer_and_payment, trained_model):
    cust, pay = sample_customer_and_payment
    pay.failure_reason = "card_expired"
    pay.payment_method = "card"
    db.commit()

    # retry_now is blocked for card_expired
    with pytest.raises(ValueError, match="BLOCKED"):
        simulate_action_execution(db, pay.id, action_type=CanonicalAction.RETRY_NOW)
