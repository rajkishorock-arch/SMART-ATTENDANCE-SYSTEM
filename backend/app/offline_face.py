"""
Feature 38: Offline Face Recognition — Mobile Local Model
Provides the backend API side of offline recognition:
  1. Students/teachers can download a compact embedding package for local inference.
  2. Edge devices submit batched offline recognition results for server sync.
  3. Conflict resolution when offline records arrive after online records.

The mobile app (Capacitor) uses the downloaded package + TensorFlow.js / ONNX Runtime Web
to run face matching entirely on-device when internet is unavailable.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import json, hashlib

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


# ── Embedding Package Download ────────────────────────────────────────────────

@router.get("/embedding-package")
def download_embedding_package(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Download a compact JSON package of all student face embeddings for offline use.
    The mobile app caches this and uses it for local face matching.

    Package format:
    {
      "version": "<sha256 of package>",
      "institution_id": <int>,
      "generated_at": "<iso>",
      "students": [
        {"id": <int>, "name": "<str>", "roll": "<str>", "dep": "<str>",
         "embedding": [<128 floats>]}   ← decrypted, ready for cosine match
      ]
    }
    """
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    students = (
        db.query(models.StudentModel)
        .filter(
            models.StudentModel.institution_id == current_user.institution_id,
            models.StudentModel.face_embedding.isnot(None),
        )
        .all()
    )

    records = []
    for s in students:
        try:
            from .encryption_service import decrypt_embedding
            emb = json.loads(decrypt_embedding(s.face_embedding))
            records.append({
                "id": s.id,
                "name": s.name,
                "roll": s.roll or "",
                "dep": s.dep or "",
                "embedding": emb,          # plain float list
            })
        except Exception as e:
            print(f"[OfflineFace] Skip student {s.id}: {e}")

    # Compute a version hash so mobile can detect stale caches
    payload_str = json.dumps(records, sort_keys=True)
    version = hashlib.sha256(payload_str.encode()).hexdigest()[:16]

    return {
        "version": version,
        "institution_id": current_user.institution_id,
        "generated_at": datetime.now(IST).isoformat(),
        "total": len(records),
        "students": records,
        # Threshold the mobile app should use for cosine similarity
        "match_threshold": 0.43,
        "instructions": (
            "Cache this payload locally. On attendance scan, compute cosine similarity "
            "between the live face embedding and each student embedding. Mark attendance "
            "via POST /api/v1/offline-face/sync-batch when back online."
        ),
    }


@router.get("/embedding-version")
def get_embedding_version(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Lightweight check — returns current embedding version hash.
    Mobile app calls this on reconnect to decide if re-download is needed.
    """
    students = (
        db.query(models.StudentModel)
        .filter(
            models.StudentModel.institution_id == current_user.institution_id,
            models.StudentModel.face_embedding.isnot(None),
        )
        .with_entities(
            models.StudentModel.id,
            models.StudentModel.face_enrolled_at,
        )
        .all()
    )
    # Quick version: hash of sorted (id, enrolled_at) pairs
    version_input = "".join(
        f"{s.id}{s.face_enrolled_at}" for s in sorted(students, key=lambda x: x.id)
    )
    version = hashlib.sha256(version_input.encode()).hexdigest()[:16]
    return {
        "version": version,
        "enrolled_count": len(students),
        "institution_id": current_user.institution_id,
    }


# ── Offline Batch Sync ────────────────────────────────────────────────────────

class OfflineRecord:
    """Represents one attendance record collected offline."""
    student_id: int
    subject_id: Optional[int]
    match_score: float
    local_date: str     # DD/MM/YYYY
    local_time: str     # HH:MM:SS
    device_id: str
    latitude: Optional[float]
    longitude: Optional[float]


@router.post("/sync-batch")
def sync_offline_attendance_batch(
    payload: dict = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Mobile app submits batched offline attendance records when back online.

    Expected payload:
    {
      "device_id": "<str>",
      "records": [
        {
          "student_id": <int>,
          "subject_id": <int|null>,
          "match_score": <float>,
          "local_date": "DD/MM/YYYY",
          "local_time": "HH:MM:SS",
          "latitude": <float|null>,
          "longitude": <float|null>
        },
        ...
      ]
    }
    """
    device_id = payload.get("device_id", "unknown")
    records: list = payload.get("records", [])

    if not records:
        raise HTTPException(status_code=400, detail="No records provided.")

    MIN_SCORE = 0.43
    synced = 0
    skipped_low_score = 0
    skipped_conflict = 0
    failed = 0
    errors = []

    for rec in records:
        try:
            student_id = int(rec.get("student_id", 0))
            subject_id = rec.get("subject_id")
            match_score = float(rec.get("match_score", 0.0))
            local_date = rec.get("local_date", "")
            local_time = rec.get("local_time", "00:00:00")

            # Reject low-confidence matches
            if match_score < MIN_SCORE:
                skipped_low_score += 1
                continue

            # Validate student belongs to institution
            student = db.query(models.StudentModel).filter(
                models.StudentModel.id == student_id,
                models.StudentModel.institution_id == current_user.institution_id,
            ).first()
            if not student:
                failed += 1
                errors.append(f"Student {student_id} not found in institution.")
                continue

            # Conflict check: if already Present on this date+subject, skip
            existing = db.query(models.AttendanceModel).filter(
                models.AttendanceModel.id == str(student_id),
                models.AttendanceModel.date == local_date,
                models.AttendanceModel.institution_id == current_user.institution_id,
                models.AttendanceModel.attendance == "Present",
            )
            if subject_id:
                existing = existing.filter(models.AttendanceModel.subject_id == subject_id)
            if existing.first():
                skipped_conflict += 1
                continue

            # Write attendance
            _, newly = crud.mark_student_attendance(
                db,
                student_id=student_id,
                name=student.name,
                roll=student.roll or "",
                dep=student.dep or "",
                subject_id=subject_id,
                custom_date=local_date,
                custom_time=local_time,
                institution_id=current_user.institution_id,
            )
            if newly:
                synced += 1

        except Exception as e:
            failed += 1
            errors.append(str(e))
            db.rollback()

    # Audit log
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=(
                f"Offline sync from device '{device_id}': "
                f"{synced} synced, {skipped_conflict} conflicts, "
                f"{skipped_low_score} low-score, {failed} failed."
            ),
        ),
        institution_id=current_user.institution_id,
    )

    # Broadcast newly synced records via WebSocket
    if synced > 0:
        background_tasks.add_task(
            _broadcast_offline_sync,
            current_user.institution_id,
            synced,
            device_id,
        )

    return {
        "status": "done",
        "synced": synced,
        "skipped_conflict": skipped_conflict,
        "skipped_low_score": skipped_low_score,
        "failed": failed,
        "errors": errors[:10],  # cap to first 10
        "device_id": device_id,
    }


