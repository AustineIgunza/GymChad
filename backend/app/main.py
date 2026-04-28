"""
main.py — FastAPI application entry point

FastAPI() creates an ASGI app (Asynchronous Server Gateway Interface).
ASGI is the modern Python web standard — it replaces WSGI (used by Flask/Django)
and enables true async/await throughout the request lifecycle.

The title/description/version appear in the auto-generated Swagger UI at /docs.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from app.routers import auth, splits, workouts, exercises, nutrition, foods, progress, ai, measurements, cardio
from app.database import init_db, IS_SQLITE
from app.seed import seed_exercises

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context: runs once on startup, once on shutdown.
    In SQLite dev mode, we create all DB tables automatically so there's
    no manual migration step. In production (PostgreSQL), tables are managed
    via Supabase dashboard + supabase_setup.sql.
    """
    if IS_SQLITE:
        await init_db()
        await seed_exercises()
    yield  # app runs here


# ── Rate limiter setup ────────────────────────────────────────────────────────
# slowapi works like Flask-Limiter but for FastAPI.
# key_func=get_remote_address uses the client IP as the rate limit key.
limiter = Limiter(key_func=get_remote_address)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    lifespan=lifespan,
    title="GymChad API",
    description="""
## GymChad — Gym Tracking & AI Coaching API

### Features
- 🏋️ Workout & set logging with progressive overload tracking
- 🥗 Nutrition logging with Open Food Facts search
- 🤖 AI coach powered by Claude (streaming SSE)
- 📊 Progress analytics with volume/strength charts
- 💪 Split manager for custom training programs

### Authentication
All endpoints (except `/api/v1/auth/*`) require a Supabase JWT in the `Authorization: Bearer <token>` header.
    """,
    version="1.0.0",
    docs_url="/docs",       # Swagger UI — interactive API explorer
    redoc_url="/redoc",     # ReDoc — cleaner API documentation
)

# ── Attach rate limiter ───────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS middleware ───────────────────────────────────────────────────────────
# CORS (Cross-Origin Resource Sharing) allows the React frontend (different domain/port)
# to make requests to this API. Without this, browsers block all cross-origin requests.
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
# Each router is a mini-app. Routes defined in routers/workouts.py
# are mounted here under /api/v1/workouts — clean separation of concerns.
app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["auth"])
app.include_router(splits.router,    prefix="/api/v1/splits",    tags=["splits"])
app.include_router(workouts.router,  prefix="/api/v1/workouts",  tags=["workouts"])
app.include_router(exercises.router, prefix="/api/v1/exercises", tags=["exercises"])
app.include_router(nutrition.router, prefix="/api/v1/nutrition", tags=["nutrition"])
app.include_router(foods.router,     prefix="/api/v1/foods",     tags=["foods"])
app.include_router(progress.router,      prefix="/api/v1/progress",     tags=["progress"])
app.include_router(measurements.router,  prefix="/api/v1/measurements", tags=["measurements"])
app.include_router(cardio.router,        prefix="/api/v1/cardio",       tags=["cardio"])
app.include_router(ai.router,            prefix="/api/v1/ai",           tags=["ai"])

# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    """Railway uses this endpoint to verify the service is running."""
    return {"status": "ok", "version": "1.0.0"}

@app.get("/", tags=["health"])
async def root():
    return {"message": "GymChad API — visit /docs for interactive documentation"}
