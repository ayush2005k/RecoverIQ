import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Tuple, Any
import numpy as np
import pandas as pd
from ..schemas.common import CanonicalAction, PaymentMethod, FailureReason, PaymentStatus, PriorityLevel

CUSTOMER_SEGMENTS = ["Enterprise", "Growth", "SMB", "Retail"]
PAYMENT_METHODS = ["card", "upi", "netbanking", "mandate", "wallet"]
FAILURE_REASONS = [
    "insufficient_funds",
    "technical_glitch",
    "card_expired",
    "auth_timeout",
    "customer_dropoff",
    "mandate_invalid",
    "limit_exceeded",
]

FAILURE_CODES = {
    "insufficient_funds": "ERR_INSUFFICIENT_FUNDS_51",
    "technical_glitch": "ERR_ACQUIRER_GATEWAY_TIMEOUT_504",
    "card_expired": "ERR_CARD_TOKEN_EXPIRED_54",
    "auth_timeout": "ERR_3DS_OTP_VERIFICATION_TIMEOUT",
    "customer_dropoff": "ERR_CUSTOMER_CHECKOUT_ABANDONED",
    "mandate_invalid": "ERR_RECURRING_MANDATE_INVALID_REVOKED",
    "limit_exceeded": "ERR_ISSUER_VELOCITY_LIMIT_EXCEEDED",
}

