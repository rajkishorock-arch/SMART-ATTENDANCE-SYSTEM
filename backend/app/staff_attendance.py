"""
Feature 8: Staff/Teacher Face Recognition Attendance
Teachers and admins check in/out via face recognition — same engine as students.
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


@router.post("/enroll-face")
async def enroll_staff_face(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Staff members enroll their own face for attendance recognition."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    try:
        from .face_utils import get_face_embedding
        embedding = get_face_embedding(img)
        if embedding is None:
            raise HTTPException(status_code=400, detail="No face detected in image. Please use a clear frontal photo.")

        from .encryption_service import encrypt_embedding
        encrypted = encrypt_embedding(json.dumps(embedding.tolist()))
        current_user.face_embedding = encrypted
        current_user.face_enrolled_at = datetime.now(IST)
        db.commit()

        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                action=f"Staff '{current_user.name}' enrolled face for attendance."
            ),
            institution_id=current_user.institution_id,
        )
        return {"message": "Face enrolled successfully. You can now check in via face recognition."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face enrollment failed: {str(e)}")


@router.post("/check-in")
async def staff_face_checkin(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Staff check in via face recognition."""
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    # Check if already checked in today
    existing = db.query(models.StaffAttendanceLog).filter(
        models.StaffAttendanceLog.user_id == current_user.id,
        models.StaffAttendanceLog.institution_id == current_user.institution_id,
        models.StaffAttendanceLog.date == today_str,
    ).first()
    if existing and existing.check_in_time:
        return {
            "message": "Already checked in today.",
            "check_in_time": existing.check_in_time,
            "status": existing.status,
        }

    # Verify face
    if not current_user.face_embedding:
        raise HTTPException(
            status_code=400,
            detail="Face not enrolled. Please enroll your face first via POST /staff-attendance/enroll-face"
        )

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    verified = _verify_staff_face(img, current_user.face_embedding)
    if not verified:
        raise HTTPException(status_code=401, detail="Face verification failed. Please try again with better lighting.")

    # Determine if late (after 9:30 AM)
    now = datetime.now(IST)
    time_str = now.strftime("%H:%M:%S")
    late_threshold = now.replace(hour=9, minute=30, second=0, microsecond=0)
    is_late = now > late_threshold
    late_minutes = max(0, int((now - late_threshold).total_seconds() / 60)) if is_late else 0
    status = "Late" if is_late else "Present"

    if existing:
        existing.check_in_time = time_str
        existing.status = status
        existing.late_minutes = late_minutes
        db.commit()
    else:
        log = models.StaffAttendanceLog(
            institution_id=current_user.institution_id,
            user_id=current_user.id,
            user_email=current_user.email,
            user_name=current_user.name,
            check_in_time=time_str,
            date=today_str,
            status=status,
            late_minutes=late_minutes,
        )
        db.add(log)
        db.commit()

    return {
        "message": f"Check-in successful. Status: {status}",
        "time": time_str,
        "date": today_str,
        "status": status,
        "late_minutes": late_minutes,
    }


