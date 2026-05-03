"""main.py — FastAPI application entry point"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from app.routers import (
    auth, splits, workouts, exercises, nutrition, foods,
    progress, ai, measurements, cardio,
)
from app.routers import records, schedule, tools, export
from app.routers import program
from app.routers import gamification
from app.database import init_db, migrate_db, IS_SQLITE
from app.seed import seed_exercises

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if IS_SQLITE:
        await init_db()
    # Always run safe column migrations
    await migrate_db()
    await seed_exercises()
    yield


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    lifespan=lifespan,
    redirect_slashes=False,
    title="GymChad API",
    description="""
## GymChad — Gym Tracking & AI Coaching API

Features: Workout logging, PR detection, Nutrition tracking, AI coaching,
Split management, Calculators (plate/warmup/1RM), CSV export, Scheduling.
    """,
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(auth.router,         prefix="/api/v1/auth",         tags=["auth"])
app.include_router(splits.router,       prefix="/api/v1/splits",       tags=["splits"])
app.include_router(workouts.router,     prefix="/api/v1/workouts",     tags=["workouts"])
app.include_router(exercises.router,    prefix="/api/v1/exercises",    tags=["exercises"])
app.include_router(nutrition.router,    prefix="/api/v1/nutrition",    tags=["nutrition"])
app.include_router(foods.router,        prefix="/api/v1/foods",        tags=["foods"])
app.include_router(progress.router,     prefix="/api/v1/progress",     tags=["progress"])
app.include_router(measurements.router, prefix="/api/v1/measurements", tags=["measurements"])
app.include_router(cardio.router,       prefix="/api/v1/cardio",       tags=["cardio"])
app.include_router(ai.router,           prefix="/api/v1/ai",           tags=["ai"])
# New routers
app.include_router(records.router,      prefix="/api/v1/records",      tags=["records"])
app.include_router(schedule.router,     prefix="/api/v1/schedule",     tags=["schedule"])
app.include_router(tools.router,        prefix="/api/v1/tools",        tags=["tools"])
app.include_router(export.router,       prefix="/api/v1/export",       tags=["export"])
app.include_router(program.router,      prefix="/api/v1/program",      tags=["program"])
app.include_router(gamification.router, prefix="/api/v1/gamification", tags=["gamification"])


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": "2.0.0"}


@app.get("/", tags=["health"])
async def root():
    return {"message": "GymChad API v2 — visit /docs for documentation"}
