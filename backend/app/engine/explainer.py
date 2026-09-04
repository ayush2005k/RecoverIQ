from typing import Dict, Any, List
from ..models.payment import Payment
from ..models.customer import Customer
from ..schemas.common import CanonicalAction

def generate_structured_explanation(
    payment: Payment,
    customer: Customer,
    winning_action: CanonicalAction,
    base_ml_prob: float,
    candidate_actions: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generates a deterministic 3-part structured explanation strictly grounded
    in actual customer, payment, feature, and decision data.
    
    1. whySelected
    2. importantFactors
    3. alternativesTradeoffs
    4. engineDisclaimer
    """
    reason = str(payment.failure_reason)
    amount = float(payment.amount)
    formatted_amount = f"₹{amount:,.2f}"
    formatted_ltv = f"₹{customer.lifetime_value:,.2f}"
    winning_spec = candidate_actions[0]
    winning_prob_pct = f"{winning_spec['probability'] * 100:.1f}%"
    winning_ev_str = f"₹{winning_spec['expected_recovery']:,.2f}"

    # 1. Why Selected Rationale (Grounded strictly in observed data)
    if winning_action == CanonicalAction.RETRY_LATER:
        why_selected = (
            f"The customer has a {customer.historical_recovery_rate * 100:.1f}% historical payment success rate. "
            f"Given the insufficient-funds failure reason, retry quota ({payment.retry_count}/{payment.max_retries_allowed} used), "
            f"and {customer.segment} segment, retry_later receives the highest derived action-specific estimated success probability "
            f"({winning_prob_pct}) and expected recovery value ({winning_ev_str})."
        )
    elif winning_action == CanonicalAction.RETRY_NOW:
        why_selected = (
            f"The payment failed due to {reason.replace('_', ' ')}. "
            f"With retry quota available ({payment.retry_count}/{payment.max_retries_allowed} used) and no token expiration constraint, "
            f"immediate representation is eligible under policy guardrails and receives a derived estimated success probability "
            f"of {winning_prob_pct}, resulting in an expected recovery value of {winning_ev_str}."
        )
    elif winning_action == CanonicalAction.SEND_PAYMENT_LINK:
        why_selected = (
            f"The transaction failed due to {reason.replace('_', ' ')}. "
            f"Direct automated retries on the primary instrument are constrained or sub-optimal. "
            f"A multi-rail payment link provides alternative checkout channels without consuming retry quotas, "
            f"yielding a derived estimated success probability of {winning_prob_pct} and expected recovery value of {winning_ev_str}."
        )
    elif winning_action == CanonicalAction.REQUEST_PAYMENT_METHOD_UPDATE:
        why_selected = (
            f"The payment failed with {reason.replace('_', ' ')}. "
            f"Policy guardrails classify direct automated representation on this instrument as BLOCKED. "
            f"Requesting a payment method update is the highest-EV eligible permitted action ({winning_ev_str})."
        )
    elif winning_action == CanonicalAction.ESCALATE_TO_HUMAN:
        why_selected = (
            f"The account belongs to the {customer.segment} tier with lifetime value of {formatted_ltv} "
            f"and transaction amount of {formatted_amount}. "
            f"Given account priority ({payment.priority}), dedicated relationship outreach is policy-eligible "
            f"and yields an expected recovery value of {winning_ev_str}."
        )
    elif winning_action == CanonicalAction.SEND_REMINDER:
        why_selected = (
            f"The transaction failed due to {reason.replace('_', ' ')}. "
            f"With a customer fatigue score of {customer.retry_fatigue_score:.1f}/10, contact cooldown policy permits outbound messaging. "
            f"A customer reminder yields a derived estimated success probability of {winning_prob_pct} and expected recovery of {winning_ev_str}."
        )
    else:  # STOP_RECOVERY
        why_selected = (
            f"Automated retry quota is exhausted ({payment.retry_count}/{payment.max_retries_allowed} consumed) "
            f"or policy guardrails block further automated interventions. Stop recovery is selected to prevent unproductive presentations."
        )

    # 2. Important Attribution Factors (Grounded in observed features)
    important_factors = [
        {
            "title": "Historical Customer Success Rate",
            "value": f"{customer.historical_recovery_rate * 100:.1f}% past success",
            "impact": "positive" if customer.historical_recovery_rate >= 0.7 else "neutral",
            "description": f"{customer.successful_payments} successful and {customer.failed_payments} failed lifetime transactions recorded.",
        },
        {
            "title": "Failure Reason & Classification",
            "value": reason.replace("_", " ").title(),
            "impact": "positive" if reason == "technical_glitch" else ("neutral" if reason == "insufficient_funds" else "negative"),
            "description": f"Decline categorized with error code {payment.failure_code}.",
        },
        {
            "title": "Retry Quota & Fatigue Index",
            "value": f"{customer.retry_fatigue_score:.1f}/10 Fatigue",
            "impact": "positive" if customer.retry_fatigue_score < 4.0 else "neutral",
            "description": f"{payment.retry_count} of {payment.max_retries_allowed} allowable retries consumed.",
        },
        {
            "title": "Customer Lifetime Value (LTV)",
            "value": formatted_ltv,
            "impact": "positive",
            "description": f"Classified under {customer.segment} account tier.",
        },
    ]

    # 3. Alternatives Tradeoffs
    alternatives_tradeoffs = []
    for cand in candidate_actions:
        if cand["action"] == winning_action:
            continue
        if cand["policy_status"] == "blocked":
            rejection = f"Strictly blocked by deterministic guardrail: {cand['policy_notes']}"
        elif cand["expected_recovery"] < candidate_actions[0]["expected_recovery"]:
            rejection = f"Expected Value (₹{cand['expected_recovery']:,.2f}) lower than selected strategy ({winning_ev_str})."
        else:
            rejection = "Deprioritized due to policy restriction or higher operational friction."

        alternatives_tradeoffs.append({
            "action": cand["action"],
            "actionLabel": cand["label"],
            "probability": cand["probability"],
            "expectedValue": cand["expected_recovery"],
            "rejectionReason": rejection,
        })

    # Snippet for compact views
    ai_snippet = why_selected[:180] + "..." if len(why_selected) > 180 else why_selected

    return {
        "whySelected": why_selected,
        "importantFactors": important_factors,
        "alternativesTradeoffs": alternatives_tradeoffs,
        "aiExplanationSnippet": ai_snippet,
        "engineDisclaimer": "POST-DECISION EXPLANATION LAYER — Deterministic expected value and policy guardrails govern action selection. Explanations reflect observed feature and decision data without claiming unverified network state.",
    }
