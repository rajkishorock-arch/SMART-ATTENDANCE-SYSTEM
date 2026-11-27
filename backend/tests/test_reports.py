import pytest
from datetime import datetime, timezone, timedelta
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
def report_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    inst = models.Institution(id=1, name="Golden Gate Institute", slug="default", is_active=True)
    db.add(inst)

    admin = models.User(
        id=1, institution_id=1, name="Admin", email="admin@golden.edu",
        password_hash=security.get_password_hash("Admin123!"), role="admin", is_active=True,
    )
    t1 = models.User(
        id=2, institution_id=1, name="Prof. Khan", email="khan@golden.edu",
        password_hash=security.get_password_hash("Teach123!"), role="teacher", is_active=True,
    )
    t2 = models.User(
        id=3, institution_id=1, name="Prof. Sharma", email="sharma@golden.edu",
        password_hash=security.get_password_hash("Teach123!"), role="teacher", is_active=True,
    )
    db.add_all([admin, t1, t2])

    d_iot = models.Department(id=1, institution_id=1, name="CSE(IOT)", code="23")
    d_ce = models.Department(id=2, institution_id=1, name="Civil Engineering", code="CE")
    db.add_all([d_iot, d_ce])

    sub = models.Subject(
        id=10, institution_id=1, name="Edge AI", code="IOT-202", department="CSE(IOT)", teacher_id=2
    )
    db.add(sub)

    s1 = models.StudentModel(
        id=101, institution_id=1, name="Rajkishor Rock", roll="2365", dep="CSE(IOT)",
        email="raj@golden.edu", password_hash=security.get_password_hash("1234"),
    )
    s2 = models.StudentModel(
        id=102, institution_id=1, name="Rajan Kumar", roll="7484", dep="CSE(IOT)",
        email="rajan@golden.edu", password_hash=security.get_password_hash("1234"),
    )
    s_ce = models.StudentModel(
        id=103, institution_id=1, name="Civil Student", roll="CE-01", dep="CE",
        email="civil@golden.edu", password_hash=security.get_password_hash("1234"),
    )
    db.add_all([s1, s2, s_ce])

    # Day 1: s1 Present, s2 Absent
    # Day 2: s1 Late (same day also extra Present in P2 -> deduplicates unique days!), s2 CLASS_CANCELLED
    # Day 3: orphan ghost deleted student row -> excluded from report
    db.add_all([
        models.AttendanceModel(id="101", institution_id=1, roll="2365", name="Rajkishor Rock", department="CSE(IOT)", time="09:00:00", date="25/11/2026", attendance="Present", subject_id=10),
        models.AttendanceModel(id="102", institution_id=1, roll="7484", name="Rajan Kumar", department="CSE(IOT)", time="09:00:00", date="25/11/2026", attendance="Absent", subject_id=10),
        models.AttendanceModel(id="101", institution_id=1, roll="2365", name="Rajkishor Rock", department="CSE(IOT)", time="10:00:00", date="26/11/2026", attendance="Late", subject_id=10),
        models.AttendanceModel(id="101", institution_id=1, roll="2365", name="Rajkishor Rock", department="CSE(IOT)", time="11:00:00", date="26/11/2026", attendance="Present", subject_id=10),
        models.AttendanceModel(id="102", institution_id=1, roll="7484", name="Rajan Kumar", department="CSE(IOT)", time="10:00:00", date="27/11/2026", attendance="CLASS_CANCELLED", subject_id=10),
        models.AttendanceModel(id="9999", institution_id=1, roll="9999", name="Ghost Deleted", department="CSE(IOT)", time="09:00:00", date="25/11/2026", attendance="Present", subject_id=10),
    ])
    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(report_db):
    def override_get_db():
        yield report_db
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_attendance_report_accuracy_aliases_and_substitute_teacher(client):
    admin_tok = security.create_access_token({"sub": "admin@golden.edu", "role": "admin", "institution_id": 1})
    khan_tok = security.create_access_token({"sub": "khan@golden.edu", "role": "teacher", "institution_id": 1})
    sharma_tok = security.create_access_token({"sub": "sharma@golden.edu", "role": "teacher", "institution_id": 1})

    # 1. Admin report for CSE(IOT): 2 non-cancelled working days (25/11, 26/11); ghost excluded
    res = client.get(
        "/api/v1/attendance/report?start_date=2026-11-01&end_date=2026-11-30&department=CSE(IOT)",
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total_working_days"] == 2
    names = [s["name"] for s in body["students"]]
    assert "Ghost Deleted" not in names
    assert "Civil Student" not in names

    raj = next(s for s in body["students"] if s["id"] == 101)
    assert raj["present_days"] == 2  # Present + Late across 2 unique days (deduplicated)
    assert raj["total_days"] == 2
    assert raj["percentage"] == 100.0
    assert raj["low_attendance"] is False
    assert raj["email"] == "raj@golden.edu"

    rajan = next(s for s in body["students"] if s["id"] == 102)
    assert rajan["present_days"] == 0
    assert rajan["total_days"] == 2
    assert rajan["percentage"] == 0.0
    assert rajan["low_attendance"] is True

    # 2. Department alias match ("Civil Engineering" matches code "CE") and empty dept returns [] (not other branches!)
    ce_res = client.get(
        "/api/v1/attendance/report?department=Civil%20Engineering",
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert ce_res.status_code == 200
    assert [s["name"] for s in ce_res.json()["students"]] == ["Civil Student"]

    empty_res = client.get(
        "/api/v1/attendance/report?department=Mechanical",
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert empty_res.status_code == 200
    assert empty_res.json()["students"] == []

    # 3. Teacher access & Substitute delegation access
    assert client.get("/api/v1/attendance/report?subject_id=10", headers={"Authorization": f"Bearer {khan_tok}"}).status_code == 200
    assert client.get("/api/v1/attendance/report?subject_id=10", headers={"Authorization": f"Bearer {sharma_tok}"}).status_code == 403

    ist_today = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    sub_res = client.post(
        "/api/v1/calendar/substitute",
        headers={"Authorization": f"Bearer {khan_tok}"},
        json={"subject_id": 10, "substitute_teacher_id": 3, "date": ist_today, "reason": "Seminar"},
    )
    assert sub_res.status_code == 200
    assert client.get("/api/v1/attendance/report?subject_id=10", headers={"Authorization": f"Bearer {sharma_tok}"}).status_code == 200

    # 4. Deleted student immediately vanishes from cached report
    assert client.delete("/api/v1/users/students/102", headers={"Authorization": f"Bearer {admin_tok}"}).status_code == 200
    after_del = client.get(
        "/api/v1/attendance/report?start_date=2026-11-01&end_date=2026-11-30&department=CSE(IOT)",
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert [s["name"] for s in after_del.json()["students"]] == ["Rajkishor Rock"]
