"""
Feature 36: Automated Seating Chart with Face Verify
Generates classroom seating based on roll numbers.
Face recognition verifies students are sitting in assigned seats.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import json, cv2, numpy as np

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _auto_assign_seats(students: list, rows: int, cols: int) -> list:
    """Auto-assign students to seats sorted by roll number."""
    sorted_students = sorted(students, key=lambda s: s.roll or "")
    seats = []
    for idx, student in enumerate(sorted_students):
        row = idx // cols
        col = idx % cols
        if row >= rows:
            break
        seats.append({
            "row": row + 1,
            "col": col + 1,
            "seat_label": f"R{row+1}C{col+1}",
            "student_id": student.id,
            "student_name": student.name,
            "roll": student.roll,
            "dep": student.dep,
        })
    return seats


@router.post("/generate")
def generate_seating_chart(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Generate an automated seating chart for a subject or exam session."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    room_name = payload.get("room_name", "Main Hall")
    rows = int(payload.get("rows", 5))
    cols = int(payload.get("cols", 6))
    subject_id = payload.get("subject_id")
    exam_session_id = payload.get("exam_session_id")
    department = payload.get("department")

    query = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    )
    if department:
        query = query.filter(models.StudentModel.dep == department)
    elif subject_id:
        sub = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
        if sub:
            query = query.filter(models.StudentModel.dep == sub.department)

    students = query.order_by(models.StudentModel.roll).all()
    if not students:
        raise HTTPException(status_code=404, detail="No students found for the given criteria.")

    seats = _auto_assign_seats(students, rows, cols)

    chart = models.SeatingChart(
        institution_id=current_user.institution_id,
        subject_id=subject_id,
        exam_session_id=exam_session_id,
        room_name=room_name,
        rows=rows,
        cols=cols,
        seats_json=json.dumps(seats),
        created_by=current_user.email,
    )
    db.add(chart)
    db.commit()
    db.refresh(chart)

    return {
        "chart_id": chart.id,
        "room_name": room_name,
        "rows": rows,
        "cols": cols,
        "total_students_seated": len(seats),
        "seats": seats,
    }


@router.get("/{chart_id}")
def get_seating_chart(
    chart_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Get a specific seating chart."""
    chart = db.query(models.SeatingChart).filter(
        models.SeatingChart.id == chart_id,
        models.SeatingChart.institution_id == current_user.institution_id,
    ).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Seating chart not found.")
    return {
        "id": chart.id,
        "room_name": chart.room_name,
        "rows": chart.rows,
        "cols": chart.cols,
        "seats": json.loads(chart.seats_json),
        "created_by": chart.created_by,
        "created_at": chart.created_at,
    }


@router.get("/")
def list_seating_charts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """List all seating charts for the institution."""
    charts = db.query(models.SeatingChart).filter(
        models.SeatingChart.institution_id == current_user.institution_id
    ).order_by(models.SeatingChart.created_at.desc()).limit(20).all()
    return [
        {
            "id": c.id, "room_name": c.room_name,
            "rows": c.rows, "cols": c.cols,
            "created_by": c.created_by, "created_at": c.created_at,
        }
        for c in charts
    ]


@router.post("/{chart_id}/verify-seat")
async def verify_student_seat(
    chart_id: int,
    file: UploadFile = File(...),
    seat_label: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Scan a student's face at a specific seat to verify they are sitting correctly.
    """
    chart = db.query(models.SeatingChart).filter(
        models.SeatingChart.id == chart_id,
        models.SeatingChart.institution_id == current_user.institution_id,
    ).first()
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found.")

    seats = json.loads(chart.seats_json)
    assigned_seat = next((s for s in seats if s.get("seat_label") == seat_label), None)
    if not assigned_seat:
        raise HTTPException(status_code=404, detail=f"Seat '{seat_label}' not found in chart.")

    expected_student_id = assigned_seat.get("student_id")
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == expected_student_id
    ).first()
    if not student or not student.face_embedding:
        return {"verified": False, "reason": "Student has no enrolled face."}

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image.")

    # Face verification
    try:
        from .proxy_detection import _compare_face_with_student
        score = _compare_face_with_student(img, student.face_embedding)
        verified = score >= 0.43
    except Exception as e:
        return {"verified": False, "reason": f"Verification error: {str(e)}"}

    return {
        "seat_label": seat_label,
        "expected_student": {"id": student.id, "name": student.name, "roll": student.roll},
        "verified": verified,
        "match_score": round(score, 3),
        "message": "Correct student at seat." if verified else "Wrong student or different person detected!",
    }
