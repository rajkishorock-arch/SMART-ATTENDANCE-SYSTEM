from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from datetime import datetime, timedelta, date
from typing import Optional
from . import models, schemas, security

# --- Audit Log ---
def create_audit_log(db: Session, log: schemas.AuditLogCreate):
    db_log = models.AuditLog(user_email=log.user_email, action=log.action)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

# --- User (Admins/Teachers) ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        password_hash=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Student ---
def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.StudentModel).offset(skip).limit(limit).all()

def get_student_by_id(db: Session, student_id: int):
    return db.query(models.StudentModel).filter(models.StudentModel.id == student_id).first()

def get_student_by_email(db: Session, email: str):
    return db.query(models.StudentModel).filter(models.StudentModel.email == email).first()

def update_student_password(db: Session, student_id: int, new_password_plain: str):
    student = db.query(models.StudentModel).filter(models.StudentModel.id == student_id).first()
    if student:
        student.password_hash = security.get_password_hash(new_password_plain)
        db.commit()
        db.refresh(student)
        return student
    return None

def get_all_user_details_for_recognition(db: Session):
    students = db.query(models.StudentModel).all()
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

def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.StudentModel(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def delete_student(db: Session, student_id: int):
    db_student = db.query(models.StudentModel).filter(models.StudentModel.id == student_id).first()
    if db_student:
        # Also delete related attendance logs
        db.query(models.AttendanceModel).filter(models.AttendanceModel.id == str(student_id)).delete()
        db.delete(db_student)
        db.commit()
        return True
    return False

# --- Attendance ---
def get_attendance_logs(
    db: Session, 
    date_str: Optional[str] = None, 
    department: Optional[str] = None, 
    attendance_status: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 100,
    subject_ids: Optional[list] = None
):
    query = db.query(models.AttendanceModel)
    if date_str:
        query = query.filter(models.AttendanceModel.date == date_str)
    if department:
        query = query.filter(models.AttendanceModel.department == department)
    if attendance_status:
        query = query.filter(models.AttendanceModel.attendance == attendance_status)
    if subject_ids is not None:
        query = query.filter(models.AttendanceModel.subject_id.in_(subject_ids))
    return query.order_by(models.AttendanceModel.date.desc(), models.AttendanceModel.time.desc()).offset(skip).limit(limit).all()

def get_dashboard_stats(db: Session):
    today_str = datetime.now().strftime("%d/%m/%Y")
    
    total_students = db.query(models.StudentModel).count()
    
    total_present_today = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.date == today_str,
        models.AttendanceModel.attendance == "Present"
    ).count()
    
    total_absent_today = max(0, total_students - total_present_today)
    
    avg_rate = (total_present_today / total_students * 100.0) if total_students > 0 else 0.0
    
    # Department stats (present today)
    dept_counts = db.query(
        models.AttendanceModel.department,
        func.count(models.AttendanceModel.id)
    ).filter(
        models.AttendanceModel.date == today_str,
        models.AttendanceModel.attendance == "Present"
    ).group_by(models.AttendanceModel.department).all()
    
    department_stats = {dept or "Unknown": count for dept, count in dept_counts}
    
    # Weekly trends
    weekly_trends = []
    for i in range(6, -1, -1):
        day = datetime.now() - timedelta(days=i)
        day_str = day.strftime("%d/%m/%Y")
        day_label = day.strftime("%a")
        
        count = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.date == day_str,
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
    custom_time: Optional[str] = None
):
    if custom_date:
        if "-" in custom_date:
            try:
                today_str = datetime.strptime(custom_date, "%Y-%m-%d").strftime("%d/%m/%Y")
            except ValueError:
                today_str = custom_date
        else:
            today_str = custom_date
    else:
        today_str = datetime.now().strftime("%d/%m/%Y")
        
    time_str = custom_time if custom_time else datetime.now().strftime("%H:%M:%S")
    
    # 1. Check if already marked in DB for this subject
    query = db.query(models.AttendanceModel).filter(
        models.AttendanceModel.id == str(student_id),
        models.AttendanceModel.date == today_str
    )
    if subject_id is not None:
        query = query.filter(models.AttendanceModel.subject_id == subject_id)
    else:
        query = query.filter(models.AttendanceModel.subject_id == None)
        
    existing = query.first()
    
    if existing:
        return existing, False
        
    # 2. Insert into MySQL DB
    db_attendance = models.AttendanceModel(
        id=str(student_id),
        roll=roll,
        name=name,
        department=dep,
        time=time_str,
        date=today_str,
        attendance="Present",
        subject_id=subject_id
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    
    # 3. Write to CSV file (root/attendance.csv)
    try:
        import csv
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        attendance_path = os.path.join(base_dir, "attendance.csv")
        
        required_columns = ["ID", "Roll", "Name", "Department", "Time", "Date", "Status", "SubjectID"]
        file_exists = os.path.exists(attendance_path)
        
        with open(attendance_path, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists or os.path.getsize(attendance_path) == 0:
                writer.writerow(required_columns)
            writer.writerow([student_id, roll, name, dep, time_str, today_str, "Present", subject_id or ""])
    except Exception as csv_err:
        print(f"Failed to write attendance to CSV: {csv_err}")
        
    return db_attendance, True


def get_attendance_report(
    db: Session,
    start_date_str: Optional[str] = None,
    end_date_str: Optional[str] = None,
    department: Optional[str] = None,
    subject_id: Optional[int] = None
):
    if subject_id is not None and not department:
        subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
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

    # Fetch unique working dates across the entire system within the range for this subject
    attendance_query = db.query(models.AttendanceModel).filter(models.AttendanceModel.attendance == "Present")
    if department:
        attendance_query = attendance_query.filter(models.AttendanceModel.department == department)
    if subject_id is not None:
        attendance_query = attendance_query.filter(models.AttendanceModel.subject_id == subject_id)
        
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

    # Fetch all students optionally filtered by department
    student_query = db.query(models.StudentModel)
    if department:
        student_query = student_query.filter(models.StudentModel.dep == department)
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
        percentage = round((present_days / total_working_days * 100.0), 2) if total_working_days > 0 else 0.0
        low_attendance = percentage < 75.0 and total_working_days > 0

        student_reports.append({
            "id": s.id,
            "roll": s.roll,
            "name": s.name,
            "dep": s.dep,
            "present_days": present_days,
            "total_days": total_working_days,
            "percentage": percentage,
            "low_attendance": low_attendance
        })

    # Sort: low attendance warning first, then percentage ascending
    sorted_reports = sorted(student_reports, key=lambda x: (not x["low_attendance"], x["percentage"]))

    return {
        "total_working_days": total_working_days,
        "students": sorted_reports
    }


def get_system_settings(db: Session) -> models.SystemSettings:
    """
    Get system settings. Creates a default row if it does not exist.
    """
    settings = db.query(models.SystemSettings).first()
    if not settings:
        settings = models.SystemSettings(
            geofencing_enabled=False,
            center_latitude=28.6139,
            center_longitude=77.2090,
            allowed_radius_meters=100.0,
            ip_restriction_enabled=False,
            allowed_ip_ranges="127.0.0.1,192.168.1.0/24"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

def update_system_settings(db: Session, update_data: schemas.SystemSettingsUpdate) -> models.SystemSettings:
    """
    Updates the system settings row.
    """
    settings = get_system_settings(db)
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(settings, key, value)
        
    db.commit()
    db.refresh(settings)
    return settings

def create_subject(db: Session, subject: schemas.SubjectCreate) -> models.Subject:
    db_subject = models.Subject(
        name=subject.name,
        code=subject.code,
        department=subject.department,
        teacher_id=subject.teacher_id
    )
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def get_subjects(db: Session, department: str = None, teacher_id: int = None):
    query = db.query(models.Subject)
    if department:
        query = query.filter(models.Subject.department == department)
    if teacher_id:
        query = query.filter(models.Subject.teacher_id == teacher_id)
    return query.all()

def create_schedule(db: Session, schedule: schemas.ScheduleCreate) -> models.Schedule:
    db_schedule = models.Schedule(
        subject_id=schedule.subject_id,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

def get_schedules(db: Session):
    return db.query(models.Schedule).all()