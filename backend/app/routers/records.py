"""routers/records.py — Personal Records endpoints"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.dependencies import get_db, get_current_user
from app.models.records import PersonalRecord
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.records import PersonalRecordResponse

router = APIRouter()


@router.get("", response_model=list[PersonalRecordResponse])
async def get_all_records(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all personal records for the current user."""
    result = await db.execute(
        select(PersonalRecord)
        .where(PersonalRecord.user_id == current_user.id)
        .options(selectinload(PersonalRecord.exercise))
        .order_by(PersonalRecord.achieved_at.desc())
    )
    prs = result.scalars().all()
    return [
        {
            **{c.name: getattr(pr, c.name) for c in pr.__table__.columns},
            "exercise_name": pr.exercise.name if pr.exercise else None,
        }
        for pr in prs
    ]


@router.get("/{exercise_id}", response_model=list[PersonalRecordResponse])
async def get_exercise_records(
    exercise_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get PRs for a specific exercise."""
    result = await db.execute(
        select(PersonalRecord)
        .where(
            and_(
                PersonalRecord.user_id == current_user.id,
                PersonalRecord.exercise_id == exercise_id,
            )
        )
        .options(selectinload(PersonalRecord.exercise))
    )
    prs = result.scalars().all()
    return [
        {
            **{c.name: getattr(pr, c.name) for c in pr.__table__.columns},
            "exercise_name": pr.exercise.name if pr.exercise else None,
        }
        for pr in prs
    ]
