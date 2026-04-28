# Import all models here so Alembic autogenerate can detect them
from app.models.user import User
from app.models.workout import Workout, WorkoutSet
from app.models.exercise import Exercise
from app.models.nutrition import NutritionLog, CustomFood
from app.models.split import Split, SplitDay, SplitDayExercise
from app.models.ai import AISession
from app.models.measurement import BodyMeasurement
from app.models.cardio import CardioSession, DailyActivity

__all__ = [
    "User", "Workout", "WorkoutSet", "Exercise",
    "NutritionLog", "CustomFood", "Split", "SplitDay", "SplitDayExercise",
    "AISession", "BodyMeasurement", "CardioSession", "DailyActivity",
]
