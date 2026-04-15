from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.chart import Chart as ChartModel
from app.charts.schemas import ChartCreate


class CRUDChart:
    async def create(
        self, db: AsyncSession, *, obj_in: dict, user_id: int
    ) -> ChartModel:
        db_obj = ChartModel(
            user_id=user_id,
            native_data=obj_in["native_data"],
            result_data=obj_in["result_data"],
            svg_path=obj_in["svg_path"],
            prompt_text=obj_in["prompt_text"],
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_id_and_user(
        self, db: AsyncSession, *, id: str, user_id: int
    ) -> Optional[ChartModel]:
        result = await db.execute(
            select(ChartModel).where(
                ChartModel.id == id, ChartModel.user_id == user_id
            )
        )
        return result.scalars().first()

    async def get_user_charts(
        self, db: AsyncSession, *, user_id: int, skip: int = 0, limit: int = 100
    ) -> List[ChartModel]:
        result = await db.execute(
            select(ChartModel)
            .where(ChartModel.user_id == user_id)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()


chart = CRUDChart()