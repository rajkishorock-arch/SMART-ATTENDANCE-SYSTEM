"""
Multi-Subject Attendance, Department Aliasing, Liveness & Legacy Schema Migration Tests
Verifies:
1. Unassigned subjects (teacher_id=None) are visible via GET /api/v1/subjects and GET /api/v1/schedules works.
2. Multiple subjects can mark attendance for the same student on the same date and Period 1 (manual & face scan).
3. Department name/code aliasing works across subjects, manual register, sessions history, and recognize-frame; mismatches surface explicitly.
4. Manual register updates an existing face-scan attendance row in the same period without session_key collisions.
5. 2-step liveness challenge completes and integrates with recognize-frame.
6. Legacy SQLite attendence(id, time, date) PK migrates cleanly to surrogate record_id without losing rows.
"""
import cv2
import numpy as np
import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app import crud, database, models, security
from app.core import config, lifecycle
from app.database import Base, get_db
from app.main import app


SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def client_and_db(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    inst = models.Institution(id=1, name="Test Institute", slug="test-inst", is_active=True)
    db.add(inst)

    admin = models.User(
        id=1,
        institution_id=1,
        name="Admin User",
        email="admin@inst.edu",
        password_hash=security.get_password_hash("Admin@123"),
        role="admin",
        is_active=True,
    )
    teacher = models.User(
        id=2,
        institution_id=1,
        name="Prof. Rao",
        email="teacher@inst.edu",
        password_hash=security.get_password_hash("Teacher@123"),
        role="teacher",
        is_active=True,
    )
    student_user = models.User(
        id=3,
        institution_id=1,
        name="Rajkishor Rock",
        email="raj@inst.edu",
        password_hash=security.get_password_hash("Student@123"),
        role="student",
        is_active=True,
    )
    db.add_all([admin, teacher, student_user])

    dept_cs = models.Department(id=1, institution_id=1, name="Computer Science", code="CS")
    dept_iot = models.Department(id=2, institution_id=1, name="CSE(IOT)", code="CSE(IOT)")
    dept_ee = models.Department(id=3, institution_id=1, name="Electrical", code="EE")
    db.add_all([dept_cs, dept_iot, dept_ee])

    s1 = models.StudentModel(
        id=101,
        institution_id=1,
        name="Rajkishor Rock",
        roll="2365",
        dep="Computer Science",
        email="raj@inst.edu",
    )
    s2 = models.StudentModel(
        id=102,
        institution_id=1,
        name="Aarav Kumar",
        roll="6533",
        dep="CSE(IOT)",
        email="aarav@inst.edu",
    )
    db.add_all([s1, s2])
    db.commit()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    tokens = {
        "admin": security.create_access_token({"sub": "admin@inst.edu", "role": "admin", "institution_id": 1}),
        "teacher": security.create_access_token({"sub": "teacher@inst.edu", "role": "teacher", "institution_id": 1}),
        "student": security.create_access_token({"sub": "raj@inst.edu", "role": "student", "institution_id": 1}),
    }

    yield client, db, tokens

    app.dependency_overrides.clear()
    db.close()


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _dummy_jpeg_bytes() -> bytes:
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


def test_unassigned_subject_visibility_and_schedules_endpoint(client_and_db):
    client, db, tokens = client_and_db

    # Create unassigned subject using department code alias "CS"
    r1 = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "Algorithms", "code": "CS202", "department": "CS", "teacher_id": None},
    )
    assert r1.status_code == 201, r1.text
    sub1 = r1.json()
    assert sub1["teacher_id"] is None

    # Create teacher-assigned subject
    r2 = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "Networks", "code": "CS301", "department": "Computer Science", "teacher_id": 2},
    )
    assert r2.status_code == 201, r2.text

    # A historical subject can outlive its branch, but must disappear from active selectors.
    db.add(models.Subject(name="Legacy subject", code="OLD101", department="Removed branch", institution_id=1))
    db.commit()

    # Admin sees all institution subjects including teacher_id=None
    admin_subs = client.get("/api/v1/subjects", headers=_auth(tokens["admin"]))
    assert admin_subs.status_code == 200
    assert {s["code"] for s in admin_subs.json()} == {"CS202", "CS301"}

    # Student in "Computer Science" sees subjects stored with code alias "CS" and "Computer Science"
    student_subs = client.get("/api/v1/subjects", headers=_auth(tokens["student"]))
    assert student_subs.status_code == 200
    assert {s["code"] for s in student_subs.json()} == {"CS202", "CS301"}

    # Schedules GET route should not crash with NameError
    sched_res = client.get("/api/v1/schedules", headers=_auth(tokens["admin"]))
    assert sched_res.status_code == 200
    assert sched_res.json() == []

    # Fresh token login for teacher must return user.details.id and subject_name
    login_res = client.post(
        "/api/v1/auth/token",
        headers={"X-Tenant-Slug": "test-inst"},
        data={"username": "teacher@inst.edu", "password": "Teacher@123"},
    )
    assert login_res.status_code == 200, login_res.text
    login_user = login_res.json()["user"]
    assert login_user["details"]["id"] == 2
    assert login_user["details"]["subject_name"] == "Networks"


