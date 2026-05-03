"""routers/program.py — Training program endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.program import Program, ProgramWorkout
from app.schemas.program import ProgramGenerateRequest, ProgramResponse, TodayWorkoutResponse
from app.services.program_generator import generate_program, get_today_workout, advance_program, calculate_next_session_weights
import json

router = APIRouter()


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_new_program(
    payload: ProgramGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new AI-powered training program."""
    program = await generate_program(
        user_id=current_user.id,
        goal=payload.goal,
        level=payload.level,
        days_per_week=payload.days_per_week,
        available_equipment=payload.available_equipment,
        duration_weeks=payload.duration_weeks,
        db=db,
    )
    return {"id": program.id, "name": program.name, "goal": program.goal, "level": program.level,
            "days_per_week": program.days_per_week, "duration_weeks": program.duration_weeks,
            "current_week": program.current_week, "current_day": program.current_day,
            "is_active": program.is_active, "created_at": program.created_at}


@router.get("/today")
async def get_today(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get today's prescribed workout from active program."""
    workout = await get_today_workout(current_user.id, db)
    if not workout:
        return None
    return workout


@router.get("/current")
async def get_current_program(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full current program overview."""
    result = await db.execute(
        select(Program).where(and_(Program.user_id == current_user.id, Program.is_active == True))
    )
    program = result.scalar_one_or_none()
    if not program:
        return None

    # Get all workouts
    pw_result = await db.execute(
        select(ProgramWorkout).where(ProgramWorkout.program_id == program.id).order_by(ProgramWorkout.week, ProgramWorkout.day)
    )
    workouts = pw_result.scalars().all()

    return {
        "id": program.id,
        "name": program.name,
        "goal": program.goal,
        "level": program.level,
        "days_per_week": program.days_per_week,
        "duration_weeks": program.duration_weeks,
        "current_week": program.current_week,
        "current_day": program.current_day,
        "is_active": program.is_active,
        "created_at": program.created_at,
        "workouts": [
            {
                "id": w.id, "week": w.week, "day": w.day, "label": w.label,
                "focus": w.focus, "is_deload": w.is_deload, "completed": w.completed,
                "exercises": json.loads(w.exercises_json or "[]"),
            }
            for w in workouts
        ]
    }


@router.post("/advance")
async def advance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark today complete and advance to next workout."""
    program = await advance_program(current_user.id, db)
    if not program:
        raise HTTPException(status_code=404, detail="No active program")
    return {"current_week": program.current_week, "current_day": program.current_day, "is_active": program.is_active}


@router.get("/progression/{exercise_id}")
async def get_progression(
    exercise_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get weight progression recommendation for an exercise."""
    rec = await calculate_next_session_weights(current_user.id, exercise_id, db)
    return rec


@router.put("/{program_id}/pause")
async def pause_program(
    program_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Program).where(and_(Program.id == program_id, Program.user_id == current_user.id))
    )
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    program.is_active = not program.is_active
    await db.commit()
    return {"is_active": program.is_active}


@router.delete("/{program_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_program(
    program_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Program).where(and_(Program.id == program_id, Program.user_id == current_user.id))
    )
    program = result.scalar_one_or_none()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    await db.delete(program)
    await db.commit()
