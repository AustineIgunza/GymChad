"""routers/measurements.py — Body measurement CRUD + progress trends"""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, delete
from app.dependencies import get_db, get_current_user
from app.models.measurement import BodyMeasurement
from app.models.user import User
from app.schemas.measurement import MeasurementCreate, MeasurementResponse

router = APIRouter()


@router.get("/", response_model=list[MeasurementResponse])
async def list_measurements(
    days: int = Query(90, ge=7, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start = date.today() - timedelta(days=days)
    result = await db.execute(
        select(BodyMeasurement)
        .where(and_(BodyMeasurement.user_id == current_user.id, BodyMeasurement.date >= start))
        .order_by(BodyMeasurement.date.asc())
    )
    return result.scalars().all()


@router.post("/", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def log_measurement(
    payload: MeasurementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    measurement = BodyMeasurement(**payload.model_dump(), user_id=current_user.id)
    db.add(measurement)
    await db.commit()
    await db.refresh(measurement)
    return measurement


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(
    measurement_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BodyMeasurement).where(
            and_(BodyMeasurement.id == measurement_id, BodyMeasurement.user_id == current_user.id)
        )
    )
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    await db.delete(m)
    await db.commit()


@router.get("/latest")
async def get_latest_measurements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the most recent measurement entry."""
    result = await db.execute(
        select(BodyMeasurement)
        .where(BodyMeasurement.user_id == current_user.id)
        .order_by(BodyMeasurement.date.desc())
        .limit(1)
    )
    m = result.scalar_one_or_none()
    return m
