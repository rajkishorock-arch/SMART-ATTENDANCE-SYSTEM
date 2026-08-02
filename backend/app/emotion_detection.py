"""
Feature 2: Emotion Detection
Detects student emotion during attendance scan using facial landmarks via MediaPipe/OpenCV.
Stores emotion logs and provides analytics per student and per class.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import cv2
import numpy as np

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _detect_emotion_from_frame(img: np.ndarray) -> dict:
    """
    Detect dominant emotion from a face image using OpenCV cascade + heuristics.
    For production, swap with a DeepFace / FER2013 model.
    Returns {"emotion": str, "confidence": float, "all_scores": dict}
    """
    try:
        # Try to use deepface if available
        from deepface import DeepFace
        result = DeepFace.analyze(img, actions=["emotion"], enforce_detection=False, silent=True)
        if isinstance(result, list):
            result = result[0]
        dominant = result.get("dominant_emotion", "neutral")
        emotions = result.get("emotion", {})
        confidence = emotions.get(dominant, 0.0)
        return {
            "emotion": dominant,
            "confidence": round(float(confidence), 2),
            "all_scores": {k: round(float(v), 2) for k, v in emotions.items()}
        }
    except ImportError:
        pass
    except Exception:
        pass

    # Fallback: Haar cascade + basic heuristic (no external model needed)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_smile.xml")

    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    if len(faces) == 0:
        return {"emotion": "neutral", "confidence": 0.5, "all_scores": {}}

    (x, y, w, h) = faces[0]
    face_roi = gray[y:y + h, x:x + w]

    smiles = smile_cascade.detectMultiScale(face_roi, scaleFactor=1.8, minNeighbors=20)
    if len(smiles) > 0:
        return {"emotion": "happy", "confidence": 0.75, "all_scores": {"happy": 0.75, "neutral": 0.25}}

    return {"emotion": "neutral", "confidence": 0.65, "all_scores": {"neutral": 0.65, "happy": 0.35}}


@router.post("/detect")
async def detect_emotion(
    file: UploadFile = File(...),
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    context: Optional[str] = "attendance",
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Detect emotion from uploaded webcam frame.
    Optionally log it against a student and subject for analytics.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image frame.")

    result = _detect_emotion_from_frame(img)

    # Persist to DB if student_id provided
    if student_id:
        log = models.EmotionLog(
            institution_id=current_user.institution_id,
            student_id=student_id,
            emotion=result["emotion"],
            confidence=result["confidence"],
            context=context,
        )
        db.add(log)
        db.commit()

        # Wellness alert: if student consistently sad/stressed, flag counselor
        background_tasks.add_task(
            _check_wellness_alert, db, student_id, current_user.institution_id, result["emotion"]
        )

    return {
        "emotion": result["emotion"],
        "confidence": result["confidence"],
        "all_scores": result["all_scores"],
        "student_id": student_id,
    }


def _check_wellness_alert(db: Session, student_id: int, institution_id: int, emotion: str):
    """Check last 5 emotion logs — if 4+ are negative, create wellness alert."""
    try:
        negative_emotions = {"sad", "angry", "fearful", "disgusted"}
        recent = (
            db.query(models.EmotionLog)
            .filter(
                models.EmotionLog.student_id == student_id,
                models.EmotionLog.institution_id == institution_id,
            )
            .order_by(models.EmotionLog.created_at.desc())
            .limit(5)
            .all()
        )
        negative_count = sum(1 for r in recent if r.emotion in negative_emotions)
        if negative_count >= 4:
            student = db.query(models.StudentModel).filter(
                models.StudentModel.id == student_id
            ).first()
            if student:
                crud.create_audit_log(
                    db,
                    log=schemas.AuditLogCreate(
                        user_email="system@emotion-ai",
                        action=f"[WELLNESS ALERT] Student '{student.name}' (Roll: {student.roll}) has shown negative emotions {negative_count}/5 times recently. Counselor review recommended.",
                    ),
                    institution_id=institution_id,
                )
    except Exception as e:
        print(f"Wellness alert check failed: {e}")


@router.get("/logs")
def get_emotion_logs(
    student_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get emotion logs for the institution, optionally filtered by student."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.EmotionLog).filter(
        models.EmotionLog.institution_id == current_user.institution_id
    )
    if student_id:
        query = query.filter(models.EmotionLog.student_id == student_id)

    logs = query.order_by(models.EmotionLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "student_id": l.student_id,
            "emotion": l.emotion,
            "confidence": l.confidence,
            "context": l.context,
            "created_at": l.created_at,
        }
        for l in logs
    ]


@router.get("/analytics")
def get_emotion_analytics(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Get aggregated emotion analytics for the institution over the past N days.
    Returns emotion distribution and top at-risk students.
    """
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    from sqlalchemy import func as sqlfunc
    since = datetime.now(IST) - timedelta(days=days)

    emotion_counts = (
        db.query(models.EmotionLog.emotion, sqlfunc.count(models.EmotionLog.id).label("count"))
        .filter(
            models.EmotionLog.institution_id == current_user.institution_id,
            models.EmotionLog.created_at >= since,
        )
        .group_by(models.EmotionLog.emotion)
        .all()
    )

    distribution = {row.emotion: row.count for row in emotion_counts}
    total = sum(distribution.values())

    # Students with most negative emotions
    negative_emotions = ("sad", "angry", "fearful", "disgusted")
    at_risk = (
        db.query(
            models.EmotionLog.student_id,
            sqlfunc.count(models.EmotionLog.id).label("neg_count"),
        )
        .filter(
            models.EmotionLog.institution_id == current_user.institution_id,
            models.EmotionLog.emotion.in_(negative_emotions),
            models.EmotionLog.created_at >= since,
        )
        .group_by(models.EmotionLog.student_id)
        .order_by(sqlfunc.count(models.EmotionLog.id).desc())
        .limit(10)
        .all()
    )

    at_risk_list = []
    for row in at_risk:
        s = db.query(models.StudentModel).filter(models.StudentModel.id == row.student_id).first()
        if s:
            at_risk_list.append({
                "student_id": s.id,
                "name": s.name,
                "roll": s.roll,
                "dep": s.dep,
                "negative_count": row.neg_count,
            })

    return {
        "period_days": days,
        "total_readings": total,
        "distribution": distribution,
        "at_risk_students": at_risk_list,
    }
