from app.baseline.evaluator import evaluate_baseline_vs_recoveriq
from app.ml.synthetic_generator import generate_synthetic_dataset

def test_baseline_vs_recoveriq_empirical_evaluation():
    _, payments, _ = generate_synthetic_dataset(100, seed=42)
    cohort = [
        {
            "payment_id": p["id"],
            "amount": p["amount"],
            "failure_reason": p["failure_reason"],
            "payment_method": p["payment_method"],
            "customer_success_rate": 0.80,
            "retry_fatigue_score": 2.0,
            "recommended_action": "retry_later",
            "action_probability": 0.75,
        }
        for p in payments
    ]

    results = evaluate_baseline_vs_recoveriq(cohort, base_seed=42)

    assert results["total_cases_evaluated"] == 100
    assert results["revenue_at_risk"] > 0

    baseline = results["baseline"]
    recoveriq = results["recoveriq"]
    incremental = results["incremental"]

    # RecoverIQ should deliver higher recovery rate and higher revenue
    assert recoveriq["recovery_rate"] > baseline["recovery_rate"]
    assert recoveriq["recovered_revenue"] > baseline["recovered_revenue"]
    assert incremental["incremental_recovered_revenue"] > 0
    assert incremental["relative_lift_percentage"] > 0
