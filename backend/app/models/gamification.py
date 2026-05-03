"""models/gamification.py — Streaks, achievements, challenges"""
import uuid
from datetime import datetime, date
from sqlalchemy import String, Integer, Float, Boolean, ForeignKey, DateTime, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserStreak(Base):
    __tablename__ = "user_streaks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    current_streak: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_workout_date: Mapped[date | None] = mapped_column(Date)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Achievement(Base):
    __tablename__ = "achievements"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    icon_name: Mapped[str] = mapped_column(String, default="trophy")
    xp_value: Mapped[int] = mapped_column(Integer, default=100)
    condition_type: Mapped[str] = mapped_column(String, nullable=False)  # streak|pr|volume|consistency|social


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_id: Mapped[str] = mapped_column(String, ForeignKey("achievements.id"), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    progress: Mapped[float] = mapped_column(Float, default=0.0)

    achievement: Mapped["Achievement"] = relationship()


class Challenge(Base):
    __tablename__ = "challenges"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    creator_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String, nullable=False)  # volume|consistency|pr|custom
    target_value: Mapped[float] = mapped_column(Float, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    participants: Mapped[list["ChallengeParticipant"]] = relationship(back_populates="challenge", cascade="all, delete-orphan")


class ChallengeParticipant(Base):
    __tablename__ = "challenge_participants"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id: Mapped[str] = mapped_column(String, ForeignKey("challenges.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    current_value: Mapped[float] = mapped_column(Float, default=0.0)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    rank: Mapped[int | None] = mapped_column(Integer)

    challenge: Mapped["Challenge"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()
