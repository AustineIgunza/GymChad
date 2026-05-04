"""routers/splits.py — Training split CRUD"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, update
from sqlalchemy.orm import selectinload
from app.dependencies import get_db, get_current_user
from app.models.split import Split, SplitDay, SplitDayExercise
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.split import SplitCreate, SplitUpdate, SplitResponse

router = APIRouter()


def _sde_to_dict(sde: SplitDayExercise) -> dict:
    d = {c.name: getattr(sde, c.name) for c in sde.__table__.columns}
    if sde.exercise:
        d["exercise"] = {"id": sde.exercise.id, "name": sde.exercise.name, "muscle_group": sde.exercise.muscle_group.value}
    d["order_index"] = d.get("order", 0)  # alias for frontend TypeScript type compatibility
    return d


def _split_to_dict(split: Split) -> dict:
    d = {c.name: getattr(split, c.name) for c in split.__table__.columns}
    d["days"] = [
        {
            **{c.name: getattr(day, c.name) for c in day.__table__.columns},
            "exercises": [_sde_to_dict(e) for e in day.exercises],
        }
        for day in split.days
    ]
    return d


@router.get("", response_model=list[SplitResponse])
async def get_splits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Split)
        .where(Split.user_id == current_user.id)
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
        .order_by(Split.created_at.desc())
    )
    splits = result.scalars().all()
    return [_split_to_dict(s) for s in splits]


@router.post("", response_model=SplitResponse, status_code=status.HTTP_201_CREATED)
async def create_split(
    payload: SplitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    split = Split(
        name=payload.name,
        description=payload.description,
        user_id=current_user.id,
    )
    db.add(split)
    await db.flush()  # flush to get split.id without committing

    for day_data in payload.days:
        day = SplitDay(
            split_id=split.id,
            day_number=day_data.day_number,
            label=day_data.label,
        )
        db.add(day)
        await db.flush()

        for ex_data in day_data.exercises:
            sde = SplitDayExercise(split_day_id=day.id, **ex_data.model_dump())
            db.add(sde)

    await db.commit()
    await db.refresh(split)

    # Re-fetch with relationships loaded
    result = await db.execute(
        select(Split)
        .where(Split.id == split.id)
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    return _split_to_dict(result.scalar_one())


@router.get("/{split_id}", response_model=SplitResponse)
async def get_split(
    split_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Split)
        .where(and_(Split.id == split_id, Split.user_id == current_user.id))
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
    return _split_to_dict(split)


@router.put("/{split_id}", response_model=SplitResponse)
async def update_split(
    split_id: str,
    payload: SplitUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Split)
        .where(and_(Split.id == split_id, Split.user_id == current_user.id))
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(split, field, value)

    await db.commit()
    await db.refresh(split)
    return _split_to_dict(split)


@router.put("/{split_id}/activate", response_model=SplitResponse)
async def activate_split(
    split_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set this split as active and deactivate all others."""
    # Deactivate all user's splits first
    await db.execute(
        update(Split).where(Split.user_id == current_user.id).values(is_active=False)
    )

    # Activate the target split
    result = await db.execute(
        select(Split)
        .where(and_(Split.id == split_id, Split.user_id == current_user.id))
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")

    split.is_active = True
    await db.commit()
    await db.refresh(split)
    return _split_to_dict(split)


@router.delete("/{split_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_split(
    split_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Split).where(and_(Split.id == split_id, Split.user_id == current_user.id))
    )
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
    await db.delete(split)
    await db.commit()


# FIX: Proactive — duplicate and share endpoints were referenced by the frontend but missing from backend
@router.post("/{split_id}/duplicate", response_model=SplitResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_split(
    split_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Duplicate a split — creates a copy owned by the requesting user."""
    result = await db.execute(
        select(Split)
        .where(and_(Split.id == split_id, Split.user_id == current_user.id))
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Split not found")

    new_split = Split(
        name=f"{original.name} (copy)",
        description=original.description,
        user_id=current_user.id,
        is_active=False,
    )
    db.add(new_split)
    await db.flush()

    for day in original.days:
        new_day = SplitDay(split_id=new_split.id, day_number=day.day_number, label=day.label)
        db.add(new_day)
        await db.flush()
        for sde in day.exercises:
            new_sde = SplitDayExercise(
                split_day_id=new_day.id,
                exercise_id=sde.exercise_id,
                order=sde.order,
                target_sets=sde.target_sets,
                target_reps_min=sde.target_reps_min,
                target_reps_max=sde.target_reps_max,
            )
            db.add(new_sde)

    await db.commit()

    result2 = await db.execute(
        select(Split)
        .where(Split.id == new_split.id)
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    return _split_to_dict(result2.scalar_one())


@router.post("/{split_id}/share")
async def share_split(
    split_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a shareable token for a split."""
    import uuid
    result = await db.execute(
        select(Split).where(and_(Split.id == split_id, Split.user_id == current_user.id))
    )
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")

    if not getattr(split, "shared_token", None):
        split.shared_token = str(uuid.uuid4())
        await db.commit()
        await db.refresh(split)

    return {"shared_token": split.shared_token}


# FIX: Proactive — public shared split lookup endpoint (no auth required)
@router.get("/shared/{token}", response_model=SplitResponse)
async def get_shared_split(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — look up a split by its shared token."""
    result = await db.execute(
        select(Split)
        .where(Split.shared_token == token)
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    split = result.scalar_one_or_none()
    if not split:
        raise HTTPException(status_code=404, detail="Shared split not found")
    return _split_to_dict(split)


@router.post("/shared/{token}/import", response_model=SplitResponse, status_code=status.HTTP_201_CREATED)
async def import_shared_split(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import (copy) a shared split into the requesting user's account."""
    result = await db.execute(
        select(Split)
        .where(Split.shared_token == token)
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
        )
    )
    original = result.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Shared split not found")

    new_split = Split(
        name=original.name,
        description=original.description,
        user_id=current_user.id,
        is_active=False,
    )
    db.add(new_split)
    await db.flush()

    for day in original.days:
        new_day = SplitDay(split_id=new_split.id, day_number=day.day_number, label=day.label)
        db.add(new_day)
        await db.flush()
        for sde in day.exercises:
            new_sde = SplitDayExercise(
                split_day_id=new_day.id,
                exercise_id=sde.exercise_id,
                order=sde.order,
                target_sets=sde.target_sets,
                target_reps_min=sde.target_reps_min,
                target_reps_max=sde.target_reps_max,
            )
            db.add(new_sde)

    await db.commit()

    result2 = await db.execute(
        select(Split)
        .where(Split.id == new_split.id)
        .options(
            selectinload(Split.days)
            .selectinload(SplitDay.exercises)
            .selectinload(SplitDayExercise.exercise)
        )
    )
    return _split_to_dict(result2.scalar_one())
