"""schemas/schedule.py — Workout scheduling schemas"""

from pydantic import BaseModel
from datetime import date


class ScheduleCreate(BaseModel):
    split_id: str | None = None
    split_day_id: str | None = None
    scheduled_date: date
    notes: str | None = None


class ScheduleUpdate(BaseModel):
    split_id: str | None = None
    split_day_id: str | None = None
    scheduled_date: date | None = None
    completed: bool | None = None
    notes: str | None = None


class ScheduleResponse(BaseModel):
    id: str
    user_id: str
    split_id: str | None
    split_day_id: str | None
    scheduled_date: date
    completed: bool
    notes: str | None
    split_name: str | None = None
    split_day_label: str | None = None

    model_config = {"from_attributes": True}
