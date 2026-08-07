import os
from datetime import date, timedelta, datetime, timezone

IST = timezone(timedelta(hours=5, minutes=30))
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .database import SessionLocal
from . import models
from .pdf_service import generate_attendance_pdf_report
from .email_service import send_pdf_report_email, _execute_send_email

# Singleton scheduler instance
scheduler = BackgroundScheduler()

def daily_student_summary_job(target_student_id=None):
    """
    Cron job to send daily attendance summary to registered student emails at 17:01 (5:01 PM).
    Lists all subjects/classes conducted today before 5:00 PM and student's Present/Absent status.
    """
    print("Scheduler: Running daily 5:01 PM student attendance summary email job...")
    db = SessionLocal()
    dispatched_list = []
    try:
        now_ist = datetime.now(IST)
        today_date = now_ist.strftime("%d/%m/%Y")
        today_dash = now_ist.strftime("%Y-%m-%d")

        query = db.query(models.StudentModel)
        if target_student_id:
            query = query.filter(models.StudentModel.id == target_student_id)
        students = query.all()

        subjects_map = {s.id: s.subject_name for s in db.query(models.Subject).all()}

        for student in students:
            recipient_email = student.email or student.parent_email
            if not recipient_email:
                continue

            # Query attendance logs for today for this student
            logs = db.query(models.AttendanceModel).filter(
                (models.AttendanceModel.roll == student.roll) | (models.AttendanceModel.id == str(student.id)),
                (models.AttendanceModel.date == today_date) | (models.AttendanceModel.date == today_dash)
            ).all()

            rows_html = ""
            present_count = 0
            absent_count = 0

            if logs:
                for log in logs:
                    subj_name = subjects_map.get(log.subject_id, log.department or "Class Lecture")
                    status_str = (log.attendance or "Present").capitalize()
                    is_present = status_str in ["Present", "Late"]

                    if is_present:
                        present_count += 1
                        badge_html = '<span style="color: #10b981; font-weight: bold; background: #ecfdf5; padding: 4px 12px; border-radius: 12px; border: 1px solid #a7f3d0;">✅ PRESENT</span>'
                    else:
                        absent_count += 1
                        badge_html = '<span style="color: #ef4444; font-weight: bold; background: #fef2f2; padding: 4px 12px; border-radius: 12px; border: 1px solid #fecdd3;">❌ ABSENT</span>'

                    rows_html += f"""
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 12px; color: #475569; font-weight: 500;">{log.time or 'Today'}</td>
                        <td style="padding: 12px; color: #0f172a; font-weight: 700;">{subj_name}</td>
                        <td style="padding: 12px;">{badge_html}</td>
                    </tr>
                    """
            else:
                rows_html = f"""
                <tr>
                    <td colspan="3" style="padding: 20px; text-align: center; color: #64748b;">
                        No class attendance sessions recorded for today ({today_date}).
                    </td>
                </tr>
                """

            html_body = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: 'Outfit', 'Inter', -apple-system, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #1e293b; }}
                    .card {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); overflow: hidden; }}
                    .header {{ background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 28px 24px; text-align: center; }}
                    .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; color: #00f2fe; }}
                    .content {{ padding: 28px 24px; }}
                    .stats-box {{ display: flex; gap: 12px; margin: 20px 0; background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center; }}
                    .stat-item {{ flex: 1; }}
                    .stat-val {{ font-size: 20px; font-weight: 800; color: #0f172a; }}
                    .stat-lbl {{ font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }}
                    table {{ width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 14px; }}
                    th {{ background: #f1f5f9; padding: 12px; text-align: left; color: #475569; font-weight: 700; }}
                    .footer {{ padding: 20px; background: #f8fafc; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; }}
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <h1>📊 Daily Class Attendance Summary</h1>
                        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Automated 5:01 PM Daily Digest • {today_date}</div>
                    </div>
                    <div class="content">
                        <p style="font-size: 16px; margin: 0 0 12px 0;">Hello <strong>{student.name}</strong> (Roll No: {student.roll}),</p>
                        <p style="color: #64748b; font-size: 14px; margin: 0;">
                            Here is the status of your class attendance for all subjects conducted today before 5:00 PM:
                        </p>

                        <div class="stats-box">
                            <div class="stat-item">
                                <div class="stat-val" style="color: #10b981;">{present_count}</div>
                                <div class="stat-lbl">Classes Attended</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-val" style="color: #ef4444;">{absent_count}</div>
                                <div class="stat-lbl">Classes Missed</div>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>Session Time</th>
                                    <th>Subject / Class</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows_html}
                            </tbody>
                        </table>
                    </div>
                    <div class="footer">
                        Sent to registered student email <strong>{recipient_email}</strong>.<br>
                        This is an automated 5:01 PM daily attendance report from SMART ATTENDANCE SYSTEM.
                    </div>
                </div>
            </body>
            </html>
            """

            subject = f"📊 Today's Attendance Summary ({today_date}) - {student.name}"
            _execute_send_email(recipient_email, subject, html_body)
            dispatched_list.append({"student": student.name, "email": recipient_email, "present": present_count, "absent": absent_count})

        print(f"Scheduler: Dispatched daily 5:01 PM summary to {len(dispatched_list)} students.")
        return dispatched_list
    except Exception as e:
        print(f"Scheduler Error in daily summary job: {e}")
        return []
    finally:
        db.close()

def weekly_attendance_job():
    """
    Cron job to send weekly attendance report every Friday at 17:00.
    Covers the current week from Monday to Friday.
    """
    print("Scheduler: Running weekly attendance report job...")
    db = SessionLocal()
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
                <h2>Weekly Attendance Summary Report</h2>
            </div>
            <div class="content">
                <p>Hello Administrator,</p>
                <p>Please find attached the compiled weekly attendance report for the period <b>{monday.strftime('%d %B %Y')}</b> to <b>{today.strftime('%d %B %Y')}</b>.</p>
                <p>Best regards,<br>SMART ATTENDANCE Notification Engine</p>
            </div>
            <div class="footer">
                This is a scheduled automated report.
            </div>
        </body>
        </html>
        """
        
        admin_email = "admin@face.com"
        send_pdf_report_email(
            recipient_email=admin_email,
            subject=f"Scheduled Weekly Attendance Report: {start_date} to {end_date}",
            body_html=html_body,
            pdf_file_path=pdf_path
        )
        
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            
    except Exception as e:
        print(f"Scheduler Error: Failed to run weekly job. Details: {e}")
    finally:
        db.close()

def monthly_attendance_job():
    """
    Cron job to send monthly attendance report on the last day of each month at 17:00.
    """
    print("Scheduler: Running monthly attendance report job...")
    db = SessionLocal()
    try:
        today = datetime.now(IST).date()
        first_day = today.replace(day=1)
        start_date = first_day.strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        pdf_path = generate_attendance_pdf_report(db, start_date_str=start_date, end_date_str=end_date)
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #334155; }}
                .header {{ background-color: #0284c7; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ padding: 25px; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px; }}
                .footer {{ font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h2>Monthly Attendance Analysis Report</h2>
            </div>
            <div class="content">
                <p>Hello Administrator,</p>
                <p>Please find attached the monthly attendance report for <b>{first_day.strftime('%d %B %Y')}</b> to <b>{today.strftime('%d %B %Y')}</b>.</p>
            </div>
        </body>
        </html>
        """
        
        admin_email = "admin@face.com"
        send_pdf_report_email(
            recipient_email=admin_email,
            subject=f"Scheduled Monthly Attendance Report: {start_date} to {end_date}",
            body_html=html_body,
            pdf_file_path=pdf_path
        )
        
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            
    except Exception as e:
        print(f"Scheduler Error: Failed to run monthly job. Details: {e}")
    finally:
        db.close()

def start():
    """
    Initializes cron triggers and starts the scheduler background thread.
    """
    if not scheduler.running:
        # 1. Schedule Daily 5:01 PM Job (Every day at 17:01 IST)
        scheduler.add_job(
            daily_student_summary_job,
            trigger=CronTrigger(hour=17, minute=1),
            id='daily_501pm_student_summary',
            replace_existing=True
        )

        # 2. Schedule Weekly Job: Every Friday at 17:00 (5:00 PM)
        scheduler.add_job(
            weekly_attendance_job,
            trigger=CronTrigger(day_of_week='fri', hour=17, minute=0),
            id='weekly_attendance_report',
            replace_existing=True
        )
        
        # 3. Schedule Monthly Job: Last day of every month at 17:00 (5:00 PM)
        scheduler.add_job(
            monthly_attendance_job,
            trigger=CronTrigger(day='last', hour=17, minute=0),
            id='monthly_attendance_report',
            replace_existing=True
        )
        
        scheduler.start()
        print("Scheduler: Background task scheduler started. 5:01 PM Daily digest scheduled successfully.")

def shutdown():
    """
    Safely shuts down the background scheduler execution pool.
    """
    if scheduler.running:
        scheduler.shutdown()
        print("Scheduler: Background task scheduler shutdown cleanly.")
