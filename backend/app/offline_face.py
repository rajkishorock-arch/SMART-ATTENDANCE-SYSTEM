"""
Offline Face Recognition Module
Allows mobile apps to download embeddings and perform local face recognition
without internet connectivity
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import base64
from datetime import datetime, timezone
import json

from .database import get_db
from .models import StudentModel, AttendanceModel, OfflineSyncLog, User
from .security import get_current_user
from . import crud


def check_staff_or_admin(user: User, institution_id: int):
    if getattr(user, 'role', '') not in ('admin', 'superadmin', 'owner', 'teacher', 'hod', 'staff'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff or Admin access required")
    if getattr(user, 'role', '') not in ('superadmin', 'owner') and getattr(user, 'institution_id', None) != institution_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access to this institution is restricted.")

router = APIRouter(tags=["Offline Face Recognition"])


from pydantic import BaseModel, ConfigDict, Field

class OfflineStudentData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_id: int
    name: str
    roll_number: str
    face_embedding: List[float]
    photo_base64: Optional[str] = None


class OfflineAttendanceRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    student_id: int
    timestamp: str
    location: Optional[str] = None
    confidence: float
    device_id: str


class OfflineSyncRequest(BaseModel):
    device_id: str
    last_sync_time: Optional[str] = None
    attendance_records: List[OfflineAttendanceRecord] = Field(default_factory=list)


@router.get("/download-embeddings/{institution_id}", response_model=List[OfflineStudentData])
async def download_embeddings_for_offline(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download all student face embeddings for offline recognition
    Mobile app / browser can store these locally and perform face matching without internet
    """
    check_staff_or_admin(current_user, institution_id)
    
    students = db.query(StudentModel).filter(
        StudentModel.institution_id == institution_id,
        StudentModel.face_embedding.isnot(None),
        StudentModel.consent_given == True
    ).all()
    
    if not students:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No students with face embeddings found"
        )
    
    from .encryption_service import decrypt_embedding
    offline_data = []
    for student in students:
        try:
            raw_emb = decrypt_embedding(student.face_embedding)
            embedding = json.loads(raw_emb) if isinstance(raw_emb, str) else raw_emb
            
            data = OfflineStudentData(
                student_id=student.id,
                name=student.name or "",
                roll_number=student.roll or "",
                face_embedding=embedding,
                photo_base64=student.photo if student.photo else None
            )
            offline_data.append(data)
        except Exception as e:
            print(f"Error processing student {student.id}: {e}")
            continue
    
    # Log the download
    sync_log = OfflineSyncLog(
        institution_id=institution_id,
        device_id=f"admin_{current_user.id}",
        sync_type="download",
        records_count=len(offline_data),
        timestamp=datetime.now(timezone.utc)
    )
    db.add(sync_log)
    db.commit()
    
    return offline_data


@router.post("/sync-attendance/{institution_id}")
async def sync_offline_attendance(
    institution_id: int,
    sync_request: OfflineSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Upload offline attendance records collected by mobile app
    Mobile app performs local face recognition and syncs when internet is available
    """
    check_staff_or_admin(current_user, institution_id)
    
    synced_count = 0
    skipped_count = 0
    errors = []
    
    for record in sync_request.attendance_records:
        try:
            timestamp = datetime.fromisoformat(record.timestamp.replace('Z', '+00:00'))
            time_str = timestamp.strftime("%H:%M:%S")
            date_str = timestamp.strftime("%d/%m/%Y")

            student_obj = db.query(StudentModel).filter(
                StudentModel.id == record.student_id,
                StudentModel.institution_id == institution_id
            ).first()
            if not student_obj:
                skipped_count += 1
                errors.append(f"Student {record.student_id}: Not found in institution {institution_id}")
                continue

            _, newly_marked = crud.mark_student_attendance(
                db,
                student_id=record.student_id,
                name=student_obj.name,
                roll=student_obj.roll or "",
                dep=student_obj.dep or "",
                custom_date=date_str,
                custom_time=time_str,
                institution_id=institution_id
            )
            if newly_marked:
                synced_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            errors.append(f"Student {record.student_id}: {str(e)}")
            continue
    
    # Log the sync
    sync_log = OfflineSyncLog(
        institution_id=institution_id,
        device_id=sync_request.device_id,
        sync_type="upload",
        records_count=synced_count,
        timestamp=datetime.now(timezone.utc),
        sync_metadata=json.dumps({
            "skipped": skipped_count,
            "errors": errors
        })
    )
    db.add(sync_log)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        # Non-fatal sync log failure fallback
        print(f"Sync log commit failed: {e}")
    
    return {
        "success": True,
        "synced": synced_count,
        "skipped": skipped_count,
        "errors": errors,
        "last_sync_time": datetime.now(timezone.utc).isoformat()
    }


@router.get("/sync-status/{institution_id}/{device_id}")
async def get_sync_status(
    institution_id: int,
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get sync history and status for a device
    """
    logs = db.query(OfflineSyncLog).filter(
        OfflineSyncLog.institution_id == institution_id,
        OfflineSyncLog.device_id == device_id
    ).order_by(OfflineSyncLog.timestamp.desc()).limit(20).all()
    
    if not logs:
        return {
            "device_id": device_id,
            "last_sync": None,
            "total_syncs": 0,
            "history": []
        }
    
    return {
        "device_id": device_id,
        "last_sync": logs[0].timestamp.isoformat() if logs else None,
        "total_syncs": len(logs),
        "history": [
            {
                "sync_type": log.sync_type,
                "records_count": log.records_count,
                "timestamp": log.timestamp.isoformat(),
                "sync_metadata": json.loads(log.sync_metadata) if log.sync_metadata else None
            }
            for log in logs
        ]
    }


@router.delete("/clear-device-data/{institution_id}/{device_id}")
async def clear_device_data(
    institution_id: int,
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Clear sync logs for a device (admin only)
    """
    check_admin(current_user)
    
    deleted = db.query(OfflineSyncLog).filter(
        OfflineSyncLog.institution_id == institution_id,
        OfflineSyncLog.device_id == device_id
    ).delete()
    
    db.commit()
    
    return {
        "success": True,
        "deleted_logs": deleted,
        "message": f"Cleared data for device {device_id}"
    }


@router.get("/statistics/{institution_id}")
async def offline_mode_statistics(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Statistics about offline mode usage
    """
    check_admin(current_user)
    
    # Total syncs
    total_syncs = db.query(OfflineSyncLog).filter(
        OfflineSyncLog.institution_id == institution_id
    ).count()
    
    # Active devices
    active_devices = db.query(OfflineSyncLog.device_id).filter(
        OfflineSyncLog.institution_id == institution_id
    ).distinct().count()
    
    # Total offline attendance
    offline_attendance = db.query(AttendanceModel).filter(
        AttendanceModel.institution_id == institution_id
    ).count()
    
    # Recent syncs
    recent_syncs = db.query(OfflineSyncLog).filter(
        OfflineSyncLog.institution_id == institution_id
    ).order_by(OfflineSyncLog.timestamp.desc()).limit(10).all()
    
    return {
        "total_syncs": total_syncs,
        "active_devices": active_devices,
        "offline_attendance_records": offline_attendance,
        "recent_syncs": [
            {
                "device_id": log.device_id,
                "sync_type": log.sync_type,
                "records": log.records_count,
                "timestamp": log.timestamp.isoformat()
            }
            for log in recent_syncs
        ]
    }
