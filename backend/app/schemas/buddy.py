from pydantic import BaseModel
from datetime import datetime

class BuddySessionCreate(BaseModel):
    pass  # host just calls create

class BuddySessionResponse(BaseModel):
    id: str
    session_code: str
    host_user_id: str
    guest_user_id: str | None
    status: str
    created_at: datetime
    model_config = {"from_attributes": True}

class BuddySetResponse(BaseModel):
    id: str
    user_id: str
    exercise_name: str
    set_number: int
    weight_kg: float
    reps: int
    rpe: float | None
    logged_at: datetime
    model_config = {"from_attributes": True}
