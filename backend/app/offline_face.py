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
from datetime import datetime
import json

from .database import get_db
from .models import StudentModel, AttendanceModel, OfflineSyncLog, User
from .security import get_current_user


def check_admin(user: User):
    if getattr(user, 'role', '') not in ('admin', 'superadmin', 'owner'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

router = APIRouter(prefix="/offline-face", tags=["Offline Face Recognition"])


class OfflineStudentData(BaseModel):
    student_id: int
    name: str
    roll_number: str
    face_embedding: List[float]
    photo_base64: Optional[str] = None

    class Config:
        from_attributes = True


class OfflineAttendanceRecord(BaseModel):
    student_id: int
    timestamp: str
    location: Optional[str] = None
    confidence: float
    device_id: str


class OfflineSyncRequest(BaseModel):
    device_id: str
    last_sync_time: Optional[str] = None
    attendance_records: List[OfflineAttendanceRecord] = []


@router.get("/download-embeddings/{institution_id}", response_model=List[OfflineStudentData])
async def download_embeddings_for_offline(
    institution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download all student face embeddings for offline recognition
    Mobile app can store these locally and perform face matching without internet
    """
    check_admin(current_user)
    
    students = db.query(StudentModel).filter(
        StudentModel.institution_id == institution_id,
        StudentModel.face_embedding.isnot(None)
    ).all()
    
    if not students:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No students with face embeddings found"
        )
    
    offline_data = []
    for student in students:
        try:
            embedding = json.loads(student.face_embedding) if isinstance(student.face_embedding, str) else student.face_embedding
            
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
        timestamp=datetime.utcnow()
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
    check_admin(current_user)
    
    synced_count = 0
    skipped_count = 0
    errors = []
    
    for record in sync_request.attendance_records:
        try:
            # Check if already exists
            timestamp = datetime.fromisoformat(record.timestamp.replace('Z', '+00:00'))
            
            time_str = timestamp.strftime("%H:%M:%S")
            date_str = timestamp.strftime("%d/%m/%Y")

            existing = db.query(AttendanceModel).filter(
                AttendanceModel.id == str(record.student_id),
                AttendanceModel.date == date_str,
                AttendanceModel.time == time_str
            ).first()
            
            if existing:
                skipped_count += 1
                continue
            
            # Fetch student info if available
            student_obj = db.query(StudentModel).filter(StudentModel.id == record.student_id).first()
            
            # Create attendance record
            attendance = AttendanceModel(
                id=str(record.student_id),
                institution_id=institution_id,
                roll=student_obj.roll if student_obj else "",
                name=student_obj.name if student_obj else "",
                department=student_obj.dep if student_obj else "",
                time=time_str,
                date=date_str,
                attendance="Present"
            )
            db.add(attendance)
            synced_count += 1
            
        except Exception as e:
            errors.append(f"Student {record.student_id}: {str(e)}")
            continue
    
    # Log the sync
    sync_log = OfflineSyncLog(
        institution_id=institution_id,
        device_id=sync_request.device_id,
        sync_type="upload",
        records_count=synced_count,
        timestamp=datetime.utcnow(),
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync attendance: {str(e)}"
        )
    
    return {
        "success": True,
        "synced": synced_count,
        "skipped": skipped_count,
        "errors": errors,
        "last_sync_time": datetime.utcnow().isoformat()
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
