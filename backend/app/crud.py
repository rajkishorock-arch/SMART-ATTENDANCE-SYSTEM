import threading
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timedelta, date, timezone

IST = timezone(timedelta(hours=5, minutes=30))
_attendance_lock = threading.RLock()
from typing import Optional
from . import models, schemas, security

# --- Audit Log ---
def create_audit_log(db: Session, log: schemas.AuditLogCreate, institution_id: Optional[int] = None):
    db_log = models.AuditLog(
        user_email=log.user_email,
        action=log.action,
        role=log.role,
        entity_type=log.entity_type,
        entity_id=str(log.entity_id) if log.entity_id is not None else None,
        previous_value=log.previous_value,
        new_value=log.new_value,
        reason=log.reason,
        ip_address=log.ip_address,
        institution_id=institution_id
    )
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# --- User (Admins/Teachers) ---
def get_user_by_email(db: Session, email: str, institution_id: Optional[int] = None):
    from app.repositories.user_repository import UserRepository
    return UserRepository.get_user_by_email(db=db, email=email, institution_id=institution_id)

def create_user(db: Session, user: schemas.UserCreate, institution_id: Optional[int] = None):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        password_hash=hashed_password,
        role=user.role,
        institution_id=institution_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Student ---
def get_students(db: Session, skip: int = 0, limit: int = 100, institution_id: Optional[int] = None):
    from app.repositories.user_repository import UserRepository
    return UserRepository.get_students(db=db, skip=skip, limit=limit, institution_id=institution_id)

def get_student_by_id(db: Session, student_id: int, institution_id: Optional[int] = None):
    from app.repositories.user_repository import UserRepository
    return UserRepository.get_student_by_id(db=db, student_id=student_id, institution_id=institution_id)

def get_student_by_email(db: Session, email: str, institution_id: Optional[int] = None):
    from app.repositories.user_repository import UserRepository
    return UserRepository.get_student_by_email(db=db, email=email, institution_id=institution_id)


def update_student_password(db: Session, student_id: int, new_password_plain: str, institution_id: Optional[int] = None):
    query = db.query(models.StudentModel).filter(models.StudentModel.id == student_id)
    if institution_id is not None:
        query = query.filter(models.StudentModel.institution_id == institution_id)
    student = query.first()
    if student:
        student.password_hash = security.get_password_hash(new_password_plain)
        db.commit()
        db.refresh(student)
        return student
    return None

def get_all_user_details_for_recognition(db: Session, institution_id: Optional[int] = None):
    query = db.query(models.StudentModel)
    if institution_id is not None:
        query = query.filter(models.StudentModel.institution_id == institution_id)
    students = query.all()
    return {
        s.id: {
            "name": s.name,
            "roll": s.roll,
            "dep": s.dep,
            "course": s.course,
            "year": s.year,
            "semester": s.semester
        } for s in students
    }

def create_student(db: Session, student: schemas.StudentCreate, institution_id: Optional[int] = None):
    db_student = models.StudentModel(**student.dict())
    if institution_id is not None:
        db_student.institution_id = institution_id
    if student.roll:
        db_student.password_hash = security.get_password_hash(student.roll)
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def delete_student(db: Session, student_id: int, institution_id: Optional[int] = None):
    query = db.query(models.StudentModel).filter(models.StudentModel.id == student_id)
    if institution_id is not None:
        query = query.filter(models.StudentModel.institution_id == institution_id)
    db_student = query.first()
    if db_student:
        target_inst_id = db_student.institution_id
        # Also delete related attendance logs
        attn_query = db.query(models.AttendanceModel).filter(models.AttendanceModel.id == str(student_id))
        if institution_id is not None:
            attn_query = attn_query.filter(models.AttendanceModel.institution_id == institution_id)
        attn_query.delete()
        db.delete(db_student)
        db.commit()

        # Invalidate and refresh in-memory recognition service cache
        try:
            from app.recognition_service import recognition_service
            if target_inst_id is not None:
                recognition_service.invalidate_cache(target_inst_id)
                recognition_service.load_student_records(db, institution_id=target_inst_id)
        except Exception:
            pass

        return True
    return False

