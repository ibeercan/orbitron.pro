from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.models.chart import Chart as ChartModel
from app.models.chat import ChatSession


class CRUDChart:
    async def create(
        self, db: AsyncSession, *, obj_in: dict, user_id: int
    ) -> ChartModel:
        db_obj = ChartModel(
            user_id=user_id,
            native_data=obj_in["native_data"],
            result_data=obj_in["result_data"],
            svg_data=obj_in.get("svg_data"),
            prompt_text=obj_in["prompt_text"],
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_by_id_and_user(
        self, db: AsyncSession, *, id: int, user_id: int
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
            .order_by(ChartModel.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def delete(
        self, db: AsyncSession, *, id: int, user_id: int
    ) -> bool:
        """Delete a chart and all its chat sessions (cascade). Returns True if deleted."""
        # Verify ownership first
        chart = await self.get_by_id_and_user(db, id=id, user_id=user_id)
        if not chart:
            return False

        # Delete chat sessions for this chart (messages cascade via DB)
        await db.execute(
            delete(ChatSession).where(
                ChatSession.chart_id == id,
                ChatSession.user_id == user_id,
            )
        )

        # Delete the chart
        await db.execute(
            delete(ChartModel).where(
                ChartModel.id == id,
                ChartModel.user_id == user_id,
            )
        )
        await db.commit()
        return True


chart = CRUDChart()
