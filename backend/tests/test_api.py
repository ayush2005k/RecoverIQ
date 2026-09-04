import pytest
from app.schemas.common import CanonicalAction

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "RecoverIQ Decision Engine"

def test_seed_endpoint(client):
    response = client.post("/data/seed?count=200&seed=42")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["totalPayments"] == 200
    assert data["totalCustomers"] > 0

def test_payments_list_and_detail(client):
    # Fetch list
    resp = client.get("/payments?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) > 0

    pay_id = data["items"][0]["id"]

    # Fetch detail
    detail_resp = client.get(f"/payments/{pay_id}")
    assert detail_resp.status_code == 200
    p = detail_resp.json()
    assert p["id"] == pay_id
    assert "customer" in p
    assert p["customer"]["customerId"] is not None
    assert p["recoveryProbability"] > 0
    assert p["expectedRecoveryValue"] > 0
    assert p["recommendedAction"] in [a.value for a in CanonicalAction]

def test_score_and_decide_endpoints(client):
    resp = client.get("/payments?limit=1")
    pay_id = resp.json()["items"][0]["id"]

    # Score
    score_resp = client.post(f"/payments/{pay_id}/score")
    assert score_resp.status_code == 200
    score_data = score_resp.json()
    assert score_data["paymentId"] == pay_id
    assert 0.0 < score_data["baseRecoveryProbability"] < 1.0
    assert "features" in score_data

    # Decide
    decide_resp = client.post(f"/payments/{pay_id}/decide")
    assert decide_resp.status_code == 200
    dec_data = decide_resp.json()
    assert dec_data["paymentId"] == pay_id
    assert len(dec_data["candidateActions"]) == 7
    assert len(dec_data["guardrails"]) == 4
    assert "whySelected" in dec_data["structuredExplanation"]

def test_execute_simulation_endpoint(client):
    resp = client.get("/payments?limit=1")
    pay_id = resp.json()["items"][0]["id"]

    # Trigger simulation
    exec_resp = client.post(f"/payments/{pay_id}/execute")
    assert exec_resp.status_code == 200
    exec_data = exec_resp.json()
    assert exec_data["paymentId"] == pay_id
    assert exec_data["executionStatus"] in ["succeeded", "failed"]
    assert exec_data["simulatedReference"].startswith("sim_tx_")

def test_decisions_list_endpoint(client):
    resp = client.get("/decisions?limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data

def test_dashboard_summary_endpoint(client):
    resp = client.get("/dashboard/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "revenueAtRisk" in data
    assert "predictedRecoverableRevenue" in data
    assert "revenueRecovered" in data
    assert "incrementalRevenue" in data
    assert "recoveryRate" in data
    assert "baselineRecoveryRate" in data
    assert len(data["timeseries"]) > 0
    assert len(data["failureBreakdown"]) > 0
    assert len(data["methodBreakdown"]) > 0

def test_metrics_endpoint(client):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    data = resp.json()
    assert "mlMetrics" in data
    assert "recoveryComparison" in data
    assert data["recoveryComparison"]["incremental"]["incremental_recovered_revenue"] >= 0
