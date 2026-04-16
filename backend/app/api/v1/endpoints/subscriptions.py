from typing import Any, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Form, Request
from fastapi.responses import RedirectResponse
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


async def _process_subscription(
    db: AsyncSession,
    email: str,
) -> tuple[bool, str]:
    """
    Process subscription and return (success, message).
    """
    import re
    
    email = email.strip()
    if not email or not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return False, "Некорректный email"
    
    logger.info("Early access subscription", email=email)

    # Check if already subscribed
    existing = await early_subscriber_crud.get_by_email(db, email=email)
    if existing:
        logger.info("Email already subscribed", email=email)
        return True, "Этот email уже подписан на ранний доступ."

    try:
        await early_subscriber_crud.create(db, obj_in={"email": email})
        logger.info("Early access subscription created", email=email)
        return True, "Спасибо! Вы подписаны."
    except Exception as e:
        logger.error("Failed to create early subscription", email=email, error=str(e))
        return False, "Ошибка при подписке. Попробуйте позже."


@router.post("/early-access", response_model=SubscribeResponse)
async def subscribe_early_access(
    request: Request,
    db: AsyncSession = Depends(get_db),
    email: Optional[str] = Form(None),
) -> Any:
    """
    Subscribe for early access (landing page).
    Accepts both JSON and form-data.
    """
    content_type = request.headers.get("content-type", "")
    
    # Handle form-data (application/x-www-form-urlencoded)
    if "application/x-www-form-urlencoded" in content_type:
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        
        success, message = await _process_subscription(db, email)
        
        params = {"subscribed": "success" if success else "error", "message": message}
        redirect_url = f"https://orbitron.pro/?{urlencode(params)}"
        return RedirectResponse(url=redirect_url, status_code=303)
    
    # Handle JSON (application/json)
    # Try to read JSON body
    try:
        body = await request.body()
        if body:
            import json
            data = json.loads(body)
            email = data.get("email")
    except:
        pass
    
    # Fallback - check if email was provided via form or in body
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # JSON response path
    success, message = await _process_subscription(db, email)
    
    if success:
        return SubscribeResponse(
            message="Спасибо! Вы подписаны.",
            success=True
        )
    else:
        raise HTTPException(status_code=400, detail=message)