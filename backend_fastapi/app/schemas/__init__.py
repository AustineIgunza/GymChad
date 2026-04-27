"""
Pydantic schemas for request/response validation.

Pydantic automatically:
- Validates data types
- Converts types (e.g., string "123" to int 123)
- Generates OpenAPI documentation
- Provides IDE autocomplete
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS (for type safety across API)
# ============================================================================

class GoalEnum(str, Enum):
    CUTTING = "CUTTING"
    BULKING = "BULKING"
    MAINTENANCE = "MAINTENANCE"


class PlanEnum(str, Enum):
    FREE = "FREE"
    PRO = "PRO"


class MuscleGroupEnum(str, Enum):
    CHEST = "CHEST"
    BACK = "BACK"
    SHOULDERS = "SHOULDERS"
    BICEPS = "BICEPS"
    TRICEPS = "TRICEPS"
    LEGS = "LEGS"
    GLUTES = "GLUTES"
    CORE = "CORE"
    CARDIO = "CARDIO"
    FULL_BODY = "FULL_BODY"


class MealTypeEnum(str, Enum):
    BREAKFAST = "BREAKFAST"
    LUNCH = "LUNCH"
    DINNER = "DINNER"
    SNACK = "SNACK"
    PRE_WORKOUT = "PRE_WORKOUT"
    POST_WORKOUT = "POST_WORKOUT"


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserProfileUpdate(BaseModel):
    """User profile update request body"""
    name: Optional[str] = None
    goal: Optional[GoalEnum] = None
    tdee: Optional[int] = Field(None, gt=0)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "goal": "BULKING",
                "tdee": 2800
            }
        }


class UserResponse(BaseModel):
    """User response (returned from API)"""
    id: str
    email: str
    name: Optional[str]
    supabaseId: str
    plan: PlanEnum
    goal: Optional[GoalEnum]
    currentSplitId: Optional[str]
    tdee: Optional[int]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True  # Allow creation from ORM objects


# ============================================================================
# EXERCISE SCHEMAS
# ============================================================================

class ExerciseResponse(BaseModel):
    """Exercise response"""
    id: str
    name: str
    muscleGroup: MuscleGroupEnum
    equipment: Optional[str]
    isCustom: bool
    userId: Optional[str]
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True


# ============================================================================
# SPLIT SCHEMAS
# ============================================================================

class SplitDayExerciseCreate(BaseModel):
    """Exercise within a split day"""
    exerciseId: str = Field(..., min_length=1)


class SplitDayCreate(BaseModel):
    """Single day in a split"""
    dayNumber: int = Field(..., ge=1, le=7)
    label: str = Field(..., min_length=1)
    exercises: List[SplitDayExerciseCreate] = Field(default_factory=list)


class SplitCreate(BaseModel):
    """Create split request"""
    name: str = Field(..., min_length=1)
    days: List[SplitDayCreate] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Bro Split",
                "days": [
                    {
                        "dayNumber": 1,
                        "label": "Chest",
                        "exercises": [
                            {"exerciseId": "ex-123"},
                            {"exerciseId": "ex-456"}
                        ]
                    }
                ]
            }
        }


class SplitUpdate(BaseModel):
    """Update split request (all fields optional)"""
    name: Optional[str] = None
    days: Optional[List[SplitDayCreate]] = None


class SplitResponse(BaseModel):
    """Split response"""
    id: str
    userId: str
    name: str
    isActive: bool
    createdAt: datetime

    class Config:
        from_attributes = True


# ============================================================================
# WORKOUT SCHEMAS
# ============================================================================

class WorkoutCreate(BaseModel):
    """Create workout request"""
    splitDayId: Optional[str] = None
    label: str = Field(..., min_length=1)
    date: Optional[datetime] = None


class WorkoutSetCreate(BaseModel):
    """Create workout set request"""
    exerciseId: str = Field(..., min_length=1)
    setNumber: int = Field(..., gt=0)
    reps: int = Field(..., gt=0)
    weightKg: float = Field(..., ge=0)
    rpe: Optional[int] = Field(None, ge=1, le=10)
    isWarmup: bool = False


class WorkoutSetUpdate(BaseModel):
    """Update workout set (all optional)"""
    setNumber: Optional[int] = None
    reps: Optional[int] = None
    weightKg: Optional[float] = None
    rpe: Optional[int] = None
    isWarmup: Optional[bool] = None


class WorkoutUpdate(BaseModel):
    """Update workout (all optional)"""
    notes: Optional[str] = None
    durationMin: Optional[int] = Field(None, gt=0)


class WorkoutSetResponse(BaseModel):
    """Workout set response"""
    id: str
    workoutId: str
    exerciseId: str
    setNumber: int
    reps: int
    weightKg: float
    rpe: Optional[int]
    isWarmup: bool

    class Config:
        from_attributes = True


class WorkoutResponse(BaseModel):
    """Workout response"""
    id: str
    userId: str
    label: str
    date: datetime
    notes: Optional[str]
    durationMin: Optional[int]
    deletedAt: Optional[datetime]
    sets: List[WorkoutSetResponse] = []

    class Config:
        from_attributes = True


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


# ============================================================================
# NUTRITION SCHEMAS
# ============================================================================

class NutritionCreate(BaseModel):
    """Create nutrition log entry"""
    mealType: MealTypeEnum
    foodName: str = Field(..., min_length=1)
    calories: int = Field(..., ge=0)
    proteinG: float = Field(..., ge=0)
    carbsG: float = Field(..., ge=0)
    fatG: float = Field(..., ge=0)
    quantityG: float = Field(100, gt=0)
    openFoodFactsId: Optional[str] = None
    date: Optional[datetime] = None


class NutritionUpdate(BaseModel):
    """Update nutrition (all optional)"""
    mealType: Optional[MealTypeEnum] = None
    foodName: Optional[str] = None
    calories: Optional[int] = None
    proteinG: Optional[float] = None
    carbsG: Optional[float] = None
    fatG: Optional[float] = None
    quantityG: Optional[float] = None


class NutritionResponse(BaseModel):
    """Nutrition log response"""
    id: str
    userId: str
    date: datetime
    mealType: MealTypeEnum
    foodName: str
    calories: int
    proteinG: float
    carbsG: float
    fatG: float
    quantityG: float
    openFoodFactsId: Optional[str]
    createdAt: datetime

    class Config:
        from_attributes = True


class CustomFoodCreate(BaseModel):
    """Create custom food"""
    name: str = Field(..., min_length=1)
    calories: int = Field(..., ge=0)
    proteinG: float = Field(..., ge=0)
    carbsG: float = Field(..., ge=0)
    fatG: float = Field(..., ge=0)


class CustomFoodResponse(BaseModel):
    """Custom food response"""
    id: str
    userId: str
    name: str
    calories: int
    proteinG: float
    carbsG: float
    fatG: float
    createdAt: datetime

    class Config:
        from_attributes = True


class FoodSearchResult(BaseModel):
    """Food search result"""
    id: str
    name: str
    caloriesPer100g: float
    proteinPer100g: float
    carbsPer100g: float
    fatPer100g: float


class NutritionDailyResponse(BaseModel):
    """Daily nutrition summary"""
    date: str
    logs: List[NutritionResponse]
    totals: dict


class MacroSummary(BaseModel):
    """Macro summary"""
    proteinG: float
    carbsG: float
    fatG: float


# ============================================================================
# PROGRESS/ANALYTICS SCHEMAS
# ============================================================================

class ProgressEntry(BaseModel):
    """Generic progress data point"""
    date: str
    value: float


class CalorieProgress(BaseModel):
    """Calorie progress"""
    date: str
    calories: int
    target: Optional[int]


class VolumeProgress(BaseModel):
    """Training volume progress"""
    week: str
    volume: int


class StrengthProgress(BaseModel):
    """Strength progress"""
    date: str
    weightKg: float
    reps: int
    estimated1RM: float


class BodyweightProgress(BaseModel):
    """Bodyweight progress"""
    date: str
    weightKg: float


class ProgressivOverloadRecommendation(BaseModel):
    """Recommendation from progressive overload engine"""
    exerciseId: str
    exerciseName: str
    status: str  # e.g., "suggest_increase", "stalled", "on_track"
    suggestion: Optional[str] = None
    message: str


# ============================================================================
# AI/COACH SCHEMAS
# ============================================================================

class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # "user" or "assistant"
    content: str


class CoachRequest(BaseModel):
    """AI Coach request"""
    message: str = Field(..., min_length=1)
    conversationHistory: List[ChatMessage] = Field(default_factory=list)


class CoachResponse(BaseModel):
    """AI Coach response"""
    token: str
