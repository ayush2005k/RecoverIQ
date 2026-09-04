from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ...core.config import settings
from ..deps import get_db
from ...models.customer import Customer
from ...models.payment import Payment
from ...models.decision import RecoveryDecision, CandidateActionScore, PolicyEvaluation
from ...models.action import RecoveryAction, RecoveryOutcome
from ...models.prediction import RecoveryPrediction
from ...models.audit import AuditLog
from ...ml.synthetic_generator import generate_synthetic_dataset
from ...engine.orchestrator import run_decision_pipeline
from ...schemas.payloads import SeedResponse

router = APIRouter(prefix="/data", tags=["Data"])

@router.post("/seed", response_model=SeedResponse)
def seed_database(
    count: int = Query(settings.SYNTHETIC_DATA_SIZE, ge=100, le=10000),
    seed: int = Query(settings.SEED),
    db: Session = Depends(get_db),
):
    """
    Clears current tables and seeds the database with reproducible synthetic customer and payment records.
    Pre-evaluates decisions for high-priority payments.
    """
    # 1. Clear existing data
    db.query(RecoveryOutcome).delete()
    db.query(RecoveryAction).delete()
    db.query(PolicyEvaluation).delete()
    db.query(CandidateActionScore).delete()
    db.query(RecoveryDecision).delete()
    db.query(RecoveryPrediction).delete()
    db.query(AuditLog).delete()
    db.query(Payment).delete()
    db.query(Customer).delete()
    db.commit()

    # 2. Generate synthetic data
    customers_data, payments_data, _ = generate_synthetic_dataset(num_records=count, seed=seed)

    # 3. Bulk insert customers
    customer_objs = [Customer(**cd) for cd in customers_data]
    db.bulk_save_objects(customer_objs)
    db.commit()

    # 4. Bulk insert payments
    payment_objs = [Payment(**pd) for pd in payments_data]
    db.bulk_save_objects(payment_objs)
    db.commit()

    # 5. Pre-run decisions for a representative sample of active at-risk payments (~50 payments)
    active_sample = (
        db.query(Payment)
        .filter(Payment.status == "at_risk")
        .order_by(Payment.amount.desc())
        .limit(50)
        .all()
    )
    for p in active_sample:
        try:
            run_decision_pipeline(db, p.id)
        except Exception:
            pass

    active_count = db.query(Payment).filter(Payment.status == "at_risk").count()
    recovered_count = db.query(Payment).filter(Payment.status == "recovered").count()

    return SeedResponse(
        status="success",
        totalCustomers=len(customers_data),
        totalPayments=len(payments_data),
        activeAtRisk=active_count,
        recoveredCases=recovered_count,
        seed=seed,
        message=f"Successfully seeded {len(payments_data)} payments across {len(customers_data)} customers with seed {seed}.",
    )
