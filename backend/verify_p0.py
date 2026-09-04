import json
from app.db.session import init_db, SessionLocal
from app.api.routes.data import seed_database
from app.models.payment import Payment
from app.models.customer import Customer
from app.models.decision import RecoveryDecision
from app.models.action import RecoveryAction, RecoveryOutcome
from app.models.audit import AuditLog
from app.engine.orchestrator import run_decision_pipeline
from app.simulation.simulator import simulate_action_execution

def main():
    init_db()
    db = SessionLocal()

    print("1. Seeding database with 3,000 synthetic records (seed=42)...")
    seed_res = seed_database(count=3000, seed=42, db=db)
    print(f"   Seeded: {seed_res.totalPayments} payments across {seed_res.totalCustomers} customers.")

    # 2. Pick a realistic synthetic at-risk payment
    # Let's find a high-value Enterprise or Growth payment with 'insufficient_funds'
    payment = (
        db.query(Payment)
        .filter(Payment.status == "at_risk", Payment.failure_reason == "insufficient_funds")
        .order_by(Payment.amount.desc())
        .first()
    )
    if not payment:
        payment = db.query(Payment).filter(Payment.status == "at_risk").first()

    customer = payment.customer

    print("\n=======================================================")
    print("REAL SYNTHETIC PAYMENT EXAMPLE:")
    print("=======================================================")
    payment_info = {
        "payment_id": payment.id,
        "amount": payment.amount,
        "currency": payment.currency,
        "payment_method": payment.payment_method,
        "payment_method_details": payment.payment_method_details,
        "failure_reason": payment.failure_reason,
        "failure_code": payment.failure_code,
        "priority": payment.priority,
        "retry_count": payment.retry_count,
        "max_retries_allowed": payment.max_retries_allowed,
        "failed_at": payment.failed_at.isoformat(),
        "customer": {
            "customer_id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "segment": customer.segment,
            "lifetime_value": customer.lifetime_value,
            "total_successful_payments": customer.successful_payments,
            "total_failed_payments": customer.failed_payments,
            "historical_recovery_rate": customer.historical_recovery_rate,
            "avg_recovery_latency_hours": customer.avg_recovery_latency_hours,
            "retry_fatigue_score": customer.retry_fatigue_score,
        },
    }
    print(json.dumps(payment_info, indent=2))

    # 3. Run Decision Pipeline
    decision, extra = run_decision_pipeline(db, payment.id)

    print("\n=======================================================")
    print(f"BASE ML RECOVERY PROBABILITY: {decision.base_recovery_probability * 100:.2f}%")
    print(f"MODEL VERSION: {decision.model_version}")
    print("=======================================================")

    print("\n=======================================================")
    print("ALL 7 CANONICAL CANDIDATE ACTIONS SCORING MATRIX:")
    print("=======================================================")
    actions_summary = []
    for cand in extra["candidate_actions"]:
        actions_summary.append({
            "action": cand["action"].value,
            "label": cand["label"],
            "estimated_probability": f"{cand['probability'] * 100:.1f}%",
            "expected_recovery_value": f"₹{cand['expected_recovery']:,.2f}",
            "policy_status": cand["policy_status"].value.upper(),
            "is_recommended": cand["is_recommended"],
            "policy_notes": cand.get("policy_notes"),
        })
    print(json.dumps(actions_summary, indent=2))

    print("\n=======================================================")
    print(f"WINNING ACTION SELECTED: {decision.recommended_action} ({decision.action_label})")
    print("WHY SELECTED:")
    print("=======================================================")
    print(decision.explanation)

    print("\n=======================================================")
    print("EXECUTING TEST-MODE SIMULATION...")
    print("=======================================================")
    sim_res = simulate_action_execution(db, payment.id, force_outcome=True)
    print(json.dumps(sim_res, indent=2))

    print("\n=======================================================")
    print("DATABASE OUTCOME RECORD:")
    print("=======================================================")
    outcome = db.query(RecoveryOutcome).filter(RecoveryOutcome.action_id == sim_res["action_id"]).first()
    outcome_info = {
        "outcome_id": outcome.id,
        "action_id": outcome.action_id,
        "recovered": outcome.recovered,
        "recovered_amount": outcome.recovered_amount,
        "recovery_time_minutes": outcome.recovery_time_minutes,
        "recorded_at": outcome.recorded_at.isoformat(),
    }
    print(json.dumps(outcome_info, indent=2))

    print("\n=======================================================")
    print("AUDIT RECORD:")
    print("=======================================================")
    audit = db.query(AuditLog).filter(AuditLog.entity_id == sim_res["action_id"]).first()
    audit_info = {
        "audit_id": audit.id,
        "entity_type": audit.entity_type,
        "entity_id": audit.entity_id,
        "event_type": audit.event_type,
        "details": json.loads(audit.details_json),
        "created_at": audit.created_at.isoformat(),
    }
    print(json.dumps(audit_info, indent=2))

    db.close()

if __name__ == "__main__":
    main()
