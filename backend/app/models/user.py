"""
models/user.py — User ORM model

SQLAlchemy 2.0 uses `Mapped` type annotations for columns — this is the new
recommended style. It gives you IDE autocompletion and type safety on model attributes.

`mapped_column()` is the new Column() equivalent. It reads the type from the Mapped[T] annotation.
"""

import uuid
import enum
from datetime import datetime
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Goal(str, enum.Enum):
    CUTTING = "CUTTING"
    BULKING = "BULKING"
    MAINTENANCE = "MAINTENANCE"


class ActivityLevel(str, enum.Enum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    ACTIVE = "active"
    VERY_ACTIVE = "very_active"


class Sex(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"


class Plan(str, enum.Enum):
    FREE = "FREE"
    PRO = "PRO"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # supabase_id links our DB record to the Supabase Auth user
    supabase_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String)

    # Profile / onboarding
    goal: Mapped[Goal] = mapped_column(SAEnum(Goal), default=Goal.MAINTENANCE)
    activity_level: Mapped[ActivityLevel] = mapped_column(SAEnum(ActivityLevel), default=ActivityLevel.MODERATE)
    sex: Mapped[Sex | None] = mapped_column(SAEnum(Sex))
    weight_kg: Mapped[float | None] = mapped_column(Float)
    height_cm: Mapped[float | None] = mapped_column(Float)
    age: Mapped[int | None] = mapped_column(Integer)

    # Calculated nutrition targets (stored after onboarding)
    calorie_target: Mapped[int | None] = mapped_column(Integer)
    protein_target: Mapped[int | None] = mapped_column(Integer)
    carbs_target: Mapped[int | None] = mapped_column(Integer)
    fat_target: Mapped[int | None] = mapped_column(Integer)

    goal_weight_kg: Mapped[float | None] = mapped_column(Float)

    # Preferences
    use_kg: Mapped[bool] = mapped_column(Boolean, default=True)
    plan: Mapped[Plan] = mapped_column(SAEnum(Plan), default=Plan.FREE)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships — SQLAlchemy lazy-loads these unless you explicitly join/selectinload
    workouts: Mapped[list["Workout"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    splits: Mapped[list["Split"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    nutrition_logs: Mapped[list["NutritionLog"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    custom_foods: Mapped[list["CustomFood"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    ai_sessions: Mapped[list["AISession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
