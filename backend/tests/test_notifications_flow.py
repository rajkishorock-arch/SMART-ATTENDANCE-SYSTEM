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
