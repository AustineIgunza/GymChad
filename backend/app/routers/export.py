"""routers/export.py — CSV export endpoints"""

import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.dependencies import get_db, get_current_user
from app.models.workout import Workout, WorkoutSet
from app.models.nutrition import NutritionLog
from app.models.measurement import BodyMeasurement
from app.models.user import User

router = APIRouter()


def make_csv_response(rows: list[list], headers: list[str], filename: str) -> StreamingResponse:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/workouts")
async def export_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export all workout history as CSV."""
    result = await db.execute(
        select(Workout)
        .where(Workout.user_id == current_user.id)
        .options(selectinload(Workout.sets).selectinload(WorkoutSet.exercise))
        .order_by(Workout.date.desc())
    )
    workouts = result.scalars().all()

    headers = ["date", "workout_label", "exercise", "muscle_group", "set_number",
               "weight_kg", "reps", "volume_kg", "rpe", "is_warmup", "set_type", "notes"]
    rows = []
    for w in workouts:
        for s in w.sets:
            rows.append([
                w.date.strftime("%Y-%m-%d"),
                w.label,
                s.exercise.name if s.exercise else "",
                s.exercise.muscle_group.value if s.exercise else "",
                s.set_number,
                s.weight_kg,
                s.reps,
                round(s.weight_kg * s.reps, 1),
                s.rpe or "",
                s.is_warmup,
                s.set_type,
                s.notes or "",
            ])

    filename = f"gymchad_workouts_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return make_csv_response(rows, headers, filename)


@router.get("/measurements")
async def export_measurements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export body measurement history as CSV."""
    result = await db.execute(
        select(BodyMeasurement)
        .where(BodyMeasurement.user_id == current_user.id)
        .order_by(BodyMeasurement.date.desc())
    )
    measurements = result.scalars().all()

    headers = ["date", "weight_kg", "body_fat_pct", "waist_cm", "chest_cm",
               "left_arm_cm", "right_arm_cm", "left_thigh_cm", "right_thigh_cm", "notes"]
    rows = [
        [m.date, m.weight_kg or "", m.body_fat_pct or "", m.waist_cm or "",
         m.chest_cm or "", m.left_arm_cm or "", m.right_arm_cm or "",
         m.left_thigh_cm or "", m.right_thigh_cm or "", m.notes or ""]
        for m in measurements
    ]

    filename = f"gymchad_measurements_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return make_csv_response(rows, headers, filename)


@router.get("/nutrition")
async def export_nutrition(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export nutrition logs as CSV."""
    result = await db.execute(
        select(NutritionLog)
        .where(NutritionLog.user_id == current_user.id)
        .order_by(NutritionLog.date.desc())
    )
    logs = result.scalars().all()

    headers = ["date", "meal_type", "food_name", "quantity_g", "calories",
               "protein_g", "carbs_g", "fat_g"]
    rows = [
        [l.date, l.meal_type.value, l.food_name, l.quantity_g,
         l.calories, l.protein_g, l.carbs_g, l.fat_g]
        for l in logs
    ]

    filename = f"gymchad_nutrition_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return make_csv_response(rows, headers, filename)
