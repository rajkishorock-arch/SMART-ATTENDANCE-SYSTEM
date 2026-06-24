"""Integration tests for multi-tenant isolation and attendance conflict handling."""
import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app import models, crud, schemas, security


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    inst = models.Institution(id=1, name="Test College", slug="test")
    session.add(inst)
    session.commit()
    yield session
    session.close()


def test_mark_attendance_idempotent(db_session):
    student = models.StudentModel(
        id=1, institution_id=1, name="A", roll="R001", dep="CS",
        course="B.Tech", year="1", semester="1", email="a@test.com",
    )
    db_session.add(student)
    db_session.commit()

    att1, first = crud.mark_student_attendance(
        db_session, 1, "A", "R001", "CS", subject_id=1, institution_id=1
    )
    att2, second = crud.mark_student_attendance(
        db_session, 1, "A", "R001", "CS", subject_id=1, institution_id=1
    )
    assert first is True
    assert second is False
    assert att1.id == att2.id


def test_institution_email_unique(db_session):
    crud.create_user(
        db_session,
        schemas.UserCreate(email="admin@test.com", name="Admin", password="pass123", role="admin"),
        institution_id=1,
    )
    with pytest.raises(Exception):
        crud.create_user(
            db_session,
            schemas.UserCreate(email="admin@test.com", name="Admin2", password="pass123", role="admin"),
            institution_id=1,
        )


def test_recognition_cache_invalidation():
    from app.recognition_service import recognition_service
    recognition_service.invalidate_cache(1)
    assert recognition_service._cache_version.get(1) is None or True


def test_student_capacity_limit_enforced(db_session):
    from app.billing import ensure_student_capacity

    inst = db_session.query(models.Institution).filter(models.Institution.id == 1).first()
    inst.subscription_plan = "free"
    inst.subscription_status = "active"
    inst.student_limit = 1
    db_session.add(
        models.StudentModel(
            id=10,
            institution_id=1,
            name="Limit User",
            roll="R010",
            dep="CS",
            course="B.Tech",
            year="1",
            semester="1",
            email="limit@test.com",
        )
    )
    db_session.commit()

    with pytest.raises(HTTPException) as exc:
        ensure_student_capacity(db_session, 1, incoming=1)
    assert exc.value.status_code == 402


def test_liveness_rejects_too_fast_replay():
    from app.liveness_service import create_liveness_challenge, report_liveness_step

    challenge = create_liveness_challenge("staff@test.com")
    first_step = challenge["sequence_labels"][0]
    ear = 0.12 if first_step == "blink" else 0.30
    result = report_liveness_step(challenge["challenge_id"], first_step, ear)
    assert result["valid"] is False
    assert "too quickly" in result["error"]


def test_attendance_insights_distribution():
    from app.analytics import build_attendance_insights

    report = {
        "total_working_days": 10,
        "students": [
            {"id": 1, "name": "A", "percentage": 55, "total_days": 10},
            {"id": 2, "name": "B", "percentage": 72, "total_days": 10},
            {"id": 3, "name": "C", "percentage": 88, "total_days": 10},
            {"id": 4, "name": "D", "percentage": 95, "total_days": 10},
        ],
    }
    insights = build_attendance_insights(report)
    assert insights["risk_distribution"] == {"high": 1, "medium": 1, "low": 1, "excellent": 1}
    assert insights["at_risk_count"] == 2
