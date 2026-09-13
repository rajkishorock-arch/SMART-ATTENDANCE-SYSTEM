import os
import sys
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import declarative_base, sessionmaker
from .core.config import ALLOW_DATABASE_FALLBACK, DATABASE_URL

connect_args = {}
db_url = DATABASE_URL or "sqlite:///local_attendance.db"

# Normalize legacy postgres:// to postgresql://
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)


def _is_mysql(url: str) -> bool:
    return url.startswith("mysql")


def _is_postgres(url: str) -> bool:
    return url.startswith("postgresql") or url.startswith("postgres")


def _is_sqlite(url: str) -> bool:
    return url.startswith("sqlite")


if _is_mysql(db_url):
    connect_args = {
        "ssl_verify_cert": False,
        "ssl_verify_identity": False,
        "connect_timeout": 5,
    }
elif _is_sqlite(db_url):
    connect_args = {"check_same_thread": False, "timeout": 15}
elif _is_postgres(db_url):
    connect_args = {"connect_timeout": 5}


def _fallback_to_sqlite(reason: Exception):
    print("=" * 80, file=sys.stderr)
    print(f" DATABASE WARNING: Cloud database connection failed: {reason} ".center(80, "*"), file=sys.stderr)
    print(" Falling back to local SQLite database: sqlite:///local_attendance.db ".center(80, "*"), file=sys.stderr)
    print("=" * 80, file=sys.stderr)
    return "sqlite:///local_attendance.db", {"check_same_thread": False, "timeout": 15}


# Verify cloud database connection (MySQL or PostgreSQL) before creating main engine
if _is_mysql(db_url) or _is_postgres(db_url):
    try:
        temp_args = dict(connect_args)
        temp_engine = create_engine(db_url, connect_args=temp_args, pool_pre_ping=False)
        with temp_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        temp_engine.dispose()
    except Exception as e:
        db_url, connect_args = _fallback_to_sqlite(e)

engine_kwargs = {
    "connect_args": connect_args,
    "pool_pre_ping": True,
    "pool_recycle": 1800,
}

if not _is_sqlite(db_url):
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

engine = create_engine(db_url, **engine_kwargs)

if _is_sqlite(db_url):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        try:
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA cache_size=-64000")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.close()
        except Exception:
            pass

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