def generate_synthetic_dataset(num_records: int = 3000, seed: int = 42) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], pd.DataFrame]:
    """
    Generates realistic, reproducible synthetic customers and failed payments.
    Returns:
      - customers_data: list of dicts for DB customer insertion
      - payments_data: list of dicts for DB payment insertion
      - training_df: DataFrame with features and true binary 'recovered' label
    """
    random.seed(seed)
    np.random.seed(seed)

    num_customers = max(200, num_records // 5)
    customers = []

    for i in range(num_customers):
        cust_id = f"cust_{uuid.uuid4().hex[:8]}"
        segment = random.choices(CUSTOMER_SEGMENTS, weights=[0.15, 0.25, 0.40, 0.20])[0]

        if segment == "Enterprise":
            ltv = round(random.uniform(2_000_000, 10_000_000), 2)
            succ = random.randint(100, 500)
            fail = random.randint(1, 10)
            hist_rate = round(succ / (succ + fail), 3)
            avg_lat = round(random.uniform(2.0, 6.0), 1)
            fatigue = round(random.uniform(0.5, 3.0), 1)
            enterprise_customers = ["Rajesh Singhania", "Sunita Narang", "Aditya Birla", "Deepak Parekh", "Kiran Mazumdar", "Harsh Goenka", "Naveen Jindal", "Anand Mahindra"]
            raw_name = random.choice(enterprise_customers)
            name = f"{raw_name} ({i+1})"
            clean_email_prefix = raw_name.lower().replace(" ", ".")
            email = f"{clean_email_prefix}{i+1}@acme-client.in"
        elif segment == "Growth":
            ltv = round(random.uniform(500_000, 2_500_000), 2)
            succ = random.randint(40, 150)
            fail = random.randint(2, 15)
            hist_rate = round(succ / (succ + fail), 3)
            avg_lat = round(random.uniform(4.0, 12.0), 1)
            fatigue = round(random.uniform(1.0, 5.0), 1)
            growth_customers = ["Arjun Patel", "Neha Kapoor", "Vikram Malhotra", "Ananya Sen", "Rohan Iyer", "Pooja Hegde", "Kabir Singhania", "Sanjay Verma", "Aditi Rao", "Divya Nair"]
            raw_name = growth_customers[i % len(growth_customers)]
            name = f"{raw_name} ({i+1})"
            clean_email_prefix = raw_name.lower().replace(" ", ".")
            email = f"{clean_email_prefix}{i+1}@acmecustomer.co"
        elif segment == "SMB":
            ltv = round(random.uniform(50_000, 600_000), 2)
            succ = random.randint(10, 60)
            fail = random.randint(1, 15)
            hist_rate = round(succ / (succ + fail), 3)
            avg_lat = round(random.uniform(6.0, 24.0), 1)
            fatigue = round(random.uniform(1.5, 7.0), 1)
            smb_customers = ["Amitabh Das", "Meera Joshi", "Suresh Raina", "Kavita Krishnamurthy", "Devendra Fadnavis", "Sunil Gavaskar", "Sania Mirza", "Bhaichung Bhutia"]
            raw_name = smb_customers[i % len(smb_customers)]
            name = f"{raw_name} ({i+1})"
            clean_email_prefix = raw_name.lower().replace(" ", ".")
            email = f"{clean_email_prefix}{i+1}@acmepartner.in"
        else:  # Retail
            ltv = round(random.uniform(5_000, 80_000), 2)
            succ = random.randint(2, 20)
            fail = random.randint(1, 10)
            hist_rate = round(succ / (succ + fail), 3)
            avg_lat = round(random.uniform(12.0, 48.0), 1)
            fatigue = round(random.uniform(2.0, 9.0), 1)
            first_names = ["Aarav", "Priya", "Rahul", "Ananya", "Rohan", "Sneha", "Vikram", "Neha", "Aditya", "Pooja"]
            last_names = ["Sharma", "Patel", "Verma", "Singh", "Gupta", "Mehta", "Iyer", "Nair", "Reddy", "Chopra"]
            name = f"{random.choice(first_names)} {random.choice(last_names)}"
            email = f"{name.lower().replace(' ', '.')}{i+1}@gmail.com"

        customers.append({
            "id": cust_id,
            "external_customer_id": f"ext_{cust_id}",
            "name": name,
            "email": email,
            "segment": segment,
            "lifetime_value": ltv,
            "total_payments": succ + fail,
            "successful_payments": succ,
            "failed_payments": fail,
            "historical_recovery_rate": hist_rate,
            "avg_recovery_latency_hours": avg_lat,
            "retry_fatigue_score": fatigue,
            "created_at": datetime.now(timezone.utc) - timedelta(days=random.randint(60, 400)),
        })

    payments = []
    features_rows = []
    base_time = datetime.now(timezone.utc)

    for i in range(num_records):
        pay_id = f"pay_{uuid.uuid4().hex[:8]}"
        customer = random.choice(customers)

        # Failure reasons distribution
        reason = random.choices(
            FAILURE_REASONS,
            weights=[0.35, 0.22, 0.12, 0.14, 0.08, 0.05, 0.04]
        )[0]

        # Method distribution
        if reason == "card_expired":
            method = "card"
        elif reason == "mandate_invalid":
            method = random.choice(["mandate", "upi"])
        else:
            method = random.choices(PAYMENT_METHODS, weights=[0.30, 0.40, 0.15, 0.10, 0.05])[0]

        # Amount range depending on segment and method
        if customer["segment"] == "Enterprise":
            amount = round(random.uniform(50_000, 500_000), 2)
        elif customer["segment"] == "Growth":
            amount = round(random.uniform(15_000, 120_000), 2)
        elif customer["segment"] == "SMB":
            amount = round(random.uniform(2_500, 45_000), 2)
        else:
            amount = round(random.uniform(499, 12_000), 2)

        # Retry count
        retry_count = random.choices([0, 1, 2, 3], weights=[0.55, 0.25, 0.15, 0.05])[0]

        # Failed timestamp within last 72 hours
        hours_ago = random.uniform(0.5, 72.0)
        failed_at = base_time - timedelta(hours=hours_ago)

        # Priority
        if amount >= 100_000 or (customer["segment"] == "Enterprise" and amount >= 50_000):
            priority = "critical"
        elif amount >= 30_000 or customer["segment"] in ["Enterprise", "Growth"]:
            priority = "high"
        elif amount >= 5_000:
            priority = "medium"
        else:
            priority = "low"

        # Method details
        if method == "card":
            details = f"Visa •••• {random.randint(1000, 9999)}"
        elif method == "upi":
            details = f"{customer['email'].split('@')[0]}@okhdfcbank"
        elif method == "mandate":
            details = f"HDFC E-Mandate •••• {random.randint(1000, 9999)}"
        elif method == "netbanking":
            details = f"ICICI NetBanking Corporate"
        else:
            details = "Paytm Wallet Active"

        # Ground truth recovery simulation without target leakage:
        # Logistic latent propensity:
        # Base log-odds
        logit = -0.5
        # Failure reason effects:
        if reason == "technical_glitch":
            logit += 1.8  # Transient glitch recovers very easily
        elif reason == "insufficient_funds":
            logit += 0.6  # Recovers moderately well if timing aligns
        elif reason == "auth_timeout":
            logit += 0.4
        elif reason == "customer_dropoff":
            logit += 0.2
        elif reason == "card_expired":
            logit -= 1.6  # Hard decline, low base recovery unless updated
        elif reason == "limit_exceeded":
            logit -= 0.8
        elif reason == "mandate_invalid":
            logit -= 1.2

        # Customer history effects:
        logit += 2.0 * (customer["historical_recovery_rate"] - 0.5)
        logit -= 0.3 * (customer["retry_fatigue_score"] / 5.0)
        logit -= 0.4 * retry_count

        # Segment effects:
        if customer["segment"] == "Enterprise":
            logit += 0.5
        elif customer["segment"] == "Retail":
            logit -= 0.2

        # Probability via sigmoid:
        true_recovery_prob = 1.0 / (1.0 + np.exp(-logit))
        # Draw binary outcome
        recovered = bool(np.random.rand() < true_recovery_prob)

        # Initial status
        # For historical/processed data: recovered or failed
        # For active demo pipeline: at_risk
        status = "recovered" if recovered else ("failed" if retry_count >= 3 else "at_risk")

        payments.append({
            "id": pay_id,
            "customer_id": customer["id"],
            "merchant_id": "mer_acme_commerce",
            "amount": amount,
            "currency": "INR",
            "payment_method": method,
            "payment_method_details": details,
            "status": status,
            "failure_reason": reason,
            "failure_code": FAILURE_CODES[reason],
            "priority": priority,
            "retry_count": retry_count,
            "max_retries_allowed": 3,
            "failed_at": failed_at,
            "created_at": failed_at,
        })

        features_rows.append({
            "payment_id": pay_id,
            "amount": amount,
            "payment_method": method,
            "failure_reason": reason,
            "customer_success_rate": customer["historical_recovery_rate"],
            "customer_failure_count": customer["failed_payments"],
            "previous_retry_count": retry_count,
            "customer_lifetime_value": customer["lifetime_value"],
            "time_since_failure_hours": hours_ago,
            "hour_of_day": failed_at.hour,
            "day_of_week": failed_at.weekday(),
            "customer_segment": customer["segment"],
            "retry_fatigue_score": customer["retry_fatigue_score"],
            "recovered": int(recovered),  # Target label
        })

    training_df = pd.DataFrame(features_rows)
    return customers, payments, training_df
