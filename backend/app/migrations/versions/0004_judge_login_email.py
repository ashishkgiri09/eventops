"""Associate judge profiles with their invitation email."""

import sqlalchemy as sa
from alembic import op

revision = "0004_judge_login_email"
down_revision = "0003_organization_logo"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("judge_profiles", sa.Column("email", sa.String(length=320), nullable=False, server_default=""))
    op.create_index("ix_judge_profiles_email", "judge_profiles", ["email"], unique=False)


def downgrade():
    op.drop_index("ix_judge_profiles_email", table_name="judge_profiles")
    op.drop_column("judge_profiles", "email")
