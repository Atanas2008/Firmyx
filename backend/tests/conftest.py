import uuid
import os
import pytest

# Force in-memory rate limiting for tests (no Redis dependency)
os.environ.setdefault("REDIS_URL", "memory://")

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.middleware.rate_limiter import limiter

SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# SQLite does not natively support UUID; treat them as CHAR(32) hex strings.
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    # Disable rate limiting for tests
    limiter.enabled = False
    with TestClient(app) as c:
        yield c
    limiter.enabled = True
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "TestPass123",
            "full_name": "Test User",
        },
    )
    resp = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPass123",
        },
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_business(client, auth_headers):
    resp = client.post(
        "/api/businesses",
        json={
            "name": "Test Corp",
            "industry": "Technology",
            "country": "BG",
            "num_employees": 10,
            "years_operating": 3,
        },
        headers=auth_headers,
    )
    return resp.json()


@pytest.fixture
def test_record(client, auth_headers, test_business):
    resp = client.post(
        f"/api/businesses/{test_business['id']}/records",
        json={
            "period_month": 1,
            "period_year": 2025,
            "monthly_revenue": 50000,
            "monthly_expenses": 35000,
            "payroll": 15000,
            "rent": 3000,
            "debt": 20000,
            "cash_reserves": 100000,
            "taxes": 5000,
            "cost_of_goods_sold": 10000,
        },
        headers=auth_headers,
    )
    return resp.json()
