"""
Feature 12: Fatigue/Drowsiness Detection
Tracks Eye Aspect Ratio (EAR) to detect student drowsiness during class.
Sends real-time alerts to teacher dashboard via WebSocket.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import cv2
import numpy as np

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()

EAR_THRESHOLD = 0.25   # Below this = drowsy
EAR_CONSEC_FRAMES = 3  # Consecutive frames below threshold = alert


def _compute_ear(eye_landmarks) -> float:
    """Compute Eye Aspect Ratio from 6 landmark points."""
    try:
        import math
        def dist(p1, p2):
            return math.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)
        A = dist(eye_landmarks[1], eye_landmarks[5])
        B = dist(eye_landmarks[2], eye_landmarks[4])
        C = dist(eye_landmarks[0], eye_landmarks[3])
        return (A + B) / (2.0 * C) if C > 0 else 0.3
    except Exception:
        return 0.3


def _detect_drowsiness(img: np.ndarray) -> dict:
    """
    Detect drowsiness using OpenCV face + eye detection.
    Returns EAR value and whether drowsy.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")

    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    if len(faces) == 0:
        return {"ear": None, "is_drowsy": False, "eyes_detected": 0, "face_detected": False}

    (fx, fy, fw, fh) = faces[0]
    face_roi = gray[fy:fy+fh, fx:fx+fw]
    eyes = eye_cascade.detectMultiScale(face_roi, 1.1, 5)
    eye_count = len(eyes)

    # Heuristic EAR from eye bounding box height/width ratio
    ear_values = []
    for (ex, ey, ew, eh) in eyes[:2]:
        ear = eh / ew if ew > 0 else 0.3
        ear_values.append(ear)

    avg_ear = sum(ear_values) / len(ear_values) if ear_values else 0.3
    is_drowsy = avg_ear < EAR_THRESHOLD or eye_count < 2

    return {
        "ear": round(avg_ear, 3),
        "is_drowsy": is_drowsy,
        "eyes_detected": eye_count,
        "face_detected": True,
    }


@router.post("/analyze")
async def analyze_fatigue(
    file: UploadFile = File(...),
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Analyze a frame for student drowsiness. Called every few seconds during class."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    result = _detect_drowsiness(img)

    # Log to DB
    log = models.FatigueLog(
        institution_id=current_user.institution_id,
        student_id=student_id,
        subject_id=subject_id,
        ear_value=result.get("ear"),
        is_drowsy=result["is_drowsy"],
        alert_sent=False,
    )
    db.add(log)
    db.commit()

    # Push WebSocket alert if drowsy
    if result["is_drowsy"] and student_id:
        student = db.query(models.StudentModel).filter(
            models.StudentModel.id == student_id
        ).first()
        if student:
            background_tasks.add_task(
                _push_drowsy_alert,
                current_user.institution_id,
                student.name,
                student.roll,
                result.get("ear", 0.0),
            )
            log.alert_sent = True
            db.commit()

    return {
        "ear": result.get("ear"),
        "is_drowsy": result["is_drowsy"],
        "eyes_detected": result.get("eyes_detected", 0),
        "face_detected": result.get("face_detected", False),
        "student_id": student_id,
        "alert_sent": result["is_drowsy"],
    }


async def _push_drowsy_alert(institution_id: int, name: str, roll: str, ear: float):
    try:
        from .websocket_sync import push_alert
        await push_alert(
            institution_id,
            alert_type="drowsiness_detected",
            message=f"Drowsiness alert: {name} (Roll: {roll}) may be sleeping. EAR: {ear:.3f}",
            severity="warning",
        )
    except Exception as e:
        print(f"Drowsy WebSocket alert failed: {e}")


@router.get("/logs")
def get_fatigue_logs(
    student_id: Optional[int] = None,
    drowsy_only: bool = False,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get fatigue/drowsiness logs for admin/teacher dashboard."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.FatigueLog).filter(
        models.FatigueLog.institution_id == current_user.institution_id
    )
    if student_id:
        query = query.filter(models.FatigueLog.student_id == student_id)
    if drowsy_only:
        query = query.filter(models.FatigueLog.is_drowsy == True)

    logs = query.order_by(models.FatigueLog.created_at.desc()).limit(limit).all()

    results = []
    for l in logs:
        s = db.query(models.StudentModel).filter(models.StudentModel.id == l.student_id).first() if l.student_id else None
        results.append({
            "id": l.id,
            "student_id": l.student_id,
            "student_name": s.name if s else None,
            "roll": s.roll if s else None,
            "ear_value": l.ear_value,
            "is_drowsy": l.is_drowsy,
            "alert_sent": l.alert_sent,
            "subject_id": l.subject_id,
            "created_at": l.created_at,
        })
    return results


@router.get("/analytics")
def get_fatigue_analytics(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Fatigue analytics: which students are most drowsy."""
    from sqlalchemy import func as sqlfunc
    from datetime import timedelta as td

    since = datetime.now(IST) - td(days=days)
    top_drowsy = (
        db.query(
            models.FatigueLog.student_id,
            sqlfunc.count(models.FatigueLog.id).label("drowsy_count"),
        )
        .filter(
            models.FatigueLog.institution_id == current_user.institution_id,
            models.FatigueLog.is_drowsy == True,
            models.FatigueLog.created_at >= since,
        )
        .group_by(models.FatigueLog.student_id)
        .order_by(sqlfunc.count(models.FatigueLog.id).desc())
        .limit(10)
        .all()
    )

    result = []
    for row in top_drowsy:
        s = db.query(models.StudentModel).filter(models.StudentModel.id == row.student_id).first()
        if s:
            result.append({"name": s.name, "roll": s.roll, "dep": s.dep, "drowsy_count": row.drowsy_count})

    return {"period_days": days, "top_drowsy_students": result}
