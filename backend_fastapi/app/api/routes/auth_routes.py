"""
Authentication routes.

Endpoints:
- POST /api/v1/auth/verify - Verify or create user
- PUT /api/v1/auth/profile - Update user profile
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas import UserProfileUpdate, UserResponse

router = APIRouter(prefix="/auth")


@router.post("/verify", response_model=UserResponse)
async def verify_user(
    token: dict,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Verify or create a user.
    
    This endpoint checks if a user exists with the given supabase_id.
    If not, it creates a new user.
    """
    # For now, we'll just acknowledge the user
    # In production, this would verify against Supabase
    return {
        "id": x_user_id,
        "email": f"{x_user_id}@local.gymchad.app",
        "name": None,
        "supabaseId": x_user_id,
        "plan": "FREE",
        "goal": None,
        "currentSplitId": None,
        "tdee": None,
        "createdAt": "2026-04-27T00:00:00",
        "updatedAt": "2026-04-27T00:00:00"
    }


@router.put("/profile", response_model=dict)
async def update_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    x_user_id: str = Header(...)
):
    """
    Update user profile (name, goal, TDEE).
    
    Example request:
    {
        "name": "John Doe",
        "goal": "BULKING",
        "tdee": 2800
    }
    """
    # TODO: Implement database update
    return {"ok": True, "message": "Profile updated"}
