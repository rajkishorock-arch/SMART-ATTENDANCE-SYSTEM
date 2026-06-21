from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import cv2
import numpy as np
from datetime import datetime, timezone, timedelta, date

IST = timezone(timedelta(hours=5, minutes=30))

from . import crud, schemas, models, security, security_utils
from .database import get_db
from .recognition_service import recognition_service
from .email_service import send_presence_email, send_absent_email
from .core import config

router = APIRouter()


@router.get("/logs", response_model=List[schemas.Attendance])
def get_attendance_logs(
    date: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Get all attendance logs with optional filters (date, department, status) (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can view global logs."
        )
    
    subject_ids = None
    if current_user.role == "teacher":
        teacher_subjects = db.query(models.Subject).filter(models.Subject.teacher_id == current_user.id).all()
        subject_ids = [s.id for s in teacher_subjects]
        # Don't return empty - teacher might have old logs without subject_id
        # We'll filter by subject_ids in crud, which will include null-subject records from teacher's dept
        if not subject_ids:
            # No subjects assigned, return all logs (admin-fallback for teacher)
            subject_ids = None
            
    logs = crud.get_attendance_logs(
        db, 
        date_str=date, 
        department=department, 
        attendance_status=status,
        subject_ids=subject_ids
    )
    return logs


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Get aggregated dashboard stats (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can view dashboard statistics."
        )
    return crud.get_dashboard_stats(db)

@router.post("/recognize-frame")
async def recognize_and_mark_attendance(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    subject_id: Optional[int] = None,
    custom_date: Optional[str] = None,
    custom_time: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Receives a webcam frame from the browser, runs face recognition,
    and automatically logs attendance for any recognized student (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can run the attendance scanner."
        )
        
    if current_user.role == "teacher":
        if subject_id is None:
            # Auto-resolve the teacher's subject if not passed by the frontend
            subject = db.query(models.Subject).filter(models.Subject.teacher_id == current_user.id).first()
            if not subject:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Subject ID is required for teaching staff check-ins, and you have no assigned subject."
                )
            subject_id = subject.id
        else:
            subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
            if not subject or subject.teacher_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: You can only take attendance for your assigned subject."
                )

    """
    Receives a webcam frame from the browser, runs face recognition,
    and automatically logs attendance for any recognized student.
    """
    # Fetch active settings
    settings = crud.get_system_settings(db)
    
    # 1. IP Network Restriction Check
    if settings.ip_restriction_enabled:
        client_ip = security_utils.get_client_ip(request, config.TRUST_PROXY_HEADERS)
        if not security_utils.verify_client_ip(
            client_ip,
            settings.allowed_ip_ranges,
            restriction_enabled=True,
        ):
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied: IP restriction is active. Your IP ({client_ip}) is not authorized."
            )
            
    # 2. Geofencing Check
    if settings.geofencing_enabled:
        if latitude is None or longitude is None:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Geofencing is active, but your location coordinates were not provided."
            )
        if not security_utils.verify_geofence(latitude, longitude, settings.center_latitude, settings.center_longitude, settings.allowed_radius_meters):
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: You are outside the allowed campus coordinates. Check-ins are restricted to the campus boundaries."
            )

    contents = await file.read()
    if len(contents) > config.MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image file too large. Maximum size is 5MB.")
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed.")
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image frame.")

    # Refresh student records from DB to ensure memory cache is current
    recognition_service.load_student_records(db)

    # Perform face recognition
    try:
        results = recognition_service.recognize_faces_in_frame(img)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition engine error: {str(e)}")

    marked_students = []
    for face in results:
        user_id = face["user_id"]
        name = face["name"]
        roll = face["roll"]
        dep = face["dep"]
        
        # Mark attendance in database + CSV
        db_attendance, newly_marked = crud.mark_student_attendance(
            db, 
            student_id=user_id, 
            name=name, 
            roll=roll, 
            dep=dep, 
            subject_id=subject_id,
            custom_date=custom_date,
            custom_time=custom_time
        )

        
        # If student's attendance is newly marked today, send an asynchronous confirmation email
        if newly_marked:
            student = crud.get_student_by_id(db, student_id=user_id)
            if student and student.email:
                background_tasks.add_task(
                    send_presence_email,
                    student_email=student.email,
                    student_name=name,
                    roll_no=roll,
                    time_str=db_attendance.time,
                    date_str=db_attendance.date
                )
        
        face_details = face.copy()
        face_details["newly_marked"] = newly_marked
        marked_students.append(face_details)

    return {"results": marked_students}

@router.get("/report")
def get_attendance_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    department: Optional[str] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """
    Generate cumulative attendance report in a date range for a department and/or subject.
    Teachers are scoped to their assigned subjects; students cannot use this endpoint.
    """
    role = current_user.role
    email = current_user.email

    if role == "teacher":
        if subject_id is not None:
            subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
            if not subject or subject.teacher_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: You can only view reports for your assigned subject."
                )
        else:
            first_subject = db.query(models.Subject).filter(models.Subject.teacher_id == current_user.id).first()
            if not first_subject:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No subjects assigned to this teacher."
                )
            subject_id = first_subject.id

    report = crud.get_attendance_report(
        db,
        start_date_str=start_date,
        end_date_str=end_date,
        department=department,
        subject_id=subject_id,
    )
    return report


