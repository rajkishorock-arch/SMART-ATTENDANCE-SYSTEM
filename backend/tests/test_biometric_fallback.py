import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

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

    # 1. Institution
    inst = models.Institution(id=1, name="State Tech University", slug="stu", is_active=True)
    db.add(inst)

    # 2. Teacher
    teacher = models.User(
        id=1, institution_id=1, name="Prof. Alan", email="alan@stu.edu",
        password_hash=security.get_password_hash("pass123"), role="teacher", is_active=True
    )
    db.add(teacher)

    # 3. Student
    student = models.StudentModel(
        id=77, institution_id=1, name="Vikram Roy", roll="2026STU77",
        dep="CSE", email="vikram@stu.edu", password_hash=security.get_password_hash("pass77")
    )
    db.add(student)

    # 4. Subject
    subj = models.Subject(id=10, institution_id=1, name="Embedded Systems", code="CS401", department="CSE")
    db.add(subj)

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


def test_generate_session_and_rolling_qr(client):
    teacher_token = security.create_access_token(
        data={"sub": "alan@stu.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {teacher_token}"}

    # Generate session
    gen_res = client.post(
        "/api/v1/fallback/generate-session",
        headers=headers,
        json={"subject_id": 10, "duration_minutes": 45}
    )
    assert gen_res.status_code == 200, gen_res.text
    session_data = gen_res.json()
    assert session_data["is_active"] is True
    assert len(session_data["session_pin"]) == 6
    session_id = session_data["id"]

    # Request active rolling token
    tok_res = client.get(f"/api/v1/fallback/active-token/{session_id}", headers=headers)
    assert tok_res.status_code == 200
    tok_data = tok_res.json()
    assert tok_data["session_id"] == session_id
    assert "FALLBACK:" in tok_data["token"]
    assert 0 <= tok_data["seconds_remaining"] <= 30


def test_claim_attendance_via_dynamic_qr(client, test_db):
    teacher_token = security.create_access_token(
        data={"sub": "alan@stu.edu", "role": "teacher", "institution_id": 1}
    )
    t_headers = {"Authorization": f"Bearer {teacher_token}"}

    student_token = security.create_access_token(
        data={"sub": "vikram@stu.edu", "role": "student", "institution_id": 1}
    )
    s_headers = {"Authorization": f"Bearer {student_token}"}

    # 1. Generate session
    gen_res = client.post("/api/v1/fallback/generate-session", headers=t_headers, json={"subject_id": 10})
    session_id = gen_res.json()["id"]

    # 2. Get rolling token
    tok_res = client.get(f"/api/v1/fallback/active-token/{session_id}", headers=t_headers)
    valid_token = tok_res.json()["token"]

    # 3. Student claims QR
    claim_res = client.post(
        "/api/v1/fallback/claim-qr",
        headers=s_headers,
        json={"token": valid_token, "fallback_reason": "Severe glare on webcam sensor"}
    )
    assert claim_res.status_code == 200, claim_res.text
    claim_data = claim_res.json()
    assert claim_data["success"] is True
    assert claim_data["verification_method"] == "DYNAMIC_QR"

    # Verify DB record
    rec = test_db.query(models.AttendanceModel).filter_by(roll="2026STU77").first()
    assert rec is not None
    assert rec.attendance == "Present"
    assert rec.verification_method == "DYNAMIC_QR"
    assert rec.fallback_reason == "Severe glare on webcam sensor"

    # 4. Tampered token should be rejected
    bad_res = client.post(
        "/api/v1/fallback/claim-qr",
        headers=s_headers,
        json={"token": "FALLBACK:999:123:faketoken123"}
    )
    assert bad_res.status_code in [400, 404]


def test_claim_attendance_via_emergency_pin(client, test_db):
    teacher_token = security.create_access_token(
        data={"sub": "alan@stu.edu", "role": "teacher", "institution_id": 1}
    )
    t_headers = {"Authorization": f"Bearer {teacher_token}"}

    student_token = security.create_access_token(
        data={"sub": "vikram@stu.edu", "role": "student", "institution_id": 1}
    )
    s_headers = {"Authorization": f"Bearer {student_token}"}

    gen_res = client.post("/api/v1/fallback/generate-session", headers=t_headers, json={"subject_id": 10})
    session_id = gen_res.json()["id"]
    correct_pin = gen_res.json()["session_pin"]

    # 1. Missing reason fails (400)
    fail_res = client.post(
        "/api/v1/fallback/claim-pin",
        headers=s_headers,
        json={"session_id": session_id, "session_pin": correct_pin, "fallback_reason": ""}
    )
    assert fail_res.status_code == 400

    # 2. Invalid PIN fails (400)
    wrong_pin_res = client.post(
        "/api/v1/fallback/claim-pin",
        headers=s_headers,
        json={"session_id": session_id, "session_pin": "000000", "fallback_reason": "Injury"}
    )
    assert wrong_pin_res.status_code == 400

    # 3. Correct claim succeeds
    success_res = client.post(
        "/api/v1/fallback/claim-pin",
        headers=s_headers,
        json={"session_id": session_id, "session_pin": correct_pin, "fallback_reason": "Eye injury with medical eyepatch"}
    )
    assert success_res.status_code == 200
    assert success_res.json()["verification_method"] == "SESSION_PIN"
