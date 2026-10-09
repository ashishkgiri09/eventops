"""Create the initial EVENTOPS schema."""

from alembic import op

from app.database import Base
from app import models  # noqa: F401

revision = "0001_eventops_foundation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    tables = [table for table in Base.metadata.sorted_tables if table.name != "event_module_records"]
    Base.metadata.create_all(bind=op.get_bind(), tables=tables)


def downgrade():
    Base.metadata.drop_all(bind=op.get_bind())
