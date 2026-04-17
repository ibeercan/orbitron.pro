from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.charts.schemas import ChartCreate, Chart
from app.charts.service import chart_service
from app.charts.crud import chart as chart_crud
from app.core.config import logger

router = APIRouter()


@router.post("/natal", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_natal_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: ChartCreate,
) -> Any:
    """
    Create a new natal chart. SVG is generated in-memory and stored as
    base64 in the database — no files are written to disk.
    """
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
        raise HTTPException(status_code=400, detail=str(e))


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
    # Return charts without svg_data in list view to reduce payload
    result = []
    for c in charts:
        validated = Chart.model_validate(c)
        validated.svg_data = None  # strip heavy field from list response
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
    Get SVG content for a chart.
    Returns the base64-decoded SVG string, identical contract to the old endpoint.
    Supports both new (svg_data in DB) and legacy (svg_path on disk) charts.
    """
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    # New path: svg stored as base64 in DB
    if chart.svg_data:
        import base64
        try:
            svg_str = base64.b64decode(chart.svg_data).decode("utf-8")
            return {"svg": svg_str}
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to decode SVG data")

    # Legacy path: svg stored as file on disk
    if chart.svg_path:
        try:
            with open(chart.svg_path, "rb") as f:
                svg_content = f.read()
            return {"svg": svg_content.decode("utf-8")}
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="SVG file not found on disk")
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to read SVG file")

    raise HTTPException(status_code=404, detail="No SVG data available for this chart")


@router.delete("/{chart_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
) -> None:
    """
    Delete a chart and all associated chat sessions / messages.
    Returns 204 No Content on success, 404 if not found or not owned by user.
    """
    deleted = await chart_crud.delete(db, id=chart_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chart not found")
    logger.info("API: Chart deleted", user_id=current_user.id, chart_id=chart_id)
