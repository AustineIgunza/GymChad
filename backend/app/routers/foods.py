"""routers/foods.py — Open Food Facts search with Redis caching"""

import json
import os
from fastapi import APIRouter, Depends, Query
from app.dependencies import get_current_user
from app.models.user import User
from app.services.food_search import search_open_food_facts

router = APIRouter()

# Try to connect to Redis for caching. Falls back gracefully if unavailable.
try:
    import redis.asyncio as aioredis
    REDIS_URL = os.getenv("REDIS_URL", "")
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True) if REDIS_URL else None
except Exception:
    redis_client = None

CACHE_TTL = 3600  # 1 hour


@router.get("/search")
async def search_foods(
    q: str = Query(..., min_length=2, description="Search term"),
    current_user: User = Depends(get_current_user),
):
    """
    Search Open Food Facts for foods matching the query.
    Results are cached in Redis for 1 hour to avoid hammering the external API.

    Cache key format: food_search:{query_lowercase}
    """
    cache_key = f"food_search:{q.lower().strip()}"

    # Try cache first
    if redis_client:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception:
            pass  # Redis unavailable — continue without cache

    # Cache miss — call Open Food Facts
    results = await search_open_food_facts(q)

    # Store in cache
    if redis_client:
        try:
            await redis_client.setex(cache_key, CACHE_TTL, json.dumps(results))
        except Exception:
            pass

    return results
