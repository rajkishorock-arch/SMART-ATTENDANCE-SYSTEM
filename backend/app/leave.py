"""
Leave Management Router — fully multi-tenant, auth-protected, and production-ready.
Supports student leave requests, teacher/admin approval, and auto-attendance update on approval.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timezone, timedelta

from . import crud, models, schemas, security
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))

router = APIRouter(
    prefix="/api/v1/leaves",
    tags=["Leave Management"],
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_leave_or_404(db: Session, leave_id: int, institution_id: int) -> models.LeaveRequest:
    leave = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.id == leave_id,
        models.LeaveRequest.institution_id == institution_id,
    ).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    return leave


def _enrich_leave(db: Session, leave: models.LeaveRequest) -> dict:
    """Enrich a leave record with student and subject names for API response."""
    student_name = None
    student_roll = None
    student_dep = None
    if leave.student_id:
        s = db.query(models.StudentModel).filter(
            models.StudentModel.id == leave.student_id
        ).first()
        if s:
            student_name = s.name
            student_roll = s.roll
            student_dep = s.dep

    subject_name = None
    subject_code = None
    if leave.subject_id:
        sub = db.query(models.Subject).filter(
            models.Subject.id == leave.subject_id
        ).first()
        if sub:
            subject_name = sub.name
            subject_code = sub.code

    return {
        "id": leave.id,
        "student_id": leave.student_id,
        "student_name": student_name or leave.applicant_name,
        "student_roll": student_roll,
        "student_dep": student_dep,
        "subject_id": leave.subject_id,
        "subject_name": subject_name,
        "subject_code": subject_code,
        "start_date": leave.start_date,
        "end_date": leave.end_date,
        "leave_type": leave.leave_type,
        "reason": leave.reason,
        "status": leave.status,
        "reviewed_by": leave.reviewed_by,
        "reviewed_at": leave.reviewed_at,
        "created_at": leave.created_at,
        "user_email": leave.user_email,
        "role": leave.role,
        "document_url": leave.document_url,
        "approved_by": leave.approved_by,
        "substitute_assigned": leave.substitute_assigned,
    }


# ---------------------------------------------------------------------------
# STUDENT: Apply for leave
# ---------------------------------------------------------------------------

@router.post("/apply", status_code=status.HTTP_201_CREATED)
def apply_for_leave(
    payload: schemas.LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Students apply for leave. Automatically linked to their institution.
    """
    leave = models.LeaveRequest(
        institution_id=current_student.institution_id,
        student_id=current_student.id,
        user_email=current_student.email,
        applicant_name=current_student.name,
        role="student",
        start_date=payload.start_date,
        end_date=payload.end_date,
        leave_type=payload.leave_type or "Personal",
        reason=payload.reason,
        subject_id=payload.subject_id,
        status="Pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)

    # Audit log
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_student.email,
            action=f"Student '{current_student.name}' (Roll: {current_student.roll}) applied for leave: {payload.start_date} to {payload.end_date} — Reason: {payload.reason}"
        ),
        institution_id=current_student.institution_id,
    )

    return {"message": "Leave request submitted successfully.", "leave_id": leave.id}


# ---------------------------------------------------------------------------
# STUDENT: View own leave requests
# ---------------------------------------------------------------------------

@router.get("/my-requests")
def get_my_leave_requests(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Students view their own leave requests."""
    leaves = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.student_id == current_student.id,
        models.LeaveRequest.institution_id == current_student.institution_id,
    ).order_by(models.LeaveRequest.created_at.desc()).all()

    return [_enrich_leave(db, l) for l in leaves]


# ---------------------------------------------------------------------------
# ADMIN/TEACHER: View all pending leave requests
# ---------------------------------------------------------------------------

@router.get("/pending")
def get_pending_leave_requests(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admins & Teachers view pending leave requests for their institution."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    query = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.institution_id == current_user.institution_id,
        models.LeaveRequest.status == "Pending",
    )

    # Teachers only see leaves for their department
    if current_user.role == "teacher" and current_user.department:
        dept = department or current_user.department
        # Get student IDs from that department
        student_ids = [
            s.id for s in db.query(models.StudentModel).filter(
                models.StudentModel.dep == dept,
                models.StudentModel.institution_id == current_user.institution_id,
            ).all()
        ]
        if student_ids:
            query = query.filter(models.LeaveRequest.student_id.in_(student_ids))

    leaves = query.order_by(models.LeaveRequest.created_at.desc()).all()
    return [_enrich_leave(db, l) for l in leaves]


@router.get("/all")
def get_all_leave_requests(
    status_filter: Optional[str] = None,
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admins & HODs see all leave requests with optional filters."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    query = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.institution_id == current_user.institution_id,
    )
    if status_filter:
        query = query.filter(models.LeaveRequest.status == status_filter)

    if department:
        student_ids = [
            s.id for s in db.query(models.StudentModel).filter(
                models.StudentModel.dep == department,
                models.StudentModel.institution_id == current_user.institution_id,
            ).all()
        ]
        if student_ids:
            query = query.filter(models.LeaveRequest.student_id.in_(student_ids))

    leaves = query.order_by(models.LeaveRequest.created_at.desc()).all()
    return [_enrich_leave(db, l) for l in leaves]


# ---------------------------------------------------------------------------
# ADMIN/TEACHER: Approve or Reject a leave
# ---------------------------------------------------------------------------

@router.put("/{leave_id}/review")
def review_leave_request(
    leave_id: int,
    payload: schemas.LeaveStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Approve or Reject a leave request.
    On approval: attendance is automatically marked 'Absent' (leave) for the date range.
    """
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    if payload.status not in ("Approved", "Rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'Approved' or 'Rejected'.")

    leave = _get_leave_or_404(db, leave_id, current_user.institution_id)

    if leave.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Leave request already {leave.status}. Cannot review again."
        )

    leave.status = payload.status
    leave.reviewed_by = current_user.id
    leave.approved_by = current_user.email
    leave.reviewed_at = datetime.now(IST)
    db.commit()

    # On approval: auto-mark attendance as "Absent" for the leave period
    if payload.status == "Approved" and leave.student_id:
        _auto_mark_leave_attendance(db, leave, current_user.institution_id)

    # Audit log
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"{payload.status} leave request #{leave_id} for student ID {leave.student_id} ({leave.start_date} to {leave.end_date})."
        ),
        institution_id=current_user.institution_id,
    )

    return {
        "message": f"Leave request {payload.status.lower()} successfully.",
        "leave_id": leave_id,
        "status": payload.status,
    }


