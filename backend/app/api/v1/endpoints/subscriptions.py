from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User, SubscriptionType
from app.subscriptions.schemas import SubscribeRequest, SubscribeResponse
from app.subscriptions.crud import early_subscriber as early_subscriber_crud
from app.core.config import logger

router = APIRouter()


@router.get("/me")
async def get_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get current user's subscription info.
    """
    return {
        "subscription_type": current_user.subscription_type,
        "subscription_end": current_user.subscription_end.isoformat() if current_user.subscription_end else None,
    }


@router.post("/upgrade")
async def upgrade_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    plan: str = "monthly",  # monthly, quarterly, yearly
) -> Any:
    """
    Upgrade user subscription (placeholder - payment integration needed).
    """
    # TODO: Integrate payment gateway (Stripe, etc.)
    # For now, just update in DB
    from datetime import datetime, timedelta

    if plan == "monthly":
        days = 30
    elif plan == "quarterly":
        days = 90
    elif plan == "yearly":
        days = 365
    else:
        raise ValueError("Invalid plan")

    current_user.subscription_type = SubscriptionType.PREMIUM
    current_user.subscription_end = datetime.utcnow() + timedelta(days=days)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return {"message": f"Subscription upgraded to {plan} plan"}


@router.post("/early-access", response_model=SubscribeResponse)
async def subscribe_early_access(
    *,
    db: AsyncSession = Depends(get_db),
    subscribe_in: SubscribeRequest,
) -> Any:
    """
    Subscribe for early access (landing page).
    """
    logger.info("Early access subscription", email=subscribe_in.email)

    # Check if already subscribed
    existing = await early_subscriber_crud.get_by_email(db, email=subscribe_in.email)
    if existing:
        logger.info("Email already subscribed", email=subscribe_in.email)
        return SubscribeResponse(
            message="Этот email уже подписан на ранний доступ.",
            success=True
        )

    try:
        # Create subscription
        await early_subscriber_crud.create(db, obj_in=subscribe_in)
        logger.info("Early access subscription created", email=subscribe_in.email)

        return SubscribeResponse(
            message="Спасибо за подписку! Вы получите месяц премиум при запуске проекта.",
            success=True
        )
    except Exception as e:
        logger.error("Failed to create early subscription", email=subscribe_in.email, error=str(e))
        raise HTTPException(status_code=500, detail="Не удалось обработать подписку. Попробуйте позже.")