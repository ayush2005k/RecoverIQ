# RecoverIQ — AI Revenue Recovery Decision Engine

> An autonomous, policy-governed revenue recovery decision engine that optimizes post-decline interventions for enterprise and high-volume billing platforms.

---

## 1. What is RecoverIQ?

**RecoverIQ** is an institutional-grade decision engine that transforms payment recovery from naive, static retry loops into mathematically optimized, policy-verified intervention routing. 

When a recurring subscription, invoice, or checkout payment fails, legacy billing systems typically represent the transaction repeatedly at fixed intervals (e.g. daily for 3 days). This naive strategy burns acquirer retry quotas, increases customer fatigue, damages bank acceptance scores, and fails completely on structural declines like expired cards or broken mandates.

RecoverIQ replaces blind retries with:
1. **ML-Driven Base Recovery Predictions**: Evaluates customer payment history, ticket amount, failure codes, and banking cadence.
2. **Action-Specific Expected Value Optimization**: Evaluates all 7 canonical recovery actions and calculates Expected Recovery Value ($\text{EV} = \text{Amount} \times P(\text{success} \mid \text{action})$).
3. **Deterministic Policy Guardrails**: Enforces non-negotiable regulatory, issuer, and contact rules (RBI retry thresholds, 72-hour recovery window, contact cooldown, rail health).
4. **Evidence-Based Structured Explanations**: Generates transparent, auditable post-decision rationales without claiming unverified network state.
5. **Synthetic Rail Simulation & Audit**: Executes test-mode recovery on synthetic payment rails with immutable audit trail logging.

---

## 2. The Problem RecoverIQ Solves

In recurring billing and subscription commerce:
- **High Involuntary Churn**: Up to 9% of recurring revenue is lost annually to passive payment failures.
- **Wasted Retry Quotas**: Payment networks and card networks penalize repeated presentations of dead instruments.
- **Poor Intervention Matching**: An expired card cannot be recovered by retrying in 6 hours; it requires a token update. An insufficient-funds decline during bank clearing requires timed representation, not immediate re-presentation.
- **Black-Box AI Skepticism**: Financial institutions reject unconstrained generative agents making autonomous monetary decisions. RecoverIQ solves this by placing deterministic policy guardrails in front of every action.

---

## 3. How the AI Decision Engine Works

The RecoverIQ decision pipeline runs a four-stage sequential architecture:

```
Failed Payment Event
       ↓
[Stage 1: Context Extraction]
Extract customer financial history, lifetime value, failure taxonomy, retry quota, and time elapsed
       ↓
[Stage 2: Machine Learning Prediction]
Logistic Regression model predicts base recovery probability P(base)
       ↓
[Stage 3: Action Scoring & Guardrail Verification]
Evaluate all 7 canonical actions: derive action probabilities & calculate Expected Recovery Value (EV)
Verify 4 deterministic policy guardrails (PASS / RESTRICTED / BLOCK)
Select eligible non-blocked action with highest Expected Value
       ↓
[Stage 4: Post-Decision Explanation & Execution]
Synthesize evidence-based 3-part structured explanation (Why selected, Telemetry drivers, Tradeoffs)
Simulate test-mode execution on synthetic payment rail and log immutable audit trail
```

---

## 4. The 7 Canonical Recovery Actions

RecoverIQ evaluates all seven canonical actions for every transaction:

| Canonical Action | Description | Primary Use Case |
| :--- | :--- | :--- |
| `retry_now` | Immediate presentation to gateway switch | Transient acquirer/network glitches |
| `retry_later` | Timed retry during customer liquidity window (+6h) | Insufficient funds with high historical success |
| `send_payment_link` | Dispatches dynamic multi-rail payment link (UPI, NetBanking) | Single-rail limits exceeded or auth timeouts |
| `send_reminder` | Non-intrusive alert via SMS / Email without charge | High fatigue score or customer dropoff |
| `request_payment_method_update` | Prompts RBI-compliant tokenization refresh | Expired card token or paused/invalid mandate |
| `escalate_to_human` | Creates priority ticket for dedicated Relationship Manager | High-LTV Enterprise accounts with large amounts |
| `stop_recovery` | Terminal abandon; suppresses further retries | Exhausted retry quota or persistent non-recovery |

