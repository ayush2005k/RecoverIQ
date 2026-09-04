import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.models.base import Base
from app.models.customer import Customer
from app.models.payment import Payment
from app.db.session import get_db
from app.main import app
from app.ml.train import train_recovery_model

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return engine

@pytest.fixture(scope="session")
def trained_model():
    # Ensure model is trained and saved
    metrics = train_recovery_model(num_records=500, seed=42)
    return metrics

@pytest.fixture
def db(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def sample_customer_and_payment(db):
    cust = Customer(
        id="cust_test01",
        external_customer_id="ext_cust_test01",
        name="Acme Corp Test",
        email="finance@acmecorp.in",
        segment="Enterprise",
        lifetime_value=4500000.0,
        total_payments=150,
        successful_payments=142,
        failed_payments=8,
        historical_recovery_rate=0.946,
        avg_recovery_latency_hours=3.5,
        retry_fatigue_score=1.2,
        created_at=datetime.now(timezone.utc),
    )
    db.add(cust)
    db.commit()

    pay = Payment(
        id="pay_test01",
        customer_id=cust.id,
        merchant_id="mer_test",
        amount=125000.0,
        currency="INR",
        payment_method="card",
        payment_method_details="HDFC Corporate Visa •••• 1234",
        status="at_risk",
        failure_reason="insufficient_funds",
        failure_code="ERR_INSUFFICIENT_FUNDS_51",
        priority="critical",
        retry_count=0,
        max_retries_allowed=3,
        failed_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    db.add(pay)
    db.commit()

    return cust, pay
