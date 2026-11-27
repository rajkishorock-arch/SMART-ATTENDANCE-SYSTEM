import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta

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
        name="Apex University",
        slug="apex",
        is_active=True
    )
    db.add(inst)
    
    # 2. Create Admin and Teachers
    admin = models.User(
        id=1,
        institution_id=1,
        name="Admin Lead",
        email="admin@apex.edu",
        password_hash=security.get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    teacher1 = models.User(
        id=2,
        institution_id=1,
        name="Dr. Alan Turing",
        email="alan@apex.edu",
        password_hash=security.get_password_hash("teacher123"),
        role="teacher",
        is_active=True
    )
    teacher2 = models.User(
        id=3,
        institution_id=1,
        name="Dr. Ada Lovelace",
        email="ada@apex.edu",
        password_hash=security.get_password_hash("teacher123"),
        role="teacher",
        is_active=True
    )
    db.add_all([admin, teacher1, teacher2])

    # 3. Create Subject
    subject = models.Subject(
        id=101,
        institution_id=1,
        name="Deep Learning",
        code="CS601",
        department="CSE",
        teacher_id=2
    )
    db.add(subject)

    # 4. Create Student
    student = models.StudentModel(
        id=501,
        institution_id=1,
        name="Karan Johar",
        roll="2026CS501",
        dep="CSE",
        course="B.Tech",
        email="karan@apex.edu",
        password_hash=security.get_password_hash("student123")
    )
    db.add(student)

    # 5. Populate initial attendance: 7 Present, 3 Absent (Total: 10, Raw: 70%)
    for i in range(1, 8):
        date_str = f"{i:02d}/10/2026"
        att = models.AttendanceModel(
            id=f"att_{i}",
            institution_id=1,
            roll="2026CS501",
            name="Karan Johar",
            department="CSE",
            time="09:00:00 AM",
            date=date_str,
            attendance="Present",
            subject_id=101
        )
        db.add(att)

    for i in range(8, 11):
        date_str = f"{i:02d}/10/2026"
        att = models.AttendanceModel(
            id=f"att_{i}",
            institution_id=1,
            roll="2026CS501",
            name="Karan Johar",
            department="CSE",
            time="09:00:00 AM",
            date=date_str,
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


def test_calendar_events_crud(client):
    admin_token = security.create_access_token(
        data={"sub": "admin@apex.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create a holiday event
    create_res = client.post(
        "/api/v1/calendar/events",
        headers=headers,
        json={
            "title": "National Science Day",
            "description": "Annual institutional science festival & holiday",
            "event_type": "HOLIDAY",
            "start_date": "28/02/2026",
            "department": "CSE"
        }
    )
    assert create_res.status_code == 200, create_res.text
    event_data = create_res.json()
    assert event_data["title"] == "National Science Day"
    assert event_data["event_type"] == "HOLIDAY"
    event_id = event_data["id"]

    # 2. List events with filter
    list_res = client.get(
        "/api/v1/calendar/events?event_type=HOLIDAY",
        headers=headers
    )
    assert list_res.status_code == 200
    events = list_res.json()
    assert len(events) >= 1
    assert any(e["id"] == event_id for e in events)

    # 3. Update event
    update_res = client.put(
        f"/api/v1/calendar/events/{event_id}",
        headers=headers,
        json={"title": "National Science & Tech Day"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "National Science & Tech Day"

    # 4. Delete event
    del_res = client.delete(f"/api/v1/calendar/events/{event_id}", headers=headers)
    assert del_res.status_code == 200


def test_cancel_class_and_metrics_protection(client, test_db):
    teacher_token = security.create_access_token(
        data={"sub": "alan@apex.edu", "role": "teacher", "institution_id": 1}
    )
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}

    student_token = security.create_access_token(
        data={"sub": "karan@apex.edu", "role": "student", "institution_id": 1}
    )
    headers_student = {"Authorization": f"Bearer {student_token}"}

    # Check metrics before cancellation:
    # 7 Present, 3 Absent -> 70% (is_at_risk = True)
    pre_metrics = client.get(
        "/api/v1/calendar/attendance-metrics?subject_id=101",
        headers=headers_student
    )
    assert pre_metrics.status_code == 200
    data = pre_metrics.json()
    assert data["scheduled_classes"] == 10
    assert data["conducted_classes"] == 10
    assert data["attended_classes"] == 7
    assert data["attendance_percentage"] == 70.0
    assert data["is_at_risk"] is True

    # Teacher cancels class on date '08/10/2026' (which was an absence)
    cancel_res = client.post(
        "/api/v1/calendar/cancel-class",
        headers=headers_teacher,
        json={
            "subject_id": 101,
            "date": "08/10/2026",
            "reason": "Faculty attending AI Conference keynote",
            "session_time": "09:00 AM"
        }
    )
    assert cancel_res.status_code == 200, cancel_res.text
    cancel_event = cancel_res.json()
    assert cancel_event["event_type"] == "CLASS_CANCELLED"

    # Verify that attendance record on 08/10/2026 was updated to CLASS_CANCELLED
    att_row = test_db.query(models.AttendanceModel).filter(
        models.AttendanceModel.date == "08/10/2026",
        models.AttendanceModel.subject_id == 101
    ).first()
    assert att_row.attendance == "CLASS_CANCELLED"

    # Re-calculate metrics:
    # Scheduled: 10
    # Cancelled: 1
    # Conducted: 9 (10 - 1)
    # Attended: 7
    # Percentage: (7 / 9) * 100 = 77.78% (>= 75%, so is_at_risk = False!)
    post_metrics = client.get(
        "/api/v1/calendar/attendance-metrics?subject_id=101",
        headers=headers_student
    )
    assert post_metrics.status_code == 200
    post_data = post_metrics.json()
    assert post_data["scheduled_classes"] == 10
    assert post_data["cancelled_classes"] == 1
    assert post_data["conducted_classes"] == 9
    assert post_data["attended_classes"] == 7
    assert post_data["attendance_percentage"] == 77.78
    assert post_data["is_at_risk"] is False


def test_substitute_teacher_assignment(client):
    teacher_token = security.create_access_token(
        data={"sub": "alan@apex.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {teacher_token}"}

    sub_res = client.post(
        "/api/v1/calendar/substitute",
        headers=headers,
        json={
            "subject_id": 101,
            "substitute_teacher_id": 3,
            "date": "15/10/2026",
            "reason": "Medical leave coverage"
        }
    )
    assert sub_res.status_code == 200, sub_res.text
    sub_data = sub_res.json()
    assert sub_data["event_type"] == "TEACHER_SUBSTITUTION"
    assert sub_data["substitute_teacher_id"] == 3
    assert sub_data["substitute_teacher_name"] == "Dr. Ada Lovelace"


def test_admin_and_teacher_aggregate_metrics_real_data(client):
    admin_token = security.create_access_token(
        data={"sub": "admin@apex.edu", "role": "admin", "institution_id": 1}
    )
    teacher_token = security.create_access_token(
        data={"sub": "alan@apex.edu", "role": "teacher", "institution_id": 1}
    )
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    headers_teacher = {"Authorization": f"Bearer {teacher_token}"}

    # 1. Both admin and subject teacher get real non-zero institutional/subject metrics (NO student_id required)
    for hdr in (headers_admin, headers_teacher):
        res = client.get("/api/v1/calendar/attendance-metrics?subject_id=101", headers=hdr)
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["scheduled_classes"] == 10
        assert data["cancelled_classes"] == 0
        assert data["conducted_classes"] == 10
        assert data["attended_classes"] == 7
        assert data["attendance_percentage"] == 70.0
        assert data["is_at_risk"] is True

    # 2. Cancel one class on absent date (accepting ISO YYYY-MM-DD directly from <input type="date">)
    cancel_res = client.post(
        "/api/v1/calendar/cancel-class",
        headers=headers_admin,
        json={
            "subject_id": 101,
            "date": "2026-10-08",
            "reason": "Departmental research symposium",
            "session_time": "Period 1 (09:00 - 10:00 AM)"
        }
    )
    assert cancel_res.status_code == 200, cancel_res.text
    event_id = cancel_res.json()["id"]

    # 3. Admin and teacher metrics immediately reflect protection (7 / 9 = 77.78%)
    for hdr in (headers_admin, headers_teacher):
        post_res = client.get("/api/v1/calendar/attendance-metrics?subject_id=101", headers=hdr)
        assert post_res.status_code == 200
        pdata = post_res.json()
        assert pdata["cancelled_classes"] == 1
        assert pdata["conducted_classes"] == 9
        assert pdata["attended_classes"] == 7
        assert pdata["attendance_percentage"] == 77.78
        assert pdata["is_at_risk"] is False

    # 4. Admin can also inspect a specific student's metrics explicitly
    stud_res = client.get("/api/v1/calendar/attendance-metrics?subject_id=101&student_id=501", headers=headers_admin)
    assert stud_res.status_code == 200
    assert stud_res.json()["attendance_percentage"] == 77.78

    # 5. Cleanup
    del_res = client.delete(f"/api/v1/calendar/events/{event_id}", headers=headers_admin)
    assert del_res.status_code == 200


def test_substitute_teacher_workflow_permissions_and_listing(client):
    alan_token = security.create_access_token(
        data={"sub": "alan@apex.edu", "role": "teacher", "institution_id": 1}
    )
    ada_token = security.create_access_token(
        data={"sub": "ada@apex.edu", "role": "teacher", "institution_id": 1}
    )
    headers_alan = {"Authorization": f"Bearer {alan_token}"}
    headers_ada = {"Authorization": f"Bearer {ada_token}"}

    # 1. Teacher can list fellow teachers via /users?role=teacher for substitute picker
    users_res = client.get("/api/v1/users?role=teacher", headers=headers_alan)
    assert users_res.status_code == 200, users_res.text
    teacher_emails = [u["email"] for u in users_res.json()]
    assert "ada@apex.edu" in teacher_emails

    # 2. Before substitution, Ada does NOT have access to Deep Learning (subject 101)
    ada_subs_before = client.get("/api/v1/subjects", headers=headers_ada)
    assert ada_subs_before.status_code == 200
    assert not any(s["id"] == 101 for s in ada_subs_before.json())

    # 3. Alan delegates today's class to Dr. Ada Lovelace
    ist_today_iso = datetime.now(timezone(timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    sub_res = client.post(
        "/api/v1/calendar/substitute",
        headers=headers_alan,
        json={
            "subject_id": 101,
            "substitute_teacher_id": 3,
            "date": ist_today_iso,
            "reason": "Academic jury panel duty"
        }
    )
    assert sub_res.status_code == 200, sub_res.text
    sub_event_id = sub_res.json()["id"]

    # 4. Ada now sees Deep Learning in /subjects AND can mark manual attendance & view sessions-history
    ada_subs_after = client.get("/api/v1/subjects", headers=headers_ada)
    assert ada_subs_after.status_code == 200
    assert any(s["id"] == 101 for s in ada_subs_after.json())

    hist_res = client.get("/api/v1/attendance/sessions-history?subject_id=101", headers=headers_ada)
    assert hist_res.status_code == 200, hist_res.text

    manual_res = client.post(
        "/api/v1/attendance/manual",
        headers=headers_ada,
        json={
            "records": [{
                "student_id": 501,
                "attendance_status": "Present",
                "subject_id": 101,
                "custom_date": ist_today_iso
            }]
        }
    )
    assert manual_res.status_code == 200, manual_res.text
    assert manual_res.json().get("success_count") == 1, manual_res.json()

    # 5. Deleting substitution event revokes active SubstituteAssignment
    del_res = client.delete(f"/api/v1/calendar/events/{sub_event_id}", headers=headers_alan)
    assert del_res.status_code == 200
    ada_subs_revoked = client.get("/api/v1/subjects", headers=headers_ada)
    assert not any(s["id"] == 101 for s in ada_subs_revoked.json())
    hist_revoked = client.get("/api/v1/attendance/sessions-history?subject_id=101", headers=headers_ada)
    assert hist_revoked.status_code == 403
    denied_res = client.post(
        "/api/v1/attendance/manual",
        headers=headers_ada,
        json={
            "records": [{
                "student_id": 501,
                "attendance_status": "Present",
                "subject_id": 101,
                "custom_date": ist_today_iso
            }]
        }
    )
    assert denied_res.status_code == 200
    assert denied_res.json().get("success_count") == 0
    assert denied_res.json().get("fail_count") == 1
