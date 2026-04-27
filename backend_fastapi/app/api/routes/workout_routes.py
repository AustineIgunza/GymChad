"""
Workout routes.

Endpoints:
- POST /api/v1/workouts - Create workout
- GET /api/v1/workouts - List workouts (paginated)
- GET /api/v1/workouts/today - Get today's workout
- GET /api/v1/workouts/:id - Get specific workout
- PUT /api/v1/workouts/:id - Update workout
- DELETE /api/v1/workouts/:id - Delete workout
- POST /api/v1/workouts/:id/sets - Add set to workout
- PUT /api/v1/workouts/:id/sets/:setId - Update set
- DELETE /api/v1/workouts/:id/sets/:setId - Delete set
"""

from fastapi import APIRouter, Depends, Header, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import (
    WorkoutCreate, WorkoutResponse, WorkoutSetCreate, 
    WorkoutSetResponse, WorkoutUpdate
)
from datetime import datetime

router = APIRouter(prefix="/workouts")


@router.post("", response_model=WorkoutResponse, status_code=201)
async def create_workout(
    payload: WorkoutCreate,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Create a new workout session.
    
    Example request:
    {
        "label": "Chest Day",
        "splitDayId": "split-day-123"
    }
    """
    # TODO: Implement database creation
    return {
        "id": "workout-1",
        "userId": x_user_id,
        "label": payload.label,
        "date": payload.date or datetime.now(),
        "notes": None,
        "durationMin": None,
        "deletedAt": None,
        "sets": []
    }


@router.get("", response_model=dict)
async def list_workouts(
    db: Session = Depends(get_db),
    x_user_id: str = Header(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    splitDayId: str = Query(None)
):
    """
    List user's workouts with pagination.
    
    Query parameters:
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    - splitDayId: Optional filter by split day
    
    Returns:
    {
        "items": [...],
        "page": 1,
        "limit": 20,
        "total": 45
    }
    """
    # TODO: Implement database query
    return {
        "items": [],
        "page": page,
        "limit": limit,
        "total": 0
    }


@router.get("/today", response_model=WorkoutResponse | None)
async def get_today_workout(
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Get today's workout session.
    
    Returns the latest workout that started today, or null if none.
    """
    # TODO: Implement database query
    return None


@router.get("/{workout_id}", response_model=WorkoutResponse)
async def get_workout(
    workout_id: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Get a specific workout with all its sets.
    """
    # TODO: Implement database query
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Workout not found"
    )


@router.put("/{workout_id}", response_model=dict)
async def update_workout(
    workout_id: str,
    payload: WorkoutUpdate,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Update workout details (notes, duration).
    """
    # TODO: Implement database update
    return {"ok": True}


@router.delete("/{workout_id}", status_code=204)
async def delete_workout(
    workout_id: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Soft delete a workout (sets deletedAt timestamp).
    """
    # TODO: Implement soft delete
    pass


@router.post("/{workout_id}/sets", response_model=WorkoutSetResponse, status_code=201)
async def add_set(
    workout_id: str,
    payload: WorkoutSetCreate,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Add a set to a workout.
    
    Example:
    {
        "exerciseId": "exercise-123",
        "setNumber": 1,
        "reps": 10,
        "weightKg": 80,
        "rpe": 8,
        "isWarmup": false
    }
    """
    # TODO: Implement database creation
    return {
        "id": "set-1",
        "workoutId": workout_id,
        "exerciseId": payload.exerciseId,
        "setNumber": payload.setNumber,
        "reps": payload.reps,
        "weightKg": payload.weightKg,
        "rpe": payload.rpe,
        "isWarmup": payload.isWarmup
    }


@router.put("/{workout_id}/sets/{set_id}", response_model=dict)
async def update_set(
    workout_id: str,
    set_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Update a set in a workout.
    """
    # TODO: Implement database update
    return {"ok": True}


@router.delete("/{workout_id}/sets/{set_id}", status_code=204)
async def delete_set(
    workout_id: str,
    set_id: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Delete a set from a workout.
    """
    # TODO: Implement database deletion
    pass
