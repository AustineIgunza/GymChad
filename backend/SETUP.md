# FastAPI Backend - Setup & Getting Started

Welcome! You're now learning FastAPI while building GymChad. This guide will walk you through everything.

## Quick Start

### 1. Python Environment Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list | grep fastapi
```

### 2. Environment Configuration

```bash
# Copy the example .env file
cp .env.example .env

# Edit .env with your configuration
# (You'll need a PostgreSQL database - see Database Setup below)
```

### 3. Run the Server

```bash
# Development mode with auto-reload
python main.py

# Or using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 3001

# Output should show:
# INFO:     Uvicorn running on http://0.0.0.0:3001
```

### 4. Test the API

**Health Check:**
```bash
curl http://localhost:3001/health
# Response: {"ok": true}
```

**Interactive Documentation:**
Open http://localhost:3001/docs in your browser to test all endpoints with Swagger UI.

---

## Architecture Overview

### Modern FastAPI Structure

The application is organized into logical sections within `main.py`:

```
main.py Structure:
├── Settings & Configuration      (Lines 1-50)
├── Pydantic Models               (Lines 51-200)
├── Dependency Injection          (Lines 201-220)
├── Helper Functions              (Lines 221-280)
├── Routes: Health Check          (Lines 281-290)
├── Routes: Authentication        (Lines 291-340)
├── Routes: Exercises             (Lines 341-370)
├── Routes: Splits                (Lines 371-450)
├── Routes: Workouts              (Lines 451-600)
├── Routes: Workout Sets          (Lines 601-670)
├── Routes: Nutrition             (Lines 671-800)
├── Routes: Food Search           (Lines 801-850)
├── Routes: Progress & Analytics  (Lines 851-950)
├── Routes: AI Coach              (Lines 951-1050)
├── Error Handlers                (Lines 1051-1080)
└── Startup/Shutdown              (Lines 1081-1100)
```

This monolithic structure is fine for learning. Later we'll refactor into:

```
backend/
├── main.py              # Application factory
├── database.py          # Database setup
├── settings.py          # Configuration
├── requirements.txt
└── src/
    ├── models/          # Pydantic models
    ├── services/        # Business logic
    ├── routes/          # API endpoints
    └── dependencies.py  # DI functions
```

### Key Files & Their Purpose

| File | Purpose | Status |
|------|---------|--------|
| `main.py` | FastAPI application, all routes | ✅ Complete |
| `database.py` | Prisma ORM connection | ✅ Created |
| `requirements.txt` | Python dependencies | ✅ Complete |
| `.env.example` | Configuration template | ✅ Updated |
| `FASTAPI_GUIDE.md` | Learning guide | ✅ Complete |

---

## Understanding the Code

### Example 1: Simple Route

```python
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True}
```

**Breakdown:**
- `@app.get()`: HTTP method and path
- `async def`: Async function for concurrency
- Return dict → automatically converted to JSON

### Example 2: Route with Validation

```python
@app.post("/api/v1/nutrition", status_code=status.HTTP_201_CREATED)
async def create_nutrition_log(
    payload: NutritionCreate,          # Request body with validation
    user_id: str = Depends(get_user_id) # Dependency injection
):
    """Create a nutrition log entry"""
    log_date = payload.date or datetime.now()
    return {
        "id": "nutrition_1",
        "userId": user_id,
        "date": log_date.isoformat(),
        **payload.dict()
    }
```

**Breakdown:**
1. `payload: NutritionCreate` - FastAPI validates against Pydantic model
2. `user_id = Depends(get_user_id)` - Calls dependency first, injects result
3. `status_code=201` - Sets HTTP response status
4. Returns dict → FastAPI converts to JSON with validation

### Example 3: Query Parameters

```python
@app.get("/api/v1/foods/search")
@limiter.limit("30/minute")  # Rate limiting decorator
async def search_foods(
    q: str = Query(..., min_length=1),  # Required parameter with validation
    user_id: str = Depends(get_user_id)
):
    """Search for foods"""
    results = await search_open_food_facts(q)
    return results