@router.get("/my-report")
def get_student_attendance_report(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """Student-scoped attendance report for a single subject."""
    report = crud.get_attendance_report(
        db,
        department=current_student.dep,
        subject_id=subject_id,
    )
    report["students"] = [s for s in report["students"] if s["id"] == current_student.id]
    return report


@router.post("/send-absentee-alerts")
def send_absentee_alerts(
    background_tasks: BackgroundTasks,
    subject_id: Optional[int] = None,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Finds absent students (either globally or for a specific subject class today)
    and queues warning emails for them asynchronously.
    """
    today_str = datetime.now(IST).strftime("%d/%m/%Y")

    if subject_id is not None:
        subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        if current_user.role == "teacher" and subject.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized access to this subject.")
        
        # Get students belonging to that subject's department/branch
        students = db.query(models.StudentModel).filter(models.StudentModel.dep == subject.department).all()
        
        # Get student IDs who checked in for this specific subject today
        present_logs = db.query(models.AttendanceModel.id).filter(
            models.AttendanceModel.date == today_str,
            models.AttendanceModel.attendance == "Present",
            models.AttendanceModel.subject_id == subject_id
        ).all()
        present_student_ids = {log[0] for log in present_logs}
        subject_info_str = f" for subject '{subject.name}' ({subject.code})"
    else:
        if current_user.role == "teacher":
            raise HTTPException(status_code=400, detail="Subject ID is required for teaching staff.")
            
        # Global fallback (Admins only)
        students = db.query(models.StudentModel).all()
        present_logs = db.query(models.AttendanceModel.id).filter(
            models.AttendanceModel.date == today_str,
            models.AttendanceModel.attendance == "Present"
        ).all()
        present_student_ids = {log[0] for log in present_logs}
        subject_info_str = " globally"

    if not students:
        return {"message": "No students found.", "queued_count": 0}

    # Find absent students
    absent_students = []
    for student in students:
        if str(student.id) not in present_student_ids:
            absent_students.append(student)

    # Queue absentee warning emails
    queued_count = 0
    for student in absent_students:
        if student.email:
            background_tasks.add_task(
                send_absent_email,
                student_email=student.email,
                student_name=student.name or "Student",
                date_str=today_str
            )
            queued_count += 1

    # Log action in Audit logs
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Triggered absentee alert emails for {today_str}{subject_info_str}. Sent to {queued_count} students."
        )
    )

    return {
        "message": f"Successfully queued {queued_count} absentee warning emails{subject_info_str}.",
        "queued_count": queued_count
    }

from fastapi.responses import FileResponse

@router.get("/download-report-pdf")
def download_attendance_pdf_report(
    start_date: str,
    end_date: str,
    department: Optional[str] = None,
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Generate and instantly download attendance report as a PDF file (Admins & Teachers only).
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can download PDF reports."
        )

    if current_user.role == "teacher":
        if subject_id is None:
            first_subject = db.query(models.Subject).filter(models.Subject.teacher_id == current_user.id).first()
            if not first_subject:
                raise HTTPException(status_code=400, detail="No subjects assigned to this teacher.")
            subject_id = first_subject.id
        else:
            subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
            if not subject or subject.teacher_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: You can only download reports for your assigned subject."
                )
    """
    Generate and instantly download attendance report as a PDF file.
    """
    from . import pdf_service
    import os
    
    try:
        pdf_path = pdf_service.generate_attendance_pdf_report(
            db, 
            start_date_str=start_date, 
            end_date_str=end_date, 
            department=department,
            subject_id=subject_id
        )

        
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="Failed to generate PDF report.")
            
        filename = f"Attendance_Report_{start_date}_to_{end_date}.pdf"
        if department:
            filename = f"Attendance_Report_{department.replace(' ', '_')}_{start_date}_to_{end_date}.pdf"
        if subject_id:
            sub = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
            if sub:
                filename = f"Attendance_Report_{sub.code}_{start_date}_to_{end_date}.pdf"

            
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")

@router.post("/send-test-report")
def send_test_report_email(
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trigger manual execution of the weekly report and email it instantly to the Admin.
    """
    from datetime import timedelta
    from .pdf_service import generate_attendance_pdf_report
    from .email_service import send_pdf_report_email
    import os
    
    try:
        today = datetime.now(IST).date()
        monday = today - timedelta(days=today.weekday())
        start_date = monday.strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        pdf_path = generate_attendance_pdf_report(db, start_date_str=start_date, end_date_str=end_date)
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #334155; }}
                .header {{ background-color: #0f172a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 25px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }}
                .footer {{ font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Manual Attendance Summary Report (TEST)</h2>
            </div>
            <div class="content">
                <p>Hello {current_user.name},</p>
                <p>This is a manually triggered test report of the compiled weekly attendance for the period <b>{monday.strftime('%d %B %Y')}</b> to <b>{today.strftime('%d %B %Y')}</b>.</p>
                <p>The compiled PDF register is attached.</p>
                <p>Best regards,<br>SMART AI SYSTEM</p>
            </div>
        </body>
        </html>
        """
        
        send_pdf_report_email(
            recipient_email=current_user.email,
            subject=f"Manual Test Attendance Report: {start_date} to {end_date}",
            body_html=html_body,
            pdf_file_path=pdf_path
        )
        
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            
        crud.create_audit_log(
            db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                action=f"Manually triggered and sent a weekly attendance PDF report test email to {current_user.email}."
            )
        )
        return {"message": f"Test attendance report successfully emailed to {current_user.email}!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate/send test report: {str(e)}")

@router.get("/sessions-history")
def get_attendance_sessions_history(
    subject_id: Optional[int] = None,
    date_filter: Optional[str] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Get detailed attendance history grouped day-by-day (date + period) for a subject.
    Restricted to Teachers (own subject) and Admins (any subject).
    """
    from datetime import date
    
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers or administrators can view session history."
        )
        
    if current_user.role == "teacher":
        if subject_id is None:
            # Auto-resolve teacher's mapped subject
            subject = db.query(models.Subject).filter(models.Subject.teacher_id == current_user.id).first()
            if not subject:
                return []
            subject_id = subject.id
        else:
            subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
            if not subject or subject.teacher_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: You can only view session history for your assigned subject."
                )
    else: # admin
        if subject_id is None:
            # Try to default to the first available subject
            subject = db.query(models.Subject).first()
            if not subject:
                return []
            subject_id = subject.id
        else:
            subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
            if not subject:
                return []
                
    # Convert date to standard DD/MM/YYYY if provided in YYYY-MM-DD
    date_str = None
    if date_filter:
        if "-" in date_filter:
            try:
                date_str = datetime.strptime(date_filter, "%Y-%m-%d").strftime("%d/%m/%Y")
            except ValueError:
                date_str = date_filter
        else:
            date_str = date_filter

    # Collect all unique student IDs from attendance logs for this subject
    query = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.subject_id == subject_id
    )
    if date_str:
        query = query.filter(models.AttendanceModel.date == date_str)
    if period:
        query = query.filter(models.AttendanceModel.time == period)
        
    logs = query.all()
    
    # Get all student IDs that appear in logs
    logged_student_ids = set(log.id for log in logs)
    
    # Fetch students from DB: 
    # 1. All students from the subject's department (exact match)
    # 2. PLUS any students who actually have attendance logs (regardless of department)
    dept_students = db.query(models.StudentModel).filter(
        models.StudentModel.dep == subject.department
    ).all()
    dept_student_ids = set(str(s.id) for s in dept_students)
    
    # Students in logs but not in dept list (department mismatch case)
    extra_ids = logged_student_ids - dept_student_ids
    extra_students = []
    if extra_ids:
        extra_ids_int = [int(sid) for sid in extra_ids if sid.isdigit()]
        if extra_ids_int:
            extra_students = db.query(models.StudentModel).filter(
                models.StudentModel.id.in_(extra_ids_int)
            ).all()
    
    students = dept_students + extra_students
    
    # If no department students found, fall back to ALL students (robust fallback)
    if not students:
        students = db.query(models.StudentModel).all()
    
    # Group logs by (date, time) where time is the Period
    sessions_map = {}
    for log in logs:
        key = (log.date, log.time)
        if key not in sessions_map:
            sessions_map[key] = set()
        sessions_map[key].add(log.id) # Set of present student IDs
        
    # Compile the sessions history list
    history = []
    
    def parse_key_date(k):
        try:
            return datetime.strptime(k[0], "%d/%m/%Y").date()
        except ValueError:
            return date.min
            
    sorted_keys = sorted(sessions_map.keys(), key=lambda k: (parse_key_date(k), k[1]), reverse=True)
    
    for d, p in sorted_keys:
        present_student_ids = sessions_map[(d, p)]
        session_students = []
        present_count = 0
        absent_count = 0
        
        for s in students:
            is_present = str(s.id) in present_student_ids
            if is_present:
                present_count += 1
            else:
                absent_count += 1
                
            session_students.append({
                "id": s.id,
                "name": s.name,
                "roll": s.roll,
                "dep": s.dep,
                "course": s.course or "",
                "year": s.year or "",
                "semester": s.semester or "",
                "email": s.email or "",
                "phone": s.phone or "",
                "status": "Present" if is_present else "Absent"
            })
            
        history.append({
            "date": d,
            "period": p,
            "present_count": present_count,
            "absent_count": absent_count,
            "students": session_students
        })
        
    return history


