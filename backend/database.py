"""
Database Module for GymChad
Handles Prisma ORM setup and database connections
"""

from prisma import Prisma
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

# Single instance of Prisma client
db = Prisma()

async def connect_database():
    """Connect to the database"""
    try:
        await db.connect()
        logger.info("Database connected successfully")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise

async def disconnect_database():
    """Disconnect from the database"""
    try:
        await db.disconnect()
        logger.info("Database disconnected")
    except Exception as e:
        logger.error(f"Failed to disconnect from database: {e}")

@asynccontextmanager
async def get_db():
    """Context manager for database transactions"""
    try:
        yield db
    except Exception as e:
        logger.error(f"Database error: {e}")
        raise
    finally:
        pass