def test_manual_attendance_multiple_subjects_same_period_and_date(client_and_db):
    client, db, tokens = client_and_db

    sub1 = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "Discrete Math", "code": "IOT101", "department": "CSE(IOT)", "teacher_id": None},
    ).json()
    sub2 = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "jkj", "code": "101", "department": "CSE(IOT)", "teacher_id": None},
    ).json()

    payload_sub1 = {
        "records": [
            {
                "student_id": 102,
                "attendance_status": "Present",
                "subject_id": sub1["id"],
                "custom_date": "2026-11-26",
                "period": "Period 1",
            }
        ]
    }
    res1 = client.post("/api/v1/attendance/manual", headers=_auth(tokens["admin"]), json=payload_sub1)
    assert res1.status_code == 200, res1.text
    assert res1.json()["success_count"] == 1
    assert res1.json()["fail_count"] == 0

    # Mark attendance for newly added subject in the exact same Period 1 & date for the same student
    payload_sub2 = {
        "records": [
            {
                "student_id": 102,
                "attendance_status": "Absent",
                "subject_id": sub2["id"],
                "custom_date": "2026-11-26",
                "period": "Period 1",
            }
        ]
    }
    res2 = client.post("/api/v1/attendance/manual", headers=_auth(tokens["admin"]), json=payload_sub2)
    assert res2.status_code == 200, res2.text
    assert res2.json()["success_count"] == 1
    assert res2.json()["fail_count"] == 0
    assert res2.json()["errors"] == []

    rows = db.query(models.AttendanceModel).filter(models.AttendanceModel.id == "102").all()
    assert len(rows) == 2
    assert {r.subject_id for r in rows} == {sub1["id"], sub2["id"]}
    assert len({r.record_id for r in rows}) == 2

    # Sessions history must report both subjects independently with accurate present counts
    hist1 = client.get(
        f"/api/v1/attendance/sessions-history?subject_id={sub1['id']}&date=2026-11-26&period=Period%201",
        headers=_auth(tokens["admin"]),
    )
    hist2 = client.get(
        f"/api/v1/attendance/sessions-history?subject_id={sub2['id']}&date=2026-11-26&period=Period%201",
        headers=_auth(tokens["admin"]),
    )
    assert hist1.status_code == 200 and hist2.status_code == 200
    assert hist1.json()[0]["present_count"] == 1
    assert hist2.json()[0]["present_count"] == 0


