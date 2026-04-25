import asyncio
import base64
from datetime import datetime as dt, timezone
from io import BytesIO
from pathlib import Path
from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.auth.premium import require_premium
from app.models.user import User
from app.models.chart import ChartType
from app.models.insight_cache import InsightStatus
from app.charts.schemas import (
    ChartCreate,
    SynastryCreate,
    TransitCreate,
    SolarReturnCreate,
    LunarReturnCreate,
    ProfectionCreate,
    SolarArcCreate,
    Chart,
    ProfectionResponse,
    TransitTimelineEntry,
    TransitTimelineResponse,
    AstroTwinsResponse,
    AstroTwinResult,
    HistoricalParallelsResponse,
    HistoricalParallelResult,
    NotableEventsResponse,
    NotableEventInfo,
)
from app.charts.rectification_schemas import RectificationRequest, RectificationResponse
from app.charts.rectification import rectify
from app.charts.service import chart_service, _build_natal
from app.charts import notables
from app.charts.crud import chart as chart_crud
from app.insights.crud import insight_crud
from app.persons.crud import person as person_crud
from app.core.logging import logger

SVG_BASE_DIR = Path("/app/charts")

router = APIRouter()


async def _get_native_data(db: AsyncSession, chart_id: int, user_id: int) -> dict:
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=user_id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    if chart.chart_type != ChartType.NATAL.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source chart must be a natal chart")
    return chart.native_data, chart


@router.post("/natal", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_natal_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: ChartCreate,
) -> Any:
    user_id = current_user.id
    try:
        await chart_crud.check_chart_limit(db, user_id=user_id, subscription_type=current_user.subscription_type)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    try:
        chart_data = await chart_service.create_natal_chart(
            chart_in.datetime,
            chart_in.location,
            chart_in.theme,
            chart_in.house_system,
            chart_in.preset,
            chart_in.zodiac_palette,
            chart_in.name,
        )
        chart = await chart_crud.create(db, obj_in=chart_data, user_id=user_id)
        await db.commit()
        await db.refresh(chart)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create natal chart", user_id=user_id, error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/synastry", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_synastry_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: SynastryCreate,
) -> Any:
    require_premium(current_user, "synastry_ai")
    user_id = current_user.id
    native_data, natal_chart = await _get_native_data(db, chart_in.natal_chart_id, user_id)

    person2_datetime = chart_in.person2_datetime
    person2_location = chart_in.person2_location
    person2_name = chart_in.person2_name or "Partner"
    person1_name = natal_chart.name or "You"
    person_id = chart_in.person_id

    if person_id:
        person_obj = await person_crud.get_by_id_and_user(db, id=person_id, user_id=user_id)
        if not person_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
        person2_datetime = person_obj.datetime
        person2_location = person_obj.location
        person2_name = person_obj.name

    if not person2_datetime or not person2_location:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either person_id or person2_datetime+person2_location required",
        )

    try:
        chart_data = await chart_service.create_synastry_chart(
            natal_chart_data=native_data,
            person2_datetime=person2_datetime,
            person2_location=person2_location,
            person2_name=person2_name,
            person1_name=person1_name,
            theme=chart_in.theme,
            person_id=person_id,
            natal_chart_id=chart_in.natal_chart_id,
            natal_chart_name=natal_chart.name,
        )
        chart = await chart_crud.create(db, obj_in=chart_data, user_id=user_id)
        await db.commit()
        await db.refresh(chart)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create synastry chart", user_id=user_id, error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/transit", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_transit_chart(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: TransitCreate,
) -> Any:
    user_id = current_user.id
    native_data, natal_chart = await _get_native_data(db, chart_in.natal_chart_id, user_id)

    if chart_in.transit_datetime:
        require_premium(current_user, "transit_custom_date")

    try:
        chart_data = await chart_service.create_transit_chart(
            natal_chart_data=native_data,
            transit_datetime=chart_in.transit_datetime,
            theme=chart_in.theme,
            natal_chart_id=chart_in.natal_chart_id,
            natal_chart_name=natal_chart.name,
        )
        chart = await chart_crud.create(db, obj_in=chart_data, user_id=user_id)
        await db.commit()
        await db.refresh(chart)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create transit chart", user_id=user_id, error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/transit-timeline", response_model=TransitTimelineResponse)
