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

    # 1. Institution
    inst = models.Institution(id=1, name="Metropolitan Institute of Technology", slug="mit", is_active=True)
    db.add(inst)

    # 2. Admin
    admin = models.User(
        id=1, institution_id=1, name="Dean Evans", email="dean@mit.edu",
        password_hash=security.get_password_hash("admin123"), role="admin", is_active=True
    )
    # 3. Staff Teacher
    teacher = models.User(
        id=2, institution_id=1, name="Prof. Grace Hopper", email="grace@mit.edu",
        password_hash=security.get_password_hash("teacher123"), role="teacher", is_active=True
    )
    db.add_all([admin, teacher])

    # 4. Populate 10 present days for teacher in 02/2026
    for day in range(1, 11):
        db.add(models.StaffAttendance(
            institution_id=1,
            user_id=2,
            date=f"{day:02d}/02/2026",
            check_in="09:00",
            check_out="17:00",
            hours_worked=8.0,
            status="PRESENT"
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


def test_staff_check_in_and_check_out_hours(client):
    token = security.create_access_token(
        data={"sub": "grace@mit.edu", "role": "teacher", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Check in
    in_res = client.post("/api/v1/staff/check-in", headers=headers)
    assert in_res.status_code == 200, in_res.text
    in_data = in_res.json()
    assert in_data["status"] == "PRESENT"
    assert in_data["check_in"] is not None

    # 2. Check out
    out_res = client.post("/api/v1/staff/check-out", headers=headers)
    assert out_res.status_code == 200, out_res.text
    out_data = out_res.json()
    assert out_data["check_out"] is not None
    assert out_data["hours_worked"] >= 0.0


def test_calculate_monthly_payroll_deductions(client):
    admin_token = security.create_access_token(
        data={"sub": "dean@mit.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 20 working days, base salary 60,000
    # Teacher has 10 present days, so 10 absent days = 50% deduction
    calc_res = client.post(
        "/api/v1/staff/payroll/calculate",
        headers=headers,
        json={
            "month_year": "02/2026",
            "working_days": 20,
            "default_base_salary": 60000.0
        }
    )
    assert calc_res.status_code == 200, calc_res.text
    records = calc_res.json()
    assert len(records) >= 1

    grace_rec = next(r for r in records if r["staff_email"] == "grace@mit.edu")
    assert grace_rec["days_present"] == 10
    assert grace_rec["days_absent"] == 10
    assert grace_rec["gross_salary"] == 60000.0
    # Daily rate: 60,000 / 20 = 3,000. 10 absent days = 30,000 deduction
    assert grace_rec["deductions"] == 30000.0
    assert grace_rec["net_salary"] == 30000.0
    assert grace_rec["status"] == "DRAFT"


def test_approve_payroll_record(client):
    admin_token = security.create_access_token(
        data={"sub": "dean@mit.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    calc_res = client.post(
        "/api/v1/staff/payroll/calculate",
        headers=headers,
        json={"month_year": "02/2026", "working_days": 20, "default_base_salary": 60000.0}
    )
    target_id = calc_res.json()[0]["id"]

    approve_res = client.post(f"/api/v1/staff/payroll/{target_id}/approve", headers=headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"
