# FastAPI Learning Guide for GymChad

A comprehensive guide to understanding and working with FastAPI, built while developing the GymChad backend.

## Table of Contents
1. [FastAPI Fundamentals](#fastapi-fundamentals)
2. [Project Structure](#project-structure)
3. [Key Concepts Explained](#key-concepts-explained)
4. [Common Patterns](#common-patterns)
5. [Next Steps & Database Integration](#next-steps--database-integration)

---

## FastAPI Fundamentals

### What is FastAPI?

FastAPI is a modern, fast web framework for building APIs with Python. Key features:
- **Fast**: Equal to NodeJS and Go in performance
- **Type hints**: Uses Python 3.6+ type annotations for validation
- **Async**: Built-in support for async/await
- **Auto docs**: Automatic interactive API documentation (Swagger UI)
- **Built on standards**: OpenAPI and JSON Schema

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running the Server

```bash
# Development with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 3001
```

The API will be available at: `http://localhost:3001`
- **Interactive Docs**: http://localhost:3001/docs (Swagger UI)
- **Alternative Docs**: http://localhost:3001/redoc (ReDoc)
- **OpenAPI Schema**: http://localhost:3001/openapi.json

---

## Project Structure

```
backend/
├── main.py                 # Main application file
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables
├── .env.example           # Environment template
└── src/
    ├── models.py          # (To create) Pydantic models
    ├── database.py        # (To create) Database configuration
    ├── services/          # (To create) Business logic
    │   ├── workout.py
    │   ├── nutrition.py
    │   └── ai_coach.py
    └── routes/            # (To create) API route handlers
        ├── auth.py
        ├── exercises.py
        ├── workouts.py
        └── nutrition.py
```

---

## Key Concepts Explained

### 1. Application Setup

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="GymChad API",
    description="AI-powered gym tracking",
    version="1.0.0"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Key Points:**
- `FastAPI()` creates your application instance
- Middleware wraps requests/responses for cross-cutting concerns (CORS, auth, logging)
- CORS (Cross-Origin Resource Sharing) allows frontend to make requests

### 2. Pydantic Models (Data Validation)

Pydantic provides type-safe data validation using Python type hints:

```python
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime

class WorkoutSetCreate(BaseModel):
    """Define request/response shape with automatic validation"""
    exerciseId: str
    setNumber: int = Field(..., gt=0)  # gt=0 means "greater than 0"
    reps: int = Field(..., gt=0)
    weightKg: float = Field(..., ge=0)  # ge=0 means "greater than or equal to 0"
    rpe: Optional[int] = Field(None, ge=1, le=10)  # Optional, 1-10 range
    isWarmup: bool = False  # Default value
    
    # Custom validation
    @validator('setNumber')
    def validate_set_number(cls, v):
        if v > 100:
            raise ValueError('Too many sets!')
        return v

class WorkoutSetResponse(BaseModel):
    """Response model with database fields"""
    id: str
    workoutId: str
    exerciseId: str
    setNumber: int
    reps: int
    weightKg: float
    rpe: Optional[int] = None
    isWarmup: bool
    createdAt: datetime
```

**Validation happens automatically:**
```json
// Invalid request (missing required field)
POST /api/v1/workouts/123/sets
{
    "setNumber": 1,
    "reps": 10,
    // Missing weightKg - FastAPI rejects automatically!
}

// FastAPI Response:
{
    "detail": [
        {
            "loc": ["body", "weightKg"],
            "msg": "field required",
            "type": "value_error.missing"
        }
    ]
}
```

### 3. Route Definition

Routes are defined using decorators:

```python
from fastapi import FastAPI, Query, Path, HTTPException, status

@app.get("/api/v1/exercises")
async def list_exercises(
    muscle_group: Optional[str] = Query(None),  # Query parameter
    limit: int = Query(20, ge=1, le=100)        # With validation
):
    """
    List exercises.
    
    - **muscle_group**: Filter by muscle group (optional)
    - **limit**: Number of results (1-100, default 20)
    """
    # This docstring becomes part of the API documentation!
    return exercises

@app.post("/api/v1/workouts", status_code=status.HTTP_201_CREATED)
async def create_workout(payload: WorkoutCreate):
    """Create a new workout"""
    return {"id": "new_id", ...payload.dict()}

@app.put("/api/v1/workouts/{workout_id}")
async def update_workout(
    workout_id: str = Path(...),  # Path parameter
    payload: WorkoutUpdate = None  # Body parameter
):
    """Update an existing workout"""
    return {"ok": True}

@app.delete("/api/v1/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(workout_id: str):
    """Delete a workout"""
    return None  # 204 No Content response
```

**Parameter Types:**
- `Path(...)`: URL path parameters
- `Query(...)`: URL query parameters (e.g., ?page=1&limit=20)
- `Body(...)`: JSON request body
- Headers, Cookies, etc.

### 4. Dependency Injection

Dependencies are reusable functions that can be injected into route handlers:

```python
from fastapi import Depends, Header, HTTPException, status

async def get_user_id(x_user_id: str = Header(...)) -> str:
    """
    Extract user ID from request header.
    Automatically validates presence.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing user ID"
        )
    return x_user_id.strip()

# Use the dependency
@app.get("/api/v1/workouts")
async def list_workouts(
    user_id: str = Depends(get_user_id)  # Injected automatically
):
    """The get_user_id function runs first, then passes result to route"""
    return {"user_id": user_id}
```

**Benefits:**
- DRY principle: Reuse validation logic
- Testability: Mock dependencies easily
- Security: Centralized auth/validation
- Database sessions: Share connection pools

### 5. Async/Await

FastAPI is built on async Python for concurrency:

```python
import asyncio
import httpx

@app.get("/api/v1/foods/search")
async def search_foods(q: str):
    """
    Async allows handling many requests with fewer threads.
    Use 'await' for I/O operations (database, HTTP, files).
    """
    # Async HTTP request (non-blocking)
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/foods", params={"q": q})
        return response.json()

@app.post("/api/v1/workouts")
async def create_workout(payload: WorkoutCreate):
    """Async functions serve requests concurrently"""
    # Multiple requests can be processed simultaneously
    workout = await db.workouts.create(payload.dict())
    return workout
```

### 6. Response Models & Status Codes

```python
from typing import List
from fastapi import status

class ExerciseResponse(BaseModel):
    id: str
    name: str
    muscleGroup: str

# Explicit response model
@app.get(
    "/api/v1/exercises",
    response_model=List[ExerciseResponse],
    status_code=status.HTTP_200_OK
)
async def list_exercises():
    """Response is automatically validated against ExerciseResponse"""
    exercises = await db.exercises.find_many()
    return exercises  # FastAPI validates output!

# Status codes
@app.post("/api/v1/workouts", status_code=status.HTTP_201_CREATED)
async def create_workout(...): ...

@app.delete("/api/v1/workouts/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(...): return None
```

### 7. Error Handling

```python
from fastapi import HTTPException, status

@app.get("/api/v1/workouts/{workout_id}")
async def get_workout(workout_id: str, user_id: str = Depends(get_user_id)):
    workout = await db.workouts.find_first({"id": workout_id, "userId": user_id})
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )
    
    return workout

# This returns:
# {
#     "detail": "Workout not found"
# }
```

### 8. Middleware & Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/v1/exercises")
@limiter.limit("30/minute")  # Max 30 requests per minute
async def list_exercises(request: Request):
    return exercises
```

### 9. Streaming Responses (for AI Coach)

```python
from fastapi.responses import StreamingResponse
import json

async def generate_stream():
    """Generator yields data chunks"""
    for i in range(5):
        await asyncio.sleep(1)  # Simulate processing
        yield f"data: {json.dumps({'chunk': i})}\n\n"

@app.post("/api/v1/ai/coach")
async def ai_coach(request: AICoachRequest):
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream"
    )
```

---

## Common Patterns

### Pattern 1: Pagination

```python
class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

@app.get("/api/v1/workouts")
async def list_workouts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id)
):
    skip = (page - 1) * limit
    items = await db.workouts.find_many(
        where={"userId": user_id},
        skip=skip,
        take=limit,
        order_by={"createdAt": "desc"}
    )
    total = await db.workouts.count(where={"userId": user_id})
    
    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total,
        "pages": (total + limit - 1) // limit
    }
```

### Pattern 2: Nested Routes with Resource IDs

```python
# GET /api/v1/workouts/123/sets
@app.get("/api/v1/workouts/{workout_id}/sets")
async def list_sets(
    workout_id: str = Path(...),
    user_id: str = Depends(get_user_id)
):
    sets = await db.sets.find_many(
        where={"workoutId": workout_id, "workout.userId": user_id}
    )
    return sets

# POST /api/v1/workouts/123/sets
@app.post("/api/v1/workouts/{workout_id}/sets")
async def create_set(
    workout_id: str = Path(...),
    payload: WorkoutSetCreate = None,
    user_id: str = Depends(get_user_id)
):
    set = await db.sets.create({
        **payload.dict(),
        "workoutId": workout_id
    })
    return set
```

### Pattern 3: Optional Filtering

```python
@app.get("/api/v1/exercises")
async def list_exercises(
    muscle_group: Optional[str] = Query(None),
    equipment: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id)
):
    where = {"OR": [{"isCustom": False}, {"userId": user_id}]}
    
    if muscle_group:
        where["muscleGroup"] = muscle_group
    if equipment:
        where["equipment"] = equipment
    
    exercises = await db.exercises.find_many(where=where)
    return exercises
