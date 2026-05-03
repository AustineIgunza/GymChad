"""schemas/records.py — Personal Records schemas"""

from pydantic import BaseModel
from datetime import datetime


class PersonalRecordResponse(BaseModel):
    id: str
    user_id: str
    exercise_id: str
    weight_kg: float
    reps: int
    volume: float
    pr_type: str
    achieved_at: datetime
    exercise_name: str | None = None

    model_config = {"from_attributes": True}
