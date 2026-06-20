from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .core.config import DATABASE_URL

connect_args = {}
if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
    connect_args = {
        "ssl_verify_cert": False,
        "ssl_verify_identity": False
    }

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True, pool_recycle=3600)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

