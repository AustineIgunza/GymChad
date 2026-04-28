"""
database.py — SQLAlchemy async engine + session factory

Supports two modes:
  - Local dev (default): SQLite via aiosqlite — zero setup, just works
  - Production: PostgreSQL via asyncpg (set DATABASE_URL in .env)

SQLAlchemy 2.0 introduced `Mapped` / `mapped_column` — the new type-safe ORM style.
`AsyncSession` means every DB query is awaited, so FastAPI can handle other requests
while waiting for the database — no thread blocking.
"""

import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

# Default to SQLite for local dev — no Postgres needed
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite+aiosqlite:///./gymchad.db"
)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

if IS_SQLITE:
    # SQLite doesn't support connection pools
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        connect_args={"check_same_thread": False},
    )
else:
    # Supabase uses pgbouncer (connection pooler) which requires:
    # - prepared_statement_cache_size=0 (pgbouncer can't use prepared statements)
    # - statement_cache_size=0 (asyncpg dialect name for the same setting)
    # - ssl='require' in connect_args (more reliable than the URL query param on Windows)
    engine = create_async_engine(
        DATABASE_URL,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "prepared_statement_cache_size": 0,  # Required for pgbouncer/Supabase pooler
            "server_settings": {"jit": "off"},   # Prevents timeout on first query
            "timeout": 30,
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
    """Create all tables on startup (used in dev with SQLite)."""
    async with engine.begin() as conn:
        # Import all models so Base knows about them
        import app.models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
