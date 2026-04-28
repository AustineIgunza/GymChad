"""
alembic/env.py — Alembic migration environment

Configured for async SQLAlchemy (asyncpg driver).
Alembic normally uses sync connections, so we need asyncio.run() to bridge them.

To create a migration:
    alembic revision --autogenerate -m "description"

To apply migrations:
    alembic upgrade head
"""

import asyncio
import os
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

load_dotenv()

# Import all models so Alembic can detect them for autogenerate
from app.database import Base
import app.models  # noqa: F401 — triggers all model imports

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The metadata object tells Alembic about all our tables
target_metadata = Base.metadata

# Override the URL from environment (handles Railway's dynamic DATABASE_URL)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost/gymchad")
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL without a DB connection."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations using an async connection."""
    engine = create_async_engine(DATABASE_URL, poolclass=pool.NullPool)
    async with engine.begin() as conn:
        # run_sync bridges async context → sync Alembic API
        await conn.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
