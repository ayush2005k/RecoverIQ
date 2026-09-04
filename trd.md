# TRD — Revenue Recovery Decision Engine

## 1. Architecture
React dashboard → FastAPI → PostgreSQL
                         ↓
                 Feature/Decision Layer
                   ↙          ↘
             ML Model        LLM
                ↓              ↓
          Recovery score   Explanation
                   ↘          ↙
                 Policy Engine
                      ↓
             Action Simulator/API
                      ↓
                 Outcome Tracker

## 2. Recommended Stack
### Backend
- Python 3.11+
- FastAPI
- Pydantic
- SQLAlchemy
- PostgreSQL

### Data/ML
- Pandas
- NumPy
- Scikit-learn
- XGBoost
- Joblib

### AI
- Groq or Gemini API
- Optional LangGraph; not required for MVP

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts
- Axios

### Testing/DevOps
- Pytest
- Postman
- Git/GitHub
- Docker optional

### Deployment
- Vercel for frontend
- Render/Railway for backend
- Neon/Supabase PostgreSQL

## 3. ML Design
Task: predict probability that an at-risk payment will recover under a defined strategy.

Candidate features:
- amount
- payment_method
- failure_reason
- customer_success_rate
- customer_failure_count
- previous_retry_count
- customer_lifetime_value
- time_since_failure
- hour/day
- merchant segment

Baseline: Logistic Regression.
Candidate final model: XGBoost.

## 4. Decision Design
For every candidate action calculate:
expected_recovered_value = amount × estimated_success_probability

Then apply:
- retry limits
- time windows
- customer-contact limits
- amount/risk policies
- action eligibility

The LLM explains decisions but does not override deterministic policy rules.

## 5. API Endpoints
GET /health
GET /dashboard/summary
GET /payments
GET /payments/{id}
POST /payments/{id}/score
POST /payments/{id}/decide
POST /payments/{id}/execute
GET /decisions
GET /metrics
POST /data/seed

## 6. Security
- Secrets only in environment variables.
- Never commit API keys.
- Use test/simulated payment actions.
- Validate all requests with Pydantic.
- Log action and decision IDs.
- Never allow the LLM to directly call financial APIs.

## 7. Failure Handling
- LLM unavailable → deterministic explanation template.
- ML unavailable → baseline score.
- Database unavailable → return controlled error.
- Action unavailable → mark as pending/failed; never silently claim recovery.
