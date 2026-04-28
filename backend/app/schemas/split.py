"""schemas/split.py — Split Pydantic schemas"""

from pydantic import BaseModel
from datetime import datetime


class SplitDayExerciseCreate(BaseModel):
    exercise_id: str
    order: int = 0
    target_sets: int | None = None
    target_reps_min: int | None = None
    target_reps_max: int | None = None
    notes: str | None = None


class SplitDayCreate(BaseModel):
    day_number: int
    label: str
    exercises: list[SplitDayExerciseCreate] = []


class SplitCreate(BaseModel):
    name: str
    description: str | None = None
    days: list[SplitDayCreate] = []


class SplitUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class SplitDayExerciseResponse(BaseModel):
    id: str
    split_day_id: str
    exercise_id: str
    order: int
    target_sets: int | None
    target_reps_min: int | None
    target_reps_max: int | None
    notes: str | None
    exercise: dict | None = None

    model_config = {"from_attributes": True}


class SplitDayResponse(BaseModel):
    id: str
    split_id: str
    day_number: int
    label: str
    exercises: list[SplitDayExerciseResponse] = []

    model_config = {"from_attributes": True}


class SplitResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None
    is_active: bool
    created_at: datetime
    days: list[SplitDayResponse] = []

    model_config = {"from_attributes": True}
