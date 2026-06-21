from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .core.config import DATABASE_URL

connect_args = {}
db_url = DATABASE_URL

if db_url.startswith("mysql"):
    connect_args = {
        "ssl_verify_cert": False,
        "ssl_verify_identity": False
    }
elif db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Verify cloud connection and fallback to local SQLite if unreachable
if db_url.startswith("mysql"):
    try:
        temp_engine = create_engine(db_url, connect_args=connect_args)
        # Try a quick connection test
        with temp_engine.connect() as conn:
            pass
        temp_engine.dispose()
    except Exception as e:
        import sys
        print("=" * 80, file=sys.stderr)
        print(f" DATABASE WARNING: Cloud MySQL connection failed: {e} ".center(80, "*"), file=sys.stderr)
        print(" Falling back to local SQLite database: sqlite:///local_attendance.db ".center(80, "*"), file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        db_url = "sqlite:///local_attendance.db"
        connect_args = {"check_same_thread": False}

engine = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

