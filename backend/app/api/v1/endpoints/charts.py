from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.charts.schemas import ChartCreate, Chart
from app.charts.service import chart_service
from app.charts.crud import chart as chart_crud
from app.core.config import logger

router = APIRouter()


@router.post("/natal", response_model=Chart)
async def create_natal_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: ChartCreate,
) -> Any:
    """
    Create a new natal chart.
    """
    user_id = current_user.id
    logger.info("API: Create natal chart requested", user_id=user_id, datetime=chart_in.datetime, location=chart_in.location)
    try:
        chart_data = await chart_service.create_natal_chart(
            chart_in.datetime,
            chart_in.location,
            chart_in.theme,
            chart_in.house_system,
            chart_in.preset,
            chart_in.zodiac_palette,
        )
        chart = await chart_crud.create(db, obj_in=chart_data, user_id=user_id)
        
        # Extract id before any potential session expiry
        chart_id = chart.id
        await db.commit()
        await db.refresh(chart)
        
        logger.info("API: Natal chart created successfully", user_id=user_id, chart_id=chart_id)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create natal chart", user_id=user_id, error=str(e))
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[Chart])
async def get_user_charts(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Get all charts for current user.
    """
    charts = await chart_crud.get_user_charts(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return [Chart.model_validate(chart) for chart in charts]


@router.get("/{chart_id}", response_model=Chart)
async def get_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
) -> Any:
    """
    Get a specific chart by ID.
    """
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")
    return Chart.model_validate(chart)


@router.get("/{chart_id}/svg")
async def get_chart_svg(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
) -> Any:
    """
    Get SVG file for a chart.
    """
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    try:
        with open(chart.svg_path, "rb") as f:
            svg_content = f.read()
        return {"svg": svg_content.decode()}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="SVG file not found")