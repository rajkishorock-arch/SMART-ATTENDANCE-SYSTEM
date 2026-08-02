"""
Feature 5: Exam Proctoring
Online exam face verification + cheating detection.
Detects: multiple faces, face mismatch, no face, gaze-away events.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import cv2
import numpy as np
import json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


# ── Proctoring Session Management ────────────────────────────────────────────

@router.get("/sessions")
def list_exam_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """List all exam sessions for the institution."""
    sessions = db.query(models.ExamSession).filter(
        models.ExamSession.institution_id == current_user.institution_id
    ).order_by(models.ExamSession.created_at.desc()).all()

    return [
        {
            "id": s.id,
            "name": s.name,
            "hall_name": s.hall_name,
            "subject_id": s.subject_id,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "is_active": s.is_active,
            "created_by": s.created_by,
            "created_at": s.created_at,
        }
        for s in sessions
    ]


@router.post("/sessions")
def create_exam_session(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Create a new exam proctoring session."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    session = models.ExamSession(
        institution_id=current_user.institution_id,
        name=payload.get("name", "Exam Session"),
        hall_name=payload.get("hall_name"),
        subject_id=payload.get("subject_id"),
        start_time=payload.get("start_time"),
        end_time=payload.get("end_time"),
        geofence_strict=payload.get("geofence_strict", True),
        is_active=payload.get("is_active", True),
        created_by=current_user.email,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Created exam session '{session.name}' (ID: {session.id})."
        ),
        institution_id=current_user.institution_id,
    )
    return {"message": "Exam session created.", "session_id": session.id}


@router.put("/sessions/{session_id}/toggle")
def toggle_exam_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Activate or deactivate an exam proctoring session."""
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")
    session = db.query(models.ExamSession).filter(
        models.ExamSession.id == session_id,
        models.ExamSession.institution_id == current_user.institution_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    session.is_active = not session.is_active
    db.commit()
    return {"session_id": session_id, "is_active": session.is_active}


# ── Live Proctoring Frame Check ───────────────────────────────────────────────

@router.post("/check-frame")
async def proctor_frame(
    file: UploadFile = File(...),
    session_id: int = 0,
    student_id: Optional[int] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    token: str = Depends(security.oauth2_scheme),
):
    """
    Students submit a webcam frame during exam.
    The system:
    1. Detects number of faces (multiple face = cheating alert)
    2. Verifies the student's identity against their enrolled embedding
    3. Logs the proctoring event
    """
    # Decode student token
    from jose import jwt, JWTError
    from .core import config as cfg
    try:
        payload = jwt.decode(token, cfg.JWT_SECRET_KEY, algorithms=[cfg.ALGORITHM])
        role = payload.get("role")
        institution_id = payload.get("institution_id")
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token.")

    # Students can self-proctor; teachers/admins can submit on behalf
    if role == "student":
        student = db.query(models.StudentModel).filter(
            models.StudentModel.email == email,
            models.StudentModel.institution_id == institution_id,
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")
        student_id = student.id
    elif student_id is None:
        raise HTTPException(status_code=400, detail="student_id required for staff proctoring.")
    else:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == student_id,
            models.StudentModel.institution_id == institution_id,
        ).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    # Face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    events = []
    severity = "info"

    if len(faces) == 0:
        events.append("no_face")
        severity = "warning"
    elif len(faces) > 1:
        events.append("multiple_faces")
        severity = "critical"
    else:
        events.append("face_detected")

    # Identity verification (if student has enrolled face embedding)
    identity_verified = False
    if student.face_embedding and len(faces) == 1:
        try:
            from .recognition_service import recognition_service
            from .encryption_service import decrypt_embedding
            import json as _json
            decrypted = decrypt_embedding(student.face_embedding)
            ref_emb = np.array(_json.loads(decrypted), dtype=np.float32).reshape(1, -1)

            recognition_service._load_models()
            if recognition_service.detector and recognition_service.recognizer:
                h, w = img.shape[:2]
                recognition_service.detector.setInputSize((w, h))
                retval, detected_faces = recognition_service.detector.detect(img)
                if retval and detected_faces is not None and len(detected_faces) > 0:
                    aligned = recognition_service.recognizer.alignCrop(img, detected_faces[0])
                    feat = recognition_service.recognizer.feature(aligned)
                    score = recognition_service.recognizer.match(feat, ref_emb, cv2.FaceRecognizerSF_FR_COSINE)
                    if score >= 0.43:
                        identity_verified = True
                        events.append("identity_verified")
                    else:
                        events.append("face_mismatch")
                        severity = "critical"
        except Exception as e:
            print(f"Proctoring identity check failed: {e}")

    # Log proctoring event
    for event_type in events:
        log = models.ExamProctorLog(
            institution_id=institution_id,
            session_id=session_id if session_id else None,
            student_id=student_id,
            event_type=event_type,
            severity=severity,
            details=f"Faces detected: {len(faces)}, Identity verified: {identity_verified}",
        )
        db.add(log)
    db.commit()

    # Push WebSocket alert for critical events
    if severity == "critical":
        background_tasks.add_task(
            _push_proctor_alert,
            institution_id,
            student.name,
            student.roll,
            events,
        )

    return {
        "face_count": len(faces),
        "identity_verified": identity_verified,
        "events": events,
        "severity": severity,
        "student_id": student_id,
        "student_name": student.name,
    }


async def _push_proctor_alert(institution_id: int, student_name: str, roll: str, events: list):
    try:
        from .websocket_sync import push_alert
        await push_alert(
            institution_id,
            alert_type="proctor_violation",
            message=f"Proctoring alert for {student_name} (Roll: {roll}): {', '.join(events)}",
            severity="critical",
        )
    except Exception as e:
        print(f"WebSocket proctor alert failed: {e}")


# ── Violation Logs ─────────────────────────────────────────────────────────

@router.get("/violations")
def get_proctor_violations(
    session_id: Optional[int] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get proctoring violation logs for a session."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.ExamProctorLog).filter(
        models.ExamProctorLog.institution_id == current_user.institution_id
    )
    if session_id:
        query = query.filter(models.ExamProctorLog.session_id == session_id)
    if severity:
        query = query.filter(models.ExamProctorLog.severity == severity)

    logs = query.order_by(models.ExamProctorLog.created_at.desc()).limit(200).all()
    results = []
    for l in logs:
        s = db.query(models.StudentModel).filter(models.StudentModel.id == l.student_id).first()
        results.append({
            "id": l.id,
            "student_id": l.student_id,
            "student_name": s.name if s else "Unknown",
            "roll": s.roll if s else "",
            "event_type": l.event_type,
            "severity": l.severity,
            "details": l.details,
            "created_at": l.created_at,
        })
    return results


@router.get("/stats/{session_id}")
def get_session_stats(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Aggregate proctoring statistics for an exam session."""
    from sqlalchemy import func as sqlfunc

    total_checks = db.query(models.ExamProctorLog).filter(
        models.ExamProctorLog.session_id == session_id,
        models.ExamProctorLog.institution_id == current_user.institution_id,
    ).count()

    violations = db.query(models.ExamProctorLog).filter(
        models.ExamProctorLog.session_id == session_id,
        models.ExamProctorLog.institution_id == current_user.institution_id,
        models.ExamProctorLog.severity.in_(["warning", "critical"]),
    ).count()

    # Students with most violations
    top_violators = (
        db.query(
            models.ExamProctorLog.student_id,
            sqlfunc.count(models.ExamProctorLog.id).label("vcount"),
        )
        .filter(
            models.ExamProctorLog.session_id == session_id,
            models.ExamProctorLog.severity == "critical",
        )
        .group_by(models.ExamProctorLog.student_id)
        .order_by(sqlfunc.count(models.ExamProctorLog.id).desc())
        .limit(5)
        .all()
    )

    violators = []
    for row in top_violators:
        s = db.query(models.StudentModel).filter(models.StudentModel.id == row.student_id).first()
        if s:
            violators.append({"name": s.name, "roll": s.roll, "violations": row.vcount})

    return {
        "session_id": session_id,
        "total_checks": total_checks,
        "total_violations": violations,
        "top_violators": violators,
    }
