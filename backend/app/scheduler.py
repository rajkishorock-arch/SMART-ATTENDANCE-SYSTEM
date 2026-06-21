import os
from datetime import date, timedelta, datetime, timezone

IST = timezone(timedelta(hours=5, minutes=30))
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .database import SessionLocal
from . import models
from .pdf_service import generate_attendance_pdf_report
from .email_service import send_pdf_report_email

# Singleton scheduler instance
scheduler = BackgroundScheduler()

def weekly_attendance_job():
    """
    Cron job to send weekly attendance report every Friday at 17:00.
    Covers the current week from Monday to Friday.
    """
    print("Scheduler: Running weekly attendance report job...")
    db = SessionLocal()
    try:
        today = datetime.now(IST).date()
        # Monday of this week: today - current weekday index (0 = Monday)
        monday = today - timedelta(days=today.weekday())
        start_date = monday.strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        # Generate master report (All Departments)
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
                <p>This report contains the student attendance registers and rate analysis for all departments.</p>
                <p>Best regards,<br>SMART AI SYSTEM Notification Engine</p>
            </div>
            <div class="footer">
                This is a scheduled automated report. Please do not reply directly to this mail.
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
        
        # Clean up temporary PDF file after mailing
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            print("Scheduler: Weekly PDF report file cleaned up successfully.")
            
    except Exception as e:
        print(f"Scheduler Error: Failed to run weekly job. Details: {e}")
    finally:
        db.close()

def monthly_attendance_job():
    """
    Cron job to send monthly attendance report on the last day of each month at 17:00.
    Covers the current month from 1st day to last day.
    """
    print("Scheduler: Running monthly attendance report job...")
    db = SessionLocal()
    try:
        today = datetime.now(IST).date()
        # First day of current month:
        first_day = today.replace(day=1)
        start_date = first_day.strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        # Generate master report (All Departments)
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
                <p>Please find attached the comprehensive monthly attendance report for the period <b>{first_day.strftime('%d %B %Y')}</b> to <b>{today.strftime('%d %B %Y')}</b>.</p>
                <p>This report includes detailed attendance statistics, averages, and low attendance warning triggers for students.</p>
                <p>Best regards,<br>SMART AI SYSTEM Notification Engine</p>
            </div>
            <div class="footer">
                This is a scheduled automated report. Please do not reply directly to this mail.
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
        
        # Clean up temporary PDF file after mailing
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
            print("Scheduler: Monthly PDF report file cleaned up successfully.")
            
    except Exception as e:
        print(f"Scheduler Error: Failed to run monthly job. Details: {e}")
    finally:
        db.close()

def start():
    """
    Initializes cron triggers and starts the scheduler background thread.
    """
    if not scheduler.running:
        # 1. Schedule Weekly Job: Every Friday at 17:00 (5:00 PM)
        # day_of_week='fri', hour=17, minute=0
        scheduler.add_job(
            weekly_attendance_job,
            trigger=CronTrigger(day_of_week='fri', hour=17, minute=0),
            id='weekly_attendance_report',
            replace_existing=True
        )
        
        # 2. Schedule Monthly Job: Last day of every month at 17:00 (5:00 PM)
        # day='last', hour=17, minute=0
        scheduler.add_job(
            monthly_attendance_job,
            trigger=CronTrigger(day='last', hour=17, minute=0),
            id='monthly_attendance_report',
            replace_existing=True
        )
        
        scheduler.start()
        print("Scheduler: Background task scheduler started. Jobs scheduled successfully.")

def shutdown():
    """
    Safely shuts down the background scheduler execution pool.
    """
    if scheduler.running:
        scheduler.shutdown()
        print("Scheduler: Background task scheduler shutdown cleanly.")
