import os
import tempfile
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from . import crud, models


def generate_attendance_pdf_report(db: Session, start_date_str: str, end_date_str: str, department: str = None, subject_id: int = None, institution_id: int = None) -> str:
    """
    Generates a professional attendance PDF report for a given date range, department, and subject.
    Returns the absolute path to the temporary PDF file.
    """
    # 1. Fetch report data using existing CRUD logic
    report_data = crud.get_attendance_report(
        db, 
        start_date_str=start_date_str, 
        end_date_str=end_date_str, 
        department=department, 
        subject_id=subject_id,
        institution_id=institution_id
    )

    
    total_working_days = report_data.get("total_working_days", 0)
    students = report_data.get("students", [])
    
    # Calculate aggregate summary stats
    total_students = len(students)
    avg_rate = 0.0
    low_attendance_count = 0
    
    if total_students > 0:
        total_percentage = 0.0
        for s in students:
            total_percentage += s.get("percentage", 0.0)
            if s.get("low_attendance", False):
                low_attendance_count += 1
        avg_rate = round(total_percentage / total_students, 2)

    # 2. Setup PDF document template
    temp_dir = tempfile.gettempdir()
    file_name = f"Attendance_Report_{datetime.now(IST).strftime('%Y%m%d_%H%M%S')}.pdf"
    pdf_path = os.path.join(temp_dir, file_name)
    
    # 0.5 inch margins
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom colors
    primary_color = colors.HexColor("#0f172a") # Deep Slate
    secondary_color = colors.HexColor("#0284c7") # Ocean Blue
    text_color = colors.HexColor("#334155")
    border_color = colors.HexColor("#e2e8f0")
    light_bg = colors.HexColor("#f8fafc")
    warning_color = colors.HexColor("#ef4444")
    success_color = colors.HexColor("#10b981")
    
    # Custom typography styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=primary_color,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=15
    )
    
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=primary_color,
        spaceAfter=10
    )
    
    card_label_style = ParagraphStyle(
        'CardLabel',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        alignment=1 # Center
    )
    
    card_val_style = ParagraphStyle(
        'CardValue',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=secondary_color,
        alignment=1 # Center
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )
    
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=text_color
    )
    
    table_cell_bold_style = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=text_color
    )

    story = []
    
    # Header Section
    story.append(Paragraph("Attendance Analysis Report", title_style))
    
    # Department
    dept_label = department if department else "All Departments"
    subject_label = ""
    if subject_id is not None:
        subj_q = db.query(models.Subject).filter(models.Subject.id == subject_id)
        if institution_id is not None:
            subj_q = subj_q.filter(models.Subject.institution_id == institution_id)
        sub = subj_q.first()
        if sub:
            subject_label = f"  |  Subject: <b>{sub.name} ({sub.code})</b>"
            
    date_range_label = f"Period: {datetime.strptime(start_date_str, '%Y-%m-%d').strftime('%d %b %Y')} to {datetime.strptime(end_date_str, '%Y-%m-%d').strftime('%d %b %Y')}"
    story.append(Paragraph(f"Department: <b>{dept_label}</b>{subject_label}  |  {date_range_label}  |  Generated on: {datetime.now(IST).strftime('%d/%m/%Y %H:%M:%S')}", subtitle_style))

    story.append(Spacer(1, 10))
    
    # Summary Cards Block (1 Row, 3 Columns)
    summary_data = [
        [
            Paragraph("TOTAL CLASS DAYS", card_label_style),
            Paragraph("AVERAGE ATTENDANCE", card_label_style),
            Paragraph("LOW ATTENDANCE WARNINGS", card_label_style)
        ],
        [
            Paragraph(str(total_working_days), card_val_style),
            Paragraph(f"{avg_rate}%", card_val_style),
            Paragraph(str(low_attendance_count), ParagraphStyle('RedCardVal', parent=card_val_style, textColor=warning_color))
        ]
    ]
    # Page width is ~523 pt (595 - 72). So columns are ~174 pt
    summary_table = Table(summary_data, colWidths=[174, 174, 174])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), light_bg),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TEXTCOLOR', (0, 0), (-1, -1), text_color),
        ('BOX', (0, 0), (-1, -1), 1, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 20))
    
    # Details Section Title
    story.append(Paragraph("Student Attendance Register Details", section_title_style))
    
    # Detailed Table
    table_headers = [
        Paragraph("Roll No", table_header_style),
        Paragraph("Student Name", table_header_style),
        Paragraph("Department", table_header_style),
        Paragraph("Present", table_header_style),
        Paragraph("Total", table_header_style),
        Paragraph("Rate (%)", table_header_style),
        Paragraph("Status", table_header_style)
    ]
    
    detailed_table_data = [table_headers]
    
    for s in students:
        rate = s.get("percentage", 0.0)
        is_low = s.get("low_attendance", False)
        
        # Color rating cell
        rate_style = ParagraphStyle(
            f'RateStyle_{s["id"]}',
            parent=table_cell_bold_style,
            textColor=warning_color if is_low else success_color
        )
        status_style = ParagraphStyle(
            f'StatusStyle_{s["id"]}',
            parent=table_cell_bold_style,
            textColor=warning_color if is_low else success_color
        )
        
        status_text = "Warning (Low)" if is_low else "Good"
        
        row = [
            Paragraph(s.get("roll", ""), table_cell_bold_style),
            Paragraph(s.get("name", ""), table_cell_style),
            Paragraph(s.get("dep", ""), table_cell_style),
            Paragraph(str(s.get("present_days", 0)), table_cell_style),
            Paragraph(str(s.get("total_days", 0)), table_cell_style),
            Paragraph(f"{rate}%", rate_style),
            Paragraph(status_text, status_style)
        ]
        detailed_table_data.append(row)
        
    # Standard column widths totaling ~522 pt
    detailed_table = Table(detailed_table_data, colWidths=[65, 120, 110, 50, 45, 62, 70], repeatRows=1)
    
    detailed_table_style = [
        ('BACKGROUND', (0, 0), (-1, 0), primary_color),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, border_color),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, border_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    
    # Alternating row background colors
    for r in range(1, len(detailed_table_data)):
        if r % 2 == 0:
            detailed_table_style.append(('BACKGROUND', (0, r), (-1, r), light_bg))
            
    detailed_table.setStyle(TableStyle(detailed_table_style))
    
    story.append(detailed_table)
    
    # Build document
    doc.build(story)
    
    return pdf_path
