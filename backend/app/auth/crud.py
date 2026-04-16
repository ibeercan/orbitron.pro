from typing import Any, Dict, Optional, Union

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.auth.schemas import UserCreate


class CRUDUser:
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def get_by_id(self, db: AsyncSession, *, id: int) -> Optional[User]:
        result = await db.execute(select(User).where(User.id == id))
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate, is_premium: bool = False) -> User:
        from app.models.user import SubscriptionType
        
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            subscription_type=SubscriptionType.PREMIUM if is_premium else SubscriptionType.FREE,
        )
        db.add(db_obj)
        try:
            await db.commit()
            await db.refresh(db_obj)
        except IntegrityError:
            await db.rollback()
            raise ValueError("User with this email already exists")
        return db_obj

    async def authenticate(
        self, db: AsyncSession, *, email: str, password: str
    ) -> Optional[User]:
        user = await self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def is_active(self, user: User) -> bool:
        return user.is_active


user = CRUDUser()