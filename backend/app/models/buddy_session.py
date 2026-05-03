"""models/buddy_session.py — Gym buddy real-time session models"""
import uuid, random, string
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def _gen_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class BuddySession(Base):
    __tablename__ = "buddy_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False, default=_gen_code, index=True)
    host_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    guest_user_id: Mapped[str | None] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"))
    status: Mapped[str] = mapped_column(String, default="waiting")  # waiting|active|ended
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)

    sets: Mapped[list["BuddySet"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class BuddySet(Base):
    __tablename__ = "buddy_sets"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    buddy_session_id: Mapped[str] = mapped_column(String, ForeignKey("buddy_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_name: Mapped[str] = mapped_column(String, nullable=False)
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    rpe: Mapped[float | None] = mapped_column(Float)
    logged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    session: Mapped["BuddySession"] = relationship(back_populates="sets")
