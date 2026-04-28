"""
routers/auth.py — Authentication routes

Supabase handles the actual login/signup flow on the frontend.
Our backend just needs to:
  1. Verify the Supabase JWT is valid
  2. Upsert (create or update) the user in our DB
  3. Calculate initial TDEE/macros if this is a new user
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.user import UserVerify, UserOnboarding, UserProfileUpdate, UserResponse
from app.services.nutrition_targets import calculate_bmr, calculate_tdee, get_calorie_target, get_macro_targets

router = APIRouter()


@router.post("/verify", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def verify_user(payload: UserVerify, db: AsyncSession = Depends(get_db)):
    """
    Called from the frontend immediately after Supabase login/signup.
    Creates the user record in our DB if they don't exist yet, or updates email if they do.

    This is an UPSERT (update or insert). The `merge()` approach handles both cases
    cleanly — no need for separate create vs update logic.
    """
    result = await db.execute(select(User).where(User.supabase_id == payload.supabase_id))
    user = result.scalar_one_or_none()

    if user is None:
        # New user — create record
        user = User(
            supabase_id=payload.supabase_id,
            email=payload.email,
            name=payload.name,
        )
        db.add(user)
    else:
        # Existing user — update email in case it changed
        user.email = payload.email
        if payload.name and not user.name:
            user.name = payload.name

    await db.commit()
    await db.refresh(user)
    return user


@router.put("/onboarding", response_model=UserResponse)
async def complete_onboarding(
    payload: UserOnboarding,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Called once during the onboarding flow after the user sets their profile.
    Calculates TDEE and macro targets automatically.
    """
    # Apply all profile fields
    for field, value in payload.model_dump().items():
        setattr(current_user, field, value)

    # Auto-calculate nutrition targets
    bmr = calculate_bmr(payload.weight_kg, payload.height_cm, payload.age, payload.sex.value)
    tdee = calculate_tdee(bmr, payload.activity_level.value)
    calorie_target = get_calorie_target(tdee, payload.goal.value)
    macros = get_macro_targets(calorie_target, payload.weight_kg)

    current_user.calorie_target = calorie_target
    current_user.protein_target = macros["protein_g"]
    current_user.carbs_target = macros["carbs_g"]
    current_user.fat_target = macros["fat_g"]

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update any subset of profile fields (PATCH semantics via PUT)."""
    # model_dump(exclude_none=True) only returns fields that were actually set
    update_data = payload.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    # Recalculate targets if body metrics or goal changed
    if any(k in update_data for k in ("weight_kg", "height_cm", "age", "sex", "activity_level", "goal")):
        w = current_user.weight_kg
        h = current_user.height_cm
        a = current_user.age
        s = current_user.sex.value if current_user.sex else "male"
        al = current_user.activity_level.value
        g = current_user.goal.value
        if all([w, h, a]):
            bmr = calculate_bmr(w, h, a, s)
            tdee = calculate_tdee(bmr, al)
            current_user.calorie_target = get_calorie_target(tdee, g)
            macros = get_macro_targets(current_user.calorie_target, w)
            current_user.protein_target = macros["protein_g"]
            current_user.carbs_target = macros["carbs_g"]
            current_user.fat_target = macros["fat_g"]

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the current authenticated user's profile."""
    return current_user
