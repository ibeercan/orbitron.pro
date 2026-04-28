from typing import Any, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Form, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import AUTH_RATE_LIMIT
from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User, SubscriptionType
from app.subscriptions.schemas import SubscribeRequest, SubscribeResponse
from app.subscriptions.crud import early_subscriber as early_subscriber_crud
from app.core.logging import logger
from slowapi import Limiter
from app.middleware.proxy_headers import get_real_ip

router = APIRouter()
limiter = Limiter(key_func=get_real_ip)


class CheckEmailRequest(BaseModel):
    email: str = Field(min_length=1)


class CheckInviteRequest(BaseModel):
    email: str = Field(min_length=1)
    invite_code: Optional[str] = None


class CheckInviteResponse(BaseModel):
    can_register: bool
    is_premium: bool
    message: str
    registration_open: bool


class CheckEmailResponse(BaseModel):
    exists: bool
    is_subscriber: bool
    message: str
    registration_open: bool


class UpgradeRequest(BaseModel):
    plan: str = Field(pattern="^(monthly|quarterly|yearly)$")


@router.get("/me")
async def get_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Get current user's subscription info."""
    return {
        "subscription_type": current_user.subscription_type,
        "subscription_end": current_user.subscription_end.isoformat() if current_user.subscription_end else None,
    }


@router.post("/check-email", response_model=CheckEmailResponse)
@limiter.limit("10/minute")
async def check_email(
    request: Request,
    body: CheckEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Check if email exists. Returns registration status."""
    from app.auth.crud import user as user_crud
    from app.admin.settings import is_registration_open

    email = body.email.strip().lower()
    registration_open = await is_registration_open(db)

    existing_subscriber = await early_subscriber_crud.get_by_email(db, email=email)
    existing_user = await user_crud.get_by_email(db, email=email)

    return CheckEmailResponse(
        exists=existing_user is not None,
        is_subscriber=existing_subscriber is not None,
        message="Check completed",
        registration_open=registration_open,
    )


@router.post("/check-invite", response_model=CheckInviteResponse)
@limiter.limit("10/minute")
async def check_invite(
    request: Request,
    body: CheckInviteRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Check if invite code is valid for the given email. Returns registration_open status."""
    from app.auth.crud import user as user_crud
    from app.admin.settings import is_registration_open

    registration_open = await is_registration_open(db)
    email = body.email.strip().lower()
    invite_code = body.invite_code

    existing_user = await user_crud.get_by_email(db, email=email)
    if existing_user:
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Account already exists",
            registration_open=registration_open,
        )

    if not invite_code:
        if registration_open:
            return CheckInviteResponse(
                can_register=True,
                is_premium=False,
                message="Registration open",
                registration_open=True,
            )
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Invite code required",
            registration_open=False,
        )

    from app.invites import crud as invite_crud

    code_record = await invite_crud.invite_code.get_by_code(db, code=invite_code)

    if not code_record:
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Invalid invite code",
            registration_open=registration_open,
        )

    if code_record.used:
        return CheckInviteResponse(
            can_register=False,
            is_premium=False,
            message="Invite code already used",
            registration_open=registration_open,
        )

    return CheckInviteResponse(
        can_register=True,
        is_premium=True,
        message="Valid invite code",
        registration_open=registration_open,
    )


@router.post("/upgrade")
async def upgrade_subscription(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    body: UpgradeRequest,
) -> Any:
    """Upgrade user subscription (placeholder - payment integration needed)."""
    # TODO: Integrate payment gateway (Stripe, etc.)
    from datetime import datetime, timedelta, timezone

    plan_days = {"monthly": 30, "quarterly": 90, "yearly": 365}
    days = plan_days[body.plan]

    current_user.subscription_type = SubscriptionType.PREMIUM.value
    current_user.subscription_end = datetime.now(timezone.utc) + timedelta(days=days)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return {"message": f"Subscription upgraded to {body.plan} plan"}


async def _process_subscription(
    db: AsyncSession,
    email: str,
    invite_code: Optional[str] = None,
) -> tuple[str, str]:
    """Process subscription and return (status, message)."""
    import re
    from app.invites import crud as invite_crud

    email = email.strip().lower()
    if not email or not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
        return "error", "Invalid email"

    if invite_code:
        code_record = await invite_crud.invite_code.get_by_code(db, code=invite_code)

        if not code_record:
            logger.info("Invalid invite code", code=invite_code)
            return "error", "Invalid invite code"

        if code_record.used:
            logger.info("Invite code already used", code=invite_code)
            return "error", "Invite code already used"

        if code_record.used_email and code_record.used_email != email:
            logger.info("Invite code email mismatch", code=invite_code, provided_email=email, code_email=code_record.used_email)
            return "error", "Invite code does not match email"

        await invite_crud.invite_code.mark_used(db, code_record)
        logger.info("Invite code activated", code=invite_code, email=email)

        existing = await early_subscriber_crud.get_by_email(db, email=email)
        if existing:
            return "already", "Account activated via invite!"

        try:
            await early_subscriber_crud.create(db, obj_in=SubscribeRequest(email=email))
            logger.info("Early access created with invite", email=email)
            return "success", "Welcome! Your account has been activated."
        except Exception as e:
            logger.error("Failed to create early subscription with invite", email=email, error=str(e))
            return "error", "Activation failed. Please try again later."

    logger.info("Early access subscription", email=email)

    existing = await early_subscriber_crud.get_by_email(db, email=email)
    if existing:
        logger.info("Email already subscribed", email=email)
        return "already", "This email is already subscribed."

    try:
        await early_subscriber_crud.create(db, obj_in=SubscribeRequest(email=email))
        logger.info("Early access subscription created", email=email)
        return "success", "Thank you! You are subscribed."
    except Exception as e:
        logger.error("Failed to create early subscription", email=email, error=str(e))
        return "error", "Subscription failed. Please try again later."


@router.post("/early-access", response_model=SubscribeResponse)
@limiter.limit(AUTH_RATE_LIMIT)
async def subscribe_early_access(
    request: Request,
    db: AsyncSession = Depends(get_db),
    email: Optional[str] = Form(None),
    invite_code: Optional[str] = Form(None),
) -> Any:
    """Subscribe for early access (landing page). Accepts both JSON and form-data."""
    content_type = request.headers.get("content-type", "")

    if "application/x-www-form-urlencoded" in content_type:
        if not email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

        status_val, message = await _process_subscription(db, email, invite_code)

        params = {"subscribed": status_val, "message": message}
        redirect_url = f"https://orbitron.pro/?{urlencode(params)}"
        return RedirectResponse(url=redirect_url, status_code=303)

    try:
        body = await request.body()
        if body:
            import json
            data = json.loads(body)
            email = email or data.get("email")
            invite_code = invite_code or data.get("invite_code")
    except Exception:
        pass

    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email is required")

    status_val, message = await _process_subscription(db, email, invite_code)

    if status_val == "success":
        return SubscribeResponse(message=message, success=True)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)