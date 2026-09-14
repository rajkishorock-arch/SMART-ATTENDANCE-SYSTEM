"""
Phase 0 Security Lockdown Test Suite
Verifies:
1. Normal user/admin login (valid vs invalid password).
2. SYSTEM_OWNER_EMAIL authenticates normally via DB password hash (and fails on wrong password).
3. Complete removal of master/developer password authentication.
4. Complete removal of hardcoded primary admin password fallback.
5. Password hash automatic upgrade to 600,000 PBKDF2 iterations.
6. JWT token expiration and signature verification.
"""
import os
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone
from jose import jwt
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
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def db_session(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(config, "SYSTEM_OWNER_EMAIL", "systemowner@test.com")
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed default institution
    inst = models.Institution(id=1, name="System Default Institution", slug="default")
    db.add(inst)
    db.commit()

    # Seed system owner user with known DB password hash
    owner = models.User(
        id=1,
        email="systemowner@test.com",
        name="System Owner",
        password_hash=security.get_password_hash("ValidOwnerPass123!"),
        role="admin",
        institution_id=1,
        is_active=True
    )
    db.add(owner)

    # Seed regular staff user
    staff = models.User(
        id=2,
        email="staff@test.com",
        name="Staff User",
        password_hash=security.get_password_hash("StaffPass123!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(staff)

    # Seed student
    student = models.StudentModel(
        id=1,
        email="student@test.com",
        name="Student User",
        roll="101",
        password_hash=security.get_password_hash("StudentPass123!"),
        institution_id=1
    )
    db.add(student)

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
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_normal_user_login_valid(client):
    """Normal user with correct password should authenticate successfully."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "staff@test.com", "password": "StaffPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_normal_user_login_invalid_password(client):
    """Normal user with incorrect password should be rejected with 401."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "staff@test.com", "password": "WrongPassword123!"}
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_system_owner_login_correct_db_password(client):
    """System owner authenticating with correct database password MUST succeed."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "systemowner@test.com", "password": "ValidOwnerPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


def test_system_owner_login_wrong_db_password(client):
    """System owner authenticating with wrong database password MUST fail with 401."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "systemowner@test.com", "password": "WrongOwnerPassword!"}
    )
    assert response.status_code == 401


def test_master_developer_password_authentication_completely_removed(client):
    """Former master/developer keys MUST NOT authenticate for system owner or any other account."""
    for candidate_key in ["dev_master_raj_9211_secure", "test_break_glass_master_key_2026_secure", "master_key"]:
        # System owner attempt
        res_owner = client.post(
            "/api/v1/auth/token",
            data={"username": "systemowner@test.com", "password": candidate_key}
        )
        assert res_owner.status_code == 401

        # Staff attempt
        res_staff = client.post(
            "/api/v1/auth/token",
            data={"username": "staff@test.com", "password": candidate_key}
        )
        assert res_staff.status_code == 401

        # Student attempt
        res_student = client.post(
            "/api/v1/auth/token",
            data={"username": "student@test.com", "password": candidate_key}
        )
        assert res_student.status_code == 401


def test_hardcoded_admin_password_removed(client):
    """The legacy hardcoded admin password ('raj@9211') MUST NOT authenticate."""
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "systemowner@test.com", "password": "raj@9211"}
    )
    assert response.status_code == 401


def test_password_hash_upgrade(client, db_session):
    """Legacy PBKDF2 20,000-iteration password hashes should authenticate and upgrade transparently."""
    import hashlib
    salt = b"test_legacy_salt"
    key = hashlib.pbkdf2_hmac('sha256', b"LegacyPass123!", salt, 20000)
    legacy_hash = salt.hex() + ":" + key.hex()

    legacy_user = models.User(
        id=99,
        email="legacy@test.com",
        name="Legacy User",
        password_hash=legacy_hash,
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db_session.add(legacy_user)
    db_session.commit()

    # Authenticate legacy user
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "legacy@test.com", "password": "LegacyPass123!"}
    )
    assert response.status_code == 200

    # Verify password hash was upgraded in database
    db_session.refresh(legacy_user)
    assert legacy_user.password_hash.startswith("pbkdf2_sha256$1000$")


def test_jwt_expiration_and_signature():
    """Access token generated by security module must validate correctly and expire when past TTL."""
    token = security.create_access_token(data={"sub": "staff@test.com", "role": "teacher", "institution_id": 1})

    # Decode valid token
    payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
    assert payload.get("sub") == "staff@test.com"

    # Verify invalid signature fails
    with pytest.raises(jwt.JWTError):
        jwt.decode(token, "wrong_secret_key_12345678901234567890", algorithms=[config.ALGORITHM])

    # Expired token
    expired_token = jwt.encode(
        {"sub": "staff@test.com", "exp": datetime.now(timezone.utc) - timedelta(minutes=10)},
        config.JWT_SECRET_KEY,
        algorithm=config.ALGORITHM
    )
    with pytest.raises(jwt.JWTError):
        jwt.decode(expired_token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
