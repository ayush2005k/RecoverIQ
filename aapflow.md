# App Flow — Revenue Recovery Decision Engine

## Main Flow
1. Merchant opens dashboard.
2. System displays revenue-at-risk summary.
3. Merchant opens failed payment.
4. System displays payment/customer context.
5. ML model predicts recovery probabilities.
6. Decision engine evaluates eligible actions.
7. Policy engine blocks unsafe actions.
8. Best permitted action is selected.
9. AI generates a human-readable explanation.
10. User can simulate/execute the test-mode action.
11. Outcome is recorded.
12. Dashboard updates recovered revenue.

## Dashboard Flow
Dashboard
→ Revenue at Risk
→ Recoverable Revenue
→ Recovery Rate
→ AI vs Baseline
→ High-priority payments
→ Recent decisions

## Payment Detail Flow
Payment
→ Failure reason
→ Customer history
→ Recovery probability
→ Candidate actions
→ Recommended action
→ Why this action?
→ Guardrails
→ Execute/Simulate
→ Outcome

## Decision Flow
Event
→ Validate
→ Feature generation
→ ML score
→ Candidate action scoring
→ Policy validation
→ Select action
→ Explain
→ Execute
→ Record outcome

## Demo Flow
Start with a merchant containing 5,000–10,000 synthetic failed payments.
Show the baseline.
Run AI strategy.
Show increased recovery.
Open one payment and explain its decision.
Show audit trail.
