from pydantic import BaseModel
from datetime import date, datetime


class MeasurementCreate(BaseModel):
    date: date
    weight_kg: float | None = None
    body_fat_pct: float | None = None
    muscle_mass_kg: float | None = None
    waist_cm: float | None = None
    chest_cm: float | None = None
    left_arm_cm: float | None = None
    right_arm_cm: float | None = None
    left_thigh_cm: float | None = None
    right_thigh_cm: float | None = None
    notes: str | None = None


class MeasurementResponse(BaseModel):
    id: str
    user_id: str
    date: date
    weight_kg: float | None
    body_fat_pct: float | None
    muscle_mass_kg: float | None
    waist_cm: float | None
    chest_cm: float | None
    left_arm_cm: float | None
    right_arm_cm: float | None
    left_thigh_cm: float | None
    right_thigh_cm: float | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
