from datetime import datetime, timezone, date as date_type
from typing import Any, Optional

from sqlalchemy import select, func, case, and_, cast, Date as SaDate
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, SubscriptionType
from app.models.chart import Chart as ChartModel
from app.models.audit import AuditLog, serialize_for_audit
from app.models.early_subscriber import EarlySubscriber
from app.models.request import RequestLog
from app.ai.token_usage import TokenUsage
from app.models.invite_code import InviteCode
from app.invites.crud import invite_code_crud
from app.core.logging import logger


async def list_users(
    db: AsyncSession,
    *,
    subscription: str | None = None,
    is_admin: bool | None = None,
    is_active: bool | None = None,
    email_verified: bool | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[dict], int]:
    base_q = select(User).where(User.deleted_at.is_(None))
    count_q = select(func.count(User.id)).where(User.deleted_at.is_(None))

    if subscription:
        base_q = base_q.where(User.subscription_type == subscription)
        count_q = count_q.where(User.subscription_type == subscription)
    if is_admin is not None:
        base_q = base_q.where(User.is_admin == is_admin)
        count_q = count_q.where(User.is_admin == is_admin)
    if is_active is not None:
        base_q = base_q.where(User.is_active == is_active)
        count_q = count_q.where(User.is_active == is_active)
    if email_verified is not None:
        base_q = base_q.where(User.email_verified == email_verified)
        count_q = count_q.where(User.email_verified == email_verified)

    total = (await db.execute(count_q)).scalar() or 0

    users_q = (
        base_q.order_by(User.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(users_q)
    users = list(result.scalars().all())

    now_utc = datetime.now(timezone.utc)
    month_start = datetime(now_utc.year, now_utc.month, 1, tzinfo=timezone.utc)

    rows = []
    for u in users:
        charts_count = (
            await db.execute(
                select(func.count(ChartModel.id)).where(
                    ChartModel.user_id == u.id,
                    ChartModel.deleted_at.is_(None),
                )
            )
        ).scalar() or 0

        ai_requests_month = (
            await db.execute(
                select(func.count(RequestLog.id)).where(
                    RequestLog.user_id == u.id,
                    RequestLog.created_at >= month_start,
                )
            )
        ).scalar() or 0

        rows.append({
            "id": u.id,
            "email": u.email,
            "email_verified": u.email_verified,
            "subscription_type": u.subscription_type,
            "subscription_end": u.subscription_end,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "onboarding_completed": u.onboarding_completed,
            "charts_count": charts_count,
            "ai_requests_month": ai_requests_month,
            "created_at": u.created_at,
        })

    return rows, total


async def update_user(
    db: AsyncSession,
    *,
    user_id: int,
    admin_user_id: int,
    updates: dict,
) -> User | None:
    user = await db.get(User, user_id)
    if not user or user.deleted_at is not None:
        return None

    old_values = serialize_for_audit(user)

    changed = False
    if updates.get("subscription_type") is not None and updates["subscription_type"] != user.subscription_type:
        user.subscription_type = updates["subscription_type"]
        changed = True
    if updates.get("is_admin") is not None and updates["is_admin"] != user.is_admin:
        user.is_admin = updates["is_admin"]
        changed = True
    if updates.get("is_active") is not None and updates["is_active"] != user.is_active:
        user.is_active = updates["is_active"]
        changed = True

    if not changed:
        return user

    new_values = serialize_for_audit(user)
    audit = AuditLog.log_update(
        entity_type="user",
        entity_id=user.id,
        old_values=old_values,
        new_values=new_values,
        user_id=admin_user_id,
    )
    db.add(audit)
    await db.flush()
    await db.refresh(user)
    return user


async def soft_delete_user(
    db: AsyncSession,
    *,
    user_id: int,
    admin_user_id: int,
) -> bool:
    user = await db.get(User, user_id)
    if not user or user.deleted_at is not None:
        return False

    old_values = serialize_for_audit(user)
    user.soft_delete()

    audit = AuditLog.log_delete(
        entity_type="user",
        entity_id=user.id,
        old_values=old_values,
        user_id=admin_user_id,
    )
    db.add(audit)
    await db.flush()
    return True


async def get_stats(db: AsyncSession, *, input_rub: float = 0.0, output_rub: float = 0.0) -> dict:
    total_users = (await db.execute(
        select(func.count(User.id)).where(User.deleted_at.is_(None))
    )).scalar() or 0

    premium_users = (await db.execute(
        select(func.count(User.id)).where(
            User.deleted_at.is_(None),
            User.subscription_type == SubscriptionType.PREMIUM.value,
        )
    )).scalar() or 0

    total_charts = (await db.execute(
        select(func.count(ChartModel.id)).where(ChartModel.deleted_at.is_(None))
    )).scalar() or 0

    now_utc = datetime.now(timezone.utc)
    today_start = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)
    month_start = datetime(now_utc.year, now_utc.month, 1, tzinfo=timezone.utc)

    ai_requests_today = (await db.execute(
        select(func.count(RequestLog.id)).where(RequestLog.created_at >= today_start)
    )).scalar() or 0

    ai_requests_month = (await db.execute(
        select(func.count(RequestLog.id)).where(RequestLog.created_at >= month_start)
    )).scalar() or 0

    ai_cost_month = (await db.execute(
        select(func.coalesce(func.sum(TokenUsage.cost_usd), 0)).where(
            TokenUsage.created_at >= month_start
        )
    )).scalar() or 0.0

    ai_input_tokens_month = (await db.execute(
        select(func.coalesce(func.sum(TokenUsage.prompt_tokens), 0)).where(
            TokenUsage.created_at >= month_start
        )
    )).scalar() or 0

    ai_output_tokens_month = (await db.execute(
        select(func.coalesce(func.sum(TokenUsage.completion_tokens), 0)).where(
            TokenUsage.created_at >= month_start
        )
    )).scalar() or 0

    invites_generated = (await db.execute(
        select(func.count(InviteCode.id)).where(InviteCode.deleted_at.is_(None))
    )).scalar() or 0

    invites_used = (await db.execute(
        select(func.count(InviteCode.id)).where(
            InviteCode.deleted_at.is_(None),
            InviteCode.used == True,
        )
    )).scalar() or 0

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "free_users": total_users - premium_users,
        "total_charts": total_charts,
        "ai_requests_today": ai_requests_today,
        "ai_requests_month": ai_requests_month,
        "ai_cost_month_rub": float(ai_cost_month),
        "ai_input_tokens_month": ai_input_tokens_month,
        "ai_output_tokens_month": ai_output_tokens_month,
        "cost_per_1m_input_rub": input_rub,
        "cost_per_1m_output_rub": output_rub,
        "invites_generated": invites_generated,
        "invites_used": invites_used,
    }


