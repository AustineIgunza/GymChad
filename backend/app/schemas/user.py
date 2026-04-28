"""
schemas/user.py — Pydantic models for user request/response validation

Pydantic v2 validates all incoming data automatically.
- Missing required fields → 422 Unprocessable Entity
- Wrong types → 422 with clear error message
- No manual validation code needed in route handlers

Separate Create/Update/Response schemas give you fine-grained control:
- Create: fields required at creation time
- Update: all optional (patch semantics)
- Response: what we send back (may include computed fields)
"""

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from app.models.user import Goal, ActivityLevel, Sex, Plan


class UserVerify(BaseModel):
    """Sent from frontend after Supabase login — registers user in our DB"""
    supabase_id: str
    email: EmailStr
    name: str | None = None


class UserOnboarding(BaseModel):
    """Onboarding profile data — sent once after registration"""
    name: str
    goal: Goal
    activity_level: ActivityLevel
    sex: Sex
    weight_kg: float
    height_cm: float
    age: int

    @field_validator("weight_kg")
    @classmethod
    def validate_weight(cls, v):
        if not 20 <= v <= 500:
            raise ValueError("Weight must be between 20kg and 500kg")
        return v

    @field_validator("height_cm")
    @classmethod
    def validate_height(cls, v):
        if not 100 <= v <= 300:
            raise ValueError("Height must be between 100cm and 300cm")
        return v

    @field_validator("age")
    @classmethod
    def validate_age(cls, v):
        if not 13 <= v <= 120:
            raise ValueError("Age must be between 13 and 120")
        return v


class UserProfileUpdate(BaseModel):
    """Update any subset of profile fields"""
    name: str | None = None
    goal: Goal | None = None
    activity_level: ActivityLevel | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    age: int | None = None
    sex: Sex | None = None
    use_kg: bool | None = None
    goal_weight_kg: float | None = None
    calorie_target: int | None = None
    protein_target: int | None = None
    carbs_target: int | None = None
    fat_target: int | None = None


class UserResponse(BaseModel):
    id: str
    supabase_id: str
    email: str
    name: str | None
    goal: Goal
    activity_level: ActivityLevel
    sex: Sex | None
    weight_kg: float | None
    height_cm: float | None
    age: int | None
    goal_weight_kg: float | None
    calorie_target: int | None
    protein_target: int | None
    carbs_target: int | None
    fat_target: int | None
    use_kg: bool
    plan: Plan
    created_at: datetime

    # `from_attributes = True` tells Pydantic to read SQLAlchemy model attributes directly
    # (instead of requiring a dict). This is needed for `response_model=` to work.
    model_config = {"from_attributes": True}