# --- Attendance ---
def get_attendance_logs(
    db: Session, 
    date_str: Optional[str] = None, 
    department: Optional[str] = None, 
    departments: Optional[list] = None,
    attendance_status: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 200,
    subject_ids: Optional[list] = None,
    institution_id: Optional[int] = None
):
    from sqlalchemy import or_, and_
    query = db.query(models.AttendanceModel)
    if institution_id is not None:
        query = query.filter(models.AttendanceModel.institution_id == institution_id)
    if date_str:
        query = query.filter(models.AttendanceModel.date == date_str)
    if department:
        query = query.filter(models.AttendanceModel.department == department)
    elif departments:
        query = query.filter(models.AttendanceModel.department.in_(departments))
    if attendance_status:
        query = query.filter(models.AttendanceModel.attendance == attendance_status)
    if subject_ids is not None:
        if departments:
            # Teacher view: match teacher's subjects OR null-subject records within teacher's department
            query = query.filter(
                or_(
                    models.AttendanceModel.subject_id.in_(subject_ids),
                    and_(
                        models.AttendanceModel.subject_id == None,
                        models.AttendanceModel.department.in_(departments)
                    )
                )
            )
        else:
            query = query.filter(
                or_(
                    models.AttendanceModel.subject_id.in_(subject_ids),
                    models.AttendanceModel.subject_id == None
                )
            )
    return query.order_by(models.AttendanceModel.id.desc()).offset(skip).limit(limit).all()

def get_dashboard_stats(
    db: Session, 
    institution_id: Optional[int] = None,
    department: Optional[str] = None,
    departments: Optional[list] = None,
    subject_ids: Optional[list] = None
):
    from sqlalchemy import or_
    today_str = datetime.now(IST).strftime("%d/%m/%Y")
    today_dash = datetime.now(IST).strftime("%Y-%m-%d")
    
    student_query = db.query(models.StudentModel)
    attn_query = db.query(models.AttendanceModel)
    
    if institution_id is not None:
        student_query = student_query.filter(
            or_(
                models.StudentModel.institution_id == institution_id,
                models.StudentModel.institution_id.is_(None)
            )
        )
        attn_query = attn_query.filter(
            or_(
                models.AttendanceModel.institution_id == institution_id,
                models.AttendanceModel.institution_id.is_(None)
            )
        )
        
    active_depts = []
    if department:
        active_depts.append(department)
    if departments:
        for d in departments:
            if d and d not in active_depts:
                active_depts.append(d)
                
    if active_depts:
        student_query = student_query.filter(models.StudentModel.dep.in_(active_depts))
        if subject_ids:
            attn_query = attn_query.filter(
                or_(
                    models.AttendanceModel.department.in_(active_depts),
                    models.AttendanceModel.subject_id.in_(subject_ids)
                )
            )
        else:
            attn_query = attn_query.filter(models.AttendanceModel.department.in_(active_depts))
    elif subject_ids:
        attn_query = attn_query.filter(models.AttendanceModel.subject_id.in_(subject_ids))
        
    total_students = student_query.count()
    
    today_logs_count = attn_query.filter(
        or_(
            models.AttendanceModel.date == today_str,
            models.AttendanceModel.date == today_dash
        )
    ).count()

    if today_logs_count == 0:
        total_present_today = 0
        total_absent_today = 0
        avg_rate = 0.0
    else:
        total_present_today = attn_query.filter(
            or_(
                models.AttendanceModel.date == today_str,
                models.AttendanceModel.date == today_dash
            ),
            models.AttendanceModel.attendance == "Present"
        ).count()
        
        total_absent_today = max(0, total_students - total_present_today)
        avg_rate = (total_present_today / total_students * 100.0) if total_students > 0 else 0.0
    
    # Department stats (present today)
    q = db.query(
        models.AttendanceModel.department,
        func.count(models.AttendanceModel.id)
    ).filter(
        or_(
            models.AttendanceModel.date == today_str,
            models.AttendanceModel.date == today_dash
        ),
        models.AttendanceModel.attendance == "Present"
    )
    if institution_id is not None:
        q = q.filter(
            or_(
                models.AttendanceModel.institution_id == institution_id,
                models.AttendanceModel.institution_id.is_(None)
            )
        )
    if active_depts:
        q = q.filter(models.AttendanceModel.department.in_(active_depts))
    elif subject_ids:
        q = q.filter(models.AttendanceModel.subject_id.in_(subject_ids))
        
    dept_counts = q.group_by(models.AttendanceModel.department).all()
    department_stats = {dept or "Unknown": count for dept, count in dept_counts}
    
    # Weekly trends
    weekly_trends = []
    for i in range(6, -1, -1):
        day = datetime.now(IST) - timedelta(days=i)
        day_str = day.strftime("%d/%m/%Y")
        day_dash_item = day.strftime("%Y-%m-%d")
        day_label = day.strftime("%a")
        
        count = attn_query.filter(
            or_(
                models.AttendanceModel.date == day_str,
                models.AttendanceModel.date == day_dash_item
            ),
            models.AttendanceModel.attendance == "Present"
        ).count()
        
        weekly_trends.append({
            "date": day_str,
            "day": day_label,
            "present": count
        })
        
    return {
        "total_students": total_students,
        "total_present_today": total_present_today,
        "total_absent_today": total_absent_today,
        "average_attendance_rate": round(avg_rate, 2),
        "department_stats": department_stats,
        "weekly_trends": weekly_trends
    }

