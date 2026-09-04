import urllib.request
import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://127.0.0.1:8000"

def request(path, method="GET", data=None):
    url = BASE_URL + path
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            res_data = json.loads(resp.read().decode("utf-8"))
            return status, res_data
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))
    except Exception as e:
        return 500, {"error": str(e)}

def main():
    print("Running Live HTTP Smoke Test against:", BASE_URL)
    print("=" * 60)

    # 1. GET /health
    status, d = request("/health")
    print(f"[PASS] 1. GET /health -> HTTP {status}")
    print(f"       Response: status={d.get('status')}, service='{d.get('service')}'")
    assert status == 200

    # 2. GET /payments
    status, d = request("/payments?limit=5")
    print(f"[PASS] 2. GET /payments -> HTTP {status}")
    print(f"       Total Payments: {d.get('total')}, Returned in Page: {len(d.get('items', []))}")
    assert status == 200
    assert len(d["items"]) > 0
    first_payment_id = d["items"][0]["id"]

    # 3. GET /payments/{id}
    status, d = request(f"/payments/{first_payment_id}")
    print(f"[PASS] 3. GET /payments/{first_payment_id} -> HTTP {status}")
    print(f"       Amount: ₹{d.get('amount'):,.2f}, Reason: {d.get('failureReason')}, Recommended: {d.get('recommendedAction')}")
    assert status == 200

    # 4. POST /payments/{id}/score
    status, d = request(f"/payments/{first_payment_id}/score", method="POST")
    print(f"[PASS] 4. POST /payments/{first_payment_id}/score -> HTTP {status}")
    print(f"       Base ML Recovery Probability: {d.get('baseRecoveryProbability') * 100:.2f}%, Model: {d.get('modelVersion')}")
    assert status == 200

    # 5. POST /payments/{id}/decide
    status, d = request(f"/payments/{first_payment_id}/decide", method="POST")
    print(f"[PASS] 5. POST /payments/{first_payment_id}/decide -> HTTP {status}")
    print(f"       Winning Action: {d.get('recommendedAction')} ({d.get('actionLabel')})")
    print(f"       Expected Recovery: ₹{d.get('expectedRecoveryValue'):,.2f}, Candidates Evaluated: {len(d.get('candidateActions', []))}")
    assert status == 200

    # 6. POST /payments/{id}/execute
    status, d = request(f"/payments/{first_payment_id}/execute", method="POST")
    print(f"[PASS] 6. POST /payments/{first_payment_id}/execute -> HTTP {status}")
    print(f"       Execution Status: {d.get('executionStatus')}, Recovered: {d.get('recovered')}, Ref: {d.get('simulatedReference')}")
    assert status == 200

    # 7. GET /decisions
    status, d = request("/decisions?limit=5")
    print(f"[PASS] 7. GET /decisions -> HTTP {status}")
    print(f"       Total Decisions: {d.get('total')}, Returned: {len(d.get('items', []))}")
    assert status == 200

    # 8. GET /metrics
    status, d = request("/metrics")
    print(f"[PASS] 8. GET /metrics -> HTTP {status}")
    comparison = d.get("recoveryComparison", {})
    base_rate = comparison.get("baseline", {}).get("recovery_rate")
    ai_rate = comparison.get("recoveriq", {}).get("recovery_rate")
    inc_rev = comparison.get("incremental", {}).get("incremental_recovered_revenue")
    lift_pct = comparison.get("incremental", {}).get("relative_lift_percentage")
    abs_lift = comparison.get("incremental", {}).get("absolute_recovery_rate_improvement")
    print(f"       Evaluation Sample: {d.get('evaluationSampleCount')} cases")
    print(f"       Baseline Rate: {base_rate * 100:.2f}%, RecoverIQ Rate: {ai_rate * 100:.2f}%")
    print(f"       Incremental Recovered: ₹{inc_rev:,.2f}, Absolute Lift: +{abs_lift}%, Relative Lift: +{lift_pct:.2f}%")
    assert status == 200

    # 9. GET /dashboard/summary
    status, d = request("/dashboard/summary")
    print(f"[PASS] 9. GET /dashboard/summary -> HTTP {status}")
    print(f"       Revenue At Risk: ₹{d.get('revenueAtRisk'):,.2f}, Realized Recovered: ₹{d.get('revenueRecovered'):,.2f}")
    print(f"       RecoverIQ Rate: {d.get('recoveryRate') * 100:.2f}%, Baseline Rate: {d.get('baselineRecoveryRate') * 100:.2f}%")
    print(f"       Incremental Revenue: ₹{d.get('incrementalRevenue'):,.2f}, Incremental Lift: +{d.get('incrementalPercentage')}%")
    print(f"       Active Cases: {d.get('activeCasesCount')}, Total Processed: {d.get('totalCasesProcessed')}")
    assert status == 200

    # Consistency verification between /metrics and /dashboard/summary
    assert abs(d["recoveryRate"] - ai_rate) < 0.0001, "Recovery rate mismatch between summary and metrics!"
    assert abs(d["baselineRecoveryRate"] - base_rate) < 0.0001, "Baseline rate mismatch between summary and metrics!"
    assert abs(d["incrementalRevenue"] - inc_rev) < 1.0, "Incremental revenue mismatch between summary and metrics!"
    print("[PASS] Consistency Check: GET /metrics and GET /dashboard/summary report identical numbers!")
    print("=" * 60)
    print("ALL 9 LIVE HTTP SMOKE TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
