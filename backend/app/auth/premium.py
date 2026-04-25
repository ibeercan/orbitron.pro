"""Premium feature access control."""

from fastapi import HTTPException, status

from app.models.user import User, SubscriptionType


def require_premium(user: User, feature: str) -> None:
    if user.is_admin or user.is_subscription_active:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Feature '{feature}' requires a Premium subscription",
    )


def is_premium(user: User) -> bool:
    return user.is_admin or user.is_subscription_active
