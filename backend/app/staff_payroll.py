"""
Staff Attendance & Payroll Engine Router (Phase 11)
Automates daily staff biometric punch-in / punch-out, working hours calculation,
half-day / overtime classifications, and monthly salary disbursement calculations.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone

from . import models, schemas, security, crud
from .database import get_db

router = APIRouter()


def _format_staff_attendance(att: models.StaffAttendance, db: Session) -> schemas.StaffAttendanceResponse:
    user = db.query(models.User).filter(models.User.id == att.user_id).first()
    return schemas.StaffAttendanceResponse(
        id=att.id,
        institution_id=att.institution_id,
        user_id=att.user_id,
        staff_name=user.name if user else "Staff Member",
        staff_email=user.email if user else "N/A",
        date=att.date,
        check_in=att.check_in,
        check_out=att.check_out,
        hours_worked=round(att.hours_worked, 2),
        overtime_hours=round(att.overtime_hours, 2),
        status=att.status,
        created_at=att.created_at
    )


def _format_payroll(p: models.StaffPayrollRecord, db: Session) -> schemas.StaffPayrollResponse:
    user = db.query(models.User).filter(models.User.id == p.user_id).first()
    return schemas.StaffPayrollResponse(
        id=p.id,
        institution_id=p.institution_id,
        user_id=p.user_id,
        staff_name=user.name if user else "Staff Member",
        staff_email=user.email if user else "N/A",
        month_year=p.month_year,
        base_salary=p.base_salary,
        working_days=p.working_days,
        days_present=p.days_present,
        days_half=p.days_half,
        days_absent=p.days_absent,
        gross_salary=p.gross_salary,
        deductions=p.deductions,
        net_salary=p.net_salary,
        status=p.status,
        generated_at=p.generated_at
    )


@router.post("/check-in", response_model=schemas.StaffAttendanceResponse)
def staff_check_in(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Staff checks in for the day."""
    target_id = user_id if (user_id and current_user.role == "admin") else current_user.id
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%d/%m/%Y")
    time_str = now_utc.strftime("%H:%M")

    record = db.query(models.StaffAttendance).filter(
        models.StaffAttendance.institution_id == current_user.institution_id,
        models.StaffAttendance.user_id == target_id,
        models.StaffAttendance.date == today_str
    ).first()

    if not record:
        record = models.StaffAttendance(
            institution_id=current_user.institution_id,
            user_id=target_id,
            date=today_str,
            check_in=time_str,
            status="PRESENT"
        )
        db.add(record)
        db.commit()
        db.refresh(record)

    return _format_staff_attendance(record, db)


