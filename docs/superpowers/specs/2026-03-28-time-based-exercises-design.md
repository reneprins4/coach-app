# Time-Based Exercise Support — Design Spec

## Problem

The app only supports rep-based exercises. Time-based exercises (Plank, Side Plank, L-Sit, etc.) have no proper data model, UI, or analytics support. Currently they are stored with `reps` as a proxy for seconds, which breaks volume calculations, PR detection, and progression tracking.

## Approach: Parallel Systems

Rep-based and time-based exercises each get their own analytics path. No conversion between the two — a Plank PR is "60s", not "40 rep-equivalents". This keeps data honest and UX intuitive.

## Scope

- Database schema migration
- TypeScript type updates
- UI input and display changes
- Volume tracking (separate TUT metric)
- PR detection (duration-based)
- Momentum and fatigue analysis
- Recovery calculations
- Workout generation (local + AI)
- Data export

---

## 1. Data Model

### 1.1 Database: `sets` table migration

```sql
-- Make reps nullable
ALTER TABLE sets ALTER COLUMN reps DROP NOT NULL;

-- Add duration column
ALTER TABLE sets ADD COLUMN duration_seconds integer;

-- Ensure every set has at least reps or duration
ALTER TABLE sets ADD CONSTRAINT sets_reps_or_duration
  CHECK (reps IS NOT NULL OR duration_seconds IS NOT NULL);
```

### 1.2 Database: `exercises` table migration

```sql
ALTER TABLE exercises ADD COLUMN exercise_type text NOT NULL DEFAULT 'reps';
-- Values: 'reps' | 'time'
```

Default exercises to set as `'time'`:
- Plank
- Copenhagen Plank
- Side Plank
- Hollow Body Hold
- L-Sit
- Dead Bug

All others remain `'reps'` (the default).

### 1.3 TypeScript types

**WorkoutSet** (`src/types/index.ts`):
```typescript
export interface WorkoutSet {
  id: string
  workout_id: string
  user_id: string
  exercise: string
  weight_kg: number | null
  reps: number | null             // null for time-based exercises
  duration_seconds: number | null // null for rep-based exercises
  rpe: number | null
  created_at: string
}
```

**ActiveWorkoutSet** (`src/types/index.ts`):
```typescript
export interface ActiveWorkoutSet {
  id: string
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
  created_at: string
}
```

**Exercise/ExercisePlan** (`src/types/index.ts`):
```typescript
export interface Exercise {
  // ... existing fields
  exercise_type: 'reps' | 'time'
  reps_min: number       // used when exercise_type === 'reps'
  reps_max: number
  duration_min?: number  // used when exercise_type === 'time'
  duration_max?: number
}
```

**SetInput** (`src/hooks/useActiveWorkout.ts`):
```typescript
interface SetInput {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
}
```

**LastUsedData** (`src/hooks/useActiveWorkout.ts`):
```typescript
interface LastUsedData {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
}
```

**AIExercise** (`src/types/index.ts`):
```typescript
export interface AIExercise {
  // ... existing fields
  exercise_type: 'reps' | 'time'
  reps_min?: number
  reps_max?: number
  duration_min?: number
  duration_max?: number
  weight_kg: number
}
```

Note: `ActiveWorkoutSet.weight_kg` changes from `number` (required) to `number | null`. This affects `ExerciseBlock.tsx` and `useActiveWorkout.ts` where weight defaults need null-checks added.

---

## 2. UI Changes

### 2.1 ExerciseBlock — Set Input

The component reads `exercise_type` from the exercise definition to determine which input to show:

- **`exercise_type === 'reps'`**: Current UI unchanged (weight + reps + RPE)
- **`exercise_type === 'time'`**: Weight field remains (optional, for weighted planks etc.), reps field replaced by duration input labeled "Duur (s)", RPE remains

No manual toggle — the exercise definition determines the mode automatically.

### 2.2 Set Display (History, Review)

Format based on available data:
- Rep sets: `10 reps @ 18kg` or `10 reps` (bodyweight)
- Time sets: `30s` or `30s @ 10kg` (weighted)

Compact format for workout cards:
- Rep sets: `3x10 @ 18kg`
- Time sets: `2x30s` or `2x30s @ 10kg`

### 2.3 Last-Used Suggestions

Same mechanism as current, but stores and suggests `duration_seconds` instead of `reps` for time exercises. User sees: "Vorige keer: 30s".

### 2.4 FinishModal / Workout Review

Summary adapts per exercise type:
- Rep exercise: `Flat Dumbbell Bench Press — 3x10 @ 18kg`
- Time exercise: `Plank — 2x30s`

---

## 3. Analytics

### 3.1 Volume Tracking

Two separate metrics tracked independently:

**Rep Volume** (existing, unchanged):
```
rep_volume = sum(weight_kg * reps) for all sets where reps IS NOT NULL
```
Time-based sets are filtered out. Bodyweight rep exercises: `volume = reps` (existing behavior).

