"""
seed.py — Seed the exercise library

Run with: python seed.py

This populates the exercises table with 80+ exercises across all muscle groups.
These are global exercises (user_id = None) available to all users.
"""

import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

load_dotenv()

from app.models.exercise import Exercise, MuscleGroup
from app.database import Base

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost/gymchad")

EXERCISES = [
    # ── CHEST ─────────────────────────────────────────────────────────────
    ("Barbell Bench Press", MuscleGroup.CHEST, "Barbell"),
    ("Incline Barbell Bench Press", MuscleGroup.CHEST, "Barbell"),
    ("Decline Barbell Bench Press", MuscleGroup.CHEST, "Barbell"),
    ("Dumbbell Bench Press", MuscleGroup.CHEST, "Dumbbell"),
    ("Incline Dumbbell Press", MuscleGroup.CHEST, "Dumbbell"),
    ("Dumbbell Fly", MuscleGroup.CHEST, "Dumbbell"),
    ("Cable Fly", MuscleGroup.CHEST, "Cable"),
    ("Pec Deck (Machine Fly)", MuscleGroup.CHEST, "Machine"),
    ("Dips (Chest)", MuscleGroup.CHEST, "Bodyweight"),
    ("Push-Up", MuscleGroup.CHEST, "Bodyweight"),
    ("Close-Grip Push-Up", MuscleGroup.CHEST, "Bodyweight"),

    # ── BACK ──────────────────────────────────────────────────────────────
    ("Deadlift", MuscleGroup.BACK, "Barbell"),
    ("Barbell Row", MuscleGroup.BACK, "Barbell"),
    ("T-Bar Row", MuscleGroup.BACK, "Barbell"),
    ("Pull-Up", MuscleGroup.BACK, "Bodyweight"),
    ("Chin-Up", MuscleGroup.BACK, "Bodyweight"),
    ("Lat Pulldown", MuscleGroup.BACK, "Cable"),
    ("Seated Cable Row", MuscleGroup.BACK, "Cable"),
    ("Single-Arm Dumbbell Row", MuscleGroup.BACK, "Dumbbell"),
    ("Cable Straight-Arm Pulldown", MuscleGroup.BACK, "Cable"),
    ("Rack Pull", MuscleGroup.BACK, "Barbell"),
    ("Meadows Row", MuscleGroup.BACK, "Barbell"),

    # ── SHOULDERS ─────────────────────────────────────────────────────────
    ("Overhead Press (Barbell)", MuscleGroup.SHOULDERS, "Barbell"),
    ("Seated Dumbbell Press", MuscleGroup.SHOULDERS, "Dumbbell"),
    ("Arnold Press", MuscleGroup.SHOULDERS, "Dumbbell"),
    ("Lateral Raise", MuscleGroup.SHOULDERS, "Dumbbell"),
    ("Cable Lateral Raise", MuscleGroup.SHOULDERS, "Cable"),
    ("Face Pull", MuscleGroup.SHOULDERS, "Cable"),
    ("Rear Delt Fly", MuscleGroup.SHOULDERS, "Dumbbell"),
    ("Upright Row", MuscleGroup.SHOULDERS, "Barbell"),
    ("Machine Shoulder Press", MuscleGroup.SHOULDERS, "Machine"),
    ("Push Press", MuscleGroup.SHOULDERS, "Barbell"),

    # ── BICEPS ────────────────────────────────────────────────────────────
    ("Barbell Curl", MuscleGroup.BICEPS, "Barbell"),
    ("Dumbbell Curl", MuscleGroup.BICEPS, "Dumbbell"),
    ("Hammer Curl", MuscleGroup.BICEPS, "Dumbbell"),
    ("Incline Dumbbell Curl", MuscleGroup.BICEPS, "Dumbbell"),
    ("Cable Curl", MuscleGroup.BICEPS, "Cable"),
    ("Preacher Curl", MuscleGroup.BICEPS, "Barbell"),
    ("Spider Curl", MuscleGroup.BICEPS, "Dumbbell"),
    ("Concentration Curl", MuscleGroup.BICEPS, "Dumbbell"),

    # ── TRICEPS ───────────────────────────────────────────────────────────
    ("Tricep Pushdown (Cable)", MuscleGroup.TRICEPS, "Cable"),
    ("Overhead Tricep Extension", MuscleGroup.TRICEPS, "Dumbbell"),
    ("Skull Crusher", MuscleGroup.TRICEPS, "Barbell"),
    ("Close-Grip Bench Press", MuscleGroup.TRICEPS, "Barbell"),
    ("Dips (Triceps)", MuscleGroup.TRICEPS, "Bodyweight"),
    ("Diamond Push-Up", MuscleGroup.TRICEPS, "Bodyweight"),
    ("Rope Pushdown", MuscleGroup.TRICEPS, "Cable"),
    ("Kickback", MuscleGroup.TRICEPS, "Dumbbell"),

    # ── LEGS ──────────────────────────────────────────────────────────────
    ("Barbell Squat", MuscleGroup.LEGS, "Barbell"),
    ("Front Squat", MuscleGroup.LEGS, "Barbell"),
    ("Hack Squat", MuscleGroup.LEGS, "Machine"),
    ("Leg Press", MuscleGroup.LEGS, "Machine"),
    ("Bulgarian Split Squat", MuscleGroup.LEGS, "Dumbbell"),
    ("Romanian Deadlift", MuscleGroup.LEGS, "Barbell"),
    ("Leg Curl (Lying)", MuscleGroup.LEGS, "Machine"),
    ("Leg Curl (Seated)", MuscleGroup.LEGS, "Machine"),
    ("Leg Extension", MuscleGroup.LEGS, "Machine"),
    ("Sumo Deadlift", MuscleGroup.LEGS, "Barbell"),
    ("Goblet Squat", MuscleGroup.LEGS, "Dumbbell"),
    ("Walking Lunges", MuscleGroup.LEGS, "Dumbbell"),
    ("Calf Raise (Standing)", MuscleGroup.LEGS, "Machine"),
    ("Calf Raise (Seated)", MuscleGroup.LEGS, "Machine"),

    # ── GLUTES ────────────────────────────────────────────────────────────
    ("Hip Thrust (Barbell)", MuscleGroup.GLUTES, "Barbell"),
    ("Hip Thrust (Machine)", MuscleGroup.GLUTES, "Machine"),
    ("Cable Kickback", MuscleGroup.GLUTES, "Cable"),
    ("Glute Bridge", MuscleGroup.GLUTES, "Bodyweight"),
    ("Donkey Kick", MuscleGroup.GLUTES, "Bodyweight"),
    ("Abductor Machine", MuscleGroup.GLUTES, "Machine"),

    # ── CORE ──────────────────────────────────────────────────────────────
    ("Plank", MuscleGroup.CORE, "Bodyweight"),
    ("Cable Crunch", MuscleGroup.CORE, "Cable"),
    ("Hanging Leg Raise", MuscleGroup.CORE, "Bodyweight"),
    ("Ab Rollout", MuscleGroup.CORE, "Equipment"),
    ("Russian Twist", MuscleGroup.CORE, "Bodyweight"),
    ("Crunch", MuscleGroup.CORE, "Bodyweight"),
    ("Decline Sit-Up", MuscleGroup.CORE, "Bodyweight"),
    ("Woodchopper", MuscleGroup.CORE, "Cable"),

    # ── CARDIO ────────────────────────────────────────────────────────────
    ("Treadmill Run", MuscleGroup.CARDIO, "Machine"),
    ("Stationary Bike", MuscleGroup.CARDIO, "Machine"),
    ("Rowing Machine", MuscleGroup.CARDIO, "Machine"),
    ("Stairmaster", MuscleGroup.CARDIO, "Machine"),
    ("Elliptical", MuscleGroup.CARDIO, "Machine"),
    ("Battle Ropes", MuscleGroup.CARDIO, "Equipment"),
    ("Jump Rope", MuscleGroup.CARDIO, "Equipment"),
    ("Box Jump", MuscleGroup.CARDIO, "Bodyweight"),

    # ── FULL BODY ─────────────────────────────────────────────────────────
    ("Barbell Clean", MuscleGroup.FULL_BODY, "Barbell"),
    ("Power Clean", MuscleGroup.FULL_BODY, "Barbell"),
    ("Kettlebell Swing", MuscleGroup.FULL_BODY, "Kettlebell"),
    ("Thruster", MuscleGroup.FULL_BODY, "Barbell"),
    ("Burpee", MuscleGroup.FULL_BODY, "Bodyweight"),
    ("Turkish Get-Up", MuscleGroup.FULL_BODY, "Kettlebell"),
]


async def seed():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        # Check if already seeded
        result = await session.execute(select(Exercise).limit(1))
        if result.scalar_one_or_none():
            print("Database already has exercises — skipping seed.")
            return

        exercises = [
            Exercise(name=name, muscle_group=group, equipment=equipment, is_custom=False)
            for name, group, equipment in EXERCISES
        ]
        session.add_all(exercises)
        await session.commit()
        print(f"✅ Seeded {len(exercises)} exercises")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
