# PRD — Revenue Recovery Decision Engine
## Track 3 — AI Revenue Recovery

## 1. Product Summary
Revenue Recovery Decision Engine identifies failed or at-risk payments, predicts the probability of recovery, selects the best permitted intervention, executes/simulates the action, and measures recovered revenue.

### One-line pitch
> Don't retry every failed payment. Let AI decide which recovery action has the highest expected value.

## 2. Problem
Merchants lose revenue when payments fail. A fixed retry policy treats every failure similarly, causing unnecessary retries, poor customer experience, and missed recovery opportunities.

## 3. Goals
- Predict recovery probability for an at-risk payment.
- Rank possible recovery actions.
- Apply deterministic safety/business rules.
- Explain every recommendation.
- Track recovery outcomes.
- Compare AI strategy against a baseline strategy.
- Demonstrate incremental revenue recovered.

## 4. Non-goals
- Real production money movement.
- Fully autonomous unrestricted financial actions.
- Building a complete subscription/receivables/checkout platform.
- Complex reinforcement learning.
- Production-grade payment infrastructure.

## 5. Target User
Primary: online merchants / finance or payments operations teams.

## 6. Core User Stories
- As a merchant, I want to see revenue at risk.
- As an operator, I want to know why a payment failed.
- As an operator, I want the best recovery action recommended.
- As an operator, I want to understand why the action was selected.
- As a merchant, I want to compare AI recovery with a baseline.
- As an operator, I want every decision and action recorded.

## 7. MVP Features
1. Payment data ingestion.
2. Revenue-at-risk dashboard.
3. Recovery probability model.
4. Action scoring/decision engine.
5. Policy guardrails.
6. AI explanation.
7. Action simulation or Razorpay test-mode integration.
8. Outcome tracking.
9. Baseline vs AI metrics.
10. Decision/audit history.

## 8. Supported Actions
- Retry now
- Retry later
- Send payment link
- Send reminder
- Request payment-method update
- Escalate to human
- Stop recovery

## 9. Key Metrics
- Recovery rate
- Recovered amount
- Incremental recovered amount
- Recovery probability calibration/accuracy
- False intervention rate
- Average recovery time
- Number of retries
- AI vs baseline performance

## 10. Success Criteria
The demo should process a realistic synthetic dataset and show that the AI strategy recovers more revenue than a simple baseline while respecting guardrails.

## 11. Example
A ₹5,000 payment fails due to insufficient funds. Historical behavior indicates the customer commonly succeeds after a delay. The model predicts 78% recovery after a delayed retry. The decision engine chooses retry-after-delay plus one reminder, subject to policy limits.

## 12. Demo Outcome
Dashboard should clearly answer:
- How much revenue is at risk?
- How much is recoverable?
- What should we do?
- Why?
- How much did we recover?
- How did AI compare with baseline?
