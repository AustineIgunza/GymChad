"""
seed.py — Seed global exercises on startup.

Uses upsert-by-name: safe to add new exercises without clearing the DB.
"""

import uuid
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.exercise import Exercise, MuscleGroup


EXERCISES = [
    # ── CHEST ──────────────────────────────────────────────────────────────────
    ("Barbell Bench Press",           MuscleGroup.CHEST,     "Barbell",    "Lie on bench, lower bar to chest, press up"),
    ("Dumbbell Bench Press",          MuscleGroup.CHEST,     "Dumbbells",  None),
    ("Incline Barbell Press",         MuscleGroup.CHEST,     "Barbell",    "Upper chest focus"),
    ("Incline Dumbbell Press",        MuscleGroup.CHEST,     "Dumbbells",  None),
    ("Decline Barbell Press",         MuscleGroup.CHEST,     "Barbell",    "Lower chest focus"),
    ("Decline Dumbbell Press",        MuscleGroup.CHEST,     "Dumbbells",  None),
    ("Smith Machine Bench Press",     MuscleGroup.CHEST,     "Smith Machine", None),
    ("Smith Machine Incline Press",   MuscleGroup.CHEST,     "Smith Machine", "Upper chest, guided bar path"),
    ("Smith Machine Decline Press",   MuscleGroup.CHEST,     "Smith Machine", None),
    ("Cable Fly",                     MuscleGroup.CHEST,     "Cable",      None),
    ("Cable Crossover",               MuscleGroup.CHEST,     "Cable",      "Arms cross at midline"),
    ("Low-to-High Cable Fly",         MuscleGroup.CHEST,     "Cable",      "Upper chest focus"),
    ("High-to-Low Cable Fly",         MuscleGroup.CHEST,     "Cable",      "Lower chest focus"),
    ("Dumbbell Fly",                  MuscleGroup.CHEST,     "Dumbbells",  None),
    ("Incline Dumbbell Fly",          MuscleGroup.CHEST,     "Dumbbells",  "Upper chest stretch"),
    ("Pec Deck",                      MuscleGroup.CHEST,     "Machine",    None),
    ("Chest Press Machine",           MuscleGroup.CHEST,     "Machine",    None),
    ("Push-Up",                       MuscleGroup.CHEST,     "Bodyweight", None),
    ("Wide-Grip Push-Up",             MuscleGroup.CHEST,     "Bodyweight", "More chest activation"),
    ("Chest Dip",                     MuscleGroup.CHEST,     "Bodyweight", "Lean forward to target chest"),
    ("Landmine Press",                MuscleGroup.CHEST,     "Barbell",    "Single-arm, upper chest"),

    # ── BACK ───────────────────────────────────────────────────────────────────
    ("Deadlift",                      MuscleGroup.BACK,      "Barbell",    "Full posterior chain compound lift"),
    ("Barbell Row",                   MuscleGroup.BACK,      "Barbell",    "Bent-over, pull bar to lower chest"),
    ("Dumbbell Row",                  MuscleGroup.BACK,      "Dumbbells",  "Single-arm, brace on bench"),
    ("Pull-Up",                       MuscleGroup.BACK,      "Bodyweight", "Overhand grip"),
    ("Chin-Up",                       MuscleGroup.BACK,      "Bodyweight", "Underhand grip, more bicep"),
    ("Lat Pulldown",                  MuscleGroup.BACK,      "Cable",      None),
    ("Wide-Grip Lat Pulldown",        MuscleGroup.BACK,      "Cable",      None),
    ("Close-Grip Lat Pulldown",       MuscleGroup.BACK,      "Cable",      "More bicep involvement"),
    ("Seated Cable Row",              MuscleGroup.BACK,      "Cable",      None),
    ("Wide-Grip Cable Row",           MuscleGroup.BACK,      "Cable",      None),
    ("T-Bar Row",                     MuscleGroup.BACK,      "Barbell",    None),
    ("Chest-Supported Row",           MuscleGroup.BACK,      "Machine",    "Removes lower back strain"),
    ("Machine Row",                   MuscleGroup.BACK,      "Machine",    None),
    ("Face Pull",                     MuscleGroup.BACK,      "Cable",      "Rear delts + rotator cuff"),
    ("Straight-Arm Pulldown",         MuscleGroup.BACK,      "Cable",      None),
    ("Rack Pull",                     MuscleGroup.BACK,      "Barbell",    "Partial deadlift, upper back emphasis"),
    ("Meadows Row",                   MuscleGroup.BACK,      "Barbell",    "Landmine single-arm row"),
    ("Pendlay Row",                   MuscleGroup.BACK,      "Barbell",    "Bar returns to floor each rep"),

    # ── SHOULDERS ──────────────────────────────────────────────────────────────
    ("Overhead Press (Barbell)",      MuscleGroup.SHOULDERS, "Barbell",    "Standing or seated"),
    ("Seated Barbell Press",          MuscleGroup.SHOULDERS, "Barbell",    None),
    ("Dumbbell Shoulder Press",       MuscleGroup.SHOULDERS, "Dumbbells",  None),
    ("Seated Dumbbell Press",         MuscleGroup.SHOULDERS, "Dumbbells",  None),
    ("Arnold Press",                  MuscleGroup.SHOULDERS, "Dumbbells",  "Rotating press for full delt"),
    ("Lateral Raise",                 MuscleGroup.SHOULDERS, "Dumbbells",  "Side deltoid isolation"),
    ("Cable Lateral Raise",           MuscleGroup.SHOULDERS, "Cable",      None),
    ("Machine Lateral Raise",         MuscleGroup.SHOULDERS, "Machine",    None),
    ("Front Raise",                   MuscleGroup.SHOULDERS, "Dumbbells",  "Anterior delt"),
    ("Plate Front Raise",             MuscleGroup.SHOULDERS, "Plate",      None),
    ("Cable Front Raise",             MuscleGroup.SHOULDERS, "Cable",      None),
    ("Rear Delt Fly",                 MuscleGroup.SHOULDERS, "Dumbbells",  "Posterior delt"),
    ("Cable Rear Delt Fly",           MuscleGroup.SHOULDERS, "Cable",      None),
    ("Rear Delt Machine",             MuscleGroup.SHOULDERS, "Machine",    "Reverse pec deck"),
    ("Upright Row",                   MuscleGroup.SHOULDERS, "Barbell",    None),
    ("Machine Shoulder Press",        MuscleGroup.SHOULDERS, "Machine",    None),
    ("Smith Machine Shoulder Press",  MuscleGroup.SHOULDERS, "Smith Machine", None),
    ("Pike Push-Up",                  MuscleGroup.SHOULDERS, "Bodyweight", "Shoulder push-up variation"),
    ("Handstand Push-Up",             MuscleGroup.SHOULDERS, "Bodyweight", "Advanced overhead press"),
    ("Bus Driver",                    MuscleGroup.SHOULDERS, "Plate",      "Plate rotation for full delt"),

    # ── BICEPS ─────────────────────────────────────────────────────────────────
    ("Barbell Curl",                  MuscleGroup.BICEPS,    "Barbell",    None),
    ("Dumbbell Curl",                 MuscleGroup.BICEPS,    "Dumbbells",  None),
    ("Hammer Curl",                   MuscleGroup.BICEPS,    "Dumbbells",  "Neutral grip, brachialis focus"),
    ("Incline Dumbbell Curl",         MuscleGroup.BICEPS,    "Dumbbells",  "Full stretch at bottom"),
    ("Cable Curl",                    MuscleGroup.BICEPS,    "Cable",      None),
    ("EZ-Bar Curl",                   MuscleGroup.BICEPS,    "EZ-Bar",     None),
    ("Preacher Curl",                 MuscleGroup.BICEPS,    "Barbell",    None),
    ("Machine Preacher Curl",         MuscleGroup.BICEPS,    "Machine",    None),
    ("Concentration Curl",            MuscleGroup.BICEPS,    "Dumbbells",  None),
    ("Spider Curl",                   MuscleGroup.BICEPS,    "Dumbbells",  "Chest-supported, peak contraction"),
    ("Reverse Curl",                  MuscleGroup.BICEPS,    "Barbell",    "Brachioradialis focus"),
    ("Cross-Body Hammer Curl",        MuscleGroup.BICEPS,    "Dumbbells",  None),
    ("Zottman Curl",                  MuscleGroup.BICEPS,    "Dumbbells",  "Supinate up, pronate down"),

    # ── TRICEPS ────────────────────────────────────────────────────────────────
    ("Close-Grip Bench Press",        MuscleGroup.TRICEPS,   "Barbell",    None),
    ("Skull Crusher",                 MuscleGroup.TRICEPS,   "EZ-Bar",     "Lying tricep extension"),
    ("Dumbbell Skull Crusher",        MuscleGroup.TRICEPS,   "Dumbbells",  None),
    ("Tricep Pushdown (Cable)",       MuscleGroup.TRICEPS,   "Cable",      None),
    ("Rope Pushdown",                 MuscleGroup.TRICEPS,   "Cable",      "Rope attachment, wrists neutral"),
    ("Overhead Tricep Extension",     MuscleGroup.TRICEPS,   "Dumbbell",   None),
    ("Cable Overhead Extension",      MuscleGroup.TRICEPS,   "Cable",      None),
    ("Dip",                           MuscleGroup.TRICEPS,   "Bodyweight", "Upright torso for tricep focus"),
    ("Bench Dip",                     MuscleGroup.TRICEPS,   "Bodyweight", None),
    ("Kickback",                      MuscleGroup.TRICEPS,   "Dumbbells",  None),
    ("Machine Tricep Press",          MuscleGroup.TRICEPS,   "Machine",    None),
    ("Diamond Push-Up",               MuscleGroup.TRICEPS,   "Bodyweight", None),
    ("Tate Press",                    MuscleGroup.TRICEPS,   "Dumbbells",  "Elbows flared, unique angle"),

    # ── LEGS ───────────────────────────────────────────────────────────────────
    ("Barbell Squat",                 MuscleGroup.LEGS,      "Barbell",    "King of leg exercises"),
    ("Front Squat",                   MuscleGroup.LEGS,      "Barbell",    "More quad-dominant"),
    ("Box Squat",                     MuscleGroup.LEGS,      "Barbell",    "Sit back to box, power focus"),
    ("Smith Machine Squat",           MuscleGroup.LEGS,      "Smith Machine", None),
    ("Leg Press",                     MuscleGroup.LEGS,      "Machine",    None),
    ("Romanian Deadlift",             MuscleGroup.LEGS,      "Barbell",    "Hip hinge, hamstring focus"),
    ("Dumbbell Romanian Deadlift",    MuscleGroup.LEGS,      "Dumbbells",  None),
    ("Leg Curl",                      MuscleGroup.LEGS,      "Machine",    "Hamstring isolation"),
    ("Seated Leg Curl",               MuscleGroup.LEGS,      "Machine",    None),
    ("Nordic Curl",                   MuscleGroup.LEGS,      "Bodyweight", "Eccentric hamstring strength"),
    ("Leg Extension",                 MuscleGroup.LEGS,      "Machine",    "Quad isolation"),
    ("Bulgarian Split Squat",         MuscleGroup.LEGS,      "Dumbbells",  "Rear foot elevated"),
    ("Barbell Bulgarian Split Squat", MuscleGroup.LEGS,      "Barbell",    None),
    ("Lunge",                         MuscleGroup.LEGS,      "Dumbbells",  None),
    ("Walking Lunge",                 MuscleGroup.LEGS,      "Dumbbells",  None),
    ("Reverse Lunge",                 MuscleGroup.LEGS,      "Dumbbells",  "Easier on knees"),
    ("Hack Squat",                    MuscleGroup.LEGS,      "Machine",    None),
    ("Pendulum Squat",                MuscleGroup.LEGS,      "Machine",    None),
    ("Calf Raise (Standing)",         MuscleGroup.LEGS,      "Machine",    None),
    ("Calf Raise (Seated)",           MuscleGroup.LEGS,      "Machine",    "Soleus focus"),
    ("Donkey Calf Raise",             MuscleGroup.LEGS,      "Machine",    None),
    ("Step-Up",                       MuscleGroup.LEGS,      "Dumbbells",  None),
    ("Sissy Squat",                   MuscleGroup.LEGS,      "Bodyweight", "Deep quad stretch"),

    # ── GLUTES ─────────────────────────────────────────────────────────────────
    ("Hip Thrust",                    MuscleGroup.GLUTES,    "Barbell",    "Best glute activator"),
    ("Dumbbell Hip Thrust",           MuscleGroup.GLUTES,    "Dumbbells",  None),
    ("Glute Bridge",                  MuscleGroup.GLUTES,    "Bodyweight", None),
    ("Single-Leg Hip Thrust",         MuscleGroup.GLUTES,    "Bodyweight", None),
    ("Cable Kickback",                MuscleGroup.GLUTES,    "Cable",      None),
    ("Machine Kickback",              MuscleGroup.GLUTES,    "Machine",    None),
    ("Sumo Deadlift",                 MuscleGroup.GLUTES,    "Barbell",    "Wide stance, glute + inner thigh"),
    ("Sumo Squat",                    MuscleGroup.GLUTES,    "Dumbbell",   None),
    ("Donkey Kick",                   MuscleGroup.GLUTES,    "Bodyweight", None),
    ("Abductor Machine",              MuscleGroup.GLUTES,    "Machine",    None),
    ("Adductor Machine",              MuscleGroup.GLUTES,    "Machine",    "Inner thigh / groin"),
    ("Romanian Deadlift (Single Leg)",MuscleGroup.GLUTES,    "Dumbbells",  "Balance + glute stretch"),

    # ── CORE ───────────────────────────────────────────────────────────────────
    ("Plank",                         MuscleGroup.CORE,      "Bodyweight", None),
    ("Side Plank",                    MuscleGroup.CORE,      "Bodyweight", "Oblique focus"),
    ("Crunch",                        MuscleGroup.CORE,      "Bodyweight", None),
    ("Cable Crunch",                  MuscleGroup.CORE,      "Cable",      None),
    ("Hanging Leg Raise",             MuscleGroup.CORE,      "Bodyweight", None),
    ("Hanging Knee Raise",            MuscleGroup.CORE,      "Bodyweight", None),
    ("Ab Wheel Rollout",              MuscleGroup.CORE,      "Equipment",  None),
    ("Russian Twist",                 MuscleGroup.CORE,      "Bodyweight", None),
    ("Decline Sit-Up",                MuscleGroup.CORE,      "Bodyweight", None),
    ("Bicycle Crunch",                MuscleGroup.CORE,      "Bodyweight", "Obliques + rectus abdominis"),
    ("Toe Touch",                     MuscleGroup.CORE,      "Bodyweight", None),
    ("Dead Bug",                      MuscleGroup.CORE,      "Bodyweight", "Stability, lower back safe"),
    ("Pallof Press",                  MuscleGroup.CORE,      "Cable",      "Anti-rotation core stability"),
    ("Landmine Rotation",             MuscleGroup.CORE,      "Barbell",    None),
    ("Wood Chop",                     MuscleGroup.CORE,      "Cable",      "Rotational power"),
    ("L-Sit",                         MuscleGroup.CORE,      "Bodyweight", "Advanced isometric hold"),

    # ── FULL BODY ──────────────────────────────────────────────────────────────
    ("Power Clean",                   MuscleGroup.FULL_BODY, "Barbell",    "Olympic lift"),
    ("Thruster",                      MuscleGroup.FULL_BODY, "Barbell",    "Squat + press"),
    ("Kettlebell Swing",              MuscleGroup.FULL_BODY, "Kettlebell", None),
    ("Kettlebell Clean and Press",    MuscleGroup.FULL_BODY, "Kettlebell", None),
    ("Burpee",                        MuscleGroup.FULL_BODY, "Bodyweight", None),
    ("Clean and Press",               MuscleGroup.FULL_BODY, "Barbell",    None),
    ("Turkish Get-Up",                MuscleGroup.FULL_BODY, "Kettlebell", "Mobility + strength"),
    ("Man Maker",                     MuscleGroup.FULL_BODY, "Dumbbells",  "Row + push-up + clean + press"),

    # ── CARDIO ─────────────────────────────────────────────────────────────────
    ("Treadmill Run",                 MuscleGroup.CARDIO,    "Machine",    None),
    ("Stationary Bike",               MuscleGroup.CARDIO,    "Machine",    None),
    ("Rowing Machine",                MuscleGroup.CARDIO,    "Machine",    None),
    ("Jump Rope",                     MuscleGroup.CARDIO,    "Equipment",  None),
    ("Box Jump",                      MuscleGroup.CARDIO,    "Bodyweight", "Explosive plyometric"),
    ("Battle Ropes",                  MuscleGroup.CARDIO,    "Equipment",  None),
    ("Sled Push",                     MuscleGroup.CARDIO,    "Equipment",  None),
    ("Assault Bike",                  MuscleGroup.CARDIO,    "Machine",    "Upper + lower body cardio"),
]


async def seed_exercises():
    """
    Upsert-by-name: inserts exercises that don't exist yet.
    Safe to add new exercises without clearing the DB.
    """
    async with AsyncSessionLocal() as db:
        # Fetch all existing exercise names in one query
        result = await db.execute(select(Exercise.name))
        existing_names = {row[0] for row in result.all()}

        new_exercises = [
            ex for ex in EXERCISES if ex[0] not in existing_names
        ]

        if not new_exercises:
            return  # nothing to add

        for name, muscle_group, equipment, description in new_exercises:
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
        print(f"[seed] Inserted {len(new_exercises)} new exercises.")