def mark_student_attendance(
    db: Session, 
    student_id: int, 
    name: str, 
    roll: str, 
    dep: str, 
    subject_id: Optional[int] = None,
    custom_date: Optional[str] = None,
    custom_time: Optional[str] = None,
    institution_id: Optional[int] = None,
    commit: bool = True
):
    """Delegates to canonical AttendanceService while maintaining 100% signature compatibility."""
    from app.services.attendance_service import AttendanceService
    return AttendanceService.mark_attendance(
        db=db,
        student_id=student_id,
        name=name,
        roll=roll,
        dep=dep,
        subject_id=subject_id,
        custom_date=custom_date,
        custom_time=custom_time,
        institution_id=institution_id,
        commit=commit
    )



def get_attendance_report(
    db: Session,
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    department: Optional[str] = None,
    subject_id: Optional[int] = None,
    institution_id: Optional[int] = None
):
    if subject_id is not None and not department:
        subj_q = db.query(models.Subject).filter(models.Subject.id == subject_id)
        if institution_id is not None:
            subj_q = subj_q.filter(models.Subject.institution_id == institution_id)
        subject = subj_q.first()
        if subject:
            department = subject.department

    # Parse dates from format YYYY-MM-DD
    start_date = None
    end_date = None
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
        except ValueError:
            pass
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
        except ValueError:
            pass

    def parse_date_str(d_str: str) -> Optional[date]:
        try:
            return datetime.strptime(d_str.strip(), "%d/%m/%Y").date()
        except ValueError:
            return None

    # Fetch attendance logs for this subject
    attendance_query = db.query(models.AttendanceModel).filter(models.AttendanceModel.attendance == "Present")
    if institution_id is not None:
        attendance_query = attendance_query.filter(models.AttendanceModel.institution_id == institution_id)
        
    if subject_id is not None:
        attendance_query = attendance_query.filter(models.AttendanceModel.subject_id == subject_id)
    elif department:
        attendance_query = attendance_query.filter(models.AttendanceModel.department == department)
        
    all_logs = attendance_query.all()
    
    system_dates = set()
    for log in all_logs:
        log_date = parse_date_str(log.date)
        if log_date:
            if start_date and log_date < start_date:
                continue
            if end_date and log_date > end_date:
                continue
            system_dates.add(log.date)

    total_working_days = len(system_dates)

    # Fetch students: first try by department, then fall back to students from attendance logs
    student_query = db.query(models.StudentModel)
    if institution_id is not None:
        student_query = student_query.filter(models.StudentModel.institution_id == institution_id)
        
    if department:
        students = student_query.filter(models.StudentModel.dep == department).all()
        # Fallback: if no dept match, get students from attendance logs
        if not students and subject_id is not None:
            logged_ids_raw = [log.id for log in all_logs if log.id and log.id.isdigit()]
            logged_ids = list(set(int(i) for i in logged_ids_raw))
            if logged_ids:
                students = student_query.filter(
                    models.StudentModel.id.in_(logged_ids)
                ).all()
        # Last resort: all students
        if not students:
            students = student_query.all()
    else:
        students = student_query.all()

    from collections import Counter
    presents_count = Counter()
    for log in all_logs:
        log_date = parse_date_str(log.date)
        if log_date:
            if start_date and log_date < start_date:
                continue
            if end_date and log_date > end_date:
                continue
            presents_count[log.id] += 1

    student_reports = []
    for s in students:
        present_days = presents_count[str(s.id)]
        effective_total = max(total_working_days, present_days)
        raw_percentage = (present_days / effective_total * 100.0) if effective_total > 0 else 0.0
        percentage = min(100.0, max(0.0, round(raw_percentage, 2)))
        low_attendance = percentage < 75.0 and effective_total > 0

        student_reports.append({
            "id": s.id,
            "roll": s.roll,
            "name": s.name,
            "dep": s.dep,
            "present_days": present_days,
            "total_days": effective_total,
            "percentage": percentage,
            "low_attendance": low_attendance
        })

    # Sort: low attendance warning first, then percentage ascending
    sorted_reports = sorted(student_reports, key=lambda x: (not x["low_attendance"], x["percentage"]))

    return {
        "total_working_days": total_working_days,
        "students": sorted_reports
    }


def get_system_settings(db: Session, institution_id: Optional[int] = None) -> models.SystemSettings:
    """
    Get system settings. Creates a default row if it does not exist.
    """
    from app.repositories.settings_repository import SettingsRepository
    return SettingsRepository.get_system_settings(db=db, institution_id=institution_id)

