"""schemas/exercise.py — Exercise Pydantic schemas"""

from pydantic import BaseModel
from app.models.exercise import MuscleGroup


class ExerciseCreate(BaseModel):
    name: str
    muscle_group: MuscleGroup
    description: str | None = None
    equipment: str | None = None


class ExerciseResponse(BaseModel):
    id: str
    name: str
    muscle_group: MuscleGroup
    is_custom: bool
    user_id: str | None
    description: str | None
    equipment: str | None

    model_config = {"from_attributes": True}
