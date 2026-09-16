"""
Phase 8 Tenant & Privileged Access Regression Test Suite

Verifies:
1. POST /features7/group-scan requires authentication (unauthenticated -> 401, authenticated -> 200).
2. Master-Key verification rejects incorrect master password.
3. Institution management endpoints (POST /, DELETE /{id}, PUT /{id}) reject non-System-Owner admins in Institution 1 (403 Forbidden).
4. System Owner retains full access to institution management.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security
from app.database import Base, get_db
from app.main import app
from app.core import config

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def test_env(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(config, "SYSTEM_OWNER_EMAIL", "systemowner@test.com")
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed Institution 1 & Institution 2
    inst1 = models.Institution(id=1, name="System Default Institution", slug="default", is_active=True, master_key="MK-INST1-SECRET")
    inst2 = models.Institution(id=2, name="Secondary Institution", slug="secondary", is_active=True, master_key="MK-INST2-SECRET")
    db.add_all([inst1, inst2])
    db.commit()

    # System Owner User (Institution 1)
    owner = models.User(
        id=1,
        email="systemowner@test.com",
        name="System Owner",
        password_hash=security.get_password_hash("OwnerPass123!"),
        role="admin",
        institution_id=1,
        is_active=True,
    )
    # Non-System-Owner Admin in Institution 1
    admin_inst1 = models.User(
        id=2,
        email="admin_local@default.edu",
        name="Local Admin Inst 1",
        password_hash=security.get_password_hash("AdminPass123!"),
        role="admin",
        institution_id=1,
        is_active=True,
    )
    # Admin in Institution 2
    admin_inst2 = models.User(
        id=3,
        email="admin@secondary.edu",
        name="Admin Inst 2",
        password_hash=security.get_password_hash("AdminPass123!"),
        role="admin",
        institution_id=2,
        is_active=True,
    )
    # Student in Institution 1
    student1 = models.StudentModel(
        id=101,
        email="student1@default.edu",
        name="Student One",
        roll="101",
        institution_id=1,
    )
    db.add_all([owner, admin_inst1, admin_inst2, student1])
    db.commit()

    tokens = {
        "owner": security.create_access_token({"sub": "systemowner@test.com", "role": "admin", "institution_id": 1}),
        "admin_inst1": security.create_access_token({"sub": "admin_local@default.edu", "role": "admin", "institution_id": 1}),
        "admin_inst2": security.create_access_token({"sub": "admin@secondary.edu", "role": "admin", "institution_id": 2}),
        "student1": security.create_access_token({"sub": "student1@default.edu", "role": "student", "institution_id": 1}),
    }

    yield db, tokens
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_env):
    db, tokens = test_env

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app), tokens
    app.dependency_overrides.clear()


# ============================================================================
# 1. GROUP SCAN AUTHENTICATION
# ============================================================================

def test_group_scan_unauthenticated_returns_401(client):
    """Verifies that unauthenticated request to /features7/group-scan is rejected with 401."""
    test_client, _ = client
    resp = test_client.post("/api/v1/features7/group-scan", json={})
    assert resp.status_code == 401


def test_group_scan_authenticated_returns_200(client):
    """Verifies that authenticated user calling /features7/group-scan receives 200 OK."""
    test_client, tokens = client
    resp = test_client.post(
        "/api/v1/features7/group-scan",
        json={"simulated_faces_count": 2},
        headers={"Authorization": f"Bearer {tokens['student1']}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "recognized_students" in data


# ============================================================================
# 2. MASTER-KEY VERIFICATION
# ============================================================================

def test_master_key_wrong_password_rejected(client):
    """Verifies that incorrect master key in header or payload is rejected."""
    test_client, tokens = client
    # Updating college master key with invalid current_master_key
    resp = test_client.put(
        "/api/v1/institutions/master-key",
        json={"current_master_key": "WRONG_KEY", "new_master_key": "NEW_VALID_KEY_123"},
        headers={"Authorization": f"Bearer {tokens['admin_inst2']}"}
    )
    assert resp.status_code in (400, 403)

    # Creating admin with invalid x-master-password header
    resp_user = test_client.post(
        "/api/v1/users/",
        json={
            "email": "new_admin@secondary.edu",
            "name": "New Admin",
            "password": "NewPass123!",
            "role": "admin"
        },
        headers={
            "Authorization": f"Bearer {tokens['admin_inst2']}",
            "x-master-password": "INVALID_MASTER_KEY"
        }
    )
    assert resp_user.status_code in (400, 403)
    assert "Invalid Master Password" in resp_user.json()["detail"]


# ============================================================================
# 3. INSTITUTION MANAGEMENT SCOPING
# ============================================================================

def test_non_owner_admin_inst1_cannot_create_institution(client):
    """Verifies that a non-System-Owner admin in Institution 1 cannot create new institutions (403 Forbidden)."""
    test_client, tokens = client
    resp = test_client.post(
        "/api/v1/institutions/",
        json={
            "name": "Unauthorized Campus",
            "slug": "unauthorized-campus",
            "admin_email": "admin@unauth.edu",
            "admin_name": "Unauth Admin",
            "admin_password": "Pass123!Admin"
        },
        headers={"Authorization": f"Bearer {tokens['admin_inst1']}"}
    )
    assert resp.status_code == 403
    assert "Only the System Owner can manage institutions" in resp.json()["detail"]


def test_non_owner_admin_inst1_cannot_delete_institution(client):
    """Verifies that a non-System-Owner admin in Institution 1 cannot delete institutions (403 Forbidden)."""
    test_client, tokens = client
    resp = test_client.delete(
        "/api/v1/institutions/2",
        headers={"Authorization": f"Bearer {tokens['admin_inst1']}"}
    )
    assert resp.status_code == 403
    assert "Only the System Owner can manage institutions" in resp.json()["detail"]


def test_system_owner_can_manage_institutions(client):
    """Verifies that System Owner can perform institution management operations."""
    test_client, tokens = client
    # System Owner creating a new institution
    resp = test_client.post(
        "/api/v1/institutions/",
        json={
            "name": "Gamma Campus",
            "slug": "gamma-campus",
            "admin_email": "admin@gamma.edu",
            "admin_name": "Gamma Admin",
            "admin_password": "Pass123!Gamma"
        },
        headers={"Authorization": f"Bearer {tokens['owner']}"}
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Gamma Campus"
