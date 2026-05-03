"""models/split.py — Training split models"""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Split(Base):
    __tablename__ = "splits"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    is_template: Mapped[bool] = mapped_column(Boolean, default=False)
    shared_token: Mapped[str | None] = mapped_column(String, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="splits")
    days: Mapped[list["SplitDay"]] = relationship(
        back_populates="split",
        cascade="all, delete-orphan",
        order_by="SplitDay.day_number",
    )


class SplitDay(Base):
    __tablename__ = "split_days"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    split_id: Mapped[str] = mapped_column(String, ForeignKey("splits.id", ondelete="CASCADE"), nullable=False, index=True)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String, nullable=False)

    split: Mapped["Split"] = relationship(back_populates="days")
    exercises: Mapped[list["SplitDayExercise"]] = relationship(
        back_populates="split_day",
        cascade="all, delete-orphan",
        order_by="SplitDayExercise.order",
    )


class SplitDayExercise(Base):
    __tablename__ = "split_day_exercises"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    split_day_id: Mapped[str] = mapped_column(String, ForeignKey("split_days.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id: Mapped[str] = mapped_column(String, ForeignKey("exercises.id"), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    target_sets: Mapped[int | None] = mapped_column(Integer)
    target_reps_min: Mapped[int | None] = mapped_column(Integer)
    target_reps_max: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(String)

    split_day: Mapped["SplitDay"] = relationship(back_populates="exercises")
    exercise: Mapped["Exercise"] = relationship()
