# FastAPI Backend Quick Reference

A cheat sheet for working with the FastAPI GymChad backend.

## 1️⃣ Installation & Setup

```bash
# Navigate to backend
cd backend

# Create Python virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env with your PostgreSQL connection string
```

## 2️⃣ Run the Server

```bash
# Auto-reload development mode
python main.py

# Or directly with uvicorn
uvicorn main:app --reload --port 3001
```

**Access:**
- 🌐 API: http://localhost:3001
- 📚 API Docs (Swagger): http://localhost:3001/docs
- 📖 Alternative Docs (ReDoc): http://localhost:3001/redoc
- ✅ Health Check: http://localhost:3001/health

## 3️⃣ Key Files

| File | Purpose |
|------|---------|
| `main.py` | All FastAPI routes (1000+ lines) |
| `database.py` | Prisma ORM setup |
| `requirements.txt` | Python dependencies |
| `FASTAPI_GUIDE.md` | Detailed learning guide |
| `SETUP.md` | Complete setup instructions |

## 4️⃣ API Endpoints Reference

### Authentication
```
POST   /api/v1/auth/verify       - Verify user token
PUT    /api/v1/auth/profile      - Update profile
```

### Exercises
```
GET    /api/v1/exercises         - List exercises (with filters)
```

### Splits (Workout Programs)
```
GET    /api/v1/splits            - List user's splits
POST   /api/v1/splits            - Create new split
PUT    /api/v1/splits/{id}       - Update split
PUT    /api/v1/splits/{id}/activate - Activate split
DELETE /api/v1/splits/{id}       - Delete split
GET    /api/v1/splits/{id}/days  - Get split days with exercises
```

### Workouts
```
GET    /api/v1/workouts          - List workouts (paginated)
GET    /api/v1/workouts/today    - Get today's workout
GET    /api/v1/workouts/{id}     - Get specific workout
POST   /api/v1/workouts          - Create workout
PUT    /api/v1/workouts/{id}     - Update workout notes/duration
DELETE /api/v1/workouts/{id}     - Delete workout (soft delete)
```

### Workout Sets
```
POST   /api/v1/workouts/{id}/sets       - Add set to workout
PUT    /api/v1/workouts/{id}/sets/{setId} - Update set
DELETE /api/v1/workouts/{id}/sets/{setId} - Delete set
GET    /api/v1/workouts/history/{exerciseId} - Exercise history
GET    /api/v1/workouts/recommendations - Progressive overload tips
```

### Nutrition
```
GET    /api/v1/nutrition         - Get daily nutrition logs
POST   /api/v1/nutrition         - Log food entry
PUT    /api/v1/nutrition/{id}    - Update nutrition entry
DELETE /api/v1/nutrition/{id}    - Delete nutrition entry
GET    /api/v1/nutrition/summary - Weekly/monthly summary
```

### Food Search
```
GET    /api/v1/foods/search      - Search Open Food Facts
GET    /api/v1/foods/custom      - User's custom foods
POST   /api/v1/foods/custom      - Create custom food
DELETE /api/v1/foods/custom/{id} - Delete custom food
```

### Progress & Analytics
```
GET    /api/v1/progress/volume   - Training volume over time
GET    /api/v1/progress/strength - 1RM progression
GET    /api/v1/progress/bodyweight - Bodyweight tracking
GET    /api/v1/progress/calories  - Daily calories vs target
GET    /api/v1/progress/macros    - Macro averages
```

### AI Coach
```
POST   /api/v1/ai/coach          - Stream AI coaching response (SSE)
```

## 5️⃣ FastAPI Core Concepts

### Pydantic Models (Validation)

```python
from pydantic import BaseModel, Field

class WorkoutCreate(BaseModel):
    label: str                      # Required string
    date: Optional[datetime] = None # Optional datetime
    splitDayId: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "label": "Chest Day",
                "date": "2024-04-27T10:00:00"
            }
        }
```

### Route Definition

```python
@app.post("/api/v1/workouts", status_code=status.HTTP_201_CREATED)
async def create_workout(
    payload: WorkoutCreate,           # Body parameter
    user_id: str = Depends(get_user_id)  # Dependency
):
    """Create a new workout"""
    return {"id": "new_id", **payload.dict()}
```

