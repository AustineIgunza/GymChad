"""schemas/workout.py — Workout and WorkoutSet Pydantic schemas"""

from pydantic import BaseModel
from datetime import datetime


class WorkoutSetCreate(BaseModel):
    exercise_id: str
    set_number: int
    reps: int
    weight_kg: float
    rpe: int | None = None
    is_warmup: bool = False
    notes: str | None = None
    set_type: str = "normal"      # normal|warmup|dropset|superset
    superset_group: int | None = None


class WorkoutSetUpdate(BaseModel):
    reps: int | None = None
    weight_kg: float | None = None
    rpe: int | None = None
    is_warmup: bool | None = None
    notes: str | None = None
    set_type: str | None = None
    superset_group: int | None = None


class WorkoutSetResponse(BaseModel):
    id: str
    workout_id: str
    exercise_id: str
    set_number: int
    reps: int
    weight_kg: float
    rpe: int | None
    is_warmup: bool
    notes: str | None
    set_type: str
    superset_group: int | None
    exercise: dict | None = None
    is_pr: bool = False  # injected after PR check

    model_config = {"from_attributes": True}


class WorkoutCreate(BaseModel):
    label: str
    split_day_id: str | None = None
    notes: str | None = None
    date: datetime | None = None


class WorkoutUpdate(BaseModel):
    label: str | None = None
    notes: str | None = None
    duration_min: int | None = None


class WorkoutResponse(BaseModel):
    id: str
    user_id: str
    split_day_id: str | None
    label: str
    date: datetime
    notes: str | None
    duration_min: int | None
    sets: list[WorkoutSetResponse] = []

    model_config = {"from_attributes": True}
