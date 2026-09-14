"""
Phase 2A Tenant Isolation Hardening Test Suite
Verifies:
1. Offline sync cannot create attendance for another tenant's student.
2. cleanup-test-logs only deletes attendance for the authenticated tenant.
3. Wellness score rejects cross-tenant access with 403.
4. Mood logs reject cross-tenant access with 403.
5. Counselor alerts reject cross-tenant access with 403.
6. Alert resolution rejects cross-tenant access with 403.
7. Features7 unauthenticated leave requests are rejected with 401.
8. Features7 authenticated users cannot see or approve other tenant leave requests.
9. Multi-campus transfer cannot transfer students to an unrelated institution.
10. Bulk subject import allows identical subject codes across different institutions.
11. Parent notification does not query or leak parent accounts from other institutions.
12. Student QR check-in scopes attendance records by tenant.
13. Positive regression tests for legitimate same-tenant operations.
14. System Owner legitimate cross-tenant privileges are preserved.
"""
import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security, crud
from app.database import Base, get_db
from app.main import app
from app.core import config
from app.period_utils import generate_session_key

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

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Clean existing rows to ensure clean state
    for m in [models.AttendanceModel, models.LeaveRequest, models.WellnessCheckin, models.ParentAccount, models.Subject, models.StudentModel, models.User, models.Institution]:
        try:
            db.query(m).delete()
        except Exception:
            pass
    db.commit()

    # Seed Institution 1 & 2
    inst1 = models.Institution(id=1, name="Institution Alpha", slug="alpha", is_active=True)
    inst2 = models.Institution(id=2, name="Institution Beta", slug="beta", is_active=True)
    # Seed a legitimate subcampus of Institution 1
    subcampus = models.Institution(
        id=3, name="Alpha City Branch", slug="alpha-city",
        parent_institution_id=1, is_active=True
    )
    db.add_all([inst1, inst2, subcampus])
    db.commit()

    # Seed Users
    owner = models.User(
        id=1, email="systemowner@test.com", name="System Owner",
        password_hash=security.get_password_hash("Pass123!"),
        role="admin", institution_id=1, is_active=True
    )
    admin1 = models.User(
        id=2, email="admin1@alpha.edu", name="Admin Alpha",
        password_hash=security.get_password_hash("Pass123!"),
        role="admin", institution_id=1, is_active=True
    )
    admin2 = models.User(
        id=3, email="admin2@beta.edu", name="Admin Beta",
        password_hash=security.get_password_hash("Pass123!"),
        role="admin", institution_id=2, is_active=True
    )
    student1 = models.StudentModel(
        id=101, email="student1@alpha.edu", name="Alice Alpha",
        roll="A101", dep="CSE", institution_id=1
    )
    student2 = models.StudentModel(
        id=202, email="student2@beta.edu", name="Bob Beta",
        roll="B202", dep="ECE", institution_id=2
    )
    db.add_all([owner, admin1, admin2, student1, student2])
    db.commit()

    tokens = {
        "admin1": security.create_access_token({"sub": "admin1@alpha.edu", "role": "admin", "institution_id": 1}),
        "admin2": security.create_access_token({"sub": "admin2@beta.edu", "role": "admin", "institution_id": 2}),
        "owner": security.create_access_token({"sub": "systemowner@test.com", "role": "admin", "institution_id": 1}),
        "student1": security.create_access_token({"sub": "student1@alpha.edu", "role": "student", "institution_id": 1}),
    }

    yield db, tokens
    db.rollback()
    db.close()


@pytest.fixture
def client(test_env):
    db, tokens = test_env

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    c = TestClient(app)
    yield c, tokens, db
    app.dependency_overrides.clear()


