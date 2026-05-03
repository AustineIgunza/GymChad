"""database.py — SQLAlchemy async engine + session factory + safe migrations"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./gymchad.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "prepared_statement_cache_size": 0,
            "server_settings": {"jit": "off"},
            "timeout": 30,
            "ssl": "require",
        },
    )

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables (SQLite dev mode)."""
    async with engine.begin() as conn:
        import app.models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)


async def migrate_db():
    """
    Safely add new columns to existing tables.
    Uses IF NOT EXISTS (PostgreSQL) or try/except (SQLite).
    Safe to run on every startup — idempotent.
    """
    async with engine.begin() as conn:
        if IS_SQLITE:
            # SQLite: ADD COLUMN doesn't support IF NOT EXISTS — use try/except per column
            sqlite_alterations = [
                # workout_sets new columns
                "ALTER TABLE workout_sets ADD COLUMN set_type TEXT DEFAULT 'normal'",
                "ALTER TABLE workout_sets ADD COLUMN superset_group INTEGER",
                # splits new columns
                "ALTER TABLE splits ADD COLUMN is_template BOOLEAN DEFAULT 0",
                "ALTER TABLE splits ADD COLUMN shared_token TEXT",
                # exercises new columns
                "ALTER TABLE exercises ADD COLUMN secondary_muscles TEXT",
                "ALTER TABLE exercises ADD COLUMN instructions TEXT",
                "ALTER TABLE exercises ADD COLUMN difficulty TEXT",
                "ALTER TABLE exercises ADD COLUMN video_url TEXT",
                "ALTER TABLE exercises ADD COLUMN image_url TEXT",
            ]
            for sql in sqlite_alterations:
                try:
                    await conn.execute(text(sql))
                except Exception:
                    pass  # Column already exists — expected on subsequent startups
        else:
            # PostgreSQL supports ADD COLUMN IF NOT EXISTS
            pg_alterations = [
                "ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS set_type VARCHAR DEFAULT 'normal'",
                "ALTER TABLE workout_sets ADD COLUMN IF NOT EXISTS superset_group INTEGER",
                "ALTER TABLE splits ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE",
                "ALTER TABLE splits ADD COLUMN IF NOT EXISTS shared_token VARCHAR",
                "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles VARCHAR",
                "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instructions TEXT",
                "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty VARCHAR",
                "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url VARCHAR",
                "ALTER TABLE exercises ADD COLUMN IF NOT EXISTS image_url VARCHAR",
            ]
            for sql in pg_alterations:
                try:
                    await conn.execute(text(sql))
                except Exception:
                    pass
