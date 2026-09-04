from datetime import datetime, timezone
from typing import List, Dict, Any
from ..models.payment import Payment
from ..models.customer import Customer

def evaluate_guardrails(payment: Payment, customer: Customer) -> List[Dict[str, Any]]:
    """
    Evaluates the 4 deterministic policy guardrails against payment and customer context.
    Returns list of evaluated guardrails with PASS / RESTRICTED / BLOCK statuses.
    """
    is_retries_exhausted = payment.retry_count >= payment.max_retries_allowed
    is_card_expired = payment.failure_reason == "card_expired"
    is_mandate_invalid = payment.failure_reason == "mandate_invalid"
    is_limit_exceeded = payment.failure_reason == "limit_exceeded"
    fatigue = float(customer.retry_fatigue_score)

    now = datetime.now(timezone.utc)
    failed_dt = payment.failed_at
    if failed_dt.tzinfo is None:
        failed_dt = failed_dt.replace(tzinfo=timezone.utc)
    hours_elapsed = max(0.0, (now - failed_dt).total_seconds() / 3600.0)

    checks = []

    # 1. Retry Threshold Limit
    checks.append({
        "id": "g_retry_limit",
        "category": "retry_limit",
        "rule_name": "Retry Threshold Limit",
        "description": "Maximum allowable automated retries per billing cycle (RBI/Acquirer quota)",
        "status": "failed" if is_retries_exhausted else "passed",
        "status_label": "BLOCK" if is_retries_exhausted else "PASS",
        "detail": (
            f"Limit reached: {payment.retry_count} of {payment.max_retries_allowed} retries consumed. Automated retries locked."
            if is_retries_exhausted
            else f"{payment.retry_count} of {payment.max_retries_allowed} retries consumed. Retry quota available."
        ),
    })

    # 2. 72-Hour Active Recovery Window
    if hours_elapsed > 72.0:
        window_status = "failed"
        window_label = "BLOCK"
        window_detail = f"Temporal boundary expired: {hours_elapsed:.1f} hours elapsed since failure (limit 72h)."
    elif hours_elapsed > 48.0:
        window_status = "warning"
        window_label = "RESTRICTED"
        window_detail = f"Window closing: {72.0 - hours_elapsed:.1f} hours remaining before 72h SLA expiration."
    else:
        window_status = "passed"
        window_label = "PASS"
        window_detail = f"Decline timestamp is within active recovery window ({72.0 - hours_elapsed:.1f} hours remaining)."

    checks.append({
        "id": "g_recovery_window",
        "category": "recovery_window",
        "rule_name": "72-Hour Active Recovery Window",
        "description": "Temporal policy boundary for autonomous algorithmic intervention",
        "status": window_status,
        "status_label": window_label,
        "detail": window_detail,
    })

    # 3. Customer Contact Cooldown & Fatigue
    if fatigue > 7.5:
        contact_status = "failed"
        contact_label = "BLOCK"
        contact_detail = f"High fatigue score ({fatigue:.1f}/10). Direct messaging throttled to prevent customer churn."
    elif fatigue > 5.5:
        contact_status = "warning"
        contact_label = "RESTRICTED"
        contact_detail = f"Elevated fatigue ({fatigue:.1f}/10). Outbound customer notifications should be minimized."
    else:
        contact_status = "passed"
        contact_label = "PASS"
        contact_detail = f"Fatigue index nominal ({fatigue:.1f}/10). Channel messaging is policy compliant."

    checks.append({
        "id": "g_contact_cooldown",
        "category": "contact_cooldown",
        "rule_name": "Customer Contact Cooldown & Fatigue",
        "description": "Limits customer outreach frequency (max 2 touchpoints per 24-hour cycle)",
        "status": contact_status,
        "status_label": contact_label,
        "detail": contact_detail,
    })

    # 4. Payment-Method Eligibility & Rail Health
    if is_card_expired:
        method_status = "failed"
        method_label = "BLOCK"
        method_detail = "Card token expired on issuer network. Direct presentations strictly blocked; token updater required."
    elif is_mandate_invalid:
        method_status = "failed"
        method_label = "BLOCK"
        method_detail = "Recurring mandate paused or invalid on issuer switch. Direct presentations strictly blocked; mandate update required."
    elif is_limit_exceeded:
        method_status = "warning"
        method_label = "RESTRICTED"
        method_detail = f"Transaction amount (₹{payment.amount:,.2f}) exceeds single-transaction rail threshold. Multi-rail link recommended."
    else:
        method_status = "passed"
        method_label = "PASS"
        method_detail = f"Instrument ({payment.payment_method_details or payment.payment_method}) verified active and compliant with payment rail rules."

    checks.append({
        "id": "g_method_eligibility",
        "category": "method_eligibility",
        "rule_name": "Payment-Method Eligibility & Rail Health",
        "description": "Validates payment token validity, mandate status, and issuer network availability",
        "status": method_status,
        "status_label": method_label,
        "detail": method_detail,
    })

    return checks