async def list_early_subscribers(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[EarlySubscriber], int]:
    total = (await db.execute(
        select(func.count(EarlySubscriber.id)).where(EarlySubscriber.deleted_at.is_(None))
    )).scalar() or 0

    result = await db.execute(
        select(EarlySubscriber)
        .where(EarlySubscriber.deleted_at.is_(None))
        .order_by(EarlySubscriber.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    subs = list(result.scalars().all())

    if subs:
        emails = [s.email.lower().strip() for s in subs]
        user_emails_result = await db.execute(
            select(User.email).where(
                func.lower(User.email).in_(emails),
                User.deleted_at.is_(None),
            )
        )
        registered_emails = {e.lower().strip() for e in user_emails_result.scalars().all()}
        for s in subs:
            s.is_registered = s.email.lower().strip() in registered_emails

    return subs, total


async def invite_subscriber(
    db: AsyncSession,
    *,
    subscriber_id: int,
    admin_user_id: int,
) -> InviteCode | None:
    sub = await db.get(EarlySubscriber, subscriber_id)
    if not sub or sub.deleted_at is not None:
        return None

    code = await invite_code_crud.create(db)
    sub.invited_by = admin_user_id

    audit = AuditLog.log_create(
        entity_type="invite",
        entity_id=code.id,
        new_values={"code": code.code, "for_subscriber": sub.email},
        user_id=admin_user_id,
    )
    db.add(audit)
    await db.flush()
    return code


async def list_audit_logs(
    db: AsyncSession,
    *,
    entity_type: str | None = None,
    action: str | None = None,
    user_id: int | None = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[AuditLog], int]:
    base_q = select(AuditLog)
    count_q = select(func.count(AuditLog.id))

    if entity_type:
        base_q = base_q.where(AuditLog.entity_type == entity_type)
        count_q = count_q.where(AuditLog.entity_type == entity_type)
    if action:
        base_q = base_q.where(AuditLog.action == action)
        count_q = count_q.where(AuditLog.action == action)
    if user_id is not None:
        base_q = base_q.where(AuditLog.user_id == user_id)
        count_q = count_q.where(AuditLog.user_id == user_id)

    total = (await db.execute(count_q)).scalar() or 0

    result = await db.execute(
        base_q.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def list_token_usage(
    db: AsyncSession,
    *,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[dict], int]:
    total = (await db.execute(select(func.count(TokenUsage.id)))).scalar() or 0

    result = await db.execute(
        select(TokenUsage, User.email)
        .outerjoin(User, TokenUsage.user_id == User.id)
        .order_by(TokenUsage.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()

    entries = []
    for tu, email in rows:
        entries.append({
            "id": tu.id,
            "user_id": tu.user_id,
            "user_email": email or "",
            "model": tu.model,
            "prompt_tokens": tu.prompt_tokens,
            "completion_tokens": tu.completion_tokens,
            "total_tokens": tu.total_tokens,
            "cost_usd": tu.cost_usd,
            "created_at": tu.created_at,
        })

    return entries, total


async def get_token_analytics(
    db: AsyncSession,
    *,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
    user_id: int | None = None,
) -> dict:
    from app.ai.service import AI_COST_PER_1M_INPUT_RUB, AI_COST_PER_1M_OUTPUT_RUB

    base_where = [TokenUsage.deleted_at.is_(None)] if hasattr(TokenUsage, 'deleted_at') else [True]
    filters = list(base_where)

    dt_start = datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc) if start_date else None
    dt_end = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=timezone.utc) if end_date else None

    if dt_start:
        filters.append(TokenUsage.created_at >= dt_start)
    if dt_end:
        filters.append(TokenUsage.created_at <= dt_end)
    if user_id is not None:
        filters.append(TokenUsage.user_id == user_id)

    where_clause = and_(*filters) if filters else True

    summary_q = select(
        func.coalesce(func.sum(TokenUsage.prompt_tokens), 0),
        func.coalesce(func.sum(TokenUsage.completion_tokens), 0),
        func.coalesce(func.sum(TokenUsage.total_tokens), 0),
        func.coalesce(func.sum(TokenUsage.cost_usd), 0.0),
        func.count(TokenUsage.id),
    ).where(where_clause)

    s_prompt, s_completion, s_total, s_cost, s_count = (await db.execute(summary_q)).one()

    summary = {
        "total_prompt_tokens": s_prompt or 0,
        "total_completion_tokens": s_completion or 0,
        "total_tokens": s_total or 0,
        "total_cost_rub": float(s_cost or 0),
        "total_requests": s_count or 0,
        "avg_cost_per_request": round(float((s_cost or 0) / (s_count or 1)), 4),
    }

    by_user_q = select(
        TokenUsage.user_id,
        User.email,
        func.sum(TokenUsage.prompt_tokens),
        func.sum(TokenUsage.completion_tokens),
        func.sum(TokenUsage.total_tokens),
        func.sum(TokenUsage.cost_usd),
        func.count(TokenUsage.id),
    ).where(where_clause).outerjoin(
        User, TokenUsage.user_id == User.id
    ).group_by(
        TokenUsage.user_id, User.email
    ).order_by(
        func.sum(TokenUsage.cost_usd).desc()
    )

    by_user_rows = (await db.execute(by_user_q)).all()
    by_user = [
        {
            "user_id": r[0],
            "user_email": r[1] or "",
            "prompt_tokens": r[2] or 0,
            "completion_tokens": r[3] or 0,
            "total_tokens": r[4] or 0,
            "cost_rub": float(r[5] or 0),
            "requests": r[6] or 0,
        }
        for r in by_user_rows
    ]

    by_date_q = select(
        cast(TokenUsage.created_at, SaDate).label("d"),
        func.sum(TokenUsage.prompt_tokens),
        func.sum(TokenUsage.completion_tokens),
        func.sum(TokenUsage.total_tokens),
        func.sum(TokenUsage.cost_usd),
        func.count(TokenUsage.id),
    ).where(where_clause).group_by(
        cast(TokenUsage.created_at, SaDate)
    ).order_by(
        cast(TokenUsage.created_at, SaDate)
    )

    by_date_rows = (await db.execute(by_date_q)).all()
    by_date = [
        {
            "date": str(r[0]),
            "prompt_tokens": r[1] or 0,
            "completion_tokens": r[2] or 0,
            "total_tokens": r[3] or 0,
            "cost_rub": float(r[4] or 0),
            "requests": r[5] or 0,
        }
        for r in by_date_rows
    ]

    return {
        "summary": summary,
        "by_user": by_user,
        "by_date": by_date,
    }
