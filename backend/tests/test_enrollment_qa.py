import pytest
import io
import cv2
import numpy as np
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

    # 1. Create Institution
    inst = models.Institution(
        id=1,
        name="Biometric Science Academy",
        slug="bsa",
        is_active=True
    )
    db.add(inst)

    # 2. Create Student
    student = models.StudentModel(
        id=55,
        institution_id=1,
        name="Rohan Mehra",
        roll="2026BSA055",
        dep="CSE",
        email="rohan@bsa.edu",
        password_hash=security.get_password_hash("pass55")
    )
    db.add(student)

    # 3. Create Admin
    admin = models.User(
        id=1,
        institution_id=1,
        name="Security Admin",
        email="admin@bsa.edu",
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


def _make_test_image(mean_val=128, sharp=True):
    """Creates synthetic JPEG bytes for QA testing."""
    img = np.ones((200, 200, 3), dtype=np.uint8) * mean_val
    if sharp:
        # Add high-frequency checkerboard / gradient to give high Laplacian variance
        cv2.rectangle(img, (20, 20), (180, 180), (0, 0, 0), -1)
        cv2.circle(img, (100, 100), 40, (255, 255, 255), -1)
        cv2.putText(img, "TEST", (30, 110), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (120, 120, 120), 2)
    _, encoded = cv2.imencode(".jpg", img)
    return io.BytesIO(encoded.tobytes())


def test_validate_enrollment_sample_quality(client):
    token = security.create_access_token(
        data={"sub": "admin@bsa.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test normal sharp image with balanced illumination
    sharp_img = _make_test_image(mean_val=128, sharp=True)
    res = client.post(
        "/api/v1/enrollment/validate-sample",
        headers=headers,
        files={"file": ("sharp.jpg", sharp_img, "image/jpeg")}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["blur_score"] > 75.0
    assert data["is_blurry"] is False
    assert data["is_illumination_good"] is True

    # 2. Test pitch black image (illumination failure)
    dark_img = _make_test_image(mean_val=5, sharp=False)
    dark_res = client.post(
        "/api/v1/enrollment/validate-sample",
        headers=headers,
        files={"file": ("dark.jpg", dark_img, "image/jpeg")}
    )
    assert dark_res.status_code == 200
    dark_data = dark_res.json()
    assert dark_data["is_valid"] is False
    assert "too dark" in dark_data["feedback_message"]


def test_save_and_retrieve_face_sample(client):
    token = security.create_access_token(
        data={"sub": "admin@bsa.edu", "role": "admin", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Save FRONT sample
    front_img = _make_test_image(128, True)
    res_front = client.post(
        "/api/v1/enrollment/save-sample",
        headers=headers,
        data={"student_id": 55, "pose": "FRONT"},
        files={"file": ("front.jpg", front_img, "image/jpeg")}
    )
    assert res_front.status_code == 200, res_front.text
    assert res_front.json()["pose"] == "FRONT"

    # Save LEFT profile sample
    left_img = _make_test_image(128, True)
    res_left = client.post(
        "/api/v1/enrollment/save-sample",
        headers=headers,
        data={"student_id": 55, "pose": "LEFT"},
        files={"file": ("left.jpg", left_img, "image/jpeg")}
    )
    assert res_left.status_code == 200
    assert res_left.json()["pose"] == "LEFT"

    # Retrieve samples
    get_res = client.get("/api/v1/enrollment/samples/55", headers=headers)
    assert get_res.status_code == 200
    samples = get_res.json()
    assert len(samples) == 2
    poses = {s["pose"] for s in samples}
    assert "FRONT" in poses and "LEFT" in poses


def test_re_enrollment_request_workflow(client):
    token = security.create_access_token(
        data={"sub": "rohan@bsa.edu", "role": "student", "institution_id": 1}
    )
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/api/v1/enrollment/request-re-enrollment",
        headers=headers,
        json={
            "student_id": 55,
            "reason": "FACIAL_CHANGE",
            "description": "Student got new prescription glasses and changed hair style"
        }
    )
    assert res.status_code == 200, res.text
    req = res.json()
    assert req["status"] == "PENDING"
    assert req["student_name"] == "Rohan Mehra"
    assert req["reason"] == "FACIAL_CHANGE"
