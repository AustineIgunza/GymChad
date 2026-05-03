"""services/nutrition_workout_intelligence.py — Nutrition meets training insights"""
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.nutrition import NutritionLog
from app.models.workout import Workout, WorkoutSet
from app.models.user import User


async def get_pre_workout_brief(user_id: str, user: User, db: AsyncSession) -> dict:
    """Check today's nutrition and return a recommendation for workout context."""
    today = date.today()

    result = await db.execute(
        select(
            func.sum(NutritionLog.protein_g).label("protein"),
            func.sum(NutritionLog.carbs_g).label("carbs"),
            func.sum(NutritionLog.calories).label("calories"),
        ).where(and_(
            NutritionLog.user_id == user_id,
            func.date(NutritionLog.date) == today,
        ))
    )
    row = result.one()
    protein = float(row.protein or 0)
    carbs = float(row.carbs or 0)
    calories = float(row.calories or 0)

    protein_target = user.protein_target or 140
    calorie_target = user.calorie_target or 2000

    protein_pct = protein / max(1, protein_target)
    calorie_pct = calories / max(1, calorie_target)

    if calories == 0 and protein == 0:
        return {
            "protein_so_far": 0, "protein_target": protein_target,
            "carbs_so_far": 0, "calories_so_far": 0, "calorie_target": calorie_target,
            "status": "no_data",
            "recommendation": "No nutrition logged today — log food for smarter workout insights"
        }
    elif protein_pct < 0.4:
        return {
            "protein_so_far": round(protein), "protein_target": protein_target,
            "carbs_so_far": round(carbs), "calories_so_far": round(calories), "calorie_target": calorie_target,
            "status": "low_protein",
            "recommendation": f"Low protein today ({round(protein)}g of {protein_target}g). Consider a shake before you start."
        }
    elif protein_pct >= 0.7:
        return {
            "protein_so_far": round(protein), "protein_target": protein_target,
            "carbs_so_far": round(carbs), "calories_so_far": round(calories), "calorie_target": calorie_target,
            "status": "on_track",
            "recommendation": f"Nutrition on track ({round(protein)}g/{protein_target}g protein) — great day to lift heavy"
        }
    else:
        return {
            "protein_so_far": round(protein), "protein_target": protein_target,
            "carbs_so_far": round(carbs), "calories_so_far": round(calories), "calorie_target": calorie_target,
            "status": "moderate",
            "recommendation": f"You've hit {round(protein)}g of {protein_target}g protein. Good base — finish strong post-workout."
        }


async def get_post_workout_nutrition_push(user_id: str, workout_id: str, user: User, db: AsyncSession) -> dict:
    """After workout, give personalized nutrition targets for rest of day."""
    # Get workout details
    wo_result = await db.execute(
        select(Workout).where(and_(Workout.id == workout_id, Workout.user_id == user_id))
    )
    workout = wo_result.scalar_one_or_none()
    if not workout:
        return {"message": "Log your post-workout meal to maximize your gains!"}

    # Count sets and muscle groups
    sets_result = await db.execute(
        select(WorkoutSet).where(and_(WorkoutSet.workout_id == workout_id, WorkoutSet.is_warmup == False))
    )
    sets = sets_result.scalars().all()
    total_sets = len(sets)

    protein_target = user.protein_target or 140

    # Today's logged protein
    today = date.today()
    nut_result = await db.execute(
        select(func.sum(NutritionLog.protein_g)).where(and_(
            NutritionLog.user_id == user_id,
            func.date(NutritionLog.date) == today,
        ))
    )
    logged_protein = float(nut_result.scalar() or 0)
    remaining_protein = max(0, protein_target - logged_protein)

    if total_sets >= 20:
        message = f"Big session — {total_sets} sets! Your muscles need {round(remaining_protein)}g more protein today. Log your post-workout meal now."
    elif total_sets >= 10:
        message = f"Solid workout with {total_sets} working sets. Aim for {round(remaining_protein)}g more protein in the next 2 hours."
    else:
        message = f"Good session! Try to hit {round(remaining_protein)}g more protein today to support recovery."

    return {
        "total_sets": total_sets,
        "protein_logged": round(logged_protein),
        "protein_remaining": round(remaining_protein),
        "protein_target": protein_target,
        "message": message,
    }


async def get_daily_readiness_score(user_id: str, user: User, db: AsyncSession) -> dict:
    """Compute a 0-10 readiness score from logged data only (no wearable needed)."""
    # This will be enhanced by the recovery engine in Feature 5
    # Simple version here using nutrition data
    today = date.today()
    yesterday = today - timedelta(days=1)

    nut_result = await db.execute(
        select(
            func.sum(NutritionLog.calories).label("cal"),
            func.sum(NutritionLog.protein_g).label("protein"),
        ).where(and_(
            NutritionLog.user_id == user_id,
            func.date(NutritionLog.date) == yesterday,
        ))
    )
    nut = nut_result.one()
    cal_yesterday = float(nut.cal or 0)
    protein_yesterday = float(nut.protein or 0)

    cal_target = user.calorie_target or 2000
    protein_target = user.protein_target or 140

    cal_score = min(1.0, cal_yesterday / max(1, cal_target))
    protein_score = min(1.0, protein_yesterday / max(1, protein_target))

    # Base score from nutrition
    nutrition_component = (cal_score * 0.4 + protein_score * 0.6) * 4  # max 4 points from nutrition

    # Rest of score comes from recovery engine (will be enhanced)
    base_score = 5.0 + nutrition_component
    score = min(10.0, max(1.0, base_score))

    if score >= 7:
        label = "Ready"
        explanation = "Your nutrition and recovery are in good shape. Push hard today."
    elif score >= 4:
        label = "Moderate"
        explanation = "You can train, but consider lowering intensity slightly. Focus on nutrition."
    else:
        label = "Low"
        explanation = "Poor nutrition yesterday may affect performance. Consider a lighter session."

    return {
        "score": round(score, 1),
        "label": label,
        "explanation": explanation,
        "nutrition_score": round(cal_score * protein_score * 10, 1),
    }
