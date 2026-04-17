from typing import Any, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Form, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User, SubscriptionType
from app.subscriptions.schemas import SubscribeRequest, SubscribeResponse
from app.subscriptions.crud import early_subscriber as early_subscriber_crud
from app.core.config import logger

router = APIRouter()


class CheckEmailRequest(BaseModel):
    email: str


class CheckInviteRequest(BaseModel):
    email: str
    invite_code: Optional[str] = None


class CheckInviteResponse(BaseModel):
    can_register: bool
    is_premium: bool
    message: str


class CheckEmailResponse(BaseModel):
    exists: bool
    message: str


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


@router.post("/check-email", response_model=CheckEmailResponse)
async def check_email(
    request: CheckEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Check if email already exists as a user.
    """
    from app.auth.crud import user as user_crud
    
    email = request.email.strip().lower()
    
    existing_user = await user_crud.get_by_email(db, email=email)
    if existing_user:
        return CheckEmailResponse(
            exists=True,
            message="Введите пароль"
        )
    
    return CheckEmailResponse(
        exists=False,
        message="Продолжите"
    )


@router.post("/check-invite", response_model=CheckInviteResponse)
async def check_invite(
    request: CheckInviteRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Check if invite code is valid for the given email.
    Returns whether user can register and if they'll get Premium.
    """
    from app.auth.crud import user as user_crud
    
    email = request.email.strip().lower()
    invite_code = request.invite_code
    
    existing_user = await user_crud.get_by_email(db, email=email)
    if existing_user:
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Аккаунт уже существует"
        )
    
    if not invite_code:
        existing_subscriber = await early_subscriber_crud.get_by_email(db, email=email)
        if existing_subscriber:
            return CheckInviteResponse(
                can_register=False,
                is_premium=False,
                message="Вы уже подписаны на рассылку"
            )
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Подпишитесь на рассылку"
        )
    
    from app.invites import crud as invite_crud
    
    code_record = await invite_crud.invite_code.get_by_code(db, code=invite_code)
    
    if not code_record:
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Инвайт недействителен"
        )
    
    if code_record.used:
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Код уже использован"
        )
    
    existing_subscriber = await early_subscriber_crud.get_by_email(db, email=email)
    if existing_subscriber:
        return CheckInviteResponse(
            can_register=True,
            is_premium=True,
            message="У вас уже есть подписка. Создать Premium аккаунт?"
        )
    
    return CheckInviteResponse(
        can_register=True,
        is_premium=True,
        message="Валидный инвайт"
    )


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
    invite_code: Optional[str] = None,
) -> tuple[str, str]:
    """
    Process subscription and return (status, message).
    Status can be: "success", "already", "error", "activated"
    """
    import re
    from app.invites import crud as invite_crud
    
    email = email.strip().lower()
    if not email or not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return "error", "Некорректный email"
    
    # Check if invite code is provided
    if invite_code:
        code_record = await invite_crud.invite_code.get_by_code(db, code=invite_code)
        
        if not code_record:
            logger.info("Invalid invite code", code=invite_code)
            return "error", "Неверный код приглашения"
        
        if code_record.used:
            logger.info("Invite code already used", code=invite_code)
            return "error", "Код уже использован"
        
        if code_record.email != email:
            logger.info("Invite code email mismatch", code=invite_code, provided_email=email, code_email=code_record.email)
            return "error", "Код приглашения не соответствует email"
        
        # Mark code as used
        await invite_crud.invite_code.mark_used(db, code_record)
        logger.info("Invite code activated", code=invite_code, email=email)
        
        # Check if already subscribed
        existing = await early_subscriber_crud.get_by_email(db, email=email)
        if existing:
            return "already", "Аккаунт активирован по приглашению!"
        
        # Create subscription
        try:
            await early_subscriber_crud.create(db, obj_in={"email": email})
            logger.info("Early access created with invite", email=email)
            return "success", "Добро пожаловать! Ваш аккаунт активирован."
        except Exception as e:
            logger.error("Failed to create early subscription with invite", email=email, error=str(e))
            return "error", "Ошибка при активации. Попробуйте позже."
    
    # No invite code - regular subscription
    logger.info("Early access subscription", email=email)

    # Check if already subscribed
    existing = await early_subscriber_crud.get_by_email(db, email=email)
    if existing:
        logger.info("Email already subscribed", email=email)
        return "already", "Этот email уже подписан на ранний доступ."

    try:
        await early_subscriber_crud.create(db, obj_in={"email": email})
        logger.info("Early access subscription created", email=email)
        return "success", "Спасибо! Вы подписаны."
    except Exception as e:
        logger.error("Failed to create early subscription", email=email, error=str(e))
        return "error", "Ошибка при подписке. Попробуйте позже."


@router.post("/early-access", response_model=SubscribeResponse)
async def subscribe_early_access(
    request: Request,
    db: AsyncSession = Depends(get_db),
    email: Optional[str] = Form(None),
    invite_code: Optional[str] = Form(None),
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
        
        status, message = await _process_subscription(db, email, invite_code)
        
        params = {"subscribed": status, "message": message}
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
            invite_code = invite_code or data.get("invite_code")
    except:
        pass
    
    # Fallback - check if email was provided via form or in body
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # JSON response path
    status, message = await _process_subscription(db, email, invite_code)
    
    if status == "success":
        return SubscribeResponse(
            message="Спасибо! Вы подписаны.",
            success=True
        )
    else:
        raise HTTPException(status_code=400, detail=message)