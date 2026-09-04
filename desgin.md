# Design — Revenue Recovery Decision Engine

## Design Principles
- Financial dashboard, not chatbot-first.
- Every AI decision must be explainable.
- Show money impact prominently.
- Keep actions bounded.
- Make the AI recommendation visually distinct from execution.
- Use simple, professional fintech UI.

## Main Screens

### 1. Dashboard
Cards:
- Revenue at Risk
- Predicted Recoverable Revenue
- Recovered Revenue
- Recovery Rate
- Incremental Revenue

Charts:
- AI vs Baseline recovery
- Recovery by failure reason
- Recovery by payment method
- Recovery over time

### 2. At-Risk Payments
Table:
- Payment ID
- Amount
- Failure reason
- Recovery probability
- Recommended action
- Priority
- Status

Filters:
- failure reason
- amount
- probability
- action
- status

### 3. Payment Detail
Sections:
- Payment information
- Customer history
- Model prediction
- Candidate actions
- Recommended action
- AI explanation
- Guardrails
- Action history
- Outcome

### 4. Decision/Audit Page
Columns:
- decision ID
- payment ID
- model score
- action
- policy result
- explanation
- execution result
- timestamp

## UI Tone
Clean, compact, data-heavy, professional.
Avoid unnecessary animations and excessive AI-chat UI.