```

**Request examples:**
```bash
# Valid
GET /api/v1/foods/search?q=chicken

# Invalid (missing required parameter)
GET /api/v1/foods/search
# Response: 422 Unprocessable Entity
# {
#   "detail": [
#     {
#       "loc": ["query", "q"],
#       "msg": "field required",
#       "type": "value_error.missing"
#     }
#   ]
# }
```

### Example 4: Streaming Response (AI Coach)

```python
async def generate_coach_stream(user_id: str, message: str, history: list):
    """Stream tokens from Claude API"""
    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    with client.messages.stream(...) as stream:
        for text in stream.text_stream:
            # Yield Server-Sent Event format
            yield f"data: {json.dumps({'token': text})}\n\n"
    
    yield "event: done\ndata: {}\n\n"

@app.post("/api/v1/ai/coach")
async def ai_coach(request: AICoachRequest, user_id: str = Depends(get_user_id)):
    """Stream AI coaching response"""
    return StreamingResponse(
        generate_coach_stream(user_id, request.message, request.conversationHistory),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"}
    )
```

---

## FastAPI vs Express Comparison

Since you came from Express.js:

| Aspect | Express | FastAPI |
|--------|---------|---------|
| Type Safety | TypeScript (optional) | Python types (built-in) |
| Validation | Manual or libraries | Pydantic (automatic) |
| Async | Promises/async-await | async-await (native) |
| API Docs | Manual/Swagger | Auto-generated |
| Error Handling | Express Error middleware | Exception handlers |
| Dependency Injection | Manual | `Depends()` built-in |
| Performance | Fast | Equally fast |
| Learning Curve | Moderate | Slightly gentler |

### Equivalent Code: User Route

**Express:**
```javascript
app.get("/users/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
});
```

**FastAPI:**
```python
@app.get("/users/{user_id}")
async def get_user(user_id: str = Path(...)):
    user = await db.user.find_unique(where={"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found"
        )
    return user
```

**Key Differences:**
- FastAPI has error handling built into exceptions
- No manual type checking (Pydantic handles it)
- Path parameters automatically validated
- Response automatically converted to JSON

---

## Database Setup

### Option 1: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql

# Install PostgreSQL (Windows)
# Download from https://www.postgresql.org/download/windows/

# Start PostgreSQL service
pg_ctl start

# Create database
createdb gymchad

# Set connection string in .env
DATABASE_URL="postgresql://postgres:password@localhost:5432/gymchad"
```

### Option 2: Supabase (Cloud PostgreSQL)

1. Go to https://supabase.com
2. Create project
3. Get connection string from project settings
4. Add to .env:
```
DATABASE_URL="postgresql://postgres:[password]@[host]/postgres?sslmode=require"
```

### Option 3: Docker

```bash
docker run \
  --name gymchad-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=gymchad \
  -p 5432:5432 \
  -d postgres:15

# Connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/gymchad"
```

### Initialize Database

```bash
# Generate Prisma client
prisma generate

# Run migrations
prisma migrate dev --name init

# Seed with exercises
prisma db seed

# View data
prisma studio
```

---

## Testing Your API

### Using curl

```bash
# Health check
curl http://localhost:3001/health

# List exercises
curl -H "x-user-id: test_user" http://localhost:3001/api/v1/exercises

# Create workout
curl -X POST http://localhost:3001/api/v1/workouts \
  -H "x-user-id: test_user" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Chest Day",
    "date": "2024-04-27"
  }'
```

### Using Python

```python
import requests

# Create session with default header
session = requests.Session()
session.headers["x-user-id"] = "test_user"

# Health check
response = session.get("http://localhost:3001/health")
print(response.json())

# List exercises
response = session.get("http://localhost:3001/api/v1/exercises")
print(response.json())

# Create workout
response = session.post(
    "http://localhost:3001/api/v1/workouts",
    json={"label": "Chest Day", "date": "2024-04-27"}
)
print(response.status_code, response.json())
```

### Using FastAPI TestClient

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}