def test_face_recognition_multi_subject_alias_mismatch_and_manual_update(client_and_db, monkeypatch):
    client, db, tokens = client_and_db

    sub1 = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "DSA", "code": "CS201", "department": "Computer Science", "teacher_id": None},
    ).json()
    sub2 = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "OS", "code": "CS301", "department": "CS", "teacher_id": None},
    ).json()
    sub_ee = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "Circuits", "code": "EE101", "department": "Electrical", "teacher_id": None},
    ).json()

    # Seed Period 1 for sub1 as Absent via manual register
    m_res = client.post(
        "/api/v1/attendance/manual",
        headers=_auth(tokens["admin"]),
        json={
            "records": [
                {
                    "student_id": 101,
                    "attendance_status": "Absent",
                    "subject_id": sub1["id"],
                    "custom_date": "2026-11-26",
                    "period": "Period 1",
                }
            ]
        },
    )
    assert m_res.status_code == 200 and m_res.json()["success_count"] == 1

    # Complete 2-step blink challenge to obtain a liveness_token
    ch_res = client.post("/api/v1/liveness/challenge", headers=_auth(tokens["admin"]))
    assert ch_res.status_code == 200
    challenge = ch_res.json()
    assert len(challenge["sequence_labels"]) == 2
    token = None
    for step_label in challenge["sequence_labels"]:
        ear_val = 0.16 if step_label == "blink" else 0.28
        step_res = client.post(
            "/api/v1/liveness/step",
            headers=_auth(tokens["admin"]),
            json={"challenge_id": challenge["challenge_id"], "step": step_label, "ear_value": ear_val},
        )
        assert step_res.status_code == 200
        body = step_res.json()
        assert body["valid"] is True
        if body.get("completed"):
            token = body.get("liveness_token")
    assert token

    # Mock recognition_service to avoid heavy model downloads in tests
    from app import attendance as attendance_router_mod

    monkeypatch.setattr(attendance_router_mod.recognition_service, "load_student_records", lambda *a, **kw: None)
    monkeypatch.setattr(
        attendance_router_mod.recognition_service,
        "recognize_faces_in_frame",
        lambda *a, **kw: (
            [
                {
                    "user_id": 101,
                    "name": "Rajkishor Rock",
                    "roll": "2365",
                    "dep": "Computer Science",
                    "box": [10, 10, 60, 60],
                    "confidence": 92.4,
                    "raw_score": 0.924,
                    "match_quality": "HIGH",
                }
            ],
            {"detect_ms": 1.0, "match_ms": 1.0, "server_total_ms": 2.0},
        ),
    )

    jpeg_bytes = _dummy_jpeg_bytes()

    # 1) Recognize for sub2 (department alias "CS") in exact same date & Period 1
    rf_sub2 = client.post(
        f"/api/v1/attendance/recognize-frame?subject_id={sub2['id']}&custom_date=2026-11-26&custom_time=Period%201&liveness_token={token}",
        headers=_auth(tokens["admin"]),
        files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert rf_sub2.status_code == 200, rf_sub2.text
    r_data2 = rf_sub2.json()["results"][0]
    assert r_data2["newly_marked"] is True

    # 2) Recognize for sub1 where manual register had Absent -> upgrades row to Present without IntegrityError
    rf_sub1 = client.post(
        f"/api/v1/attendance/recognize-frame?subject_id={sub1['id']}&custom_date=2026-11-26&custom_time=Period%201",
        headers=_auth(tokens["admin"]),
        files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert rf_sub1.status_code == 200, rf_sub1.text
    assert rf_sub1.json()["results"][0]["newly_marked"] is True
    sub1_row = (
        db.query(models.AttendanceModel)
        .filter(models.AttendanceModel.id == "101", models.AttendanceModel.subject_id == sub1["id"])
        .first()
    )
    assert sub1_row.attendance == "Present"

    # 3) Manual register updates sub2 face-scan row cleanly without idx_attendence_session_key conflict
    m_update = client.post(
        "/api/v1/attendance/manual",
        headers=_auth(tokens["admin"]),
        json={
            "records": [
                {
                    "student_id": 101,
                    "attendance_status": "Late",
                    "subject_id": sub2["id"],
                    "custom_date": "2026-11-26",
                    "period": "Period 1",
                }
            ]
        },
    )
    assert m_update.status_code == 200, m_update.text
    assert m_update.json()["success_count"] == 1
    assert m_update.json()["fail_count"] == 0
    sub2_row = (
        db.query(models.AttendanceModel)
        .filter(models.AttendanceModel.id == "101", models.AttendanceModel.subject_id == sub2["id"])
        .first()
    )
    assert sub2_row.attendance == "Late"

    # 4) Explicit branch_mismatch returned for EE subject instead of silent drop
    rf_ee = client.post(
        f"/api/v1/attendance/recognize-frame?subject_id={sub_ee['id']}&custom_date=2026-11-26&custom_time=Period%201",
        headers=_auth(tokens["admin"]),
        files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert rf_ee.status_code == 200, rf_ee.text
    ee_result = rf_ee.json()["results"][0]
    assert ee_result.get("branch_mismatch") is True
    assert "Branch mismatch" in ee_result.get("status", "")


def test_legacy_sqlite_attendance_pk_migration(tmp_path, monkeypatch):
    db_file = tmp_path / "legacy_attendance.db"
    legacy_engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False},
    )
    LegacySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=legacy_engine)

    # Create pre-fix attendence table with composite PK (id, time, date) and no record_id
    with legacy_engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE attendence (
                    id VARCHAR NOT NULL,
                    roll VARCHAR,
                    name VARCHAR,
                    department VARCHAR,
                    time VARCHAR NOT NULL,
                    date VARCHAR NOT NULL,
                    attendance VARCHAR,
                    subject_id INTEGER,
                    session_key VARCHAR,
                    remarks VARCHAR,
                    marked_by VARCHAR,
                    institution_id INTEGER DEFAULT 1,
                    PRIMARY KEY (id, time, date)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO attendence (id, roll, name, department, time, date, attendance, subject_id, session_key, institution_id)
                VALUES ('101', '2365', 'Rajkishor Rock', 'CSE(IOT)', 'Period 1', '26/11/2026', 'Present', 1, '1|101|26/11/2026|Period 1|1', 1)
                """
            )
        )

    monkeypatch.setattr(database, "engine", legacy_engine)
    monkeypatch.setattr(database, "SessionLocal", LegacySessionLocal)
    monkeypatch.setattr(lifecycle, "engine", legacy_engine)
    monkeypatch.setattr(lifecycle, "SessionLocal", LegacySessionLocal)

    lifecycle.update_schema()

    pk = inspect(legacy_engine).get_pk_constraint("attendence")
    assert pk["constrained_columns"] == ["record_id"]

    # Existing row is preserved AND inserting same (id, time, date) for another subject succeeds
    with legacy_engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO attendence (id, roll, name, department, time, date, attendance, subject_id, session_key, institution_id)
                VALUES ('101', '2365', 'Rajkishor Rock', 'CSE(IOT)', 'Period 1', '26/11/2026', 'Absent', 2, '1|101|26/11/2026|Period 1|2', 1)
                """
            )
        )
        rows = conn.execute(text("SELECT record_id, subject_id, attendance FROM attendence ORDER BY subject_id")).fetchall()

    assert len(rows) == 2
    assert [(r[1], r[2]) for r in rows] == [(1, "Present"), (2, "Absent")]
    assert rows[0][0] != rows[1][0]
    legacy_engine.dispose()


