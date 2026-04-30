"""Person CRUD operations."""

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.person import Person as PersonModel

__all__ = ["person", "CRUDPerson"]


class CRUDPerson:
    async def create(
        self, db: AsyncSession, *, obj_in: dict, user_id: int
    ) -> PersonModel:
        db_obj = PersonModel(
            user_id=user_id,
            name=obj_in["name"],
            datetime=obj_in["datetime"],
            location=obj_in["location"],
        )
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_id_and_user(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> Optional[PersonModel]:
        result = await db.execute(
            select(PersonModel).where(
                PersonModel.id == id,
                PersonModel.user_id == user_id,
                PersonModel.deleted_at.is_(None),
            )
        )
        return result.scalars().first()

    async def get_user_persons(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[PersonModel]:
        result = await db.execute(
            select(PersonModel)
            .where(PersonModel.user_id == user_id, PersonModel.deleted_at.is_(None))
            .order_by(PersonModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update(
        self, db: AsyncSession, *, db_obj: PersonModel, obj_in: dict
    ) -> PersonModel:
        for key, value in obj_in.items():
            if value is not None:
                setattr(db_obj, key, value)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def soft_delete(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> bool:
        person = await self.get_by_id_and_user(db, id=id, user_id=user_id)
        if not person:
            return False
        person.soft_delete()
        await db.flush()
        return True


person = CRUDPerson()
