"""models/records.py — Personal Records tracking"""

import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id: Mapped[str] = mapped_column(String, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False, index=True)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    volume: Mapped[float] = mapped_column(Float, nullable=False)  # weight * reps
    pr_type: Mapped[str] = mapped_column(String, nullable=False)  # weight|volume|reps
    achieved_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    exercise: Mapped["Exercise"] = relationship()
