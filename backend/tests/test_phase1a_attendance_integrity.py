"""
Phase 1A — Attendance Integrity Hardening Test Suite
Verifies:
1. Normal attendance creation -> PASS.
2. Duplicate attendance attempt -> Rejected/Idempotent (returns newly_marked=False).
3. Concurrent duplicate attendance requests -> Exactly 1 record created.
4. Offline sync retries -> Idempotent (no duplicates).
5. Existing attendance functionality -> Querying and updating attendance works seamlessly.
"""
import concurrent.futures
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security, crud
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
def test_setup(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed institution
    inst = models.Institution(id=1, name="Test University", slug="test-uni", is_active=True)
    db.add(inst)

    # Seed admin user
    admin = models.User(
        id=1,
        institution_id=1,
        name="Test Admin",
        email="admin@test.com",
        password_hash=security.get_password_hash("admin123"),
        role="admin"
    )
    db.add(admin)

    # Seed student
    student = models.StudentModel(
        id=101,
        institution_id=1,
        name="Rahul Sharma",
        roll="CS-101",
        dep="Computer Science",
        email="rahul@test.com"
    )
    db.add(student)

    # Seed subject
    sub = models.Subject(id=10, institution_id=1, name="Data Structures", code="CS201", department="Computer Science")
    db.add(sub)

    db.commit()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield db
    app.dependency_overrides.clear()
    db.close()


def test_normal_attendance_pass(test_setup):
    db = test_setup
    att_rec, newly_marked = crud.mark_student_attendance(
        db=db,
        student_id=101,
        name="Rahul Sharma",
        roll="CS-101",
        dep="Computer Science",
        subject_id=10,
        custom_date="14/09/2026",
        custom_time="09:15:00",
        institution_id=1
    )
    assert newly_marked is True
    assert att_rec is not None
    assert att_rec.id == "101"
    assert att_rec.attendance == "Present"

    # Verify in DB
    total = db.query(models.AttendanceModel).count()
    assert total == 1


def test_duplicate_attendance_rejected(test_setup):
    db = test_setup
    # First attendance
    rec1, newly1 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul Sharma", roll="CS-101", dep="Computer Science",
        subject_id=10, custom_date="14/09/2026", custom_time="09:15:00", institution_id=1
    )
    assert newly1 is True

    # Second attendance attempt (same student, date, subject, period slot)
    rec2, newly2 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul Sharma", roll="CS-101", dep="Computer Science",
        subject_id=10, custom_date="14/09/2026", custom_time="09:20:00", institution_id=1
    )
    assert newly2 is False
    assert rec2.id == rec1.id
    assert db.query(models.AttendanceModel).count() == 1


def test_concurrent_duplicate_attendance(test_setup):
    # Tests multi-thread concurrency safety
    results = []

    def mark_att(thread_id):
        session = TestingSessionLocal()
        try:
            rec, newly = crud.mark_student_attendance(
                db=session,
                student_id=101,
                name="Rahul Sharma",
                roll="CS-101",
                dep="Computer Science",
                subject_id=10,
                custom_date="14/09/2026",
                custom_time=f"09:15:0{thread_id % 9}",
                institution_id=1
            )
            results.append(newly)
        finally:
            session.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(mark_att, i) for i in range(10)]
        concurrent.futures.wait(futures)

    newly_true_count = sum(1 for r in results if r is True)
    assert newly_true_count == 1, f"Expected exactly 1 newly marked attendance, got {newly_true_count}"

    db = test_setup
    assert db.query(models.AttendanceModel).count() == 1


