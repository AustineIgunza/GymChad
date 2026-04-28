from pydantic import BaseModel
from datetime import date, datetime
from app.models.cardio import CardioType


class CardioCreate(BaseModel):
    date: date
    cardio_type: CardioType
    duration_min: float
    workout_id: str | None = None
    # Treadmill
    speed_kmh: float | None = None
    incline_pct: float | None = None
    # Bike/Recumbent
    level: int | None = None
    rpm: float | None = None
    # General
    distance_km: float | None = None
    heart_rate_avg: int | None = None
    heart_rate_max: int | None = None
    notes: str | None = None


class CardioResponse(BaseModel):
    id: str
    user_id: str
    date: date
    workout_id: str | None
    cardio_type: CardioType
    duration_min: float
    calories_burned: float | None
    speed_kmh: float | None
    incline_pct: float | None
    level: int | None
    rpm: float | None
    distance_km: float | None
    heart_rate_avg: int | None
    heart_rate_max: int | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DailyActivityCreate(BaseModel):
    date: date
    steps: int = 0
    notes: str | None = None


class DailyActivityResponse(BaseModel):
    id: str
    user_id: str
    date: date
    steps: int
    calories_from_steps: float
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
