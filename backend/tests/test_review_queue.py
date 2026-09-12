import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime

from app.main import app
from app.database import Base, get_db
from app import models, security

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
        name="Global Tech University",
        slug="gtu",
        is_active=True
    )
    db.add(inst)

    # 2. Create Teacher and Admin
    teacher = models.User(
        id=1,
        institution_id=1,
        name="Prof. Ramanujan",
        email="ramanujan@gtu.edu",
        password_hash=security.get_password_hash("prof123"),
        role="teacher",
        is_active=True
    )
    db.add(teacher)

    # 3. Create Students
    student1 = models.StudentModel(
        id=101,
        institution_id=1,
        name="Arjun Kapoor",
        roll="2026CS001",
        dep="CSE",
        email="arjun@gtu.edu",
        password_hash=security.get_password_hash("pass1")
    )
    student2 = models.StudentModel(
        id=102,
        institution_id=1,
        name="Varun Dhawan",
        roll="2026CS002",
        dep="CSE",
        email="varun@gtu.edu",
        password_hash=security.get_password_hash("pass2")
    )
    db.add_all([student1, student2])

    # 4. Create Subject
    subject = models.Subject(
        id=50,
        institution_id=1,
        name="Neural Networks",
        code="CS502",
        department="CSE",
        teacher_id=1
    )
    db.add(subject)

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


def test_stage_and_confirm_low_confidence_match(client, test_db):
    teacher_token = security.create_access_token(
        data={"sub": "ramanujan@gtu.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {teacher_token}"}
    today_str = datetime.now().strftime("%d/%m/%Y")

    # 1. Stage a borderline match (similarity 0.42)
    stage_res = client.post(
        "/api/v1/review-queue/stage",
        headers=headers,
        data={
            "candidate_student_id": 101,
            "similarity_score": 0.4215,
            "date": today_str,
            "session_time": "10:15:00 AM",
            "subject_id": 50,
            "device_id": "hall-scanner-1"
        }
    )
    assert stage_res.status_code == 200, stage_res.text
    review_item = stage_res.json()
    assert review_item["status"] == "PENDING"
    assert review_item["candidate_name"] == "Arjun Kapoor"
    assert review_item["similarity_score"] == 0.4215
    review_id = review_item["id"]

    # 2. Staff views review queue
    queue_res = client.get("/api/v1/review-queue?status=PENDING", headers=headers)
    assert queue_res.status_code == 200
    assert len(queue_res.json()) >= 1

    # 3. Staff confirms the match
    resolve_res = client.post(
        f"/api/v1/review-queue/{review_id}/resolve",
        headers=headers,
        json={
            "action": "CONFIRM",
            "comment": "Visually verified Arjun in lecture hall seat 4"
        }
    )
    assert resolve_res.status_code == 200, resolve_res.text
    resolved = resolve_res.json()
    assert resolved["status"] == "CONFIRMED"
    assert resolved["reviewed_by"] == "ramanujan@gtu.edu"

    # 4. Verify Attendance record was logged
    att = test_db.query(models.AttendanceModel).filter(
        models.AttendanceModel.roll == "2026CS001",
        models.AttendanceModel.date == today_str
    ).first()
    assert att is not None
    assert att.attendance == "Present"

    # 5. Verify Audit Log recorded
    audit = test_db.query(models.AuditLog).filter(
        models.AuditLog.institution_id == 1,
        models.AuditLog.entity_id == str(review_id)
    ).first()
    assert audit is not None
    assert "Confirmed low-confidence face match" in audit.action


def test_stage_and_reassign_low_confidence_match(client, test_db):
    teacher_token = security.create_access_token(
        data={"sub": "ramanujan@gtu.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {teacher_token}"}
    today_str = datetime.now().strftime("%d/%m/%Y")

    # Stage match for student 101 (Arjun), but image actually belongs to student 102 (Varun)
    stage_res = client.post(
        "/api/v1/review-queue/stage",
        headers=headers,
        data={
            "candidate_student_id": 101,
            "similarity_score": 0.385,
            "date": today_str,
            "subject_id": 50
        }
    )
    review_id = stage_res.json()["id"]

    # Reassign to Varun
    reassign_res = client.post(
        f"/api/v1/review-queue/{review_id}/resolve",
        headers=headers,
        json={
            "action": "REASSIGN",
            "reassign_to_roll": "2026CS002",
            "comment": "Face matches Varun Dhawan who sat next to Arjun"
        }
    )
    assert reassign_res.status_code == 200, reassign_res.text
    assert reassign_res.json()["status"] == "REASSIGNED"

    # Verify attendance created for Varun
    att_varun = test_db.query(models.AttendanceModel).filter(
        models.AttendanceModel.roll == "2026CS002",
        models.AttendanceModel.date == today_str
    ).first()
    assert att_varun is not None
    assert att_varun.attendance == "Present"


def test_reject_low_confidence_match(client, test_db):
    teacher_token = security.create_access_token(
        data={"sub": "ramanujan@gtu.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {teacher_token}"}
    today_str = datetime.now().strftime("%d/%m/%Y")

    stage_res = client.post(
        "/api/v1/review-queue/stage",
        headers=headers,
        data={
            "candidate_student_id": 101,
            "similarity_score": 0.360,
            "date": today_str,
            "subject_id": 50
        }
    )
    review_id = stage_res.json()["id"]

    reject_res = client.post(
        f"/api/v1/review-queue/{review_id}/resolve",
        headers=headers,
        json={
            "action": "REJECT",
            "comment": "Glitch/unrelated person detected in background"
        }
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"
