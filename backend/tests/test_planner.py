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

    # 1. Create Institution
    inst = models.Institution(
        id=1,
        name="Tech Institute of Science",
        slug="tis",
        is_active=True
    )
    db.add(inst)

    # 2. Create Student
    student = models.StudentModel(
        id=801,
        institution_id=1,
        name="Vikram Seth",
        roll="2026CS801",
        dep="CSE",
        course="B.Tech",
        email="vikram@tis.edu",
        password_hash=security.get_password_hash("pass123")
    )
    db.add(student)

    # 3. Create Subject 101: Student will have 6 Present, 4 Absent (Total: 10, Raw: 60.0%)
    sub1 = models.Subject(
        id=101,
        institution_id=1,
        name="Data Structures",
        code="CS201",
        department="CSE"
    )
    db.add(sub1)

    for i in range(1, 7):
        db.add(models.AttendanceModel(
            id=f"att_s1_p{i}",
            institution_id=1,
            roll="2026CS801",
            name="Vikram Seth",
            department="CSE",
            time="09:00:00 AM",
            date=f"{i:02d}/11/2026",
            attendance="Present",
            subject_id=101
        ))
    for i in range(7, 11):
        db.add(models.AttendanceModel(
            id=f"att_s1_a{i}",
            institution_id=1,
            roll="2026CS801",
            name="Vikram Seth",
            department="CSE",
            time="09:00:00 AM",
            date=f"{i:02d}/11/2026",
            attendance="Absent",
            subject_id=101
        ))

    # 4. Create Subject 102: Student will have 9 Present, 1 Absent (Total: 10, Raw: 90.0%)
    sub2 = models.Subject(
        id=102,
        institution_id=1,
        name="Linear Algebra",
        code="MA201",
        department="CSE"
    )
    db.add(sub2)

    for i in range(1, 10):
        db.add(models.AttendanceModel(
            id=f"att_s2_p{i}",
            institution_id=1,
            roll="2026CS801",
            name="Vikram Seth",
            department="CSE",
            time="11:00:00 AM",
            date=f"{i:02d}/11/2026",
            attendance="Present",
            subject_id=102
        ))
    db.add(models.AttendanceModel(
        id="att_s2_a10",
        institution_id=1,
        roll="2026CS801",
        name="Vikram Seth",
        department="CSE",
        time="11:00:00 AM",
        date="10/11/2026",
        attendance="Absent",
        subject_id=102
    ))

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


def test_planner_deficit_and_surplus_calculations(client):
    student_token = security.create_access_token(
        data={"sub": "vikram@tis.edu", "role": "student", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {student_token}"}

    res = client.get("/api/v1/planner/summary?target_percentage=75.0", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()

    # Overall: 15 attended out of 20 conducted = 75.0%
    assert data["overall_conducted"] == 20
    assert data["overall_attended"] == 15
    assert data["overall_percentage"] == 75.0
    assert data["overall_status"] == "SAFE"
    assert data["overall_classes_needed"] == 0
    assert data["overall_bunk_allowance"] == 0

    subjects = {s["subject_id"]: s for s in data["subjects"]}

    # Subject 101: 6 / 10 = 60.0% (< 70%, CRITICAL)
    # Target 75%: ceil((0.75 * 10 - 6) / 0.25) = ceil(1.5 / 0.25) = 6 classes needed!
    s1 = subjects[101]
    assert s1["current_percentage"] == 60.0
    assert s1["status"] == "CRITICAL"
    assert s1["classes_needed"] == 6
    assert s1["bunk_allowance"] == 0

    # Subject 102: 9 / 10 = 90.0% (SAFE)
    # Target 75%: floor((9 - 0.75 * 10) / 0.75) = floor(1.5 / 0.75) = 2 bunk allowance!
    s2 = subjects[102]
    assert s2["current_percentage"] == 90.0
    assert s2["status"] == "SAFE"
    assert s2["classes_needed"] == 0
    assert s2["bunk_allowance"] == 2


def test_planner_what_if_simulation(client):
    student_token = security.create_access_token(
        data={"sub": "vikram@tis.edu", "role": "student", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {student_token}"}

    # Simulate for Subject 101 (currently 6/10 = 60.0%)
    # If student attends 6 out of next 6 classes:
    # After: 12 / 16 = 75.0%
    sim_res = client.post(
        "/api/v1/planner/what-if",
        headers=headers,
        json={
            "subject_id": 101,
            "target_percentage": 75.0,
            "upcoming_classes": 6,
            "planned_attend": 6
        }
    )
    assert sim_res.status_code == 200, sim_res.text
    sim_data = sim_res.json()
    assert sim_data["current_percentage"] == 60.0
    assert sim_data["simulated_percentage"] == 75.0
    assert sim_data["target_achieved"] is True
    assert sim_data["conducted_before"] == 10
    assert sim_data["conducted_after"] == 16
    assert sim_data["attended_before"] == 6
    assert sim_data["attended_after"] == 12
    assert sim_data["simulated_status"] == "SAFE"