async def get_transit_timeline(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    natal_chart_id: int,
    start_date: str,
    end_date: str,
) -> Any:
    require_premium(current_user, "transit_custom_date")
    native_data, _ = await _get_native_data(db, natal_chart_id, current_user.id)
    try:
        entries = await chart_service.calculate_transit_periods(native_data, start_date, end_date)
        return TransitTimelineResponse(entries=[TransitTimelineEntry(**e) for e in entries])
    except Exception as e:
        logger.error("API: Failed to calculate transit timeline", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/solar-return", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_solar_return(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: SolarReturnCreate,
) -> Any:
    require_premium(current_user, "solar_return")
    native_data, natal_chart = await _get_native_data(db, chart_in.natal_chart_id, current_user.id)
    loc_override = None
    if chart_in.location_override:
        parts = chart_in.location_override.split(",")
        if len(parts) == 2:
            try:
                loc_override = (float(parts[0].strip()), float(parts[1].strip()))
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="location_override must be 'lat,lon'")
    try:
        chart_data = await chart_service.create_solar_return(
            natal_chart_data=native_data,
            year=chart_in.year,
            location_override=loc_override,
            theme=chart_in.theme,
            natal_chart_id=chart_in.natal_chart_id,
            natal_chart_name=natal_chart.name,
        )
        chart = await chart_crud.create(db, obj_in=chart_data, user_id=current_user.id)
        await db.commit()
        await db.refresh(chart)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create solar return", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/lunar-return", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_lunar_return(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: LunarReturnCreate,
) -> Any:
    require_premium(current_user, "lunar_return")
    native_data, natal_chart = await _get_native_data(db, chart_in.natal_chart_id, current_user.id)
    try:
        chart_data = await chart_service.create_lunar_return(
            natal_chart_data=native_data,
            near_date=chart_in.near_date,
            theme=chart_in.theme,
            natal_chart_id=chart_in.natal_chart_id,
            natal_chart_name=natal_chart.name,
        )
        chart = await chart_crud.create(db, obj_in=chart_data, user_id=current_user.id)
        await db.commit()
        await db.refresh(chart)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create lunar return", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/profection", response_model=ProfectionResponse)
async def create_profection(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: ProfectionCreate,
) -> Any:
    require_premium(current_user, "profection")
    native_data, natal_chart = await _get_native_data(db, chart_in.natal_chart_id, current_user.id)
    try:
        result = await chart_service.create_profection(
            natal_chart_data=native_data,
            target_date=chart_in.target_date,
            age=chart_in.age,
            rulership=chart_in.rulership,
            natal_chart_id=chart_in.natal_chart_id,
            natal_chart_name=natal_chart.name,
        )
        profection_data = result["result_data"]
        chart_obj = await chart_crud.create(db, obj_in=result, user_id=current_user.id)
        await db.commit()
        await db.refresh(chart_obj)
        return ProfectionResponse(
            chart=Chart.model_validate(chart_obj),
            profected_house=profection_data["profected_house"],
            profected_sign=profection_data["profected_sign"],
            ruler=profection_data["ruler"],
            ruler_house=profection_data.get("ruler_house"),
            ruler_position=profection_data.get("ruler_position"),
            planets_in_house=profection_data.get("planets_in_house", []),
        )
    except Exception as e:
        logger.error("API: Failed to create profection", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/solar-arc", response_model=Chart, status_code=status.HTTP_201_CREATED)
async def create_solar_arc(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_in: SolarArcCreate,
) -> Any:
    require_premium(current_user, "solar_arc")
    native_data, natal_chart = await _get_native_data(db, chart_in.natal_chart_id, current_user.id)
    try:
        chart_data = await chart_service.create_solar_arc(
            natal_chart_data=native_data,
            target_date=chart_in.target_date,
            age=chart_in.age,
            theme=chart_in.theme,
            natal_chart_id=chart_in.natal_chart_id,
            natal_chart_name=natal_chart.name,
        )
        chart = await chart_crud.create(db, obj_in=chart_data, user_id=current_user.id)
        await db.commit()
        await db.refresh(chart)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create solar arc", error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{chart_id}/report")
async def generate_pdf_report(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_id: int,
    preset: str = "standard",
    title: str | None = None,
) -> Any:
    require_premium(current_user, "pdf_report")
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    try:
        pdf_bytes = await chart_service.generate_pdf_report(
            natal_chart_data=chart.native_data,
            chart_type=chart.chart_type,
            preset=preset,
            title=title,
        )
        return StreamingResponse(
            BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=orbitron_report_{chart_id}.pdf"},
        )
    except Exception as e:
        logger.error("API: Failed to generate PDF report", chart_id=chart_id, error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=List[Chart])