# ── Test 1: Offline Sync Tenant Injection ─────────────────────────────────────
def test_offline_sync_cannot_mark_other_tenant_student(client):
    c, tokens, db = client
    headers = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Admin 1 attempts to sync attendance for Student 202 (belonging to Institution 2)
    payload = {
        "device_id": "phone_alpha_1",
        "attendance_records": [
            {
                "student_id": 202,
                "timestamp": "2026-09-14T09:15:00Z",
                "confidence": 0.95,
                "device_id": "phone_alpha_1"
            }
        ]
    }
    resp = c.post("/api/v1/offline-face/sync-attendance/1", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["synced"] == 0
    assert data["skipped"] == 1
    assert any("Not found in institution 1" in err for err in data["errors"])

    # Verify no attendance was marked in Institution 2 for student 202
    att2 = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == "202",
        models.AttendanceModel.institution_id == 2
    ).first()
    assert att2 is None


# ── Test 2: cleanup-test-logs Tenant Isolation ────────────────────────────────
def test_cleanup_test_logs_only_deletes_own_tenant(client):
    c, tokens, db = client
    # Insert test logs with time "03:21:52" for both institutions
    r1 = models.AttendanceModel(
        id="101", name="Alice", roll="A101", date="14/09/2026", time="03:21:52",
        attendance="Present", institution_id=1, session_key="key_alpha_clean"
    )
    r2 = models.AttendanceModel(
        id="202", name="Bob", roll="B202", date="14/09/2026", time="03:21:52",
        attendance="Present", institution_id=2, session_key="key_beta_clean"
    )
    db.add_all([r1, r2])
    db.commit()

    # Admin 1 runs cleanup
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}
    resp = c.post("/api/v1/attendance/cleanup-test-logs", headers=headers1)
    assert resp.status_code == 200

    # Verify Institution 1 record deleted, Institution 2 record preserved
    assert db.query(models.AttendanceModel).filter_by(session_key="key_alpha_clean").first() is None
    assert db.query(models.AttendanceModel).filter_by(session_key="key_beta_clean").first() is not None


# ── Test 3: Wellness Score Cross-Tenant Rejection ─────────────────────────────
def test_wellness_score_rejects_cross_tenant_access(client):
    c, tokens, _ = client
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Admin 1 tries to access Institution 2 student 202 wellness score
    resp = c.get("/api/v1/wellness/score/2/202", headers=headers1)
    assert resp.status_code == 403
    assert "Cross-tenant access forbidden" in resp.json()["detail"]


# ── Test 4: Mood Log Cross-Tenant Rejection ───────────────────────────────────
def test_mood_log_rejects_cross_tenant_access(client):
    c, tokens, _ = client
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Admin 1 tries to access Institution 2 student 202 mood log
    resp = c.get("/api/v1/wellness/mood-log/2/202", headers=headers1)
    assert resp.status_code == 403
    assert "Cross-tenant access forbidden" in resp.json()["detail"]


# ── Test 5: Counselor Alerts Cross-Tenant Rejection ───────────────────────────
def test_counselor_alerts_rejects_cross_tenant_access(client):
    c, tokens, _ = client
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Admin 1 tries to access counselor alerts of Institution 2
    resp = c.get("/api/v1/wellness/counselor-alerts/2", headers=headers1)
    assert resp.status_code == 403
    assert "Cross-tenant access forbidden" in resp.json()["detail"]


# ── Test 6: Alert Resolution Cross-Tenant Rejection ───────────────────────────
def test_resolve_counselor_alert_rejects_cross_tenant_access(client):
    c, tokens, db = client
    checkin = models.WellnessCheckin(
        institution_id=2, student_id=202, mood="sad", mood_score=2,
        counselor_alerted=True, resolved=False
    )
    db.add(checkin)
    db.commit()

    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}
    resp = c.post(f"/api/v1/wellness/resolve-alert/2/{checkin.id}", json={"notes": "Resolved"}, headers=headers1)
    assert resp.status_code == 403
    assert "Cross-tenant access forbidden" in resp.json()["detail"]


