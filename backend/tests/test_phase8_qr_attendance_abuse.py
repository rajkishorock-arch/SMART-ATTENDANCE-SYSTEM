"""
Phase 8 QR & Attendance Abuse Regression Test Suite

Verifies:
1. PIN fallback single-claim protection (AttendanceFallbackClaim enforcement).
2. Offline attendance date/time validation (future date, malformed date, 30-day boundary enforcement).
3. Teacher subject ownership enforcement for fallback session creation.
"""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security
from app.database import Base, get_db
from app.main import app
from app.core import config
from app.services.fallback_service import FallbackService

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
IST = timezone(timedelta(hours=5, minutes=30))


@pytest.fixture
def test_env(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(config, "SYSTEM_OWNER_EMAIL", "systemowner@test.com")
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed Institution 1 & 2
    inst1 = models.Institution(id=1, name="Alpha College", slug="alpha", is_active=True)
    inst2 = models.Institution(id=2, name="Beta University", slug="beta", is_active=True)
    db.add_all([inst1, inst2])
    db.commit()

    # Seed Admin (Inst 1)
    admin1 = models.User(
        id=1,
        email="admin@alpha.edu",
        name="Admin Alpha",
        password_hash=security.get_password_hash("Pass123!"),
        role="admin",
        institution_id=1,
        is_active=True,
    )

    # Seed Teacher A (Inst 1)
    teacher_a = models.User(
        id=2,
        email="teachera@alpha.edu",
        name="Teacher A",
        password_hash=security.get_password_hash("Pass123!"),
        role="teacher",
        institution_id=1,
        is_active=True,
    )

    # Seed Teacher B (Inst 1)
    teacher_b = models.User(
        id=3,
        email="teacherb@alpha.edu",
        name="Teacher B",
        password_hash=security.get_password_hash("Pass123!"),
        role="teacher",
        institution_id=1,
        is_active=True,
    )

    # Seed Student A (Inst 1)
    student_a = models.StudentModel(
        id=101,
        email="studenta@alpha.edu",
        name="Student A",
        roll="A101",
        dep="CSE",
        institution_id=1,
        consent_given=True,
    )

    # Seed Subject A (Teacher A) and Subject B (Teacher B) in Inst 1
    sub_a = models.Subject(id=10, name="Computer Science 101", code="CS101", department="CSE", teacher_id=2, institution_id=1)
    sub_b = models.Subject(id=20, name="Mathematics 201", code="MATH201", department="CSE", teacher_id=3, institution_id=1)
    
    # Seed Subject C in Inst 2
    sub_c = models.Subject(id=30, name="Physics 301", code="PHY301", department="PHY", teacher_id=99, institution_id=2)

    db.add_all([admin1, teacher_a, teacher_b, student_a, sub_a, sub_b, sub_c])
    db.commit()

    tokens = {
        "admin": security.create_access_token({"sub": "admin@alpha.edu", "role": "admin", "institution_id": 1}),
        "teacher_a": security.create_access_token({"sub": "teachera@alpha.edu", "role": "teacher", "institution_id": 1}),
        "teacher_b": security.create_access_token({"sub": "teacherb@alpha.edu", "role": "teacher", "institution_id": 1}),
        "student_a": security.create_access_token({"sub": "studenta@alpha.edu", "role": "student", "institution_id": 1}),
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
# 1. PIN FALLBACK SINGLE-CLAIM PROTECTION (FIX 1)
# ============================================================================

def test_pin_fallback_single_claim_enforced(client, test_env):
    """Verifies that a student can only claim PIN fallback ONCE per session."""
    test_client, tokens = client
    db, _ = test_env

    # Teacher A creates fallback session for Subject A
    sess_resp = test_client.post(
        "/api/v1/fallback/generate-session",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"subject_id": 10, "duration_minutes": 30}
    )
    assert sess_resp.status_code == 200
    sess_data = sess_resp.json()
    session_id = sess_data["id"]
    pin = sess_data["session_pin"]

    # First PIN claim by Student A -> Must succeed (200)
    claim1 = test_client.post(
        "/api/v1/fallback/claim-pin",
        headers={"Authorization": f"Bearer {tokens['student_a']}"},
        json={"session_id": session_id, "session_pin": pin, "fallback_reason": "Camera lens covered"}
    )
    assert claim1.status_code == 200
    assert claim1.json()["success"] is True

    # Second PIN claim by Student A -> Must be rejected (409 Conflict)
    claim2 = test_client.post(
        "/api/v1/fallback/claim-pin",
        headers={"Authorization": f"Bearer {tokens['student_a']}"},
        json={"session_id": session_id, "session_pin": pin, "fallback_reason": "Camera lens covered again"}
    )
    assert claim2.status_code == 409
    assert "already claimed" in claim2.json()["detail"].lower()

    # Verify only ONE claim record exists in DB
    claims_in_db = db.query(models.AttendanceFallbackClaim).filter(
        models.AttendanceFallbackClaim.session_id == session_id,
        models.AttendanceFallbackClaim.student_id == 101
    ).all()
    assert len(claims_in_db) == 1


# ============================================================================
# 2. OFFLINE ATTENDANCE DATE VALIDATION (FIX 2)
# ============================================================================

def test_offline_sync_future_date_rejected(client):
    """Verifies that offline sync items with future dates are rejected."""
    test_client, tokens = client
    tomorrow_str = (datetime.now(IST) + timedelta(days=1)).strftime("%d/%m/%Y")

    resp = test_client.post(
        "/api/v1/offline/sync",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"items": [{
            "client_id": "off_fut_1",
            "student_id": 101,
            "subject_id": 10,
            "custom_date": tomorrow_str,
            "custom_time": "10:00:00"
        }]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced"] == 0
    assert len(data["errors"]) > 0
    assert "Future attendance date is not allowed" in data["errors"][0]


def test_offline_sync_invalid_date_rejected(client):
    """Verifies that offline sync items with malformed dates are rejected."""
    test_client, tokens = client
    resp = test_client.post(
        "/api/v1/offline/sync",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"items": [{
            "client_id": "off_inv_1",
            "student_id": 101,
            "subject_id": 10,
            "custom_date": "not-a-valid-date",
            "custom_time": "10:00:00"
        }]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced"] == 0
    assert len(data["errors"]) > 0
    assert "Invalid date format" in data["errors"][0]


def test_offline_sync_valid_date_accepted(client):
    """Verifies that offline sync items with today's date are accepted."""
    test_client, tokens = client
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    resp = test_client.post(
        "/api/v1/offline/sync",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"items": [{
            "client_id": "off_val_1",
            "student_id": 101,
            "subject_id": 10,
            "custom_date": today_str,
            "custom_time": "10:00:00"
        }]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced"] == 1
    assert data["errors"] == []


def test_offline_sync_boundary_and_too_old_dates(client):
    """Verifies 30-day bounded historical window: boundary (day 30) accepted, past boundary (day 31) rejected."""
    test_client, tokens = client
    day_30_str = (datetime.now(IST) - timedelta(days=30)).strftime("%d/%m/%Y")
    day_31_str = (datetime.now(IST) - timedelta(days=31)).strftime("%d/%m/%Y")

    # Day 30 boundary date -> Must succeed
    resp_30 = test_client.post(
        "/api/v1/offline/sync",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"items": [{
            "client_id": "off_b30_1",
            "student_id": 101,
            "subject_id": 10,
            "custom_date": day_30_str,
            "custom_time": "10:00:00"
        }]}
    )
    assert resp_30.status_code == 200
    assert resp_30.json()["synced"] == 1

    # Day 31 date -> Must be rejected
    resp_31 = test_client.post(
        "/api/v1/offline/sync",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"items": [{
            "client_id": "off_b31_1",
            "student_id": 101,
            "subject_id": 10,
            "custom_date": day_31_str,
            "custom_time": "10:00:00"
        }]}
    )
    assert resp_31.status_code == 200
    data_31 = resp_31.json()
    assert data_31["synced"] == 0
    assert len(data_31["errors"]) > 0
    assert "older than 30 days" in data_31["errors"][0]


def test_offline_sync_invalid_time_rejected(client):
    """Verifies that offline sync items with malformed custom_time (e.g. 'abc', '99:99') are rejected."""
    test_client, tokens = client
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    resp = test_client.post(
        "/api/v1/offline/sync",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"items": [{
            "client_id": "off_inv_t1",
            "student_id": 101,
            "subject_id": 10,
            "custom_date": today_str,
            "custom_time": "99:99"
        }]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced"] == 0
    assert len(data["errors"]) > 0
    assert "Invalid time format" in data["errors"][0]


def test_offline_sync_omitted_time_accepted(client):
    """Verifies that offline sync items with omitted/None custom_time are accepted and default to server time."""
    test_client, tokens = client
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    resp = test_client.post(
        "/api/v1/offline/sync",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"items": [{
            "client_id": "off_no_time_1",
            "student_id": 101,
            "subject_id": 10,
            "custom_date": today_str,
            "custom_time": None
        }]}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced"] == 1
    assert data["errors"] == []


# ============================================================================
# 3. TEACHER SUBJECT OWNERSHIP ENFORCEMENT (FIX 3)
# ============================================================================

def test_teacher_cannot_create_fallback_for_other_teacher_subject(client):
    """Verifies Teacher A cannot create a fallback session for Teacher B's assigned subject."""
    test_client, tokens = client
    # Teacher A attempts to generate session for Subject B (id=20, teacher_id=3)
    resp = test_client.post(
        "/api/v1/fallback/generate-session",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"subject_id": 20, "duration_minutes": 30}
    )
    assert resp.status_code == 403
    assert "Unauthorized" in resp.json()["detail"]


def test_teacher_can_create_fallback_for_own_subject(client):
    """Verifies Teacher A can create a fallback session for own assigned subject."""
    test_client, tokens = client
    # Teacher A generates session for Subject A (id=10, teacher_id=2)
    resp = test_client.post(
        "/api/v1/fallback/generate-session",
        headers={"Authorization": f"Bearer {tokens['teacher_a']}"},
        json={"subject_id": 10, "duration_minutes": 30}
    )
    assert resp.status_code == 200
    assert resp.json()["subject_id"] == 10


def test_admin_fallback_subject_authorization_preserved(client):
    """Verifies Admin can create fallback session for any subject in institution."""
    test_client, tokens = client
    resp = test_client.post(
        "/api/v1/fallback/generate-session",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={"subject_id": 20, "duration_minutes": 30}
    )
    assert resp.status_code == 200
    assert resp.json()["subject_id"] == 20


def test_cross_tenant_fallback_subject_rejected(client):
    """Verifies attempting to create fallback session for a subject in another institution returns 404."""
    test_client, tokens = client
    # Subject 30 belongs to Inst 2
    resp = test_client.post(
        "/api/v1/fallback/generate-session",
        headers={"Authorization": f"Bearer {tokens['admin']}"},
        json={"subject_id": 30, "duration_minutes": 30}
    )
    assert resp.status_code == 404
    assert "Subject not found" in resp.json()["detail"]
