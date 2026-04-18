from typing import Any, Dict, Optional, Union

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, InterfaceError, DBAPIError

from app.core.security import get_password_hash, verify_password
from app.core.config import settings
from app.models.user import User
from app.auth.schemas import UserCreate
import structlog


class CRUDUser:
    def __init__(self):
        self.logger = structlog.get_logger(__name__)

    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        try:
            result = await db.execute(select(User).where(User.email == email))
            return result.scalars().first()
        except (InterfaceError, DBAPIError) as e:
            self.logger.error("database_error_in_get_by_email", email=email, error=str(e))
            raise

    async def get_by_id(self, db: AsyncSession, *, id: int) -> Optional[User]:
        try:
            result = await db.execute(select(User).where(User.id == id))
            return result.scalars().first()
        except (InterfaceError, DBAPIError) as e:
            self.logger.error("database_error_in_get_by_id", id=id, error=str(e))
            raise

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
        except (InterfaceError, DBAPIError) as e:
            await db.rollback()
            self.logger.error("database_error_in_create", email=obj_in.email, error=str(e))
            raise
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