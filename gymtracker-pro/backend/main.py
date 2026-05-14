"""
FastAPI Backend for GymChad
A production-ready gym tracking and AI coaching application
Uses in-memory storage (data persists for the duration of the server session)
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from collections import defaultdict
import asyncio
import json

from fastapi import FastAPI, Depends, HTTPException, Query, Header, status, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# SETTINGS
# ============================================================================

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://localhost/gymchad"
    ANTHROPIC_API_KEY: str = "sk-test"
    FRONTEND_URL: str = "http://localhost:5173"
    PORT: int = 3001
    HOST: str = "0.0.0.0"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GymChad API", version="1.0.0")

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# IN-MEMORY STORAGE
# ============================================================================

# All data keyed by user_id
_users: dict = {}
_splits: dict = {}           # split_id -> split dict
_workouts: dict = {}         # workout_id -> workout dict
_workout_sets: dict = {}     # set_id -> set dict
_nutrition_logs: dict = {}   # log_id -> log dict
_custom_foods: dict = {}     # food_id -> food dict

# Default exercises available to all users
DEFAULT_EXERCISES = [
    {"id": "ex_bench", "name": "Bench Press", "muscleGroup": "CHEST", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_incline_bench", "name": "Incline Bench Press", "muscleGroup": "CHEST", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_dumbbell_fly", "name": "Dumbbell Fly", "muscleGroup": "CHEST", "equipment": "Dumbbell", "isCustom": False, "userId": None},
    {"id": "ex_squat", "name": "Squats", "muscleGroup": "LEGS", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_leg_press", "name": "Leg Press", "muscleGroup": "LEGS", "equipment": "Machine", "isCustom": False, "userId": None},
    {"id": "ex_leg_curl", "name": "Leg Curl", "muscleGroup": "LEGS", "equipment": "Machine", "isCustom": False, "userId": None},
    {"id": "ex_leg_ext", "name": "Leg Extension", "muscleGroup": "LEGS", "equipment": "Machine", "isCustom": False, "userId": None},
    {"id": "ex_deadlift", "name": "Deadlift", "muscleGroup": "BACK", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_lat_pulldown", "name": "Lat Pulldown", "muscleGroup": "BACK", "equipment": "Cable", "isCustom": False, "userId": None},
    {"id": "ex_barbell_row", "name": "Barbell Row", "muscleGroup": "BACK", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_seated_row", "name": "Seated Cable Row", "muscleGroup": "BACK", "equipment": "Cable", "isCustom": False, "userId": None},
    {"id": "ex_ohp", "name": "Overhead Press", "muscleGroup": "SHOULDERS", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_lateral_raise", "name": "Lateral Raise", "muscleGroup": "SHOULDERS", "equipment": "Dumbbell", "isCustom": False, "userId": None},
    {"id": "ex_face_pull", "name": "Face Pull", "muscleGroup": "SHOULDERS", "equipment": "Cable", "isCustom": False, "userId": None},
    {"id": "ex_bicep_curl", "name": "Bicep Curl", "muscleGroup": "BICEPS", "equipment": "Dumbbell", "isCustom": False, "userId": None},
    {"id": "ex_hammer_curl", "name": "Hammer Curl", "muscleGroup": "BICEPS", "equipment": "Dumbbell", "isCustom": False, "userId": None},
    {"id": "ex_tricep_pushdown", "name": "Tricep Pushdown", "muscleGroup": "TRICEPS", "equipment": "Cable", "isCustom": False, "userId": None},
    {"id": "ex_skull_crusher", "name": "Skull Crusher", "muscleGroup": "TRICEPS", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_hip_thrust", "name": "Hip Thrust", "muscleGroup": "GLUTES", "equipment": "Barbell", "isCustom": False, "userId": None},
    {"id": "ex_plank", "name": "Plank", "muscleGroup": "CORE", "equipment": "Bodyweight", "isCustom": False, "userId": None},
    {"id": "ex_cable_crunch", "name": "Cable Crunch", "muscleGroup": "CORE", "equipment": "Cable", "isCustom": False, "userId": None},
    {"id": "ex_treadmill", "name": "Treadmill", "muscleGroup": "CARDIO", "equipment": "Machine", "isCustom": False, "userId": None},
    {"id": "ex_cycling", "name": "Cycling", "muscleGroup": "CARDIO", "equipment": "Machine", "isCustom": False, "userId": None},
]

def _gen_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:12]}"

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    tdee: Optional[int] = None

class SplitDayExerciseCreate(BaseModel):
    exerciseId: str

class SplitDayCreate(BaseModel):
    dayNumber: int = Field(..., ge=1, le=7)
    label: str
    exercises: List[SplitDayExerciseCreate] = []

class SplitCreate(BaseModel):
    name: str
    days: List[SplitDayCreate] = []

class SplitUpdate(BaseModel):
    name: Optional[str] = None
    days: Optional[List[SplitDayCreate]] = None

class WorkoutCreate(BaseModel):
    splitDayId: Optional[str] = None
    label: str
    date: Optional[str] = None

class WorkoutSetCreate(BaseModel):
    exerciseId: str
    setNumber: int = Field(..., gt=0)
    reps: int = Field(..., gt=0)
    weightKg: float = Field(..., ge=0)
    rpe: Optional[int] = Field(None, ge=1, le=10)
    isWarmup: bool = False

class NutritionCreate(BaseModel):
    mealType: str
    foodName: str
    calories: int = Field(..., ge=0)
    proteinG: float = Field(..., ge=0)
    carbsG: float = Field(..., ge=0)
    fatG: float = Field(..., ge=0)
    quantityG: float = Field(100, gt=0)
    servingUnit: Optional[str] = None
    openFoodFactsId: Optional[str] = None
    date: Optional[str] = None

class CustomFoodCreate(BaseModel):
    name: str
    calories: int = Field(..., ge=0)
    proteinG: float = Field(..., ge=0)
    carbsG: float = Field(..., ge=0)
    fatG: float = Field(..., ge=0)

class AICoachRequest(BaseModel):
    message: str
    conversationHistory: List[dict] = []

# ============================================================================
# DEPENDENCIES
# ============================================================================

async def get_user_id(x_user_id: str = Header(default="demo-user")) -> str:
    clean_id = ''.join(c for c in x_user_id if c.isalnum() or c in '_-')[:64] or "demo-user"
    # Auto-create user profile if not exists
    if clean_id not in _users:
        _users[clean_id] = {
            "id": clean_id,
            "email": f"{clean_id}@gymchad.app",
            "name": "Athlete",
            "supabaseId": clean_id,
            "plan": "PRO",
            "goal": "BULKING",
            "tdee": 2500,
            "currentSplitId": None,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
    return clean_id

# ============================================================================
# FOOD SEARCH CACHE
# ============================================================================

class FoodCache:
    def __init__(self, ttl: int = 3600):
        self.cache: dict = {}
        self.timestamps: dict = {}
        self.ttl = ttl

    def get(self, key: str):
        if key in self.cache:
            ts = self.timestamps.get(key)
            if ts and (datetime.now() - ts).seconds < self.ttl:
                return self.cache[key]
            else:
                del self.cache[key]
                del self.timestamps[key]
        return None

    def set(self, key: str, value):
        self.cache[key] = value
        self.timestamps[key] = datetime.now()

food_cache = FoodCache()

async def search_open_food_facts(query: str) -> list:
    """Search Open Food Facts with English language filter"""
    cache_key = f"food:{query.lower().strip()}"
    cached = food_cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            # Use English-specific search with language filters
            response = await client.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={
                    "search_terms": query,
                    "json": 1,
                    "page_size": 30,
                    "lc": "en",
                    "fields": "code,product_name_en,product_name,nutriments,serving_size,serving_quantity",
                    "tagtype_0": "languages",
                    "tag_contains_0": "contains",
                    "tag_0": "en",
                },
            )
            data = response.json()

            results = []
            for product in data.get("products", []):
                try:
                    nutriments = product.get("nutriments", {})
                    calories = float(nutriments.get("energy-kcal_100g", 0))
                    # Prefer English name, fall back to generic name
                    name = product.get("product_name_en") or product.get("product_name", "")
                    # Skip products without English name or with non-Latin characters
                    if not name or calories <= 0:
                        continue
                    # Filter out non-English names (basic heuristic)
                    try:
                        name.encode("ascii")
                    except UnicodeEncodeError:
                        # Allow if it's mostly ASCII
                        ascii_chars = sum(1 for c in name if ord(c) < 128)
                        if ascii_chars / len(name) < 0.7:
                            continue

                    serving_size = product.get("serving_size", "")
                    serving_qty = product.get("serving_quantity")

                    results.append({
                        "id": product["code"],
                        "name": name.strip(),
                        "caloriesPer100g": round(calories, 1),
                        "proteinPer100g": round(float(nutriments.get("proteins_100g", 0)), 1),
                        "carbsPer100g": round(float(nutriments.get("carbohydrates_100g", 0)), 1),
                        "fatPer100g": round(float(nutriments.get("fat_100g", 0)), 1),
                        "servingSize": serving_size,
                        "servingQuantity": float(serving_qty) if serving_qty else None,
                    })
                except (ValueError, KeyError):
                    continue

            # Sort: prefer results where query appears at start of name
            query_lower = query.lower()
            results.sort(key=lambda r: (
                0 if r["name"].lower().startswith(query_lower) else
                1 if query_lower in r["name"].lower() else 2
            ))

            food_cache.set(cache_key, results[:15])
            return results[:15]
    except Exception as e:
        logger.error(f"Food search error: {e}")
        return []

# ============================================================================
# HEALTH
# ============================================================================

@app.get("/health")
async def health_check():
    return {"ok": True}

# ============================================================================
# AUTH & PROFILE
# ============================================================================

@app.post("/api/v1/auth/verify")
async def verify_auth(request: Request):
    body = await request.json()
    token = body.get("token", "demo")
    user_id = token[:20] if len(token) >= 20 else f"user_{token[:12]}"
    clean_id = ''.join(c for c in user_id if c.isalnum() or c in '_-')[:64] or "demo-user"

    if clean_id not in _users:
        _users[clean_id] = {
            "id": clean_id,
            "email": f"{clean_id}@gymchad.app",
            "name": "Athlete",
            "supabaseId": clean_id,
            "plan": "PRO",
            "goal": "BULKING",
            "tdee": 2500,
            "currentSplitId": None,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }
    return {"user": _users[clean_id]}

@app.get("/api/v1/auth/profile")
async def get_profile(user_id: str = Depends(get_user_id)):
    return {"user": _users[user_id]}

@app.put("/api/v1/auth/profile")
async def update_profile(payload: ProfileUpdate, user_id: str = Depends(get_user_id)):
    user = _users[user_id]
    if payload.name is not None:
        user["name"] = payload.name
    if payload.goal is not None:
        user["goal"] = payload.goal
    if payload.tdee is not None:
        user["tdee"] = payload.tdee
    user["updatedAt"] = datetime.now().isoformat()
    return {"user": user}

# ============================================================================
# EXERCISES
# ============================================================================

@app.get("/api/v1/exercises")
async def list_exercises(
    request: Request,
    muscle_group: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id),
):
    exercises = list(DEFAULT_EXERCISES)
    if muscle_group:
        exercises = [e for e in exercises if e["muscleGroup"] == muscle_group]
    return exercises

# ============================================================================
# SPLITS
# ============================================================================

@app.post("/api/v1/splits", status_code=201)
async def create_split(payload: SplitCreate, user_id: str = Depends(get_user_id)):
    split_id = _gen_id("split_")
    days = []
    for d in payload.days:
        day_id = _gen_id("day_")
        day_exercises = []
        for idx, ex in enumerate(d.exercises):
            day_exercises.append({
                "id": _gen_id("sde_"),
                "splitDayId": day_id,
                "exerciseId": ex.exerciseId,
                "orderIndex": idx,
            })
        days.append({
            "id": day_id,
            "splitId": split_id,
            "dayNumber": d.dayNumber,
            "label": d.label,
            "exercises": day_exercises,
        })

    split = {
        "id": split_id,
        "userId": user_id,
        "name": payload.name,
        "isActive": False,
        "createdAt": datetime.now().isoformat(),
        "days": days,
    }
    _splits[split_id] = split
    return split

@app.get("/api/v1/splits")
async def list_splits(user_id: str = Depends(get_user_id)):
    return [s for s in _splits.values() if s["userId"] == user_id]

@app.get("/api/v1/splits/{split_id}/days")
async def get_split_days(split_id: str, user_id: str = Depends(get_user_id)):
    split = _splits.get(split_id)
    if not split or split["userId"] != user_id:
        raise HTTPException(404, "Split not found")
    return split["days"]

@app.put("/api/v1/splits/{split_id}")
async def update_split(split_id: str, payload: SplitUpdate, user_id: str = Depends(get_user_id)):
    split = _splits.get(split_id)
    if not split or split["userId"] != user_id:
        raise HTTPException(404, "Split not found")
    if payload.name is not None:
        split["name"] = payload.name
    if payload.days is not None:
        days = []
        for d in payload.days:
            day_id = _gen_id("day_")
            day_exercises = []
            for idx, ex in enumerate(d.exercises):
                day_exercises.append({
                    "id": _gen_id("sde_"),
                    "splitDayId": day_id,
                    "exerciseId": ex.exerciseId,
                    "orderIndex": idx,
                })
            days.append({
                "id": day_id,
                "splitId": split_id,
                "dayNumber": d.dayNumber,
                "label": d.label,
                "exercises": day_exercises,
            })
        split["days"] = days
    return split

@app.put("/api/v1/splits/{split_id}/activate")
async def activate_split(split_id: str, user_id: str = Depends(get_user_id)):
    target = _splits.get(split_id)
    if not target or target["userId"] != user_id:
        raise HTTPException(404, "Split not found")
    for s in _splits.values():
        if s["userId"] == user_id:
            s["isActive"] = False
    target["isActive"] = True
    _users[user_id]["currentSplitId"] = split_id
    return {"ok": True}

@app.delete("/api/v1/splits/{split_id}", status_code=204)
async def delete_split(split_id: str, user_id: str = Depends(get_user_id)):
    split = _splits.get(split_id)
    if not split or split["userId"] != user_id:
        raise HTTPException(404, "Split not found")
    del _splits[split_id]
    return None

# ============================================================================
# WORKOUTS
# ============================================================================

@app.post("/api/v1/workouts", status_code=201)
async def create_workout(payload: WorkoutCreate, user_id: str = Depends(get_user_id)):
    workout_id = _gen_id("wo_")
    workout_date = payload.date or datetime.now().strftime("%Y-%m-%d")
    workout = {
        "id": workout_id,
        "userId": user_id,
        "label": payload.label,
        "date": workout_date,
        "splitDayId": payload.splitDayId,
        "notes": "",
        "durationMin": None,
        "deletedAt": None,
        "sets": [],
    }
    _workouts[workout_id] = workout
    return workout

@app.get("/api/v1/workouts")
async def list_workouts(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id),
):
    user_workouts = [w for w in _workouts.values() if w["userId"] == user_id and not w.get("deletedAt")]
    user_workouts.sort(key=lambda w: w["date"], reverse=True)
    total = len(user_workouts)
    start = (page - 1) * limit
    items = user_workouts[start : start + limit]
    # Attach sets to each workout
    for w in items:
        w["sets"] = [s for s in _workout_sets.values() if s["workoutId"] == w["id"]]
    return {"items": items, "page": page, "limit": limit, "total": total}

@app.get("/api/v1/workouts/today")
async def get_today_workout(user_id: str = Depends(get_user_id)):
    today = datetime.now().strftime("%Y-%m-%d")
    for w in _workouts.values():
        if w["userId"] == user_id and w["date"] == today and not w.get("deletedAt"):
            w["sets"] = [s for s in _workout_sets.values() if s["workoutId"] == w["id"]]
            return w
    return None

@app.get("/api/v1/workouts/{workout_id}")
async def get_workout(workout_id: str, user_id: str = Depends(get_user_id)):
    w = _workouts.get(workout_id)
    if not w or w["userId"] != user_id:
        raise HTTPException(404, "Workout not found")
    w["sets"] = [s for s in _workout_sets.values() if s["workoutId"] == workout_id]
    return w

@app.put("/api/v1/workouts/{workout_id}")
async def update_workout(workout_id: str, request: Request, user_id: str = Depends(get_user_id)):
    w = _workouts.get(workout_id)
    if not w or w["userId"] != user_id:
        raise HTTPException(404, "Workout not found")
    body = await request.json()
    if "notes" in body:
        w["notes"] = body["notes"]
    if "label" in body:
        w["label"] = body["label"]
    if "durationMin" in body:
        w["durationMin"] = body["durationMin"]
    return {"ok": True}

@app.delete("/api/v1/workouts/{workout_id}", status_code=204)
async def delete_workout(workout_id: str, user_id: str = Depends(get_user_id)):
    w = _workouts.get(workout_id)
    if not w or w["userId"] != user_id:
        raise HTTPException(404, "Workout not found")
    w["deletedAt"] = datetime.now().isoformat()
    return None

# ============================================================================
# WORKOUT SETS
# ============================================================================

@app.post("/api/v1/workouts/{workout_id}/sets", status_code=201)
async def create_workout_set(workout_id: str, payload: WorkoutSetCreate, user_id: str = Depends(get_user_id)):
    w = _workouts.get(workout_id)
    if not w or w["userId"] != user_id:
        raise HTTPException(404, "Workout not found")
    set_id = _gen_id("set_")
    new_set = {
        "id": set_id,
        "workoutId": workout_id,
        "exerciseId": payload.exerciseId,
        "setNumber": payload.setNumber,
        "reps": payload.reps,
        "weightKg": payload.weightKg,
        "rpe": payload.rpe,
        "isWarmup": payload.isWarmup,
    }
    _workout_sets[set_id] = new_set
    return new_set

@app.delete("/api/v1/workouts/{workout_id}/sets/{set_id}", status_code=204)
async def delete_workout_set(workout_id: str, set_id: str, user_id: str = Depends(get_user_id)):
    s = _workout_sets.get(set_id)
    if not s or s["workoutId"] != workout_id:
        raise HTTPException(404, "Set not found")
    del _workout_sets[set_id]
    return None

@app.get("/api/v1/workouts/history/{exercise_id}")
async def get_exercise_history(exercise_id: str, user_id: str = Depends(get_user_id)):
    history = []
    user_workouts = {w["id"]: w for w in _workouts.values() if w["userId"] == user_id and not w.get("deletedAt")}
    for s in _workout_sets.values():
        if s["exerciseId"] == exercise_id and s["workoutId"] in user_workouts:
            w = user_workouts[s["workoutId"]]
            history.append({**s, "date": w["date"], "workoutLabel": w["label"]})
    history.sort(key=lambda x: x["date"], reverse=True)
    return history

# ============================================================================
# RECOMMENDATIONS
# ============================================================================

@app.get("/api/v1/workouts/recommendations")
async def get_recommendations(user_id: str = Depends(get_user_id)):
    recs = []
    user_workouts = [w for w in _workouts.values() if w["userId"] == user_id and not w.get("deletedAt")]
    if not user_workouts:
        return []
    # Find exercises user has done and suggest progressive overload
    exercise_sets: dict = defaultdict(list)
    for s in _workout_sets.values():
        if any(w["id"] == s["workoutId"] for w in user_workouts):
            exercise_sets[s["exerciseId"]].append(s)

    for ex_id, sets in exercise_sets.items():
        if sets:
            best = max(sets, key=lambda s: s["weightKg"] * s["reps"])
            ex = next((e for e in DEFAULT_EXERCISES if e["id"] == ex_id), None)
            recs.append({
                "exerciseId": ex_id,
                "exerciseName": ex["name"] if ex else ex_id,
                "recommendation": f"Last best: {best['weightKg']}kg x {best['reps']}. Try {best['weightKg'] + 2.5}kg x {best['reps']} or {best['weightKg']}kg x {best['reps'] + 1}",
            })
    return recs

# ============================================================================
# NUTRITION
# ============================================================================

@app.get("/api/v1/nutrition")
async def get_nutrition_logs(
    request: Request,
    date: Optional[str] = Query(None),
    user_id: str = Depends(get_user_id),
):
    target_date = date or datetime.now().strftime("%Y-%m-%d")
    logs = [
        l for l in _nutrition_logs.values()
        if l["userId"] == user_id and l["date"] == target_date
    ]
    totals = {
        "calories": sum(l["calories"] for l in logs),
        "proteinG": round(sum(l["proteinG"] for l in logs), 1),
        "carbsG": round(sum(l["carbsG"] for l in logs), 1),
        "fatG": round(sum(l["fatG"] for l in logs), 1),
    }
    return {"date": target_date, "logs": logs, "totals": totals}

@app.post("/api/v1/nutrition", status_code=201)
async def create_nutrition_log(payload: NutritionCreate, user_id: str = Depends(get_user_id)):
    log_id = _gen_id("nut_")
    log_date = payload.date or datetime.now().strftime("%Y-%m-%d")
    # If date looks like ISO datetime, extract just the date part
    if "T" in log_date:
        log_date = log_date[:10]

    entry = {
        "id": log_id,
        "userId": user_id,
        "date": log_date,
        "mealType": payload.mealType,
        "foodName": payload.foodName,
        "calories": payload.calories,
        "proteinG": payload.proteinG,
        "carbsG": payload.carbsG,
        "fatG": payload.fatG,
        "quantityG": payload.quantityG,
        "servingUnit": payload.servingUnit,
        "openFoodFactsId": payload.openFoodFactsId,
        "createdAt": datetime.now().isoformat(),
    }
    _nutrition_logs[log_id] = entry
    return entry

@app.put("/api/v1/nutrition/{nutrition_id}")
async def update_nutrition_log(nutrition_id: str, request: Request, user_id: str = Depends(get_user_id)):
    entry = _nutrition_logs.get(nutrition_id)
    if not entry or entry["userId"] != user_id:
        raise HTTPException(404, "Log not found")
    body = await request.json()
    for key in ["mealType", "foodName", "calories", "proteinG", "carbsG", "fatG", "quantityG", "date"]:
        if key in body:
            entry[key] = body[key]
    return entry

@app.delete("/api/v1/nutrition/{nutrition_id}", status_code=204)
async def delete_nutrition_log(nutrition_id: str, user_id: str = Depends(get_user_id)):
    entry = _nutrition_logs.get(nutrition_id)
    if not entry or entry["userId"] != user_id:
        raise HTTPException(404, "Log not found")
    del _nutrition_logs[nutrition_id]
    return None

@app.get("/api/v1/nutrition/summary")
async def get_nutrition_summary(
    period: str = Query("week", pattern="^(week|month|year)$"),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_user_id),
):
    """Get nutrition summary for a period (week/month/year)"""
    now = datetime.now()
    user_logs = [l for l in _nutrition_logs.values() if l["userId"] == user_id]

    if period == "week":
        start = now - timedelta(weeks=1 + offset)
        end = now - timedelta(weeks=offset)
    elif period == "month":
        # Approximate months
        start = now - timedelta(days=30 * (1 + offset))
        end = now - timedelta(days=30 * offset)
    else:  # year
        start = now - timedelta(days=365 * (1 + offset))
        end = now - timedelta(days=365 * offset)

    start_str = start.strftime("%Y-%m-%d")
    end_str = end.strftime("%Y-%m-%d")

    period_logs = [l for l in user_logs if start_str <= l["date"] <= end_str]

    # Group by date
    daily: dict = defaultdict(lambda: {"calories": 0, "proteinG": 0, "carbsG": 0, "fatG": 0})
    for l in period_logs:
        d = daily[l["date"]]
        d["calories"] += l["calories"]
        d["proteinG"] += l["proteinG"]
        d["carbsG"] += l["carbsG"]
        d["fatG"] += l["fatG"]

    daily_list = [{"date": k, **v} for k, v in sorted(daily.items())]
    num_days = max(len(daily_list), 1)

    return {
        "period": period,
        "startDate": start_str,
        "endDate": end_str,
        "daily": daily_list,
        "totalCalories": sum(d["calories"] for d in daily_list),
        "average": {
            "calories": round(sum(d["calories"] for d in daily_list) / num_days),
            "proteinG": round(sum(d["proteinG"] for d in daily_list) / num_days, 1),
            "carbsG": round(sum(d["carbsG"] for d in daily_list) / num_days, 1),
            "fatG": round(sum(d["fatG"] for d in daily_list) / num_days, 1),
        },
    }

# ============================================================================
# FOOD SEARCH
# ============================================================================

@app.get("/api/v1/foods/search")
async def search_foods(
    request: Request,
    q: str = Query(..., min_length=1),
    user_id: str = Depends(get_user_id),
):
    results = await search_open_food_facts(q)
    return results

@app.get("/api/v1/foods/custom")
async def get_custom_foods(user_id: str = Depends(get_user_id)):
    return [f for f in _custom_foods.values() if f["userId"] == user_id]

@app.post("/api/v1/foods/custom", status_code=201)
async def create_custom_food(payload: CustomFoodCreate, user_id: str = Depends(get_user_id)):
    food_id = _gen_id("cf_")
    food = {
        "id": food_id,
        "userId": user_id,
        "name": payload.name,
        "calories": payload.calories,
        "proteinG": payload.proteinG,
        "carbsG": payload.carbsG,
        "fatG": payload.fatG,
        "createdAt": datetime.now().isoformat(),
    }
    _custom_foods[food_id] = food
    return food

@app.delete("/api/v1/foods/custom/{food_id}", status_code=204)
async def delete_custom_food(food_id: str, user_id: str = Depends(get_user_id)):
    food = _custom_foods.get(food_id)
    if not food or food["userId"] != user_id:
        raise HTTPException(404, "Food not found")
    del _custom_foods[food_id]
    return None

# ============================================================================
# PROGRESS & ANALYTICS
# ============================================================================

@app.get("/api/v1/progress/volume")
async def get_volume_progress(
    exercise_id: Optional[str] = Query(None),
    weeks: int = Query(8, ge=1),
    user_id: str = Depends(get_user_id),
):
    user_workouts = {w["id"]: w for w in _workouts.values() if w["userId"] == user_id and not w.get("deletedAt")}
    if not user_workouts:
        return []

    relevant_sets = []
    for s in _workout_sets.values():
        if s["workoutId"] in user_workouts:
            if exercise_id and s["exerciseId"] != exercise_id:
                continue
            w = user_workouts[s["workoutId"]]
            relevant_sets.append({**s, "date": w["date"]})

    # Group by week
    weekly_volume: dict = defaultdict(float)
    for s in relevant_sets:
        try:
            d = datetime.strptime(s["date"], "%Y-%m-%d")
            week_key = d.strftime("%Y-W%W")
            weekly_volume[week_key] += s["weightKg"] * s["reps"]
        except ValueError:
            continue

    result = [{"week": k, "volume": round(v)} for k, v in sorted(weekly_volume.items())]
    return result[-weeks:]

@app.get("/api/v1/progress/strength")
async def get_strength_progress(
    exercise_id: str = Query(...),
    user_id: str = Depends(get_user_id),
):
    user_workouts = {w["id"]: w for w in _workouts.values() if w["userId"] == user_id and not w.get("deletedAt")}
    results = []
    for s in _workout_sets.values():
        if s["exerciseId"] == exercise_id and s["workoutId"] in user_workouts:
            w = user_workouts[s["workoutId"]]
            e1rm = round(s["weightKg"] * (1 + s["reps"] / 30), 1)
            results.append({"date": w["date"], "estimated1RM": e1rm, "weightKg": s["weightKg"], "reps": s["reps"]})

    results.sort(key=lambda x: x["date"])
    return results

@app.get("/api/v1/progress/calories")
async def get_calorie_progress(
    days: int = Query(30, ge=1),
    user_id: str = Depends(get_user_id),
):
    user_logs = [l for l in _nutrition_logs.values() if l["userId"] == user_id]
    daily: dict = defaultdict(int)
    for l in user_logs:
        daily[l["date"]] += l["calories"]

    target = _users.get(user_id, {}).get("tdee", 2500)
    now = datetime.now()
    result = []
    for i in range(days):
        d = (now - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        result.append({"date": d, "calories": daily.get(d, 0), "target": target})

    return result

@app.get("/api/v1/progress/macros")
async def get_macro_progress(
    days: int = Query(7, ge=1),
    user_id: str = Depends(get_user_id),
):
    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    user_logs = [l for l in _nutrition_logs.values() if l["userId"] == user_id and l["date"] >= cutoff]
    total_p = sum(l["proteinG"] for l in user_logs)
    total_c = sum(l["carbsG"] for l in user_logs)
    total_f = sum(l["fatG"] for l in user_logs)
    num_days = max(days, 1)
    return {
        "days": days,
        "proteinG": round(total_p / num_days, 1),
        "carbsG": round(total_c / num_days, 1),
        "fatG": round(total_f / num_days, 1),
    }

@app.get("/api/v1/progress/bodyweight")
async def get_bodyweight_progress(user_id: str = Depends(get_user_id)):
    return []

# ============================================================================
# HISTORY (workouts + nutrition combined)
# ============================================================================

@app.get("/api/v1/history")
async def get_history(
    period: str = Query("week", pattern="^(week|month|year|all)$"),
    offset: int = Query(0, ge=0),
    user_id: str = Depends(get_user_id),
):
    """Combined history of workouts and nutrition for a given period"""
    now = datetime.now()

    if period == "week":
        start = now - timedelta(weeks=1 + offset)
        end = now - timedelta(weeks=offset) if offset > 0 else now
    elif period == "month":
        start = now - timedelta(days=30 * (1 + offset))
        end = now - timedelta(days=30 * offset) if offset > 0 else now
    elif period == "year":
        start = now - timedelta(days=365 * (1 + offset))
        end = now - timedelta(days=365 * offset) if offset > 0 else now
    else:
        start = now - timedelta(days=3650)
        end = now

    start_str = start.strftime("%Y-%m-%d")
    end_str = end.strftime("%Y-%m-%d")

    # Workouts in period
    user_workouts = [
        w for w in _workouts.values()
        if w["userId"] == user_id and not w.get("deletedAt")
        and start_str <= w["date"] <= end_str
    ]
    for w in user_workouts:
        w["sets"] = [s for s in _workout_sets.values() if s["workoutId"] == w["id"]]
    user_workouts.sort(key=lambda w: w["date"], reverse=True)

    # Nutrition in period
    user_logs = [
        l for l in _nutrition_logs.values()
        if l["userId"] == user_id and start_str <= l["date"] <= end_str
    ]

    # Daily nutrition totals
    daily_nutrition: dict = defaultdict(lambda: {"calories": 0, "proteinG": 0, "carbsG": 0, "fatG": 0})
    for l in user_logs:
        d = daily_nutrition[l["date"]]
        d["calories"] += l["calories"]
        d["proteinG"] += l["proteinG"]
        d["carbsG"] += l["carbsG"]
        d["fatG"] += l["fatG"]

    daily_list = [{"date": k, **v} for k, v in sorted(daily_nutrition.items(), reverse=True)]

    total_workouts = len(user_workouts)
    total_sets = sum(len(w.get("sets", [])) for w in user_workouts)
    total_volume = sum(s["weightKg"] * s["reps"] for w in user_workouts for s in w.get("sets", []))
    avg_cals = round(sum(d["calories"] for d in daily_list) / max(len(daily_list), 1))

    return {
        "period": period,
        "startDate": start_str,
        "endDate": end_str,
        "workouts": user_workouts,
        "dailyNutrition": daily_list,
        "summary": {
            "totalWorkouts": total_workouts,
            "totalSets": total_sets,
            "totalVolume": round(total_volume),
            "avgCaloriesPerDay": avg_cals,
        },
    }

# ============================================================================
# AI COACH
# ============================================================================

async def generate_coach_stream(user_id: str, message: str, conversation_history: list):
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        system_prompt = """You are GymAI, a professional gym coach.
You help users with workout programming, nutrition, and progress tracking.
Provide data-driven recommendations in 3 numbered points.
Keep responses concise and actionable."""

        messages = [
            {"role": msg.get("role", "user"), "content": msg["content"]}
            for msg in conversation_history
        ]
        messages.append({"role": "user", "content": message})

        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1200,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'token': text})}\n\n"

        yield "event: done\ndata: {}\n\n"
    except Exception as e:
        logger.error(f"AI coach error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.post("/api/v1/ai/coach")
async def ai_coach(request: AICoachRequest, user_id: str = Depends(get_user_id)):
    return StreamingResponse(
        generate_coach_stream(user_id, request.message, request.conversationHistory),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

# ============================================================================
# RUN
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
