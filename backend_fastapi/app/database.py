"""
Database configuration and session management for FastAPI + SQLAlchemy

This module sets up the database connection pool and provides
a session dependency for dependency injection throughout the app.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from typing import Generator
import os

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

# Create the database engine only if DATABASE_URL is set
engine = None
if DATABASE_URL:
    try:
        engine = create_engine(
            DATABASE_URL,
            poolclass=NullPool if os.getenv("ENVIRONMENT") == "production" else None,
            echo=os.getenv("SQL_ECHO", "false").lower() == "true"
        )
    except Exception as e:
        print(f"Warning: Could not initialize database engine: {e}")
        engine = None

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency injection function for database sessions.
    
    Usage in route:
        @router.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    
    FastAPI automatically calls this function, yields the session,
    and closes it after the request completes (using finally).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