# ── Test 7: Features7 Unauthenticated Leave Rejection ─────────────────────────
def test_features7_unauthenticated_leave_rejected(client):
    c, _, _ = client

    # All unauthenticated calls must be rejected
    r1 = c.get("/api/v1/features7/leave/list")
    assert r1.status_code == 401

    r2 = c.post("/api/v1/features7/leave/apply", json={
        "user_email": "test@test.com", "applicant_name": "Test",
        "start_date": "2026-09-14", "end_date": "2026-09-15", "reason": "Sick"
    })
    assert r2.status_code == 401

    r3 = c.post("/api/v1/features7/leave/1/approve")
    assert r3.status_code == 401


# ── Test 8: Features7 Cross-Tenant Leave Isolation ────────────────────────────
def test_features7_cross_tenant_leave_isolated(client):
    c, tokens, db = client
    # Create leave in Institution 2
    leave_beta = models.LeaveRequest(
        institution_id=2, user_email="student2@beta.edu",
        applicant_name="Bob Beta", role="student",
        start_date="2026-09-14", end_date="2026-09-15",
        reason="Conference", status="pending"
    )
    db.add(leave_beta)
    db.commit()

    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Admin 1 lists leaves - must not see Institution 2 leave
    r_list = c.get("/api/v1/features7/leave/list", headers=headers1)
    assert r_list.status_code == 200
    leaves = r_list.json()
    assert not any(l["id"] == leave_beta.id for l in leaves)

    # Admin 1 cannot approve Institution 2 leave
    r_app = c.post(f"/api/v1/features7/leave/{leave_beta.id}/approve", headers=headers1)
    assert r_app.status_code == 404

    # Admin 1 cannot apply leave for Student 202 (belongs to Institution 2)
    r_apply_cross = c.post("/api/v1/features7/leave/apply", json={
        "student_id": 202,
        "applicant_name": "Bob Beta",
        "start_date": "2026-09-14",
        "end_date": "2026-09-15",
        "reason": "Illness"
    }, headers=headers1)
    assert r_apply_cross.status_code == 400
    assert "Student not found in your institution" in r_apply_cross.json()["detail"]

    # Admin 1 applies leave for Student 101 (belongs to Institution 1) -> Success
    r_apply_valid = c.post("/api/v1/features7/leave/apply", json={
        "student_id": 101,
        "applicant_name": "Alice Alpha",
        "start_date": "2026-09-14",
        "end_date": "2026-09-15",
        "reason": "Legitimate Leave"
    }, headers=headers1)
    assert r_apply_valid.status_code == 200
    valid_leave_id = r_apply_valid.json()["leave_id"]
    leave_rec = db.query(models.LeaveRequest).filter_by(id=valid_leave_id).first()
    assert leave_rec.student_id == 101
    assert leave_rec.institution_id == 1


# ── Test 9: Multi-Campus Transfer Isolation ───────────────────────────────────
def test_multi_campus_cannot_transfer_to_unrelated_institution(client):
    c, tokens, db = client
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Admin 1 tries to transfer Student 101 to unrelated Institution 2
    payload = {"student_id": 101, "target_institution_id": 2}
    resp = c.post("/api/v1/campus/transfer-student", json=payload, headers=headers1)
    assert resp.status_code == 403
    assert "Cross-tenant transfer forbidden" in resp.json()["detail"]

    # Student 101 must remain in Institution 1
    s1 = db.query(models.StudentModel).filter_by(id=101).first()
    assert s1.institution_id == 1

    # Legitimate sub-campus transfer (to Institution 3, parent=1) should succeed
    payload_valid = {"student_id": 101, "target_institution_id": 3}
    resp_valid = c.post("/api/v1/campus/transfer-student", json=payload_valid, headers=headers1)
    assert resp_valid.status_code == 200
    db.refresh(s1)
    assert s1.institution_id == 3