def test_create_workout():
    response = client.post(
        "/api/v1/workouts",
        json={"label": "Chest Day"},
        headers={"x-user-id": "test_user"}
    )
    assert response.status_code == 201

if __name__ == "__main__":
    test_health()
    test_create_workout()
    print("✅ All tests passed!")
```

---

## Common Patterns & Best Practices

### Pattern 1: Dependency Injection for Database

```python
from typing import AsyncGenerator

async def get_db() -> AsyncGenerator:
    """Provide database session"""
    try:
        yield db
    finally:
        pass

@app.get("/api/v1/workouts")
async def list_workouts(
    db = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    workouts = await db.workout.find_many(where={"userId": user_id})
    return workouts
```

### Pattern 2: Custom Exception Handler

```python
class WorkoutNotFoundError(Exception):
    pass

@app.exception_handler(WorkoutNotFoundError)
async def workout_not_found_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": "Workout not found"}
    )

@app.get("/api/v1/workouts/{id}")
async def get_workout(id: str):
    workout = await db.workout.find_unique(where={"id": id})
    if not workout:
        raise WorkoutNotFoundError()
    return workout
```

### Pattern 3: Background Tasks

```python
from fastapi import BackgroundTasks

@app.post("/api/v1/workouts")
async def create_workout(
    payload: WorkoutCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_user_id)
):
    workout = await db.workout.create(data={...})
    
    # Send email notification in background
    background_tasks.add_task(send_email, user_id, workout.id)
    
    return workout
```

---

## Debugging Tips

### 1. Enable Debug Logging

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.get("/debug")
async def debug_route():
    logger.debug("Debug message")
    logger.info("Info message")
    logger.error("Error message")
    return {"status": "ok"}
```

### 2. Print Request/Response

```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response
```

### 3. Interactive Debugging

```bash
# Install debugger
pip install pdb-plus

# Add breakpoint in code
@app.get("/debug")
async def debug():
    import pdb; pdb.set_trace()  # Will pause here
    return {"ok": True}
```

---

## Next: Database Integration

Once you have PostgreSQL running:

1. Install Prisma Python:
   ```bash
   pip install prisma
   ```

2. Generate Prisma client:
   ```bash
   prisma generate
   ```

3. Update main.py to import and use Prisma:
   ```python
   from database import db, connect_database, disconnect_database
   
   @app.on_event("startup")
   async def startup():
       await connect_database()
   
   @app.on_event("shutdown")
   async def shutdown():
       await disconnect_database()
   ```

4. Replace mock returns with real database queries

See `FASTAPI_GUIDE.md` for detailed examples!

---

## Troubleshooting

**Problem**: `ModuleNotFoundError: No module named 'fastapi'`
**Solution**: Activate virtual environment and run `pip install -r requirements.txt`

**Problem**: `ADDRESS ALREADY IN USE: 0.0.0.0:3001`
**Solution**: Change port or kill existing process:
```bash
# Find process on port 3001
lsof -i :3001
# Kill it
kill -9 <PID>
```

**Problem**: Database connection error
**Solution**: Check .env DATABASE_URL is correct:
```bash
psql -c "SELECT 1;" --connection-string="$DATABASE_URL"
```

**Problem**: CORS error in frontend
**Solution**: Check FRONTEND_URL in .env matches your frontend URL

---

## You're Ready! 🚀

You now have a working FastAPI backend! Next steps:

1. ✅ Understand the code structure
2. ✅ Run health check
3. ✅ Explore /docs interactive API docs
4. ⬜ Set up PostgreSQL database
5. ⬜ Connect Prisma ORM
6. ⬜ Implement real database queries
7. ⬜ Test with frontend

Keep learning, build with confidence!
