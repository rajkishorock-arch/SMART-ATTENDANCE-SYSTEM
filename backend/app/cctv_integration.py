"""
Feature 23: CCTV Integration
Register RTSP/HTTP camera streams. Trigger batch face recognition from saved frames.
Marks attendance for all recognized faces automatically.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import cv2, numpy as np, json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


@router.post("/streams")
def register_stream(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Register a CCTV camera stream."""
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin only.")

    stream = models.CctvStream(
        institution_id=current_user.institution_id,
        name=payload.get("name", "Camera 1"),
        room_name=payload.get("room_name"),
        stream_url=payload.get("stream_url"),
        subject_id=payload.get("subject_id"),
        is_active=payload.get("is_active", True),
    )
    db.add(stream)
    db.commit()
    db.refresh(stream)
    return {"message": "Stream registered.", "stream_id": stream.id}


@router.get("/streams")
def list_streams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """List all registered CCTV streams."""
    streams = db.query(models.CctvStream).filter(
        models.CctvStream.institution_id == current_user.institution_id
    ).all()
    return [
        {"id": s.id, "name": s.name, "room": s.room_name,
         "stream_url": s.stream_url, "subject_id": s.subject_id,
         "is_active": s.is_active, "created_at": s.created_at}
        for s in streams
    ]


@router.put("/streams/{stream_id}")
def update_stream(
    stream_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Update a CCTV stream configuration."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only.")
    stream = db.query(models.CctvStream).filter(
        models.CctvStream.id == stream_id,
        models.CctvStream.institution_id == current_user.institution_id,
    ).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")
    for k in ("name", "room_name", "stream_url", "subject_id", "is_active"):
        if k in payload:
            setattr(stream, k, payload[k])
    db.commit()
    return {"message": "Stream updated."}


@router.post("/scan-frame/{stream_id}")
async def scan_cctv_frame(
    stream_id: int,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Upload a CCTV frame snapshot for batch face recognition.
    All recognized students are marked present.
    """
    stream = db.query(models.CctvStream).filter(
        models.CctvStream.id == stream_id,
        models.CctvStream.institution_id == current_user.institution_id,
    ).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image frame.")

    from .recognition_service import recognition_service
    recognition_service.load_student_records(db, institution_id=current_user.institution_id)

    try:
        results = recognition_service.recognize_faces_in_frame(img, institution_id=current_user.institution_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")

    marked = []
    for face in results:
        db_att, newly_marked = crud.mark_student_attendance(
            db,
            student_id=face["user_id"],
            name=face["name"],
            roll=face["roll"],
            dep=face["dep"],
            subject_id=stream.subject_id,
            institution_id=current_user.institution_id,
        )
        if newly_marked:
            marked.append({"name": face["name"], "roll": face["roll"], "confidence": face["confidence"]})
            background_tasks.add_task(
                _push_cctv_event, current_user.institution_id, face["name"], face["roll"], stream.name
            )

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"CCTV scan from '{stream.name}' — {len(results)} faces detected, {len(marked)} newly marked."
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "stream_name": stream.name,
        "total_faces_detected": len(results),
        "newly_marked": len(marked),
        "students": marked,
    }


async def _push_cctv_event(institution_id, name, roll, camera_name):
    try:
        from .websocket_sync import push_attendance_event
        await push_attendance_event(institution_id, name, roll, "", "Present (CCTV)")
    except Exception:
        pass


@router.post("/capture-from-stream/{stream_id}")
def trigger_stream_capture(
    stream_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Trigger a capture from a live RTSP/HTTP stream (OpenCV VideoCapture).
    Runs in background — captures one frame and processes it.
    """
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    stream = db.query(models.CctvStream).filter(
        models.CctvStream.id == stream_id,
        models.CctvStream.institution_id == current_user.institution_id,
    ).first()
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found.")
    if not stream.stream_url:
        raise HTTPException(status_code=400, detail="No stream URL configured.")

    background_tasks.add_task(
        _capture_and_recognize, db, stream, current_user.institution_id, current_user.email
    )
    return {"message": f"Capture triggered for stream '{stream.name}'. Processing in background."}


def _capture_and_recognize(db: Session, stream, institution_id: int, user_email: str):
    """Background task: capture one frame from RTSP and run recognition."""
    try:
        cap = cv2.VideoCapture(stream.stream_url)
        if not cap.isOpened():
            print(f"[CCTV] Cannot open stream: {stream.stream_url}")
            return
        ret, frame = cap.read()
        cap.release()
        if not ret or frame is None:
            print("[CCTV] Failed to capture frame.")
            return

        from .recognition_service import recognition_service
        recognition_service.load_student_records(db, institution_id=institution_id)
        results = recognition_service.recognize_faces_in_frame(frame, institution_id=institution_id)

        count = 0
        for face in results:
            _, newly = crud.mark_student_attendance(
                db,
                student_id=face["user_id"], name=face["name"],
                roll=face["roll"], dep=face["dep"],
                subject_id=stream.subject_id, institution_id=institution_id,
            )
            if newly:
                count += 1

        print(f"[CCTV] Stream '{stream.name}': {len(results)} detected, {count} newly marked.")
    except Exception as e:
        print(f"[CCTV] Capture & recognize failed: {e}")
