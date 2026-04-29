"""models/exercise.py — Exercise library"""

import uuid
import enum
from sqlalchemy import String, Boolean, Enum as SAEnum
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


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    muscle_group: Mapped[MuscleGroup] = mapped_column(SAEnum(MuscleGroup, name='muscle_enum'), nullable=False, index=True)
    # is_custom=True means a user created it; user_id links to the creator
    is_custom: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[str | None] = mapped_column(String, index=True)  # NULL = global exercise
    description: Mapped[str | None] = mapped_column(String)
    equipment: Mapped[str | None] = mapped_column(String)
