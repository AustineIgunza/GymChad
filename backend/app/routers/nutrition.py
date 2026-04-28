"""routers/nutrition.py — Nutrition logging CRUD"""

from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.dependencies import get_db, get_current_user
from app.models.nutrition import NutritionLog, CustomFood
from app.models.user import User
from app.schemas.nutrition import (
    NutritionLogCreate, NutritionLogUpdate, NutritionLogResponse,
    DailySummary, CustomFoodCreate, CustomFoodResponse
)

router = APIRouter()


@router.get("/", response_model=DailySummary)
async def get_nutrition(
    log_date: date = Query(default_factory=date.today, alias="date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns all nutrition logs for a given date plus daily totals."""
    result = await db.execute(
        select(NutritionLog)
        .where(and_(NutritionLog.user_id == current_user.id, NutritionLog.date == log_date))
        .order_by(NutritionLog.meal_type, NutritionLog.created_at)
    )
    logs = result.scalars().all()

    total_calories = sum(l.calories for l in logs)
    total_protein = sum(l.protein_g for l in logs)
    total_carbs = sum(l.carbs_g for l in logs)
    total_fat = sum(l.fat_g for l in logs)

    return DailySummary(
        date=log_date,
        total_calories=round(total_calories, 1),
        total_protein_g=round(total_protein, 1),
        total_carbs_g=round(total_carbs, 1),
        total_fat_g=round(total_fat, 1),
        logs=logs,
    )


@router.get("/summary")
async def get_nutrition_summary(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated daily nutrition totals for the past N days."""
    from datetime import timedelta
    start_date = date.today() - timedelta(days=days)

    result = await db.execute(
        select(
            NutritionLog.date,
            func.sum(NutritionLog.calories).label("calories"),
            func.sum(NutritionLog.protein_g).label("protein_g"),
            func.sum(NutritionLog.carbs_g).label("carbs_g"),
            func.sum(NutritionLog.fat_g).label("fat_g"),
        )
        .where(and_(NutritionLog.user_id == current_user.id, NutritionLog.date >= start_date))
        .group_by(NutritionLog.date)
        .order_by(NutritionLog.date)
    )
    rows = result.all()
    return [
        {"date": str(r.date), "calories": round(r.calories, 1),
         "protein_g": round(r.protein_g, 1), "carbs_g": round(r.carbs_g, 1), "fat_g": round(r.fat_g, 1)}
        for r in rows
    ]


@router.post("/", response_model=NutritionLogResponse, status_code=status.HTTP_201_CREATED)
async def create_log(
    payload: NutritionLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = NutritionLog(**payload.model_dump(), user_id=current_user.id)
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.put("/{log_id}", response_model=NutritionLogResponse)
async def update_log(
    log_id: str,
    payload: NutritionLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NutritionLog).where(and_(NutritionLog.id == log_id, NutritionLog.user_id == current_user.id))
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(log, field, value)

    await db.commit()
    await db.refresh(log)
    return log


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_log(
    log_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(NutritionLog).where(and_(NutritionLog.id == log_id, NutritionLog.user_id == current_user.id))
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    await db.delete(log)
    await db.commit()


# ── Custom Foods ──────────────────────────────────────────────────────────────

@router.get("/custom", response_model=list[CustomFoodResponse])
async def get_custom_foods(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomFood).where(CustomFood.user_id == current_user.id).order_by(CustomFood.name)
    )
    return result.scalars().all()


@router.post("/custom", response_model=CustomFoodResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_food(
    payload: CustomFoodCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    food = CustomFood(**payload.model_dump(), user_id=current_user.id)
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food


@router.delete("/custom/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_food(
    food_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CustomFood).where(and_(CustomFood.id == food_id, CustomFood.user_id == current_user.id))
    )
    food = result.scalar_one_or_none()
    if not food:
        raise HTTPException(status_code=404, detail="Custom food not found")
    await db.delete(food)
    await db.commit()
