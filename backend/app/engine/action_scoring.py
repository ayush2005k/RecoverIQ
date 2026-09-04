from typing import List, Dict, Any, Tuple
from ..models.payment import Payment
from ..models.customer import Customer
from ..schemas.common import CanonicalAction, PolicyStatus

ACTION_METADATA = {
    CanonicalAction.RETRY_NOW: {
        "label": "Retry Immediately",
        "description": "Immediate representation to gateway.",
    },
    CanonicalAction.RETRY_LATER: {
        "label": "Retry Later (Smart Delay)",
        "description": "Timed retry during customer liquidity window.",
    },
    CanonicalAction.SEND_PAYMENT_LINK: {
        "label": "Send Dynamic Payment Link",
        "description": "Dispatches instant multi-rail payment link via WhatsApp & Email.",
    },
    CanonicalAction.SEND_REMINDER: {
        "label": "Send Customer Reminder",
        "description": "Lightweight transaction alert via SMS / Email without direct charge.",
    },
    CanonicalAction.REQUEST_PAYMENT_METHOD_UPDATE: {
        "label": "Request Payment Method Update",
        "description": "Requests customer to update payment instrument via RBI-compliant tokenization flow.",
    },
    CanonicalAction.ESCALATE_TO_HUMAN: {
        "label": "Escalate to Dedicated RM",
        "description": "Creates urgent ticket for dedicated Relationship Manager / Enterprise Support.",
    },
    CanonicalAction.STOP_RECOVERY: {
        "label": "Stop Recovery (Abandon)",
        "description": "Terminal action: Mark debt as uncollectible and suppress all future retries.",
    },
}

