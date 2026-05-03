"""models/program.py — Training program models"""
import uuid, enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ProgramGoal(str, enum.Enum):
    MUSCLE = "muscle"
    STRENGTH = "strength"
    WEIGHT_LOSS = "weight_loss"
    ENDURANCE = "endurance"


class ProgramLevel(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Program(Base):
    __tablename__ = "programs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    goal: Mapped[str] = mapped_column(String, nullable=False)  # ProgramGoal value
    level: Mapped[str] = mapped_column(String, nullable=False)  # ProgramLevel value
    days_per_week: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_weeks: Mapped[int] = mapped_column(Integer, default=12)
    current_week: Mapped[int] = mapped_column(Integer, default=1)
    current_day: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_plan_json: Mapped[str | None] = mapped_column(Text)  # full AI plan stored as JSON
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workouts: Mapped[list["ProgramWorkout"]] = relationship(back_populates="program", cascade="all, delete-orphan")


class ProgramWorkout(Base):
    __tablename__ = "program_workouts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    program_id: Mapped[str] = mapped_column(String, ForeignKey("programs.id", ondelete="CASCADE"), nullable=False, index=True)
    week: Mapped[int] = mapped_column(Integer, nullable=False)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Push A"
    focus: Mapped[str] = mapped_column(String, nullable=False)  # e.g. "Chest, Shoulders, Triceps"
    exercises_json: Mapped[str | None] = mapped_column(Text)  # JSON list of exercise prescriptions
    target_sets: Mapped[int] = mapped_column(Integer, default=3)
    target_reps_min: Mapped[int] = mapped_column(Integer, default=8)
    target_reps_max: Mapped[int] = mapped_column(Integer, default=12)
    target_rpe: Mapped[float] = mapped_column(Float, default=7.0)
    notes: Mapped[str | None] = mapped_column(Text)
    is_deload: Mapped[bool] = mapped_column(Boolean, default=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    program: Mapped["Program"] = relationship(back_populates="workouts")
