import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app import models, security

DB_FILE = "test_temp.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_FILE}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def test_db():
    # Remove existing db file if any
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except OSError:
            pass
            
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Truncate tables (just in case)
    db.query(models.User).delete()
    db.query(models.SystemSettings).delete()
    db.query(models.Institution).delete()
    db.commit()
    
    # Seed default institution and settings
    inst = models.Institution(id=1, name="Default Inst", slug="default", master_key="dev_master_raj_9211_secure")
    db.add(inst)
    
    # Seed a secondary institution for non-owner login tests
    inst2 = models.Institution(id=2, name="Other Inst", slug="other", master_key="other_key")
    db.add(inst2)
    db.commit()
    
    settings = models.SystemSettings(
        id=1,
        institution_id=1,
        latest_version="1.0.1",
        update_download_url="https://example.com/app.apk",
        update_active=True
    )
    db.add(settings)
    
    # Create Owner User in Default Institution
    owner_pwd_hash = security.get_password_hash("securepass")
    owner = models.User(
        id=1,
        email="rajkishorock@gmail.com",
        name="Owner",
        password_hash=owner_pwd_hash,
        role="admin",
        institution_id=1
    )
    db.add(owner)
    
    # Create Regular User in Secondary Institution
    regular_pwd_hash = security.get_password_hash("regularpass")
    regular = models.User(
        id=2,
        email="other@gmail.com",
        name="Other Admin",
        password_hash=regular_pwd_hash,
        role="admin",
        institution_id=2
    )
    db.add(regular)
    
    db.commit()
    yield db
    db.close()
    Base.metadata.drop_all(bind=engine)
    
    # Cleanup DB file
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except OSError:
            pass

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

def test_get_update_check(client):
    response = client.get("/api/v1/health/update-check?client_version=1.0.0")
    assert response.status_code == 200
    data = response.json()
    assert data["latest_version"] == "1.0.1"
    assert data["update_download_url"] == "https://example.com/app.apk"
    assert data["update_available"] is True

    newer_client = client.get("/api/v1/health/update-check?client_version=1.0.2")
    assert newer_client.status_code == 200
    newer_data = newer_client.json()
    assert newer_data["update_available"] is False

def test_release_update_unauthorized_user(client):
    # Authenticate as other@gmail.com (tenant 'other')
    login_resp = client.post(
        "/api/v1/auth/token",
        data={"username": "other@gmail.com", "password": "regularpass"},
        headers={"X-Tenant-Slug": "other"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    
    # Attempt update release
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "master_password": "dev_master_raj_9211_secure",
        "latest_version": "1.0.2",
        "update_download_url": "https://example.com/app-v2.apk"
    }
    response = client.post("/api/v1/settings/release-update", json=payload, headers=headers)
    assert response.status_code == 403
    assert "Only the System Owner" in response.json()["detail"]

def test_release_update_invalid_master_password(client):
    # Authenticate as rajkishorock@gmail.com
    login_resp = client.post("/api/v1/auth/token", data={"username": "rajkishorock@gmail.com", "password": "securepass"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    
    # Attempt update release with invalid master password
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "master_password": "wrong_password",
        "latest_version": "1.0.2",
        "update_download_url": "https://example.com/app-v2.apk"
    }
    response = client.post("/api/v1/settings/release-update", json=payload, headers=headers)
    assert response.status_code == 400
    assert "Incorrect master password" in response.json()["detail"]

def test_release_update_success(client):
    # Authenticate as rajkishorock@gmail.com
    login_resp = client.post("/api/v1/auth/token", data={"username": "rajkishorock@gmail.com", "password": "securepass"})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    
    # Publish release
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "master_password": "dev_master_raj_9211_secure",
        "latest_version": "1.0.2",
        "update_download_url": "https://example.com/app-v2.apk"
    }
    response = client.post("/api/v1/settings/release-update", json=payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify update-check returns new values
    check_resp = client.get("/api/v1/health/update-check")
    assert check_resp.status_code == 200
    check_data = check_resp.json()
    assert check_data["latest_version"] == "1.0.2"
    assert check_data["update_download_url"] == "https://example.com/app-v2.apk"
