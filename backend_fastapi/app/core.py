"""
Core middleware and utilities for FastAPI application.

This includes:
- User context middleware
- Rate limiting
- Error handling
- Dependency injection
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from typing import Callable
import logging

logger = logging.getLogger(__name__)


class UserContextMiddleware:
    """
    Middleware to extract and validate user ID from request headers.
    
    Key Concept: Middleware in FastAPI runs for every request.
    This extracts the user ID from x-user-id header and validates it.
    """
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, request: Request, call_next: Callable):
        # Extract user ID from header
        user_id = request.headers.get("x-user-id", "demo-user")
        
        # Sanitize user ID (alphanumeric, _, - only, max 64 chars)
        import re
        clean_user_id = re.sub(r"[^a-zA-Z0-9_-]", "", user_id)[:64] or "demo-user"
        
        # Store in request state for access in routes
        request.state.user_id = clean_user_id
        
        # Process the request
        response = await call_next(request)
        return response


async def get_user_id_from_request(request: Request) -> str:
    """
    Dependency to extract user ID from request.
    
    Usage in route:
        @router.get("/profile")
        async def get_profile(user_id: str = Depends(get_user_id_from_request)):
            return {"user_id": user_id}
    """
    user_id = request.headers.get("x-user-id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing x-user-id header"
        )
    return user_id


def create_error_response(status_code: int, message: str) -> JSONResponse:
    """Create a standard error response"""
    return JSONResponse(
        status_code=status_code,
        content={"error": message}
    )


# Rate limiting helper (use with caution in production)
# For FastAPI, use slowapi: pip install slowapi
from datetime import datetime, timedelta
from collections import defaultdict

request_counts = defaultdict(list)

def check_rate_limit(user_id: str, max_requests: int = 150, window_seconds: int = 900) -> bool:
    """
    Simple in-memory rate limiter.
    
    In production, use Redis:
        from fastapi_limiter import FastAPILimiter
        from fastapi_limiter.util import get_remote_address
    """
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=window_seconds)
    
    # Clean old requests
    request_counts[user_id] = [
        req_time for req_time in request_counts[user_id]
        if req_time > window_start
    ]
    
    # Check limit
    if len(request_counts[user_id]) >= max_requests:
        return False
    
    # Add current request
    request_counts[user_id].append(now)
    return True
