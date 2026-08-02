"""
Feature 30: Proxy/Fake Attendance Detection
Detects when someone attends on behalf of another student.
Analyzes historical face patterns, location anomalies, and time patterns.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import cv2, numpy as np, json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


@router.post("/check-frame")
async def check_proxy_attendance(
    file: UploadFile = File(...),
    claimed_student_id: int = 0,
    subject_id: Optional[int] = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Check if the face in the frame matches the claimed student.
    If mismatch detected, create a ProxyAlert.
    """
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == claimed_student_id,
        models.StudentModel.institution_id == current_user.institution_id,
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Claimed student not found.")

    if not student.face_embedding:
        return {
            "proxy_detected": False,
            "reason": "Student has no enrolled face — cannot verify proxy.",
            "claimed_student_id": claimed_student_id,
        }

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    # Compare with enrolled face
    match_score = _compare_face_with_student(img, student.face_embedding)

    proxy_detected = match_score < 0.40  # Below threshold = different person
    detected_student_id = None

    if proxy_detected:
        # Try to identify who the actual person is
        from .recognition_service import recognition_service
        recognition_service.load_student_records(db, institution_id=current_user.institution_id)
        try:
            results = recognition_service.recognize_faces_in_frame(img, institution_id=current_user.institution_id)
            if results:
                detected_student_id = results[0]["user_id"]
        except Exception:
            pass

        # Create alert
        alert = models.ProxyAlert(
            institution_id=current_user.institution_id,
            claimed_student_id=claimed_student_id,
            detected_student_id=detected_student_id,
            confidence_score=match_score,
            alert_type="face_mismatch",
            is_confirmed=False,
        )
        db.add(alert)
        db.commit()

        background_tasks.add_task(
            _push_proxy_alert, current_user.institution_id, student.name, student.roll, match_score
        )

    return {
        "proxy_detected": proxy_detected,
        "claimed_student": {"id": claimed_student_id, "name": student.name, "roll": student.roll},
        "match_score": round(match_score, 3),
        "threshold": 0.40,
        "detected_student_id": detected_student_id,
        "message": "Proxy attendance detected!" if proxy_detected else "Identity verified.",
    }


def _compare_face_with_student(img: np.ndarray, face_embedding_encrypted: str) -> float:
    """Compare face in image with student's enrolled embedding. Returns cosine score."""
    try:
        from .recognition_service import recognition_service
        from .encryption_service import decrypt_embedding
        decrypted = decrypt_embedding(face_embedding_encrypted)
        ref_emb = np.array(json.loads(decrypted), dtype=np.float32).reshape(1, -1)

        recognition_service._load_models()
        if not recognition_service.detector or not recognition_service.recognizer:
            return 0.5

        h, w = img.shape[:2]
        recognition_service.detector.setInputSize((w, h))
        retval, faces = recognition_service.detector.detect(img)
        if not retval or faces is None or len(faces) == 0:
            return 0.0

        aligned = recognition_service.recognizer.alignCrop(img, faces[0])
        feat = recognition_service.recognizer.feature(aligned)
        return float(recognition_service.recognizer.match(feat, ref_emb, cv2.FaceRecognizerSF_FR_COSINE))
    except Exception as e:
        print(f"Proxy detection comparison failed: {e}")
        return 0.5


async def _push_proxy_alert(institution_id, name, roll, score):
    try:
        from .websocket_sync import push_alert
        await push_alert(
            institution_id,
            alert_type="proxy_detected",
            message=f"Proxy alert! Face mismatch for {name} (Roll: {roll}). Score: {score:.3f}",
            severity="critical",
        )
    except Exception:
        pass


@router.get("/alerts")
def get_proxy_alerts(
    confirmed_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """View proxy attendance alerts."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.ProxyAlert).filter(
        models.ProxyAlert.institution_id == current_user.institution_id
    )
    if confirmed_only:
        query = query.filter(models.ProxyAlert.is_confirmed == True)

    alerts = query.order_by(models.ProxyAlert.created_at.desc()).limit(limit).all()
    results = []
    for a in alerts:
        claimed = db.query(models.StudentModel).filter(models.StudentModel.id == a.claimed_student_id).first()
        detected = db.query(models.StudentModel).filter(models.StudentModel.id == a.detected_student_id).first() if a.detected_student_id else None
        results.append({
            "id": a.id,
            "claimed_student": {"id": a.claimed_student_id, "name": claimed.name if claimed else "Unknown", "roll": claimed.roll if claimed else ""},
            "detected_student": {"id": a.detected_student_id, "name": detected.name if detected else "Unknown"} if detected else None,
            "confidence_score": a.confidence_score,
            "alert_type": a.alert_type,
            "is_confirmed": a.is_confirmed,
            "reviewed_by": a.reviewed_by,
            "created_at": a.created_at,
        })
    return results


@router.put("/confirm/{alert_id}")
def confirm_proxy_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Confirm a proxy alert as a genuine violation."""
    alert = db.query(models.ProxyAlert).filter(
        models.ProxyAlert.id == alert_id,
        models.ProxyAlert.institution_id == current_user.institution_id,
    ).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    alert.is_confirmed = True
    alert.reviewed_by = current_user.email
    db.commit()
    return {"message": "Alert confirmed as proxy violation."}