def compute_action_probabilities(
    payment: Payment,
    customer: Customer,
    base_ml_prob: float
) -> List[Dict[str, Any]]:
    """
    Derives action-specific estimated success probabilities from the base ML probability
    and contextual parameters (failure reason, payment method, customer history, retry count).
    
    Clearly distinguishes base ML recovery probability from action estimated probability.
    """
    amount = float(payment.amount)
    reason = str(payment.failure_reason)
    method = str(payment.payment_method)
    retries_used = int(payment.retry_count)
    max_retries = int(payment.max_retries_allowed)
    is_retries_exhausted = retries_used >= max_retries
    fatigue = float(customer.retry_fatigue_score)
    segment = str(customer.segment)

    scored_actions = []

    # 1. RETRY_NOW
    if reason == "technical_glitch":
        # Acquirer glitch restored: immediate retry succeeds with very high certainty
        prob_now = max(0.90, min(0.98, base_ml_prob + 0.35))
        pol_now = PolicyStatus.BLOCKED if is_retries_exhausted else PolicyStatus.SATISFIED
        note_now = "Optimal: Gateway restored to nominal latency; high immediate recovery rate."
    elif reason in ["card_expired", "mandate_invalid"]:
        prob_now = 0.0
        pol_now = PolicyStatus.BLOCKED
        note_now = "Blocked by policy: Direct retry on invalid mandate or expired instrument will yield guaranteed decline."
    elif reason == "limit_exceeded":
        prob_now = 0.02
        pol_now = PolicyStatus.BLOCKED
        note_now = "Blocked: Same-day presentation exceeds instrument spending limits."
    elif is_retries_exhausted:
        prob_now = 0.05
        pol_now = PolicyStatus.BLOCKED
        note_now = "Blocked: Permitted retry quota exhausted for current billing cycle."
    elif reason == "insufficient_funds":
        prob_now = min(0.28, base_ml_prob * 0.40)
        pol_now = PolicyStatus.RESTRICTED
        note_now = "Sub-optimal: Immediate retry before bank liquidity clearing yields low probability and consumes quota."
    else:
        prob_now = max(0.15, min(0.60, base_ml_prob * 0.65))
        pol_now = PolicyStatus.BLOCKED if is_retries_exhausted else PolicyStatus.SATISFIED
        note_now = "Standard immediate retry representation."

    scored_actions.append({
        "action": CanonicalAction.RETRY_NOW,
        "label": ACTION_METADATA[CanonicalAction.RETRY_NOW]["label"],
        "probability": round(prob_now, 4),
        "confidence": 0.92,
        "policy_status": pol_now,
        "policy_notes": note_now,
    })

    # 2. RETRY_LATER
    if reason == "insufficient_funds":
        # Delayed retry aligned with banking/salary clearing
        prob_later = max(0.75, min(0.92, base_ml_prob + 0.30))
        pol_later = PolicyStatus.BLOCKED if is_retries_exhausted else PolicyStatus.SATISFIED
        note_later = "Optimal: Scheduled retry (+6h) coincides with salary/treasury clearing window."
    elif reason == "technical_glitch":
        prob_later = 0.80
        pol_later = PolicyStatus.BLOCKED if is_retries_exhausted else PolicyStatus.SATISFIED
        note_later = "Viable, but immediate retry delivers faster recovery without waiting."
    elif reason in ["card_expired", "mandate_invalid"]:
        prob_later = 0.0
        pol_later = PolicyStatus.BLOCKED
        note_later = "Blocked: Time delay does not resolve invalid mandate or expired card status."
    elif reason == "limit_exceeded":
        prob_later = 0.12
        pol_later = PolicyStatus.RESTRICTED
        note_later = "Restricted: Monthly/daily limits will not reset within 72h recovery window."
    elif is_retries_exhausted:
        prob_later = 0.10
        pol_later = PolicyStatus.BLOCKED
        note_later = "Blocked: Permitted retry quota exhausted."
    else:
        prob_later = max(0.40, min(0.78, base_ml_prob + 0.10))
        pol_later = PolicyStatus.BLOCKED if is_retries_exhausted else PolicyStatus.SATISFIED
        note_later = "Scheduled retry based on historical customer recovery velocity."

    scored_actions.append({
        "action": CanonicalAction.RETRY_LATER,
        "label": ACTION_METADATA[CanonicalAction.RETRY_LATER]["label"],
        "probability": round(prob_later, 4),
        "confidence": 0.90,
        "policy_status": pol_later,
        "policy_notes": note_later,
    })

    # 3. SEND_PAYMENT_LINK
    if reason in ["limit_exceeded", "mandate_invalid"]:
        prob_link = max(0.75, min(0.88, base_ml_prob + 0.25))
        pol_link = PolicyStatus.SATISFIED
        note_link = "Optimal: Bypasses single-rail limits by offering NetBanking, UPI, and Corporate Card alternatives."
    elif reason in ["auth_timeout", "customer_dropoff"]:
        prob_link = max(0.70, min(0.85, base_ml_prob + 0.20))
        pol_link = PolicyStatus.SATISFIED
        note_link = "High conversion: Direct 1-click checkout with pre-filled transaction context."
    elif fatigue > 7.0:
        prob_link = 0.40
        pol_link = PolicyStatus.RESTRICTED
        note_link = "Restricted: Customer has high notification fatigue; suppress outbound links."
    else:
        prob_link = max(0.50, min(0.74, base_ml_prob + 0.05))
        pol_link = PolicyStatus.SATISFIED
        note_link = "Outbound multi-rail link with direct payment options."

    scored_actions.append({
        "action": CanonicalAction.SEND_PAYMENT_LINK,
        "label": ACTION_METADATA[CanonicalAction.SEND_PAYMENT_LINK]["label"],
        "probability": round(prob_link, 4),
        "confidence": 0.87,
        "policy_status": pol_link,
        "policy_notes": note_link,
    })

    # 4. SEND_REMINDER
    if fatigue > 7.5:
        prob_rem = 0.25
        pol_rem = PolicyStatus.BLOCKED
        note_rem = "Blocked: Contact cooldown active (exceeded touchpoint thresholds)."
    elif reason == "insufficient_funds":
        prob_rem = max(0.60, min(0.75, base_ml_prob + 0.10))
        pol_rem = PolicyStatus.SATISFIED
        note_rem = "Prompts customer to fund account before automated batch retry."
    elif reason == "customer_dropoff":
        prob_rem = max(0.68, min(0.80, base_ml_prob + 0.15))
        pol_rem = PolicyStatus.SATISFIED
        note_rem = "Gentle reminder to resume checkout sequence."
    else:
        prob_rem = max(0.35, min(0.65, base_ml_prob))
        pol_rem = PolicyStatus.SATISFIED
        note_rem = "Lightweight transaction alert via SMS / Email."

    scored_actions.append({
        "action": CanonicalAction.SEND_REMINDER,
        "label": ACTION_METADATA[CanonicalAction.SEND_REMINDER]["label"],
        "probability": round(prob_rem, 4),
        "confidence": 0.84,
        "policy_status": pol_rem,
        "policy_notes": note_rem,
    })

    # 5. REQUEST_PAYMENT_METHOD_UPDATE
    if reason in ["card_expired", "mandate_invalid"]:
        prob_upd = max(0.78, min(0.88, base_ml_prob + 0.35))
        pol_upd = PolicyStatus.SATISFIED
        note_upd = "Optimal: Instrument requires update; token refresh restores long-term billing health."
    else:
        prob_upd = 0.40
        pol_upd = PolicyStatus.SATISFIED
        note_upd = "Secondary action: Instrument currently valid; update introduces unnecessary customer friction."

    scored_actions.append({
        "action": CanonicalAction.REQUEST_PAYMENT_METHOD_UPDATE,
        "label": ACTION_METADATA[CanonicalAction.REQUEST_PAYMENT_METHOD_UPDATE]["label"],
        "probability": round(prob_upd, 4),
        "confidence": 0.88,
        "policy_status": pol_upd,
        "policy_notes": note_upd,
    })

    # 6. ESCALATE_TO_HUMAN
    if segment == "Enterprise" or amount >= 100_000:
        prob_esc = max(0.82, min(0.95, base_ml_prob + 0.25))
        pol_esc = PolicyStatus.SATISFIED
        note_esc = "High-touch recovery suitable for Tier-1 Enterprise account or large transaction."
    elif amount < 20_000:
        prob_esc = 0.50
        pol_esc = PolicyStatus.RESTRICTED
        note_esc = "Restricted by cost model: RM handling cost exceeds incremental value for small ticket size."
    else:
        prob_esc = max(0.65, min(0.80, base_ml_prob + 0.10))
        pol_esc = PolicyStatus.SATISFIED
        note_esc = "Relationship Manager outreach for key mid-market client."

    scored_actions.append({
        "action": CanonicalAction.ESCALATE_TO_HUMAN,
        "label": ACTION_METADATA[CanonicalAction.ESCALATE_TO_HUMAN]["label"],
        "probability": round(prob_esc, 4),
        "confidence": 0.82,
        "policy_status": pol_esc,
        "policy_notes": note_esc,
    })

    # 7. STOP_RECOVERY
    scored_actions.append({
        "action": CanonicalAction.STOP_RECOVERY,
        "label": ACTION_METADATA[CanonicalAction.STOP_RECOVERY]["label"],
        "probability": 0.0,
        "confidence": 0.99,
        "policy_status": PolicyStatus.SATISFIED,
        "policy_notes": "Terminal action: Mark debt as uncollectible and suppress all future retries.",
    })

    # Calculate expected recovery value for each action
    for item in scored_actions:
        item["expected_recovery"] = round(amount * item["probability"], 2)

    return scored_actions
