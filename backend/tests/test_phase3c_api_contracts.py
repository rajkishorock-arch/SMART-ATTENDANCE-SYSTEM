"""
Phase 3C API Contract and Schema Standardization Test Suite.

Verifies:
1. Standard ApiResponse and PaginatedResponse schema serialization.
2. ApiErrorResponse serialization and backward-compatible detail field.
3. Centralized AppException handling (401, 403, 422, 429, etc.) with detail preservation.
4. Unhandled server error sanitization (500).
5. Canonical leave routes (/api/v1/leaves/...) and legacy alias routes (/api/v1/api/v1/leaves/...).
6. HTTP 201 Created status on POST /subjects, POST /schedules, and POST /feedbacks/.
7. Student pagination query bounds (skip >= 0, 1 <= limit <= 500) and 422 on violations.
8. OpenAPI schema generation and domain tag verification.
9. AuditLogResponse and Offline Face Pydantic v2 model compliance.
"""
import pytest
from fastapi import FastAPI, Depends, Query, status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.exceptions import (
    AppException,
    AuthenticationFailed,
    AuthorizationFailed,
    ValidationError,
    RateLimitExceeded,
    TenantAccessDenied,
    ResourceNotFound,
    ResourceConflict,
    InvalidTokenError,
)
from app.core.middleware import setup_exception_handlers
from app.schemas.common import (
    ApiResponse,
    ApiErrorDetail,
    ApiErrorResponse,
    PaginationParams,
    PaginationMeta,
    PaginatedResponse,
    api_response,
)
from app.schemas.audit import AuditLogResponse
from app.offline_face import OfflineStudentData, OfflineAttendanceRecord, OfflineSyncRequest
from app.main import app
from app import database, models, security, crud
from app.database import Base, get_db

