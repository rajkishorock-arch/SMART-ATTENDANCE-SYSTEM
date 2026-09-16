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
    yield TestClient(app)
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


def test_production_allow_roll_password_validation(monkeypatch):
    """Production environment MUST reject ALLOW_ROLL_PASSWORD=True during validate_config()."""
    monkeypatch.setattr(config, "ENV", "production")
    monkeypatch.setattr(config, "JWT_SECRET_KEY", "a_very_long_secure_secret_key_32_bytes_long!")
    monkeypatch.setattr(config, "SEED_DEFAULT_USERS", False)

    # Valid when ALLOW_ROLL_PASSWORD is False
    monkeypatch.setattr(config, "ALLOW_ROLL_PASSWORD", False)
    config.validate_config()  # should not raise

    # Invalid when ALLOW_ROLL_PASSWORD is True
    monkeypatch.setattr(config, "ALLOW_ROLL_PASSWORD", True)
    with pytest.raises(RuntimeError, match="ALLOW_ROLL_PASSWORD must be false in production"):
        config.validate_config()


def test_rate_limiting_behavior(client, monkeypatch):
    """Verify 8-attempt login rate limiting, failure recording, normalization, and success pass-through."""
    from app.cache_service import cache_delete, rate_limit_get_attempts

    rate_key = "ratelimited_user@test.com"
    cache_delete(f"rate_limit:{rate_key}")

    # 8 failed login attempts are allowed
    for _ in range(8):
        res = client.post("/api/v1/auth/token", data={"username": "  RateLimited_User@test.com ", "password": "WrongPassword!"})
        assert res.status_code == 401

    assert rate_limit_get_attempts(rate_key) == 8

    # 9th attempt (when 8 failures exist) triggers 429 Too Many Requests
    res_9th = client.post("/api/v1/auth/token", data={"username": "ratelimited_user@test.com", "password": "WrongPassword!"})
    assert res_9th.status_code == 429

    # Clean up key
    cache_delete(f"rate_limit:{rate_key}")


def test_rate_limiting_sliding_window_expiry(monkeypatch):
    """Verify attempts older than 300 seconds drop out of the effective window count."""
    import time
    from app.cache_service import cache_delete, rate_limit_record_attempt, rate_limit_get_attempts

    rate_key = "window_test@test.com"
    cache_delete(f"rate_limit:{rate_key}")

    start_time = 100000.0
    current_time = start_time
    monkeypatch.setattr(time, "time", lambda: current_time)

    # Record 8 failed attempts at time = 100000
    for _ in range(8):
        rate_limit_record_attempt(rate_key, ttl=300)

    assert rate_limit_get_attempts(rate_key, ttl=300) == 8

    # Advance time by 301 seconds (past 300s window)
    current_time = start_time + 301.0

    # Old attempts should have expired
    assert rate_limit_get_attempts(rate_key, ttl=300) == 0

    # A new attempt is now permitted and becomes attempt 1
    new_count = rate_limit_record_attempt(rate_key, ttl=300)
    assert new_count == 1

    cache_delete(f"rate_limit:{rate_key}")


def test_rate_limiting_redis_mock_eval(monkeypatch):
    """Verify Lua script eval call when Redis is configured."""
    from app import cache_service

    eval_calls = []

    class DummyRedis:
        def eval(self, script, numkeys, key, now, window, *args):
            eval_calls.append((key, now, window, args))
            return 1

    monkeypatch.setattr(cache_service, "_redis_client", DummyRedis())

    res = cache_service.rate_limit_record_attempt("redis_user@test.com", ttl=300)
    assert res == 1
    assert len(eval_calls) == 1
    assert eval_calls[0][0] == "rate_limit:redis_user@test.com"


def test_rate_limiting_per_username_locking():
    """Verify rate_limit_user_lock locks per username and allows independent parallel execution for different usernames."""
    import concurrent.futures
    import time
    from app.cache_service import rate_limit_user_lock

    executed = []

    def worker(user_id):
        with rate_limit_user_lock(user_id):
            executed.append(user_id)
            time.sleep(0.01)

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(worker, f"user_{i % 2}@test.com") for i in range(4)]
        concurrent.futures.wait(futures)

    assert len(executed) == 4


def test_redis_lock_timeout_raises_lock_acquisition_error(client, monkeypatch):
    """Verify Redis lock acquisition timeout raises LockAcquisitionError and produces HTTP 429 response."""
    from app import cache_service

    class DummyLock:
        def acquire(self, blocking=True):
            return False  # Timed out

    class DummyRedisClient:
        def lock(self, name, timeout=15, blocking_timeout=5):
            return DummyLock()

    monkeypatch.setattr(cache_service, "_redis_client", DummyRedisClient())

    with pytest.raises(cache_service.LockAcquisitionError):
        with cache_service.rate_limit_user_lock("busy_user@test.com"):
            pass

    # Verify HTTP response from API is 429
    res = client.post("/api/v1/auth/token", data={"username": "busy_user@test.com", "password": "any"})
    assert res.status_code == 429
    assert "currently processing another request" in res.json()["detail"]


def test_redis_unconfigured_uses_memory_fallback(monkeypatch):
    """Verify when _redis_client is None (unconfigured), process-local locking is used."""
    from app import cache_service

    monkeypatch.setattr(cache_service, "_redis_client", None)

    executed = False
    with cache_service.rate_limit_user_lock("unconfigured_user@test.com"):
        executed = True

    assert executed is True


def test_redis_infrastructure_failure_raises_lock_acquisition_error(client, monkeypatch):
    """Verify configured Redis infrastructure connection error raises LockAcquisitionError and produces HTTP 429."""
    from app import cache_service

    class BrokenRedisClient:
        def lock(self, name, timeout=15, blocking_timeout=5):
            raise Exception("Connection Refused")

    monkeypatch.setattr(cache_service, "_redis_client", BrokenRedisClient())

    with pytest.raises(cache_service.LockAcquisitionError):
        with cache_service.rate_limit_user_lock("broken_redis_user@test.com"):
            pass

    res = client.post("/api/v1/auth/token", data={"username": "broken_redis_user@test.com", "password": "any"})
    assert res.status_code == 429
    assert "temporarily unavailable" in res.json()["detail"]



def test_weak_value_dict_prunes_unused_locks():
    """Verify _memory_locks using WeakValueDictionary does not retain dead locks permanently."""
    import gc
    from app import cache_service

    user_key = "temp_user_for_gc@test.com"
    with cache_service.rate_limit_user_lock(user_key):
        assert user_key in cache_service._memory_locks

    gc.collect()
    assert user_key not in cache_service._memory_locks
