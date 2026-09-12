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
    inst = models.Institution(id=1, name="Global Polytechnic Institute", slug="gpi", is_active=True)
    db.add(inst)

    # 2. Admin
    admin = models.User(
        id=1, institution_id=1, name="System Admin", email="admin@gpi.edu",
        password_hash=security.get_password_hash("admin123"), role="admin", is_active=True
    )
    db.add(admin)

    # 3. Students
    s1 = models.StudentModel(id=1, institution_id=1, name="Anita Desai", roll="GPI2601", dep="IT", email="anita@gpi.edu", password_hash=security.get_password_hash("p1"))
    s2 = models.StudentModel(id=2, institution_id=1, name="Bikram Sen", roll="GPI2602", dep="IT", email="bikram@gpi.edu", password_hash=security.get_password_hash("p2"))
    db.add_all([s1, s2])

    # 4. Attendance
    a1 = models.AttendanceModel(id="gpi_1", institution_id=1, roll="GPI2601", name="Anita", time="09:00", date="10/01/2026", attendance="Present")
    a2 = models.AttendanceModel(id="gpi_2", institution_id=1, roll="GPI2602", name="Bikram", time="09:00", date="10/01/2026", attendance="Present")
    db.add_all([a1, a2])

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


def test_configure_lms_provider(client):
    token = security.create_access_token(
        data={"sub": "admin@gpi.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    cfg_res = client.post(
        "/api/v1/lms/config",
        headers=headers,
        json={
            "provider": "CANVAS",
            "api_endpoint": "https://canvas.gpi.edu/api/v1",
            "api_token": "canvas_secret_token_12345",
            "sync_schedule_cron": "0 22 * * *",
            "auto_sync_enabled": True
        }
    )
    assert cfg_res.status_code == 200, cfg_res.text
    cfg = cfg_res.json()
    assert cfg["provider"] == "CANVAS"
    assert cfg["api_endpoint"] == "https://canvas.gpi.edu/api/v1"
    assert cfg["auto_sync_enabled"] is True

    # Retrieve config
    get_res = client.get("/api/v1/lms/config", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["provider"] == "CANVAS"


def test_outbound_attendance_sync(client, test_db):
    token = security.create_access_token(
        data={"sub": "admin@gpi.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    sync_res = client.post("/api/v1/lms/sync-attendance", headers=headers)
    assert sync_res.status_code == 200, sync_res.text
    sync_data = sync_res.json()
    assert sync_data["status"] == "SUCCESS"
    assert sync_data["job_type"] == "OUTBOUND_ATTENDANCE"
    assert sync_data["records_processed"] == 2

    # Check logs
    logs_res = client.get("/api/v1/lms/logs", headers=headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 1
    assert logs[0]["job_type"] == "OUTBOUND_ATTENDANCE"
    assert logs[0]["records_processed"] == 2


def test_inbound_roster_sync(client):
    token = security.create_access_token(
        data={"sub": "admin@gpi.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    roster_res = client.post("/api/v1/lms/sync-roster", headers=headers)
    assert roster_res.status_code == 200, roster_res.text
    roster_data = roster_res.json()
    assert roster_data["status"] == "SUCCESS"
    assert roster_data["job_type"] == "INBOUND_ROSTER"
    assert roster_data["records_processed"] == 2
