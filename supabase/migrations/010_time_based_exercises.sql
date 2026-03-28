-- Add duration_seconds to sets table
ALTER TABLE sets ADD COLUMN IF NOT EXISTS duration_seconds integer;

-- Make reps nullable (was NOT NULL)
ALTER TABLE sets ALTER COLUMN reps DROP NOT NULL;

-- Ensure every set has at least reps or duration
ALTER TABLE sets ADD CONSTRAINT sets_reps_or_duration
  CHECK (reps IS NOT NULL OR duration_seconds IS NOT NULL);

-- Add exercise_type to exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_type text NOT NULL DEFAULT 'reps';

-- Set known time-based exercises
UPDATE exercises SET exercise_type = 'time'
WHERE name IN ('Plank', 'Copenhagen Plank', 'Side Plank', 'Hollow Body Hold', 'L-Sit', 'Dead Bug');
