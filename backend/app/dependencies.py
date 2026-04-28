"""
dependencies.py — FastAPI Dependency Injection

FastAPI's dependency injection is one of its killer features.
Define a function once, then inject it into any route with Depends().
FastAPI calls the dependency automatically before the route handler runs.

This file defines two core dependencies:
  1. get_db     — provides an async DB session for every request
  2. get_current_user — verifies the Supabase JWT and returns the logged-in User
"""

import os
import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User

# HTTPBearer extracts the "Bearer <token>" from the Authorization header automatically
security = HTTPBearer()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# ── Database session dependency ───────────────────────────────────────────────
async def get_db() -> AsyncSession:
    """
    `yield` makes this a context manager:
    - DB session is created before the route runs
    - `yield` hands the session to the route handler
    - After the response is sent (even on errors), the session closes automatically
    This ensures connections are never leaked.
    """
    async with AsyncSessionLocal() as session:
        yield session

# ── Auth dependency ───────────────────────────────────────────────────────────
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Any route that declares `current_user: User = Depends(get_current_user)` is
    automatically protected. FastAPI returns HTTP 401 if the token is missing or invalid.

    Flow:
      1. Extract JWT from Authorization header
      2. Verify it with Supabase's JWKS endpoint
      3. Look up the user in our own DB
      4. Return the User object to the route handler
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify the JWT by calling Supabase's /auth/v1/user endpoint.
        # This is more reliable than local JWKS verification and handles
        # token expiry, revocation, and algorithm differences automatically.
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {token}",
                    "apikey": SUPABASE_SERVICE_KEY,
                },
                timeout=10,
            )
        if resp.status_code != 200:
            raise credentials_exception
        supabase_user_id: str = resp.json().get("id")
        if not supabase_user_id:
            raise credentials_exception

    except HTTPException:
        raise
    except Exception:
        raise credentials_exception

    # Look up user in our DB using their Supabase UUID
    result = await db.execute(select(User).where(User.supabase_id == supabase_user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please call /auth/verify to register.",
        )

    return user


# Optional dependency — returns None if not authenticated (for public routes)
async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
