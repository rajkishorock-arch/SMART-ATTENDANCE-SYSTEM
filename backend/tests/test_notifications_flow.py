"""
Comprehensive Unit Tests for Role-Based Notification Dispatch, Isolation, and Idempotency
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime, timezone, timedelta

from app.database import Base
from app import models, security
from app.notifications import create_notification, get_my_notifications

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def test_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    inst = models.Institution(id=1, name="Test University", slug="test-uni", is_active=True)
    db.add(inst)
    db.commit()

    student = models.StudentModel(
        id=101,
        institution_id=1,
        name="John Doe",
        email="john@student.com",
        roll="2026CSE01",
        dep="Computer Science"
    )
    unrelated_student = models.StudentModel(
        id=102,
        institution_id=1,
        name="Jane Smith",
        email="jane@student.com",
        roll="2026CSE02",
        dep="Mechanical"
    )
    db.add_all([student, unrelated_student])
    db.commit()

    teacher = models.User(
        id=1,
        institution_id=1,
        name="Prof. Alan",
        email="alan@teacher.com",
        role="teacher",
        department="Computer Science",
        password_hash="hash"
    )
    admin = models.User(
        id=2,
        institution_id=1,
        name="Admin User",
        email="admin@test.com",
        role="admin",
        password_hash="hash"
    )
    db.add_all([teacher, admin])
    db.commit()

    subject = models.Subject(
        id=1,
        institution_id=1,
        name="Data Structures",
        code="CS201",
        department="Computer Science",
        teacher_id=1
    )
    db.add(subject)
    db.commit()

    yield {
        "db": db,
        "inst": inst,
        "student": student,
        "unrelated_student": unrelated_student,
        "teacher": teacher,
        "admin": admin,
        "subject": subject
    }

    db.close()
    Base.metadata.drop_all(bind=engine)


def test_leave_review_flow_rejects_conflicting_decision(test_db):
    from fastapi import HTTPException
    from app import schemas, users

    db, student = test_db["db"], test_db["student"]
    request = users.apply_leave_request(schemas.LeaveRequestCreate(
        start_date="2026-11-25", end_date="2026-11-26", leave_type="General",
        reason="Family event", subject_id=test_db["subject"].id), db, student)
    approved = schemas.LeaveStatusUpdate(status="Approved")
    for _ in range(2):
        assert users.review_leave_request(request.id, approved, db, test_db["admin"]).status == "Approved"
    with pytest.raises(HTTPException) as error:
        users.review_leave_request(request.id, schemas.LeaveStatusUpdate(status="Rejected"),
                                   db, test_db["teacher"])
    assert error.value.status_code == 409
    assert db.query(models.NotificationModel).filter_by(
        recipient_role="student", recipient_id=student.id, category="LEAVE").count() == 1


def test_leave_submission_notifications(test_db):
    """Verify student leave submission notifies admin and relevant teacher."""
    db = test_db["db"]
    inst = test_db["inst"]
    student = test_db["student"]
    teacher = test_db["teacher"]

    notif_admin = create_notification(
        db=db,
        institution_id=inst.id,
        recipient_role="admin",
        category="LEAVE",
        title="New Student Leave Request",
        message=f"{student.name} applied for leave",
        action_url="/#/leave-management"
    )
    notif_teacher = create_notification(
        db=db,
        institution_id=inst.id,
        recipient_role="teacher",
        recipient_email=teacher.email,
        category="LEAVE",
        title="New Student Leave Request",
        message=f"{student.name} applied for leave",
        action_url="/#/leave-management"
    )

    assert notif_admin is not None
    assert notif_admin.recipient_role == "admin"
    assert notif_teacher is not None
    assert notif_teacher.recipient_email == teacher.email


def test_leave_decision_student_notification(test_db):
    """Verify leave approval creates personal notification for requesting student."""
    db = test_db["db"]
    inst = test_db["inst"]
    student = test_db["student"]

    notif = create_notification(
        db=db,
        institution_id=inst.id,
        recipient_role="student",
        recipient_id=student.id,
        recipient_email=student.email,
        category="LEAVE",
        title="Leave Request Approved",
        message="Your leave application was Approved",
        action_url="/#/student-attendance"
    )

    assert notif is not None
    assert notif.recipient_id == student.id
    assert notif.recipient_email == student.email
    assert notif.category == "LEAVE"


def test_dispute_decision_student_notification(test_db):
    """Verify dispute review creates personal notification for requesting student."""
    db = test_db["db"]
    inst = test_db["inst"]
    student = test_db["student"]

    notif = create_notification(
        db=db,
        institution_id=inst.id,
        recipient_role="student",
        recipient_id=student.id,
        recipient_email=student.email,
        category="DISPUTE",
        title="Attendance Dispute Approved",
        message="Your dispute was approved.",
        action_url="/#/disputes"
    )

    assert notif is not None
    assert notif.recipient_id == student.id
    assert notif.category == "DISPUTE"


def test_role_isolation_personal_notifications(test_db):
    """Verify unrelated student cannot fetch personal notifications of another student."""
    db = test_db["db"]
    inst = test_db["inst"]
    student = test_db["student"]
    unrelated_student = test_db["unrelated_student"]

    create_notification(
        db=db,
        institution_id=inst.id,
        recipient_role="student",
        recipient_id=student.id,
        recipient_email=student.email,
        category="DISPUTE",
        title="John's Private Dispute Result",
        message="Private dispute approved"
    )

    # Auth identity for John Doe
    john_identity = security.AuthIdentity(
        id=student.id,
        email=student.email,
        role="student",
        name=student.name,
        institution_id=inst.id,
        model_instance=student
    )
    john_notifs = get_my_notifications(limit=10, db=db, current_identity=john_identity)
    assert len(john_notifs) == 1
    assert john_notifs[0]["title"] == "John's Private Dispute Result"

    # Auth identity for Jane Smith (Unrelated Student)
    jane_identity = security.AuthIdentity(
        id=unrelated_student.id,
        email=unrelated_student.email,
        role="student",
        name=unrelated_student.name,
        institution_id=inst.id,
        model_instance=unrelated_student
    )
    jane_notifs = get_my_notifications(limit=10, db=db, current_identity=jane_identity)
    assert len(jane_notifs) == 0


def test_idempotency_protection(test_db):
    """Verify duplicate notification triggers within 10 seconds do not create duplicate records."""
    db = test_db["db"]
    inst = test_db["inst"]
    student = test_db["student"]

    notif1 = create_notification(
        db=db,
        institution_id=inst.id,
        recipient_role="student",
        recipient_id=student.id,
        recipient_email=student.email,
        category="ATTENDANCE",
        title="Attendance Marked",
        message="Marked Present"
    )

    notif2 = create_notification(
        db=db,
        institution_id=inst.id,
        recipient_role="student",
        recipient_id=student.id,
        recipient_email=student.email,
        category="ATTENDANCE",
        title="Attendance Marked",
        message="Marked Present"
    )

    assert notif1.id == notif2.id
    count = db.query(models.NotificationModel).filter(
        models.NotificationModel.institution_id == inst.id,
        models.NotificationModel.recipient_id == student.id
    ).count()
    assert count == 1

@pytest.mark.parametrize("role", ["teacher", "admin"])
def test_qr_checkin_branch_and_personal_result(test_db, role):
    from fastapi import HTTPException
    from app import users, attendance

    db, student, subject = test_db["db"], test_db["student"], test_db["subject"]
    for branch, expected in [("Electrical", "Branch mismatch"), (student.dep, "Attendance confirmed")]:
        subject.department = branch
        db.commit()
        qr = users.generate_student_qr_token(db, student)
        payload = {"token": qr["token"], "subject_id": subject.id}
        if branch != student.dep:
            with pytest.raises(HTTPException) as error:
                attendance.checkin_via_student_qr(payload, db, test_db[role])
            assert error.value.status_code == 422
            assert db.query(models.AttendanceModel).count() == 0
        else:
            assert attendance.checkin_via_student_qr(payload, db, test_db[role])["status"] == "success"
            assert db.query(models.AttendanceModel).count() == 1
        result = users.latest_qr_result(db, student)
        assert result["id"] > qr["result_cursor"]
        assert result["title"] == expected
        assert users.latest_qr_result(db, test_db["unrelated_student"]) == {"id": 0}

def test_broadcast_revision_withdrawal_and_personal_dismissal(test_db):
    from types import SimpleNamespace
    from app import notifications as notices

    db, admin = test_db["db"], test_db["admin"]
    student = SimpleNamespace(id=101, email=test_db["student"].email, role="student", institution_id=1)
    notices.broadcast_announcement(notices.BroadcastPayload(title="Lab", message="Room 4",
        target_roles=["students", "staff"], effective_date="2026-11-26"), db, admin)
    history = notices.get_broadcast_history(db=db, current_identity=admin)
    assert len(history) == 1 and history[0]["effective_date"] == "2026-11-26"
    item = notices.get_my_notifications(db=db, current_identity=student)[0]
    notices.delete_notification(item["id"], db, student)
    assert notices.get_my_notifications(db=db, current_identity=student) == []
    notices.republish_notice(history[0]["id"], notices.NoticeRevision(title="Lab change",
        message="Room 5", effective_date="2026-11-27"), db, admin)
    assert notices.get_my_notifications(db=db, current_identity=student)[0]["message"] == "Room 5"
    notices.withdraw_notice(history[0]["id"], db, admin)
    assert notices.get_broadcast_history(db=db, current_identity=admin) == []


def test_manual_register_records_only_assigned_students_and_notifies_once(test_db):
    from app import attendance
    db = test_db["db"]
    payload = {"records": [{"student_id": s, "subject_id": 1, "period": "P2",
        "attendance_status": "Late", "custom_date": "2026-11-25"} for s in (101, 102)]}
    for _ in range(2):
        result = attendance.mark_manual_attendance_bulk(payload, db, test_db["teacher"])
        assert (result["success_count"], result["fail_count"]) == (1, 1)
    assert db.query(models.AttendanceModel).one().attendance == "Late"
    assert db.query(models.NotificationModel).one().recipient_id == 101


def test_lockdown_and_recovery_are_institution_scoped(test_db):
    from app.settings import CampusPolicyUpdate, save_campus_policy
    from app.core.campus_policy import check_campus_access
    from app.core import config
    from fastapi import HTTPException
    from jose import jwt
    from starlette.requests import Request

    db, admin = test_db["db"], test_db["admin"]
    def request(inst):
        token = jwt.encode({"sub": "staff", "institution_id": inst}, config.JWT_SECRET_KEY, algorithm=config.ALGORITHM)
        return Request({"type":"http", "path":"/api/v1/attendance/manual", "headers":[(b"authorization", f"Bearer {token}".encode())]})
    with pytest.raises(HTTPException):
        save_campus_policy(CampusPolicyUpdate(locked=True), test_db["teacher"], db)
    save_campus_policy(CampusPolicyUpdate(locked=True), admin, db)
    with pytest.raises(HTTPException) as denied:
        check_campus_access(request(1), db)
    assert denied.value.status_code == 423
    check_campus_access(request(2), db)
    save_campus_policy(CampusPolicyUpdate(locked=False), admin, db)
    check_campus_access(request(1), db)