# Isolated In-Memory DB for Phase 3C tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def p3c_client(monkeypatch):
    """Provides a cleanly isolated TestClient with in-memory DB and test overrides."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Clean any stale records
    for m in [models.Subject, models.StudentModel, models.User, models.Institution]:
        try:
            db.query(m).delete()
        except Exception:
            pass
    db.commit()

    inst = models.Institution(id=99, name="Contract Test University", slug="ctu-99")
    db.add(inst)
    db.flush()

    admin = models.User(
        id=901,
        email="admin99@test.com",
        name="Admin NinetyNine",
        role="admin",
        institution_id=99,
        password_hash=security.get_password_hash("AdminPass123!"),
    )
    teacher = models.User(
        id=902,
        email="teacher99@test.com",
        name="Teacher NinetyNine",
        role="teacher",
        institution_id=99,
        password_hash=security.get_password_hash("TeacherPass123!"),
    )
    student = models.StudentModel(
        id=903,
        email="student99@test.com",
        name="Student NinetyNine",
        roll="STU-99-001",
        dep="CSE",
        course="BTech",
        year="2026",
        semester="8",
        div="A",
        gender="Other",
        institution_id=99,
        password_hash=security.get_password_hash("StudentPass123!"),
    )
    db.add_all([admin, teacher, student])
    db.commit()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    client = TestClient(app, raise_server_exceptions=False)
    yield client, db, admin, teacher, student

    db.close()
    app.dependency_overrides.clear()


# ==============================================================================
# 1. COMMON SCHEMAS SERIALIZATION
# ==============================================================================

def test_api_response_generic_serialization():
    """Verify ApiResponse wrapper serializes correctly with various data types."""
    resp = ApiResponse[dict](
        success=True,
        message="Item fetched",
        data={"user_id": 42, "role": "student"}
    )
    dumped = resp.model_dump()
    assert dumped["success"] is True
    assert dumped["message"] == "Item fetched"
    assert dumped["data"]["user_id"] == 42
    assert dumped["data"]["role"] == "student"


def test_api_response_helper_factory():
    """Verify api_response() factory produces consistent dictionary."""
    payload = api_response(data={"count": 5}, message="Summary generated")
    assert payload["success"] is True
    assert payload["message"] == "Summary generated"
    assert payload["data"] == {"count": 5}


def test_api_error_response_backward_compatibility():
    """Verify ApiErrorResponse contains both new 'error' dict and legacy 'detail' string."""
    err_resp = ApiErrorResponse(
        success=False,
        message="Unauthorized access attempt",
        detail="Unauthorized access attempt",
        error=ApiErrorDetail(code="AuthenticationFailed", details={"ip": "127.0.0.1"})
    )
    dumped = err_resp.model_dump()
    assert dumped["success"] is False
    assert dumped["detail"] == "Unauthorized access attempt"
    assert dumped["message"] == "Unauthorized access attempt"
    assert dumped["error"]["code"] == "AuthenticationFailed"
    assert dumped["error"]["details"]["ip"] == "127.0.0.1"


def test_paginated_response_schema():
    """Verify PaginatedResponse packaging with PaginationMeta."""
    meta = PaginationMeta(
        total=150,
        skip=20,
        limit=10,
        page=3,
        page_size=10,
        total_pages=15
    )
    paginated = PaginatedResponse[str](
        success=True,
        message="Page 3 loaded",
        data=["item1", "item2"],
        pagination=meta
    )
    dumped = paginated.model_dump()
    assert dumped["pagination"]["total"] == 150
    assert dumped["pagination"]["page"] == 3
    assert dumped["pagination"]["total_pages"] == 15
    assert len(dumped["data"]) == 2


# ==============================================================================
# 2. EXCEPTION INFRASTRUCTURE & HTTP STATUS MAPPING
# ==============================================================================

def test_exception_handler_app_exceptions():
    """Verify setup_exception_handlers maps domain exceptions to appropriate HTTP status codes and payloads."""
    test_app = FastAPI()
    setup_exception_handlers(test_app)

    @test_app.get("/trigger-auth-failed")
    def r_auth():
        raise AuthenticationFailed("Session expired, please login again.")

    @test_app.get("/trigger-authz-failed")
    def r_authz():
        raise AuthorizationFailed("Teacher privilege required.")

    @test_app.get("/trigger-validation-failed")
    def r_val():
        raise ValidationError("Field 'duration' must be positive.", details={"field": "duration"})

    @test_app.get("/trigger-rate-limit")
    def r_rate():
        raise RateLimitExceeded("Too many attempts. Wait 60s.")

    @test_app.get("/trigger-conflict")
    def r_conflict():
        raise ResourceConflict("Subject code 'CS101' already exists.")

    @test_app.get("/trigger-not-found")
    def r_nf():
        raise ResourceNotFound("Student 99 not found.")

    client = TestClient(test_app, raise_server_exceptions=False)

    # 401
    res = client.get("/trigger-auth-failed")
    assert res.status_code == 401
    body = res.json()
    assert body["success"] is False
    assert body["detail"] == "Session expired, please login again."
    assert body["error"]["code"] == "AuthenticationFailed"

    # 403
    res = client.get("/trigger-authz-failed")
    assert res.status_code == 403
    body = res.json()
    assert body["detail"] == "Teacher privilege required."
    assert body["error"]["code"] == "AuthorizationFailed"

    # 422
    res = client.get("/trigger-validation-failed")
    assert res.status_code == 422
    body = res.json()
    assert body["detail"] == "Field 'duration' must be positive."
    assert body["error"]["code"] == "ValidationError"
    assert body["error"]["details"] == {"field": "duration"}

    # 429
    res = client.get("/trigger-rate-limit")
    assert res.status_code == 429
    body = res.json()
    assert body["error"]["code"] == "RateLimitExceeded"

    # 409
    res = client.get("/trigger-conflict")
    assert res.status_code == 409
    body = res.json()
    assert body["error"]["code"] == "ResourceConflict"

    # 404
    res = client.get("/trigger-not-found")
    assert res.status_code == 404
    body = res.json()
    assert body["error"]["code"] == "ResourceNotFound"


def test_generic_500_exception_handler():
    """Verify unhandled 500 error sanitization and detail preservation."""
    test_app = FastAPI()
    setup_exception_handlers(test_app)

    @test_app.get("/trigger-crash")
    def r_crash():
        raise RuntimeError("Unexpected internal crash")

    client = TestClient(test_app, raise_server_exceptions=False)
    res = client.get("/trigger-crash")
    assert res.status_code == 500
    body = res.json()
    assert body["success"] is False
    assert "detail" in body
    assert body["error"]["code"] == "InternalServerError"


# ==============================================================================
# 3. LEAVE ROUTING (CANONICAL & LEGACY ALIAS)
# ==============================================================================

def test_leave_canonical_and_legacy_routes_exist():
    """Verify canonical /api/v1/leaves/... and legacy /api/v1/api/v1/leaves/... routes are both registered."""
    route_paths = [r.path for r in app.routes if hasattr(r, "path")]

    # Canonical paths
    assert "/api/v1/leaves/all" in route_paths
    assert "/api/v1/leaves/apply" in route_paths
    assert "/api/v1/leaves/stats" in route_paths
    assert "/api/v1/leaves/my-requests" in route_paths

    # Legacy double-prefix alias paths
    assert "/api/v1/api/v1/leaves/all" in route_paths
    assert "/api/v1/api/v1/leaves/apply" in route_paths
    assert "/api/v1/api/v1/leaves/stats" in route_paths
    assert "/api/v1/api/v1/leaves/my-requests" in route_paths


def test_leave_routes_invoke_same_underlying_service(p3c_client):
    """Verify both canonical and legacy routes invoke the same auth and service logic."""
    client, db, admin, teacher, student = p3c_client

    # Unauthenticated request to canonical route -> 401
    res_canon = client.get("/api/v1/leaves/stats")
    assert res_canon.status_code == 401

    # Unauthenticated request to legacy alias route -> 401
    res_legacy = client.get("/api/v1/api/v1/leaves/stats")
    assert res_legacy.status_code == 401

    # Authenticated request with admin token
    admin_token = security.create_access_token(
        data={"sub": admin.email, "role": admin.role, "institution_id": admin.institution_id}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    canon_resp = client.get("/api/v1/leaves/stats", headers=headers)
    legacy_resp = client.get("/api/v1/api/v1/leaves/stats", headers=headers)

    assert canon_resp.status_code == 200
    assert legacy_resp.status_code == 200
    # Both endpoints return identical service data
    assert canon_resp.json() == legacy_resp.json()


# ==============================================================================
# 4. HTTP STATUS CODE CONTRACTS (201 CREATED)
# ==============================================================================

def test_post_subjects_returns_201(p3c_client):
    """Verify POST /subjects returns HTTP 201 Created."""
    client, db, admin, teacher, student = p3c_client
    admin_token = security.create_access_token(
        data={"sub": admin.email, "role": admin.role, "institution_id": admin.institution_id}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.post(
        "/api/v1/subjects",
        headers=headers,
        json={"name": "Compiler Design", "code": "CS-401", "department": "CSE"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["code"] == "CS-401"
    assert data["name"] == "Compiler Design"


def test_post_schedules_returns_201(p3c_client):
    """Verify POST /schedules returns HTTP 201 Created."""
    client, db, admin, teacher, student = p3c_client
    admin_token = security.create_access_token(
        data={"sub": admin.email, "role": admin.role, "institution_id": admin.institution_id}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # First create subject
    subj_res = client.post(
        "/api/v1/subjects",
        headers=headers,
        json={"name": "Operating Systems", "code": "CS-301", "department": "CSE"}
    )
    assert subj_res.status_code == 201
    subject_id = subj_res.json()["id"]

    # Now create schedule
    sched_res = client.post(
        "/api/v1/schedules",
        headers=headers,
        json={
            "subject_id": subject_id,
            "day_of_week": "Monday",
            "start_time": "09:00",
            "end_time": "10:00"
        }
    )
    assert sched_res.status_code == 201
    data = sched_res.json()
    assert data["subject_id"] == subject_id
    assert data["day_of_week"] == "Monday"


def test_post_feedbacks_returns_201(p3c_client):
    """Verify POST /feedbacks/ returns HTTP 201 Created."""
    client, db, admin, teacher, student = p3c_client
    student_token = security.create_access_token(
        data={"sub": student.email, "role": "student", "institution_id": student.institution_id}
    )
    headers = {"Authorization": f"Bearer {student_token}"}

    res = client.post(
        "/api/v1/feedbacks/",
        headers=headers,
        json={
            "type": "suggestion",
            "rating": 5,
            "message": "Excellent attendance system UI!"
        }
    )
    assert res.status_code == 201
    data = res.json()
    assert data["type"] == "suggestion"
    assert data["rating"] == 5


# ==============================================================================
# 5. STUDENT PAGINATION BOUNDS ON GET /students
# ==============================================================================

def test_get_students_default_pagination(p3c_client):
    """Verify GET /students without parameters returns standard list (default skip=0, limit=100)."""
    client, db, admin, teacher, student = p3c_client
    admin_token = security.create_access_token(
        data={"sub": admin.email, "role": admin.role, "institution_id": admin.institution_id}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/v1/users/students", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["roll"] == "STU-99-001"


def test_get_students_pagination_bounds_validation(p3c_client):
    """Verify GET /students enforces skip >= 0 and 1 <= limit <= 500 with 422 errors."""
    client, db, admin, teacher, student = p3c_client
    admin_token = security.create_access_token(
        data={"sub": admin.email, "role": admin.role, "institution_id": admin.institution_id}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Negative skip -> 422
    res = client.get("/api/v1/users/students?skip=-1", headers=headers)
    assert res.status_code == 422

    # Zero limit -> 422
    res = client.get("/api/v1/users/students?limit=0", headers=headers)
    assert res.status_code == 422

    # Limit > 500 -> 422
    res = client.get("/api/v1/users/students?limit=501", headers=headers)
    assert res.status_code == 422

    # Valid skip & limit boundaries -> 200
    res_valid_min = client.get("/api/v1/users/students?skip=0&limit=1", headers=headers)
    assert res_valid_min.status_code == 200

    res_valid_max = client.get("/api/v1/users/students?skip=0&limit=500", headers=headers)
    assert res_valid_max.status_code == 200


# ==============================================================================
# 6. OPENAPI SCHEMA GENERATION & DOMAIN TAGS
# ==============================================================================

def test_openapi_generation_and_domain_tags():
    """Verify OpenAPI document generates successfully and contains Phase 3C core domain tags."""
    schema = app.openapi()
    assert schema is not None
    assert "paths" in schema
    assert len(schema["paths"]) > 0

    tags = {t["name"] for t in schema.get("tags", [])}
    expected_tags = {
        "Authentication",
        "Attendance",
        "Security & Geofence",
        "QR Tokens & Biometric Fallback",
        "Academic Planning",
        "Multi-Tenancy",
        "Leave Management",
    }
    assert expected_tags.issubset(tags), f"Missing domain tags: {expected_tags - tags}"


# ==============================================================================
# 7. PYDANTIC V2 COMPLIANCE (AUDIT & OFFLINE FACE)
# ==============================================================================

def test_audit_log_response_model_pydantic_v2():
    """Verify AuditLogResponse from app.schemas complies with Pydantic v2 from_attributes."""
    class FakeAuditLog:
        id = 101
        institution_id = 99
        timestamp = None
        user_email = "tester@audit.com"
        role = "admin"
        action = "TEST_ACTION"
        entity_type = "SUBJECT"
        entity_id = "1"
        previous_value = None
        new_value = "CS-101"
        reason = "Unit test"
        ip_address = "127.0.0.1"

    model = AuditLogResponse.model_validate(FakeAuditLog())
    assert model.id == 101
    assert model.user_email == "tester@audit.com"
    assert model.action == "TEST_ACTION"


def test_offline_face_pydantic_v2_models():
    """Verify Offline Face schemas use Pydantic v2 ConfigDict and serialize correctly."""
    class FakeStudent:
        student_id = 42
        name = "Offline Student"
        roll_number = "OFF-42"
        face_embedding = [0.1, 0.2, 0.3]
        photo_base64 = "dGVzdA=="

    student_data = OfflineStudentData.model_validate(FakeStudent())
    assert student_data.student_id == 42
    assert student_data.roll_number == "OFF-42"

    sync_req = OfflineSyncRequest(
        device_id="KIOSK-01",
        attendance_records=[
            OfflineAttendanceRecord(
                student_id=42,
                timestamp="2026-09-15T09:00:00",
                confidence=0.95,
                device_id="KIOSK-01"
            )
        ]
    )
    dumped = sync_req.model_dump()
    assert dumped["device_id"] == "KIOSK-01"
    assert len(dumped["attendance_records"]) == 1
    assert dumped["attendance_records"][0]["confidence"] == 0.95
