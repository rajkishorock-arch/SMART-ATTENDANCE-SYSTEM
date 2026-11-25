"""Institution security policy, notice grouping and individual inbox receipts."""
from alembic import op
import sqlalchemy as sa

revision = "ca77b0319a20"
down_revision = "b30f9b2d563c"
branch_labels = None
depends_on = None


def upgrade():
    tables = set(sa.inspect(op.get_bind()).get_table_names())
    if "campus_security_policies" not in tables:
        op.create_table("campus_security_policies",
            sa.Column("institution_id", sa.Integer, sa.ForeignKey("institutions.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("locked", sa.Boolean, nullable=False), sa.Column("confidence_filter", sa.Boolean, nullable=False),
            sa.Column("similarity", sa.Float, nullable=False), sa.Column("blink_ear", sa.Float, nullable=False))
    if "broadcast_entries" not in tables:
        op.create_table("broadcast_entries",
            sa.Column("notification_id", sa.Integer, sa.ForeignKey("notifications.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("group_id", sa.String(36), nullable=False), sa.Column("effective_date", sa.String(10)))
        op.create_index("ix_broadcast_entries_group_id", "broadcast_entries", ["group_id"])
    if "notification_receipts" not in tables:
        op.create_table("notification_receipts",
            sa.Column("notification_id", sa.Integer, sa.ForeignKey("notifications.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("identity_role", sa.String(30), primary_key=True), sa.Column("identity_id", sa.Integer, primary_key=True),
            sa.Column("dismissed", sa.Boolean, nullable=False))


def downgrade():
    for table in ("notification_receipts", "broadcast_entries", "campus_security_policies"):
        op.drop_table(table)
