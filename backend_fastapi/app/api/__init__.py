"""
API route definitions.

Each router is a collection of related endpoints.
Routers are then included in the main app.
"""

from fastapi import APIRouter

from .routes.auth_routes import router as auth_router
from .routes.workout_routes import router as workout_router
from .routes.nutrition_routes import router as nutrition_router
from .routes.progress_routes import router as progress_router
from .routes.coach_routes import router as coach_router
from .routes.split_routes import router as split_router

# Create the v1 API prefix
api_router = APIRouter(prefix="/api/v1")

# Include all route groups
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(workout_router, tags=["workouts"])
api_router.include_router(nutrition_router, tags=["nutrition"])
api_router.include_router(progress_router, tags=["progress"])
api_router.include_router(coach_router, tags=["coach"])
api_router.include_router(split_router, tags=["splits"])

__all__ = ["api_router"]
