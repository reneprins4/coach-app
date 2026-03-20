-- 006_expand_exercise_library.sql
-- Expand exercise library to 200+ exercises covering all major muscle groups,
-- equipment types, and difficulty levels.
-- Uses ON CONFLICT to safely upsert without duplicating existing entries.

-- ==========================================================================
-- CHEST (additional exercises, bringing total to 18)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Smith Machine Bench Press', 'chest', 'compound', 'smith_machine', '{chest}', '{triceps,front_delts}', 'beginner', 'mid chest'),
  ('Smith Machine Incline Press', 'chest', 'compound', 'smith_machine', '{chest}', '{triceps,front_delts}', 'beginner', 'upper chest'),
  ('Dumbbell Fly', 'chest', 'isolation', 'dumbbell', '{chest}', '{front_delts}', 'beginner', 'mid chest'),
  ('Incline Dumbbell Fly', 'chest', 'isolation', 'dumbbell', '{chest}', '{front_delts}', 'beginner', 'upper chest'),
  ('Machine Chest Press', 'chest', 'compound', 'machine', '{chest}', '{triceps,front_delts}', 'beginner', 'mid chest'),
  ('Svend Press', 'chest', 'isolation', 'dumbbell', '{chest}', '{front_delts}', 'beginner', 'inner chest')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- BACK (additional exercises, bringing total to 22)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Rack Pull', 'back', 'compound', 'barbell', '{back,glutes}', '{hamstrings,forearms}', 'intermediate', 'upper back'),
  ('Deficit Deadlift', 'back', 'compound', 'barbell', '{back,hamstrings,glutes}', '{core,forearms}', 'advanced', 'posterior chain'),
  ('Cable Row (Wide Grip)', 'back', 'compound', 'cable', '{back}', '{biceps,rear_delts}', 'beginner', 'upper back'),
  ('Single Arm Cable Row', 'back', 'compound', 'cable', '{back}', '{biceps,rear_delts,core}', 'beginner', 'lats'),
  ('Machine Row', 'back', 'compound', 'machine', '{back}', '{biceps,rear_delts}', 'beginner', 'mid back'),
  ('Inverted Row', 'back', 'compound', 'bodyweight', '{back}', '{biceps,rear_delts,core}', 'beginner', 'mid back'),
  ('Kroc Row', 'back', 'compound', 'dumbbell', '{back}', '{biceps,rear_delts,forearms}', 'advanced', 'lats'),
  ('Smith Machine Row', 'back', 'compound', 'smith_machine', '{back}', '{biceps,rear_delts}', 'beginner', 'mid back')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- SHOULDERS (additional exercises, bringing total to 18)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Seated Dumbbell Press', 'shoulders', 'compound', 'dumbbell', '{front_delts,side_delts}', '{triceps}', 'beginner', 'front delts'),
  ('Push Press', 'shoulders', 'compound', 'barbell', '{front_delts,side_delts}', '{triceps,core,quads}', 'intermediate', 'front delts'),
  ('Smith Machine Overhead Press', 'shoulders', 'compound', 'smith_machine', '{front_delts,side_delts}', '{triceps}', 'beginner', 'front delts'),
  ('Dumbbell Front Raise', 'shoulders', 'isolation', 'dumbbell', '{front_delts}', '{}', 'beginner', 'front delts'),
  ('Cable Front Raise', 'shoulders', 'isolation', 'cable', '{front_delts}', '{}', 'beginner', 'front delts'),
  ('Reverse Pec Deck', 'shoulders', 'isolation', 'machine', '{rear_delts}', '{rhomboids}', 'beginner', 'rear delts'),
  ('Dumbbell Shrug', 'shoulders', 'isolation', 'dumbbell', '{traps}', '{side_delts}', 'beginner', 'traps'),
  ('Cable Shrug', 'shoulders', 'isolation', 'cable', '{traps}', '{}', 'beginner', 'traps'),
  ('Kettlebell Overhead Press', 'shoulders', 'compound', 'kettlebell', '{front_delts,side_delts}', '{triceps,core}', 'intermediate', 'front delts'),
  ('Landmine Press', 'shoulders', 'compound', 'barbell', '{front_delts}', '{triceps,core}', 'intermediate', 'front delts'),
  ('Lu Raise', 'shoulders', 'isolation', 'dumbbell', '{side_delts,front_delts}', '{}', 'intermediate', 'all heads'),
  ('Band Pull-Apart', 'shoulders', 'isolation', 'resistance_band', '{rear_delts}', '{rhomboids}', 'beginner', 'rear delts')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- LEGS - QUADS focused (additional exercises, bringing quad total to 18+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Goblet Squat', 'legs', 'compound', 'dumbbell', '{quads,glutes}', '{core}', 'beginner', 'quads'),
  ('Kettlebell Goblet Squat', 'legs', 'compound', 'kettlebell', '{quads,glutes}', '{core}', 'beginner', 'quads'),
  ('Smith Machine Squat', 'legs', 'compound', 'smith_machine', '{quads,glutes}', '{hamstrings}', 'beginner', 'quads'),
  ('Sissy Squat', 'legs', 'isolation', 'bodyweight', '{quads}', '{}', 'advanced', 'quads'),
  ('Step-Up', 'legs', 'compound', 'dumbbell', '{quads,glutes}', '{hamstrings,core}', 'beginner', 'quads'),
  ('Reverse Lunge', 'legs', 'compound', 'dumbbell', '{quads,glutes}', '{hamstrings,core}', 'beginner', 'quads'),
  ('Barbell Lunge', 'legs', 'compound', 'barbell', '{quads,glutes}', '{hamstrings,core}', 'intermediate', 'quads'),
  ('Pendulum Squat', 'legs', 'compound', 'machine', '{quads}', '{glutes}', 'intermediate', 'quads'),
  ('Belt Squat', 'legs', 'compound', 'machine', '{quads,glutes}', '{hamstrings}', 'intermediate', 'quads'),
  ('Cyclist Squat', 'legs', 'compound', 'barbell', '{quads}', '{glutes}', 'intermediate', 'quads'),
  ('Wall Sit', 'legs', 'isolation', 'bodyweight', '{quads}', '{}', 'beginner', 'quads'),
  ('Pistol Squat', 'legs', 'compound', 'bodyweight', '{quads,glutes}', '{hamstrings,core}', 'advanced', 'quads'),
  ('Box Squat', 'legs', 'compound', 'barbell', '{quads,glutes}', '{hamstrings,core}', 'intermediate', 'quads'),
  ('Safety Bar Squat', 'legs', 'compound', 'barbell', '{quads,glutes}', '{hamstrings,core}', 'intermediate', 'quads')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- LEGS - HAMSTRINGS focused (additional exercises, bringing hamstring total to 14+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Stiff Leg Deadlift', 'legs', 'compound', 'barbell', '{hamstrings,glutes}', '{back,core}', 'intermediate', 'hamstrings'),
  ('Dumbbell Romanian Deadlift', 'legs', 'compound', 'dumbbell', '{hamstrings,glutes}', '{back,core}', 'beginner', 'hamstrings'),
  ('Single Leg Romanian Deadlift', 'legs', 'compound', 'dumbbell', '{hamstrings,glutes}', '{core}', 'intermediate', 'hamstrings'),
  ('Kettlebell Swing', 'legs', 'compound', 'kettlebell', '{hamstrings,glutes}', '{core,back}', 'intermediate', 'hamstrings'),
  ('Good Morning', 'legs', 'compound', 'barbell', '{hamstrings,glutes}', '{back,core}', 'intermediate', 'hamstrings'),
  ('Glute Ham Raise', 'legs', 'isolation', 'bodyweight', '{hamstrings,glutes}', '{}', 'advanced', 'hamstrings'),
  ('Slider Leg Curl', 'legs', 'isolation', 'bodyweight', '{hamstrings}', '{glutes}', 'intermediate', 'hamstrings'),
  ('Cable Pull Through', 'legs', 'compound', 'cable', '{hamstrings,glutes}', '{core}', 'beginner', 'hamstrings')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- LEGS - GLUTES focused (additional exercises, bringing glute total to 12+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Barbell Glute Bridge', 'legs', 'compound', 'barbell', '{glutes}', '{hamstrings}', 'intermediate', 'glutes'),
  ('Single Leg Hip Thrust', 'legs', 'compound', 'bodyweight', '{glutes}', '{hamstrings,core}', 'intermediate', 'glutes'),
  ('Cable Hip Abduction', 'legs', 'isolation', 'cable', '{glutes}', '{}', 'beginner', 'glute medius'),
  ('Banded Clamshell', 'legs', 'isolation', 'resistance_band', '{glutes}', '{}', 'beginner', 'glute medius'),
  ('Frog Pump', 'legs', 'isolation', 'bodyweight', '{glutes}', '{}', 'beginner', 'glutes'),
  ('Smith Machine Hip Thrust', 'legs', 'compound', 'smith_machine', '{glutes}', '{hamstrings}', 'beginner', 'glutes'),
  ('Lateral Band Walk', 'legs', 'isolation', 'resistance_band', '{glutes}', '{}', 'beginner', 'glute medius')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- LEGS - CALVES (additional exercises, bringing calf total to 8+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Donkey Calf Raise', 'legs', 'isolation', 'machine', '{calves}', '{}', 'intermediate', 'calves'),
  ('Single Leg Calf Raise', 'legs', 'isolation', 'bodyweight', '{calves}', '{}', 'beginner', 'calves'),
  ('Leg Press Calf Raise', 'legs', 'isolation', 'machine', '{calves}', '{}', 'beginner', 'calves'),
  ('Barbell Calf Raise', 'legs', 'isolation', 'barbell', '{calves}', '{}', 'intermediate', 'calves'),
  ('Smith Machine Calf Raise', 'legs', 'isolation', 'smith_machine', '{calves}', '{}', 'beginner', 'calves'),
  ('Tibialis Raise', 'legs', 'isolation', 'bodyweight', '{tibialis}', '{}', 'beginner', 'tibialis')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- ARMS - BICEPS (additional exercises, bringing bicep total to 14+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Spider Curl', 'arms', 'isolation', 'dumbbell', '{biceps}', '{}', 'intermediate', 'short head'),
  ('Cable Hammer Curl', 'arms', 'isolation', 'cable', '{biceps,brachialis}', '{forearms}', 'beginner', 'brachialis'),
  ('Reverse Barbell Curl', 'arms', 'isolation', 'barbell', '{brachioradialis}', '{biceps,forearms}', 'beginner', 'forearms'),
  ('Machine Preacher Curl', 'arms', 'isolation', 'machine', '{biceps}', '{}', 'beginner', 'short head'),
  ('Bayesian Cable Curl', 'arms', 'isolation', 'cable', '{biceps}', '{}', 'intermediate', 'long head'),
  ('Cross Body Hammer Curl', 'arms', 'isolation', 'dumbbell', '{brachialis}', '{biceps,forearms}', 'beginner', 'brachialis'),
  ('Zottman Curl', 'arms', 'isolation', 'dumbbell', '{biceps,forearms}', '{brachialis}', 'intermediate', 'all heads'),
  ('21s Barbell Curl', 'arms', 'isolation', 'barbell', '{biceps}', '{forearms}', 'intermediate', 'biceps')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- ARMS - TRICEPS (additional exercises, bringing tricep total to 14+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Dip', 'arms', 'compound', 'bodyweight', '{triceps}', '{chest,front_delts}', 'intermediate', 'triceps'),
  ('Overhead Dumbbell Extension', 'arms', 'isolation', 'dumbbell', '{triceps}', '{}', 'beginner', 'long head'),
  ('Cable Overhead Extension', 'arms', 'isolation', 'cable', '{triceps}', '{}', 'beginner', 'long head'),
  ('JM Press', 'arms', 'compound', 'barbell', '{triceps}', '{chest}', 'advanced', 'medial head'),
  ('Bench Dip', 'arms', 'compound', 'bodyweight', '{triceps}', '{chest,front_delts}', 'beginner', 'triceps'),
  ('Single Arm Pushdown', 'arms', 'isolation', 'cable', '{triceps}', '{}', 'beginner', 'lateral head'),
  ('Machine Tricep Extension', 'arms', 'isolation', 'machine', '{triceps}', '{}', 'beginner', 'triceps')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- ARMS - FOREARMS (additional exercises, bringing forearm total to 6+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Wrist Curl', 'arms', 'isolation', 'barbell', '{forearms}', '{}', 'beginner', 'wrist flexors'),
  ('Reverse Wrist Curl', 'arms', 'isolation', 'barbell', '{forearms}', '{}', 'beginner', 'wrist extensors'),
  ('Farmer Walk', 'arms', 'compound', 'dumbbell', '{forearms}', '{traps,core}', 'beginner', 'grip strength'),
  ('Plate Pinch Hold', 'arms', 'isolation', 'dumbbell', '{forearms}', '{}', 'beginner', 'grip strength'),
  ('Dead Hang', 'arms', 'isolation', 'bodyweight', '{forearms}', '{lats,shoulders}', 'beginner', 'grip strength'),
  ('Kettlebell Farmer Walk', 'arms', 'compound', 'kettlebell', '{forearms}', '{traps,core}', 'beginner', 'grip strength')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- CORE (additional exercises, bringing total to 18+)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Cable Woodchop', 'core', 'isolation', 'cable', '{obliques,core}', '{}', 'beginner', 'rotation'),
  ('Decline Sit-Up', 'core', 'isolation', 'bodyweight', '{core}', '{hip_flexors}', 'intermediate', 'rectus abdominis'),
  ('Weighted Plank', 'core', 'isolation', 'bodyweight', '{core}', '{shoulders}', 'intermediate', 'stability'),
  ('Mountain Climber', 'core', 'compound', 'bodyweight', '{core}', '{hip_flexors,shoulders}', 'beginner', 'stability'),
  ('Toe Touch', 'core', 'isolation', 'bodyweight', '{core}', '{}', 'beginner', 'upper abs'),
  ('Flutter Kick', 'core', 'isolation', 'bodyweight', '{core}', '{hip_flexors}', 'beginner', 'lower abs'),
  ('L-Sit Hold', 'core', 'isolation', 'bodyweight', '{core}', '{hip_flexors,triceps}', 'advanced', 'stability'),
  ('Hollow Body Hold', 'core', 'isolation', 'bodyweight', '{core}', '{}', 'intermediate', 'stability'),
  ('Copenhagen Plank', 'core', 'isolation', 'bodyweight', '{obliques,adductors}', '{core}', 'advanced', 'obliques'),
  ('Suitcase Carry', 'core', 'compound', 'dumbbell', '{obliques,core}', '{forearms,traps}', 'intermediate', 'anti-lateral flexion'),
  ('Turkish Get-Up', 'core', 'compound', 'kettlebell', '{core}', '{shoulders,glutes,quads}', 'advanced', 'full body stability'),
  ('Bear Crawl', 'core', 'compound', 'bodyweight', '{core}', '{shoulders,quads}', 'beginner', 'stability'),
  ('Band Anti-Rotation Hold', 'core', 'isolation', 'resistance_band', '{core}', '{obliques}', 'beginner', 'anti-rotation')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- FULL BODY / COMPOUND movements (10 exercises)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Clean and Press', 'shoulders', 'compound', 'barbell', '{front_delts,quads,glutes}', '{triceps,core,back}', 'advanced', 'full body'),
  ('Snatch Grip Deadlift', 'back', 'compound', 'barbell', '{back,hamstrings,glutes}', '{traps,forearms,core}', 'advanced', 'posterior chain'),
  ('Trap Bar Deadlift', 'back', 'compound', 'barbell', '{quads,glutes,back}', '{hamstrings,forearms}', 'intermediate', 'posterior chain'),
  ('Kettlebell Clean', 'shoulders', 'compound', 'kettlebell', '{front_delts,glutes}', '{core,forearms}', 'intermediate', 'full body'),
  ('Kettlebell Snatch', 'shoulders', 'compound', 'kettlebell', '{front_delts,glutes,hamstrings}', '{core,back}', 'advanced', 'full body'),
  ('Thrusters', 'legs', 'compound', 'barbell', '{quads,glutes,front_delts}', '{triceps,core}', 'intermediate', 'full body'),
  ('Man Maker', 'chest', 'compound', 'dumbbell', '{chest,quads,front_delts}', '{triceps,core,back}', 'advanced', 'full body'),
  ('Renegade Row', 'back', 'compound', 'dumbbell', '{back,core}', '{biceps,rear_delts}', 'intermediate', 'anti-rotation'),
  ('Burpee', 'legs', 'compound', 'bodyweight', '{quads,chest}', '{core,triceps,front_delts}', 'beginner', 'full body'),
  ('Battle Rope Slam', 'shoulders', 'compound', 'cable', '{front_delts,core}', '{back,arms}', 'intermediate', 'conditioning')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- MACHINE-SPECIFIC exercises (additional variety)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Machine Lat Pulldown', 'back', 'compound', 'machine', '{back}', '{biceps}', 'beginner', 'lats'),
  ('Machine Chest Fly', 'chest', 'isolation', 'machine', '{chest}', '{front_delts}', 'beginner', 'mid chest'),
  ('Machine Leg Press (Narrow)', 'legs', 'compound', 'machine', '{quads}', '{glutes}', 'beginner', 'quads'),
  ('Machine Leg Press (Wide)', 'legs', 'compound', 'machine', '{glutes,quads}', '{hamstrings}', 'beginner', 'glutes'),
  ('Smith Machine Lunge', 'legs', 'compound', 'smith_machine', '{quads,glutes}', '{hamstrings,core}', 'beginner', 'quads'),
  ('Machine Hip Thrust', 'legs', 'compound', 'machine', '{glutes}', '{hamstrings}', 'beginner', 'glutes'),
  ('Machine Rear Delt Fly', 'shoulders', 'isolation', 'machine', '{rear_delts}', '{rhomboids}', 'beginner', 'rear delts'),
  ('Machine Bicep Curl', 'arms', 'isolation', 'machine', '{biceps}', '{}', 'beginner', 'biceps'),
  ('Smith Machine Close Grip Press', 'arms', 'compound', 'smith_machine', '{triceps}', '{chest,front_delts}', 'beginner', 'triceps'),
  ('Machine Abdominal Crunch', 'core', 'isolation', 'machine', '{core}', '{}', 'beginner', 'rectus abdominis'),
  ('Hip Adduction Machine', 'legs', 'isolation', 'machine', '{adductors}', '{}', 'beginner', 'inner thigh'),
  ('Hip Abduction Machine', 'legs', 'isolation', 'machine', '{glutes}', '{}', 'beginner', 'glute medius')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- CABLE-SPECIFIC exercises (additional variety)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Cable Crossover', 'chest', 'isolation', 'cable', '{chest}', '{front_delts}', 'beginner', 'inner chest'),
  ('Cable Upright Row', 'shoulders', 'compound', 'cable', '{side_delts,traps}', '{biceps}', 'intermediate', 'side delts'),
  ('Cable Face Pull (Rope)', 'shoulders', 'isolation', 'cable', '{rear_delts}', '{rhomboids,external_rotators}', 'beginner', 'rear delts'),
  ('Cable Reverse Fly', 'back', 'isolation', 'cable', '{rear_delts}', '{rhomboids}', 'beginner', 'rear delts'),
  ('Cable Lat Prayer', 'back', 'isolation', 'cable', '{back}', '{}', 'intermediate', 'lats')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- KETTLEBELL exercises (additional variety)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Kettlebell Front Squat', 'legs', 'compound', 'kettlebell', '{quads,glutes}', '{core}', 'intermediate', 'quads'),
  ('Kettlebell Windmill', 'core', 'compound', 'kettlebell', '{obliques,core}', '{shoulders,hamstrings}', 'intermediate', 'obliques'),
  ('Kettlebell Row', 'back', 'compound', 'kettlebell', '{back}', '{biceps,rear_delts}', 'beginner', 'lats'),
  ('Kettlebell Deadlift', 'legs', 'compound', 'kettlebell', '{hamstrings,glutes}', '{back,core}', 'beginner', 'hamstrings'),
  ('Kettlebell Sumo Squat', 'legs', 'compound', 'kettlebell', '{quads,glutes}', '{hamstrings,core}', 'beginner', 'quads'),
  ('Kettlebell Floor Press', 'chest', 'compound', 'kettlebell', '{chest}', '{triceps,front_delts}', 'intermediate', 'mid chest'),
  ('Kettlebell Halo', 'shoulders', 'isolation', 'kettlebell', '{side_delts}', '{core,traps}', 'beginner', 'shoulder mobility')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- RESISTANCE BAND exercises (additional variety)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Band Squat', 'legs', 'compound', 'resistance_band', '{quads,glutes}', '{hamstrings}', 'beginner', 'quads'),
  ('Band Chest Press', 'chest', 'compound', 'resistance_band', '{chest}', '{triceps,front_delts}', 'beginner', 'mid chest'),
  ('Band Row', 'back', 'compound', 'resistance_band', '{back}', '{biceps,rear_delts}', 'beginner', 'mid back'),
  ('Band Lateral Raise', 'shoulders', 'isolation', 'resistance_band', '{side_delts}', '{}', 'beginner', 'side delts'),
  ('Band Curl', 'arms', 'isolation', 'resistance_band', '{biceps}', '{forearms}', 'beginner', 'biceps'),
  ('Band Tricep Extension', 'arms', 'isolation', 'resistance_band', '{triceps}', '{}', 'beginner', 'triceps'),
  ('Band Good Morning', 'legs', 'compound', 'resistance_band', '{hamstrings,glutes}', '{back,core}', 'beginner', 'hamstrings'),
  ('Band Face Pull', 'shoulders', 'isolation', 'resistance_band', '{rear_delts}', '{rhomboids}', 'beginner', 'rear delts'),
  ('Band Hip Thrust', 'legs', 'compound', 'resistance_band', '{glutes}', '{hamstrings}', 'beginner', 'glutes'),
  ('Band Leg Curl', 'legs', 'isolation', 'resistance_band', '{hamstrings}', '{}', 'beginner', 'hamstrings')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;

-- ==========================================================================
-- BODYWEIGHT exercises (additional variety)
-- ==========================================================================
INSERT INTO exercises (name, muscle_group, category, equipment, primary_muscles, secondary_muscles, difficulty, subfocus)
VALUES
  ('Wide Push-up', 'chest', 'compound', 'bodyweight', '{chest}', '{triceps,front_delts}', 'beginner', 'outer chest'),
  ('Decline Push-up', 'chest', 'compound', 'bodyweight', '{chest}', '{triceps,front_delts}', 'intermediate', 'upper chest'),
  ('Archer Push-up', 'chest', 'compound', 'bodyweight', '{chest}', '{triceps,front_delts,core}', 'advanced', 'unilateral'),
  ('Pike Push-up', 'shoulders', 'compound', 'bodyweight', '{front_delts,side_delts}', '{triceps}', 'intermediate', 'front delts'),
  ('Handstand Push-up', 'shoulders', 'compound', 'bodyweight', '{front_delts,side_delts}', '{triceps,core}', 'advanced', 'front delts'),
  ('Muscle Up', 'back', 'compound', 'bodyweight', '{back,chest}', '{biceps,triceps,core}', 'advanced', 'lats'),
  ('Bodyweight Squat', 'legs', 'compound', 'bodyweight', '{quads,glutes}', '{hamstrings}', 'beginner', 'quads'),
  ('Jump Squat', 'legs', 'compound', 'bodyweight', '{quads,glutes}', '{calves,core}', 'intermediate', 'quads'),
  ('Box Jump', 'legs', 'compound', 'bodyweight', '{quads,glutes}', '{calves,hamstrings}', 'intermediate', 'power'),
  ('Cossack Squat', 'legs', 'compound', 'bodyweight', '{quads,glutes}', '{adductors,hamstrings}', 'intermediate', 'mobility'),
  ('Commando Pull-up', 'back', 'compound', 'bodyweight', '{back}', '{biceps,core}', 'advanced', 'lats'),
  ('Hanging Knee Raise', 'core', 'isolation', 'bodyweight', '{core}', '{hip_flexors}', 'beginner', 'lower abs')
ON CONFLICT (name) DO UPDATE SET
  equipment = EXCLUDED.equipment,
  primary_muscles = EXCLUDED.primary_muscles,
  secondary_muscles = EXCLUDED.secondary_muscles,
  difficulty = EXCLUDED.difficulty,
  subfocus = EXCLUDED.subfocus,
  muscle_group = EXCLUDED.muscle_group,
  category = EXCLUDED.category;
