import pytest
from app.engine.action_scoring import compute_action_probabilities
from app.engine.guardrails import evaluate_guardrails
from app.engine.orchestrator import run_decision_pipeline
from app.schemas.common import CanonicalAction, PolicyStatus
from app.models.payment import Payment

def test_all_seven_canonical_actions_computed(sample_customer_and_payment):
    cust, pay = sample_customer_and_payment
    base_ml_prob = 0.60
    candidates = compute_action_probabilities(pay, cust, base_ml_prob)

    assert len(candidates) == 7
    action_names = {c["action"] for c in candidates}
    for action in CanonicalAction:
        assert action in action_names

    for c in candidates:
        assert 0.0 <= c["probability"] <= 1.0
        assert c["expected_recovery"] == round(pay.amount * c["probability"], 2)
        assert "policy_status" in c
        assert "policy_notes" in c

def test_policy_guardrails_blocks_expired_card(db, sample_customer_and_payment):
    cust, pay = sample_customer_and_payment
    pay.failure_reason = "card_expired"
    pay.payment_method = "card"

    guardrails = evaluate_guardrails(pay, cust)
    method_check = next(g for g in guardrails if g["category"] == "method_eligibility")
    assert method_check["status"] == "failed"
    assert method_check["status_label"] == "BLOCK"

    candidates = compute_action_probabilities(pay, cust, base_ml_prob=0.50)
    retry_now = next(c for c in candidates if c["action"] == CanonicalAction.RETRY_NOW)
    assert retry_now["policy_status"] == PolicyStatus.BLOCKED
    assert retry_now["probability"] == 0.0

def test_policy_guardrails_blocks_retry_threshold_exhausted(sample_customer_and_payment):
    cust, pay = sample_customer_and_payment
    pay.retry_count = 3
    pay.max_retries_allowed = 3

    guardrails = evaluate_guardrails(pay, cust)
    retry_check = next(g for g in guardrails if g["category"] == "retry_limit")
    assert retry_check["status"] == "failed"
    assert retry_check["status_label"] == "BLOCK"

    candidates = compute_action_probabilities(pay, cust, base_ml_prob=0.60)
    retry_now = next(c for c in candidates if c["action"] == CanonicalAction.RETRY_NOW)
    retry_later = next(c for c in candidates if c["action"] == CanonicalAction.RETRY_LATER)
    assert retry_now["policy_status"] == PolicyStatus.BLOCKED
    assert retry_later["policy_status"] == PolicyStatus.BLOCKED

def test_decision_orchestrator_end_to_end(db, sample_customer_and_payment, trained_model):
    cust, pay = sample_customer_and_payment

    decision, extra = run_decision_pipeline(db, pay.id)

    assert decision.payment_id == pay.id
    assert decision.recommended_action in [a.value for a in CanonicalAction]
    assert decision.expected_recovery > 0
    assert decision.policy_status != "blocked"
    assert len(extra["candidate_actions"]) == 7
    assert len(extra["guardrails"]) == 4

    # Explanation must have all 3 parts
    exp = extra["explanation"]
    assert "whySelected" in exp
    assert "importantFactors" in exp
    assert "alternativesTradeoffs" in exp
    assert "engineDisclaimer" in exp

    # Check database persistence
    assert len(decision.candidate_actions) == 7
    assert len(decision.policy_checks) == 4
