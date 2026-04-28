-- ═══════════════════════════════════════════════════════════════
-- GymChad — Full Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- ── Enum types ────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE goal_enum AS ENUM ('CUTTING','BULKING','MAINTENANCE'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE activity_enum AS ENUM ('sedentary','light','moderate','active','very_active'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE sex_enum AS ENUM ('male','female'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE plan_enum AS ENUM ('FREE','PRO'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE muscle_enum AS ENUM ('CHEST','BACK','SHOULDERS','BICEPS','TRICEPS','LEGS','GLUTES','CORE','CARDIO','FULL_BODY'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE meal_enum AS ENUM ('BREAKFAST','LUNCH','DINNER','SNACK','PRE_WORKOUT','POST_WORKOUT'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  supabase_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  goal goal_enum DEFAULT 'MAINTENANCE',
  activity_level activity_enum DEFAULT 'moderate',
  sex sex_enum,
  weight_kg FLOAT,
  height_cm FLOAT,
  age INTEGER,
  calorie_target INTEGER,
  protein_target INTEGER,
  carbs_target INTEGER,
  fat_target INTEGER,
  use_kg BOOLEAN DEFAULT TRUE,
  plan plan_enum DEFAULT 'FREE',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_supabase_id ON users(supabase_id);

-- ── Exercises ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group muscle_enum NOT NULL,
  is_custom BOOLEAN DEFAULT FALSE,
  user_id TEXT,
  description TEXT,
  equipment TEXT
);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);
CREATE INDEX IF NOT EXISTS idx_exercises_user ON exercises(user_id);

-- ── Splits ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS splits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_splits_user ON splits(user_id);

CREATE TABLE IF NOT EXISTS split_days (
  id TEXT PRIMARY KEY,
  split_id TEXT NOT NULL REFERENCES splits(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  label TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_split_days_split ON split_days(split_id);

CREATE TABLE IF NOT EXISTS split_day_exercises (
  id TEXT PRIMARY KEY,
  split_day_id TEXT NOT NULL REFERENCES split_days(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  "order" INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER,
  target_reps_min INTEGER,
  target_reps_max INTEGER,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_sde_day ON split_day_exercises(split_day_id);

-- ── Workouts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  split_day_id TEXT REFERENCES split_days(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  date TIMESTAMP DEFAULT now(),
  notes TEXT,
  duration_min INTEGER
);
CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg FLOAT NOT NULL DEFAULT 0,
  rpe INTEGER,
  is_warmup BOOLEAN DEFAULT FALSE,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_ws_workout ON workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_ws_exercise ON workout_sets(exercise_id);

-- ── Nutrition ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type meal_enum NOT NULL,
  food_name TEXT NOT NULL,
  food_id TEXT,
  quantity_g FLOAT NOT NULL,
  calories FLOAT NOT NULL,
  protein_g FLOAT NOT NULL,
  carbs_g FLOAT NOT NULL,
  fat_g FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nl_user ON nutrition_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_nl_date ON nutrition_logs(date);

CREATE TABLE IF NOT EXISTS custom_foods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  calories_per_100g FLOAT NOT NULL,
  protein_per_100g FLOAT NOT NULL,
  carbs_per_100g FLOAT NOT NULL,
  fat_per_100g FLOAT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cf_user ON custom_foods(user_id);

-- ── AI Sessions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_user ON ai_sessions(user_id);

-- ── Exercise Library (80+ exercises) ──────────────────────────
INSERT INTO exercises (id, name, muscle_group, is_custom, equipment) VALUES
-- CHEST
(gen_random_uuid()::text,'Barbell Bench Press','CHEST',false,'Barbell'),
(gen_random_uuid()::text,'Incline Barbell Bench Press','CHEST',false,'Barbell'),
(gen_random_uuid()::text,'Decline Barbell Bench Press','CHEST',false,'Barbell'),
(gen_random_uuid()::text,'Dumbbell Bench Press','CHEST',false,'Dumbbell'),
(gen_random_uuid()::text,'Incline Dumbbell Press','CHEST',false,'Dumbbell'),
(gen_random_uuid()::text,'Dumbbell Fly','CHEST',false,'Dumbbell'),
(gen_random_uuid()::text,'Cable Fly','CHEST',false,'Cable'),
(gen_random_uuid()::text,'Pec Deck (Machine Fly)','CHEST',false,'Machine'),
(gen_random_uuid()::text,'Dips (Chest)','CHEST',false,'Bodyweight'),
(gen_random_uuid()::text,'Push-Up','CHEST',false,'Bodyweight'),
-- BACK
(gen_random_uuid()::text,'Deadlift','BACK',false,'Barbell'),
(gen_random_uuid()::text,'Barbell Row','BACK',false,'Barbell'),
(gen_random_uuid()::text,'T-Bar Row','BACK',false,'Barbell'),
(gen_random_uuid()::text,'Pull-Up','BACK',false,'Bodyweight'),
(gen_random_uuid()::text,'Chin-Up','BACK',false,'Bodyweight'),
(gen_random_uuid()::text,'Lat Pulldown','BACK',false,'Cable'),
(gen_random_uuid()::text,'Seated Cable Row','BACK',false,'Cable'),
(gen_random_uuid()::text,'Single-Arm Dumbbell Row','BACK',false,'Dumbbell'),
(gen_random_uuid()::text,'Cable Straight-Arm Pulldown','BACK',false,'Cable'),
(gen_random_uuid()::text,'Rack Pull','BACK',false,'Barbell'),
-- SHOULDERS
(gen_random_uuid()::text,'Overhead Press (Barbell)','SHOULDERS',false,'Barbell'),
(gen_random_uuid()::text,'Seated Dumbbell Press','SHOULDERS',false,'Dumbbell'),
(gen_random_uuid()::text,'Arnold Press','SHOULDERS',false,'Dumbbell'),
(gen_random_uuid()::text,'Lateral Raise','SHOULDERS',false,'Dumbbell'),
(gen_random_uuid()::text,'Cable Lateral Raise','SHOULDERS',false,'Cable'),
(gen_random_uuid()::text,'Face Pull','SHOULDERS',false,'Cable'),
(gen_random_uuid()::text,'Rear Delt Fly','SHOULDERS',false,'Dumbbell'),
(gen_random_uuid()::text,'Upright Row','SHOULDERS',false,'Barbell'),
(gen_random_uuid()::text,'Machine Shoulder Press','SHOULDERS',false,'Machine'),
-- BICEPS
(gen_random_uuid()::text,'Barbell Curl','BICEPS',false,'Barbell'),
(gen_random_uuid()::text,'Dumbbell Curl','BICEPS',false,'Dumbbell'),
(gen_random_uuid()::text,'Hammer Curl','BICEPS',false,'Dumbbell'),
(gen_random_uuid()::text,'Incline Dumbbell Curl','BICEPS',false,'Dumbbell'),
(gen_random_uuid()::text,'Cable Curl','BICEPS',false,'Cable'),
(gen_random_uuid()::text,'Preacher Curl','BICEPS',false,'Barbell'),
(gen_random_uuid()::text,'Spider Curl','BICEPS',false,'Dumbbell'),
(gen_random_uuid()::text,'Concentration Curl','BICEPS',false,'Dumbbell'),
-- TRICEPS
(gen_random_uuid()::text,'Tricep Pushdown (Cable)','TRICEPS',false,'Cable'),
(gen_random_uuid()::text,'Overhead Tricep Extension','TRICEPS',false,'Dumbbell'),
(gen_random_uuid()::text,'Skull Crusher','TRICEPS',false,'Barbell'),
(gen_random_uuid()::text,'Close-Grip Bench Press','TRICEPS',false,'Barbell'),
(gen_random_uuid()::text,'Dips (Triceps)','TRICEPS',false,'Bodyweight'),
(gen_random_uuid()::text,'Diamond Push-Up','TRICEPS',false,'Bodyweight'),
(gen_random_uuid()::text,'Rope Pushdown','TRICEPS',false,'Cable'),
-- LEGS
(gen_random_uuid()::text,'Barbell Squat','LEGS',false,'Barbell'),
(gen_random_uuid()::text,'Front Squat','LEGS',false,'Barbell'),
(gen_random_uuid()::text,'Hack Squat','LEGS',false,'Machine'),
(gen_random_uuid()::text,'Leg Press','LEGS',false,'Machine'),
(gen_random_uuid()::text,'Bulgarian Split Squat','LEGS',false,'Dumbbell'),
(gen_random_uuid()::text,'Romanian Deadlift','LEGS',false,'Barbell'),
(gen_random_uuid()::text,'Leg Curl (Lying)','LEGS',false,'Machine'),
(gen_random_uuid()::text,'Leg Curl (Seated)','LEGS',false,'Machine'),
(gen_random_uuid()::text,'Leg Extension','LEGS',false,'Machine'),
(gen_random_uuid()::text,'Goblet Squat','LEGS',false,'Dumbbell'),
(gen_random_uuid()::text,'Walking Lunges','LEGS',false,'Dumbbell'),
(gen_random_uuid()::text,'Calf Raise (Standing)','LEGS',false,'Machine'),
(gen_random_uuid()::text,'Calf Raise (Seated)','LEGS',false,'Machine'),
-- GLUTES
(gen_random_uuid()::text,'Hip Thrust (Barbell)','GLUTES',false,'Barbell'),
(gen_random_uuid()::text,'Hip Thrust (Machine)','GLUTES',false,'Machine'),
(gen_random_uuid()::text,'Cable Kickback','GLUTES',false,'Cable'),
(gen_random_uuid()::text,'Glute Bridge','GLUTES',false,'Bodyweight'),
(gen_random_uuid()::text,'Abductor Machine','GLUTES',false,'Machine'),
-- CORE
(gen_random_uuid()::text,'Plank','CORE',false,'Bodyweight'),
(gen_random_uuid()::text,'Cable Crunch','CORE',false,'Cable'),
(gen_random_uuid()::text,'Hanging Leg Raise','CORE',false,'Bodyweight'),
(gen_random_uuid()::text,'Ab Rollout','CORE',false,'Equipment'),
(gen_random_uuid()::text,'Russian Twist','CORE',false,'Bodyweight'),
(gen_random_uuid()::text,'Crunch','CORE',false,'Bodyweight'),
(gen_random_uuid()::text,'Decline Sit-Up','CORE',false,'Bodyweight'),
(gen_random_uuid()::text,'Woodchopper','CORE',false,'Cable'),
-- CARDIO
(gen_random_uuid()::text,'Treadmill Run','CARDIO',false,'Machine'),
(gen_random_uuid()::text,'Stationary Bike','CARDIO',false,'Machine'),
(gen_random_uuid()::text,'Rowing Machine','CARDIO',false,'Machine'),
(gen_random_uuid()::text,'Stairmaster','CARDIO',false,'Machine'),
(gen_random_uuid()::text,'Elliptical','CARDIO',false,'Machine'),
(gen_random_uuid()::text,'Battle Ropes','CARDIO',false,'Equipment'),
(gen_random_uuid()::text,'Jump Rope','CARDIO',false,'Equipment'),
-- FULL BODY
(gen_random_uuid()::text,'Barbell Clean','FULL_BODY',false,'Barbell'),
(gen_random_uuid()::text,'Power Clean','FULL_BODY',false,'Barbell'),
(gen_random_uuid()::text,'Kettlebell Swing','FULL_BODY',false,'Kettlebell'),
(gen_random_uuid()::text,'Thruster','FULL_BODY',false,'Barbell'),
(gen_random_uuid()::text,'Burpee','FULL_BODY',false,'Bodyweight'),
(gen_random_uuid()::text,'Turkish Get-Up','FULL_BODY',false,'Kettlebell')
ON CONFLICT DO NOTHING;

SELECT 'GymChad database ready! Tables: ' || count(*)::text || ' exercises loaded'
FROM exercises;
