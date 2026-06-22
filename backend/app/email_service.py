import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core import config

def send_presence_email(student_email: str, student_name: str, roll_no: str, time_str: str, date_str: str):
    """
    Sends a confirmation email to the student when their attendance is marked.
    Runs asynchronously via FastAPI BackgroundTasks.
    """
    if not student_email:
        print("Presence email skipped: No email address provided.")
        return

    subject = f"Attendance Marked Successfully - {date_str}"
    
    # Premium Modern HTML Email Template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f4f6f9;
                margin: 0;
                padding: 0;
                color: #2e384d;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
                padding: 30px 20px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 15px;
                color: #1e293b;
            }}
            .message {{
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
                margin-bottom: 30px;
            }}
            .details-card {{
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
            }}
            .details-row {{
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
            }}
            .details-row:last-child {{
                border-bottom: none;
            }}
            .label {{
                font-weight: 600;
                color: #475569;
            }}
            .value {{
                color: #0f172a;
            }}
            .status-badge {{
                background-color: #dcfce7;
                color: #15803d;
                padding: 2px 10px;
                border-radius: 9999px;
                font-weight: 600;
                font-size: 12px;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Attendance Registered</h1>
            </div>
            <div class="content">
                <div class="greeting">Hello {student_name},</div>
                <div class="message">
                    Your presence has been successfully detected and recorded in the Attendance System via secure face recognition. Please review the registration details below:
                </div>
                
                <div class="details-card">
                    <div class="details-row">
                        <span class="label">Roll Number</span>
                        <span class="value">{roll_no}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Date</span>
                        <span class="value">{date_str}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Time</span>
                        <span class="value">{time_str}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Status</span>
                        <span class="value"><span class="status-badge">Present</span></span>
                    </div>
                </div>
                
                <div class="message" style="margin-bottom: 0;">
                    If you did not attend today or suspect any discrepancy, please report this immediately to the administrator.
                </div>
            </div>
            <div class="footer">
                This is an automated notification from the {config.SMTP_SENDER_NAME}.<br>
                Please do not reply directly to this email.
            </div>
        </div>
    </body>
    </html>
    """

    _execute_send_email(student_email, subject, html_content)


def send_absent_email(student_email: str, student_name: str, date_str: str):
    """
    Sends an absentee alert email to the student when triggered by an admin.
    Runs asynchronously via FastAPI BackgroundTasks.
    """
    if not student_email:
        print("Absent email skipped: No email address provided.")
        return

    subject = f"Absence Notice - {date_str}"
    
    # Premium Modern HTML Email Template (Red Accent)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f4f6f9;
                margin: 0;
                padding: 0;
                color: #2e384d;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #e11d48 0%, #be123c 100%);
                padding: 30px 20px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 15px;
                color: #1e293b;
            }}
            .message {{
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
                margin-bottom: 30px;
            }}
            .details-card {{
                background-color: #fff1f2;
                border: 1px solid #fecdd3;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
            }}
            .details-row {{
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #ffe4e6;
                font-size: 14px;
            }}
            .details-row:last-child {{
                border-bottom: none;
            }}
            .label {{
                font-weight: 600;
                color: #be123c;
            }}
            .value {{
                color: #9f1239;
                font-weight: 600;
            }}
            .status-badge {{
                background-color: #ffe4e6;
                color: #e11d48;
                padding: 2px 10px;
                border-radius: 9999px;
                font-weight: 600;
                font-size: 12px;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Absence Notice</h1>
            </div>
            <div class="content">
                <div class="greeting">Hello {student_name},</div>
                <div class="message">
                    We noticed that you were not checked in today. Your presence was not registered in the system for the academic session:
                </div>
                
                <div class="details-card">
                    <div class="details-row">
                        <span class="label">Date</span>
                        <span class="value">{date_str}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Status</span>
                        <span class="value"><span class="status-badge">Absent</span></span>
                    </div>
                </div>
                
                <div class="message" style="margin-bottom: 0;">
                    Please note that maintaining at least <strong>75% attendance</strong> is mandatory. If you were present and believe there is an error in the logs, please contact your department office or system administrator immediately to correct it.
                </div>
            </div>
            <div class="footer">
                This is an automated notification from the {config.SMTP_SENDER_NAME}.<br>
                Please do not reply directly to this email.
            </div>
        </div>
    </body>
    </html>
    """

    _execute_send_email(student_email, subject, html_content)


def _execute_send_email(to_email: str, subject: str, html_body: str):
    """
    Internal helper to construct and send the email over SMTP using standard library.
    Catches errors gracefully to prevent crashing core execution flow.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f'"{config.SMTP_SENDER_NAME}" <{config.SMTP_SENDER_EMAIL}>'
        msg["To"] = to_email

        part = MIMEText(html_body, "html")
        msg.attach(part)

        # Connect to SMTP server
        print(f"SMTP: Connecting to {config.SMTP_HOST}:{config.SMTP_PORT}...")
        server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10)
        
        # Start TLS if port is standard TLS port
        if config.SMTP_PORT == 587:
            print("SMTP: Starting TLS encryption...")
            server.starttls()
            
        # Login if username is configured and not default placeholder
        if config.SMTP_USERNAME and config.SMTP_USERNAME != "your_gmail_address@gmail.com":
            print(f"SMTP: Authenticating as {config.SMTP_USERNAME}...")
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            
        print(f"SMTP: Sending message to {to_email}...")
        server.sendmail(config.SMTP_SENDER_EMAIL, to_email, msg.as_string())
        server.quit()
        print(f"SMTP: Email sent successfully to {to_email}!")
    except Exception as e:
        print(f"SMTP Error: Failed to send email to {to_email}. Details: {str(e)}")

def send_pdf_report_email(recipient_email: str, subject: str, body_html: str, pdf_file_path: str):
    """
    Sends an email with a PDF report file attached.
    """
    from email.mime.application import MIMEApplication
    import os
    
    if not recipient_email:
        print("PDF report email skipped: No recipient email address provided.")
        return
        
    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = f'"{config.SMTP_SENDER_NAME}" <{config.SMTP_SENDER_EMAIL}>'
        msg["To"] = recipient_email
        
        # Attach HTML body
        msg.attach(MIMEText(body_html, "html"))
        
        # Attach PDF file
        if pdf_file_path and os.path.exists(pdf_file_path):
            with open(pdf_file_path, "rb") as f:
                pdf_part = MIMEApplication(f.read(), _subtype="pdf")
                pdf_part.add_header('Content-Disposition', 'attachment', filename=os.path.basename(pdf_file_path))
                msg.attach(pdf_part)
        else:
            print(f"Warning: PDF file not found at {pdf_file_path}. Sending email without attachment.")

        # Connect to SMTP server and send
        print(f"SMTP (PDF): Connecting to {config.SMTP_HOST}:{config.SMTP_PORT}...")
        server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15)
        
        if config.SMTP_PORT == 587:
            print("SMTP (PDF): Starting TLS encryption...")
            server.starttls()
            
        if config.SMTP_USERNAME and config.SMTP_USERNAME != "your_gmail_address@gmail.com":
            print(f"SMTP (PDF): Authenticating as {config.SMTP_USERNAME}...")
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)
            
        print(f"SMTP (PDF): Sending report to {recipient_email}...")
        server.sendmail(config.SMTP_SENDER_EMAIL, recipient_email, msg.as_string())
        server.quit()
        print(f"SMTP (PDF): Report email sent successfully to {recipient_email}!")
    except Exception as e:
        print(f"SMTP (PDF) Error: Failed to send report email to {recipient_email}. Details: {str(e)}")


def send_welcome_email(admin_email: str, admin_name: str, institution_name: str, slug: str, raw_password: str):
    """
    Sends an onboarding welcome email to the newly registered institution admin.
    """
    if not admin_email:
        print("Welcome email skipped: No admin email address provided.")
        return

    subject = f"Welcome to SMART ATTENDANCE SYSTEM - {institution_name}"
    
    # Premium Modern HTML Email Template (Purple Accent)
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background-color: #f4f6f9;
                margin: 0;
                padding: 0;
                color: #2e384d;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
                padding: 35px 20px;
                text-align: center;
                color: #ffffff;
            }}
            .header h1 {{
                margin: 0;
                font-size: 26px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }}
            .content {{
                padding: 40px 30px;
            }}
            .greeting {{
                font-size: 18px;
                font-weight: 500;
                margin-bottom: 15px;
                color: #1e293b;
            }}
            .message {{
                font-size: 15px;
                line-height: 1.6;
                color: #64748b;
                margin-bottom: 30px;
            }}
            .details-card {{
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 30px;
            }}
            .details-row {{
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
            }}
            .details-row:last-child {{
                border-bottom: none;
            }}
            .label {{
                font-weight: 600;
                color: #475569;
            }}
            .value {{
                color: #0f172a;
            }}
            .portal-link {{
                display: inline-block;
                background: #4f46e5;
                color: #ffffff;
                text-decoration: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 15px;
                margin-top: 15px;
            }}
            .footer {{
                background-color: #f8fafc;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #94a3b8;
                border-top: 1px solid #e2e8f0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to SMART ATTENDANCE SYSTEM</h1>
            </div>
            <div class="content">
                <div class="greeting">Hello {admin_name},</div>
                <div class="message">
                    Your institution <strong>{institution_name}</strong> has been successfully registered on the SMART ATTENDANCE SYSTEM. 
                    Below are your login credentials and details to access your dedicated workspace portal:
                </div>
                
                <div class="details-card">
                    <div class="details-row">
                        <span class="label">Institution Name</span>
                        <span class="value">{institution_name}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Workspace Subdomain / Slug</span>
                        <span class="value"><strong>{slug}</strong></span>
                    </div>
                    <div class="details-row">
                        <span class="label">Admin Email</span>
                        <span class="value">{admin_email}</span>
                    </div>
                    <div class="details-row">
                        <span class="label">Admin Password</span>
                        <span class="value"><code>{raw_password}</code></span>
                    </div>
                </div>
                
                <div class="message">
                    To log in, please visit the portal link below, select your workspace domain as <strong>{institution_name}</strong>, and enter your credentials.
                    <div style="text-align: center;">
                        <a href="https://smart-attendance-system-olive-ten.vercel.app" class="portal-link" style="color: #ffffff;">Go to Login Portal</a>
                    </div>
                </div>
            </div>
            <div class="footer">
                This is an automated onboarding notification from {config.SMTP_SENDER_NAME}.<br>
                Please do not reply directly to this email. Keep this password secure or change it immediately upon logging in.
            </div>
        </div>
    </body>
    </html>
    """

    _execute_send_email(admin_email, subject, html_content)