def _auto_mark_leave_attendance(db: Session, leave: models.LeaveRequest, institution_id: int):
    """
    Auto-mark attendance as 'Absent' for the approved leave date range.
    Skips weekends. Does not overwrite existing 'Present' records.
    """
    try:
        fmt = "%Y-%m-%d"
        # Try alternate format DD/MM/YYYY
        def parse_date(d_str):
            for f in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
                try:
                    return datetime.strptime(d_str, f).date()
                except ValueError:
                    continue
            return None

        start = parse_date(leave.start_date)
        end = parse_date(leave.end_date)
        if not start or not end:
            return

        current = start
        while current <= end:
            # Skip weekends (Saturday=5, Sunday=6)
            if current.weekday() < 5:
                date_str = current.strftime("%d/%m/%Y")

                # Check if already Present — don't overwrite
                existing = db.query(models.AttendanceModel).filter(
                    models.AttendanceModel.id == str(leave.student_id),
                    models.AttendanceModel.date == date_str,
                    models.AttendanceModel.institution_id == institution_id,
                    models.AttendanceModel.attendance == "Present",
                ).first()

                if not existing:
                    # Check if absent record already exists
                    absent_existing = db.query(models.AttendanceModel).filter(
                        models.AttendanceModel.id == str(leave.student_id),
                        models.AttendanceModel.date == date_str,
                        models.AttendanceModel.subject_id == leave.subject_id,
                        models.AttendanceModel.institution_id == institution_id,
                    ).first()

                    if not absent_existing:
                        student = db.query(models.StudentModel).filter(
                            models.StudentModel.id == leave.student_id
                        ).first()
                        if student:
                            absent_record = models.AttendanceModel(
                                id=str(leave.student_id),
                                institution_id=institution_id,
                                roll=student.roll or "",
                                name=student.name or "",
                                department=student.dep or "",
                                time="Leave",
                                date=date_str,
                                attendance="Absent",
                                subject_id=leave.subject_id,
                            )
                            db.add(absent_record)

            from datetime import timedelta as td
            current += td(days=1)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Auto-mark leave attendance failed: {e}")


# ---------------------------------------------------------------------------
# ADMIN/TEACHER: Cancel/delete a leave request
# ---------------------------------------------------------------------------

@router.delete("/{leave_id}")
def delete_leave_request(
    leave_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admin or HOD can delete a leave request."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")
    leave = _get_leave_or_404(db, leave_id, current_user.institution_id)
    db.delete(leave)
    db.commit()
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Deleted leave request #{leave_id}."
        ),
        institution_id=current_user.institution_id,
    )
    return {"message": f"Leave request #{leave_id} deleted."}


# ---------------------------------------------------------------------------
# STUDENT: Cancel own pending leave
# ---------------------------------------------------------------------------

@router.delete("/cancel/{leave_id}")
def student_cancel_leave(
    leave_id: int,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student cancels their own pending leave request."""
    leave = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.id == leave_id,
        models.LeaveRequest.student_id == current_student.id,
        models.LeaveRequest.institution_id == current_student.institution_id,
    ).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found.")
    if leave.status != "Pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel a leave request that is already {leave.status}."
        )
    db.delete(leave)
    db.commit()
    return {"message": "Leave request cancelled."}


# ---------------------------------------------------------------------------
# ADMIN: Statistics
# ---------------------------------------------------------------------------

@router.get("/stats")
def get_leave_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Admins get leave statistics for the institution."""
    if current_user.role not in ("admin", "hod"):
        raise HTTPException(status_code=403, detail="Admin or HOD access only.")

    total = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.institution_id == current_user.institution_id
    ).count()
    pending = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.institution_id == current_user.institution_id,
        models.LeaveRequest.status == "Pending",
    ).count()
    approved = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.institution_id == current_user.institution_id,
        models.LeaveRequest.status == "Approved",
    ).count()
    rejected = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.institution_id == current_user.institution_id,
        models.LeaveRequest.status == "Rejected",
    ).count()

    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
    }
