import os
from dotenv import load_dotenv

load_dotenv()

ENV = os.getenv("ENV", "development")
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL and ENV == "development":
    DATABASE_URL = "sqlite:///local_attendance.db"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not JWT_SECRET_KEY and ENV == "development":
    JWT_SECRET_KEY = "local-dev-secret-key-change-before-production-use"

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
DEVELOPER_MASTER_KEY = os.getenv("DEVELOPER_MASTER_KEY")
if not DEVELOPER_MASTER_KEY and ENV == "development":
    DEVELOPER_MASTER_KEY = "dev_master_raj_9211_secure"

BUILD_CALLBACK_TOKEN = os.getenv("BUILD_CALLBACK_TOKEN")
if not BUILD_CALLBACK_TOKEN and ENV == "development":
    BUILD_CALLBACK_TOKEN = "fallback_token_9211"

SYSTEM_OWNER_EMAIL = os.getenv("SYSTEM_OWNER_EMAIL", "rajkishorock@gmail.com").strip().lower()
PRIMARY_ADMIN_PASSWORD = os.getenv("PRIMARY_ADMIN_PASSWORD")
if not PRIMARY_ADMIN_PASSWORD and ENV == "development":
    PRIMARY_ADMIN_PASSWORD = "raj@9211"

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,https://smart-attendance-system-olive-ten.vercel.app",
    ).split(",")
    if origin.strip()
]

SEED_DEFAULT_USERS = os.getenv("SEED_DEFAULT_USERS", "true" if ENV == "development" else "false").lower() == "true"
ALLOW_ROLL_PASSWORD = os.getenv("ALLOW_ROLL_PASSWORD", "true" if ENV == "development" else "false").lower() == "true"
TRUST_PROXY_HEADERS = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"
ALLOW_DATABASE_FALLBACK = os.getenv(
    "ALLOW_DATABASE_FALLBACK",
    "true" if ENV == "development" else "false",
).lower() == "true"

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL", "")
SMTP_SENDER_NAME = os.getenv("SMTP_SENDER_NAME", "SMART AI SYSTEM")

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(5 * 1024 * 1024)))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
REDIS_URL = os.getenv("REDIS_URL", "")
STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID", "")


def validate_config():
    errors = []
    if not DATABASE_URL:
        errors.append("DATABASE_URL is required.")
    if ENV == "production" and ALLOW_DATABASE_FALLBACK:
        errors.append("ALLOW_DATABASE_FALLBACK must be false in production.")
    if not JWT_SECRET_KEY:
        errors.append("JWT_SECRET_KEY is required.")
    elif len(JWT_SECRET_KEY) < 32:
        errors.append("JWT_SECRET_KEY must be at least 32 characters.")
    if not DEVELOPER_MASTER_KEY:
        errors.append("DEVELOPER_MASTER_KEY is required.")
    elif ENV == "production" and len(DEVELOPER_MASTER_KEY) < 12:
        errors.append("DEVELOPER_MASTER_KEY must be at least 12 characters.")
    if not BUILD_CALLBACK_TOKEN:
        errors.append("BUILD_CALLBACK_TOKEN is required.")
    elif ENV == "production" and len(BUILD_CALLBACK_TOKEN) < 12:
        errors.append("BUILD_CALLBACK_TOKEN must be at least 12 characters.")
    if ENV == "production" and SEED_DEFAULT_USERS:
        errors.append("SEED_DEFAULT_USERS must be false in production.")
    if ENV == "production" and PRIMARY_ADMIN_PASSWORD:
        errors.append("PRIMARY_ADMIN_PASSWORD must not be configured in production.")
    if errors:
        raise RuntimeError("Configuration error: " + " ".join(errors))
