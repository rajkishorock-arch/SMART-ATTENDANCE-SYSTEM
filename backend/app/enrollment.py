import json
import cv2
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from . import models, security, crud
from .database import get_db
from .recognition_service import recognition_service

router = APIRouter()
IST = timezone(timedelta(hours=5, minutes=30))
REENROLL_MONTHS = 6
DUPLICATE_THRESHOLD = 0.40


@router.get("/duplicates")
def find_duplicate_enrollments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id,
        models.StudentModel.face_embedding != None,
    ).all()
    pairs = []
    parsed = []
    for s in students:
        try:
            from .encryption_service import decrypt_embedding
            decrypted = decrypt_embedding(s.face_embedding)
            emb = np.array(json.loads(decrypted), dtype=np.float32).reshape(1, -1)
            parsed.append((s, emb))
        except Exception:
            continue
    if recognition_service.recognizer is None:
        recognition_service._load_models()
    for i, (s1, e1) in enumerate(parsed):
        for s2, e2 in parsed[i + 1:]:
            if recognition_service.recognizer:
                score = recognition_service.recognizer.match(
                    e1, e2, cv2.FaceRecognizerSF_FR_COSINE
                )
                if score >= DUPLICATE_THRESHOLD:
                    pairs.append({
                        "student_a": {"id": s1.id, "name": s1.name, "roll": s1.roll},
                        "student_b": {"id": s2.id, "name": s2.name, "roll": s2.roll},
                        "similarity": round(float(score), 3),
                    })
    return {"duplicate_pairs": pairs, "total_checked": len(parsed)}


@router.get("/re-enrollment-reminders")
def get_reenrollment_reminders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff only")
    cutoff = datetime.now(IST) - timedelta(days=REENROLL_MONTHS * 30)
    students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id,
    ).all()
    reminders = []
    for s in students:
        reasons = []
        if not s.face_embedding:
            reasons.append("no_face_enrolled")
        elif s.face_enrolled_at and s.face_enrolled_at.replace(tzinfo=IST) < cutoff:
            reasons.append("enrollment_expired")
        elif not s.face_enrolled_at and s.face_embedding:
            reasons.append("enrollment_date_unknown")
        if reasons:
            reminders.append({
                "id": s.id,
                "name": s.name,
                "roll": s.roll,
                "email": s.email,
                "reasons": reasons,
                "face_enrolled_at": s.face_enrolled_at.isoformat() if s.face_enrolled_at else None,
            })
    return {"count": len(reminders), "students": reminders}
