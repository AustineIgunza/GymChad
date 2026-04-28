"""
FastAPI Backend for GymChad
A production-ready gym tracking and AI coaching application
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List
import asyncio
import json

from fastapi import FastAPI, Depends, HTTPException, Query, Header, status, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, Field, validator
from pydantic_settings import BaseSettings
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import httpx
import logging
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ============================================================================
# SETTINGS & CONFIGURATION
# ============================================================================

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    DATABASE_URL: str = "postgresql://localhost/gymchad"
    ANTHROPIC_API_KEY: str = "sk-test"
    FRONTEND_URL: str = "http://localhost:5173"
    PORT: int = 3001
    HOST: str = "0.0.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="GymChad API",
    description="AI-powered gym tracking and coaching",
    version="1.0.0"
)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trust proxy headers
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# ============================================================================
# PYDANTIC MODELS (Request/Response Schemas)
# ============================================================================

class AuthRequest(BaseModel):
    """User authentication request"""
    token: str = Field(..., min_length=10)

class ProfileUpdate(BaseModel):
    """User profile update payload"""
    name: Optional[str] = None
    goal: Optional[str] = Field(None, pattern="^(CUTTING|BULKING|MAINTENANCE)$")
    tdee: Optional[int] = Field(None, gt=0)

class ExerciseResponse(BaseModel):
    """Exercise response model"""
    id: str
    name: str
    muscleGroup: str
    equipment: Optional[str] = None
    isCustom: bool
    userId: Optional[str] = None

class UserResponse(BaseModel):
    """User response model"""
    id: str
    email: str
    name: Optional[str] = None
    supabaseId: str
    plan: str
    goal: Optional[str] = None
    currentSplitId: Optional[str] = None
    tdee: Optional[int] = None
    createdAt: datetime
    updatedAt: datetime

class SplitDayExerciseCreate(BaseModel):
    """Exercise in a split day"""
    exerciseId: str

class SplitDayCreate(BaseModel):
    """Split day creation"""
    dayNumber: int = Field(..., ge=1, le=7)
    label: str
    exercises: List[SplitDayExerciseCreate] = []

class SplitCreate(BaseModel):
    """Split creation request"""
    name: str
    days: List[SplitDayCreate] = []

class SplitUpdate(BaseModel):
    """Split update request"""
    name: Optional[str] = None
    days: Optional[List[SplitDayCreate]] = None

class WorkoutCreate(BaseModel):
    """Workout creation request"""
    splitDayId: Optional[str] = None
    label: str
    date: Optional[datetime] = None

class WorkoutSetCreate(BaseModel):
    """Workout set creation"""
    exerciseId: str
    setNumber: int = Field(..., gt=0)
    reps: int = Field(..., gt=0)
    weightKg: float = Field(..., ge=0)
    rpe: Optional[int] = Field(None, ge=1, le=10)
    isWarmup: bool = False

class WorkoutSetUpdate(BaseModel):
    """Workout set update"""
    exerciseId: Optional[str] = None
    setNumber: Optional[int] = None
    reps: Optional[int] = None
    weightKg: Optional[float] = None
    rpe: Optional[int] = None
    isWarmup: Optional[bool] = None

class NutritionCreate(BaseModel):
    """Nutrition log creation"""
    mealType: str = Field(..., pattern="^(BREAKFAST|LUNCH|DINNER|SNACK|PRE_WORKOUT|POST_WORKOUT)$")
    foodName: str
    calories: int = Field(..., ge=0)
    proteinG: float = Field(..., ge=0)
    carbsG: float = Field(..., ge=0)
    fatG: float = Field(..., ge=0)
    quantityG: float = Field(100, gt=0)
    openFoodFactsId: Optional[str] = None
    date: Optional[datetime] = None

class NutritionUpdate(BaseModel):
    """Nutrition log update"""
    mealType: Optional[str] = None
    foodName: Optional[str] = None
    calories: Optional[int] = None
    proteinG: Optional[float] = None
    carbsG: Optional[float] = None
    fatG: Optional[float] = None
    quantityG: Optional[float] = None
    date: Optional[datetime] = None

class CustomFoodCreate(BaseModel):
    """Custom food creation"""
    name: str
    calories: int = Field(..., ge=0)
    proteinG: float = Field(..., ge=0)
    carbsG: float = Field(..., ge=0)
    fatG: float = Field(..., ge=0)

class FoodSearchResult(BaseModel):
    """Food search result"""
    id: str
    name: str
    caloriesPer100g: float
    proteinPer100g: float
    carbsPer100g: float
    fatPer100g: float

class AICoachRequest(BaseModel):
    """AI Coach message request"""
    message: str = Field(..., min_length=1)
    conversationHistory: List[dict] = []

class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)

# ============================================================================
# DEPENDENCY INJECTION
# ============================================================================

async def get_user_id(x_user_id: str = Header(...)) -> str:
    """Extract and validate user ID from headers"""
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing x-user-id header"
        )
    # Sanitize user ID
    clean_id = ''.join(c for c in x_user_id if c.isalnum() or c in '_-')[:64] or "demo-user"
    return clean_id

# ============================================================================
# CACHE & EXTERNAL SERVICES
# ============================================================================

class FoodCache:
    """Simple in-memory cache for food search results"""
    def __init__(self, ttl: int = 3600):
        self.cache = {}
        self.ttl = ttl
        self.timestamps = {}
    
    def get(self, key: str) -> Optional[list]:
        if key in self.cache:
            timestamp = self.timestamps.get(key)
            if timestamp and (datetime.now() - timestamp).seconds < self.ttl:
                return self.cache[key]
            else:
                del self.cache[key]
                del self.timestamps[key]
        return None
    
    def set(self, key: str, value: list):
        self.cache[key] = value
        self.timestamps[key] = datetime.now()

food_cache = FoodCache()

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def sanitize_user_id(user_id: str) -> str:
    """Sanitize user ID for database queries"""
    return ''.join(c for c in user_id if c.isalnum() or c in '_-')[:64] or "demo-user"

async def search_open_food_facts(query: str) -> List[FoodSearchResult]:
    """Search Open Food Facts API for food items"""
    cache_key = f"food:{query.lower().strip()}"
    
    # Check cache first
    cached = food_cache.get(cache_key)
    if cached:
        return cached
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": query,
                    "json": 1,
                    "page_size": 20,
                    "fields": "code,product_name,nutriments,serving_size"
                }
            )
            data = response.json()
            
            results = []
            for product in data.get("products", []):
                try:
                    nutriments = product.get("nutriments", {})
                    calories = float(nutriments.get("energy-kcal_100g", 0))
                    
                    if product.get("product_name") and calories > 0:
                        results.append(FoodSearchResult(
                            id=product["code"],
                            name=product["product_name"],
                            caloriesPer100g=calories,
                            proteinPer100g=float(nutriments.get("proteins_100g", 0)),
                            carbsPer100g=float(nutriments.get("carbohydrates_100g", 0)),
                            fatPer100g=float(nutriments.get("fat_100g", 0))
                        ))
                except (ValueError, KeyError):
                    continue
            
            food_cache.set(cache_key, results)
            return results
    except Exception as e:
        logger.error(f"Food search error: {e}")
        return []

# ============================================================================
# ROUTES: HEALTH CHECK
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"ok": True}

# ============================================================================
# ROUTES: AUTHENTICATION
# ============================================================================

@app.post("/api/v1/auth/verify", response_model=dict)
async def verify_auth(request: AuthRequest):
    """Verify user authentication token"""
    try:
        supabase_id = request.token[:20]
        email = f"{supabase_id}@placeholder.local"
        
        # TODO: Integrate with Prisma when database connection is set up
        # For now, return mock user
        return {
            "user": {
                "id": "user_" + supabase_id,
                "email": email,
                "supabaseId": supabase_id,
                "plan": "FREE",
                "goal": "BULKING",
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/v1/auth/profile")
async def update_profile(
    payload: ProfileUpdate,
    user_id: str = Depends(get_user_id)
):
    """Update user profile"""
    try:
        # TODO: Integrate with Prisma
        return {
            "user": {
                "id": user_id,
                "email": f"{user_id}@local.gymchad.app",
                "name": payload.name,
                "goal": payload.goal,
                "tdee": payload.tdee,
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: EXERCISES
# ============================================================================

@app.get("/api/v1/exercises", response_model=List[ExerciseResponse])
@limiter.limit("30/minute")
async def list_exercises(
    request: Request,
    muscle_group: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id)
):
    """List exercises, optionally filtered by muscle group"""
    try:
        # TODO: Query from Prisma
        # For now, return mock data
        exercises = [
            {
                "id": "ex_1",
                "name": "Bench Press",
                "muscleGroup": "CHEST",
                "equipment": "Barbell",
                "isCustom": False,
                "userId": None
            },
            {
                "id": "ex_2",
                "name": "Squats",
                "muscleGroup": "LEGS",
                "equipment": "Barbell",
                "isCustom": False,
                "userId": None
            }
        ]
        
        if muscle_group:
            exercises = [e for e in exercises if e["muscleGroup"] == muscle_group]
        
        return exercises
    except Exception as e:
        logger.error(f"List exercises error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: SPLITS
# ============================================================================

@app.post("/api/v1/splits", status_code=status.HTTP_201_CREATED)
async def create_split(
    payload: SplitCreate,
    user_id: str = Depends(get_user_id)
):
    """Create a new workout split"""
    try:
        # TODO: Create split with Prisma
        return {
            "id": "split_1",
            "userId": user_id,
            "name": payload.name,
            "isActive": False,
            "createdAt": datetime.now().isoformat(),
            "days": payload.days
        }
    except Exception as e:
        logger.error(f"Create split error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/splits")
async def list_splits(user_id: str = Depends(get_user_id)):
    """Get all workout splits for the user"""
    try:
        # TODO: Query splits from Prisma
        return []
    except Exception as e:
        logger.error(f"List splits error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/splits/{split_id}/days")
async def get_split_days(
    split_id: str,
    user_id: str = Depends(get_user_id)
):
    """Get days for a specific split"""
    try:
        # TODO: Query split days from Prisma
        return []
    except Exception as e:
        logger.error(f"Get split days error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/v1/splits/{split_id}")
async def update_split(
    split_id: str,
    payload: SplitUpdate,
    user_id: str = Depends(get_user_id)
):
    """Update an existing split"""
    try:
        # TODO: Update split in Prisma
        return {"ok": True}
    except Exception as e:
        logger.error(f"Update split error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/v1/splits/{split_id}/activate")
async def activate_split(
    split_id: str,
    user_id: str = Depends(get_user_id)
):
    """Activate a workout split"""
    try:
        # TODO: Update splits in Prisma with transaction
        return {"ok": True}
    except Exception as e:
        logger.error(f"Activate split error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.delete("/api/v1/splits/{split_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_split(
    split_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a split"""
    try:
        # TODO: Delete split from Prisma
        return None
    except Exception as e:
        logger.error(f"Delete split error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: WORKOUTS
# ============================================================================

@app.post("/api/v1/workouts", status_code=status.HTTP_201_CREATED)
async def create_workout(
    payload: WorkoutCreate,
    user_id: str = Depends(get_user_id)
):
    """Create a new workout"""
    try:
        workout_date = payload.date or datetime.now()
        # TODO: Create workout in Prisma
        return {
            "id": "workout_1",
            "userId": user_id,
            "label": payload.label,
            "date": workout_date.isoformat(),
            "splitDayId": payload.splitDayId,
            "sets": []
        }
    except Exception as e:
        logger.error(f"Create workout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/workouts")
@limiter.limit("30/minute")
async def list_workouts(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    split_day_id: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id)
):
    """List workouts with pagination"""
    try:
        # TODO: Query workouts from Prisma with pagination
        return {
            "items": [],
            "page": page,
            "limit": limit,
            "total": 0
        }
    except Exception as e:
        logger.error(f"List workouts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/workouts/today")
