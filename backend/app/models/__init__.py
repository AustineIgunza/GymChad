# Import all models here so Alembic autogenerate can detect them
from app.models.user import User
from app.models.workout import Workout, WorkoutSet
from app.models.exercise import Exercise
from app.models.nutrition import NutritionLog, CustomFood
from app.models.split import Split, SplitDay, SplitDayExercise
from app.models.ai import AISession
from app.models.measurement import BodyMeasurement
from app.models.cardio import CardioSession, DailyActivity
from app.models.records import PersonalRecord
from app.models.schedule import WorkoutSchedule
from app.models.buddy_session import BuddySession, BuddySet
from app.models.program import Program, ProgramWorkout
from app.models.gamification import UserStreak, Achievement, UserAchievement, Challenge, ChallengeParticipant

__all__ = [
    "User", "Workout", "WorkoutSet", "Exercise",
    "NutritionLog", "CustomFood", "Split", "SplitDay", "SplitDayExercise",
    "AISession", "BodyMeasurement", "CardioSession", "DailyActivity",
    "PersonalRecord", "WorkoutSchedule", "BuddySession", "BuddySet",
    "Program", "ProgramWorkout",
    "UserStreak", "Achievement", "UserAchievement", "Challenge", "ChallengeParticipant",
]
