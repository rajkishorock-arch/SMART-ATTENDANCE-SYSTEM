from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Request, Body
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional, Any, Dict
import cv2
import numpy as np
import logging
import time
from datetime import datetime, timezone, timedelta, date

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))

from . import crud, schemas, models, security, security_utils, cache_service
from .period_utils import (
    resolve_period_name,
    get_period_slot_label,
    PERIOD_SLOT_LABELS,
    generate_session_key,
    validate_not_future_attendance_date,
)
from .database import get_db
from .recognition_service import recognition_service
from .notifications import push_saved_notification
from .email_service import send_presence_email, send_absent_email
from .core import config

router = APIRouter()



from .core.attendance_perimeter import enforce_attendance_perimeter

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

    # Sub-millisecond instant memory cache for attendance logs
    cache_key = f"logs:inst_{current_user.institution_id}:role_{current_user.role}:u_{current_user.id}:d_{date}:dep_{department}:st_{status}"
    cached_logs = cache_service.cache_get(cache_key)
    if cached_logs is not None:
        return cached_logs
    
    subject_ids = None
    teacher_depts = None
    if current_user.role == "teacher":
        teacher_subjects = crud.get_teacher_accessible_subjects(db, current_user)
        subject_ids = [s.id for s in teacher_subjects] if teacher_subjects else None
        teacher_depts = [s.department for s in teacher_subjects if s.department]
        if current_user.department and current_user.department not in teacher_depts:
            teacher_depts.append(current_user.department)
        if not teacher_depts:
            teacher_depts = None
            
    logs = crud.get_attendance_logs(
        db, 
        date_str=date, 
        department=department, 
        departments=teacher_depts,
        attendance_status=status,
        subject_ids=subject_ids,
        institution_id=current_user.institution_id
    )

    # Pre-fetch subjects map for the institution
    inst_subjects = db.query(models.Subject).filter(models.Subject.institution_id == current_user.institution_id).all()
    sub_map = {s.id: f"{s.name} ({s.code})" if s.code else s.name for s in inst_subjects}

    output_logs = []
    for log in logs:
        p_name = resolve_period_name(log.time)
        p_label = get_period_slot_label(p_name)
        s_name = sub_map.get(log.subject_id, "General Attendance" if not log.subject_id else f"Subject #{log.subject_id}")
        
        output_logs.append(schemas.Attendance(
            record_id=log.record_id,
            id=str(log.id),
            roll=log.roll or "",
            name=log.name or "",
            department=log.department or "",
            time=log.time or "",
            date=log.date or "",
            attendance=log.attendance or "Present",
            subject_id=log.subject_id,
            subject_name=s_name,
            period=p_name,
            period_label=p_label,
            remarks=getattr(log, "fallback_reason", None) or getattr(log, "remarks", None),
            marked_by=getattr(log, "verification_method", None)
        ))

    try:
        serialized = [
            log.dict() if hasattr(log, "dict") else log.model_dump() 
            for log in output_logs
        ]
        cache_service.cache_set(cache_key, serialized, ttl=60)
    except Exception:
        pass

    return output_logs


@router.post("/cleanup-test-logs")
def cleanup_test_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """Clean up simulated/test attendance logs so only real scanned attendance remains."""
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Staff only")
    
    # Delete test logs created at 03:21:52 for this institution only
    deleted = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.time == "03:21:52",
        models.AttendanceModel.institution_id == current_user.institution_id
    ).delete(synchronize_session=False)
    
    db.commit()
    return {"message": f"Cleaned up {deleted} test attendance records.", "deleted_count": deleted}


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

    # Sub-millisecond cache for dashboard telemetry
    cache_key = f"stats:inst_{current_user.institution_id}:role_{current_user.role}:u_{current_user.id}"
    cached_stats = cache_service.cache_get(cache_key)
    if cached_stats:
        return cached_stats
        
    if current_user.role == "teacher":
        teacher_subjects = crud.get_teacher_accessible_subjects(db, current_user)
        teacher_depts = [s.department for s in teacher_subjects if s.department]
        if current_user.department and current_user.department not in teacher_depts:
            teacher_depts.append(current_user.department)
        teacher_sub_ids = [s.id for s in teacher_subjects] if teacher_subjects else None
        
        result = crud.get_dashboard_stats(
            db, 
            institution_id=current_user.institution_id,
            departments=teacher_depts if teacher_depts else None,
            subject_ids=teacher_sub_ids
        )
    else:
        result = crud.get_dashboard_stats(db, institution_id=current_user.institution_id)

    try:
        cache_service.cache_set(cache_key, result, ttl=20)
    except Exception:
        pass
    return result

