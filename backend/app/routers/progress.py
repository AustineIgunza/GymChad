"""routers/progress.py — Progress and analytics endpoints"""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.dependencies import get_db, get_current_user
from app.models.workout import Workout, WorkoutSet
from app.models.nutrition import NutritionLog
from app.models.measurement import BodyMeasurement
from app.models.cardio import CardioSession
from app.models.user import User
from app.services.calorie_calculator import calculate_streak, projected_fat_loss
from app.database import IS_SQLITE

router = APIRouter()


@router.get("/volume")
async def get_volume_progress(
    exercise_id: str = Query(...),
    weeks: int = Query(8, ge=1, le=52),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Total volume (sets × reps × weight) per session for a given exercise."""
    start_date = date.today() - timedelta(weeks=weeks)

    result2 = await db.execute(
        select(Workout.id, Workout.date, WorkoutSet.reps, WorkoutSet.weight_kg)
        .join(WorkoutSet)
        .where(and_(
            Workout.user_id == current_user.id,
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSet.is_warmup == False,
            Workout.date >= start_date,
        ))
        .order_by(Workout.date)
    )
    rows2 = result2.all()

    # Group by workout
    from collections import defaultdict
    session_volumes: dict[str, dict] = defaultdict(lambda: {"date": None, "volume": 0, "sets": 0})
    for wid, wdate, reps, weight in rows2:
        session_volumes[wid]["date"] = wdate.isoformat()[:10]
        session_volumes[wid]["volume"] = round(session_volumes[wid]["volume"] + reps * weight, 1)
        session_volumes[wid]["sets"] += 1

    return sorted(session_volumes.values(), key=lambda x: x["date"])


@router.get("/strength")
async def get_strength_progress(
    exercise_id: str = Query(...),
    weeks: int = Query(12, ge=1, le=104),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Estimated 1RM (Epley formula) per session for a given exercise."""
    from app.services.progressive_overload import calculate_epley_1rm
    start_date = date.today() - timedelta(weeks=weeks)

    result = await db.execute(
        select(Workout.id, Workout.date, WorkoutSet.reps, WorkoutSet.weight_kg)
        .join(WorkoutSet)
        .where(and_(
            Workout.user_id == current_user.id,
            WorkoutSet.exercise_id == exercise_id,
            WorkoutSet.is_warmup == False,
            Workout.date >= start_date,
        ))
        .order_by(Workout.date)
    )
    rows = result.all()

    from collections import defaultdict
    sessions: dict[str, dict] = defaultdict(lambda: {"date": None, "e1rm": 0, "best_weight": 0, "best_reps": 0})
    for wid, wdate, reps, weight in rows:
        e1rm = calculate_epley_1rm(weight, reps)
        if e1rm > sessions[wid]["e1rm"]:
            sessions[wid]["date"] = wdate.isoformat()[:10]
            sessions[wid]["e1rm"] = round(e1rm, 1)
            sessions[wid]["best_weight"] = weight
            sessions[wid]["best_reps"] = reps

    return sorted(sessions.values(), key=lambda x: x["date"])


@router.get("/calories")
async def get_calorie_progress(
    days: int = Query(30, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Daily calorie totals vs target for the past N days."""
    start_date = date.today() - timedelta(days=days)

    result = await db.execute(
        select(NutritionLog.date, func.sum(NutritionLog.calories).label("calories"))
        .where(and_(NutritionLog.user_id == current_user.id, NutritionLog.date >= start_date))
        .group_by(NutritionLog.date)
        .order_by(NutritionLog.date)
    )
    rows = result.all()

    return [
        {"date": str(r.date), "calories": round(r.calories, 1), "target": current_user.calorie_target}
        for r in rows
    ]


@router.get("/streak")
async def get_streak(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Consecutive active days (workout OR cardio logged)."""
    start = date.today() - timedelta(days=60)

    # Use cross-database date extraction
    if IS_SQLITE:
        workout_date_func = func.strftime("%Y-%m-%d", Workout.date)
    else:
        workout_date_func = func.date(Workout.date)

    workout_result = await db.execute(
        select(workout_date_func.label("d"))
        .where(and_(Workout.user_id == current_user.id, Workout.date >= start))
        .group_by(workout_date_func)
    )
    workout_dates = [str(r.d)[:10] for r in workout_result.all()]

    cardio_result = await db.execute(
        select(CardioSession.date)
        .where(and_(CardioSession.user_id == current_user.id, CardioSession.date >= start))
        .group_by(CardioSession.date)
    )
    cardio_dates = [str(r.date) for r in cardio_result.all()]

    streak = calculate_streak(workout_dates, cardio_dates)
    total_days = len(set(workout_dates + cardio_dates))

    return {
        "streak": streak,
        "total_active_days_60d": total_days,
    }


@router.get("/body")
async def get_body_trends(
    days: int = Query(90, ge=14, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Body measurement trends for weight, body fat, muscle mass."""
    start = date.today() - timedelta(days=days)
    result = await db.execute(
        select(BodyMeasurement)
        .where(and_(BodyMeasurement.user_id == current_user.id, BodyMeasurement.date >= start))
        .order_by(BodyMeasurement.date.asc())
    )
    rows = result.scalars().all()

    return [
        {
            "date": str(r.date),
            "weight_kg": r.weight_kg,
            "body_fat_pct": r.body_fat_pct,
            "muscle_mass_kg": r.muscle_mass_kg,
            "waist_cm": r.waist_cm,
        }
        for r in rows
    ]


@router.get("/fat-loss-projection")
async def get_fat_loss_projection(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Project fat loss/gain trajectory based on recent calorie data and cardio."""
    if not current_user.calorie_target:
        return {"error": "No calorie target set"}

    # Average daily calories consumed over last 14 days
    start = date.today() - timedelta(days=14)
    
    # Cross-database compatible aggregation for average daily calories
    # We subquery to get daily sums first, then average them
    daily_sums = (
        select(func.sum(NutritionLog.calories).label("day_total"))
        .where(and_(NutritionLog.user_id == current_user.id, NutritionLog.date >= start))
        .group_by(NutritionLog.date)
        .subquery()
    )
    cal_result = await db.execute(select(func.avg(daily_sums.c.day_total)))
    row = cal_result.scalar()
    avg_daily_intake = float(row) if row else float(current_user.calorie_target)

    # Total cardio calories burned last 7 days
    cardio_result = await db.execute(
        select(func.sum(CardioSession.calories_burned))
        .where(and_(
            CardioSession.user_id == current_user.id,
            CardioSession.date >= date.today() - timedelta(days=7),
        ))
    )
    weekly_cardio = float(cardio_result.scalar() or 0)

    projection = projected_fat_loss(
        avg_daily_calories=avg_daily_intake,
        calorie_target=current_user.calorie_target,
        weekly_cardio_kcal=weekly_cardio,
        weeks=12,
    )

    weekly_deficit = (current_user.calorie_target - avg_daily_intake) * 7 + weekly_cardio
    weekly_kg = weekly_deficit / 7700

    return {
        "avg_daily_intake_kcal": round(avg_daily_intake, 1),
        "calorie_target": current_user.calorie_target,
        "weekly_cardio_kcal": round(weekly_cardio, 1),
        "weekly_deficit_kcal": round(weekly_deficit, 1),
        "projected_weekly_kg": round(weekly_kg, 3),
        "projection": projection,
        "direction": "loss" if weekly_kg > 0 else "gain" if weekly_kg < 0 else "maintenance",
    }


@router.get("/macros")
async def get_macro_progress(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Average macro breakdown for the past N days."""
    start_date = date.today() - timedelta(days=days)

    result = await db.execute(
        select(
            func.avg(NutritionLog.protein_g).label("avg_protein"),
            func.avg(NutritionLog.carbs_g).label("avg_carbs"),
            func.avg(NutritionLog.fat_g).label("avg_fat"),
            func.avg(NutritionLog.calories).label("avg_calories"),
        )
        .where(and_(NutritionLog.user_id == current_user.id, NutritionLog.date >= start_date))
    )
    row = result.one()

    return {
        "avg_protein_g": round(row.avg_protein or 0, 1),
        "avg_carbs_g": round(row.avg_carbs or 0, 1),
        "avg_fat_g": round(row.avg_fat or 0, 1),
        "avg_calories": round(row.avg_calories or 0, 1),
        "target_protein_g": current_user.protein_target,
        "target_carbs_g": current_user.carbs_target,
        "target_fat_g": current_user.fat_target,
        "target_calories": current_user.calorie_target,
    }