def update_system_settings(db: Session, update_data: schemas.SystemSettingsUpdate, institution_id: Optional[int] = None) -> models.SystemSettings:
    """
    Updates the system settings row.
    """
    from app.repositories.settings_repository import SettingsRepository
    return SettingsRepository.update_system_settings(db=db, settings_in=update_data, institution_id=institution_id)


def create_subject(db: Session, subject: schemas.SubjectCreate, institution_id: Optional[int] = None) -> models.Subject:
    db_subject = models.Subject(
        name=subject.name,
        code=subject.code,
        department=subject.department,
        teacher_id=subject.teacher_id,
        institution_id=institution_id
    )
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def get_subjects(db: Session, department: str = None, teacher_id: int = None, institution_id: Optional[int] = None):
    query = db.query(models.Subject)
    if institution_id is not None:
        query = query.filter(models.Subject.institution_id == institution_id)
    if department:
        query = query.filter(models.Subject.department == department)
    if teacher_id:
        query = query.filter(models.Subject.teacher_id == teacher_id)
    return query.all()

def create_schedule(db: Session, schedule: schemas.ScheduleCreate, institution_id: Optional[int] = None) -> models.Schedule:
    db_schedule = models.Schedule(
        subject_id=schedule.subject_id,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        institution_id=institution_id
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def get_schedules(db: Session, institution_id: Optional[int] = None):
    query = db.query(models.Schedule)
    if institution_id is not None:
        query = query.filter(models.Schedule.institution_id == institution_id)
    return query.all()

# --- Feedback ---
def create_feedback(db: Session, feedback: schemas.FeedbackCreate, user_email: str, role: str, user_id: Optional[int] = None, institution_id: Optional[int] = None):
    db_feedback = models.Feedback(
        user_id=user_id,
        user_email=user_email,
        role=role,
        type=feedback.type,
        message=feedback.message,
        rating=feedback.rating,
        institution_id=institution_id
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    
    # Create audit log so it shows up in real-time logs
    create_audit_log(
        db,
        log=schemas.AuditLogCreate(
            user_email=user_email,
            action=f"Submitted Feedback (ID: {user_id}, {feedback.type.upper()}, Rating: {feedback.rating}/5): {feedback.message}"
        ),
        institution_id=institution_id
    )
    return db_feedback

# --- Leave Management ---
def create_leave_request(db: Session, leave_request: schemas.LeaveRequestCreate, institution_id: int):
    db_leave = models.LeaveRequest(**leave_request.dict(), institution_id=institution_id)
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

def get_all_leave_requests(db: Session, institution_id: int):
    return db.query(models.LeaveRequest).filter(models.LeaveRequest.institution_id == institution_id).all()

def get_leave_requests_by_student(db: Session, student_id: int):
    # In a real multi-tenant app, you'd also filter by institution_id
    return db.query(models.LeaveRequest).filter(models.LeaveRequest.student_id == student_id).all()

def update_leave_request_status(db: Session, leave_request_id: int, status: str):
    db_leave = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_request_id).first()
    if db_leave:
        db_leave.status = status
        db.commit()
        db.refresh(db_leave)
    return db_leave

def update_attendance_status(
    db: Session,
    student_id: int,
    date_str: str,
    time_str: str,
    status: str,
    subject_id: Optional[int] = None,
    institution_id: Optional[int] = None
):
    query = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(student_id),
        models.AttendanceModel.date == date_str,
        models.AttendanceModel.time == time_str
    )
    if institution_id is not None:
        query = query.filter(models.AttendanceModel.institution_id == institution_id)
    if subject_id is not None:
        query = query.filter(models.AttendanceModel.subject_id == subject_id)
    else:
        query = query.filter(models.AttendanceModel.subject_id == None)

    existing = query.first()

    if status == "Absent":
        if existing:
            db.delete(existing)
            db.commit()
        return None
    else:
        if existing:
            existing.attendance = status
            db.commit()
            db.refresh(existing)
            return existing
        else:
            student = db.query(models.StudentModel).filter(
                models.StudentModel.id == student_id
            )
            if institution_id is not None:
                student = student.filter(models.StudentModel.institution_id == institution_id)
            student = student.first()
            if not student:
                raise ValueError("Student not found")

            db_attendance = models.AttendanceModel(
                id=str(student_id),
                roll=student.roll,
                name=student.name,
                department=student.dep,
                time=time_str,
                date=date_str,
                attendance=status,
                subject_id=subject_id,
                institution_id=institution_id
            )
            db.add(db_attendance)
            db.commit()
            db.refresh(db_attendance)
            return db_attendance

