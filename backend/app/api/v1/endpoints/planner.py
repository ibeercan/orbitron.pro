"""Planner API endpoints — generate, poll, download."""

import asyncio
import hashlib
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.auth.premium import require_premium
from app.models.user import User
from app.models.planner_cache import PlannerCache as PlannerCacheModel, PlannerStatus
from app.planner.schemas import PlannerGenerateRequest, PlannerPollResponse
from app.planner.crud import pl_crud
from app.planner.bg import bg_generate_planner
from app.charts.crud import chart as chart_crud
from app.core.logging import logger

router = APIRouter()


@router.post("/generate", response_model=PlannerPollResponse)
async def planner_generate(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: PlannerGenerateRequest,
) -> Any:
    require_premium(current_user, "planner")

    chart = await chart_crud.get_by_id_and_user(db, id=request.chart_id, user_id=current_user.id)
    if not chart:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chart not found")

    native_data = chart.native_data
    if not native_data or "datetime" not in native_data or "location" not in native_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chart has no birth data")

    tz_str = "UTC"
    if isinstance(native_data.get("timezone"), str) and native_data["timezone"]:
        tz_str = native_data["timezone"]
    elif chart.result_data and isinstance(chart.result_data, dict):
        tz_info = chart.result_data.get("timezone")
        if isinstance(tz_info, str) and tz_info:
            tz_str = tz_info

    request_data = {
        "datetime": native_data["datetime"],
        "location": native_data["location"],
        "year": request.year,
        "preset": request.preset,
        "page_size": request.page_size,
        "week_starts_on": request.week_starts_on,
        "timezone": tz_str,
        "date_range_start": request.date_range_start,
        "date_range_end": request.date_range_end,
        "binding_margin": request.binding_margin,
        "front_natal": request.front_natal,
        "front_progressed": request.front_progressed,
        "front_solar_return": request.front_solar_return,
        "front_profections": request.front_profections,
        "front_zr_timeline": request.front_zr_timeline,
        "front_zr_lot": request.front_zr_lot,
        "front_ephemeris": request.front_ephemeris,
        "front_ephemeris_harmonic": request.front_ephemeris_harmonic,
        "include_natal_transits": request.include_natal_transits,
        "include_natal_transits_outer_only": request.include_natal_transits_outer_only,
        "include_mundane_transits": request.include_mundane_transits,
        "include_moon_phases": request.include_moon_phases,
        "include_voc": request.include_voc,
        "include_voc_mode": request.include_voc_mode,
        "include_ingresses": request.include_ingresses,
        "include_stations": request.include_stations,
    }

    raw = json.dumps(request_data, sort_keys=True)
    input_hash = hashlib.sha256(raw.encode()).hexdigest()

    cached = await pl_crud.get_by_user_and_hash(db, user_id=current_user.id, input_hash=input_hash)
    if cached:
        if cached.status == PlannerStatus.DONE.value and cached.pdf_data:
            return PlannerPollResponse(
                planner_id=cached.id,
                status="done",
                progress=100,
                download_url=f"/api/v1/planner/{cached.id}/download",
            )
        if cached.status == PlannerStatus.COMPUTING.value:
            is_stale = await pl_crud.reset_stale(db, user_id=current_user.id, input_hash=input_hash)
            if not is_stale:
                return PlannerPollResponse(
                    planner_id=cached.id,
                    status="computing",
                    progress=cached.progress,
                )
            await db.commit()
        if cached.status == PlannerStatus.ERROR.value:
            await db.delete(cached)
            await db.flush()

    row = await pl_crud.create_pending(
        db,
        user_id=current_user.id,
        chart_id=request.chart_id,
        input_hash=input_hash,
        year=request.year,
        preset=request.preset,
        request_data=json.dumps(request_data).encode("utf-8"),
    )
    await db.commit()

    asyncio.create_task(bg_generate_planner(row.id, request_data))

    return PlannerPollResponse(
        planner_id=row.id,
        status="computing",
        progress=0,
    )


@router.get("/{planner_id}/poll", response_model=PlannerPollResponse)
async def planner_poll(
    planner_id: int,
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    row = await db.get(PlannerCacheModel, planner_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")

    download_url = None
    if row.status == PlannerStatus.DONE.value and row.pdf_data:
        download_url = f"/api/v1/planner/{row.id}/download"

    return PlannerPollResponse(
        planner_id=row.id,
        status=row.status,
        progress=row.progress,
        download_url=download_url,
        error=row.error_message,
    )


@router.get("/{planner_id}/download")
async def planner_download(
    planner_id: int,
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Response:
    row = await db.get(PlannerCacheModel, planner_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Planner not found")

    if row.status != PlannerStatus.DONE.value or not row.pdf_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Planner PDF is not ready")

    filename = f"orbitron_planner_{row.year}_{row.preset}.pdf"
    return Response(
        content=row.pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )