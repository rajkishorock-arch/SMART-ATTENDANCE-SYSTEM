from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from . import crud, models, schemas
from .database import get_db

router = APIRouter(
    prefix="/api/v1/leaves",
    tags=["leaves"],
)

@router.post("/", response_model=schemas.LeaveRequest)
def create_leave_request(
    leave_request: schemas.LeaveRequestCreate, 
    db: Session = Depends(get_db)
):
    return crud.create_leave_request(db=db, leave_request=leave_request)

@router.get("/student/{student_id}", response_model=list[schemas.LeaveRequest])
def get_leave_requests_by_student(
    student_id: int, 
    db: Session = Depends(get_db)
):
    return crud.get_leave_requests_by_student(db=db, student_id=student_id)

@router.get("/teacher/{teacher_id}", response_model=list[schemas.LeaveRequest])
def get_leave_requests_for_teacher(
    teacher_id: int, 
    db: Session = Depends(get_db)
):
    # This is a simplified example. In a real application, you'd have a more complex logic 
    # to determine which students belong to a teacher.
    return crud.get_all_leave_requests(db=db)

@router.put("/{leave_request_id}", response_model=schemas.LeaveRequest)
def update_leave_request_status(
    leave_request_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    return crud.update_leave_request_status(db=db, leave_request_id=leave_request_id, status=status)