async def get_user_charts(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    chart_type: str | None = None,
    skip: int = 0,
    limit: int = 100,
) -> Any:
    charts = await chart_crud.get_user_charts(
        db, user_id=current_user.id, chart_type=chart_type, skip=skip, limit=limit
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
    chart = await chart_crud.get_by_id_and_user(db, id=chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")

    if chart.svg_data:
        try:
            svg_str = base64.b64decode(chart.svg_data).decode("utf-8")
            return {"svg": svg_str}
        except Exception:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to decode SVG data")

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
    deleted = await chart_crud.soft_delete(db, id=chart_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")
    await db.commit()
    logger.info("API: Chart soft-deleted", user_id=current_user.id, chart_id=chart_id)


@router.post("/astro-twins", response_model=AstroTwinsResponse)
async def get_astro_twins(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    natal_chart_id: int,
) -> Any:
    require_premium(current_user, "astro_twins")
    native_data, _ = await _get_native_data(db, natal_chart_id, current_user.id)

    cached = await insight_crud.get_by_chart_and_type(
        db, natal_chart_id=natal_chart_id, insight_type="astro_twins",
    )

    if cached:
        if cached.status == InsightStatus.DONE.value and cached.result_data:
            results = [AstroTwinResult(**r) for r in cached.result_data.get("results", [])]
            return AstroTwinsResponse(status="done", results=results)
        if cached.status == InsightStatus.COMPUTING.value:
            is_stale = await insight_crud.reset_stale(
                db, natal_chart_id=natal_chart_id, insight_type="astro_twins",
            )
            if not is_stale:
                return AstroTwinsResponse(status="computing", results=[])
            await db.commit()
        if cached.status == InsightStatus.ERROR.value:
            await db.delete(cached)
            await db.flush()

    user_chart = _build_natal(native_data["datetime"], native_data["location"])
    row = await insight_crud.create_pending(
        db, natal_chart_id=natal_chart_id, insight_type="astro_twins",
    )
    await db.commit()

    asyncio.create_task(notables.bg_compute_and_persist(row.id, "astro_twins", user_chart))

    return AstroTwinsResponse(status="computing", results=[])


@router.post("/historical-parallels", response_model=HistoricalParallelsResponse)
async def get_historical_parallels(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    natal_chart_id: int,
) -> Any:
    require_premium(current_user, "historical_parallels")
    native_data, _ = await _get_native_data(db, natal_chart_id, current_user.id)

    cached = await insight_crud.get_by_chart_and_type(
        db, natal_chart_id=natal_chart_id, insight_type="historical_parallels",
    )

    if cached:
        if cached.status == InsightStatus.DONE.value and cached.result_data:
            results = [HistoricalParallelResult(**r) for r in cached.result_data.get("results", [])]
            return HistoricalParallelsResponse(status="done", results=results)
        if cached.status == InsightStatus.COMPUTING.value:
            is_stale = await insight_crud.reset_stale(
                db, natal_chart_id=natal_chart_id, insight_type="historical_parallels",
            )
            if not is_stale:
                return HistoricalParallelsResponse(status="computing", results=[])
            await db.commit()
        if cached.status == InsightStatus.ERROR.value:
            await db.delete(cached)
            await db.flush()

    user_chart = _build_natal(native_data["datetime"], native_data["location"])
    row = await insight_crud.create_pending(
        db, natal_chart_id=natal_chart_id, insight_type="historical_parallels",
    )
    await db.commit()

    asyncio.create_task(notables.bg_compute_and_persist(row.id, "historical_parallels", user_chart))

    return HistoricalParallelsResponse(status="computing", results=[])


@router.get("/notable-events", response_model=NotableEventsResponse)
async def list_notable_events(
    current_user: User = Depends(get_current_active_user),
) -> Any:
    events = notables.list_notable_events()
    return NotableEventsResponse(events=[NotableEventInfo(**e) for e in events])


@router.post("/rectify", response_model=RectificationResponse)
async def rectify_birth_time(
    request: RectificationRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    require_premium(current_user, "rectification")
    return await asyncio.to_thread(rectify, request)
