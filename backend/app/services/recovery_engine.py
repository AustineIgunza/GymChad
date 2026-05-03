"""services/recovery_engine.py — Training fatigue and recovery scoring (no wearable)"""
from datetime import date, timedelta, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.workout import Workout, WorkoutSet
from app.models.nutrition import NutritionLog
from app.models.user import User


async def calculate_recovery_score(user_id: str, user: User, db: AsyncSession) -> dict:
    """
    Compute a 0-10 recovery score from logged workout and nutrition data.
    No wearable required — uses training load, rest days, nutrition, RPE trends.
    """
    today = date.today()
    seven_ago = today - timedelta(days=7)
    fourteen_ago = today - timedelta(days=14)
    four_weeks_ago = today - timedelta(weeks=4)

    # --- Get workout data ---
    workouts_14d = await db.execute(
        select(Workout).where(and_(
            Workout.user_id == user_id,
            func.date(Workout.date) >= fourteen_ago,
        )).order_by(Workout.date.desc())
    )
    workouts = workouts_14d.scalars().all()

    # Get sets with RPE for last 7 days
    sets_7d = await db.execute(
        select(WorkoutSet.rpe, WorkoutSet.weight_kg, WorkoutSet.reps, Workout.date)
        .join(Workout)
        .where(and_(
            Workout.user_id == user_id,
            func.date(Workout.date) >= seven_ago,
            WorkoutSet.is_warmup == False,
        ))
    )
    recent_sets = sets_7d.all()

    # --- Rest days score (target = 2+ per week) ---
    workout_dates_7d = set(str(w.date)[:10] for w in workouts if w.date.date() >= seven_ago)
    rest_days = 7 - len(workout_dates_7d)
    rest_score = min(1.0, rest_days / 2.0)  # 2+ rest days = full score

    # --- Volume score (flag if >30% above 4-week average) ---
    volume_7d = sum(r.weight_kg * r.reps for r in recent_sets if r.weight_kg)

    # 4-week baseline
    sets_old = await db.execute(
        select(WorkoutSet.weight_kg, WorkoutSet.reps, Workout.date)
        .join(Workout)
        .where(and_(
            Workout.user_id == user_id,
            func.date(Workout.date) >= four_weeks_ago,
            func.date(Workout.date) < seven_ago,
            WorkoutSet.is_warmup == False,
        ))
    )
    old_sets = sets_old.all()
    weeks_of_history = max(1, (today - four_weeks_ago).days / 7 - 1)
    weekly_avg_volume = sum(r.weight_kg * r.reps for r in old_sets if r.weight_kg) / weeks_of_history if old_sets else 0

    if weekly_avg_volume > 0:
        volume_ratio = volume_7d / weekly_avg_volume
        volume_score = max(0.0, 1.0 - max(0, volume_ratio - 1.0))  # penalize spikes above 100%
    else:
        volume_ratio = 0
        volume_score = 0.8  # no history = assume moderate

    # --- Nutrition score ---
    protein_target = user.protein_target or 140
    nut_result = await db.execute(
        select(
            func.avg(NutritionLog.protein_g).label("avg_protein"),
            func.avg(NutritionLog.calories).label("avg_cal"),
        ).where(and_(
            NutritionLog.user_id == user_id,
            func.date(NutritionLog.date) >= today - timedelta(days=3),
        ))
    )
    nut = nut_result.one()
    avg_protein = float(nut.avg_protein or 0)
    nutrition_score = min(1.0, avg_protein / max(1, protein_target))

    # --- RPE trend score ---
    rpe_values = [r.rpe for r in recent_sets if r.rpe is not None]
    if len(rpe_values) >= 4:
        # Split into older half and newer half
        mid = len(rpe_values) // 2
        older_avg = sum(rpe_values[mid:]) / len(rpe_values[mid:])
        newer_avg = sum(rpe_values[:mid]) / len(rpe_values[:mid])
        rpe_rise = newer_avg - older_avg
        rpe_score = max(0.0, 1.0 - (rpe_rise / 3.0))  # rising RPE = lower score
    else:
        rpe_score = 0.75  # neutral if not enough data

    # --- Density score ---
    workouts_7d = len(workout_dates_7d)
    density_score = max(0.0, 1.0 - max(0, (workouts_7d - 5) / 2.0))  # >5 workouts in 7 days = lower

    # --- Weighted composite ---
    recovery = (
        rest_score * 0.25 +
        volume_score * 0.25 +
        nutrition_score * 0.20 +
        rpe_score * 0.15 +
        density_score * 0.15
    ) * 10

    recovery = round(min(10.0, max(1.0, recovery)), 1)

    if recovery >= 7:
        label = "Recovered"
        recommendation = "Your body is ready — push hard today with confidence."
    elif recovery >= 4:
        label = "Moderate"
        recommendation = "Decent recovery. Train but avoid max-effort sets — RPE 7-8 max."
    else:
        label = "Fatigued"
        recommendation = "High fatigue detected. Consider a light session or rest day."

    should_deload = bool(rpe_values and len(rpe_values) >= 5 and sum(rpe_values[-5:]) / 5 >= 8.5)

    return {
        "score": recovery,
        "label": label,
        "breakdown": {
            "rest_days": {"score": round(rest_score * 10, 1), "label": f"{rest_days} rest days this week"},
            "volume": {"score": round(volume_score * 10, 1), "label": f"Volume {'spike' if volume_ratio > 1.3 else 'normal'}" if weekly_avg_volume > 0 else "No baseline yet"},
            "nutrition": {"score": round(nutrition_score * 10, 1), "label": f"Avg {round(avg_protein)}g/{protein_target}g protein last 3 days"},
            "rpe": {"score": round(rpe_score * 10, 1), "label": "RPE trending up" if rpe_score < 0.6 else "RPE stable"},
            "density": {"score": round(density_score * 10, 1), "label": f"{workouts_7d} workouts this week"},
        },
        "recommendation": recommendation,
        "should_deload": should_deload,
    }


async def get_muscle_group_fatigue(user_id: str, db: AsyncSession) -> dict:
    """Return fatigue level per muscle group based on recent training."""
    from app.models.exercise import Exercise

    today = date.today()

    muscle_groups = ["CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "LEGS", "GLUTES", "CORE"]
    result = {}

    for mg in muscle_groups:
        # Sets in last 48h
        sets_48h = await db.execute(
            select(func.count(WorkoutSet.id))
            .join(Workout)
            .join(Exercise)
            .where(and_(
                Workout.user_id == user_id,
                Exercise.muscle_group == mg,
                WorkoutSet.is_warmup == False,
                Workout.date >= datetime.utcnow() - timedelta(hours=48),
            ))
        )
        count_48h = sets_48h.scalar() or 0

        # Sets in last 7 days
        sets_7d = await db.execute(
            select(func.count(WorkoutSet.id))
            .join(Workout)
            .join(Exercise)
            .where(and_(
                Workout.user_id == user_id,
                Exercise.muscle_group == mg,
                WorkoutSet.is_warmup == False,
                func.date(Workout.date) >= today - timedelta(days=7),
            ))
        )
        count_7d = sets_7d.scalar() or 0

        if count_48h >= 10:
            fatigue = "fatigued"
        elif count_48h >= 5:
            fatigue = "moderate"
        else:
            fatigue = "fresh"

        result[mg] = {"fatigue": fatigue, "sets_48h": count_48h, "sets_7d": count_7d}

    return result
