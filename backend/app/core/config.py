import os
from dotenv import load_dotenv

# .env फ़ाइल से पर्यावरण चर लोड करें
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "your_gmail_address@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "your_gmail_app_password")
SMTP_SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL", "your_gmail_address@gmail.com")
SMTP_SENDER_NAME = os.getenv("SMTP_SENDER_NAME", "SMART AI SYSTEM")

