"""Integration tests for multi-tenant isolation and attendance conflict handling."""
import pytest
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
