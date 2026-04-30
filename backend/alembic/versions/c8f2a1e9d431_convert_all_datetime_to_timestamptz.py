"""convert all datetime columns to timestamptz

Revision ID: c8f2a1e9d431
Revises: bda413a2dfdd
Create Date: 2026-04-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'c8f2a1e9d431'
down_revision: Union[str, None] = 'bda413a2dfdd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TSTAMPTZ = sa.DateTime(timezone=True)
TIMESTAMP = sa.DateTime()

TABLES_COLUMNS = [
    ("app_settings", ["created_at", "updated_at"]),
    ("audit_logs", ["created_at", "updated_at"]),
    ("early_subscribers", ["created_at", "updated_at", "deleted_at"]),
    ("invite_codes", ["used_at", "created_at", "updated_at", "deleted_at"]),
    ("users", ["subscription_end", "verification_token_expires", "created_at", "updated_at", "deleted_at"]),
    ("ai_token_usage", ["created_at", "updated_at"]),
    ("electional_cache", ["created_at", "updated_at"]),
    ("persons", ["created_at", "updated_at", "deleted_at"]),
    ("rectification_cache", ["created_at", "updated_at"]),
    ("refresh_tokens", ["expires_at", "revoked_at", "created_at"]),
    ("subscriptions", ["start_date", "end_date", "cancelled_at", "created_at", "updated_at", "deleted_at"]),
    ("charts", ["created_at", "updated_at", "deleted_at"]),
    ("payments", ["refunded_at", "created_at", "updated_at", "deleted_at"]),
    ("chat_sessions", ["created_at", "updated_at", "deleted_at"]),
    ("insight_cache", ["created_at", "updated_at"]),
    ("planner_cache", ["created_at", "updated_at"]),
    ("request_logs", ["created_at", "updated_at"]),
    ("chat_messages", ["created_at", "updated_at"]),
]


def upgrade() -> None:
    for table, columns in TABLES_COLUMNS:
        for col in columns:
            op.alter_column(
                table, col,
                type_=TSTAMPTZ,
                existing_type=TIMESTAMP,
                postgresql_using=f"{col} AT TIME ZONE 'UTC'",
            )


def downgrade() -> None:
    for table, columns in TABLES_COLUMNS:
        for col in columns:
            op.alter_column(
                table, col,
                type_=TIMESTAMP,
                existing_type=TSTAMPTZ,
                postgresql_using=f"{col} AT TIME ZONE 'UTC'",
            )