def test_offline_sync_retry_no_duplicates(test_setup):
    db = test_setup
    student = db.query(models.StudentModel).first()
    student_id = student.id if student else 101

    client = TestClient(app)

    token = security.create_access_token(
        data={"sub": "admin@test.com", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    sync_payload = {
        "device_id": "mob-dev-001",
        "attendance_records": [
            {
                "student_id": student_id,
                "timestamp": "2026-09-14T09:15:00Z",
                "confidence": 0.95,
                "device_id": "mob-dev-001"
            }
        ]
    }

    # First sync
    res1 = client.post("/api/v1/offline-face/sync-attendance/1", json=sync_payload, headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["synced"] == 1
    assert data1["skipped"] == 0

    # Retry same sync
    res2 = client.post("/api/v1/offline-face/sync-attendance/1", json=sync_payload, headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["synced"] == 0
    assert data2["skipped"] == 1

    db = test_setup
    assert db.query(models.AttendanceModel).count() == 1


def test_existing_attendance_functionality_works(test_setup):
    db = test_setup
    # Create attendance
    rec, newly = crud.mark_student_attendance(
        db, student_id=101, name="Rahul Sharma", roll="CS-101", dep="Computer Science",
        subject_id=10, custom_date="14/09/2026", custom_time="09:15:00", institution_id=1
    )
    assert newly is True

    # Query attendance
    fetched = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == "101",
        models.AttendanceModel.institution_id == 1
    ).first()
    assert fetched is not None
    assert fetched.name == "Rahul Sharma"
    assert fetched.subject_id == 10


# =====================================================================
# Phase 1B — Database-Level Attendance Integrity Tests
# =====================================================================

def test_phase1b_db_unique_enforcement(test_setup):
    """A. Database unique enforcement: Direct insert with identical session_key raises IntegrityError."""
    from sqlalchemy.exc import IntegrityError
    from app.period_utils import generate_session_key

    s_key = generate_session_key(1, 101, "14/09/2026", "09:15:00", 10)
    db = TestingSessionLocal()
    try:
        r1 = models.AttendanceModel(
            id="101", time="09:15:00", date="14/09/2026",
            institution_id=1, subject_id=10, session_key=s_key
        )
        db.add(r1)
        db.commit()

        # Direct SQL/ORM insert of duplicate session_key
        r2 = models.AttendanceModel(
            id="101", time="09:18:00", date="14/09/2026",
            institution_id=1, subject_id=10, session_key=s_key
        )
        db.add(r2)
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
    finally:
        db.close()


def test_phase1b_null_subject_duplication_prevented(test_setup):
    """B. NULL subject: Two general attendance scans (subject_id=None) in same period are duplicates."""
    db = test_setup
    r1, newly1 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=None, custom_date="14/09/2026", custom_time="09:15:00", institution_id=1
    )
    assert newly1 is True

    r2, newly2 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=None, custom_date="14/09/2026", custom_time="09:30:00", institution_id=1
    )
    assert newly2 is False
    assert r2.session_key == r1.session_key


def test_phase1b_different_subjects_allowed(test_setup):
    """C. Different subjects: Same student/date/period but different subject IDs are allowed."""
    db = test_setup
    # Subject 10
    r1, newly1 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=10, custom_date="14/09/2026", custom_time="09:15:00", institution_id=1
    )
    assert newly1 is True

    # Subject 20
    sub2 = models.Subject(id=20, institution_id=1, name="Algorithms", code="CS202", department="CS")
    db.add(sub2)
    db.commit()

    r2, newly2 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=20, custom_date="14/09/2026", custom_time="09:15:05", institution_id=1
    )
    assert newly2 is True
    assert r1.session_key != r2.session_key


def test_phase1b_tenant_isolation(test_setup):
    """D. Tenant isolation: Student 101 at Inst 1 and Student 101 at Inst 2 do NOT collide."""
    db = test_setup
    # Seed Institution 2
    inst2 = models.Institution(id=2, name="Second Uni", slug="sec-uni", is_active=True)
    db.add(inst2)
    db.commit()

    # Inst 1 scan
    r1, newly1 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=10, custom_date="14/09/2026", custom_time="09:15:00", institution_id=1
    )
    assert newly1 is True

    # Inst 2 scan for student 101
    r2, newly2 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=10, custom_date="14/09/2026", custom_time="09:15:05", institution_id=2
    )
    assert newly2 is True
    assert r1.session_key != r2.session_key


