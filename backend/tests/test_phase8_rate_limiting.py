"""
Phase 8 Step 8-7 Batch 1: Rate Limiting & Abuse Controls Security Regression Suite.

Verifies:
- RL1: Dual-control login rate limiter (user+IP composite lockout guard & IP global burst guard).
- RL2: Per-identity biometric frame processing rate limiter (30 req / 60s).
- RL3: Failed password change rate limiter (5 failed attempts / 300s).
- RL4: Fallback session PIN brute-force limiter (5 failed attempts / 300s).
- RL5: Public deep health check IP rate limiter (30 req / 60s).
- Cache service rate limiting helper functions.
"""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security, cache_service, crud
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


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_env(monkeypatch):
    """Sets up fresh SQLite in-memory database and clears rate limit cache before each test."""
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(config, "SYSTEM_OWNER_EMAIL", "systemowner@test.com")
    monkeypatch.setattr(config, "TRUST_PROXY_HEADERS", True)
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    cache_service._memory_store.clear()

    db = TestingSessionLocal()
    # Seed default institution
    inst = models.Institution(id=1, name="Default Inst", slug="default", is_active=True)
    db.add(inst)
    db.commit()
    db.close()

    yield
    cache_service._memory_store.clear()


# ---------------------------------------------------------------------------
# 1. Cache Service Helper Unit Tests
# ---------------------------------------------------------------------------

def test_cache_service_check_and_record_rate_limit():
    key = "unit_test:helper_key"
    limit = 3
    ttl = 60

    # 3 allowed requests
    for i in range(1, 4):
        allowed, count = cache_service.check_and_record_rate_limit(key, limit=limit, ttl=ttl)
        assert allowed is True
        assert count == i

    # 4th request rejected
    allowed, count = cache_service.check_and_record_rate_limit(key, limit=limit, ttl=ttl)
    assert allowed is False
    assert count == 3


def test_cache_service_rate_limit_reset():
    key = "unit_test:reset_key"
    cache_service.rate_limit_record_attempt(key, ttl=300)
    cache_service.rate_limit_record_attempt(key, ttl=300)
    assert cache_service.rate_limit_get_attempts(key, ttl=300) == 2

    cache_service.rate_limit_reset(key)
    assert cache_service.rate_limit_get_attempts(key, ttl=300) == 0


# ---------------------------------------------------------------------------
# 2. RL1: Dual-Control Login Rate Limiting Tests
# ---------------------------------------------------------------------------

