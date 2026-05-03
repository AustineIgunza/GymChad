"""routers/schedule.py — Workout scheduling endpoints"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.dependencies import get_db, get_current_user
from app.models.schedule import WorkoutSchedule
from app.models.split import Split, SplitDay
from app.models.user import User
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleResponse

router = APIRouter()


def _schedule_to_dict(s: WorkoutSchedule) -> dict:
    d = {c.name: getattr(s, c.name) for c in s.__table__.columns}
    d["split_name"] = s.split.name if s.split else None
    d["split_day_label"] = s.split_day.label if s.split_day else None
    return d


@router.get("", response_model=list[ScheduleResponse])
async def get_schedule(
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(WorkoutSchedule)
        .where(WorkoutSchedule.user_id == current_user.id)
        .options(
            selectinload(WorkoutSchedule.split),
            selectinload(WorkoutSchedule.split_day),
        )
        .order_by(WorkoutSchedule.scheduled_date)
    )
    if date_from:
        query = query.where(WorkoutSchedule.scheduled_date >= date_from)
    if date_to:
        query = query.where(WorkoutSchedule.scheduled_date <= date_to)
    result = await db.execute(query)
    return [_schedule_to_dict(s) for s in result.scalars().all()]


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    payload: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = WorkoutSchedule(**payload.model_dump(), user_id=current_user.id)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    # Re-fetch with relationships
    result = await db.execute(
        select(WorkoutSchedule)
        .where(WorkoutSchedule.id == entry.id)
        .options(selectinload(WorkoutSchedule.split), selectinload(WorkoutSchedule.split_day))
    )
    return _schedule_to_dict(result.scalar_one())


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    payload: ScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSchedule)
        .where(and_(WorkoutSchedule.id == schedule_id, WorkoutSchedule.user_id == current_user.id))
        .options(selectinload(WorkoutSchedule.split), selectinload(WorkoutSchedule.split_day))
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Schedule entry not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(entry, field, value)
    await db.commit()
    await db.refresh(entry)
    result2 = await db.execute(
        select(WorkoutSchedule).where(WorkoutSchedule.id == entry.id)
        .options(selectinload(WorkoutSchedule.split), selectinload(WorkoutSchedule.split_day))
    )
    return _schedule_to_dict(result2.scalar_one())


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WorkoutSchedule)
        .where(and_(WorkoutSchedule.id == schedule_id, WorkoutSchedule.user_id == current_user.id))
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Schedule entry not found")
    await db.delete(entry)
    await db.commit()
