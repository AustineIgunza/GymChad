from pydantic import BaseModel
from datetime import datetime, date

class StreakResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_workout_date: date | None
    total_xp: int
    level: int
    xp_to_next_level: int
    model_config = {"from_attributes": True}

class AchievementResponse(BaseModel):
    id: str
    key: str
    name: str
    description: str
    icon_name: str
    xp_value: int
    condition_type: str
    earned: bool
    earned_at: datetime | None = None
    model_config = {"from_attributes": True}

class ChallengeCreate(BaseModel):
    name: str
    description: str | None = None
    type: str
    target_value: float
    start_date: date
    end_date: date
    is_public: bool = True

class ChallengeResponse(BaseModel):
    id: str
    name: str
    description: str | None
    type: str
    target_value: float
    start_date: date
    end_date: date
    is_public: bool
    participant_count: int = 0
    my_progress: float = 0
    my_rank: int | None = None
    model_config = {"from_attributes": True}
