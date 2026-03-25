-- 009_add_missing_local_pool_exercises.sql
-- Add exercises from local pool that may be missing from the exercises table.
-- Uses simple INSERT with name-uniqueness guard.

-- First add a unique constraint on name if it doesn't exist
DO $$ BEGIN
  ALTER TABLE exercises ADD CONSTRAINT exercises_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Glutes
INSERT INTO exercises (name, muscle_group, category, equipment, is_compound) VALUES
  ('Barbell Glute Bridge', 'legs', 'compound', 'barbell', true),
  ('Single Leg Hip Thrust', 'legs', 'compound', 'bodyweight', true),
  ('Sumo Deadlift', 'legs', 'compound', 'barbell', true)
ON CONFLICT (name) DO NOTHING;

-- Core
INSERT INTO exercises (name, muscle_group, category, equipment, is_compound) VALUES
  ('Pallof Press', 'core', 'isolation', 'cable', false),
  ('Dead Bug', 'core', 'isolation', 'bodyweight', false)
ON CONFLICT (name) DO NOTHING;

-- Biceps
INSERT INTO exercises (name, muscle_group, category, equipment, is_compound) VALUES
  ('Concentration Curl', 'arms', 'isolation', 'dumbbell', false),
  ('Preacher Curl', 'arms', 'isolation', 'barbell', false)
ON CONFLICT (name) DO NOTHING;
