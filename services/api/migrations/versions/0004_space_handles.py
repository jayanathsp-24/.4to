"""Add unique human-readable Space handles.

Revision ID: 0004_space_handles
Revises: 0003_space_invite_codes
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_space_handles"
down_revision = "0003_space_invite_codes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("spaces", sa.Column("handle", sa.String(40), nullable=True))
    op.create_index("ix_spaces_handle", "spaces", ["handle"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_spaces_handle", table_name="spaces")
    op.drop_column("spaces", "handle")
