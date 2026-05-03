"""schemas/program.py"""
from pydantic import BaseModel
from datetime import datetime
from typing import Any

class ProgramGenerateRequest(BaseModel):
    goal: str  # muscle|strength|weight_loss|endurance
    level: str  # beginner|intermediate|advanced
    days_per_week: int
    available_equipment: list[str] = []
    duration_weeks: int = 12

class ProgramWorkoutSchema(BaseModel):
    id: str
    week: int
    day: int
    label: str
    focus: str
    target_sets: int
    target_reps_min: int
    target_reps_max: int
    target_rpe: float
    notes: str | None
    is_deload: bool
    completed: bool
    exercises: list[dict] = []  # parsed from exercises_json
    model_config = {"from_attributes": True}

class ProgramResponse(BaseModel):
    id: str
    name: str
    goal: str
    level: str
    days_per_week: int
    duration_weeks: int
    current_week: int
    current_day: int
    is_active: bool
    created_at: datetime
    workouts: list[ProgramWorkoutSchema] = []
    model_config = {"from_attributes": True}

class TodayWorkoutResponse(BaseModel):
    program_id: str
    week: int
    day: int
    label: str
    focus: str
    is_deload: bool
    notes: str | None
    exercises: list[dict]  # [{exercise_name, sets, reps_min, reps_max, rpe, recommended_weight}]

class WeightRecommendationResponse(BaseModel):
    exercise_id: str
    exercise_name: str
    recommended_weight: float
    recommended_reps: int
    note: str
    confidence: float  # 0-1
