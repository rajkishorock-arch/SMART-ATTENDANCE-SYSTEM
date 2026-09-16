"""
Phase 8 RBAC & Authorization Regression Test Suite

Verifies:
1. Student A cannot request Student B's leave history (403 Forbidden).
2. Student A can request own leave history (200 OK).
3. Dynamic HOD role expansion: A user with is_department_head=True satisfies require_roles(["hod"]).
4. Admin/Staff non-student callers can access student leave history for their institution (200 OK).
"""
import pytest
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security
from app.database import Base, get_db
from app.main import app
from app.core import config
from app.core.dependencies import require_roles, AuthIdentity

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

    # Seed Institution 1
    inst1 = models.Institution(id=1, name="Institution Alpha", slug="alpha", is_active=True)
    db.add(inst1)
    db.commit()

    # Seed Admin User
    admin1 = models.User(
        id=1,
        email="admin@alpha.edu",
        name="Admin Alpha",
        password_hash=security.get_password_hash("Pass123!"),
        role="admin",
        institution_id=1,
        is_active=True,
    )
    # Seed Teacher / HOD User (is_department_head=True)
    hod_teacher = models.User(
        id=2,
        email="hod@alpha.edu",
        name="HOD Faculty",
        password_hash=security.get_password_hash("Pass123!"),
        role="teacher",
        is_department_head=True,
        institution_id=1,
        is_active=True,
    )
    # Seed Regular Teacher User (is_department_head=False)
    reg_teacher = models.User(
        id=3,
        email="teacher@alpha.edu",
        name="Regular Teacher",
        password_hash=security.get_password_hash("Pass123!"),
        role="teacher",
        is_department_head=False,
        institution_id=1,
        is_active=True,
    )
    db.add_all([admin1, hod_teacher, reg_teacher])

    # Seed Student A (ID=101)
    student_a = models.StudentModel(
        id=101,
        email="studenta@alpha.edu",
        name="Student A",
        roll="A101",
        dep="CSE",
        institution_id=1,
    )
    # Seed Student B (ID=102)
    student_b = models.StudentModel(
        id=102,
        email="studentb@alpha.edu",
        name="Student B",
        roll="B102",
        dep="CSE",
        institution_id=1,
    )
    db.add_all([student_a, student_b])
    db.commit()

    tokens = {
        "admin": security.create_access_token({"sub": "admin@alpha.edu", "role": "admin", "institution_id": 1}),
        "hod": security.create_access_token({"sub": "hod@alpha.edu", "role": "teacher", "institution_id": 1}),
        "teacher": security.create_access_token({"sub": "teacher@alpha.edu", "role": "teacher", "institution_id": 1}),
        "student_a": security.create_access_token({"sub": "studenta@alpha.edu", "role": "student", "institution_id": 1}),
        "student_b": security.create_access_token({"sub": "studentb@alpha.edu", "role": "student", "institution_id": 1}),
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
# TEST 1 & 2: Object-level authorization on GET /leaves/student/{student_id}
# ============================================================================

def test_student_cannot_view_other_student_leave_history(client):
    """TEST 1: Student A requesting Student B's leave history returns 403 Forbidden."""
    test_client, tokens = client
    resp = test_client.get(
        "/api/v1/leaves/student/102",
        headers={"Authorization": f"Bearer {tokens['student_a']}"}
    )
    assert resp.status_code == 403
    assert "Cannot access another student's leave requests" in resp.json()["detail"]


def test_student_can_view_own_leave_history(client):
    """TEST 2: Student A requesting Student A's leave history returns 200 OK."""
    test_client, tokens = client
    resp = test_client.get(
        "/api/v1/leaves/student/101",
        headers={"Authorization": f"Bearer {tokens['student_a']}"}
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_admin_can_view_student_leave_history(client):
    """TEST 4: Non-student Admin requesting Student B's leave history returns 200 OK."""
    test_client, tokens = client
    resp = test_client.get(
        "/api/v1/leaves/student/102",
        headers={"Authorization": f"Bearer {tokens['admin']}"}
    )
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ============================================================================
# TEST 3: Dynamic HOD Role Expansion
# ============================================================================

def test_hod_dynamic_role_expansion():
    """TEST 3: A user with is_department_head=True dynamically satisfies require_roles(['hod'])."""
    mock_user = models.User(
        id=2,
        email="hod@alpha.edu",
        name="HOD Faculty",
        role="teacher",
        is_department_head=True,
        institution_id=1,
    )
    identity = AuthIdentity(
        id=mock_user.id,
        email=mock_user.email,
        role=mock_user.role,
        name=mock_user.name,
        institution_id=mock_user.institution_id,
        model_instance=mock_user,
    )

    # Check effective role calculation
    checker = require_roles(["hod"])
    resolved_identity = checker(identity)
    assert resolved_identity.role == "teacher"
    assert resolved_identity.is_department_head is True


def test_non_hod_teacher_fails_hod_role_requirement():
    """Verifies that a teacher with is_department_head=False raises 403 for require_roles(['hod'])."""
    from fastapi import HTTPException

    mock_user = models.User(
        id=3,
        email="teacher@alpha.edu",
        name="Regular Teacher",
        role="teacher",
        is_department_head=False,
        institution_id=1,
    )
    identity = AuthIdentity(
        id=mock_user.id,
        email=mock_user.email,
        role=mock_user.role,
        name=mock_user.name,
        institution_id=mock_user.institution_id,
        model_instance=mock_user,
    )

    checker = require_roles(["hod"])
    with pytest.raises(HTTPException) as exc_info:
        checker(identity)
    assert exc_info.value.status_code == 403
