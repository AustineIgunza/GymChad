"""
seed.py — Seed global exercises into SQLite for local dev.

Only runs when the exercises table is empty, so it's safe to call on every startup.
In production (PostgreSQL/Supabase), exercises are seeded via supabase_setup.sql.
"""

import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.exercise import Exercise, MuscleGroup


EXERCISES = [
    # ── CHEST ──────────────────────────────────────────────────────────────────
    ("Barbell Bench Press",       MuscleGroup.CHEST,     "Barbell", "Lie on bench, lower bar to chest, press up"),
    ("Dumbbell Bench Press",      MuscleGroup.CHEST,     "Dumbbells", None),
    ("Incline Barbell Press",     MuscleGroup.CHEST,     "Barbell", "Upper chest focus"),
    ("Incline Dumbbell Press",    MuscleGroup.CHEST,     "Dumbbells", None),
    ("Decline Barbell Press",     MuscleGroup.CHEST,     "Barbell", "Lower chest focus"),
    ("Cable Fly",                 MuscleGroup.CHEST,     "Cable", None),
    ("Dumbbell Fly",              MuscleGroup.CHEST,     "Dumbbells", None),
    ("Pec Deck",                  MuscleGroup.CHEST,     "Machine", None),
    ("Push-Up",                   MuscleGroup.CHEST,     "Bodyweight", None),
    ("Chest Dip",                 MuscleGroup.CHEST,     "Bodyweight", "Lean forward to target chest"),

    # ── BACK ───────────────────────────────────────────────────────────────────
    ("Deadlift",                  MuscleGroup.BACK,      "Barbell", "Full posterior chain compound lift"),
    ("Barbell Row",               MuscleGroup.BACK,      "Barbell", "Bent-over, pull bar to lower chest"),
    ("Dumbbell Row",              MuscleGroup.BACK,      "Dumbbells", "Single-arm, brace on bench"),
    ("Pull-Up",                   MuscleGroup.BACK,      "Bodyweight", "Overhand grip"),
    ("Chin-Up",                   MuscleGroup.BACK,      "Bodyweight", "Underhand grip, more bicep"),
    ("Lat Pulldown",              MuscleGroup.BACK,      "Cable", None),
    ("Seated Cable Row",          MuscleGroup.BACK,      "Cable", None),
    ("T-Bar Row",                 MuscleGroup.BACK,      "Barbell", None),
    ("Face Pull",                 MuscleGroup.BACK,      "Cable", "Rear delts + rotator cuff"),
    ("Straight-Arm Pulldown",     MuscleGroup.BACK,      "Cable", None),

    # ── SHOULDERS ──────────────────────────────────────────────────────────────
    ("Overhead Press (Barbell)",  MuscleGroup.SHOULDERS, "Barbell", "Standing or seated"),
    ("Dumbbell Shoulder Press",   MuscleGroup.SHOULDERS, "Dumbbells", None),
    ("Arnold Press",              MuscleGroup.SHOULDERS, "Dumbbells", "Rotating press for full delt"),
    ("Lateral Raise",             MuscleGroup.SHOULDERS, "Dumbbells", "Side deltoid isolation"),
    ("Cable Lateral Raise",       MuscleGroup.SHOULDERS, "Cable", None),
    ("Front Raise",               MuscleGroup.SHOULDERS, "Dumbbells", None),
    ("Rear Delt Fly",             MuscleGroup.SHOULDERS, "Dumbbells", None),
    ("Cable Rear Delt Fly",       MuscleGroup.SHOULDERS, "Cable", None),
    ("Upright Row",               MuscleGroup.SHOULDERS, "Barbell", None),
    ("Machine Shoulder Press",    MuscleGroup.SHOULDERS, "Machine", None),

    # ── BICEPS ─────────────────────────────────────────────────────────────────
    ("Barbell Curl",              MuscleGroup.BICEPS,    "Barbell", None),
    ("Dumbbell Curl",             MuscleGroup.BICEPS,    "Dumbbells", None),
    ("Hammer Curl",               MuscleGroup.BICEPS,    "Dumbbells", "Neutral grip, brachialis focus"),
    ("Incline Dumbbell Curl",     MuscleGroup.BICEPS,    "Dumbbells", "Full stretch at bottom"),
    ("Cable Curl",                MuscleGroup.BICEPS,    "Cable", None),
    ("EZ-Bar Curl",               MuscleGroup.BICEPS,    "EZ-Bar", None),
    ("Preacher Curl",             MuscleGroup.BICEPS,    "Barbell", None),
    ("Concentration Curl",        MuscleGroup.BICEPS,    "Dumbbells", None),
    ("Spider Curl",               MuscleGroup.BICEPS,    "Dumbbells", "Chest-supported, peak contraction"),
    ("Reverse Curl",              MuscleGroup.BICEPS,    "Barbell", "Brachioradialis focus"),

    # ── TRICEPS ────────────────────────────────────────────────────────────────
    ("Close-Grip Bench Press",    MuscleGroup.TRICEPS,   "Barbell", None),
    ("Skull Crusher",             MuscleGroup.TRICEPS,   "EZ-Bar", "Lying tricep extension"),
    ("Tricep Pushdown (Cable)",   MuscleGroup.TRICEPS,   "Cable", None),
    ("Overhead Tricep Extension", MuscleGroup.TRICEPS,   "Dumbbell", None),
    ("Dip",                       MuscleGroup.TRICEPS,   "Bodyweight", "Upright torso for tricep focus"),
    ("Kickback",                  MuscleGroup.TRICEPS,   "Dumbbells", None),
    ("Cable Overhead Extension",  MuscleGroup.TRICEPS,   "Cable", None),
    ("Machine Tricep Press",      MuscleGroup.TRICEPS,   "Machine", None),
    ("Diamond Push-Up",           MuscleGroup.TRICEPS,   "Bodyweight", None),
    ("Tate Press",                MuscleGroup.TRICEPS,   "Dumbbells", "Elbows flared, unique angle"),

    # ── LEGS ───────────────────────────────────────────────────────────────────
    ("Barbell Squat",             MuscleGroup.LEGS,      "Barbell", "King of leg exercises"),
    ("Front Squat",               MuscleGroup.LEGS,      "Barbell", "More quad-dominant"),
    ("Leg Press",                 MuscleGroup.LEGS,      "Machine", None),
    ("Romanian Deadlift",         MuscleGroup.LEGS,      "Barbell", "Hip hinge, hamstring focus"),
    ("Leg Curl",                  MuscleGroup.LEGS,      "Machine", "Hamstring isolation"),
    ("Leg Extension",             MuscleGroup.LEGS,      "Machine", "Quad isolation"),
    ("Bulgarian Split Squat",     MuscleGroup.LEGS,      "Dumbbells", "Rear foot elevated"),
    ("Lunge",                     MuscleGroup.LEGS,      "Dumbbells", None),
    ("Hack Squat",                MuscleGroup.LEGS,      "Machine", None),
    ("Calf Raise (Standing)",     MuscleGroup.LEGS,      "Machine", None),
    ("Calf Raise (Seated)",       MuscleGroup.LEGS,      "Machine", "Soleus focus"),
    ("Step-Up",                   MuscleGroup.LEGS,      "Dumbbells", None),

    # ── GLUTES ─────────────────────────────────────────────────────────────────
    ("Hip Thrust",                MuscleGroup.GLUTES,    "Barbell", "Best glute activator"),
    ("Glute Bridge",              MuscleGroup.GLUTES,    "Bodyweight", None),
    ("Cable Kickback",            MuscleGroup.GLUTES,    "Cable", None),
    ("Sumo Deadlift",             MuscleGroup.GLUTES,    "Barbell", "Wide stance, glute + inner thigh"),
    ("Sumo Squat",                MuscleGroup.GLUTES,    "Dumbbell", None),
    ("Donkey Kick",               MuscleGroup.GLUTES,    "Bodyweight", None),
    ("Abductor Machine",          MuscleGroup.GLUTES,    "Machine", None),

    # ── CORE ───────────────────────────────────────────────────────────────────
    ("Plank",                     MuscleGroup.CORE,      "Bodyweight", None),
    ("Crunch",                    MuscleGroup.CORE,      "Bodyweight", None),
    ("Cable Crunch",              MuscleGroup.CORE,      "Cable", None),
    ("Hanging Leg Raise",         MuscleGroup.CORE,      "Bodyweight", None),
    ("Ab Wheel Rollout",          MuscleGroup.CORE,      "Equipment", None),
    ("Russian Twist",             MuscleGroup.CORE,      "Bodyweight", None),
    ("Decline Sit-Up",            MuscleGroup.CORE,      "Bodyweight", None),
    ("Side Plank",                MuscleGroup.CORE,      "Bodyweight", "Oblique focus"),
    ("Pallof Press",              MuscleGroup.CORE,      "Cable", "Anti-rotation core stability"),
    ("Landmine Rotation",         MuscleGroup.CORE,      "Barbell", None),

    # ── FULL BODY ──────────────────────────────────────────────────────────────
    ("Power Clean",               MuscleGroup.FULL_BODY, "Barbell", "Olympic lift"),
    ("Thruster",                  MuscleGroup.FULL_BODY, "Barbell", "Squat + press"),
    ("Kettlebell Swing",          MuscleGroup.FULL_BODY, "Kettlebell", None),
    ("Burpee",                    MuscleGroup.FULL_BODY, "Bodyweight", None),
    ("Clean and Press",           MuscleGroup.FULL_BODY, "Barbell", None),
]


async def seed_exercises():
    """Insert global exercises if the table is empty."""
    async with AsyncSessionLocal() as db:
        count = await db.scalar(select(func.count()).select_from(Exercise))
        if count and count > 0:
            return  # already seeded

        for name, muscle_group, equipment, description in EXERCISES:
            db.add(Exercise(
                id=str(uuid.uuid4()),
                name=name,
                muscle_group=muscle_group,
                equipment=equipment,
                description=description,
                is_custom=False,
                user_id=None,
            ))

        await db.commit()
        print(f"[seed] Inserted {len(EXERCISES)} exercises into SQLite.")
