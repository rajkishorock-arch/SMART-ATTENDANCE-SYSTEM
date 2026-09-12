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
        name="Institute of Technology",
        slug="iot",
        is_active=True
    )
    db.add(inst)

    # 2. Create Admin
    admin = models.User(
        id=1,
        institution_id=1,
        name="System Admin",
        email="admin@iot.edu",
        password_hash=security.get_password_hash("admin123"),
        role="admin",
        is_active=True
    )
    db.add(admin)

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


def test_register_and_list_devices(client):
    admin_token = security.create_access_token(
        data={"sub": "admin@iot.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Register a new kiosk
    reg_res = client.post(
        "/api/v1/devices/register",
        headers=headers,
        json={
            "device_identifier": "kiosk-gate-1",
            "name": "North Gate Face Scanner",
            "location": "Main Entrance Gate A",
            "device_type": "KIOSK",
            "app_version": "1.2.0"
        }
    )
    assert reg_res.status_code == 200, reg_res.text
    device_data = reg_res.json()
    assert device_data["device_identifier"] == "kiosk-gate-1"
    assert device_data["status"] == "ONLINE"
    assert device_data["is_online"] is True

    # 2. Duplicate registration attempt should be rejected (400)
    dup_res = client.post(
        "/api/v1/devices/register",
        headers=headers,
        json={
            "device_identifier": "kiosk-gate-1",
            "name": "Duplicate Scanner"
        }
    )
    assert dup_res.status_code == 400
    assert "already registered" in dup_res.json()["detail"]

    # 3. List devices
    list_res = client.get("/api/v1/devices", headers=headers)
    assert list_res.status_code == 200
    devices = list_res.json()
    assert len(devices) == 1
    assert devices[0]["device_identifier"] == "kiosk-gate-1"


def test_heartbeat_and_dynamic_offline_detection(client, test_db):
    admin_token = security.create_access_token(
        data={"sub": "admin@iot.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Register device
    client.post(
        "/api/v1/devices/register",
        headers=headers,
        json={
            "device_identifier": "kiosk-library-2",
            "name": "Library Checkpoint Kiosk",
            "location": "Library Floor 1"
        }
    )

    # Ingest Heartbeat
    hb_res = client.post(
        "/api/v1/devices/heartbeat",
        headers=headers,
        json={
            "device_identifier": "kiosk-library-2",
            "battery_level": 94.0,
            "camera_status": "OK",
            "network_latency_ms": 18.5,
            "pending_sync_count": 0,
            "app_version": "1.2.1"
        }
    )
    assert hb_res.status_code == 200, hb_res.text
    hb_data = hb_res.json()
    assert hb_data["battery_level"] == 94.0
    assert hb_data["network_latency_ms"] == 18.5
    assert hb_data["is_online"] is True

    # Simulate heartbeat timeout: set last_heartbeat to 15 minutes ago
    device = test_db.query(models.AttendanceDevice).filter_by(device_identifier="kiosk-library-2").first()
    device.last_heartbeat = datetime.now(timezone.utc) - timedelta(minutes=15)
    test_db.commit()

    # Query devices: should automatically transition to OFFLINE
    list_res = client.get("/api/v1/devices", headers=headers)
    assert list_res.status_code == 200
    updated_device = list_res.json()[0]
    assert updated_device["status"] == "OFFLINE"
    assert updated_device["is_online"] is False
    assert updated_device["minutes_since_heartbeat"] >= 14.0


def test_device_fleet_summary(client):
    admin_token = security.create_access_token(
        data={"sub": "admin@iot.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {admin_token}"}

    client.post(
        "/api/v1/devices/register",
        headers=headers,
        json={"device_identifier": "kiosk-lab-1", "name": "Robotics Lab Scanner"}
    )

    sum_res = client.get("/api/v1/devices/summary", headers=headers)
    assert sum_res.status_code == 200
    summary = sum_res.json()
    assert summary["total_devices"] >= 1
    assert summary["healthy_cameras"] >= 1