@router.post("/recognize-frame")
@router.post("/recognize-frame/")
async def recognize_and_mark_attendance(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    subject_id: Optional[int] = None,
    custom_date: Optional[str] = None,
    custom_time: Optional[str] = None,
    liveness_token: Optional[str] = None,
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

    rate_key = f"biometric:frame:{current_user.id}:{current_user.role}"
    allowed, _ = cache_service.check_and_record_rate_limit(rate_key, limit=30, ttl=60)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Biometric frame processing rate limit exceeded. Please wait a moment."
        )


    # Server-side liveness enforcement
    settings = crud.get_system_settings(db, institution_id=current_user.institution_id)
    strict_liveness = bool(getattr(settings, "liveness_strict_mode", False))
    from .liveness_service import validate_attendance_liveness
    is_valid, liveness_err = validate_attendance_liveness(
        liveness_token=liveness_token,
        user_email=current_user.email,
        strict_mode=strict_liveness
    )
    if not is_valid:
        raise HTTPException(status_code=403, detail=liveness_err)
        
    if current_user.role == "teacher":
        if subject_id is None:
            choices = crud.get_teacher_accessible_subjects(db, current_user, target_date=custom_date)
            subject = choices[0] if choices else None
            if not subject:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Subject ID is required for teaching staff check-ins, and you have no assigned subject."
                )
            subject_id = subject.id
        else:
            subject = db.query(models.Subject).filter(
                models.Subject.id == subject_id,
                models.Subject.institution_id == current_user.institution_id
            ).first()
            if not crud.teacher_can_access_subject(db, current_user, subject, target_date=custom_date):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: You can only take attendance for your assigned subject."
                )
    elif current_user.role == "admin" and subject_id is None:
        first_sub = db.query(models.Subject).filter(models.Subject.institution_id == current_user.institution_id).first()
        if first_sub:
            subject_id = first_sub.id

    if not custom_time:
        custom_time = resolve_period_name(datetime.now(IST).strftime("%H:%M:%S"))
    if not custom_date:
        custom_date = datetime.now(IST).strftime("%d/%m/%Y")
    else:
        future_err = validate_not_future_attendance_date(custom_date)
        if future_err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=future_err)

    """
    Receives a webcam frame from the browser, runs face recognition,
    and automatically logs attendance for any recognized student.
    """
    # Fetch active settings
    settings = crud.get_system_settings(db, institution_id=current_user.institution_id)
    
    enforce_attendance_perimeter(request, settings, latitude, longitude)

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
    recognition_service.load_student_records(db, institution_id=current_user.institution_id)

    # Perform face recognition with latency metrics
    t_api_start = time.perf_counter()
    try:
        results, metrics = recognition_service.recognize_faces_in_frame(
            img, 
            institution_id=current_user.institution_id,
            return_metrics=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recognition engine error: {str(e)}")

    from .models.settings import CampusSecurityPolicy
    policy = db.get(CampusSecurityPolicy, current_user.institution_id)
    active_subject = db.get(models.Subject, subject_id) if subject_id else None
    marked_students = []
    for face in results:
        user_id = face["user_id"]
        name = face["name"]
        roll = face["roll"]
        dep = face["dep"]
        if active_subject and active_subject.department and not crud.departments_match(
            db, current_user.institution_id, dep, active_subject.department
        ):
            face_details = face.copy()
            face_details["newly_marked"] = False
            face_details["already_marked"] = False
            face_details["branch_mismatch"] = True
            face_details["expected_department"] = active_subject.department
            face_details["status"] = f"Branch mismatch ({dep or 'Unassigned'} vs {active_subject.department})"
            marked_students.append(face_details)
            continue
        
        # Phase 5: Stage borderline / low-confidence face matches into review queue.
        # Map 0.80..0.99 policy similarity slider cleanly onto SFace FR_COSINE scale (0.36..0.512).
        raw_similarity = float(getattr(policy, "similarity", 0.42) or 0.42) if policy else 0.42
        effective_similarity_floor = (
            0.36 + (raw_similarity - 0.80) * 0.80
            if raw_similarity >= 0.80
            else raw_similarity
        )
        if face.get("match_quality") == "BORDERLINE" or (policy and policy.confidence_filter and float(face.get("raw_score") or 0) < effective_similarity_floor):
            today_str = custom_date or datetime.now().strftime("%d/%m/%Y")
            try:
                existing_review = db.query(models.LowConfidenceReview).filter(
                    models.LowConfidenceReview.institution_id == current_user.institution_id,
                    models.LowConfidenceReview.candidate_student_id == user_id,
                    models.LowConfidenceReview.date == today_str,
                    models.LowConfidenceReview.status == "PENDING"
                ).first()
                if not existing_review:
                    review_item = models.LowConfidenceReview(
                        institution_id=current_user.institution_id,
                        candidate_student_id=user_id,
                        candidate_roll=roll,
                        candidate_name=name,
                        similarity_score=face.get("raw_score", 0.40),
                        date=today_str,
                        session_time=custom_time or datetime.now().strftime("%I:%M:%S %p"),
                        subject_id=subject_id,
                        device_id="scanner-live",
                        status="PENDING"
                    )
                    db.add(review_item)
                    db.commit()
            except Exception as rev_err:
                try:
                    db.rollback()
                except Exception:
                    pass
                print(f"[RECOGNIZE FRAME] Warning: LowConfidenceReview staging exception: {rev_err}")
            face_details = face.copy()
            face_details["staged_for_review"] = True
            face_details["newly_marked"] = False
            marked_students.append(face_details)
            continue

        # Mark attendance in database + CSV for high-confidence verified faces
        db_attendance = None
        newly_marked = False
        try:
            db_attendance, newly_marked = crud.mark_student_attendance(
                db, 
                student_id=user_id, 
                name=name, 
                roll=roll, 
                dep=dep, 
                subject_id=subject_id,
                custom_date=custom_date,
                custom_time=custom_time,
                institution_id=current_user.institution_id
            )
        except Exception as mark_err:
            print(f"[RECOGNIZE FRAME] Warning: mark_student_attendance exception for {user_id}: {mark_err}")
            db.rollback()
            raise HTTPException(503, "Attendance could not be confirmed. Please retry.") from mark_err

        student = None
        try:
            student = crud.get_student_by_id(db, student_id=user_id, institution_id=current_user.institution_id)
        except Exception as std_err:
            print(f"[RECOGNIZE FRAME] Student lookup error for {user_id}: {std_err}")

        if newly_marked and student:
            subject = db.get(models.Subject, subject_id) if subject_id else None
            notice = models.NotificationModel(institution_id=current_user.institution_id, recipient_id=student.id,
                recipient_email=student.email, recipient_role="student", category="ATTENDANCE",
                title="Attendance confirmed", message=f"{subject.name if subject else 'Attendance'} · {custom_date} · {custom_time} · Present",
                action_url="/#/student-attendance")
            db.add(notice)
            db.commit()
            background_tasks.add_task(push_saved_notification, notice.id)
        # If student's attendance is newly marked today, send an asynchronous confirmation email
        if newly_marked and student and getattr(student, "email", None):
            try:
                rec_time = getattr(db_attendance, "time", None) or custom_time or datetime.now(IST).strftime("%H:%M:%S")
                rec_date = getattr(db_attendance, "date", None) or custom_date or datetime.now(IST).strftime("%d/%m/%Y")
                background_tasks.add_task(
                    send_presence_email,
                    student_email=student.email,
                    student_name=name,
                    roll_no=roll,
                    time_str=rec_time,
                    date_str=rec_date
                )
            except Exception as email_err:
                print(f"[RECOGNIZE FRAME] Error queueing presence email: {email_err}")
        
        face_details = face.copy()
        face_details["newly_marked"] = newly_marked
        face_details["already_marked"] = not newly_marked
        face_details["status"] = "Present" if newly_marked else "Already Marked"
        if student:
            face_photo = student.profile_pic if (student.profile_pic and student.profile_pic != "no") else None
            if not face_photo:
                try:
                    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    disk_img = os.path.join(base_dir, "data", f"tenant_{current_user.institution_id}", f"user.{user_id}.1.jpg")
                    if os.path.exists(disk_img):
                        face_photo = f"/api/v1/students/{user_id}/photo"
                except Exception:
                    pass
            face_details["photo"] = face_photo
            face_details["streak_days"] = getattr(student, "streak_days", 0) or 1
            face_details["course"] = getattr(student, "course", None)
            face_details["semester"] = getattr(student, "semester", None)
            face_details["email"] = getattr(student, "email", None)
        marked_students.append(face_details)

    if marked_students:
        for m in marked_students:
            if not (m.get("newly_marked") or m.get("already_marked")):
                continue
            event_data = {
                "event": "attendance_marked",
                "name": m["name"],
                "roll": m["roll"],
                "dep": m["dep"],
                "confidence": m.get("confidence", 0.0),
                "status": "Present" if m["newly_marked"] else "Already Marked",
                "time": datetime.now(IST).strftime("%I:%M:%S %p"),
                "date": datetime.now(IST).strftime("%d/%m/%Y"),
                "institution_id": current_user.institution_id
            }
            background_tasks.add_task(broadcast_attendance_event, event_data)
    
    metrics["server_total_ms"] = round((time.perf_counter() - t_api_start) * 1000, 2)
    enrolled_count = int(metrics.get("enrolled_count", 0) or 0)
    faces_detected = int(metrics.get("faces_detected", 0) or 0)
    diagnostic_reason = None
    if not marked_students:
        if enrolled_count == 0:
            diagnostic_reason = "no_enrolled_faces"
        elif faces_detected == 0:
            diagnostic_reason = "no_face_in_frame"
        else:
            diagnostic_reason = "unrecognized_face"
    return {
        "results": marked_students,
        "metrics": metrics,
        "diagnostic_reason": diagnostic_reason,
        "enrolled_count": enrolled_count,
    }

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
            subject = db.query(models.Subject).filter(
                models.Subject.id == subject_id,
                models.Subject.institution_id == current_user.institution_id
            ).first()
            if not crud.teacher_can_access_subject(db, current_user, subject):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: You can only view reports for your assigned subject."
                )
        else:
            accessible = crud.get_teacher_accessible_subjects(db, current_user)
            first_subject = accessible[0] if accessible else None
            if not first_subject:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No subjects assigned to this teacher."
                )
            subject_id = first_subject.id

    cache_key = (
        f"report:inst_{current_user.institution_id}:r_{role}:u_{current_user.id}:"
        f"s_{start_date}:e_{end_date}:d_{department}:sub_{subject_id}"
    )
    cached_report = cache_service.cache_get(cache_key)
    if cached_report is not None:
        return cached_report

    report = crud.get_attendance_report(
        db,
        start_date_str=start_date,
        end_date_str=end_date,
        department=department,
        subject_id=subject_id,
        institution_id=current_user.institution_id
    )
    try:
        cache_service.cache_set(cache_key, report, ttl=30)
    except Exception:
        pass
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
        institution_id=current_student.institution_id
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
        subject = db.query(models.Subject).filter(
            models.Subject.id == subject_id,
            models.Subject.institution_id == current_user.institution_id
        ).first()
        if not subject:
            raise HTTPException(status_code=404, detail="Subject not found")
        if current_user.role == "teacher" and not crud.teacher_can_access_subject(db, current_user, subject, target_date=today_str):
            raise HTTPException(status_code=403, detail="Unauthorized access to this subject.")
        
        # Get students belonging to that subject's department/branch
        students = db.query(models.StudentModel).filter(
            models.StudentModel.dep == subject.department,
            models.StudentModel.institution_id == current_user.institution_id
        ).all()
        
        # Get student IDs who checked in for this specific subject today
        present_logs = db.query(models.AttendanceModel.id).filter(
            models.AttendanceModel.date == today_str,
            models.AttendanceModel.attendance == "Present",
            models.AttendanceModel.subject_id == subject_id,
            models.AttendanceModel.institution_id == current_user.institution_id
        ).all()
        present_student_ids = {log[0] for log in present_logs}
        subject_info_str = f" for subject '{subject.name}' ({subject.code})"
    else:
        if current_user.role == "teacher":
            raise HTTPException(status_code=400, detail="Subject ID is required for teaching staff.")
            
        # Global fallback (Admins only)
        students = db.query(models.StudentModel).filter(models.StudentModel.institution_id == current_user.institution_id).all()
        present_logs = db.query(models.AttendanceModel.id).filter(
            models.AttendanceModel.date == today_str,
            models.AttendanceModel.attendance == "Present",
            models.AttendanceModel.institution_id == current_user.institution_id
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
        parent = db.query(models.ParentAccount).filter(
            models.ParentAccount.student_id == student.id,
            models.ParentAccount.institution_id == current_user.institution_id,
        ).first()
        if parent and (parent.notify_sms or parent.notify_whatsapp):
            from .notification_service import notify_parent_absent
            background_tasks.add_task(
                notify_parent_absent,
                parent.phone or student.parent_phone,
                parent.email,
                student.name or "Student",
                today_str,
                parent.notify_sms,
                parent.notify_whatsapp,
            )

    # Log action in Audit logs
    crud.create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Triggered absentee alert emails for {today_str}{subject_info_str}. Sent to {queued_count} students."
        ),
        institution_id=current_user.institution_id
    )

    try:
        cache_service.cache_delete_pattern(f"stats:inst_{current_user.institution_id}")
        cache_service.cache_delete_pattern(f"sessions:inst_{current_user.institution_id}")
        cache_service.cache_delete_pattern(f"logs:inst_{current_user.institution_id}")
        cache_service.cache_delete_pattern(f"report:inst_{current_user.institution_id}")
    except Exception:
        pass

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
            accessible = crud.get_teacher_accessible_subjects(db, current_user)
            first_subject = accessible[0] if accessible else None
            if not first_subject:
                raise HTTPException(status_code=400, detail="No subjects assigned to this teacher.")
            subject_id = first_subject.id
        else:
            subject = db.query(models.Subject).filter(
                models.Subject.id == subject_id,
                models.Subject.institution_id == current_user.institution_id
            ).first()
            if not crud.teacher_can_access_subject(db, current_user, subject):
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
            subject_id=subject_id,
            institution_id=current_user.institution_id
        )

        
        if not pdf_path or not os.path.exists(pdf_path):
            raise HTTPException(status_code=404, detail="Failed to generate PDF report.")
            
        filename = f"Attendance_Report_{start_date}_to_{end_date}.pdf"
        if department:
            filename = f"Attendance_Report_{department.replace(' ', '_')}_{start_date}_to_{end_date}.pdf"
        if subject_id:
            sub = db.query(models.Subject).filter(
                models.Subject.id == subject_id,
                models.Subject.institution_id == current_user.institution_id
            ).first()
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
        
        pdf_path = generate_attendance_pdf_report(db, start_date_str=start_date, end_date_str=end_date, institution_id=current_user.institution_id)
        
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
                <p>Best regards,<br>SMART ATTENDANCE SYSTEM</p>
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
            ),
            institution_id=current_user.institution_id
        )
        return {"message": f"Test attendance report successfully emailed to {current_user.email}!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate/send test report: {str(e)}")

