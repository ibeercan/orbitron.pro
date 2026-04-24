"""Person API endpoints — CRUD for birth data profiles (friends, partners)."""

from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.auth.deps import get_current_active_user
from app.models.user import User
from app.persons.schemas import PersonCreate, PersonUpdate, PersonResponse
from app.persons.crud import person as person_crud

router = APIRouter()


@router.post("/", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
async def create_person(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    person_in: PersonCreate,
) -> Any:
    data = person_in.model_dump()
    obj = await person_crud.create(db, obj_in=data, user_id=current_user.id)
    await db.commit()
    return obj


@router.get("/", response_model=List[PersonResponse])
async def list_persons(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    return await person_crud.get_user_persons(db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    person_id: int,
) -> Any:
    obj = await person_crud.get_by_id_and_user(db, id=person_id, user_id=current_user.id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return obj


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    person_id: int,
    person_in: PersonUpdate,
) -> Any:
    obj = await person_crud.get_by_id_and_user(db, id=person_id, user_id=current_user.id)
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    data = person_in.model_dump(exclude_unset=True)
    obj = await person_crud.update(db, db_obj=obj, obj_in=data)
    await db.commit()
    return obj


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    *,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    person_id: int,
) -> None:
    deleted = await person_crud.soft_delete(db, id=person_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    await db.commit()
