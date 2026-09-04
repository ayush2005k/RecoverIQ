from datetime import datetime, timezone
from typing import Dict, Any, List
import pandas as pd
from ..models.payment import Payment
from ..models.customer import Customer

# List of numerical and categorical feature names
NUMERICAL_FEATURES = [
    "amount",
    "customer_success_rate",
    "customer_failure_count",
    "previous_retry_count",
    "customer_lifetime_value",
    "time_since_failure_hours",
    "hour_of_day",
    "day_of_week",
    "retry_fatigue_score",
]

CATEGORICAL_FEATURES = [
    "payment_method",
    "failure_reason",
    "customer_segment",
]

ALL_FEATURE_COLUMNS = NUMERICAL_FEATURES + CATEGORICAL_FEATURES

def extract_features_from_models(payment: Payment, customer: Customer) -> Dict[str, Any]:
    """Extract raw ML feature dictionary from Payment and Customer instances."""
    now = datetime.now(timezone.utc)
    failed_dt = payment.failed_at
    if failed_dt.tzinfo is None:
        failed_dt = failed_dt.replace(tzinfo=timezone.utc)
    
    time_since_failure = max(0.0, (now - failed_dt).total_seconds() / 3600.0)

    features = {
        "amount": float(payment.amount),
        "payment_method": str(payment.payment_method),
        "failure_reason": str(payment.failure_reason),
        "customer_success_rate": float(customer.historical_recovery_rate),
        "customer_failure_count": int(customer.failed_payments),
        "previous_retry_count": int(payment.retry_count),
        "customer_lifetime_value": float(customer.lifetime_value),
        "time_since_failure_hours": float(time_since_failure),
        "hour_of_day": int(failed_dt.hour),
        "day_of_week": int(failed_dt.weekday()),
        "customer_segment": str(customer.segment),
        "retry_fatigue_score": float(customer.retry_fatigue_score),
    }
    return features

def features_to_dataframe(features_list: List[Dict[str, Any]]) -> pd.DataFrame:
    """Convert a list of feature dicts to a standardized Pandas DataFrame."""
    df = pd.DataFrame(features_list)
    # Ensure all expected columns are present
    for col in ALL_FEATURE_COLUMNS:
        if col not in df.columns:
            if col in NUMERICAL_FEATURES:
                df[col] = 0.0
            else:
                df[col] = "unknown"
    return df[ALL_FEATURE_COLUMNS]
