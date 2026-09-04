from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..deps import get_db
from ...models.payment import Payment
from ...models.customer import Customer
from ...models.decision import RecoveryDecision
from ...models.action import RecoveryAction, RecoveryOutcome
from ...schemas.payloads import (
    DashboardSummary,
    TimeseriesDataPoint,
    FailureReasonBreakdown,
    PaymentMethodBreakdown,
)
from ...schemas.common import FailureReason, PaymentMethod
from .payments import payment_to_schema
from .decisions import decision_to_schema

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Computes and aggregates institutional recovery KPIs, breakdowns, and queue items."""
    # 1. Total payments & active cases
    total_payments_count = db.query(Payment).count()
    active_cases = db.query(Payment).filter(Payment.status.in_(["at_risk", "recovering"])).all()
    active_cases_count = len(active_cases)

    # 2. Revenue at risk (sum of unresolved payments)
    revenue_at_risk = sum(p.amount for p in active_cases) if active_cases else 0.0

    # 3. Predicted recoverable revenue (sum of EV for active cases)
    # Join with latest decision if present, else estimate from base probability
    active_ids = [p.id for p in active_cases]
    decisions_for_active = (
        db.query(RecoveryDecision)
        .filter(RecoveryDecision.payment_id.in_(active_ids))
        .all()
    )
    dec_map = {d.payment_id: d.expected_recovery for d in decisions_for_active}
    predicted_recoverable = sum(dec_map.get(p.id, p.amount * 0.70) for p in active_cases)

    # 4 & 5. Comparative evaluation against baseline using unified evaluator
    from ...core.config import settings
    from ...baseline.evaluator import evaluate_database_payments
    eval_metrics = evaluate_database_payments(db, base_seed=settings.SEED)

    revenue_recovered = eval_metrics["recoveriq"]["recovered_revenue"]
    ai_recovery_rate = eval_metrics["recoveriq"]["recovery_rate"]
    baseline_recovery_rate = eval_metrics["baseline"]["recovery_rate"]
    incremental_revenue = eval_metrics["incremental"]["incremental_recovered_revenue"]
    incremental_pct = eval_metrics["incremental"]["relative_lift_percentage"]
    total_processed = eval_metrics["total_cases_evaluated"]

    # 6. Failure Reason Breakdown
    failure_breakdown_list: List[FailureReasonBreakdown] = []
    failure_reasons_all = [
        ("insufficient_funds", "Insufficient Funds"),
        ("technical_glitch", "Issuer / Gateway Glitch"),
        ("auth_timeout", "OTP / 3DS Timeout"),
        ("card_expired", "Expired Card"),
        ("mandate_invalid", "Mandate Limit / Paused"),
        ("limit_exceeded", "Card / UPI Limit Exceeded"),
        ("customer_dropoff", "Checkout Drop-off"),
    ]

    for f_key, f_label in failure_reasons_all:
        f_payments = db.query(Payment).filter(Payment.failure_reason == f_key).all()
        f_count = len(f_payments)
        f_risk = sum(p.amount for p in f_payments)
        f_rec_cases = [p for p in f_payments if p.status == "recovered"]
        f_rec_rev = sum(p.amount for p in f_rec_cases)
        f_rate = round(len(f_rec_cases) / max(1, f_count), 3)

        failure_breakdown_list.append(
            FailureReasonBreakdown(
                reason=FailureReason(f_key),
                label=f_label,
                revenueAtRisk=f_risk,
                recoveredRevenue=f_rec_rev,
                recoveryRate=f_rate,
                caseCount=f_count,
            )
        )

    # 7. Payment Method Breakdown
    method_breakdown_list: List[PaymentMethodBreakdown] = []
    payment_methods_all = [
        ("upi", "UPI Intent & AutoPay"),
        ("card", "Credit & Debit Cards"),
        ("netbanking", "NetBanking Corporate"),
        ("mandate", "Recurring E-Mandate"),
        ("wallet", "Prepaid Wallets"),
    ]

    total_all_volume = sum(p.amount for p in db.query(Payment).all()) or 1.0

    for m_key, m_label in payment_methods_all:
        m_payments = db.query(Payment).filter(Payment.payment_method == m_key).all()
        m_risk = sum(p.amount for p in m_payments)
        m_rec_cases = [p for p in m_payments if p.status == "recovered"]
        m_rec_rev = sum(p.amount for p in m_rec_cases)
        m_rate = round(len(m_rec_cases) / max(1, len(m_payments)), 3)
        m_share = round((m_risk / total_all_volume) * 100, 1)

        method_breakdown_list.append(
            PaymentMethodBreakdown(
                method=PaymentMethod(m_key),
                label=m_label,
                revenueAtRisk=m_risk,
                recoveredRevenue=m_rec_rev,
                recoveryRate=m_rate,
                sharePercent=m_share,
            )
        )

    # 8. Timeseries
    timeseries = [
        TimeseriesDataPoint(date="2026-08-01", label="W1 Aug", aiRecovered=round(revenue_recovered * 0.12, 2), baselineRecovered=round(revenue_recovered * 0.08, 2), revenueAtRisk=round(revenue_at_risk * 0.20, 2)),
        TimeseriesDataPoint(date="2026-08-08", label="W2 Aug", aiRecovered=round(revenue_recovered * 0.26, 2), baselineRecovered=round(revenue_recovered * 0.17, 2), revenueAtRisk=round(revenue_at_risk * 0.40, 2)),
        TimeseriesDataPoint(date="2026-08-15", label="W3 Aug", aiRecovered=round(revenue_recovered * 0.45, 2), baselineRecovered=round(revenue_recovered * 0.29, 2), revenueAtRisk=round(revenue_at_risk * 0.60, 2)),
        TimeseriesDataPoint(date="2026-08-22", label="W4 Aug", aiRecovered=round(revenue_recovered * 0.68, 2), baselineRecovered=round(revenue_recovered * 0.44, 2), revenueAtRisk=round(revenue_at_risk * 0.80, 2)),
        TimeseriesDataPoint(date="2026-08-29", label="W5 Aug", aiRecovered=round(revenue_recovered * 0.88, 2), baselineRecovered=round(revenue_recovered * 0.58, 2), revenueAtRisk=round(revenue_at_risk * 0.92, 2)),
        TimeseriesDataPoint(date="2026-09-04", label="Current", aiRecovered=round(revenue_recovered, 2), baselineRecovered=round(revenue_recovered * 0.64, 2), revenueAtRisk=round(revenue_at_risk, 2)),
    ]

    # 9. Top high-priority cases (at-risk critical/high payments)
    high_priority_payments = (
        db.query(Payment)
        .filter(Payment.status.in_(["at_risk", "recovering"]))
        .order_by(Payment.amount.desc())
        .limit(10)
        .all()
    )
    high_priority_cases = [payment_to_schema(p, db) for p in high_priority_payments]

    # 10. Recent decisions
    recent_decisions_db = (
        db.query(RecoveryDecision)
        .order_by(RecoveryDecision.created_at.desc())
        .limit(10)
        .all()
    )
    recent_decisions = [decision_to_schema(d, db) for d in recent_decisions_db]

    return DashboardSummary(
        revenueAtRisk=round(revenue_at_risk, 2),
        predictedRecoverableRevenue=round(predicted_recoverable, 2),
        revenueRecovered=round(revenue_recovered, 2),
        incrementalRevenue=round(incremental_revenue, 2),
        incrementalPercentage=incremental_pct,
        recoveryRate=ai_recovery_rate,
        baselineRecoveryRate=baseline_recovery_rate,
        activeCasesCount=active_cases_count,
        totalCasesProcessed=total_payments_count,
        timeseries=timeseries,
        failureBreakdown=failure_breakdown_list,
        methodBreakdown=method_breakdown_list,
        highPriorityCases=high_priority_cases,
        recentDecisions=recent_decisions,
        datasetType="synthetic_demo",
        lastUpdated=datetime.now(timezone.utc).isoformat(),
    )
