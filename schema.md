# Schema — Revenue Recovery Decision Engine

## customers
- id UUID PK
- external_customer_id VARCHAR
- total_payments INT
- successful_payments INT
- failed_payments INT
- customer_lifetime_value NUMERIC
- created_at TIMESTAMP

## payments
- id UUID PK
- customer_id UUID FK
- merchant_id UUID
- amount NUMERIC
- currency VARCHAR
- payment_method VARCHAR
- status VARCHAR
- failure_reason VARCHAR
- created_at TIMESTAMP

## recovery_predictions
- id UUID PK
- payment_id UUID FK
- model_version VARCHAR
- recovery_probability NUMERIC
- predicted_at TIMESTAMP

## recovery_decisions
- id UUID PK
- payment_id UUID FK
- recommended_action VARCHAR
- expected_recovery NUMERIC
- explanation TEXT
- confidence NUMERIC
- policy_status VARCHAR
- created_at TIMESTAMP

## recovery_actions
- id UUID PK
- decision_id UUID FK
- action_type VARCHAR
- execution_status VARCHAR
- executed_at TIMESTAMP
- external_reference VARCHAR NULL

## recovery_outcomes
- id UUID PK
- action_id UUID FK
- recovered BOOLEAN
- recovered_amount NUMERIC
- recovery_time_minutes INT NULL
- recorded_at TIMESTAMP

## audit_logs
- id UUID PK
- entity_type VARCHAR
- entity_id UUID
- event_type VARCHAR
- details JSONB
- created_at TIMESTAMP
