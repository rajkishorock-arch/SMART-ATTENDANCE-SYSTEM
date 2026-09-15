import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Ensure backend root is on sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import application metadata without importing main.py (avoiding startup side-effects)
from app.database import Base
from app import models  # Ensure all models are registered on Base.metadata
from app.core.config import DATABASE_URL

config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_db_url() -> str:
    """Retrieves normalized database URL from environment or application config."""
    db_url = DATABASE_URL or os.getenv("DATABASE_URL") or "sqlite:///local_attendance.db"
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    return db_url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_db_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True if url.startswith("sqlite") else False,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section) or {}
    url = get_db_url()
    configuration["sqlalchemy.url"] = url

    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    elif url.startswith("mysql"):
        connect_args = {"ssl_verify_cert": False, "ssl_verify_identity": False}

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True if url.startswith("sqlite") else False,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
