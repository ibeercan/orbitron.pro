from typing import Any
from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.admin_deps import get_current_admin_user
from app.models.user import User
from app.admin import crud
from app.admin.schemas import (
    AdminUserOut,
    AdminUserListResponse,
    AdminUserUpdate,
    AdminStats,
    AdminAuditLogOut,
    AdminAuditLogListResponse,
    AdminTokenUsageOut,
    AdminTokenUsageListResponse,
    AdminTokenAnalyticsResponse,
    AdminEarlySubscriberOut,
    AdminEarlySubscriberListResponse,
    AdminInviteSubscriberResponse,
    AdminSettingsResponse,
    AdminSettingsUpdate,
)
from app.invites.crud import invite_code_crud
from app.invites.schemas import InviteCodeListResponse
from app.core.logging import logger

router = APIRouter()


@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    return await crud.get_stats(db)


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    subscription: str | None = None,
    is_admin: bool | None = None,
    is_active: bool | None = None,
    email_verified: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    rows, total = await crud.list_users(
        db,
        subscription=subscription,
        is_admin=is_admin,
        is_active=is_active,
        email_verified=email_verified,
        skip=skip,
        limit=limit,
    )
    return AdminUserListResponse(users=[AdminUserOut(**r) for r in rows], total=total)


@router.patch("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: int,
    update_in: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    updates = update_in.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    user = await crud.update_user(
        db, user_id=user_id, admin_user_id=admin.id, updates=updates,
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.commit()
    await db.refresh(user)

    charts_count = 0
    ai_requests_month = 0
    return AdminUserOut(
        id=user.id,
        email=user.email,
        subscription_type=user.subscription_type,
        subscription_end=user.subscription_end,
        is_admin=user.is_admin,
        is_active=user.is_active,
        onboarding_completed=user.onboarding_completed,
        charts_count=charts_count,
        ai_requests_month=ai_requests_month,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> None:
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    deleted = await crud.soft_delete_user(db, user_id=user_id, admin_user_id=admin.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")

    await db.commit()
    logger.info("Admin deleted user", admin_id=admin.id, user_id=user_id)


@router.get("/early-subscribers", response_model=AdminEarlySubscriberListResponse)
async def list_early_subscribers(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    subs, total = await crud.list_early_subscribers(db, skip=skip, limit=limit)
    return AdminEarlySubscriberListResponse(
        subscribers=[AdminEarlySubscriberOut.model_validate(s) for s in subs],
        total=total,
    )


@router.post("/early-subscribers/{subscriber_id}/invite", response_model=AdminInviteSubscriberResponse)
async def invite_subscriber(
    subscriber_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    code = await crud.invite_subscriber(
        db, subscriber_id=subscriber_id, admin_user_id=admin.id,
    )
    if not code:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    sub = (await crud.list_early_subscribers(db, skip=0, limit=1000))[0]
    email = ""
    for s in sub:
        if s.id == subscriber_id:
            email = s.email
            break

    await db.commit()
    return AdminInviteSubscriberResponse(code=code.code, subscriber_email=email)


@router.get("/invites", response_model=InviteCodeListResponse)
async def list_invites(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.invites.crud import invite_code_crud as ic_crud
    codes = await ic_crud.get_all(db)
    from app.invites.schemas import InviteCodeOut
    return InviteCodeListResponse(codes=[InviteCodeOut.model_validate(c) for c in codes])


@router.post("/invites/generate")
async def generate_invite(
    count: int = Query(1, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.invites.schemas import InviteCodeOut
    codes = []
    for _ in range(count):
        code = await invite_code_crud.create(db)
        codes.append(InviteCodeOut.model_validate(code))
    await db.commit()
    return {"codes": codes}


@router.get("/audit-logs", response_model=AdminAuditLogListResponse)
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    entity_type: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    logs, total = await crud.list_audit_logs(
        db,
        entity_type=entity_type,
        action=action,
        user_id=user_id,
        skip=skip,
        limit=limit,
    )
    return AdminAuditLogListResponse(
        logs=[AdminAuditLogOut.model_validate(l) for l in logs],
        total=total,
    )


@router.get("/token-usage", response_model=AdminTokenUsageListResponse)
async def list_token_usage(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> Any:
    entries, total = await crud.list_token_usage(db, skip=skip, limit=limit)
    return AdminTokenUsageListResponse(
        entries=[AdminTokenUsageOut(**e) for e in entries],
        total=total,
    )


@router.get("/token-analytics", response_model=AdminTokenAnalyticsResponse)
async def get_token_analytics(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    user_id: int | None = None,
) -> Any:
    from app.admin.schemas import (
        AdminTokenUsageSummary,
        AdminTokenUsageByUser,
        AdminTokenUsageByDate,
    )
    result = await crud.get_token_analytics(
        db, start_date=start_date, end_date=end_date, user_id=user_id,
    )
    return AdminTokenAnalyticsResponse(
        summary=AdminTokenUsageSummary(**result["summary"]),
        by_user=[AdminTokenUsageByUser(**u) for u in result["by_user"]],
        by_date=[AdminTokenUsageByDate(**d) for d in result["by_date"]],
    )


@router.get("/settings", response_model=AdminSettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
) -> Any:
    from app.admin.settings import get_all_settings
    settings = await get_all_settings(db)
    return AdminSettingsResponse(settings=settings)


@router.patch("/settings", response_model=AdminSettingsResponse)
async def update_settings(
    *,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
    body: AdminSettingsUpdate,
) -> Any:
    from app.admin.settings import set_setting, get_all_settings
    from app.core.constants import REGISTRATION_OPEN_KEY

    await set_setting(db, REGISTRATION_OPEN_KEY, "true" if body.registration_open else "false")
    await db.commit()
    settings = await get_all_settings(db)
    return AdminSettingsResponse(settings=settings)