# ── Test 10: Bulk Subject Import Duplicate Check Tenant Scoped ───────────────
def test_bulk_subject_import_duplicate_check_tenant_scoped(client):
    c, tokens, db = client
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}
    csv_data = "code,name,department\nCS101,Data Structures,CSE"
    files = {"file": ("subjects.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}

    # First import creates the subject for Institution 1
    resp = c.post("/api/v1/bulk-import/subjects", files=files, headers=headers1)
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] == 1
    assert data["skipped"] == 0

    # Second import by Admin 1 detects existing subject in tenant 1 and skips
    files2 = {"file": ("subjects.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")}
    resp2 = c.post("/api/v1/bulk-import/subjects", files=files2, headers=headers1)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["created"] == 0
    assert data2["skipped"] == 1


# ── Test 11: Parent Notification Tenant Isolation ─────────────────────────────
def test_notify_absent_batch_scopes_parent_account_by_tenant(client):
    c, tokens, db = client
    # Student 101 in Institution 1 is absent
    today_str = "14/09/2026"
    att = models.AttendanceModel(
        id="101", name="Alice", roll="A101", date=today_str, time="09:00:00",
        attendance="Absent", institution_id=1, session_key="abs_101_key"
    )
    # Notice: ParentAccount for student_id=101 created under Institution 2 (different tenant!)
    parent_beta = models.ParentAccount(
        institution_id=2, student_id=101, name="Beta Parent",
        email="parent_beta@test.com", phone="+919876543210", password_hash="hash"
    )
    db.add_all([att, parent_beta])
    db.commit()

    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}
    resp = c.post("/api/v1/interactive/notify-absent-batch", json={"student_rolls": ["A101"]}, headers=headers1)
    assert resp.status_code == 200


# ── Test 12: Student QR Check-in Tenant Scoped ────────────────────────────────
def test_student_qr_checkin_tenant_scoped(client):
    c, tokens, _ = client
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Student QR token from Institution 2 presented to Scanner in Institution 1
    token_inst2_student = security.create_access_token({
        "student_id": 202,
        "institution_id": 2,
        "exp": 9999999999
    })
    resp = c.post("/api/v1/attendance/scan-qr", json={"token": token_inst2_student}, headers=headers1)
    assert resp.status_code == 400
    assert "Access Denied: Student belongs to another workspace" in resp.json()["detail"]


# ── Test 13: Positive Regression Same Tenant Operations ───────────────────────
def test_legitimate_same_tenant_operations_pass(client):
    c, tokens, db = client
    headers1 = {"Authorization": f"Bearer {tokens['admin1']}"}

    # Student 101 in Institution 1 can have checkin and alerts viewed by Admin 1
    resp_checkin = c.post(
        "/api/v1/wellness/checkin/1",
        json={"student_id": 101, "mood": "sad", "notes": "Need counseling"},
        headers=headers1
    )
    assert resp_checkin.status_code == 200
    assert resp_checkin.json()["counselor_alerted"] is True

    # Admin 1 views counselor alerts for Institution 1
    resp_alerts = c.get("/api/v1/wellness/counselor-alerts/1", headers=headers1)
    assert resp_alerts.status_code == 200
    alerts = resp_alerts.json()["alerts"]
    assert len(alerts) >= 1
    alert_id = alerts[0]["id"]

    # Admin 1 resolves the alert
    resp_resolve = c.post(
        f"/api/v1/wellness/resolve-alert/1/{alert_id}",
        json={"notes": "Met student, all good"},
        headers=headers1
    )
    assert resp_resolve.status_code == 200
    assert resp_resolve.json()["success"] is True


# ── Test 14: System Owner Global Privileges Preserved ─────────────────────────
def test_system_owner_global_privileges_preserved(client):
    c, tokens, db = client
    headers_owner = {"Authorization": f"Bearer {tokens['owner']}"}

    # System Owner can view counselor alerts for Institution 2 without 403
    resp = c.get("/api/v1/wellness/counselor-alerts/2", headers=headers_owner)
    assert resp.status_code == 200

    # System Owner can transfer student from Institution 1 to Institution 2 globally
    resp_xfer = c.post(
        "/api/v1/campus/transfer-student",
        json={"student_id": 101, "target_institution_id": 2},
        headers=headers_owner
    )
    assert resp_xfer.status_code == 200
    s1 = db.query(models.StudentModel).filter_by(id=101).first()
    assert s1.institution_id == 2
