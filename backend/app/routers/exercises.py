"""routers/exercises.py — Exercise library CRUD"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.dependencies import get_db, get_current_user
from app.models.exercise import Exercise, MuscleGroup
from app.models.user import User
from app.schemas.exercise import ExerciseCreate, ExerciseResponse

router = APIRouter()


@router.get("/", response_model=list[ExerciseResponse])
async def get_exercises(
    muscle_group: MuscleGroup | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns global exercises + the current user's custom exercises.
    Optional filters: ?muscle_group=CHEST  or  ?search=bench
    """
    # `or_()` is SQLAlchemy's OR operator
    query = select(Exercise).where(
        or_(Exercise.user_id == None, Exercise.user_id == current_user.id)
    )
    if muscle_group:
        query = query.where(Exercise.muscle_group == muscle_group)
    if search:
        # ilike = case-insensitive LIKE
        query = query.where(Exercise.name.ilike(f"%{search}%"))

    query = query.order_by(Exercise.muscle_group, Exercise.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ExerciseResponse, status_code=status.HTTP_201_CREATED)
async def create_exercise(
    payload: ExerciseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a custom exercise for the current user."""
    exercise = Exercise(
        **payload.model_dump(),
        is_custom=True,
        user_id=current_user.id,
    )
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.delete("/{exercise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exercise(
    exercise_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom exercise. Users can only delete their own exercises."""
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()

    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if not exercise.is_custom or exercise.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete global exercises")

    await db.delete(exercise)
    await db.commit()
