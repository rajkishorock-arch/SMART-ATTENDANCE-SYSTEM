from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from .core.config import ALLOW_DATABASE_FALLBACK, DATABASE_URL

connect_args = {}
db_url = DATABASE_URL

if not db_url:
    raise RuntimeError("DATABASE_URL is required before database initialization.")


def _is_mysql(url: str) -> bool:
    return url.startswith("mysql")


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


if _is_mysql(db_url):
    connect_args = {
        "ssl_verify_cert": False,
        "ssl_verify_identity": False
    }
elif _is_sqlite(db_url):
    connect_args = {"check_same_thread": False}


def _fallback_to_sqlite(reason: Exception):
    if not ALLOW_DATABASE_FALLBACK:
        raise RuntimeError(
            "Database connection failed and fallback is disabled. "
            "Check DATABASE_URL or set ALLOW_DATABASE_FALLBACK=true for local development only."
        ) from reason
    import sys
    print("=" * 80, file=sys.stderr)
    print(f" DATABASE WARNING: Cloud database connection failed: {reason} ".center(80, "*"), file=sys.stderr)
    print(" Falling back to local SQLite database: sqlite:///local_attendance.db ".center(80, "*"), file=sys.stderr)
    print("=" * 80, file=sys.stderr)
    return "sqlite:///local_attendance.db", {"check_same_thread": False}


# Verify cloud MySQL connection and fallback only when explicitly allowed.
if _is_mysql(db_url):
    try:
        temp_engine = create_engine(db_url, connect_args=connect_args)
        with temp_engine.connect() as conn:
            pass
        temp_engine.dispose()
    except Exception as e:
        db_url, connect_args = _fallback_to_sqlite(e)

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