async def _broadcast_offline_sync(institution_id: int, count: int, device_id: str):
    try:
        from .websocket_sync import push_alert
        await push_alert(
            institution_id,
            alert_type="offline_sync",
            message=f"Offline sync complete: {count} attendance record(s) synced from device '{device_id}'.",
            severity="info",
        )
    except Exception as e:
        print(f"[OfflineFace] WS broadcast failed: {e}")


# ── Sync Status & Stats ───────────────────────────────────────────────────────

@router.get("/sync-stats")
def get_offline_sync_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Returns stats about offline-capable students and sync readiness.
    """
    total_students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    ).count()

    enrolled = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id,
        models.StudentModel.face_embedding.isnot(None),
    ).count()

    not_enrolled = total_students - enrolled

    return {
        "total_students": total_students,
        "offline_ready": enrolled,      # have face embeddings
        "not_enrolled": not_enrolled,   # no face embedding yet
        "offline_coverage_pct": round(enrolled / total_students * 100, 1) if total_students else 0,
        "recommendation": (
            "100% coverage achieved — all students can use offline recognition."
            if not_enrolled == 0
            else f"{not_enrolled} student(s) have no face enrolled. Ask them to enroll via the app."
        ),
    }


@router.get("/instructions")
def get_offline_setup_instructions():
    """
    Returns step-by-step instructions for setting up offline face recognition
    on the mobile Capacitor app.
    """
    return {
        "title": "Offline Face Recognition Setup",
        "steps": [
            {
                "step": 1,
                "action": "Download embedding package",
                "endpoint": "GET /api/v1/offline-face/embedding-package",
                "note": "Cache the JSON package in the app's local storage (Capacitor Filesystem).",
            },
            {
                "step": 2,
                "action": "Check version on reconnect",
                "endpoint": "GET /api/v1/offline-face/embedding-version",
                "note": "Compare stored version. Re-download only if version hash changed.",
            },
            {
                "step": 3,
                "action": "Local matching",
                "library": "TensorFlow.js / ONNX Runtime Web",
                "note": (
                    "Use the SFace ONNX model in the browser/WebView. "
                    "Extract embedding from webcam frame, compute cosine similarity "
                    "against cached embeddings. Mark attendance locally if score >= 0.43."
                ),
            },
            {
                "step": 4,
                "action": "Queue offline records",
                "note": "Store unsynced records in IndexedDB / Capacitor Filesystem.",
            },
            {
                "step": 5,
                "action": "Sync when online",
                "endpoint": "POST /api/v1/offline-face/sync-batch",
                "note": (
                    "On network reconnect, POST all queued records. "
                    "Server resolves conflicts (duplicate records are skipped)."
                ),
            },
        ],
        "model_url": "/mediapipe/face_mesh.js",
        "onnx_model": "sface.onnx (included in /assets/)",
        "min_score_threshold": 0.43,
    }
