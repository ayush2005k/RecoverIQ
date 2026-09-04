# Implementation Planner — Revenue Recovery Decision Engine

## Day 1 — Foundation
- Create GitHub repository.
- Create FastAPI project.
- Create React/Vite frontend.
- Set up PostgreSQL.
- Create SQLAlchemy models.
- Create synthetic payment/customer dataset.
- Seed database.
- Add health and payment APIs.

Deliverable: data visible through API and basic dashboard.

## Day 2 — ML
- Define recovery label.
- Build baseline Logistic Regression.
- Build XGBoost candidate.
- Evaluate accuracy/precision/recall and calibration.
- Save model with Joblib.
- Build prediction endpoint.

Deliverable: every failed payment gets recovery probability.

## Day 3 — Decision Intelligence
- Implement candidate action scoring.
- Implement policy/guardrails.
- Add LLM explanation.
- Add decision endpoint.
- Add action simulator.
- Record decisions and outcomes.

Deliverable: end-to-end payment → prediction → decision → action → outcome.

## Day 4 — Dashboard
- Dashboard metrics.
- At-risk payment table.
- Payment detail page.
- AI explanation component.
- AI vs baseline charts.
- Audit page.
- Error states/loading states.

Deliverable: polished working product.

## Day 5 — Submission
- Generate larger test dataset.
- Run complete evaluation.
- Fix bugs.
- Add tests.
- Dockerize if time remains.
- Deploy.
- Write README.
- Add architecture diagram.
- Record 5-minute demo.
- Prepare pitch.
- Final GitHub cleanup.

## Must-have before submission
- Working end-to-end flow.
- Reproducible seed/evaluation script.
- Clear metrics.
- No exposed API keys.
- README with architecture and setup.
- Screenshots/demo.
- Honest limitations.
