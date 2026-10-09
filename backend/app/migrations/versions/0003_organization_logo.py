"""Store organization logo data URLs."""

import sqlalchemy as sa
from alembic import op

revision = "0003_organization_logo"
down_revision = "0002_event_module_records"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("organizations", sa.Column("logo_data", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("organizations", "logo_data")