def test_recognize_frame_calibrated_confidence_and_diagnostics(client_and_db, monkeypatch):
    client, db, tokens = client_and_db

    sub = client.post(
        "/api/v1/subjects",
        headers=_auth(tokens["admin"]),
        json={"name": "Vision", "code": "CS401", "department": "Computer Science", "teacher_id": None},
    ).json()

    # Enable confidence_filter with UI default similarity=0.92
    pol_res = client.put(
        "/api/v1/settings/campus-policy",
        headers=_auth(tokens["admin"]),
        json={"confidence_filter": True, "similarity": 0.92},
    )
    assert pol_res.status_code == 200, pol_res.text

    from app import attendance as attendance_router_mod

    monkeypatch.setattr(attendance_router_mod.recognition_service, "load_student_records", lambda *a, **kw: None)
    jpeg_bytes = _dummy_jpeg_bytes()

    # 1) Empty results with 0 enrolled students surfaces no_enrolled_faces diagnostic
    monkeypatch.setattr(
        attendance_router_mod.recognition_service,
        "recognize_faces_in_frame",
        lambda *a, **kw: ([], {"detect_ms": 1.0, "match_ms": 0.0, "enrolled_count": 0, "faces_detected": 0, "total_ms": 1.0}),
    )
    r_empty = client.post(
        f"/api/v1/attendance/recognize-frame?subject_id={sub['id']}&custom_date=2026-11-26&custom_time=Period%201",
        headers=_auth(tokens["admin"]),
        files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert r_empty.status_code == 200
    assert r_empty.json()["diagnostic_reason"] == "no_enrolled_faces"

    # 2) Valid SFace cosine score 0.48 (typical webcam + glasses) passes calibrated 0.92 filter without false rejection
    monkeypatch.setattr(
        attendance_router_mod.recognition_service,
        "recognize_faces_in_frame",
        lambda *a, **kw: (
            [
                {
                    "user_id": 101,
                    "name": "Rajkishor Rock",
                    "roll": "2365",
                    "dep": "Computer Science",
                    "box": [12, 12, 64, 64],
                    "confidence": 48.0,
                    "raw_score": 0.48,
                    "match_quality": "HIGH",
                }
            ],
            {"detect_ms": 1.0, "match_ms": 1.0, "enrolled_count": 1, "faces_detected": 1, "total_ms": 2.0},
        ),
    )
    r_match = client.post(
        f"/api/v1/attendance/recognize-frame?subject_id={sub['id']}&custom_date=2026-11-26&custom_time=Period%201",
        headers=_auth(tokens["admin"]),
        files={"file": ("frame.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert r_match.status_code == 200, r_match.text
    res_item = r_match.json()["results"][0]
    assert res_item["newly_marked"] is True
    assert not res_item.get("staged_for_review")


def test_recognition_service_low_light_detector_fallback_and_cache_refresh(monkeypatch):
    import json
    from app.recognition_service import RecognitionService
    from app.encryption_service import encrypt_embedding
    from app import models

    db = TestingSessionLocal()
    try:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db.add(models.Institution(id=1, name="Test", slug="test", is_active=True))
        vec = np.ones(128, dtype=np.float32)
        vec /= np.linalg.norm(vec)
        s1 = models.StudentModel(
            id=201,
            institution_id=1,
            name="Dim Light Student",
            roll="DL201",
            dep="CSE",
            email="dl@test.com",
            face_embedding=encrypt_embedding(json.dumps(vec.tolist())),
        )
        db.add(s1)
        db.commit()

        svc = RecognitionService.__new__(RecognitionService)
        svc.student_records = {}
        svc._institution_matrices = {}
        svc._cache_version = {}

        class StrictMissDetector:
            def setInputSize(self, sz):
                pass
            def detect(self, img):
                return False, None

        class LowLightHitDetector:
            def setInputSize(self, sz):
                pass
            def detect(self, img):
                face = np.array([[10, 10, 50, 50, 20, 25, 45, 25, 32, 35, 24, 48, 42, 48, 0.31]], dtype=np.float32)
                return True, face

        class StubRecognizer:
            def alignCrop(self, img, face):
                return np.zeros((112, 112, 3), dtype=np.uint8)
            def feature(self, aligned):
                return vec.reshape(1, 128)
            def match(self, f1, f2, metric):
                return 0.45

        svc.detector = StrictMissDetector()
        svc.low_light_detector = LowLightHitDetector()
        svc.recognizer = StubRecognizer()

        svc.load_student_records(db, institution_id=1)
        # Adding a second enrolled student directly (simulating another worker) invalidates stale cache automatically
        s2 = models.StudentModel(
            id=202,
            institution_id=1,
            name="Second Student",
            roll="DL202",
            dep="CSE",
            email="dl2@test.com",
            face_embedding=encrypt_embedding(json.dumps(vec.tolist())),
        )
        db.add(s2)
        db.commit()
        svc.load_student_records(db, institution_id=1)
        assert len(svc._institution_matrices[1]["students"]) == 2

        img = np.zeros((120, 120, 3), dtype=np.uint8)
        results, metrics = svc.recognize_faces_in_frame(img, institution_id=1, return_metrics=True)
        assert metrics["faces_detected"] == 1
        assert metrics["enrolled_count"] == 2
        assert len(results) == 1
        assert results[0]["match_quality"] == "HIGH"
    finally:
        db.close()
