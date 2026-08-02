"""
Feature 10: Automated Report Card PDF Generation
Auto-generates student report cards with attendance % per subject.
Emails directly to parent/student.
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timezone, timedelta
import json, os

from . import models, security, crud, schemas
from .database import get_db

IST = timezone(timedelta(hours=5, minutes=30))
router = APIRouter()


def _generate_report_card_pdf(db: Session, student_id: int, institution_id: int,
                               period_label: str, start_date: str, end_date: str,
                               generated_by: str) -> str:
    """Generate a PDF report card and return the file path."""
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == institution_id,
    ).first()
    if not student:
        raise ValueError("Student not found")

    subjects = db.query(models.Subject).filter(
        models.Subject.institution_id == institution_id,
        models.Subject.department == student.dep,
    ).all()

    def parse_date(d):
        for f in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                return datetime.strptime(d, f).date()
            except:
                continue
        return None

    s_date = parse_date(start_date)
    e_date = parse_date(end_date)

    subject_wise = {}
    total_present = 0
    total_days_all = 0

    for sub in subjects:
        logs = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.id == str(student_id),
            models.AttendanceModel.institution_id == institution_id,
            models.AttendanceModel.subject_id == sub.id,
            models.AttendanceModel.attendance == "Present",
        ).all()

        all_logs = db.query(models.AttendanceModel).filter(
            models.AttendanceModel.institution_id == institution_id,
            models.AttendanceModel.subject_id == sub.id,
        ).all()
        total_sub_days = len(set(l.date for l in all_logs))

        present = 0
        for l in logs:
            ld = None
            for f in ("%d/%m/%Y",):
                try:
                    ld = datetime.strptime(l.date, f).date()
                    break
                except:
                    pass
            if ld:
                if s_date and ld < s_date:
                    continue
                if e_date and ld > e_date:
                    continue
                present += 1

        pct = round((present / total_sub_days * 100), 2) if total_sub_days > 0 else 0
        subject_wise[sub.id] = {
            "name": sub.name, "code": sub.code,
            "present": present, "total": total_sub_days, "pct": pct
        }
        total_present += present
        total_days_all += total_sub_days

    overall_pct = round((total_present / total_days_all * 100), 2) if total_days_all > 0 else 0

    # Try fpdf2 / reportlab
    try:
        from fpdf import FPDF

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, "STUDENT ATTENDANCE REPORT CARD", ln=True, align="C")
        pdf.ln(5)

        pdf.set_font("Helvetica", size=11)
        pdf.cell(0, 8, f"Student: {student.name}  |  Roll: {student.roll}  |  Dept: {student.dep}", ln=True)
        pdf.cell(0, 8, f"Course: {student.course}  |  Year: {student.year}  |  Semester: {student.semester}", ln=True)
        pdf.cell(0, 8, f"Period: {period_label}  ({start_date} to {end_date})", ln=True)
        pdf.cell(0, 8, f"Overall Attendance: {overall_pct}%  ({total_present}/{total_days_all} days)", ln=True)
        pdf.ln(5)

        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(60, 8, "Subject", border=1)
        pdf.cell(20, 8, "Code", border=1)
        pdf.cell(25, 8, "Present", border=1)
        pdf.cell(25, 8, "Total", border=1)
        pdf.cell(25, 8, "Pct %", border=1)
        pdf.cell(30, 8, "Status", border=1, ln=True)

        pdf.set_font("Helvetica", size=10)
        for sid, info in subject_wise.items():
            status = "OK" if info["pct"] >= 75 else "LOW"
            pdf.cell(60, 7, info["name"][:28], border=1)
            pdf.cell(20, 7, info["code"], border=1)
            pdf.cell(25, 7, str(info["present"]), border=1)
            pdf.cell(25, 7, str(info["total"]), border=1)
            pdf.cell(25, 7, f"{info['pct']}%", border=1)
            pdf.cell(30, 7, status, border=1, ln=True)

        pdf.ln(5)
        pdf.set_font("Helvetica", "I", 9)
        pdf.cell(0, 6, f"Generated on {datetime.now(IST).strftime('%d/%m/%Y %H:%M')} by {generated_by}", ln=True, align="C")

        import tempfile
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", prefix=f"report_card_{student_id}_")
        pdf.output(tmp.name)
        return tmp.name
    except ImportError:
        pass

    # Fallback: plain text file
    import tempfile
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt", prefix=f"report_card_{student_id}_", mode="w")
    tmp.write(f"STUDENT ATTENDANCE REPORT CARD\n")
    tmp.write(f"Student: {student.name} | Roll: {student.roll} | Dept: {student.dep}\n")
    tmp.write(f"Period: {period_label} ({start_date} to {end_date})\n")
    tmp.write(f"Overall: {overall_pct}% ({total_present}/{total_days_all} days)\n\n")
    for sid, info in subject_wise.items():
        tmp.write(f"{info['name']} ({info['code']}): {info['present']}/{info['total']} = {info['pct']}%\n")
    tmp.close()
    return tmp.name


@router.post("/generate/{student_id}")
def generate_report_card(
    student_id: int,
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Generate and optionally email a report card for a student."""
    if current_user.role not in ("admin", "teacher", "hod"):
        raise HTTPException(status_code=403, detail="Staff access only.")

    start_date = payload.get("start_date", "")
    end_date = payload.get("end_date", "")
    period_label = payload.get("period_label", "Semester Report")
    send_email = payload.get("send_email", False)

    if not start_date or not end_date:
        raise HTTPException(status_code=400, detail="start_date and end_date are required.")

    try:
        pdf_path = _generate_report_card_pdf(
            db, student_id, current_user.institution_id,
            period_label, start_date, end_date, current_user.email
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report card generation failed: {str(e)}")

    # Save record in DB
    student = db.query(models.StudentModel).filter(
        models.StudentModel.id == student_id,
        models.StudentModel.institution_id == current_user.institution_id,
    ).first()
    record = models.ReportCard(
        institution_id=current_user.institution_id,
        student_id=student_id,
        period_label=period_label,
        start_date=start_date,
        end_date=end_date,
        generated_by=current_user.email,
    )
    db.add(record)
    db.commit()

    # Optionally email
    if send_email and student and student.email:
        background_tasks.add_task(
            _email_report_card, student.email, student.name, pdf_path, period_label
        )

    return FileResponse(
        path=pdf_path,
        filename=f"ReportCard_{student.name.replace(' ', '_')}_{period_label.replace(' ', '_')}.pdf",
        media_type="application/pdf",
        background=BackgroundTasks(),
    )


def _email_report_card(email: str, name: str, pdf_path: str, period: str):
    try:
        from .email_service import send_pdf_report_email
        send_pdf_report_email(
            recipient_email=email,
            subject=f"Your Attendance Report Card — {period}",
            body_html=f"<p>Dear {name},</p><p>Please find your attendance report card for <b>{period}</b> attached.</p>",
            pdf_file_path=pdf_path,
        )
    except Exception as e:
        print(f"Report card email failed: {e}")
    finally:
        try:
            os.remove(pdf_path)
        except:
            pass


@router.get("/bulk-generate")
def bulk_generate_report_cards(
    start_date: str,
    end_date: str,
    period_label: str = "Semester Report",
    department: Optional[str] = None,
    send_email: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user),
):
    """Generate report cards for all students in bulk (background task)."""
    if current_user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Admin only.")

    query = db.query(models.StudentModel).filter(
        models.StudentModel.institution_id == current_user.institution_id
    )
    if department:
        query = query.filter(models.StudentModel.dep == department)
    students = query.all()

    def _do_bulk(db, students, inst_id, start_date, end_date, period_label, generated_by, send_email):
        count = 0
        for s in students:
            try:
                pdf_path = _generate_report_card_pdf(
                    db, s.id, inst_id, period_label, start_date, end_date, generated_by
                )
                record = models.ReportCard(
                    institution_id=inst_id, student_id=s.id,
                    period_label=period_label, start_date=start_date, end_date=end_date,
                    generated_by=generated_by,
                )
                db.add(record)
                db.commit()
                if send_email and s.email:
                    _email_report_card(s.email, s.name, pdf_path, period_label)
                count += 1
            except Exception as e:
                print(f"Bulk report card failed for student {s.id}: {e}")
        print(f"[ReportCard] Bulk generated {count} report cards.")

    background_tasks.add_task(
        _do_bulk, db, students, current_user.institution_id,
        start_date, end_date, period_label, current_user.email, send_email
    )
    return {"message": f"Bulk report card generation started for {len(students)} students in background."}