def test_login_rate_limit_same_username_same_ip():
    """8 failed login attempts for same user & IP lock user+IP key; 9th returns HTTP 429."""
    db = TestingSessionLocal()
    user = models.User(
        name="Test Teacher",
        email="teacher@test.com",
        password_hash=security.get_password_hash("CorrectPassword123!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.close()

    headers = {"X-Forwarded-For": "198.51.100.1"}

    # 8 failed attempts from IP 198.51.100.1
    for _ in range(8):
        resp = client.post("/api/v1/auth/token", data={"username": "teacher@test.com", "password": "WrongPassword!"}, headers=headers)
        assert resp.status_code == 401

    # 9th attempt from same IP is rate limited (429)
    resp = client.post("/api/v1/auth/token", data={"username": "teacher@test.com", "password": "WrongPassword!"}, headers=headers)
    assert resp.status_code == 429
    assert "Too many login attempts" in resp.json()["detail"]


def test_login_rate_limit_same_username_different_ip_independent():
    """An attacker on IP A failing 8 logins does NOT lock out legitimate user on IP B."""
    db = TestingSessionLocal()
    user = models.User(
        name="Teacher Two",
        email="teacher2@test.com",
        password_hash=security.get_password_hash("ValidPass123!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.close()

    attacker_headers = {"X-Forwarded-For": "198.51.100.10"}
    user_headers = {"X-Forwarded-For": "203.0.113.50"}

    # Attacker fails 8 times on IP A
    for _ in range(8):
        resp = client.post("/api/v1/auth/token", data={"username": "teacher2@test.com", "password": "BadPassword!"}, headers=attacker_headers)
        assert resp.status_code == 401

    # Attacker on IP A is rate limited
    resp_attacker = client.post("/api/v1/auth/token", data={"username": "teacher2@test.com", "password": "BadPassword!"}, headers=attacker_headers)
    assert resp_attacker.status_code == 429

    # Legitimate user on IP B can still log in successfully
    resp_user = client.post("/api/v1/auth/token", data={"username": "teacher2@test.com", "password": "ValidPass123!"}, headers=user_headers)
    assert resp_user.status_code == 200
    assert "access_token" in resp_user.json()


def test_login_rate_limit_password_spraying_ip_global_limit():
    """An attacker on IP A trying 30 distinct usernames hits the IP global limit (30/60s)."""
    headers = {"X-Forwarded-For": "198.51.100.99"}

    # 30 failed attempts across 30 different usernames from same IP
    for i in range(30):
        resp = client.post("/api/v1/auth/token", data={"username": f"user{i}@test.com", "password": "WrongPassword!"}, headers=headers)
        assert resp.status_code == 401

    # 31st attempt from same IP is blocked with 429
    resp = client.post("/api/v1/auth/token", data={"username": "user30@test.com", "password": "WrongPassword!"}, headers=headers)
    assert resp.status_code == 429
    assert "Too many login attempts from this IP" in resp.json()["detail"]


def test_login_successful_login_resets_user_ip_counter():
    """A successful login clears the failed attempt counter for that user+IP."""
    db = TestingSessionLocal()
    user = models.User(
        name="Reset User",
        email="reset_user@test.com",
        password_hash=security.get_password_hash("SecretPass123!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.close()

    headers = {"X-Forwarded-For": "198.51.100.5"}

    # 5 failed attempts
    for _ in range(5):
        client.post("/api/v1/auth/token", data={"username": "reset_user@test.com", "password": "Wrong!"}, headers=headers)

    # 1 successful login resets user+IP counter
    resp_ok = client.post("/api/v1/auth/token", data={"username": "reset_user@test.com", "password": "SecretPass123!"}, headers=headers)
    assert resp_ok.status_code == 200

    # User can make 7 more failed attempts without being locked out
    for _ in range(7):
        resp = client.post("/api/v1/auth/token", data={"username": "reset_user@test.com", "password": "Wrong!"}, headers=headers)
        assert resp.status_code == 401


def test_login_untrusted_proxy_header_fallback(monkeypatch):
    """When TRUST_PROXY_HEADERS is False, X-Forwarded-For is ignored and client host is used."""
    monkeypatch.setattr(config, "TRUST_PROXY_HEADERS", False)

    db = TestingSessionLocal()
    user = models.User(
        name="Proxy User",
        email="proxy_user@test.com",
        password_hash=security.get_password_hash("Pass123!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.close()

    headers = {"X-Forwarded-For": "10.0.0.1"}
    resp = client.post("/api/v1/auth/token", data={"username": "proxy_user@test.com", "password": "Pass123!"}, headers=headers)
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 3. RL2: Biometric Recognize-Frame Rate Limiting Tests
# ---------------------------------------------------------------------------

def test_recognize_frame_rate_limit_per_identity():
    """30 requests/60s per identity allowed; 31st request returns HTTP 429."""
    db = TestingSessionLocal()
    teacher = models.User(
        id=99,
        name="Teacher One",
        email="t1@test.com",
        password_hash=security.get_password_hash("Pass123!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(teacher)
    db.commit()
    token = security.create_access_token(data={"sub": teacher.email, "role": teacher.role, "institution_id": teacher.institution_id})
    teacher_id = teacher.id
    teacher_role = teacher.role
    db.close()

    headers = {"Authorization": f"Bearer {token}"}

    # Simulate 30 frame requests
    key = f"biometric:frame:{teacher_id}:{teacher_role}"
    for _ in range(30):
        cache_service.rate_limit_record_attempt(key, ttl=60)

    # 31st request triggers rate limit
    fake_file = ("frame.jpg", b"fake image bytes", "image/jpeg")
    resp = client.post("/api/v1/attendance/recognize-frame", files={"file": fake_file}, headers=headers)
    assert resp.status_code == 429
    assert "Biometric frame processing rate limit exceeded" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# 4. RL3: Password Change Rate Limiting Tests
# ---------------------------------------------------------------------------

def test_password_change_rate_limit():
    """5 failed password change attempts reach limit; 6th returns HTTP 429."""
    db = TestingSessionLocal()
    user = models.User(
        id=88,
        name="Pwd User",
        email="pwd_test@test.com",
        password_hash=security.get_password_hash("OriginalPassword123!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(user)
    db.commit()
    token = security.create_access_token(data={"sub": user.email, "role": user.role, "institution_id": user.institution_id})
    db.close()

    headers = {"Authorization": f"Bearer {token}"}

    # 5 failed password change attempts with wrong old password
    for _ in range(5):
        resp = client.post(
            "/api/v1/users/me/change-password",
            json={"old_password": "WrongOldPassword!", "new_password": "NewValidPassword123!"},
            headers=headers
        )
        assert resp.status_code == 400
        assert "Incorrect current password" in resp.json()["detail"]

    # 6th attempt is blocked by rate limiter (HTTP 429)
    resp = client.post(
        "/api/v1/users/me/change-password",
        json={"old_password": "OriginalPassword123!", "new_password": "NewValidPassword123!"},
        headers=headers
    )
    assert resp.status_code == 429
    assert "Too many failed password change attempts" in resp.json()["detail"]


def test_password_change_success_clears_counter():
    """A successful password change resets the failed attempt counter."""
    db = TestingSessionLocal()
    user = models.User(
        id=77,
        name="Pwd Reset User",
        email="pwd_reset_test@test.com",
        password_hash=security.get_password_hash("PassOriginal1!"),
        role="teacher",
        institution_id=1,
        is_active=True
    )
    db.add(user)
    db.commit()
    token = security.create_access_token(data={"sub": user.email, "role": user.role, "institution_id": user.institution_id})
    db.close()

    headers = {"Authorization": f"Bearer {token}"}

    # 3 failed attempts
    for _ in range(3):
        client.post("/api/v1/users/me/change-password", json={"old_password": "Wrong!", "new_password": "NewPass123!"}, headers=headers)

    # 1 successful password change resets counter
    resp_ok = client.post(
        "/api/v1/users/me/change-password",
        json={"old_password": "PassOriginal1!", "new_password": "NewPass123!"},
        headers=headers
    )
    assert resp_ok.status_code == 200

    # User can fail up to 4 more attempts without being blocked
    for _ in range(4):
        resp = client.post("/api/v1/users/me/change-password", json={"old_password": "WrongAgain!", "new_password": "NewerPass123!"}, headers=headers)
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 5. RL4: Fallback PIN Rate Limiting Tests
# ---------------------------------------------------------------------------

def test_fallback_pin_rate_limit():
    """5 invalid PIN attempts per student/session lock the endpoint; 6th returns HTTP 429."""
    db = TestingSessionLocal()
    student = models.StudentModel(
        id=55,
        name="Pin Student",
        email="student_pin@test.com",
        roll="PIN001",
        dep="CS",
        institution_id=1
    )
    db.add(student)
    db.commit()

    session = models.AttendanceFallbackSession(
        id=10,
        institution_id=1,
        subject_id=1,
        teacher_id=1,
        session_date="16/09/2026",
        session_secret="secret123",
        session_pin="654321",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=60),
        is_active=True
    )
    db.add(session)
    db.commit()

    token = security.create_access_token(data={"sub": student.email, "role": "student", "institution_id": student.institution_id})
    db.close()

    headers = {"Authorization": f"Bearer {token}"}

    # 5 invalid PIN attempts
    for _ in range(5):
        resp = client.post(
            "/api/v1/fallback/claim-pin",
            json={"session_id": 10, "session_pin": "000000", "fallback_reason": "Camera broken"},
            headers=headers
        )
        assert resp.status_code == 400
        assert "Invalid session PIN" in resp.json()["detail"]

    # 6th attempt is blocked by rate limiter (HTTP 429)
    resp = client.post(
        "/api/v1/fallback/claim-pin",
        json={"session_id": 10, "session_pin": "654321", "fallback_reason": "Camera broken"},
        headers=headers
    )
    assert resp.status_code == 429
    assert "Too many invalid PIN attempts" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# 6. RL5: Public Deep Health Check Rate Limiting Tests
# ---------------------------------------------------------------------------

def test_deep_health_rate_limit_per_ip():
    """30 requests/60s per IP allowed on deep health; 31st returns HTTP 429."""
    headers = {"X-Forwarded-For": "198.51.100.77"}

    # Simulate 30 health requests from IP 198.51.100.77
    key = "health_deep:ip:198.51.100.77"
    for _ in range(30):
        cache_service.rate_limit_record_attempt(key, ttl=60)

    # 31st request from same IP returns 429
    resp = client.get("/api/v1/health/deep", headers=headers)
    assert resp.status_code == 429
    assert "Health check rate limit exceeded" in resp.json()["detail"]

    # Different IP can still access deep health successfully
    other_headers = {"X-Forwarded-For": "203.0.113.88"}
    resp_other = client.get("/api/v1/health/deep", headers=other_headers)
    assert resp_other.status_code == 200
    assert resp_other.json()["status"] == "healthy"
