from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.invites.schemas import InviteCodeCreate, InviteCodeResponse, InviteCodeListResponse
from app.invites import crud as invite_crud
from app.core.logging import logger

router = APIRouter()


@router.post("/generate", response_model=InviteCodeResponse)
async def generate_invite_code(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """Generate a new invite code (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can generate invite codes",
        )

    logger.info("Generating invite code", user_id=current_user.id)

    code = await invite_crud.invite_code.create(db)
    logger.info("Invite code created", code=code.code)

    return code


@router.get("", response_model=InviteCodeListResponse)
async def list_invite_codes(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """List all invite codes (admin only)."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view invite codes",
        )

    logger.info("Listing invite codes", user_id=current_user.id)

    codes = await invite_crud.invite_code.get_all(db)
    return InviteCodeListResponse(codes=codes)