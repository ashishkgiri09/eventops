"""Add password authentication for student team registrations."""

import sqlalchemy as sa
from alembic import op

revision = "0005_student_registration_password"
down_revision = "0004_judge_login_email"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("registrations", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column("registrations", "password_hash")
