from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.invites.schemas import InviteCodeCreate, InviteCodeResponse, InviteCodeListResponse
from app.invites import crud as invite_crud
from app.core.config import logger

router = APIRouter()


@router.post("/generate", response_model=InviteCodeResponse)
async def generate_invite_code(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    invite_in: InviteCodeCreate,
) -> Any:
    """
    Generate a new invite code (admin only).
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can generate invite codes"
        )
    
    logger.info("Generating invite code", email=invite_in.email, user_id=current_user.id)
    
    existing = await invite_crud.invite_code.get_by_email(db, email=invite_in.email)
    if existing and not existing.used:
        logger.info("Invite code already exists for email", email=invite_in.email)
        return existing
    
    code = await invite_crud.invite_code.create(db, obj_in=invite_in)
    logger.info("Invite code created", code=code.code, email=code.email)
    
    return code


@router.get("", response_model=InviteCodeListResponse)
async def list_invite_codes(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    List all invite codes (admin only).
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view invite codes"
        )
    
    logger.info("Listing invite codes", user_id=current_user.id)
    
    codes = await invite_crud.invite_code.get_all(db)
    return InviteCodeListResponse(codes=codes)
