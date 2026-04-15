from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.early_subscriber import EarlySubscriber
from app.subscriptions.schemas import SubscribeRequest


class CRUDEarlySubscriber:
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[EarlySubscriber]:
        result = await db.execute(select(EarlySubscriber).where(EarlySubscriber.email == email))
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: SubscribeRequest) -> EarlySubscriber:
        db_obj = EarlySubscriber(email=obj_in.email)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj


early_subscriber = CRUDEarlySubscriber()