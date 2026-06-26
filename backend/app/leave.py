from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import crud, models, schemas, security
from .database import get_db

router = APIRouter(
    prefix="/leaves",
    tags=["leaves"],
)

@router.post("/", response_model=schemas.LeaveRequest)
def create_leave_request(
    leave_request: schemas.LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    if leave_request.student_id != current_student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create leave requests for your own account.",
        )
    if leave_request.end_date < leave_request.start_date:
        raise HTTPException(status_code=400, detail="End date cannot be before start date.")

    try:
        created = crud.create_leave_request(
            db=db,
            leave_request=leave_request,
            institution_id=current_student.institution_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_student.email,
            action=f"Student '{current_student.email}' submitted leave request #{created.id}.",
        ),
        institution_id=current_student.institution_id,
    )
    return created

@router.get("/student/{student_id}", response_model=list[schemas.LeaveRequest])
def get_leave_requests_by_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    if current_student.id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own leave requests.",
        )
    return crud.get_leave_requests_by_student(
        db=db,
        student_id=student_id,
        institution_id=current_student.institution_id,
    )

@router.get("/teacher/{teacher_id}", response_model=list[schemas.LeaveRequest])
def get_leave_requests_for_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can view leave requests.",
        )
    if current_user.role in ["teacher", "hod"] and teacher_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view leave requests assigned to your own account.",
        )
    return crud.get_all_leave_requests(db=db, institution_id=current_user.institution_id)

@router.put("/{leave_request_id}", response_model=schemas.LeaveRequest)
def update_leave_request_status(
    leave_request_id: int,
    payload: schemas.LeaveStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    if current_user.role not in ["admin", "teacher", "hod"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can update leave requests.",
        )

    try:
        updated = crud.update_leave_request_status(
            db=db,
            leave_request_id=leave_request_id,
            status=payload.status,
            institution_id=current_user.institution_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"User '{current_user.email}' marked leave request #{leave_request_id} as {payload.status}.",
        ),
        institution_id=current_user.institution_id,
    )
    return updated