---

## 5. Deterministic Policy Guardrails (4 Gates)

Guardrails are strictly deterministic code gates evaluated prior to execution. Blocked actions **cannot** become the selected strategy, even if their theoretical EV is high:

1. **Retry Threshold Limit (`g_retry_limit`)**: Enforces maximum allowable automated representations per billing cycle (RBI/Acquirer quota, max 3).
2. **72-Hour Active Recovery Window (`g_recovery_window`)**: Sets temporal policy boundaries for autonomous algorithmic intervention.
3. **Customer Contact Cooldown & Fatigue (`g_contact_cooldown`)**: Throttles outbound messaging when fatigue exceeds thresholds (max 2 touchpoints per 24h).
4. **Payment-Method Eligibility & Rail Health (`g_method_eligibility`)**: Validates token validity and mandate health. Direct presentations on expired cards or invalid mandates are strictly `BLOCKED`.

---

## 6. Synthetic Evaluation Results

> **Evaluation Methodology**: RecoverIQ and the legacy baseline were evaluated against the exact same **3,000-payment synthetic evaluation cohort** loaded from the database using reproducible pseudo-random seeds. These metrics reflect empirical synthetic evaluation:

| Metric | Fixed Naive Baseline | RecoverIQ Engine | Net Lift / Improvement |
| :--- | :---: | :---: | :---: |
| **Evaluated Cohort** | 3,000 cases | 3,000 cases | — |
| **Recovered Cases** | 1,676 | 2,296 | **+620 cases** |
| **Recovery Rate** | **55.87%** | **76.53%** | **+20.67 percentage points** |
| **Relative Lift** | — | — | **+36.99% relative lift** |
| **Recovered Revenue** | ₹118,830,310.81 | ₹154,791,022.27 | **+₹35,960,711.46 incremental** |
| **Policy Violations** | N/A | **0 (100% compliant)** | Zero blocked actions executed |

---

## 7. Tech Stack & Architecture

- **Backend**: Python 3.11, FastAPI, SQLAlchemy ORM, SQLite (PostgreSQL compatible via `DATABASE_URL`), Pydantic v2, Scikit-learn, NumPy.
- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, Recharts.
- **Architecture**:
  - `backend/app/api/`: REST endpoints for dashboard, payments, decisions, metrics, simulation, and data seeding.
  - `backend/app/models/`: Declarative relational models with foreign key constraints and audit logging.
  - `backend/app/engine/`: Policy orchestrator, action scoring, deterministic guardrails, and explanation generator.
  - `backend/app/ml/`: Feature preprocessing, stratified train/test split, calibrated Logistic Regression model, artifact persistence.
  - `backend/app/simulation/`: Synthetic payment rail simulator with test-mode transaction reference generation.
  - `src/components/dashboard/`: Executive Dashboard, Payments Worklist, Decision Workspace, Audit History, Strategy Analytics.

---

## 8. Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ (tested on Node 22 / 24)
- npm 9+

---

### Step 1: Start the Backend

```bash
cd backend

# Create virtual environment (Windows)
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The backend server runs on `http://127.0.0.1:8000`. Interactive OpenAPI documentation is accessible at `http://127.0.0.1:8000/docs`.

---

### Step 2: Start the Frontend

Open a new terminal window:

```bash
# In the project root directory
npm install

# Start Vite dev server on port 3000
npm run dev
```

Open your browser at `http://localhost:3000`.

---

### Step 3: Seed Synthetic Data (Optional / Automated)

The database automatically seeds on first launch. To manually re-seed with reproducible data:

```bash
# Via curl / PowerShell
curl -X POST "http://127.0.0.1:8000/data/seed?count=3000&seed=42"
```

---

### Step 4: Run the Test Suites

**Backend Unit & Integration Tests (18 tests)**:
```bash
cd backend
.\.venv\Scripts\pytest
```

**Frontend Typecheck & Production Build**:
```bash
npm run lint
npm run build
```

---

## 9. Simulation Safety Disclaimer

**TEST / SYNTHETIC MODE ONLY**: RecoverIQ operates exclusively in simulated test-mode. All payment rails, acquirer responses, and transaction references (`sim_tx_...`) are synthetic. Zero real money movement or production payment credentials are used or required.
