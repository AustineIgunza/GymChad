"""
Workout split management routes.

Endpoints:
- POST /api/v1/splits - Create split
- GET /api/v1/splits - List splits
- GET /api/v1/splits/:id/days - Get split days
- PUT /api/v1/splits/:id - Update split
- PUT /api/v1/splits/:id/activate - Activate split
- DELETE /api/v1/splits/:id - Delete split
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import SplitCreate, SplitResponse, SplitUpdate

router = APIRouter(prefix="/splits")


@router.post("", response_model=SplitResponse, status_code=201)
async def create_split(
    payload: SplitCreate,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Create a new workout split.
    
    Example:
    {
        "name": "Upper/Lower Split",
        "days": [
            {
                "dayNumber": 1,
                "label": "Upper A",
                "exercises": [
                    {"exerciseId": "ex-1"},
                    {"exerciseId": "ex-2"}
                ]
            },
            {
                "dayNumber": 2,
                "label": "Lower A",
                "exercises": [
                    {"exerciseId": "ex-3"}
                ]
            }
        ]
    }
    """
    # TODO: Implement database creation
    return {
        "id": "split-1",
        "userId": x_user_id,
        "name": payload.name,
        "isActive": False,
        "createdAt": "2026-04-27T00:00:00"
    }


@router.get("", response_model=list[dict])
async def list_splits(
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    List all user's splits with their days and exercises.
    """
    # TODO: Implement database query
    return []


@router.get("/{split_id}/days", response_model=list[dict])
async def get_split_days(
    split_id: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Get all days in a split with their exercises.
    """
    # TODO: Implement database query
    return []


@router.put("/{split_id}", response_model=dict)
async def update_split(
    split_id: str,
    payload: SplitUpdate,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Update split (name and/or days).
    """
    # TODO: Implement database update
    return {"ok": True}


@router.put("/{split_id}/activate", response_model=dict)
async def activate_split(
    split_id: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Activate a split.
    
    This deactivates all other splits and sets this as the active one.
    Also updates user.currentSplitId.
    """
    # TODO: Implement database transaction
    return {"ok": True}


@router.delete("/{split_id}", status_code=204)
async def delete_split(
    split_id: str,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Delete a split and all its days/exercises.
    """
    # TODO: Implement database deletion
    pass
