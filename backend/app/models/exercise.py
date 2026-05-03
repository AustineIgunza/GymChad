"""models/exercise.py — Exercise library"""

import uuid
import enum
from sqlalchemy import String, Boolean, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class MuscleGroup(str, enum.Enum):
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


class Difficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    muscle_group: Mapped[MuscleGroup] = mapped_column(SAEnum(MuscleGroup, name='muscle_enum'), nullable=False, index=True)
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[str | None] = mapped_column(String, index=True)
    description: Mapped[str | None] = mapped_column(String)
    equipment: Mapped[str | None] = mapped_column(String)
    # Extended fields
    secondary_muscles: Mapped[str | None] = mapped_column(String)  # comma-separated e.g. "TRICEPS,CORE"
    instructions: Mapped[str | None] = mapped_column(Text)
    difficulty: Mapped[str | None] = mapped_column(String)  # beginner|intermediate|advanced
    video_url: Mapped[str | None] = mapped_column(String)
    image_url: Mapped[str | None] = mapped_column(String)