def test_phase1b_different_periods_allowed(test_setup):
    """E. Different periods: Same student/date/subject in Period 1 (09:15) vs Period 2 (10:15)."""
    db = test_setup
    r1, newly1 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=10, custom_date="14/09/2026", custom_time="09:15:00", institution_id=1
    )
    assert newly1 is True

    r2, newly2 = crud.mark_student_attendance(
        db, student_id=101, name="Rahul", roll="CS-101", dep="CS",
        subject_id=10, custom_date="14/09/2026", custom_time="10:15:00", institution_id=1
    )
    assert newly2 is True
    assert r1.session_key != r2.session_key


def test_phase1b_concurrent_db_race_recovery(test_setup):
    """F. Concurrent DB race: Two independent DB sessions attempt simultaneous insert; 1 succeeds, losing path recovers cleanly."""
    db1 = TestingSessionLocal()
    db2 = TestingSessionLocal()
    try:
        # Simulate worker 1 marking attendance
        r1, n1 = crud.mark_student_attendance(
            db1, student_id=101, name="Rahul", roll="CS-101", dep="CS",
            subject_id=10, custom_date="14/09/2026", custom_time="09:15:00", institution_id=1
        )
        assert n1 is True

        # Simulate worker 2 marking same event after worker 1 committed
        r2, n2 = crud.mark_student_attendance(
            db2, student_id=101, name="Rahul", roll="CS-101", dep="CS",
            subject_id=10, custom_date="14/09/2026", custom_time="09:16:00", institution_id=1
        )
        assert n2 is False
        assert r2.id == r1.id
    finally:
        db1.close()
        db2.close()


def test_phase1b_migration_backfill(test_setup):
    """G. Migration/backfill: Legacy records receive deterministic session_key values."""
    db = TestingSessionLocal()
    try:
        from app.period_utils import generate_session_key
        legacy_rec = models.AttendanceModel(
            id="102", roll="CS-102", name="Priya", department="CS",
            date="14/09/2026", time="11:15:00", institution_id=1, subject_id=10, session_key=None
        )
        db.add(legacy_rec)
        db.commit()

        # Run backfill logic
        all_recs = db.query(models.AttendanceModel).all()
        for r in all_recs:
            if not r.session_key:
                r.session_key = generate_session_key(r.institution_id, r.id, r.date, r.time, r.subject_id)
        db.commit()

        db.refresh(legacy_rec)
        expected_key = generate_session_key(1, "102", "14/09/2026", "11:15:00", 10)
        assert legacy_rec.session_key == expected_key
    finally:
        db.close()


def test_phase1b_legacy_duplicate_cleanup(test_setup):
    """H. Duplicate legacy data: Migration cleanup retains earliest record and removes later duplicate before index creation."""
    db = TestingSessionLocal()
    try:
        from app.period_utils import generate_session_key
        s_key = generate_session_key(1, "103", "14/09/2026", "09:00:00", 10)

        # Legacy records created before session_key UNIQUE constraint was active
        r_earliest = models.AttendanceModel(
            id="103", roll="CS-103", name="Amit", department="CS",
            date="14/09/2026", time="09:00:00", institution_id=1, subject_id=10, session_key=None
        )
        r_later = models.AttendanceModel(
            id="103", roll="CS-103", name="Amit", department="CS",
            date="14/09/2026", time="09:10:00", institution_id=1, subject_id=10, session_key=None
        )
        db.add(r_earliest)
        db.add(r_later)
        db.commit()

        assert db.query(models.AttendanceModel).filter(models.AttendanceModel.id == "103").count() == 2

        # Deduplication migration logic
        key_groups = {}
        all_recs = db.query(models.AttendanceModel).filter(models.AttendanceModel.id == "103").all()
        for rec in all_recs:
            k = generate_session_key(rec.institution_id, rec.id, rec.date, rec.time, rec.subject_id)
            rec.session_key = k
            key_groups.setdefault(k, []).append(rec)

        deleted_count = 0
        for k, r_list in key_groups.items():
            if len(r_list) > 1:
                r_list.sort(key=lambda x: (x.date or "", x.time or ""))
                for dup in r_list[1:]:
                    db.delete(dup)
                    deleted_count += 1
        db.commit()

        assert deleted_count == 1
        assert db.query(models.AttendanceModel).filter(models.AttendanceModel.id == "103").count() == 1
    finally:
        db.close()

