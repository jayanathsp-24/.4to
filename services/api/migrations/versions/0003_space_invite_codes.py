"""Add unique share codes to Spaces.

Revision ID: 0003_space_invite_codes
Revises: 0002_tree_space_links
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_space_invite_codes"
down_revision = "0002_tree_space_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("spaces", sa.Column("invite_code", sa.String(16), nullable=True))
    op.create_index("ix_spaces_invite_code", "spaces", ["invite_code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_spaces_invite_code", table_name="spaces")
    op.drop_column("spaces", "invite_code")
