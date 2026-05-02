"""routers/cardio.py — Cardio session logging + daily steps + TDEE calculation"""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.dependencies import get_db, get_current_user
from app.models.cardio import CardioSession, DailyActivity
from app.models.workout import Workout, WorkoutSet
from app.models.user import User
from app.schemas.cardio import CardioCreate, CardioResponse, DailyActivityCreate, DailyActivityResponse
from app.services.calorie_calculator import calculate_cardio_calories, calories_from_steps

router = APIRouter()


# ── Cardio sessions ────────────────────────────────────────────────────────────

@router.get("", response_model=list[CardioResponse])
async def list_cardio(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = date.today() - timedelta(days=days)
    result = await db.execute(
        select(CardioSession)
        .where(and_(CardioSession.user_id == current_user.id, CardioSession.date >= start))
        .order_by(CardioSession.date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=CardioResponse, status_code=status.HTTP_201_CREATED)
async def log_cardio(
    payload: CardioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    weight_kg = current_user.weight_kg or 75.0

    # Auto-calculate calories if not provided
    calories = calculate_cardio_calories(
        cardio_type=payload.cardio_type.value,
        duration_min=payload.duration_min,
        weight_kg=weight_kg,
        speed_kmh=payload.speed_kmh,
        incline_pct=payload.incline_pct,
        level=payload.level,
        rpm=payload.rpm,
    )

    session = CardioSession(
        **payload.model_dump(),
        user_id=current_user.id,
        calories_burned=calories,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cardio(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CardioSession).where(
            and_(CardioSession.id == session_id, CardioSession.user_id == current_user.id)
        )
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(s)
    await db.commit()


# ── Daily activity / steps ─────────────────────────────────────────────────────

@router.get("/activity/today")
async def get_today_activity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    result = await db.execute(
        select(DailyActivity).where(
            and_(DailyActivity.user_id == current_user.id, DailyActivity.date == today)
        )
    )
    activity = result.scalar_one_or_none()

    # Also get today's cardio calories
    cardio_result = await db.execute(
        select(func.sum(CardioSession.calories_burned))
        .where(and_(CardioSession.user_id == current_user.id, CardioSession.date == today))
    )
    cardio_kcal = cardio_result.scalar() or 0

    # TDEE breakdown
    bmr = current_user.calorie_target  # we use calorie_target as the daily target
    # Simple estimate: base BMR ≈ calorie_target / activity multiplier
    # More accurately, we recalculate from stored body stats
    from app.services.nutrition_targets import calculate_bmr
    raw_bmr = None
    if all([current_user.weight_kg, current_user.height_cm, current_user.age, current_user.sex]):
        raw_bmr = calculate_bmr(
            current_user.weight_kg, current_user.height_cm,
            current_user.age, current_user.sex.value
        )

    # Count today's working (non-warmup) sets for lifting calorie estimate
    # Research: ~350-450 kcal per lifting session depending on volume
    lifting_result = await db.execute(
        select(func.count(WorkoutSet.id))
        .join(Workout, WorkoutSet.workout_id == Workout.id)
        .where(and_(
            Workout.user_id == current_user.id,
            func.date(Workout.date) == today,
            WorkoutSet.is_warmup == False,
        ))
    )
    working_sets = lifting_result.scalar() or 0

    # Scale lifting calories by volume: 350 base, +5 per set above 10, max 450
    if working_sets > 0:
        lifting_kcal = min(450, max(300, 350 + (working_sets - 10) * 5))
    else:
        lifting_kcal = 0

    steps_kcal = activity.calories_from_steps if activity else 0

    return {
        "date": str(today),
        "steps": activity.steps if activity else 0,
        "calories_from_steps": round(steps_kcal, 1),
        "cardio_calories": round(cardio_kcal, 1),
        "lifting_calories": round(lifting_kcal, 1),
        "working_sets": working_sets,
        "bmr": raw_bmr,
        "total_burned": round((raw_bmr or 0) + steps_kcal + cardio_kcal + lifting_kcal, 1),
        "calorie_target": current_user.calorie_target,
    }


@router.post("/activity", response_model=DailyActivityResponse)
async def log_steps(
    payload: DailyActivityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    weight_kg = current_user.weight_kg or 70.0
    step_calories = calories_from_steps(payload.steps, weight_kg)

    # Upsert: one record per user per day
    result = await db.execute(
        select(DailyActivity).where(
            and_(DailyActivity.user_id == current_user.id, DailyActivity.date == payload.date)
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.steps = payload.steps
        existing.calories_from_steps = step_calories
        existing.notes = payload.notes
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        activity = DailyActivity(
            user_id=current_user.id,
            date=payload.date,
            steps=payload.steps,
            calories_from_steps=step_calories,
            notes=payload.notes,
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        return activity


# ── Weekly summary ─────────────────────────────────────────────────────────────

@router.get("/weekly-summary")
async def get_weekly_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns last 4 weeks of daily cardio + steps calories."""
    start = date.today() - timedelta(weeks=4)

    cardio_result = await db.execute(
        select(CardioSession.date, func.sum(CardioSession.calories_burned).label("kcal"))
        .where(and_(CardioSession.user_id == current_user.id, CardioSession.date >= start))
        .group_by(CardioSession.date)
        .order_by(CardioSession.date)
    )
    cardio_by_day = {str(r.date): round(r.kcal or 0, 1) for r in cardio_result.all()}

    steps_result = await db.execute(
        select(DailyActivity.date, DailyActivity.calories_from_steps)
        .where(and_(DailyActivity.user_id == current_user.id, DailyActivity.date >= start))
        .order_by(DailyActivity.date)
    )
    steps_by_day = {str(r.date): round(r.calories_from_steps or 0, 1) for r in steps_result.all()}

    # Build 28-day series
    today = date.today()
    series = []
    for i in range(27, -1, -1):
        d = today - timedelta(days=i)
        ds = str(d)
        series.append({
            "date": ds,
            "label": d.strftime("%m/%d"),
            "cardio_kcal": cardio_by_day.get(ds, 0),
            "steps_kcal": steps_by_day.get(ds, 0),
            "total_kcal": cardio_by_day.get(ds, 0) + steps_by_day.get(ds, 0),
        })

    total_cardio = sum(d["cardio_kcal"] for d in series)
    total_steps_kcal = sum(d["steps_kcal"] for d in series)

    return {
        "days": series,
        "total_cardio_kcal_28d": round(total_cardio, 1),
        "total_steps_kcal_28d": round(total_steps_kcal, 1),
        "avg_daily_burn": round((total_cardio + total_steps_kcal) / 28, 1),
    }
