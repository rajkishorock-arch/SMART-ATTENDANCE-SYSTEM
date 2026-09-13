import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models, crud
from app.database import Base

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create 2 students in MECH, 2 students in CSE
    s1 = models.StudentModel(id=1, name="Student Mech 1", roll="M01", dep="MECH", institution_id=1)
    s2 = models.StudentModel(id=2, name="Student Mech 2", roll="M02", dep="MECH", institution_id=1)
    s3 = models.StudentModel(id=3, name="Student CSE 1", roll="C01", dep="CSE", institution_id=1)
    s4 = models.StudentModel(id=4, name="Student CSE 2", roll="C02", dep="CSE", institution_id=1)
    session.add_all([s1, s2, s3, s4])
    session.commit()
    
    yield session
    
    session.close()
    Base.metadata.drop_all(bind=engine)

def test_admin_dashboard_stats_sees_all_students(db):
    # Admin calls get_dashboard_stats without department filters
    stats = crud.get_dashboard_stats(db, institution_id=1)
    assert stats["total_students"] == 4

def test_teacher_dashboard_stats_scoped_to_department(db):
    # Teacher in MECH calls get_dashboard_stats with departments=["MECH"]
    stats = crud.get_dashboard_stats(db, institution_id=1, departments=["MECH"])
    assert stats["total_students"] == 2

def test_teacher_dashboard_stats_scoped_to_cse(db):
    # Teacher in CSE calls get_dashboard_stats with departments=["CSE"]
    stats = crud.get_dashboard_stats(db, institution_id=1, departments=["CSE"])
    assert stats["total_students"] == 2
