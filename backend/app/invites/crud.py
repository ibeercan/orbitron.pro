import secrets
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.invite_code import InviteCode
from app.invites.schemas import InviteCodeCreate


class CRUDInviteCode:
    def generate_code(self, length: int = 6) -> str:
        return secrets.token_urlsafe(length)[:length].upper()
    
    async def get_by_code(self, db: AsyncSession, *, code: str) -> Optional[InviteCode]:
        result = await db.execute(
            select(InviteCode).where(InviteCode.code == code.upper())
        )
        return result.scalars().first()
    
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[InviteCode]:
        result = await db.execute(
            select(InviteCode).where(InviteCode.email == email.lower())
        )
        return result.scalars().first()
    
    async def get_all(self, db: AsyncSession) -> list[InviteCode]:
        result = await db.execute(select(InviteCode).order_by(InviteCode.created_at.desc()))
        return list(result.scalars().all())
    
    async def create(self, db: AsyncSession, *, obj_in: InviteCodeCreate) -> InviteCode:
        code = self.generate_code()
        db_obj = InviteCode(
            code=code,
            email=obj_in.email.lower()
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    
    async def mark_used(self, db: AsyncSession, code: InviteCode) -> InviteCode:
        code.used = True
        db.add(code)
        await db.commit()
        await db.refresh(code)
        return code
    
    async def mark_used_with_email(self, db: AsyncSession, code: InviteCode, email: str) -> InviteCode:
        code.used = True
        code.used_email = email.lower()
        db.add(code)
        await db.commit()
        await db.refresh(code)
        return code


invite_code = CRUDInviteCode()