@router.get("/my-calendar")
def get_student_attendance_calendar(
    db: Session = Depends(get_db),
    current_student: models.StudentModel = Depends(security.get_current_student),
):
    """
    Returns student's own attendance records grouped by subject and date.
    Used for the Subject-wise Attendance Blueprint Calendar.
    """
    try:
        # Fetch all subjects for this institution
        subjects = db.query(models.Subject).filter(
            models.Subject.institution_id == current_student.institution_id
        ).all()

        # Strict matching for student records to eliminate cross-student collisions:
        student_roll = str(current_student.roll).strip() if current_student.roll else None
        student_name = str(current_student.name).strip() if current_student.name else None

        student_matches = [
            models.AttendanceModel.id.like(f"{current_student.id}_%")
        ]
        if student_roll:
            student_matches.append(models.AttendanceModel.roll == student_roll)
            student_matches.append(models.AttendanceModel.id.like(f"{student_roll}_%"))

        if student_name and student_roll:
            student_matches.append(
                and_(
                    models.AttendanceModel.id == str(current_student.id),
                    or_(
                        models.AttendanceModel.roll == student_roll,
                        models.AttendanceModel.name.ilike(student_name)
                    )
                )
            )
            student_matches.append(
                and_(
                    models.AttendanceModel.name.ilike(student_name),
                    models.AttendanceModel.roll == student_roll
                )
            )
        elif student_roll:
            student_matches.append(models.AttendanceModel.roll == student_roll)
        elif student_name:
            student_matches.append(models.AttendanceModel.name.ilike(student_name))
        else:
            student_matches.append(models.AttendanceModel.id == str(current_student.id))

        logs = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.institution_id == current_student.institution_id,
            or_(*student_matches)
        ).all()

        # Group logs by subject_id -> { date -> status }
        subject_calendar = {}
        for log in logs:
            sub_id = log.subject_id if log.subject_id is not None else 0
            if sub_id not in subject_calendar:
                subject_calendar[sub_id] = {}

            # Support both DD/MM/YYYY and YYYY-MM-DD formats for frontend calendar lookup
            raw_date = str(log.date or "").strip()
            if "-" in raw_date and len(raw_date) == 10:
                try:
                    parts = raw_date.split("-")
                    formatted_date = f"{parts[2]}/{parts[1]}/{parts[0]}"
                except Exception:
                    formatted_date = raw_date
            else:
                formatted_date = raw_date

            status_val = log.attendance or "Present"
            subject_calendar[sub_id][formatted_date] = status_val
            subject_calendar[sub_id][raw_date] = status_val

        # Build response
        result = []
        found_sub_ids = set()
        for subject in subjects:
            # Only include subjects for student's department or subjects that have logs
            if subject.department and current_student.dep and subject.department.strip().lower() != current_student.dep.strip().lower():
                if subject.id not in subject_calendar:
                    continue
            cal = subject_calendar.get(subject.id, {})
            result.append({
                "subject_id": subject.id,
                "subject_name": subject.name,
                "subject_code": subject.code,
                "department": subject.department or "",
                "calendar": cal  # { "25/06/2026": "Present", "24/06/2026": "Absent", ... }
            })
            found_sub_ids.add(subject.id)

        # Include any logged subjects that weren't in institution subjects list
        for sub_id, cal in subject_calendar.items():
            if sub_id != 0 and sub_id not in found_sub_ids and cal:
                result.append({
                    "subject_id": sub_id,
                    "subject_name": f"Subject #{sub_id}",
                    "subject_code": f"SUB{sub_id}",
                    "department": current_student.dep or "",
                    "calendar": cal
                })

        # If general logs exist (subject_id == 0) and not already covered
        if 0 in subject_calendar and subject_calendar[0]:
            result.insert(0, {
                "subject_id": 0,
                "subject_name": "General Attendance",
                "subject_code": "GEN",
                "department": current_student.dep or "",
                "calendar": subject_calendar[0]
            })

        return result
    except Exception as e:
        logger.error(f"Error compiling student blueprint calendar: {e}", exc_info=True)
        return []