**Time Under Tension (TUT)** (new):
```
tut_seconds = sum(duration_seconds) for all sets where duration_seconds IS NOT NULL
```
Tracked per muscle group and per workout. Displayed alongside rep-volume on Dashboard and Progress pages.

Files affected:
- `src/lib/volumeTracker.ts` — add TUT calculation, filter time sets from rep volume
- `src/pages/Dashboard.tsx` — display TUT metric
- `src/pages/Progress.tsx` — display TUT trends

### 3.2 PR Detection

**Rep PRs** (existing, unchanged):
- e1RM via Brzycki formula
- Only processes sets where `reps IS NOT NULL AND weight_kg > 0`

**Duration PRs** (new):
- Simple max duration comparison per exercise
- `new_duration > max(historical_durations)` for same exercise = PR
- Celebration: "Plank PR: 60s!" (same UX pattern as rep PRs)
- Optional future refinement: RPE-adjusted duration comparison

Files affected:
- `src/lib/prDetector.ts` — add `detectDurationPR()` function alongside existing `detectPR()`

### 3.3 Momentum & Fatigue

**Rep exercises** (existing, unchanged):
- e1RM trending, reps consistency signals

**Time exercises** (new, parallel):
- Duration trending signal: are hold times increasing or decreasing?
- RPE trending signal: same duration but rising RPE = fatigue
- Combined into momentum score per exercise

The `momentumCalculator` filters sets by type and analyzes each path separately. Final momentum score merges both signals.

Files affected:
- `src/lib/momentumCalculator.ts` — add duration-based signals
- `src/lib/junkVolumeDetector.ts` — skip time-based exercises (junk volume is a rep/weight concept)

### 3.4 Recovery

The `calcMuscleRecovery` function accounts for time-based set effort:

```
For time sets: effort = duration_seconds / 30
```

This normalizes so that a 30-second hold = 1 "set-equivalent" of fatigue. A 60s plank = 2 set-equivalents. This value feeds into the existing `volumeMult` calculation.

Files affected:
- `src/lib/training-analysis.ts` — update `calcMuscleRecovery` to accept duration data

---

## 4. Workout Generation

### 4.1 Local Generator (`localWorkoutGenerator.ts`)

Exercise templates gain duration fields:
```typescript
// Rep exercise template (unchanged)
{ name: 'Flat Dumbbell Bench Press', reps_min: 8, reps_max: 12, bwMultiplier: 0.25 }

// Time exercise template (new)
{ name: 'Plank', duration_min: 20, duration_max: 60, exercise_type: 'time' }
```

Generator checks `exercise_type` to fill either `reps_min/max` or `duration_min/max`.

### 4.2 AI Prompt (`ai.ts`)

Exercise history formatter updated:
- Rep exercise: `"Bench Press: 80kg x10, 80kg x10, 85kg x8"`
- Time exercise: `"Plank: 30s, 30s, 45s"`

AI can then suggest appropriate progression (longer duration, added weight).

### 4.3 Exercise Library Data

The 6 time-based exercises in the exercises table get `exercise_type = 'time'` via migration. Future exercises added through the app should allow selecting the type.

---

## 5. Data Export

### CSV Format

New column `Duration (s)` added after `Reps`:

```
Date, Workout ID, Split, Exercise, Weight (kg), Reps, Duration (s), RPE, Volume (kg)
2026-03-26, cf97..., Push, Bench Press, 80, 10, , 7, 800.0
2026-03-26, cf97..., Push, Plank, , , 30, 6, N/A
```

- Rep exercises: `Duration (s)` column empty, volume calculated normally
- Time exercises: `Reps` column empty, volume shows `N/A`

Files affected:
- `src/lib/dataExport.ts` — add column, update ExportWorkoutSet interface

---

## 6. Offline Queue

The offline queue is generic and stores set objects as-is. Adding `duration_seconds` to the set payload requires no structural changes to the queue mechanism. Old queued items without `duration_seconds` will insert fine (column is nullable with no default needed — NULL means rep-based set).

---

## 7. Data Migration

### Existing Plank data fix

The workout inserted on 2026-03-26 has Plank sets stored as `reps: 30` (proxy for seconds). After the schema migration, run a data migration for all known time-based exercises:

```sql
-- Migrate all existing time-exercise sets: move reps → duration_seconds
UPDATE sets
SET duration_seconds = reps, reps = NULL
WHERE exercise IN ('Plank', 'Copenhagen Plank', 'Side Plank', 'Hollow Body Hold', 'L-Sit', 'Dead Bug')
  AND duration_seconds IS NULL
  AND reps IS NOT NULL;
```

This covers both the specific 2026-03-26 Plank data and any other historical time-exercise sets that were logged as reps.

---

## 8. Out of Scope

- Custom exercise creation with type selection (future feature)
- Mixed exercises that use both reps AND duration in the same set (e.g., "10 reps with 3s pause" — not supported)
- Video/animation changes for time exercises
- Timer UI during active time-based sets (nice-to-have, not in this spec)
