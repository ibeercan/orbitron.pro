"""Invite code CRUD operations."""

import secrets
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invite_code import InviteCode

__all__ = ["invite_code_crud", "CRUDInviteCode"]


class CRUDInviteCode:
    """CRUD operations for InviteCode model."""

    def generate_code(self, length: int = 8) -> str:
        """Generate a cryptographically random invite code."""
        return secrets.token_hex(length // 2 + 1)[:length].upper()

    async def get_by_code(self, db: AsyncSession, *, code: str) -> Optional[InviteCode]:
        """Get invite code by code string (excluding soft-deleted)."""
        result = await db.execute(
            select(InviteCode).where(
                InviteCode.code == code.upper(),
                InviteCode.deleted_at.is_(None),
            )
        )
        return result.scalars().first()

    async def get_all(self, db: AsyncSession) -> list[InviteCode]:
        """Get all non-deleted invite codes."""
        result = await db.execute(
            select(InviteCode)
            .where(InviteCode.deleted_at.is_(None))
            .order_by(InviteCode.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, db: AsyncSession) -> InviteCode:
        """Create new invite code."""
        code = self.generate_code()
        db_obj = InviteCode(code=code)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def mark_used(self, db: AsyncSession, code: InviteCode) -> InviteCode:
        """Mark invite code as used."""
        code.used = True
        db.add(code)
        await db.commit()
        await db.refresh(code)
        return code

    async def mark_used_with_email(self, db: AsyncSession, code: InviteCode, email: str) -> InviteCode:
        """Mark invite code as used with the email of the user who used it."""
        code.mark_used(email)
        db.add(code)
        await db.commit()
        await db.refresh(code)
        return code


invite_code_crud = CRUDInviteCode()