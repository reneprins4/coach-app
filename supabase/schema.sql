-- Coach App Database Schema
-- Run this in the Supabase SQL Editor to set up your tables.

-- ============================================================
-- Exercises: library of available exercises
-- ============================================================
create table if not exists exercises (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  muscle_group text not null,          -- e.g. 'chest', 'back', 'legs', 'shoulders', 'arms', 'core'
  category    text not null,           -- e.g. 'compound', 'isolation', 'cardio', 'bodyweight'
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Workouts: a training session belonging to a user
-- ============================================================
create table if not exists workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Sets: individual sets within a workout
-- ============================================================
create table if not exists sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references workouts(id) on delete cascade,
  exercise    text not null,           -- exercise name (denormalized for flexibility)
  weight_kg   numeric(6,2),
  reps        integer not null,
  rpe         numeric(3,1),            -- rate of perceived exertion (1-10)
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_workouts_user_id on workouts(user_id);
create index if not exists idx_workouts_created_at on workouts(created_at desc);
create index if not exists idx_sets_workout_id on sets(workout_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table workouts enable row level security;
alter table sets enable row level security;

-- Users can only see/modify their own workouts
create policy "Users manage own workouts"
  on workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see/modify sets in their own workouts
create policy "Users manage own sets"
  on sets for all
  using (
    exists (
      select 1 from workouts w
      where w.id = sets.workout_id
      and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workouts w
      where w.id = sets.workout_id
      and w.user_id = auth.uid()
    )
  );

-- Exercises are readable by everyone (public library)
alter table exercises enable row level security;
create policy "Exercises are public"
  on exercises for select
  using (true);

-- ============================================================
-- Seed data: common exercises
-- ============================================================
insert into exercises (name, muscle_group, category) values
  ('Bench Press',       'chest',     'compound'),
  ('Squat',             'legs',      'compound'),
  ('Deadlift',          'back',      'compound'),
  ('Overhead Press',    'shoulders', 'compound'),
  ('Barbell Row',       'back',      'compound'),
  ('Pull-up',           'back',      'bodyweight'),
  ('Dumbbell Curl',     'arms',      'isolation'),
  ('Tricep Pushdown',   'arms',      'isolation'),
  ('Leg Press',         'legs',      'compound'),
  ('Romanian Deadlift', 'legs',      'compound'),
  ('Lateral Raise',     'shoulders', 'isolation'),
  ('Plank',             'core',      'bodyweight')
on conflict (name) do nothing;
