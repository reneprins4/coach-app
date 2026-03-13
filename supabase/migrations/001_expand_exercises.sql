-- 001_expand_exercises.sql
-- Expand exercises table with equipment, primary/secondary muscles, difficulty, subfocus

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment text DEFAULT 'bodyweight';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS primary_muscles text[] DEFAULT '{}';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles text[] DEFAULT '{}';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'beginner';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS subfocus text;

-- ==========================================================================
-- CHEST (12 exercises)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Flat Barbell Bench Press', 'chest', 'compound', 'barbell', '{chest}', '{triceps,front_delts}', 'intermediate', 'mid chest'),
  ('Incline Barbell Bench Press', 'chest', 'compound', 'barbell', '{chest}', '{triceps,front_delts}', 'intermediate', 'upper chest'),
  ('Decline Barbell Bench Press', 'chest', 'compound', 'barbell', '{chest}', '{triceps,front_delts}', 'intermediate', 'lower chest'),
  ('Flat Dumbbell Bench Press', 'chest', 'compound', 'dumbbell', '{chest}', '{triceps,front_delts}', 'beginner', 'mid chest'),
  ('Incline Dumbbell Press', 'chest', 'compound', 'dumbbell', '{chest}', '{triceps,front_delts}', 'beginner', 'upper chest'),
  ('Decline Dumbbell Press', 'chest', 'compound', 'dumbbell', '{chest}', '{triceps,front_delts}', 'beginner', 'lower chest'),
  ('Cable Fly (High)', 'chest', 'isolation', 'cable', '{chest}', '{front_delts}', 'beginner', 'lower chest'),
  ('Cable Fly (Mid)', 'chest', 'isolation', 'cable', '{chest}', '{front_delts}', 'beginner', 'mid chest'),
  ('Cable Fly (Low)', 'chest', 'isolation', 'cable', '{chest}', '{front_delts}', 'beginner', 'upper chest'),
  ('Pec Deck', 'chest', 'isolation', 'machine', '{chest}', '{front_delts}', 'beginner', 'mid chest'),
  ('Push-up', 'chest', 'compound', 'bodyweight', '{chest}', '{triceps,front_delts,core}', 'beginner', 'mid chest'),
  ('Chest Dip', 'chest', 'compound', 'bodyweight', '{chest}', '{triceps,front_delts}', 'intermediate', 'lower chest')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- BACK (14 exercises)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Conventional Deadlift', 'back', 'compound', 'barbell', '{back,hamstrings,glutes}', '{core,forearms}', 'advanced', 'posterior chain'),
  ('Barbell Row', 'back', 'compound', 'barbell', '{back}', '{biceps,rear_delts}', 'intermediate', 'mid back'),
  ('Pendlay Row', 'back', 'compound', 'barbell', '{back}', '{biceps,rear_delts,core}', 'intermediate', 'mid back'),
  ('T-Bar Row', 'back', 'compound', 'barbell', '{back}', '{biceps,rear_delts}', 'intermediate', 'mid back'),
  ('Seated Cable Row', 'back', 'compound', 'cable', '{back}', '{biceps,rear_delts}', 'beginner', 'mid back'),
  ('Dumbbell Row', 'back', 'compound', 'dumbbell', '{back}', '{biceps,rear_delts}', 'beginner', 'lats'),
  ('Chest Supported Row', 'back', 'compound', 'dumbbell', '{back}', '{biceps,rear_delts}', 'beginner', 'mid back'),
  ('Pull-up', 'back', 'compound', 'bodyweight', '{back}', '{biceps,core}', 'intermediate', 'lats'),
  ('Chin-up', 'back', 'compound', 'bodyweight', '{back,biceps}', '{core}', 'intermediate', 'lats'),
  ('Lat Pulldown (Wide)', 'back', 'compound', 'cable', '{back}', '{biceps}', 'beginner', 'lats'),
  ('Lat Pulldown (Close)', 'back', 'compound', 'cable', '{back}', '{biceps}', 'beginner', 'lats'),
  ('Straight Arm Pulldown', 'back', 'isolation', 'cable', '{back}', '{triceps_long}', 'beginner', 'lats'),
  ('Hyperextension', 'back', 'isolation', 'bodyweight', '{back,glutes}', '{hamstrings}', 'beginner', 'lower back'),
  ('Meadows Row', 'back', 'compound', 'barbell', '{back}', '{biceps,rear_delts}', 'advanced', 'lats')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- SHOULDERS (9 exercises)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Barbell Overhead Press', 'shoulders', 'compound', 'barbell', '{front_delts,side_delts}', '{triceps,core}', 'intermediate', 'front delts'),
  ('Dumbbell Overhead Press', 'shoulders', 'compound', 'dumbbell', '{front_delts,side_delts}', '{triceps}', 'beginner', 'front delts'),
  ('Arnold Press', 'shoulders', 'compound', 'dumbbell', '{front_delts,side_delts}', '{triceps}', 'intermediate', 'all heads'),
  ('Lateral Raise', 'shoulders', 'isolation', 'dumbbell', '{side_delts}', '{}', 'beginner', 'side delts'),
  ('Cable Lateral Raise', 'shoulders', 'isolation', 'cable', '{side_delts}', '{}', 'beginner', 'side delts'),
  ('Face Pull', 'shoulders', 'isolation', 'cable', '{rear_delts}', '{rhomboids,external_rotators}', 'beginner', 'rear delts'),
  ('Rear Delt Fly', 'shoulders', 'isolation', 'dumbbell', '{rear_delts}', '{rhomboids}', 'beginner', 'rear delts'),
  ('Upright Row', 'shoulders', 'compound', 'barbell', '{side_delts,traps}', '{biceps}', 'intermediate', 'side delts'),
  ('Machine Shoulder Press', 'shoulders', 'compound', 'machine', '{front_delts,side_delts}', '{triceps}', 'beginner', 'front delts')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- LEGS (17 exercises)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Back Squat', 'legs', 'compound', 'barbell', '{quads,glutes}', '{hamstrings,core}', 'intermediate', 'quads'),
  ('Front Squat', 'legs', 'compound', 'barbell', '{quads}', '{glutes,core}', 'advanced', 'quads'),
  ('Bulgarian Split Squat', 'legs', 'compound', 'dumbbell', '{quads,glutes}', '{hamstrings,core}', 'intermediate', 'quads'),
  ('Leg Press', 'legs', 'compound', 'machine', '{quads,glutes}', '{hamstrings}', 'beginner', 'quads'),
  ('Hack Squat', 'legs', 'compound', 'machine', '{quads}', '{glutes}', 'beginner', 'quads'),
  ('Walking Lunges', 'legs', 'compound', 'dumbbell', '{quads,glutes}', '{hamstrings,core}', 'beginner', 'quads'),
  ('Hip Thrust', 'legs', 'compound', 'barbell', '{glutes}', '{hamstrings}', 'intermediate', 'glutes'),
  ('Romanian Deadlift', 'legs', 'compound', 'barbell', '{hamstrings,glutes}', '{back,core}', 'intermediate', 'hamstrings'),
  ('Lying Leg Curl', 'legs', 'isolation', 'machine', '{hamstrings}', '{}', 'beginner', 'hamstrings'),
  ('Seated Leg Curl', 'legs', 'isolation', 'machine', '{hamstrings}', '{}', 'beginner', 'hamstrings'),
  ('Nordic Curl', 'legs', 'isolation', 'bodyweight', '{hamstrings}', '{}', 'advanced', 'hamstrings'),
  ('Leg Extension', 'legs', 'isolation', 'machine', '{quads}', '{}', 'beginner', 'quads'),
  ('Standing Calf Raise', 'legs', 'isolation', 'machine', '{calves}', '{}', 'beginner', 'calves'),
  ('Seated Calf Raise', 'legs', 'isolation', 'machine', '{calves}', '{}', 'beginner', 'calves'),
  ('Sumo Deadlift', 'legs', 'compound', 'barbell', '{glutes,quads}', '{hamstrings,back,core}', 'advanced', 'glutes'),
  ('Glute Bridge', 'legs', 'compound', 'bodyweight', '{glutes}', '{hamstrings}', 'beginner', 'glutes'),
  ('Cable Kickback', 'legs', 'isolation', 'cable', '{glutes}', '{}', 'beginner', 'glutes')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- ARMS (14 exercises)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Barbell Curl', 'arms', 'isolation', 'barbell', '{biceps}', '{forearms}', 'beginner', 'biceps'),
  ('EZ-Bar Curl', 'arms', 'isolation', 'barbell', '{biceps}', '{forearms}', 'beginner', 'biceps'),
  ('Dumbbell Curl', 'arms', 'isolation', 'dumbbell', '{biceps}', '{forearms}', 'beginner', 'biceps'),
  ('Hammer Curl', 'arms', 'isolation', 'dumbbell', '{biceps,brachialis}', '{forearms}', 'beginner', 'brachialis'),
  ('Incline Dumbbell Curl', 'arms', 'isolation', 'dumbbell', '{biceps}', '{}', 'intermediate', 'long head'),
  ('Cable Curl', 'arms', 'isolation', 'cable', '{biceps}', '{forearms}', 'beginner', 'biceps'),
  ('Preacher Curl', 'arms', 'isolation', 'barbell', '{biceps}', '{}', 'beginner', 'short head'),
  ('Concentration Curl', 'arms', 'isolation', 'dumbbell', '{biceps}', '{}', 'beginner', 'peak'),
  ('Tricep Pushdown', 'arms', 'isolation', 'cable', '{triceps}', '{}', 'beginner', 'lateral head'),
  ('Overhead Tricep Extension', 'arms', 'isolation', 'cable', '{triceps}', '{}', 'beginner', 'long head'),
  ('Skull Crusher', 'arms', 'isolation', 'barbell', '{triceps}', '{}', 'intermediate', 'long head'),
  ('Close Grip Bench Press', 'arms', 'compound', 'barbell', '{triceps}', '{chest,front_delts}', 'intermediate', 'triceps'),
  ('Tricep Kickback', 'arms', 'isolation', 'dumbbell', '{triceps}', '{}', 'beginner', 'lateral head'),
  ('Diamond Push-up', 'arms', 'compound', 'bodyweight', '{triceps}', '{chest}', 'intermediate', 'triceps')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- CORE (8 exercises)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Plank', 'core', 'isolation', 'bodyweight', '{core}', '{shoulders}', 'beginner', 'stability'),
  ('Ab Wheel Rollout', 'core', 'isolation', 'bodyweight', '{core}', '{lats,shoulders}', 'intermediate', 'rectus abdominis'),
  ('Cable Crunch', 'core', 'isolation', 'cable', '{core}', '{}', 'beginner', 'rectus abdominis'),
  ('Hanging Leg Raise', 'core', 'isolation', 'bodyweight', '{core}', '{hip_flexors}', 'intermediate', 'lower abs'),
  ('Pallof Press', 'core', 'isolation', 'cable', '{core}', '{obliques}', 'beginner', 'anti-rotation'),
  ('Dead Bug', 'core', 'isolation', 'bodyweight', '{core}', '{hip_flexors}', 'beginner', 'stability'),
  ('Side Plank', 'core', 'isolation', 'bodyweight', '{obliques}', '{core}', 'beginner', 'obliques'),
  ('Russian Twist', 'core', 'isolation', 'bodyweight', '{obliques,core}', '{}', 'beginner', 'rotation')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- Remove old generic exercises that are now replaced
DELETE FROM exercises WHERE name IN ('Bench Press', 'Squat', 'Deadlift', 'Overhead Press')
  AND NOT EXISTS (SELECT 1 FROM sets WHERE exercise = exercises.name);
