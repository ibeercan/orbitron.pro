import base64
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.charts.schemas import ChartCreate, Chart
from app.charts.service import chart_service
from app.charts.crud import chart as chart_crud
from app.core.logging import logger

SVG_BASE_DIR = Path("/app/charts")

router = APIRouter()


@router.post("/natal", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_natal_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: ChartCreate,
) -> Any:
    """Create a new natal chart. SVG is stored as base64 in the database."""
    user_id = current_user.id
    logger.info(
        "API: Create natal chart requested",
        user_id=user_id,
        datetime=chart_in.datetime,
        location=chart_in.location,
    )
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
        await db.commit()
        await db.refresh(chart)

        logger.info("API: Natal chart created", user_id=user_id, chart_id=chart.id)
        return Chart.model_validate(chart)

    except Exception as e:
        logger.error("API: Failed to create natal chart", user_id=user_id, error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[Chart])
async def get_user_charts(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Get all charts for the current user (svg_data excluded for performance)."""
    charts = await chart_crud.get_user_charts(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    result = []
    for c in charts:
        validated = Chart.model_validate(c)
        validated.svg_data = None
        result.append(validated)
    return result


@router.get("/{chart_id}", response_model=Chart)
async def get_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
) -> Any:
    """Get a specific chart by ID including its SVG data."""
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    return Chart.model_validate(chart)


@router.get("/{chart_id}/svg")
async def get_chart_svg(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
) -> Any:
    """Get SVG content for a chart. Returns base64-decoded SVG string."""
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")

    if chart.svg_data:
        try:
            svg_str = base64.b64decode(chart.svg_data).decode("utf-8")
            return {"svg": svg_str}
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to decode SVG data")

    # Legacy path: svg stored as file on disk — validate path to prevent traversal
    if chart.svg_path:
        try:
            svg_path = Path(chart.svg_path).resolve()
            if not str(svg_path).startswith(str(SVG_BASE_DIR.resolve())):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid SVG path")
            svg_content = svg_path.read_bytes()
            return {"svg": svg_content.decode("utf-8")}
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SVG file not found on disk")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to read SVG file")

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No SVG data available for this chart")


@router.delete("/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
) -> None:
    """Soft-delete a chart and all associated chat sessions."""
    user_id = current_user.id
    deleted = await chart_crud.soft_delete(db, id=chart_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    await db.commit()
    logger.info("API: Chart soft-deleted", user_id=user_id, chart_id=chart_id)