-- ══════════════════════════════════════════════════════════════
-- GymChad — Phase 2 Tables: Body, Cardio, Activity
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ══════════════════════════════════════════════════════════════

-- Cardio type enum
DO $$ BEGIN CREATE TYPE cardio_type_enum AS ENUM (
  'recumbent_bike','upright_bike','spinning','treadmill','elliptical',
  'rowing','stairmaster','jump_rope','battle_ropes','swimming',
  'walking','hiking','hiit','other'
); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Body measurements (weight, body fat, muscle mass, circumferences)
CREATE TABLE IF NOT EXISTS body_measurements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight_kg FLOAT,
  body_fat_pct FLOAT,
  muscle_mass_kg FLOAT,
  waist_cm FLOAT,
  chest_cm FLOAT,
  left_arm_cm FLOAT,
  right_arm_cm FLOAT,
  left_thigh_cm FLOAT,
  right_thigh_cm FLOAT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bm_user ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_bm_date ON body_measurements(date);

-- Cardio sessions with equipment-specific metrics
CREATE TABLE IF NOT EXISTS cardio_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
  cardio_type cardio_type_enum NOT NULL DEFAULT 'other',
  duration_min FLOAT NOT NULL,
  calories_burned FLOAT,
  -- Treadmill
  speed_kmh FLOAT,
  incline_pct FLOAT,
  -- Bike / Recumbent
  level INTEGER,
  rpm FLOAT,
  -- General
  distance_km FLOAT,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cs_user ON cardio_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_date ON cardio_sessions(date);

-- Daily steps + NEAT tracking
CREATE TABLE IF NOT EXISTS daily_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  calories_from_steps FLOAT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_da_user_date ON daily_activity(user_id, date);
CREATE INDEX IF NOT EXISTS idx_da_user ON daily_activity(user_id);

-- Goal weight for ETA predictions (added Phase 2)
ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_weight_kg FLOAT;

SELECT 'Phase 2 tables created!' as status;
