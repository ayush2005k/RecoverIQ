import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .db.session import init_db, SessionLocal
from .models.payment import Payment
from .api.routes import health, payments, decisions, dashboard, metrics, data

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    init_db()

    # Train model if artifact doesn't exist
    if not os.path.exists(settings.MODEL_PATH):
        from .ml.train import train_recovery_model
        train_recovery_model(num_records=settings.SYNTHETIC_DATA_SIZE, seed=settings.SEED)

    # Auto-seed database with initial dataset if empty
    db = SessionLocal()
    try:
        count = db.query(Payment).count()
        if count == 0:
            from .api.routes.data import seed_database
            seed_database(count=settings.SYNTHETIC_DATA_SIZE, seed=settings.SEED, db=db)
    finally:
        db.close()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware for development and frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(health.router)
app.include_router(dashboard.router)
app.include_router(payments.router)
app.include_router(decisions.router)
app.include_router(metrics.router)
app.include_router(data.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
