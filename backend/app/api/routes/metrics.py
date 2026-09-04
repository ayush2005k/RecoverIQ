import json
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...core.config import settings
from ..deps import get_db
from ...models.payment import Payment
from ...models.decision import RecoveryDecision
from ...baseline.evaluator import evaluate_baseline_vs_recoveriq
from ...schemas.payloads import MetricsResponse

router = APIRouter(tags=["Metrics"])

@router.get("/metrics", response_model=MetricsResponse)
def get_system_metrics(db: Session = Depends(get_db)):
    """
    Returns actual ML model evaluation metrics (train/test split, accuracy, calibration)
    and empirical baseline vs RecoverIQ comparison across the payment cohort.
    """
    # 1. Load ML model metrics
    ml_metrics = {}
    if os.path.exists(settings.MODEL_METRICS_PATH):
        try:
            with open(settings.MODEL_METRICS_PATH, "r") as f:
                ml_metrics = json.load(f)
        except Exception:
            pass

    if not ml_metrics:
        from ...ml.train import train_recovery_model
        ml_metrics = train_recovery_model(num_records=settings.SYNTHETIC_DATA_SIZE, seed=settings.SEED)

    # 2. Run empirical baseline vs RecoverIQ evaluation on current DB payments
    from ...baseline.evaluator import evaluate_database_payments
    comparison_results = evaluate_database_payments(db, base_seed=settings.SEED)

    return MetricsResponse(
        modelVersion=ml_metrics.get("model_version", "RecoverIQ-LogReg-v1.0.0"),
        evaluationSampleCount=comparison_results["total_cases_evaluated"],
        mlMetrics=ml_metrics,
        recoveryComparison=comparison_results,
    )
