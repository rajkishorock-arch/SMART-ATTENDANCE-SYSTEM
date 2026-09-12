import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta

from app.main import app
from app.database import Base, get_db
from app import models, security

# In-memory SQLite for fast, isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # 1. Create Institution
    inst = models.Institution(
        id=1,
        name="Test University",
        slug="testuni",
        is_active=True
    )
    db.add(inst)
    
    # 2. Create Admin and Teacher
    admin = models.User(
        id=1,
        institution_id=1,
        name="Admin User",
        email="admin@test.com",
        password_hash=security.get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    teacher = models.User(
        id=2,
        institution_id=1,
        name="Prof. Sharma",
        email="teacher@test.com",
        password_hash=security.get_password_hash("teacher123"),
        role="teacher",
        is_active=True
    )
    db.add_all([admin, teacher])

    # 3. Create Subject
    subject = models.Subject(
        id=101,
        institution_id=1,
        name="Computer Vision",
        code="CS401",
        department="CSE",
        teacher_id=2
    )
    db.add(subject)

    # 4. Create Student
    student = models.StudentModel(
        id=501,
        institution_id=1,
        name="Rahul Verma",
        roll="2026CS101",
        dep="CSE",
        course="B.Tech",
        email="student@test.com",
        password_hash=security.get_password_hash("student123")
    )
    db.add(student)

    # 5. Create an initial "Absent" attendance record
    today_str = datetime.now().strftime("%d/%m/%Y")
    att = models.AttendanceModel(
        id="501",
        institution_id=1,
        roll="2026CS101",
        name="Rahul Verma",
        department="CSE",
        time="10:00:00 AM",
        date=today_str,
        attendance="Absent",
        subject_id=101
    )
    db.add(att)

    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(test_db):
    def override_get_db():
        try:
            yield test_db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_student_submit_and_teacher_approve_dispute(client, test_db):
    # 1. Generate JWT tokens
    student_token = security.create_access_token(
        data={"sub": "student@test.com", "role": "student", "institution_id": 1}
    )
    teacher_token = security.create_access_token(
        data={"sub": "teacher@test.com", "role": "teacher", "institution_id": 1}
    )

    today_str = datetime.now().strftime("%d/%m/%Y")

    # 2. Student submits dispute for the absent class
    submit_res = client.post(
        "/api/v1/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        data={
            "attendance_id": "501",
            "subject_id": 101,
            "date": today_str,
            "original_status": "Absent",
            "requested_status": "Present",
            "reason": "Biometric / Scanner Failure",
            "description": "Camera did not recognize face despite standing in front for 30s."
        }
    )
    assert submit_res.status_code == 200, submit_res.text
    dispute_data = submit_res.json()
    assert dispute_data["status"] == "SUBMITTED"
    assert dispute_data["reason"] == "Biometric / Scanner Failure"
    dispute_id = dispute_data["id"]

    # 3. Duplicate submission attempt must be rejected (400)
    dup_res = client.post(
        "/api/v1/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        data={
            "attendance_id": "501",
            "subject_id": 101,
            "date": today_str,
            "original_status": "Absent",
            "requested_status": "Present",
            "reason": "Biometric / Scanner Failure",
            "description": "Submitting again"
        }
    )
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 4. Teacher reviews disputes queue
    queue_res = client.get(
        "/api/v1/disputes/queue",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert queue_res.status_code == 200
    items = queue_res.json()
    assert len(items) >= 1
    assert items[0]["id"] == dispute_id

    # 5. Teacher adds comment / requests information
    comment_res = client.post(
        f"/api/v1/disputes/{dispute_id}/comments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"message": "Confirmed with the class monitor that Rahul was in class."}
    )
    assert comment_res.status_code == 200

    # 6. Teacher approves the dispute
    review_res = client.post(
        f"/api/v1/disputes/{dispute_id}/review",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"action": "APPROVE", "comment": "Verified attendance, marked present."}
    )
    assert review_res.status_code == 200
    approved_data = review_res.json()
    assert approved_data["status"] == "APPROVED"
    assert approved_data["reviewed_by"] == "teacher@test.com"

    # 7. Verify Official Attendance Record was updated from 'Absent' to 'Present'
    att_record = test_db.query(models.AttendanceModel).filter(
        models.AttendanceModel.institution_id == 1,
        models.AttendanceModel.id == "501",
        models.AttendanceModel.date == today_str
    ).first()
    assert att_record is not None
    assert att_record.attendance == "Present"

    # 8. Verify Immutable Audit Event was logged
    audit_event = test_db.query(models.AuditLog).filter(
        models.AuditLog.institution_id == 1,
        models.AuditLog.entity_type == "attendance",
        models.AuditLog.entity_id == str(dispute_id)
    ).first()
    assert audit_event is not None
    assert audit_event.user_email == "teacher@test.com"
    assert audit_event.previous_value == "Absent"
    assert audit_event.new_value == "Present"


def test_student_cancel_dispute(client):
    student_token = security.create_access_token(
        data={"sub": "student@test.com", "role": "student", "institution_id": 1}
    )
    today_str = datetime.now().strftime("%d/%m/%Y")

    submit_res = client.post(
        "/api/v1/disputes",
        headers={"Authorization": f"Bearer {student_token}"},
        data={
            "subject_id": 101,
            "date": today_str,
            "original_status": "Absent",
            "requested_status": "Present",
            "reason": "Medical reason",
            "description": "Felt unwell during period 1."
        }
    )
    assert submit_res.status_code == 200
    dispute_id = submit_res.json()["id"]

    # Student cancels
    cancel_res = client.post(
        f"/api/v1/disputes/{dispute_id}/cancel",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
