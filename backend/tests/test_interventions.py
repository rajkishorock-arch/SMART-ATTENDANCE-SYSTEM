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
        name="Apex Engineering College",
        slug="apex",
        is_active=True
    )
    db.add(inst)

    # 2. Create Staff / Counselor
    counselor = models.User(
        id=1,
        institution_id=1,
        name="Dr. Sunita Rao",
        email="counselor@apex.edu",
        password_hash=security.get_password_hash("sunita123"),
        role="teacher",
        is_active=True
    )
    db.add(counselor)

    # 3. Create 3 Students with different attendance records
    s1 = models.StudentModel(id=1, institution_id=1, name="Dev Sharma", roll="2026CS01", dep="CSE", email="dev@apex.edu", password_hash=security.get_password_hash("p1"))
    s2 = models.StudentModel(id=2, institution_id=1, name="Priya Sen", roll="2026CS02", dep="CSE", email="priya@apex.edu", password_hash=security.get_password_hash("p2"))
    s3 = models.StudentModel(id=3, institution_id=1, name="Karan Joshi", roll="2026CS03", dep="CSE", email="karan@apex.edu", password_hash=security.get_password_hash("p3"))
    db.add_all([s1, s2, s3])

    # S1: 10 present / 20 total = 50% (<60%) -> DEBARMENT_RISK
    for i in range(1, 21):
        status = "Present" if i <= 10 else "Absent"
        db.add(models.AttendanceModel(id=f"s1_{i}", institution_id=1, roll="2026CS01", name="Dev", time="10:00", date=f"{i}/01/2026", attendance=status))

    # S2: 13 present / 20 total = 65% (60-69.9%) -> PARENT_ALERT
    for i in range(1, 21):
        status = "Present" if i <= 13 else "Absent"
        db.add(models.AttendanceModel(id=f"s2_{i}", institution_id=1, roll="2026CS02", name="Priya", time="10:00", date=f"{i}/01/2026", attendance=status))

    # S3: 14 present / 20 total = 70% (70-74.9%) -> WARNING
    for i in range(1, 21):
        status = "Present" if i <= 14 else "Absent"
        db.add(models.AttendanceModel(id=f"s3_{i}", institution_id=1, roll="2026CS03", name="Karan", time="10:00", date=f"{i}/01/2026", attendance=status))

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


def test_evaluate_and_categorize_tiered_interventions(client):
    token = security.create_access_token(
        data={"sub": "counselor@apex.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Run evaluation scan
    eval_res = client.post("/api/v1/interventions/evaluate", headers=headers)
    assert eval_res.status_code == 200
    assert "3 student interventions flagged" in eval_res.json()["message"]

    # 2. List interventions and verify tier classifications
    list_res = client.get("/api/v1/interventions", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) == 3

    tier_by_roll = {i["student_roll"]: i["tier"] for i in items}
    assert tier_by_roll["2026CS01"] == "DEBARMENT_RISK"
    assert tier_by_roll["2026CS02"] == "PARENT_ALERT"
    assert tier_by_roll["2026CS03"] == "WARNING"


def test_notify_parent_and_assign_counselor(client, test_db):
    token = security.create_access_token(
        data={"sub": "counselor@apex.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/interventions/evaluate", headers=headers)
    items = client.get("/api/v1/interventions", headers=headers).json()
    target_id = items[0]["id"]

    # Notify parent
    notify_res = client.post(f"/api/v1/interventions/{target_id}/notify-parent", headers=headers)
    assert notify_res.status_code == 200
    assert notify_res.json()["status"] == "PARENT_NOTIFIED"
    assert notify_res.json()["parent_contacted_at"] is not None

    # Assign counselor
    assign_res = client.post(
        f"/api/v1/interventions/{target_id}/assign-counselor",
        headers=headers,
        json={
            "counselor_id": 1,
            "meeting_date": "15/02/2026 03:30 PM",
            "notes": "Parent informed regarding internal marks eligibility"
        }
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "COUNSELOR_MEETING_SCHEDULED"
    assert assign_res.json()["counselor_name"] == "Dr. Sunita Rao"


def test_resolve_intervention(client):
    token = security.create_access_token(
        data={"sub": "counselor@apex.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/v1/interventions/evaluate", headers=headers)
    items = client.get("/api/v1/interventions", headers=headers).json()
    target_id = items[0]["id"]

    resolve_res = client.post(
        f"/api/v1/interventions/{target_id}/resolve",
        headers=headers,
        json={"notes": "Student attended makeup classes and agreed to weekly monitoring"}
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "RESOLVED"
    assert resolve_res.json()["resolved_at"] is not None