### Dependency Injection

```python
async def get_user_id(x_user_id: str = Header(...)) -> str:
    """Extract user ID from header"""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing user ID")
    return x_user_id

# Use in route:
@app.get("/api/v1/workouts")
async def list_workouts(user_id: str = Depends(get_user_id)):
    # get_user_id runs first, passes result to route
    return await db.workout.find_many(where={"userId": user_id})
```

### Query Parameters

```python
@app.get("/api/v1/exercises")
async def list_exercises(
    muscle_group: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100)
):
    # Access: GET /api/v1/exercises?muscle_group=CHEST&limit=50
    ...
```

### Streaming Responses (SSE)

```python
from fastapi.responses import StreamingResponse

async def generate_stream():
    for i in range(5):
        yield f"data: {json.dumps({'chunk': i})}\n\n"

@app.get("/stream")
async def stream_endpoint():
    return StreamingResponse(generate_stream(), media_type="text/event-stream")
```

## 6️⃣ Testing

### With curl

```bash
# Health check
curl http://localhost:3001/health

# Create workout
curl -X POST http://localhost:3001/api/v1/workouts \
  -H "x-user-id: test_user" \
  -H "Content-Type: application/json" \
  -d '{"label": "Chest Day"}'
```

### With Python

```python
import requests

session = requests.Session()
session.headers["x-user-id"] = "test_user"

# List workouts
response = session.get("http://localhost:3001/api/v1/workouts")
workouts = response.json()
print(workouts)
```

### With pytest

```bash
pip install pytest pytest-asyncio

# Create test_api.py with tests
# Run tests
pytest test_api.py -v
```

## 7️⃣ Common Tasks

### Add a New Endpoint

```python
@app.get("/api/v1/my-endpoint")
async def my_endpoint(user_id: str = Depends(get_user_id)):
    """My new endpoint"""
    return {"message": "Hello!"}
```

### Use Query Parameters

```python
@app.get("/api/v1/workouts")
async def list_workouts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id)
):
    skip = (page - 1) * limit
    items = await db.workout.find_many(..., skip=skip, take=limit)
    return {"items": items, "page": page, "limit": limit}
```

### Handle Errors

```python
@app.get("/api/v1/workouts/{id}")
async def get_workout(id: str):
    workout = await db.workout.find_unique(where={"id": id})
    
    if not workout:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )
    
    return workout
```

## 8️⃣ Debugging

### Log Information

```python
import logging
logger = logging.getLogger(__name__)

@app.get("/debug")
async def debug():
    logger.info("This is info")
    logger.error("This is error")
    return {"ok": True}
```

### Check Status in Docs

Open http://localhost:3001/docs and try endpoints interactively

### Print Request Details

```python
@app.middleware("http")
async def log_request(request, call_next):
    print(f"{request.method} {request.url}")
    response = await call_next(request)
    return response
```

## 9️⃣ Performance & Production

### Rate Limiting

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/v1/exercises")
@limiter.limit("30/minute")
async def list_exercises(...):
    ...
```

### Async Best Practices

```python
# ✅ Good: Async all I/O
@app.get("/workouts")
async def list_workouts():
    # Database call is async
    items = await db.workout.find_many()
    return items

# ❌ Bad: Blocking I/O
@app.get("/workouts")
async def list_workouts():
    # This blocks the entire event loop!
    time.sleep(5)
    return []
```

## 🔟 Next Steps

1. ✅ **Set up environment** - Run server, test health check
2. ✅ **Explore API docs** - Open /docs and try endpoints
3. ⬜ **Set up PostgreSQL** - Create database, get connection string
4. ⬜ **Initialize Prisma** - Run migrations, seed exercises
5. ⬜ **Connect database** - Replace mock queries with real ones
6. ⬜ **Test with frontend** - Run frontend, test API integration
7. ⬜ **Deploy** - Use Railway for backend hosting

## 📚 Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Pydantic**: https://docs.pydantic.dev
- **Prisma Python**: https://prisma-client-py.readthedocs.io
- **Async Python**: https://docs.python.org/3/library/asyncio.html

---

**Happy Learning! 🚀**

You're building a production-grade API while learning modern Python web development. Keep going!
