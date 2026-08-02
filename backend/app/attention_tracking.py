"""
Feature 13: Attention Tracking
Tracks student gaze direction and phone usage during class.
Computes per-student attention score and sends alerts to teacher.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import cv2
import numpy as np

from . import models, security
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _analyze_attention(img: np.ndarray) -> dict:
    """
    Analyze attention from a webcam frame.
    Detects gaze direction (forward/left/right/down) using nose-eye landmark ratios.
    Phone detection uses object size heuristic (rectangular object near face).
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    if len(faces) == 0:
        return {"gaze": "absent", "phone_detected": False, "attention_score": 0.0, "face_detected": False}

    (fx, fy, fw, fh) = faces[0]

    # Gaze heuristic: face position relative to frame center
    frame_cx = img.shape[1] / 2
    face_cx = fx + fw / 2
    face_cy = fy + fh / 2

    deviation_x = (face_cx - frame_cx) / (img.shape[1] / 2)
    face_top_ratio = fy / img.shape[0]

    if abs(deviation_x) < 0.15 and face_top_ratio < 0.5:
        gaze = "forward"
        attention = 100.0
    elif deviation_x > 0.2:
        gaze = "right"
        attention = 55.0
    elif deviation_x < -0.2:
        gaze = "left"
        attention = 55.0
    elif face_top_ratio > 0.5:
        gaze = "down"
        attention = 40.0
    else:
        gaze = "forward"
        attention = 80.0

    # Phone detection: look for large rectangular contours in lower half
    phone_detected = False
    lower_half = gray[img.shape[0]//2:, :]
    _, thresh = cv2.threshold(lower_half, 128, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        aspect = w / h if h > 0 else 0
        area = cv2.contourArea(cnt)
        # Phone-like: tall rectangle, significant area
        if 0.4 < aspect < 0.75 and area > (img.shape[0] * img.shape[1] * 0.02):
            phone_detected = True
            attention = max(0.0, attention - 30.0)
            break

    return {
        "gaze": gaze,
        "phone_detected": phone_detected,
        "attention_score": round(attention, 1),
        "face_detected": True,
    }


@router.post("/analyze")
async def analyze_attention(
    file: UploadFile = File(...),
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Submit a classroom frame for attention analysis."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    result = _analyze_attention(img)

    log = models.AttentionLog(
        institution_id=current_user.institution_id,
        student_id=student_id,
        subject_id=subject_id,
        gaze_direction=result["gaze"],
        phone_detected=result["phone_detected"],
        attention_score=result["attention_score"],
    )
    db.add(log)
    db.commit()

    # Alert if attention score very low
    if result["attention_score"] < 40 and student_id:
        student = db.query(models.StudentModel).filter(models.StudentModel.id == student_id).first()
        if student:
            background_tasks.add_task(
                _push_attention_alert,
                current_user.institution_id, student.name, student.roll,
                result["gaze"], result["phone_detected"]
            )

    return result


async def _push_attention_alert(institution_id, name, roll, gaze, phone):
    try:
        from .websocket_sync import push_alert
        details = f"Gaze: {gaze}"
        if phone:
            details += ", Phone detected"
        await push_alert(
            institution_id,
            alert_type="attention_alert",
            message=f"Low attention: {name} (Roll: {roll}) — {details}",
            severity="warning",
        )
    except Exception as e:
        print(f"Attention alert WS failed: {e}")


@router.get("/session-summary")
def get_attention_summary(
    subject_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get attention summary for last N readings."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.AttentionLog).filter(
        models.AttentionLog.institution_id == current_user.institution_id
    )
    if subject_id:
        query = query.filter(models.AttentionLog.subject_id == subject_id)

    logs = query.order_by(models.AttentionLog.created_at.desc()).limit(limit).all()

    if not logs:
        return {"avg_attention": 0.0, "phone_detections": 0, "readings": 0, "gaze_distribution": {}}

    avg_att = round(sum(l.attention_score for l in logs) / len(logs), 1)
    phone_count = sum(1 for l in logs if l.phone_detected)

    gaze_dist = {}
    for l in logs:
        gaze_dist[l.gaze_direction] = gaze_dist.get(l.gaze_direction, 0) + 1

    return {
        "avg_attention": avg_att,
        "phone_detections": phone_count,
        "readings": len(logs),
        "gaze_distribution": gaze_dist,
    }
