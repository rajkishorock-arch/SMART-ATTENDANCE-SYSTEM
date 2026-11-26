"""Replace legacy (id, time, date) primary key on attendence with surrogate record_id."""
from alembic import op
import sqlalchemy as sa

revision = "f4a21c8e9012"
down_revision = "ca77b0319a20"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name
    inspector = sa.inspect(bind)
    cols = {c["name"].lower() for c in inspector.get_columns("attendence")}

    if dialect == "postgresql":
        if "record_id" not in cols:
            op.execute(sa.text("ALTER TABLE attendence ADD COLUMN record_id SERIAL"))
        pk_row = bind.execute(sa.text(
            "SELECT conname FROM pg_constraint WHERE conrelid = 'attendence'::regclass AND contype = 'p'"
        )).fetchone()
        if pk_row:
            op.execute(sa.text(f'ALTER TABLE attendence DROP CONSTRAINT IF EXISTS "{pk_row[0]}"'))
        op.execute(sa.text("ALTER TABLE attendence ADD PRIMARY KEY (record_id)"))
        op.execute(sa.text("ALTER TABLE attendence DROP CONSTRAINT IF EXISTS _attendance_session_uc"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_attendence_id ON attendence (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_attendence_inst_date_sub ON attendence (institution_id, date, subject_id)"))
    elif dialect == "sqlite":
        if "record_id" not in cols:
            with op.batch_alter_table("attendence") as batch_op:
                batch_op.add_column(sa.Column("record_id", sa.Integer(), autoincrement=True, nullable=True))
    elif dialect == "mysql":
        if "record_id" not in cols:
            op.execute(sa.text(
                "ALTER TABLE attendence DROP PRIMARY KEY, ADD COLUMN record_id INT AUTO_INCREMENT PRIMARY KEY FIRST"
            ))


def downgrade():
    pass
