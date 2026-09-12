import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app import models, security

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    inst = models.Institution(id=1, name="Apex Institute", slug="apex", is_active=True)
    admin = models.User(
        id=1, institution_id=1, name="Apex Admin", email="admin@apex.edu",
        password_hash=security.get_password_hash("admin123"), role="admin", is_active=True
    )
    student_user = models.User(
        id=2, institution_id=1, name="Apex Student", email="student@apex.edu",
        password_hash=security.get_password_hash("stud123"), role="student", is_active=True
    )
    db.add_all([inst, admin, student_user])
    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_security_headers_present(client):
    res = client.get("/")
    assert res.status_code == 200
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert "Strict-Transport-Security" in res.headers
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_deep_health_check(client):
    res = client.get("/api/v1/health/deep")
    assert res.status_code == 200
    data = res.json()
    assert data.get("error") is None, f"Error details: {data}"
    assert data["status"] == "healthy"
    assert "subsystems" in data
    assert data["subsystems"]["database"]["status"] == "UP"
    assert data["subsystems"]["tenancy"]["status"] == "UP"
    assert data["subsystems"]["audit_engine"]["status"] == "UP"


def test_system_backup_endpoint(client):
    admin_token = security.create_access_token(
        data={"sub": "admin@apex.edu", "role": "admin", "institution_id": 1}
    )
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    student_token = security.create_access_token(
        data={"sub": "student@apex.edu", "role": "student", "institution_id": 1}
    )
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Student forbidden
    bad_res = client.post("/api/v1/system/backup", headers=student_headers)
    assert bad_res.status_code == 403

    # Admin allowed
    good_res = client.post("/api/v1/system/backup", headers=admin_headers)
    assert good_res.status_code == 200
    assert good_res.json()["success"] is True