@router.post("/check-out")
async def staff_face_checkout(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Staff check out via face recognition."""
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    existing = db.query(models.StaffAttendanceLog).filter(
        models.StaffAttendanceLog.user_id == current_user.id,
        models.StaffAttendanceLog.institution_id == current_user.institution_id,
        models.StaffAttendanceLog.date == today_str,
    ).first()
    if not existing:
        raise HTTPException(status_code=400, detail="No check-in found for today. Please check in first.")
    if existing.check_out_time:
        return {"message": "Already checked out today.", "check_out_time": existing.check_out_time}

    if not current_user.face_embedding:
        raise HTTPException(status_code=400, detail="Face not enrolled.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    verified = _verify_staff_face(img, current_user.face_embedding)
    if not verified:
        raise HTTPException(status_code=401, detail="Face verification failed.")

    time_str = datetime.now(IST).strftime("%H:%M:%S")
    existing.check_out_time = time_str
    db.commit()

    return {"message": "Check-out successful.", "check_out_time": time_str}


def _verify_staff_face(img: np.ndarray, face_embedding_encrypted: str) -> bool:
    """Verify a face image against stored staff embedding."""
    try:
        from .recognition_service import recognition_service
        from .encryption_service import decrypt_embedding
        decrypted = decrypt_embedding(face_embedding_encrypted)
        ref_emb = np.array(json.loads(decrypted), dtype=np.float32).reshape(1, -1)

        recognition_service._load_models()
        if not recognition_service.detector or not recognition_service.recognizer:
            return False

        h, w = img.shape[:2]
        recognition_service.detector.setInputSize((w, h))
        retval, faces = recognition_service.detector.detect(img)
        if not retval or faces is None or len(faces) == 0:
            return False

        aligned = recognition_service.recognizer.alignCrop(img, faces[0])
        feat = recognition_service.recognizer.feature(aligned)
        score = recognition_service.recognizer.match(feat, ref_emb, cv2.FaceRecognizerSF_FR_COSINE)
        return score >= 0.43
    except Exception as e:
        print(f"Staff face verify failed: {e}")
        return False


@router.get("/logs")
def get_staff_attendance_logs(
    date_filter: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admins view staff attendance logs."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    query = db.query(models.StaffAttendanceLog).filter(
        models.StaffAttendanceLog.institution_id == current_user.institution_id
    )
    if date_filter:
        try:
            d = datetime.strptime(date_filter, "%Y-%m-%d").strftime("%d/%m/%Y")
            query = query.filter(models.StaffAttendanceLog.date == d)
        except ValueError:
            pass

    logs = query.order_by(models.StaffAttendanceLog.date.desc()).limit(200).all()

    results = []
    for l in logs:
        user = db.query(models.User).filter(models.User.id == l.user_id).first()
        if department and user and user.department != department:
            continue
        results.append({
            "id": l.id,
            "user_id": l.user_id,
            "name": l.user_name,
            "email": l.user_email,
            "department": user.department if user else None,
            "date": l.date,
            "check_in": l.check_in_time,
            "check_out": l.check_out_time,
            "status": l.status,
            "late_minutes": l.late_minutes,
        })
    return results


@router.get("/my-logs")
def get_my_staff_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Staff member views their own attendance history."""
    logs = db.query(models.StaffAttendanceLog).filter(
        models.StaffAttendanceLog.user_id == current_user.id,
        models.StaffAttendanceLog.institution_id == current_user.institution_id,
    ).order_by(models.StaffAttendanceLog.date.desc()).limit(90).all()

    return [
        {
            "date": l.date,
            "check_in": l.check_in_time,
            "check_out": l.check_out_time,
            "status": l.status,
            "late_minutes": l.late_minutes,
        }
        for l in logs
    ]


@router.get("/summary")
def get_staff_attendance_summary(
    month: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Monthly staff attendance summary for admin payroll view."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    if not month:
        month = datetime.now(IST).strftime("%m/%Y")

    logs = db.query(models.StaffAttendanceLog).filter(
        models.StaffAttendanceLog.institution_id == current_user.institution_id,
        models.StaffAttendanceLog.date.contains(f"/{month.split('/')[1]}"),
    ).all()

    from collections import defaultdict
    staff_map = defaultdict(lambda: {"present": 0, "late": 0, "late_minutes_total": 0})
    for l in logs:
        if l.status in ("Present", "Late"):
            staff_map[l.user_email]["present"] += 1
        if l.status == "Late":
            staff_map[l.user_email]["late"] += 1
            staff_map[l.user_email]["late_minutes_total"] += l.late_minutes or 0

    result = []
    for email, stats in staff_map.items():
        user = db.query(models.User).filter(
            models.User.email == email,
            models.User.institution_id == current_user.institution_id,
        ).first()
        result.append({
            "email": email,
            "name": user.name if user else email,
            "department": user.department if user else None,
            "present_days": stats["present"],
            "late_arrivals": stats["late"],
            "total_late_minutes": stats["late_minutes_total"],
        })

    return {"month": month, "staff": result}
