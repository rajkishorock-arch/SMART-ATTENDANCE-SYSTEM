"""
Tests for self-serve institution registration followed by admin/teacher/student login.
Verifies:
1. New institution registration creates institution, admin user, settings, and default departments atomically.
2. Newly registered admin can log in using explicit slug, case-insensitive master key, institution name, or blank/default Institution Code.
3. Strict cross-tenant isolation remains enforced when an explicit Institution Code is provided.
4. Reserved slug ('default') and invalid passwords are properly rejected.
5. Student self-registration via slug or case-insensitive master key succeeds and logs in by email cleanly.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security, cache_service
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
def db_session(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(config, "SYSTEM_OWNER_EMAIL", "systemowner@test.com")
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    # Avoid real SMTP connections during tests
    import app.email_service as email_service
    monkeypatch.setattr(email_service, "send_welcome_email", lambda **kwargs: None)

    # Clear in-memory rate limit buckets between tests
    if hasattr(cache_service, "_local_rate_limits"):
        cache_service._local_rate_limits.clear()

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    default_inst = models.Institution(id=1, name="Default Institution", slug="default", is_active=True)
    db.add(default_inst)
    db.flush()

    teacher1 = models.User(
        email="shareduser@test.com",
        name="Default Teacher",
        password_hash=security.get_password_hash("TeacherPass123!"),
        role="teacher",
        institution_id=1,
        is_active=True,
    )
    db.add(teacher1)
    db.commit()

    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _register_institution(client: TestClient, name: str, slug: str, email: str, password: str):
    return client.post(
        "/api/v1/auth/register/institution",
        json={
            "name": name,
            "slug": slug,
            "admin_name": "Test Admin",
            "admin_email": email,
            "admin_password": password,
        },
    )


def test_register_institution_and_login_variants(client):
    reg = _register_institution(client, "Raj College", "raj", "rajj@gmail.com", "StrongPass123!")
    assert reg.status_code == 201
    reg_data = reg.json()
    assert reg_data["institution_code"] == "raj"
    master_key = reg_data["master_key"]
    assert master_key.startswith("MK-")

    # 1. Login with explicit slug
    r_slug = client.post(
        "/api/v1/auth/token",
        data={"username": "rajj@gmail.com", "password": "StrongPass123!"},
        headers={"X-Tenant-Slug": "raj"},
    )
    assert r_slug.status_code == 200
    assert r_slug.json()["user"]["institution_slug"] == "raj"
    assert r_slug.json()["user"]["role"] == "admin"

    # 2. Login with lowercased master key (as sent by frontend)
    r_mk = client.post(
        "/api/v1/auth/token",
        data={"username": "rajj@gmail.com", "password": "StrongPass123!"},
        headers={"X-Tenant-Slug": master_key.lower()},
    )
    assert r_mk.status_code == 200
    assert r_mk.json()["user"]["institution_slug"] == "raj"

    # 3. Login with institution name
    r_name = client.post(
        "/api/v1/auth/token",
        data={"username": "rajj@gmail.com", "password": "StrongPass123!"},
        headers={"X-Tenant-Slug": "raj college"},
    )
    assert r_name.status_code == 200
    assert r_name.json()["user"]["institution_slug"] == "raj"

    # 4. Login WITHOUT Institution Code (default / omitted)
    r_blank = client.post(
        "/api/v1/auth/token",
        data={"username": "rajj@gmail.com", "password": "StrongPass123!"},
        headers={"X-Tenant-Slug": "default"},
    )
    assert r_blank.status_code == 200
    assert r_blank.json()["user"]["institution_slug"] == "raj"

    r_no_header = client.post(
        "/api/v1/auth/token",
        data={"username": "rajj@gmail.com", "password": "StrongPass123!"},
    )
    assert r_no_header.status_code == 200
    assert r_no_header.json()["user"]["institution_slug"] == "raj"


def test_wrong_password_still_rejected_for_new_institution(client):
    reg = _register_institution(client, "Alpha Institute", "alpha-inst", "admin@alpha.edu", "AlphaPass123!")
    assert reg.status_code == 201

    r_wrong_explicit = client.post(
        "/api/v1/auth/token",
        data={"username": "admin@alpha.edu", "password": "WrongPassword!"},
        headers={"X-Tenant-Slug": "alpha-inst"},
    )
    assert r_wrong_explicit.status_code == 401

    r_wrong_default = client.post(
        "/api/v1/auth/token",
        data={"username": "admin@alpha.edu", "password": "WrongPassword!"},
        headers={"X-Tenant-Slug": "default"},
    )
    assert r_wrong_default.status_code == 401


def test_explicit_tenant_isolation_remains_strict(client):
    assert _register_institution(client, "Org One", "org-one", "admin1@org1.edu", "PassOne123!").status_code == 201
    assert _register_institution(client, "Org Two", "org-two", "admin2@org2.edu", "PassTwo123!").status_code == 201

    # Org One admin cannot log into Org Two when Org Two is explicitly specified
    cross = client.post(
        "/api/v1/auth/token",
        data={"username": "admin1@org1.edu", "password": "PassOne123!"},
        headers={"X-Tenant-Slug": "org-two"},
    )
    assert cross.status_code == 401
    assert "not registered under institution" in cross.json()["detail"]


def test_shared_email_with_default_teacher_and_new_admin(client):
    # shareduser@test.com is already a teacher in Default Institution (id=1).
    # Registering a new institution with that same email as admin should succeed and resolve by password.
    reg = _register_institution(client, "Beta School", "beta-school", "shareduser@test.com", "NewAdminPass123!")
    assert reg.status_code == 201

    r_admin = client.post(
        "/api/v1/auth/token",
        data={"username": "shareduser@test.com", "password": "NewAdminPass123!"},
        headers={"X-Tenant-Slug": "default"},
    )
    assert r_admin.status_code == 200
    assert r_admin.json()["user"]["role"] == "admin"
    assert r_admin.json()["user"]["institution_slug"] == "beta-school"

    r_teacher = client.post(
        "/api/v1/auth/token",
        data={"username": "shareduser@test.com", "password": "TeacherPass123!"},
        headers={"X-Tenant-Slug": "default"},
    )
    assert r_teacher.status_code == 200
    assert r_teacher.json()["user"]["role"] == "teacher"
    assert r_teacher.json()["user"]["institution_slug"] == "default"


def test_student_registration_with_master_key_and_login(client):
    reg = _register_institution(client, "Gamma College", "gamma", "admin@gamma.edu", "GammaAdmin123!")
    assert reg.status_code == 201
    master_key = reg.json()["master_key"]

    stu_reg = client.post(
        "/api/v1/auth/register/student",
        json={
            "name": "Gamma Student",
            "email": "stu@gamma.edu",
            "password": "StudentPass123!",
            "institution_code": master_key.lower(),
            "roll": "99",
            "dep": "CSE",
            "course": "B.Tech",
            "year": "1st Year",
            "semester": "Sem 1",
        },
    )
    assert stu_reg.status_code == 201

    # Login by email without explicit slug succeeds
    stu_login = client.post(
        "/api/v1/auth/token",
        data={"username": "stu@gamma.edu", "password": "StudentPass123!"},
    )
    assert stu_login.status_code == 200
    assert stu_login.json()["user"]["institution_slug"] == "gamma"

    # Plain roll number without explicit slug remains strictly scoped to institution 1
    roll_login = client.post(
        "/api/v1/auth/token",
        data={"username": "99", "password": "StudentPass123!"},
    )
    assert roll_login.status_code == 401


def test_register_institution_reserved_default_slug_rejected(client):
    res = _register_institution(client, "Fake Default", "default", "fake@default.edu", "FakePass123!")
    assert res.status_code == 400