@router.post("/check-out", response_model=schemas.StaffAttendanceResponse)
def staff_check_out(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Staff checks out for the day; computes total hours and overtime."""
    target_id = user_id if (user_id and current_user.role == "admin") else current_user.id
    now_utc = datetime.now(timezone.utc)
    today_str = now_utc.strftime("%d/%m/%Y")
    time_str = now_utc.strftime("%H:%M")

    record = db.query(models.StaffAttendance).filter(
        models.StaffAttendance.institution_id == current_user.institution_id,
        models.StaffAttendance.user_id == target_id,
        models.StaffAttendance.date == today_str
    ).first()

    if not record:
        record = models.StaffAttendance(
            institution_id=current_user.institution_id,
            user_id=target_id,
            date=today_str,
            check_in="09:00",
            check_out=time_str,
            status="PRESENT"
        )
        db.add(record)

    record.check_out = time_str

    # Compute hours worked
    try:
        in_parts = [int(p) for p in record.check_in.split(":")]
        out_parts = [int(p) for p in record.check_out.split(":")]
        in_minutes = in_parts[0] * 60 + in_parts[1]
        out_minutes = out_parts[0] * 60 + out_parts[1]
        diff_minutes = max(0, out_minutes - in_minutes)
        hours = diff_minutes / 60.0
        record.hours_worked = hours

        if hours >= 8.5:
            record.status = "OVERTIME"
            record.overtime_hours = hours - 8.0
        elif hours >= 4.0:
            record.status = "PRESENT"
            record.overtime_hours = 0.0
        else:
            record.status = "HALF_DAY"
            record.overtime_hours = 0.0
    except Exception:
        record.hours_worked = 8.0
        record.status = "PRESENT"

    db.commit()
    db.refresh(record)
    return _format_staff_attendance(record, db)


@router.get("/attendance", response_model=List[schemas.StaffAttendanceResponse])
def get_staff_attendance_logs(
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """Retrieve daily staff check-in/out records."""
    query = db.query(models.StaffAttendance).filter(
        models.StaffAttendance.institution_id == identity.institution_id
    )
    if date:
        query = query.filter(models.StaffAttendance.date == date)

    records = query.order_by(models.StaffAttendance.created_at.desc()).limit(100).all()
    return [_format_staff_attendance(r, db) for r in records]


@router.post("/payroll/calculate", response_model=List[schemas.StaffPayrollResponse])
def calculate_monthly_payroll(
    payload: schemas.StaffPayrollCalculatePayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Admin computes monthly salary for institutional staff based on attendance and working days.
    Deductions applied for half-days (0.5x daily rate) and unexcused absences.
    """
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    staff_users = db.query(models.User).filter(
        models.User.institution_id == current_user.institution_id,
        models.User.role.in_(["teacher", "admin", "hod"]),
        models.User.is_active == True
    ).all()

    results = []
    working_days = payload.working_days or 26
    base_salary = payload.default_base_salary or 50000.0
    daily_rate = base_salary / float(working_days)

    for staff in staff_users:
        # Fetch month's attendance records
        # date format: DD/MM/YYYY
        month_suffix = f"/{payload.month_year}"
        logs = db.query(models.StaffAttendance).filter(
            models.StaffAttendance.institution_id == current_user.institution_id,
            models.StaffAttendance.user_id == staff.id,
            models.StaffAttendance.date.like(f"%{month_suffix}")
        ).all()

        present_count = sum(1 for l in logs if l.status in ["PRESENT", "OVERTIME"])
        half_count = sum(1 for l in logs if l.status == "HALF_DAY")
        absent_count = max(0, working_days - (present_count + half_count))

        deductions = round((absent_count * daily_rate) + (half_count * daily_rate * 0.5), 2)
        gross = base_salary
        net = round(max(0.0, gross - deductions), 2)

        # Upsert payroll record
        rec = db.query(models.StaffPayrollRecord).filter(
            models.StaffPayrollRecord.institution_id == current_user.institution_id,
            models.StaffPayrollRecord.user_id == staff.id,
            models.StaffPayrollRecord.month_year == payload.month_year
        ).first()

        if not rec:
            rec = models.StaffPayrollRecord(
                institution_id=current_user.institution_id,
                user_id=staff.id,
                month_year=payload.month_year,
                base_salary=base_salary,
                working_days=working_days,
                days_present=present_count,
                days_half=half_count,
                days_absent=absent_count,
                gross_salary=gross,
                deductions=deductions,
                net_salary=net,
                status="DRAFT"
            )
            db.add(rec)
        else:
            rec.working_days = working_days
            rec.days_present = present_count
            rec.days_half = half_count
            rec.days_absent = absent_count
            rec.gross_salary = gross
            rec.deductions = deductions
            rec.net_salary = net

        db.commit()
        db.refresh(rec)
        results.append(_format_payroll(rec, db))

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            role=current_user.role,
            action=f"Computed monthly payroll for {len(results)} staff members for {payload.month_year}",
            entity_type="staff_payroll",
            entity_id=payload.month_year,
            reason="Monthly Payroll Calculation"
        ),
        institution_id=current_user.institution_id
    )

    return results


@router.get("/payroll", response_model=List[schemas.StaffPayrollResponse])
def list_payroll_records(
    month_year: Optional[str] = None,
    db: Session = Depends(get_db),
    identity: security.AuthIdentity = Depends(security.get_current_identity)
):
    """List calculated payroll registers."""
    query = db.query(models.StaffPayrollRecord).filter(
        models.StaffPayrollRecord.institution_id == identity.institution_id
    )
    if month_year:
        query = query.filter(models.StaffPayrollRecord.month_year == month_year)

    records = query.order_by(models.StaffPayrollRecord.generated_at.desc()).all()
    return [_format_payroll(p, db) for p in records]


@router.post("/payroll/{record_id}/approve", response_model=schemas.StaffPayrollResponse)
def approve_payroll_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Admin approves and marks payroll record as APPROVED / PAID."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")

    rec = db.query(models.StaffPayrollRecord).filter(
        models.StaffPayrollRecord.id == record_id,
        models.StaffPayrollRecord.institution_id == current_user.institution_id
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Payroll record not found.")

    rec.status = "APPROVED"
    db.commit()
    db.refresh(rec)
    return _format_payroll(rec, db)