```

### Pattern 4: Caching with TTL

```python
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

class Cache:
    def __init__(self, ttl: int = 3600):
        self._cache: Dict[str, tuple] = {}
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[Any]:
        if key in self._cache:
            value, timestamp = self._cache[key]
            if (datetime.now() - timestamp).seconds < self.ttl:
                return value
            del self._cache[key]
        return None
    
    def set(self, key: str, value: Any):
        self._cache[key] = (value, datetime.now())

cache = Cache(ttl=3600)

@app.get("/api/v1/foods/search")
async def search_foods(q: str):
    cache_key = f"food:{q.lower()}"
    
    # Check cache first
    cached = cache.get(cache_key)
    if cached:
        return cached
    
    # Fetch from API
    results = await search_open_food_facts(q)
    cache.set(cache_key, results)
    return results
```

---

## Next Steps & Database Integration

### Current Status
The FastAPI backend is now set up with:
✅ All route handlers
✅ Pydantic models for validation
✅ Dependency injection for user auth
✅ Rate limiting
✅ CORS configuration
✅ Streaming responses for AI Coach
✅ Error handling

### TODO: Database Integration

The routes currently return mock data. To connect to the database:

#### Step 1: Install Prisma Python Client

```bash
pip install prisma
```

#### Step 2: Create database module

```python
# backend/src/database.py
from prisma import Prisma