async def get_today_workout(user_id: str = Depends(get_user_id)):
    """Get today's workout"""
    try:
        # TODO: Query today's workout from Prisma
        return None
    except Exception as e:
        logger.error(f"Get today's workout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/workouts/{workout_id}")
async def get_workout(
    workout_id: str,
    user_id: str = Depends(get_user_id)
):
    """Get a specific workout"""
    try:
        # TODO: Query workout from Prisma
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workout not found"
        )
    except Exception as e:
        logger.error(f"Get workout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/v1/workouts/{workout_id}")
async def update_workout(
    workout_id: str,
    payload: dict,
    user_id: str = Depends(get_user_id)
):
    """Update a workout"""
    try:
        # TODO: Update workout in Prisma
        return {"ok": True}
    except Exception as e:
        logger.error(f"Update workout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.delete("/api/v1/workouts/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    workout_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a workout (soft delete)"""
    try:
        # TODO: Soft delete workout in Prisma
        return None
    except Exception as e:
        logger.error(f"Delete workout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: WORKOUT SETS
# ============================================================================

@app.post("/api/v1/workouts/{workout_id}/sets", status_code=status.HTTP_201_CREATED)
async def create_workout_set(
    workout_id: str,
    payload: WorkoutSetCreate,
    user_id: str = Depends(get_user_id)
):
    """Add a set to a workout"""
    try:
        # TODO: Create set in Prisma
        return {
            "id": "set_1",
            "workoutId": workout_id,
            "exerciseId": payload.exerciseId,
            "setNumber": payload.setNumber,
            "reps": payload.reps,
            "weightKg": payload.weightKg,
            "rpe": payload.rpe,
            "isWarmup": payload.isWarmup
        }
    except Exception as e:
        logger.error(f"Create workout set error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/v1/workouts/{workout_id}/sets/{set_id}")
async def update_workout_set(
    workout_id: str,
    set_id: str,
    payload: WorkoutSetUpdate,
    user_id: str = Depends(get_user_id)
):
    """Update a workout set"""
    try:
        # TODO: Update set in Prisma
        return {"ok": True}
    except Exception as e:
        logger.error(f"Update workout set error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.delete("/api/v1/workouts/{workout_id}/sets/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout_set(
    workout_id: str,
    set_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a workout set"""
    try:
        # TODO: Delete set from Prisma
        return None
    except Exception as e:
        logger.error(f"Delete workout set error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/workouts/history/{exercise_id}")
async def get_exercise_history(
    exercise_id: str,
    user_id: str = Depends(get_user_id)
):
    """Get workout history for an exercise"""
    try:
        # TODO: Query exercise history from Prisma
        return []
    except Exception as e:
        logger.error(f"Get exercise history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: NUTRITION
# ============================================================================

@app.get("/api/v1/nutrition")
@limiter.limit("30/minute")
async def get_nutrition_logs(
    request: Request,
    date: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id)
):
    """Get nutrition logs for a specific date"""
    try:
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        # TODO: Query nutrition logs from Prisma
        return {
            "date": date,
            "logs": [],
            "totals": {
                "calories": 0,
                "proteinG": 0,
                "carbsG": 0,
                "fatG": 0
            }
        }
    except Exception as e:
        logger.error(f"Get nutrition logs error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/api/v1/nutrition", status_code=status.HTTP_201_CREATED)
async def create_nutrition_log(
    payload: NutritionCreate,
    user_id: str = Depends(get_user_id)
):
    """Create a nutrition log entry"""
    try:
        log_date = payload.date or datetime.now()
        # TODO: Create nutrition log in Prisma
        return {
            "id": "nutrition_1",
            "userId": user_id,
            "date": log_date.isoformat(),
            "mealType": payload.mealType,
            "foodName": payload.foodName,
            "calories": payload.calories,
            "proteinG": payload.proteinG,
            "carbsG": payload.carbsG,
            "fatG": payload.fatG,
            "quantityG": payload.quantityG
        }
    except Exception as e:
        logger.error(f"Create nutrition log error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.put("/api/v1/nutrition/{nutrition_id}")
async def update_nutrition_log(
    nutrition_id: str,
    payload: NutritionUpdate,
    user_id: str = Depends(get_user_id)
):
    """Update a nutrition log entry"""
    try:
        # TODO: Update nutrition log in Prisma
        return {"ok": True}
    except Exception as e:
        logger.error(f"Update nutrition log error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.delete("/api/v1/nutrition/{nutrition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_nutrition_log(
    nutrition_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a nutrition log entry"""
    try:
        # TODO: Delete nutrition log from Prisma
        return None
    except Exception as e:
        logger.error(f"Delete nutrition log error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/nutrition/summary")
async def get_nutrition_summary(
    days: int = Query(30, ge=1),
    user_id: str = Depends(get_user_id)
):
    """Get nutrition summary for past N days"""
    try:
        # TODO: Query nutrition summary from Prisma
        return {
            "days": days,
            "daily": [],
            "average": {
                "calories": 0,
                "proteinG": 0,
                "carbsG": 0,
                "fatG": 0
            }
        }
    except Exception as e:
        logger.error(f"Get nutrition summary error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: FOOD SEARCH
# ============================================================================

@app.get("/api/v1/foods/search", response_model=List[FoodSearchResult])
@limiter.limit("30/minute")
async def search_foods(
    request: Request,
    q: str = Query(..., min_length=1),
    user_id: str = Depends(get_user_id)
):
    """Search for foods in Open Food Facts database"""
    try:
        results = await search_open_food_facts(q)
        return results
    except Exception as e:
        logger.error(f"Food search error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/foods/custom")
async def get_custom_foods(user_id: str = Depends(get_user_id)):
    """Get user's custom food library"""
    try:
        # TODO: Query custom foods from Prisma
        return []
    except Exception as e:
        logger.error(f"Get custom foods error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/api/v1/foods/custom", status_code=status.HTTP_201_CREATED)
async def create_custom_food(
    payload: CustomFoodCreate,
    user_id: str = Depends(get_user_id)
):
    """Create a custom food entry"""
    try:
        # TODO: Create custom food in Prisma
        return {
            "id": "custom_1",
            "userId": user_id,
            "name": payload.name,
            "calories": payload.calories,
            "proteinG": payload.proteinG,
            "carbsG": payload.carbsG,
            "fatG": payload.fatG,
            "createdAt": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Create custom food error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.delete("/api/v1/foods/custom/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_custom_food(
    food_id: str,
    user_id: str = Depends(get_user_id)
):
    """Delete a custom food entry"""
    try:
        # TODO: Delete custom food from Prisma
        return None
    except Exception as e:
        logger.error(f"Delete custom food error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: PROGRESS & ANALYTICS
# ============================================================================

@app.get("/api/v1/progress/volume")
async def get_volume_progress(
    exercise_id: Optional[str] = Query(None),
    weeks: int = Query(8, ge=1),
    user_id: str = Depends(get_user_id)
):
    """Get training volume progress over time"""
    try:
        # TODO: Calculate volume from Prisma
        return []
    except Exception as e:
        logger.error(f"Get volume progress error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/progress/strength")
async def get_strength_progress(
    exercise_id: str = Query(...),
    user_id: str = Depends(get_user_id)
):
    """Get estimated 1RM progression over time"""
    try:
        # TODO: Calculate strength from Prisma
        return []
    except Exception as e:
        logger.error(f"Get strength progress error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/progress/bodyweight")
async def get_bodyweight_progress(
    user_id: str = Depends(get_user_id)
):
    """Get bodyweight tracking over time"""
    try:
        # TODO: Query bodyweight events from Prisma
        return []
    except Exception as e:
        logger.error(f"Get bodyweight progress error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/progress/calories")
async def get_calorie_progress(
    days: int = Query(30, ge=1),
    user_id: str = Depends(get_user_id)
):
    """Get daily calorie intake vs target"""
    try:
        # TODO: Calculate calorie progress from Prisma
        return []
    except Exception as e:
        logger.error(f"Get calorie progress error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/v1/progress/macros")
async def get_macro_progress(
    days: int = Query(7, ge=1),
    user_id: str = Depends(get_user_id)
):
    """Get macro tracking over time"""
    try:
        # TODO: Calculate macro averages from Prisma
        return {
            "days": days,
            "proteinG": 0,
            "carbsG": 0,
            "fatG": 0
        }
    except Exception as e:
        logger.error(f"Get macro progress error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: RECOMMENDATIONS
# ============================================================================

@app.get("/api/v1/workouts/recommendations")
async def get_recommendations(
    user_id: str = Depends(get_user_id)
):
    """Get progressive overload recommendations"""
    try:
        # TODO: Calculate recommendations from Prisma
        return []
    except Exception as e:
        logger.error(f"Get recommendations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ROUTES: AI COACH (with streaming)
# ============================================================================

async def generate_coach_stream(user_id: str, message: str, conversation_history: list):
    """Generator for streaming AI coach responses"""
    from anthropic import Anthropic
    
    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        
        # Build system prompt
        system_prompt = f"""You are GymAI, a professional gym coach. 
You help users with workout programming, nutrition, and progress tracking.
User preferences: Provide data-driven recommendations in 3 numbered points.
Keep responses concise and actionable."""
        
        # Prepare messages
        messages = [
            {"role": msg.get("role", "user"), "content": msg["content"]}
            for msg in conversation_history
        ]
        messages.append({"role": "user", "content": message})
        
        # Stream response
        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            system=system_prompt,
            messages=messages
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'token': text})}\n\n"
        
        yield "event: done\ndata: {}\n\n"
    except Exception as e:
        logger.error(f"AI coach error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/v1/ai/coach")
async def ai_coach(
    request: AICoachRequest,
    user_id: str = Depends(get_user_id)
):
    """Stream AI coaching response"""
    try:
        return StreamingResponse(
            generate_coach_stream(user_id, request.message, request.conversationHistory),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        logger.error(f"AI coach endpoint error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail="Rate limit exceeded"
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Internal server error"
    )

# ============================================================================
# STARTUP/SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup_event():
    logger.info(f"GymChad API starting on {settings.HOST}:{settings.PORT}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("GymChad API shutting down")

# ============================================================================
# RUN SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