@router.post("/manual")
def mark_manual_attendance_bulk(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
    request: Request = None,
    background_tasks: BackgroundTasks = None
):
    """
    Bulk manual attendance marking. Accepts a list of student attendance records
    and saves each one to the DB (same table as face recognition attendance).
    This ensures manual records appear in Session History.
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only teachers and admins can mark manual attendance."
        )

    settings = crud.get_system_settings(db, institution_id=current_user.institution_id)
    enforce_attendance_perimeter(request, settings, payload.get("latitude"), payload.get("longitude"))
    records = payload.get("records", [])
    if not records:
        raise HTTPException(status_code=400, detail="No records provided.")

    for rec in records:
        if rec.get("custom_date"):
            future_err = validate_not_future_attendance_date(rec.get("custom_date"))
            if future_err:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=future_err)

    success_count = 0
    fail_count = 0
    errors = []

    for rec in records:
        try:
            raw_student_id = rec.get("student_id", "")
            if not raw_student_id and raw_student_id != 0:
                fail_count += 1
                errors.append("Missing student ID.")
                continue
            student_id = str(raw_student_id)
            attendance_status = rec.get("attendance_status", "Present")
            raw_subject_id = rec.get("subject_id")
            try:
                subject_id = int(raw_subject_id) if raw_subject_id not in (None, "") else None
            except (ValueError, TypeError):
                subject_id = None
            custom_date = rec.get("custom_date")  # YYYY-MM-DD
            period = resolve_period_name(rec.get("period", "Period 1"))

            # Convert date to DD/MM/YYYY
            date_str = datetime.now(IST).strftime("%d/%m/%Y")
            if custom_date:
                if "-" in str(custom_date):
                    try:
                        date_str = datetime.strptime(str(custom_date), "%Y-%m-%d").strftime("%d/%m/%Y")
                    except ValueError:
                        date_str = str(custom_date)
                else:
                    date_str = str(custom_date)

            # Get subject info
            subject = None
            if subject_id:
                subject = db.query(models.Subject).filter(
                    models.Subject.id == subject_id,
                    models.Subject.institution_id == current_user.institution_id
                ).first()

            # Get student info — safe int conversion
            try:
                student_int_id = int(student_id)
            except (ValueError, TypeError):
                fail_count += 1
                errors.append(f"Invalid student ID '{student_id}'.")
                continue

            student = db.query(models.StudentModel).filter(
                models.StudentModel.id == student_int_id,
                models.StudentModel.institution_id == current_user.institution_id
            ).first()

            if not student:
                fail_count += 1
                errors.append(f"Student #{student_id} not found in this institution.")
                continue
            if not subject:
                fail_count += 1
                errors.append("Selected subject was not found in this institution.")
                continue
            if current_user.role == "teacher" and not crud.teacher_can_access_subject(db, current_user, subject, target_date=date_str):
                fail_count += 1
                errors.append(f"Subject '{subject.name}' is not assigned to your account.")
                continue
            if attendance_status not in ("Present", "Absent", "Late"):
                fail_count += 1
                errors.append(f"Invalid status '{attendance_status}'.")
                continue
            if subject.department and not crud.departments_match(
                db, current_user.institution_id, subject.department, student.dep
            ):
                fail_count += 1
                errors.append(
                    f"{student.name}: branch '{student.dep or 'Unassigned'}' does not match subject branch '{subject.department}'."
                )
                continue

            s_key = generate_session_key(current_user.institution_id, student_id, date_str, period, subject_id)
            existing = db.query(models.AttendanceModel).filter(
                or_(
                    models.AttendanceModel.session_key == s_key,
                    and_(
                        models.AttendanceModel.id == student_id,
                        models.AttendanceModel.date == date_str,
                        models.AttendanceModel.time == period,
                        models.AttendanceModel.subject_id == subject_id,
                        models.AttendanceModel.institution_id == current_user.institution_id,
                    ),
                )
            ).first()
            changed = existing is None or existing.attendance != attendance_status
            if not existing:
                existing = models.AttendanceModel(
                    id=student_id,
                    name=student.name,
                    roll=student.roll,
                    department=student.dep,
                    date=date_str,
                    time=period,
                    subject_id=subject_id,
                    institution_id=current_user.institution_id,
                    session_key=s_key,
                )
                db.add(existing)
            else:
                if not existing.session_key:
                    existing.session_key = s_key
            existing.attendance = attendance_status
            existing.verification_method = "MANUAL_STAFF"
            notice = None
            if changed:
                notice = models.NotificationModel(
                    institution_id=current_user.institution_id,
                    recipient_id=student.id,
                    recipient_email=student.email,
                    recipient_role="student",
                    category="ATTENDANCE",
                    title=f"Attendance marked {attendance_status.lower()}",
                    message=f"{subject.name} · {date_str} · {period} · {attendance_status}",
                    action_url="/#/student-attendance",
                )
                db.add(notice)
            db.commit()
            if changed and notice is not None and background_tasks is not None:
                background_tasks.add_task(push_saved_notification, notice.id)
            success_count += 1

        except Exception as e:
            db.rollback()
            fail_count += 1
            errors.append(str(e))
            continue

    # Audit log
    crud.create_audit_log(
        db=db,
        log=schemas.AuditLogCreate(
            user_email=current_user.email,
            action=f"Bulk manual attendance marked: {success_count} success, {fail_count} failed."
        ),
        institution_id=current_user.institution_id
    )

    try:
        cache_service.cache_delete_pattern(f"stats:inst_{current_user.institution_id}")
        cache_service.cache_delete_pattern(f"sessions:inst_{current_user.institution_id}")
        cache_service.cache_delete_pattern(f"logs:inst_{current_user.institution_id}")
        cache_service.cache_delete_pattern(f"report:inst_{current_user.institution_id}")
    except Exception:
        pass

    return {
        "status": "success",
        "success_count": success_count,
        "fail_count": fail_count,
        "errors": errors,
        "message": f"Manual attendance saved: {success_count} records."
    }


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

    cache_key = f"sessions:inst_{current_user.institution_id}:role_{current_user.role}:u_{current_user.id}:s_{subject_id}:d_{date_filter}:p_{period}"
    cached_res = cache_service.cache_get(cache_key)
    if cached_res is not None:
        return cached_res
        
    if current_user.role == "teacher":
        if subject_id is None:
            # Auto-resolve teacher's mapped or substituted subject
            accessible = crud.get_teacher_accessible_subjects(db, current_user)
            subject = accessible[0] if accessible else None
            if not subject:
                return []
            subject_id = subject.id
        else:
            subject = db.query(models.Subject).filter(
                models.Subject.id == subject_id,
                models.Subject.institution_id == current_user.institution_id
            ).first()
            if not crud.teacher_can_access_subject(db, current_user, subject, target_date=date_filter):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Unauthorized: You can only view session history for your assigned subject."
                )
    else: # admin
        if subject_id is None:
            # Try to default to the first available subject
            subject = db.query(models.Subject).filter(models.Subject.institution_id == current_user.institution_id).first()
            if not subject:
                return []
            subject_id = subject.id
        else:
            subject = db.query(models.Subject).filter(
                models.Subject.id == subject_id,
                models.Subject.institution_id == current_user.institution_id
            ).first()
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
        models.AttendanceModel.institution_id == current_user.institution_id
    )
    if subject_id:
        query = query.filter(
            or_(
                models.AttendanceModel.subject_id == subject_id,
                models.AttendanceModel.subject_id == None
            )
        )
    if date_str:
        query = query.filter(models.AttendanceModel.date == date_str)
        
    logs = query.all()
    
    # Target period normalization
    target_period = None
    if period and str(period).strip().lower() not in ["", "all", "all periods", "none"]:
        target_period = resolve_period_name(period)
    
    # Get all student IDs that appear in logs
    logged_student_ids = set(log.id for log in logs)
    
    inst_students = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    ).all()
    active_ids = {str(s.id) for s in inst_students}
    active_rolls = {str(s.roll).strip().casefold() for s in inst_students if s.roll and str(s.roll).strip()}

    # Fetch students from DB matching the subject's department
    dept_students = []
    if subject and subject.department:
        dept_aliases = crud.get_department_aliases(db, current_user.institution_id, subject.department)
        dept_students = [
            s for s in inst_students
            if (s.dep or "").strip().casefold() in dept_aliases
        ]
    dept_student_ids = set(str(s.id) for s in dept_students)
    
    # Students in active logs but not in dept list (department mismatch case)
    active_logs = []
    for log in logs:
        raw_id = str(log.id or "").strip()
        base_id = raw_id.split("_", 1)[0]
        roll_cf = str(log.roll or "").strip().casefold()
        if raw_id in active_ids or base_id in active_ids or (roll_cf and roll_cf in active_rolls):
            active_logs.append(log)

    logged_student_ids = set(str(log.id) for log in active_logs)
    extra_ids = logged_student_ids - dept_student_ids
    extra_students = [s for s in inst_students if str(s.id) in extra_ids]
    
    students = dept_students + extra_students
    
    # If no department students found, fall back to ALL active students
    if not students:
        students = inst_students
    
    # Group logs by (date, resolved_period)
    sessions_map = {}
    for log in active_logs:
        p_name = resolve_period_name(log.time)
        if target_period and p_name != target_period:
            continue
        key = (log.date, p_name)
        if key not in sessions_map:
            sessions_map[key] = set()
        if (log.attendance or "Present").strip().casefold() in ("present", "late"):
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
            
        p_label = get_period_slot_label(p)
        history.append({
            "date": d,
            "period": p,
            "period_label": p_label,
            "subject_id": subject.id if subject else None,
            "subject_name": subject.name if subject else "General Session",
            "subject_code": subject.code if subject else "",
            "present_count": present_count,
            "absent_count": absent_count,
            "students": session_students
        })
        
    try:
        cache_service.cache_set(cache_key, history, ttl=180)
    except Exception:
        pass
    return history

@router.put("/status")
def update_attendance_status(
    payload: schemas.ManualAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    Manually update a student's attendance status for a session.
    If the status is 'Absent', the record is removed.
    If the status is 'Present' or 'Late', a record is updated or created.
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Only teachers and admins can manually update attendance."
        )

    # Resolve date and time
    date_str = payload.custom_date
    if date_str:
        future_err = validate_not_future_attendance_date(date_str)
        if future_err:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=future_err)
    if not date_str:
        date_str = datetime.now(IST).strftime("%d/%m/%Y")
    else:
        # Convert date to standard DD/MM/YYYY if provided in YYYY-MM-DD
        if "-" in date_str:
            try:
                date_str = datetime.strptime(date_str, "%Y-%m-%d").strftime("%d/%m/%Y")
            except ValueError:
                pass

    time_str = payload.custom_time
    if not time_str:
        time_str = datetime.now(IST).strftime("%H:%M:%S")

    # Authorize teacher access (can only update attendance for their own subject)
    if current_user.role == "teacher":
        if payload.subject_id is None:
            raise HTTPException(
                status_code=400,
                detail="subject_id is required for teachers."
            )
        subject = db.query(models.Subject).filter(
            models.Subject.id == payload.subject_id,
            models.Subject.institution_id == current_user.institution_id
        ).first()
        if not crud.teacher_can_access_subject(db, current_user, subject, target_date=date_str):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized: You can only manage attendance for your assigned subjects."
            )

    try:
        crud.update_attendance_status(
            db=db,
            student_id=payload.student_id,
            date_str=date_str,
            time_str=time_str,
            status=payload.attendance_status,
            subject_id=payload.subject_id,
            institution_id=current_user.institution_id
        )
        # Log to audit trail
        crud.create_audit_log(
            db=db,
            log=schemas.AuditLogCreate(
                user_email=current_user.email,
                action=f"Manually set attendance status to {payload.attendance_status} for student ID {payload.student_id} on {date_str} {time_str}."
            ),
            institution_id=current_user.institution_id
        )
        try:
            cache_service.cache_delete_pattern(f"stats:inst_{current_user.institution_id}")
            cache_service.cache_delete_pattern(f"sessions:inst_{current_user.institution_id}")
            cache_service.cache_delete_pattern(f"logs:inst_{current_user.institution_id}")
            cache_service.cache_delete_pattern(f"report:inst_{current_user.institution_id}")
        except Exception:
            pass
        return {"status": "success", "message": "Attendance status updated successfully."}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update attendance status: {str(e)}")


@router.post("/scan-qr")
def checkin_via_student_qr(
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
    request: Request = None,
    background_tasks: BackgroundTasks = None
):
    """
    Teachers & Admins scan the dynamic QR Code presented on a student's phone.
    Verifies the JWT token, extracts the student details, and registers attendance instantly.
    """
    if current_user.role not in ["admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Only teachers or administrators can scan attendance QR codes.")
        
    settings = crud.get_system_settings(db, institution_id=current_user.institution_id)
    enforce_attendance_perimeter(request, settings, payload.get("latitude"), payload.get("longitude"))
    qr_token = payload.get("token")
    subject_id = payload.get("subject_id")
    
    if not qr_token:
        raise HTTPException(status_code=400, detail="QR check-in token is required.")
        
    from jose import jwt, JWTError
    import time
    
    # 1. Decode and verify the student's dynamic token signature
    try:
        data = jwt.decode(qr_token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid check-in token. Please ask the student to refresh the QR code.")
        
    # 2. Check token expiration
    exp = data.get("exp")
    if not exp or int(time.time()) > exp:
        raise HTTPException(status_code=400, detail="QR code has expired. Please ask the student to refresh their screen.")

    # 3. Check required claims
    student_id = data.get("student_id")
    institution_id = data.get("institution_id")

    # 3. Security validation: make sure the student belongs to the scanner's institution
    if institution_id != current_user.institution_id:
        raise HTTPException(status_code=400, detail="Access Denied: Student belongs to another workspace.")

    # 4. Check required claims
    token_type = data.get("type") or data.get("purpose")
    if token_type and token_type != "qr_checkin":
        raise HTTPException(status_code=400, detail="Invalid token type.")

    jti = data.get("jti")
    if not jti:
        import hashlib
        jti = hashlib.sha256(qr_token.encode()).hexdigest()

    if not student_id or not institution_id:
        raise HTTPException(status_code=400, detail="Malformed QR token: missing student or tenant claims.")
        
    # 5. Fetch student model
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == institution_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    if current_user.role == "teacher":
        accessible = crud.get_teacher_accessible_subjects(db, current_user, target_date=datetime.now(IST).strftime("%d/%m/%Y"))
        if subject_id:
            subject = next((s for s in accessible if s.id == subject_id), None)
        else:
            subject = accessible[0] if len(accessible) == 1 else None
    else:
        subjects_q = db.query(models.Subject).filter_by(institution_id=institution_id)
        subject = subjects_q.filter_by(id=subject_id).first() if subject_id else None
    if not subject:
        raise HTTPException(status_code=400, detail="Select an assigned subject before scanning.")
    active_subject_id = subject.id

    def record_result(title, message):
        notice = models.NotificationModel(institution_id=institution_id, recipient_id=student.id,
            recipient_email=student.email, recipient_role="student", category="QR_CHECKIN",
            title=title, message=message, action_url="/#/student-attendance", is_read=False)
        db.add(notice)
        db.flush()
        if background_tasks is not None:
            background_tasks.add_task(push_saved_notification, notice.id)

    # 6. Replay protection: atomically consume the jti
    from sqlalchemy.exc import IntegrityError
    import threading
    if not hasattr(checkin_via_student_qr, "_lock"):
        checkin_via_student_qr._lock = threading.Lock()

    with checkin_via_student_qr._lock:
        consumed = db.query(models.ConsumedQrToken).filter(
            models.ConsumedQrToken.institution_id == current_user.institution_id,
            models.ConsumedQrToken.jti == jti
        ).first()
        if consumed:
            raise HTTPException(status_code=409, detail="QR token has already been used.")

        exp_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
        token_record = models.ConsumedQrToken(
            institution_id=current_user.institution_id,
            jti=jti,
            student_id=student.id,
            token_type="student_qr",
            expires_at=exp_dt
        )
        db.add(token_record)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail="QR token has already been used.")
            
        branch = (student.dep or "").strip()
        required = (subject.department or "").strip()
        if required and not crud.departments_match(db, institution_id, branch, required):
            message = f"Attendance not marked for {subject.name}. Class branch: {required or 'unassigned'}. Student branch: {branch or 'unassigned'}."
            record_result("Branch mismatch", message)
            db.commit()
            raise HTTPException(status_code=422, detail=message)

        # 8. Transactionally coordinated attendance creation/update
        now = datetime.now(timezone(timedelta(hours=5, minutes=30))) # India standard time
        time_str = now.strftime("%I:%M:%S %p")
        date_str = now.strftime("%d/%m/%Y")
        legacy_id = f"{student.id}_{now.strftime('%Y-%m-%d')}_{active_subject_id or 'none'}"
        attendance_id = str(student.id)
        period = payload.get("period") or resolve_period_name(now.strftime("%H:%M:%S"))
        session_key = generate_session_key(institution_id, attendance_id, date_str, period, active_subject_id)

        try:
            db_attendance = db.query(models.AttendanceModel).filter(
                or_(models.AttendanceModel.id == legacy_id, models.AttendanceModel.session_key == session_key),
                models.AttendanceModel.institution_id == current_user.institution_id
            ).first()
            
            if db_attendance:
                db_attendance.attendance = "Present"

            else:
                s_key = session_key
                db_attendance = models.AttendanceModel(
                    id=attendance_id,
                    institution_id=institution_id,
                    roll=student.roll,
                    name=student.name,
                    department=student.dep,
                    time=time_str,
                    date=date_str,
                    attendance="Present",
                    subject_id=active_subject_id,
                    session_key=s_key
                )
                db.add(db_attendance)
                
            record_result("Attendance confirmed", f"{subject.name} · Present · {time_str}")
            # Log to audit trail
            crud.create_audit_log(
                db=db,
                log=schemas.AuditLogCreate(
                    user_email=current_user.email,
                    action=f"Scanned QR Code and marked student '{student.name}' (Roll: {student.roll}) PRESENT."
                ),
                institution_id=current_user.institution_id
            )

            db.commit()
        except IntegrityError:
            db.rollback()
            already_used = db.query(models.ConsumedQrToken).filter(
                models.ConsumedQrToken.institution_id == current_user.institution_id,
                models.ConsumedQrToken.jti == jti
            ).first()
            if already_used:
                raise HTTPException(status_code=409, detail="QR token has already been used.")
            raise HTTPException(status_code=409, detail="Concurrent conflict: QR token already consumed.")
        except HTTPException:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise HTTPException(status_code=500, detail="Failed to record attendance.")

    
    return {
        "status": "success",
        "message": f"Successfully checked in {student.name} (Roll: {student.roll})!",
        "student": {
            "id": student.id,
            "name": student.name,
            "roll": student.roll,
            "dep": student.dep,
            "course": student.course
        }
    }




from fastapi import WebSocket, WebSocketDisconnect
from typing import List
from jose import jwt, JWTError
from .core import config

active_connections: List[WebSocket] = []

@router.websocket("/ws")
async def attendance_websocket_endpoint(websocket: WebSocket, token: str = None):
    institution_id = None
    if token:
        try:
            payload = jwt.decode(token, config.JWT_SECRET_KEY, algorithms=[config.ALGORITHM])
            institution_id = payload.get("institution_id")
        except JWTError:
            await websocket.close(code=4001)
            return
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception:
        if websocket in active_connections:
            active_connections.remove(websocket)

async def broadcast_attendance_event(event_data: dict):
    inst_id = event_data.get("institution_id")
    if inst_id:
        try:
            cache_service.cache_delete_pattern(f"stats:inst_{inst_id}")
            cache_service.cache_delete_pattern(f"sessions:inst_{inst_id}")
            cache_service.cache_delete_pattern(f"logs:inst_{inst_id}")
            cache_service.cache_delete_pattern(f"report:inst_{inst_id}")
        except Exception:
            pass

    if not active_connections:
        return
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(event_data)
        except Exception:
            disconnected.append(connection)
    
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)



