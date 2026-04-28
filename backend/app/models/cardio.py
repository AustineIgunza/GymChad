"""models/cardio.py — Cardio session tracking with equipment-specific fields"""

import uuid, enum
from datetime import datetime, date as date_type
from sqlalchemy import String, Float, Integer, Date, Text, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class CardioType(str, enum.Enum):
    RECUMBENT_BIKE = "recumbent_bike"
    UPRIGHT_BIKE = "upright_bike"
    SPINNING = "spinning"
    TREADMILL = "treadmill"
    ELLIPTICAL = "elliptical"
    ROWING = "rowing"
    STAIRMASTER = "stairmaster"
    JUMP_ROPE = "jump_rope"
    BATTLE_ROPES = "battle_ropes"
    SWIMMING = "swimming"
    WALKING = "walking"
    HIKING = "hiking"
    HIIT = "hiit"
    OTHER = "other"


class CardioSession(Base):
    __tablename__ = "cardio_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True)
    workout_id: Mapped[str | None] = mapped_column(String, ForeignKey("workouts.id", ondelete="SET NULL"))

    cardio_type: Mapped[CardioType] = mapped_column(SAEnum(CardioType), nullable=False)
    duration_min: Mapped[float] = mapped_column(Float, nullable=False)
    calories_burned: Mapped[float | None] = mapped_column(Float)

    # Treadmill-specific
    speed_kmh: Mapped[float | None] = mapped_column(Float)
    incline_pct: Mapped[float | None] = mapped_column(Float)

    # Bike/Recumbent-specific
    level: Mapped[int | None] = mapped_column(Integer)
    rpm: Mapped[float | None] = mapped_column(Float)

    # General
    distance_km: Mapped[float | None] = mapped_column(Float)
    heart_rate_avg: Mapped[int | None] = mapped_column(Integer)
    heart_rate_max: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyActivity(Base):
    __tablename__ = "daily_activity"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[date_type] = mapped_column(Date, nullable=False)
    steps: Mapped[int] = mapped_column(Integer, default=0)
    calories_from_steps: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
