"""
Feature 9: Visitor Management System
Face-based visitor registration, entry/exit log, badge generation.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import json

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


@router.post("/register")
async def register_visitor(
    name: str,
    purpose: str,
    host_name: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Register a new visitor with optional face snapshot."""
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    # Generate badge number
    count = db.query(models.VisitorLog).filter(
        models.VisitorLog.institution_id == current_user.institution_id
    ).count()
    badge_no = f"VIS-{current_user.institution_id:03d}-{count + 1:04d}"

    snapshot_url = None
    if file:
        # Save snapshot via storage service
        try:
            from .storage_service import save_uploaded_file
            contents = await file.read()
            snapshot_url = save_uploaded_file(contents, f"visitors/{badge_no}.jpg")
        except Exception as e:
            print(f"Visitor snapshot save failed: {e}")

    visitor = models.VisitorLog(
        institution_id=current_user.institution_id,
        visitor_name=name,
        visitor_phone=phone,
        visitor_email=email,
        purpose=purpose,
        host_name=host_name,
        face_snapshot_url=snapshot_url,
        badge_number=badge_no,
        status="inside",
        check_in=datetime.now(IST),
    )
    db.add(visitor)
    db.commit()
    db.refresh(visitor)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Registered visitor '{name}' (Badge: {badge_no}). Purpose: {purpose}."
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "message": "Visitor registered.",
        "visitor_id": visitor.id,
        "badge_number": badge_no,
        "check_in": visitor.check_in,
    }


@router.put("/checkout/{visitor_id}")
def checkout_visitor(
    visitor_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Mark visitor as checked out."""
    if current_user.role not in ("admin", "teacher"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    visitor = db.query(models.VisitorLog).filter(
        models.VisitorLog.id == visitor_id,
        models.VisitorLog.institution_id == current_user.institution_id,
    ).first()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found.")
    if visitor.status == "exited":
        raise HTTPException(status_code=400, detail="Visitor already checked out.")

    visitor.check_out = datetime.now(IST)
    visitor.status = "exited"
    db.commit()

    duration = visitor.check_out - visitor.check_in
    minutes = int(duration.total_seconds() / 60)

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Visitor '{visitor.visitor_name}' (Badge: {visitor.badge_number}) checked out. Duration: {minutes} min."
        ),
        institution_id=current_user.institution_id,
    )
    return {"message": "Checked out.", "duration_minutes": minutes, "check_out": visitor.check_out}


@router.get("/active")
def get_active_visitors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get all visitors currently inside the campus."""
    visitors = db.query(models.VisitorLog).filter(
        models.VisitorLog.institution_id == current_user.institution_id,
        models.VisitorLog.status == "inside",
    ).order_by(models.VisitorLog.check_in.desc()).all()

    return [
        {
            "id": v.id,
            "name": v.visitor_name,
            "phone": v.visitor_phone,
            "purpose": v.purpose,
            "host": v.host_name,
            "badge": v.badge_number,
            "check_in": v.check_in,
            "snapshot_url": v.face_snapshot_url,
        }
        for v in visitors
    ]


@router.get("/history")
def get_visitor_history(
    date_filter: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get all visitor logs with optional date filter (YYYY-MM-DD)."""
    query = db.query(models.VisitorLog).filter(
        models.VisitorLog.institution_id == current_user.institution_id
    )
    if date_filter:
        try:
            from datetime import date as dt_date
            d = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(
                models.VisitorLog.check_in >= datetime.combine(d, datetime.min.time()),
                models.VisitorLog.check_in < datetime.combine(d + timedelta(days=1), datetime.min.time()),
            )
        except ValueError:
            pass

    visitors = query.order_by(models.VisitorLog.check_in.desc()).limit(limit).all()
    return [
        {
            "id": v.id,
            "name": v.visitor_name,
            "phone": v.visitor_phone,
            "email": v.visitor_email,
            "purpose": v.purpose,
            "host": v.host_name,
            "badge": v.badge_number,
            "status": v.status,
            "check_in": v.check_in,
            "check_out": v.check_out,
        }
        for v in visitors
    ]


@router.get("/stats")
def get_visitor_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Dashboard statistics for visitor management."""
    total = db.query(models.VisitorLog).filter(
        models.VisitorLog.institution_id == current_user.institution_id
    ).count()
    inside = db.query(models.VisitorLog).filter(
        models.VisitorLog.institution_id == current_user.institution_id,
        models.VisitorLog.status == "inside",
    ).count()
    today_str = datetime.now(IST).strftime("%Y-%m-%d")

    return {
        "total_visitors": total,
        "currently_inside": inside,
        "today_date": today_str,
    }
