"""Electional astrology endpoints — search, poll, select."""

import asyncio
import hashlib
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.auth.premium import require_premium
from app.models.user import User
from app.electional.schemas import (
    ElectionalSearchRequest,
    ElectionalSearchResponse,
    ElectionalSelectRequest,
    ElectionalMomentResult,
)
from app.electional.crud import el_crud
from app.electional.presets import get_preset_conditions
from app.electional.bg import bg_electional_and_persist
from app.charts.service import chart_service
from app.charts.crud import chart as chart_crud
from app.core.logging import logger

router = APIRouter()


@router.post("/search", response_model=ElectionalSearchResponse)
async def electional_search(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: ElectionalSearchRequest,
) -> Any:
    require_premium(current_user, "electional")

    conditions = request.conditions or get_preset_conditions(request.preset)

    request_data = {
        "location": request.location,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "preset": request.preset,
        "conditions": conditions,
        "step": request.step,
        "house_system": request.house_system,
    }

    raw = f"{request.location}|{request.start_date}|{request.end_date}|{json.dumps(conditions, sort_keys=True)}|{request.step}"
    input_hash = hashlib.sha256(raw.encode()).hexdigest()

    cached = await el_crud.get_by_user_and_hash(db, user_id=current_user.id, input_hash=input_hash)
    if cached:
        if cached.status == "done" and cached.result_data:
            return ElectionalSearchResponse(
                search_id=cached.id,
                status="done",
                progress=100,
                result=[ElectionalMomentResult(**m) for m in cached.result_data.get("moments", [])],
            )
        if cached.status == "computing":
            is_stale = await el_crud.reset_stale(db, user_id=current_user.id, input_hash=input_hash)
            if not is_stale:
                return ElectionalSearchResponse(
                    search_id=cached.id,
                    status="computing",
                    progress=cached.progress,
                )
            await db.commit()
        if cached.status == "error":
            await db.delete(cached)
            await db.flush()

    row = await el_crud.create_pending(
        db, user_id=current_user.id, input_hash=input_hash, request_data=request_data,
    )
    await db.commit()

    asyncio.create_task(bg_electional_and_persist(row.id, request_data))

    return ElectionalSearchResponse(
        search_id=row.id,
        status="computing",
        progress=0,
    )


@router.get("/{search_id}/poll", response_model=ElectionalSearchResponse)
async def electional_poll(
    search_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    from app.models.electional_cache import ElectionalCache as ElectionalCacheModel

    row = await db.get(ElectionalCacheModel, search_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")

    if row.status == "done" and row.result_data:
        return ElectionalSearchResponse(
            search_id=row.id,
            status="done",
            progress=100,
            result=[ElectionalMomentResult(**m) for m in row.result_data.get("moments", [])],
        )
    if row.status == "error":
        return ElectionalSearchResponse(
            search_id=row.id,
            status="error",
            progress=row.progress,
            error=row.error_message,
        )

    return ElectionalSearchResponse(
        search_id=row.id,
        status="computing",
        progress=row.progress,
    )


@router.post("/select", status_code=status.HTTP_201_CREATED)
async def electional_select(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    request: ElectionalSelectRequest,
) -> Any:
    from app.models.electional_cache import ElectionalCache as ElectionalCacheModel
    from app.charts.schemas import Chart

    require_premium(current_user, "electional")

    row = await db.get(ElectionalCacheModel, request.search_id)
    if not row or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Search not found")
    if row.status != "done" or not row.result_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Search results not ready")

    moments = row.result_data.get("moments", [])
    if request.moment_index < 0 or request.moment_index >= len(moments):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid moment index")

    moment = moments[request.moment_index]
    datetime_str = moment["datetime"]
    location = row.request_data["location"]
    preset = row.request_data.get("preset", "general")
    conditions = row.request_data.get("conditions", [])
    house_system = request.house_system

    question_parts = []
    if preset:
        from app.electional.presets import PRESETS
        preset_info = PRESETS.get(preset, {})
        question_parts.append(f"Электив: {preset_info.get('label_ru', preset)}")
    if moment.get("conditions_met"):
        from app.electional.presets import CONDITION_LABELS
        labels = [CONDITION_LABELS.get(k, {}).get("label_ru", k) for k in moment["conditions_met"]]
        question_parts.append(f"Выполнены: {', '.join(labels)}")
    question = ". ".join(question_parts)

    try:
        chart_data = await chart_service.create_horary_chart(
            datetime_str=datetime_str,
            location=location,
            question=question,
            theme=request.theme,
            house_system=house_system,
            name=request.name,
        )
        chart_data["chart_type"] = "electional"
        chart_data["native_data"]["preset"] = preset
        chart_data["native_data"]["electional_conditions"] = conditions
        chart_data["native_data"]["conditions_met"] = moment.get("conditions_met", [])
        chart_data["native_data"]["conditions_missed"] = moment.get("conditions_missed", [])

        chart = await chart_crud.create(db, obj_in=chart_data, user_id=current_user.id)
        await db.commit()
        await db.refresh(chart)
        return Chart.model_validate(chart)
    except Exception as e:
        logger.error("API: Failed to create electional chart", user_id=current_user.id, error=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))