"""models/schedule.py — Workout scheduling"""

import uuid
from datetime import datetime, date
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class WorkoutSchedule(Base):
    __tablename__ = "workout_schedules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    split_id: Mapped[str | None] = mapped_column(String, ForeignKey("splits.id", ondelete="SET NULL"), index=True)
    split_day_id: Mapped[str | None] = mapped_column(String, ForeignKey("split_days.id", ondelete="SET NULL"))
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    split: Mapped["Split"] = relationship()
    split_day: Mapped["SplitDay"] = relationship()
