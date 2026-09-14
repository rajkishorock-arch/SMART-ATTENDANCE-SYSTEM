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
