"""User CRUD operations."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, InterfaceError, DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.security import get_password_hash, verify_password
from app.models.user import User, SubscriptionType
from app.auth.schemas import UserCreate

__all__ = ["user", "CRUDUser"]


class CRUDUser:
    """CRUD operations for User model."""

    def __init__(self) -> None:
        self.logger = get_logger(__name__)

    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """Get active (non-deleted) user by email."""
        try:
            result = await db.execute(
                select(User).where(User.email == email, User.deleted_at.is_(None))
            )
            return result.scalars().first()
        except (InterfaceError, DBAPIError) as e:
            self.logger.error("database_error", operation="get_by_email", email=email, error=str(e))
            raise

    async def get_by_id(self, db: AsyncSession, *, id: int) -> Optional[User]:
        """Get active (non-deleted) user by ID."""
        try:
            result = await db.execute(
                select(User).where(User.id == id, User.deleted_at.is_(None))
            )
            return result.scalars().first()
        except (InterfaceError, DBAPIError) as e:
            self.logger.error("database_error", operation="get_by_id", id=id, error=str(e))
            raise

    async def create(self, db: AsyncSession, *, obj_in: UserCreate, is_premium: bool = False) -> User:
        """Create new user."""
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            subscription_type=SubscriptionType.PREMIUM.value if is_premium else SubscriptionType.FREE.value,
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
            self.logger.error("database_error", operation="create", email=obj_in.email, error=str(e))
            raise
        return db_obj

    async def authenticate(
        self, db: AsyncSession, *, email: str, password: str
    ) -> Optional[User]:
        """Authenticate active user by email and password."""
        user = await self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def is_active(user: User) -> bool:
        """Check if user is active and not soft-deleted."""
        return user.is_active and user.deleted_at is None


user = CRUDUser()