"""Add tenant-scoped flexible records for operational modules."""

import sqlalchemy as sa
from alembic import op

revision = "0002_event_module_records"
down_revision = "0001_eventops_foundation"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "event_module_records",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_id", sa.String(length=36), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("module", sa.String(length=32), nullable=False),
        sa.Column("public_id", sa.String(length=48), nullable=False),
        sa.Column("name", sa.String(length=180), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("event_id", "module", "public_id", name="uq_event_module_record_public_id"),
    )
    op.create_index("ix_event_module_records_event_id", "event_module_records", ["event_id"])
    op.create_index("ix_event_module_records_module", "event_module_records", ["module"])
    op.create_index("ix_event_module_records_public_id", "event_module_records", ["public_id"])


def downgrade():
    op.drop_index("ix_event_module_records_public_id", table_name="event_module_records")
    op.drop_index("ix_event_module_records_module", table_name="event_module_records")
    op.drop_index("ix_event_module_records_event_id", table_name="event_module_records")
    op.drop_table("event_module_records")