db = Prisma()

async def connect():
    await db.connect()

async def disconnect():
    await db.disconnect()
```

#### Step 3: Update main.py to connect

```python
from src.database import db

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()
```

#### Step 4: Replace mock queries with real ones

```python
# Before (mock)
@app.get("/api/v1/workouts")
async def list_workouts(user_id: str = Depends(get_user_id)):
    return []

# After (with Prisma)
@app.get("/api/v1/workouts")
async def list_workouts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id)
):
    skip = (page - 1) * limit
    items = await db.workout.find_many(
        where={"userId": user_id, "deletedAt": None},
        include={"sets": True},
        order_by={"date": "desc"},
        skip=skip,
        take=limit
    )
    total = await db.workout.count(
        where={"userId": user_id, "deletedAt": None}
    )
    return {
        "items": items,
        "page": page,
        "limit": limit,
        "total": total
    }
```

### Benefits of This Architecture

1. **Learning Path**: Build understanding gradually
2. **Testing**: Can test routes with mock data before database
3. **Documentation**: See what data each endpoint expects
4. **Modularity**: Easy to refactor later

---

## Running Tests

```bash
# Install pytest
pip install pytest pytest-asyncio httpx

# Create test file
cat > test_api.py << 'EOF'
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

def test_list_exercises():
    response = client.get("/api/v1/exercises", headers={"x-user-id": "test_user"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)
EOF

# Run tests
pytest test_api.py -v
```

---

## Useful Resources

- **FastAPI Documentation**: https://fastapi.tiangolo.com
- **Pydantic Documentation**: https://docs.pydantic.dev
- **Async Python**: https://docs.python.org/3/library/asyncio.html
- **Uvicorn Documentation**: https://www.uvicorn.org
- **Prisma Python**: https://prisma-client-py.readthedocs.io

---

## Summary

You now have a FastAPI backend with:
- ✅ Modern async Python framework
- ✅ Type-safe data validation
- ✅ All 30+ endpoints implemented
- ✅ Rate limiting and CORS
- ✅ Streaming responses
- ✅ Ready for database integration

Next: Connect to PostgreSQL via Prisma and implement the business logic!
