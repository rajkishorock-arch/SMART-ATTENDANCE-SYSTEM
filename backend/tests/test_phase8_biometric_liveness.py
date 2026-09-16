"""
Phase 8 Biometric & Liveness Regression Test Suite

Verifies:
1. Liveness token anti-replay defense (reusing a consumed token fails).
2. Liveness token user identity binding (using User A's token for User B fails).
3. Offline face embedding export filters out students with revoked/missing consent (consent_given=False).
"""
import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security
from app.database import Base, get_db
from app.main import app
from app.core import config
from app.liveness_service import create_liveness_challenge, report_liveness_step, verify_liveness_token, validate_attendance_liveness
from app.encryption_service import encrypt_embedding

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
    db.add(admin1)

    # Seed Student A (Consent Given = True)
    dummy_emb = json.dumps([0.1] * 128)
    student_a = models.StudentModel(
        id=101,
        email="studenta@alpha.edu",
        name="Student A Consent True",
        roll="A101",
        dep="CSE",
        institution_id=1,
        face_embedding=encrypt_embedding(dummy_emb),
        photo="yes",
        consent_given=True,
    )

    # Seed Student B (Consent Revoked / False)
    student_b = models.StudentModel(
        id=102,
        email="studentb@alpha.edu",
        name="Student B Consent False",
        roll="B102",
        dep="CSE",
        institution_id=1,
        face_embedding=encrypt_embedding(dummy_emb),
        photo="yes",
        consent_given=False,
    )
    db.add_all([student_a, student_b])
    db.commit()

    tokens = {
        "admin": security.create_access_token({"sub": "admin@alpha.edu", "role": "admin", "institution_id": 1}),
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
# 1. LIVENESS TOKEN ANTI-REPLAY DEFENSE
# ============================================================================

def test_liveness_token_anti_replay(test_env):
    """Verifies that a valid liveness token cannot be reused (replay prevention)."""
    user_email = "teacher@alpha.edu"
    challenge = create_liveness_challenge(user_email)
    cid = challenge["challenge_id"]
    seq = challenge["sequence_labels"]

    token = None
    for step in seq:
        ear = 0.15 if step == "blink" else 0.28
        res = report_liveness_step(cid, step, ear)
        if res.get("completed"):
            token = res.get("liveness_token")

    assert token is not None, "Failed to generate liveness token for test sequence"

    # First verification must succeed
    first_verify = verify_liveness_token(token, user_email)
    assert first_verify is True

    # Reusing the token must be rejected (anti-replay)
    second_verify = verify_liveness_token(token, user_email)
    assert second_verify is False


# ============================================================================
# 2. LIVENESS TOKEN USER IDENTITY BINDING
# ============================================================================

def test_liveness_token_user_mismatch(test_env):
    """Verifies that a liveness token bound to User A is rejected when used for User B."""
    user_a = "usera@alpha.edu"
    user_b = "userb@alpha.edu"

    challenge = create_liveness_challenge(user_a)
    cid = challenge["challenge_id"]
    seq = challenge["sequence_labels"]

    token = None
    for step in seq:
        ear = 0.15 if step == "blink" else 0.28
        res = report_liveness_step(cid, step, ear)
        if res.get("completed"):
            token = res.get("liveness_token")

    assert token is not None

    # Using User A's token for User B must be rejected
    mismatch_verify = verify_liveness_token(token, user_b)
    assert mismatch_verify is False

    # Also test via validate_attendance_liveness helper
    valid, err_msg = validate_attendance_liveness(token, user_b, strict_mode=True)
    assert valid is False
    assert "Invalid, expired, or already used liveness token" in err_msg


# ============================================================================
# 3. LIVENESS ENFORCEMENT & COMPATIBILITY MODE MODES (FINDING-B5)
# ============================================================================

def test_liveness_enforcement_strict_and_compatibility_modes(test_env):
    """
    Verifies B5 Liveness Enforcement:
    1. Strict mode + missing token => Rejected
    2. Strict mode + valid token => Accepted
    3. Strict mode + invalid token => Rejected
    4. Compatibility mode (strict_mode=False) + missing token => Accepted
    """
    user_email = "teacher@alpha.edu"

    # 1. Strict mode + missing token => Rejected
    valid, err = validate_attendance_liveness(liveness_token=None, user_email=user_email, strict_mode=True)
    assert valid is False
    assert "Server-side liveness verification is required" in err

    # 2. Strict mode + invalid token => Rejected
    valid, err = validate_attendance_liveness(liveness_token="invalid_token_123", user_email=user_email, strict_mode=True)
    assert valid is False
    assert "Invalid, expired, or already used liveness token" in err

    # 3. Strict mode + valid token => Accepted
    challenge = create_liveness_challenge(user_email)
    cid = challenge["challenge_id"]
    seq = challenge["sequence_labels"]

    token = None
    for step in seq:
        ear = 0.15 if step == "blink" else 0.28
        res = report_liveness_step(cid, step, ear)
        if res.get("completed"):
            token = res.get("liveness_token")

    assert token is not None
    valid, err = validate_attendance_liveness(liveness_token=token, user_email=user_email, strict_mode=True)
    assert valid is True
    assert err is None

    # 4. Compatibility mode (strict_mode=False) + missing token => Accepted
    valid, err = validate_attendance_liveness(liveness_token=None, user_email=user_email, strict_mode=False)
    assert valid is True
    assert err is None


# ============================================================================
# 3. OFFLINE EMBEDDINGS CONSENT FILTERING
# ============================================================================

def test_offline_embeddings_filters_revoked_consent(client):
    """Verifies that GET /offline-face/download-embeddings/1 includes only consent_given=True students."""
    test_client, tokens = client
    resp = test_client.get(
        "/api/v1/offline-face/download-embeddings/1",
        headers={"Authorization": f"Bearer {tokens['admin']}"}
    )
    assert resp.status_code == 200
    data = resp.json()
    student_ids = [s["student_id"] for s in data]

    # Student A (101) has consent_given=True -> MUST be included
    assert 101 in student_ids
    # Student B (102) has consent_given=False -> MUST be excluded
    assert 102 not in student_ids
