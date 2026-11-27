"""
Tests for Complete Feedback & Admin Review Workflow + Health/Latency Middleware Optimizations.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import database, models, security, health
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
def feedback_env(monkeypatch):
    monkeypatch.setattr(database, "engine", engine)
    monkeypatch.setattr(database, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(security, "PBKDF2_ITERATIONS", 1000)

    # Reset in-process health caches cleanly per test
    health._PUBLIC_HEALTH_CACHE["ts"] = 0.0
    health._PUBLIC_HEALTH_CACHE["data"] = None
    health._DETAILED_HEALTH_CACHE["ts"] = 0.0
    health._DETAILED_HEALTH_CACHE["data"] = None
    health._MODEL_STATUS_CACHE["ts"] = 0.0
    health._MODEL_STATUS_CACHE["data"] = None

    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    for m in [models.NotificationModel, models.AuditLog, models.Feedback, models.StudentModel, models.User, models.Institution]:
        db.query(m).delete()
    db.commit()

    inst1 = models.Institution(id=1, name="Alpha Campus", slug="alpha", is_active=True)
    inst2 = models.Institution(id=2, name="Beta Campus", slug="beta", is_active=True)
    db.add_all([inst1, inst2])
    db.commit()

    admin1 = models.User(
        id=10,
        email="admin1@alpha.edu",
        name="Alpha Admin",
        password_hash=security.get_password_hash("Pass123!"),
        role="admin",
        institution_id=1,
        is_active=True,
    )
    teacher1 = models.User(
        id=11,
        email="teacher1@alpha.edu",
        name="Alpha Teacher",
        password_hash=security.get_password_hash("Pass123!"),
        role="teacher",
        institution_id=1,
        is_active=True,
    )
    admin2 = models.User(
        id=20,
        email="admin2@beta.edu",
        name="Beta Admin",
        password_hash=security.get_password_hash("Pass123!"),
        role="admin",
        institution_id=2,
        is_active=True,
    )
    student1 = models.StudentModel(
        id=101,
        email="student1@alpha.edu",
        name="Alice Alpha",
        roll="A101",
        dep="CSE",
        institution_id=1,
    )
    student2 = models.StudentModel(
        id=102,
        email="student2@alpha.edu",
        name="Bob Alpha",
        roll="A102",
        dep="CSE",
        institution_id=1,
    )
    db.add_all([admin1, teacher1, admin2, student1, student2])
    db.commit()

    tokens = {
        "admin1": security.create_access_token({"sub": "admin1@alpha.edu", "role": "admin", "institution_id": 1}),
        "teacher1": security.create_access_token({"sub": "teacher1@alpha.edu", "role": "teacher", "institution_id": 1}),
        "admin2": security.create_access_token({"sub": "admin2@beta.edu", "role": "admin", "institution_id": 2}),
        "student1": security.create_access_token({"sub": "student1@alpha.edu", "role": "student", "institution_id": 1}),
        "student2": security.create_access_token({"sub": "student2@alpha.edu", "role": "student", "institution_id": 1}),
    }

    yield db, tokens
    db.rollback()
    db.close()


@pytest.fixture
def client(feedback_env):
    db, tokens = feedback_env

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c, db, tokens
    app.dependency_overrides.clear()


def test_feedback_submission_review_and_mine_flow(client):
    c, db, tokens = client

    # Blank message rejected
    blank_res = c.post(
        "/api/v1/feedbacks/",
        headers={"Authorization": f"Bearer {tokens['student1']}"},
        json={"type": "suggestion", "rating": 5, "message": "   "},
    )
    assert blank_res.status_code == 400

    # Student 1 & Student 2 submit feedback
    res1 = c.post(
        "/api/v1/feedbacks/",
        headers={"Authorization": f"Bearer {tokens['student1']}"},
        json={"type": "bug", "rating": 4, "message": "Camera preview flickers slightly in low light."},
    )
    assert res1.status_code == 201
    fb1 = res1.json()
    assert fb1["status"] == "pending"
    assert fb1["admin_reply"] is None
    assert fb1["user_id"] == 101

    res2 = c.post(
        "/api/v1/feedbacks/",
        headers={"Authorization": f"Bearer {tokens['student2']}"},
        json={"type": "general", "rating": 5, "message": "Clean Golden Gate interface!"},
    )
    assert res2.status_code == 201
    fb2 = res2.json()

    # /feedbacks/mine only returns caller's own submissions
    mine1 = c.get("/api/v1/feedbacks/mine", headers={"Authorization": f"Bearer {tokens['student1']}"})
    assert mine1.status_code == 200
    assert [row["id"] for row in mine1.json()] == [fb1["id"]]

    # Teacher & Student cannot list all or review feedbacks
    assert c.get("/api/v1/feedbacks/", headers={"Authorization": f"Bearer {tokens['student1']}"}).status_code in (401, 403)
    assert c.get("/api/v1/feedbacks/", headers={"Authorization": f"Bearer {tokens['teacher1']}"}).status_code == 403
    assert c.put(
        f"/api/v1/feedbacks/{fb1['id']}/review",
        headers={"Authorization": f"Bearer {tokens['teacher1']}"},
        json={"status": "resolved", "admin_reply": "Not allowed"},
    ).status_code == 403

    # Cross-tenant admin cannot view or review Alpha's feedback
    assert c.get("/api/v1/feedbacks/", headers={"Authorization": f"Bearer {tokens['admin2']}"}).json() == []
    cross_res = c.put(
        f"/api/v1/feedbacks/{fb1['id']}/review",
        headers={"Authorization": f"Bearer {tokens['admin2']}"},
        json={"status": "resolved", "admin_reply": "Cross tenant edit"},
    )
    assert cross_res.status_code == 404

    # Invalid status rejected
    bad_status = c.put(
        f"/api/v1/feedbacks/{fb1['id']}/review",
        headers={"Authorization": f"Bearer {tokens['admin1']}"},
        json={"status": "ignored", "admin_reply": "Invalid"},
    )
    assert bad_status.status_code == 400

    # Admin reviews and resolves Student 1 feedback with reply
    rev_res = c.put(
        f"/api/v1/feedbacks/{fb1['id']}/review",
        headers={"Authorization": f"Bearer {tokens['admin1']}"},
        json={"status": "resolved", "admin_reply": "Adjusted exposure gain in latest scanner build."},
    )
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["status"] == "resolved"
    assert rev_data["admin_reply"] == "Adjusted exposure gain in latest scanner build."
    assert rev_data["reviewed_by"] == "Alpha Admin"
    assert rev_data["reviewed_at"] is not None

    # Author immediately sees Admin reply in /feedbacks/mine
    mine_after = c.get("/api/v1/feedbacks/mine", headers={"Authorization": f"Bearer {tokens['student1']}"}).json()
    assert len(mine_after) == 1
    assert mine_after[0]["status"] == "resolved"
    assert mine_after[0]["admin_reply"] == "Adjusted exposure gain in latest scanner build."

    # Author also gets a notification entry
    notifs = db.query(models.NotificationModel).filter(models.NotificationModel.recipient_email == "student1@alpha.edu").all()
    assert len(notifs) == 1
    assert "Resolved" in notifs[0].title

    # Admin list reflects updated feedback ordering and statuses
    all_fb = c.get("/api/v1/feedbacks/", headers={"Authorization": f"Bearer {tokens['admin1']}"}).json()
    statuses_by_id = {row["id"]: row["status"] for row in all_fb}
    assert statuses_by_id == {fb1["id"]: "resolved", fb2["id"]: "pending"}


def test_health_headers_and_redundant_query_elimination(client):
    c, db, tokens = client

    # CORS preflight / Origin header exposes X-Response-Time for browser telemetry
    res = c.get(
        "/api/v1/health/detailed",
        headers={
            "Authorization": f"Bearer {tokens['admin1']}",
            "Origin": "https://kgattendence.vercel.app",
        },
    )
    assert res.status_code == 200
    assert "x-response-time" in {k.lower() for k in res.headers.keys()}
    expose_hdr = res.headers.get("access-control-expose-headers", "").lower()
    assert "x-response-time" in expose_hdr

    # Ensure /detailed does not issue a redundant SELECT 1 query beyond get_current_user
    executed_sql = []

    def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
        executed_sql.append(statement.strip().upper())

    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        cached_res = c.get(
            "/api/v1/health/detailed",
            headers={"Authorization": f"Bearer {tokens['admin1']}"},
        )
        assert cached_res.status_code == 200
        assert not any(sql == "SELECT 1" for sql in executed_sql)
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)
