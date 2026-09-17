"""
Phase 10F Backend Fixes Regression & Hardening Test Suite
"""
import pytest
import numpy as np
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security, crud
from app.database import Base
from app.users import check_duplicate_face
from app.encryption_service import encrypt_embedding
from app.recognition_service import recognition_service

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    for m in [models.AttendanceModel, models.StudentModel, models.User, models.Institution]:
        try:
            session.query(m).delete()
        except Exception:
            pass
    session.commit()
    yield session
    session.close()


def test_check_duplicate_face_tenant_isolation(db):
    """
    Test that check_duplicate_face enforces tenant isolation and returns False when institution_id is None.
    """
    inst1 = models.Institution(id=101, name="Tenant A", slug="tenant-a")
    inst2 = models.Institution(id=102, name="Tenant B", slug="tenant-b")
    db.add_all([inst1, inst2])
    db.commit()

    raw_emb = [0.1] * 128
    enc_emb = encrypt_embedding(json.dumps(raw_emb))

    student_a = models.StudentModel(
        id=1001,
        name="Student A",
        roll="101",
        dep="CS",
        institution_id=inst1.id,
        face_embedding=enc_emb
    )
    db.add(student_a)
    db.commit()

    query_emb = np.array(raw_emb, dtype=np.float32)

    # 1. Matching within same institution (Tenant A) should return True
    assert check_duplicate_face(db, query_emb, institution_id=inst1.id) is True

    # 2. Matching within different institution (Tenant B) should return False (strict tenant isolation)
    assert check_duplicate_face(db, query_emb, institution_id=inst2.id) is False

    # 3. Matching with institution_id=None should return False (no cross-tenant leakage)
    assert check_duplicate_face(db, query_emb, institution_id=None) is False


def test_delete_student_invalidates_cache(db, monkeypatch):
    """
    Test that crud.delete_student evicts student from recognition_service in-memory cache.
    """
    inst = models.Institution(id=201, name="Cache Test Tenant", slug="cache-tenant")
    db.add(inst)
    db.commit()

    student = models.StudentModel(
        id=2001,
        name="Student Cache Test",
        roll="201",
        dep="EE",
        institution_id=inst.id
    )
    db.add(student)
    db.commit()

    invalidated = []
    def mock_invalidate(inst_id):
        invalidated.append(inst_id)

    monkeypatch.setattr(recognition_service, "invalidate_cache", mock_invalidate)

    # Delete student
    res = crud.delete_student(db, student.id, institution_id=inst.id)
    assert res is True

    # Verify cache invalidation was triggered for target institution
    assert inst.id in invalidated


def test_check_duplicate_face_excludes_current_student(db):
    """
    Test that check_duplicate_face excludes current student ID when provided.
    """
    inst = models.Institution(id=301, name="Exclusion Tenant", slug="exclusion-tenant")
    db.add(inst)
    db.commit()

    raw_emb = [0.2] * 128
    enc_emb = encrypt_embedding(json.dumps(raw_emb))

    student = models.StudentModel(
        id=3001,
        name="Student Self",
        roll="301",
        dep="ME",
        institution_id=inst.id,
        face_embedding=enc_emb
    )
    db.add(student)
    db.commit()

    query_emb = np.array(raw_emb, dtype=np.float32)

    # When excluding current student's ID, duplicate check should return False
    assert check_duplicate_face(db, query_emb, exclude_student_id=student.id, institution_id=inst.id) is False

    # When not excluding current student's ID, duplicate check returns True
    assert check_duplicate_face(db, query_emb, exclude_student_id=None, institution_id=inst.id) is True
