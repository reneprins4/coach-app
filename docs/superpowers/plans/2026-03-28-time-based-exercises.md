# Time-Based Exercise Support — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full support for time-based exercises (Plank, L-Sit, etc.) with duration tracking, PR detection, and parallel analytics alongside the existing rep-based system.

**Architecture:** Parallel systems approach — rep-based and time-based exercises each have their own analytics path (volume, PR, momentum). The exercise definition determines which path is used. Database gets `duration_seconds` column on sets and `exercise_type` column on exercises.

**Tech Stack:** Supabase (PostgreSQL), TypeScript, React, Vite

**Spec:** `docs/superpowers/specs/2026-03-28-time-based-exercises-design.md`

---

## Task Dependency Graph

```
Task 1 (Schema) → Task 2 (Types) → Tasks 3-10 (all parallel)
                                  → Task 11 (Data Migration, after schema)
```

Tasks 3-10 are fully independent after Task 2 completes and can be executed in parallel by separate agents.

---

### Task 1: Database Schema Migration

**Files:**
- Create: `supabase/migrations/010_time_based_exercises.sql`
- Modify: `supabase/schema.sql:28-36`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/010_time_based_exercises.sql`:

```sql
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
```

- [ ] **Step 2: Update schema.sql to reflect new state**

Update `supabase/schema.sql` lines 28-36 — change the sets table definition:

```sql
create table if not exists sets (
  id                uuid primary key default gen_random_uuid(),
  workout_id        uuid not null references workouts(id) on delete cascade,
  exercise          text not null,
  weight_kg         numeric(6,2),
  reps              integer,                    -- null for time-based exercises
  duration_seconds  integer,                    -- null for rep-based exercises
  rpe               numeric(3,1),
  created_at        timestamptz not null default now(),
  constraint sets_reps_or_duration check (reps is not null or duration_seconds is not null)
);
```

Also update the exercises table definition to include:

```sql
exercise_type     text not null default 'reps'  -- 'reps' | 'time'
```

- [ ] **Step 3: Push migration to Supabase**

Run:
```bash
curl -X POST "https://zumgldearteriftennle.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "<migration SQL>"}'
```

Or use Supabase CLI if available:
```bash
npx supabase db push
```

Alternatively, run each ALTER statement individually via the REST API.

- [ ] **Step 4: Verify migration**

Query the sets table to confirm `duration_seconds` column exists and `reps` is nullable:
```bash
curl -s "https://zumgldearteriftennle.supabase.co/rest/v1/sets?limit=1" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"
```

Verify exercises have `exercise_type`:
```bash
curl -s "https://zumgldearteriftennle.supabase.co/rest/v1/exercises?name=eq.Plank&select=name,exercise_type" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"
```

Expected: Plank has `exercise_type: 'time'`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/010_time_based_exercises.sql supabase/schema.sql
git commit -m "feat: add duration_seconds to sets, exercise_type to exercises"
```

---

### Task 2: TypeScript Type Updates

**Files:**
- Modify: `src/types/index.ts:78-87` (WorkoutSet)
- Modify: `src/types/index.ts:103-114` (Exercise)
- Modify: `src/types/index.ts:194-205` (AIExercise)
- Modify: `src/types/index.ts:261-267` (ActiveWorkoutSet)
- Modify: `src/types/index.ts:279-287` (ExercisePlan)

- [ ] **Step 1: Update WorkoutSet interface (lines 78-87)**

Add `duration_seconds` field:

```typescript
export interface WorkoutSet {
  id: string
  workout_id: string
  user_id: string
  exercise: string
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
  created_at: string
}
```

- [ ] **Step 2: Update ActiveWorkoutSet interface (lines 261-267)**

Make `reps` nullable, `weight_kg` nullable, add `duration_seconds`:

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

- [ ] **Step 3: Update Exercise interface (lines 103-114)**

Add `exercise_type`, `duration_min`, `duration_max`:

```typescript
export interface Exercise {
  name: string
  muscle_group: MuscleGroup
  sets: number
  reps_min: number
  reps_max: number
  weight_kg: number
  rpe_target: number
  rest_seconds: number
  notes: string
  vs_last_session: string
  exercise_type?: 'reps' | 'time'
  duration_min?: number
  duration_max?: number
}
```

- [ ] **Step 4: Update AIExercise interface (lines 194-205)**

Add `exercise_type`, `duration_min`, `duration_max`:

```typescript
export interface AIExercise {
  name: string
  muscle_group: MuscleGroup
  sets: number
  reps_min: number
  reps_max: number
  weight_kg: number
  rpe_target: number
  rest_seconds: number
  notes: string
  vs_last_session: `${ProgressionDirection} - ${string}` | ProgressionDirection
  exercise_type?: 'reps' | 'time'
  duration_min?: number
  duration_max?: number
}
```

- [ ] **Step 5: Update ExercisePlan interface (lines 279-287)**

Add optional duration fields:

```typescript
export interface ExercisePlan {
  sets: number
  reps_min: number
  reps_max: number
  weight_kg: number
  rpe_target: number
  rest_seconds: number
  notes: string
  exercise_type?: 'reps' | 'time'
  duration_min?: number
  duration_max?: number
}
```

- [ ] **Step 6: Run typecheck to find all downstream breakages**

Run:
```bash
npx tsc --noEmit 2>&1 | head -80
```

This will show all files that now have type errors due to `reps` being nullable and `weight_kg` being nullable on `ActiveWorkoutSet`. These errors are expected and will be fixed in Tasks 3-10.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add duration_seconds and exercise_type to core types"
```

---

### Task 3: ExerciseBlock UI — Set Input & Display

**Files:**
- Modify: `src/components/workout/ExerciseBlock.tsx:21-25` (SetData interface)
- Modify: `src/components/workout/ExerciseBlock.tsx:150-177` (handleAdd, input form)
- Modify: `src/components/workout/ExerciseBlock.tsx:287-309` (set display)

- [ ] **Step 1: Update SetData interface (line 21-25)**

```typescript
interface SetData {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
}
```

- [ ] **Step 2: Add exercise_type prop and duration state**

The component needs to know the exercise type. Add to the component props or derive from the exercise object. Add state for duration input alongside existing `reps` state:

```typescript
const isTimeExercise = exercise.plan?.exercise_type === 'time' || exercise.exercise_type === 'time'
const [duration, setDuration] = useState('')
```

- [ ] **Step 3: Update handleAdd function (lines 150-177)**

Branch on exercise type:

```typescript
function handleAdd() {
  const displayW = parseFloat(weight) || 0
  const w = toKg(displayW, unit)

  if (isTimeExercise) {
    const d = parseInt(duration, 10)
    if (isNaN(d) || d <= 0) return

    // Duration PR detection
    if (historicalSets.length > 0) {
      const pr = detectDurationPR(exercise.name, d, historicalSets)
      if (pr && pr.isPR) {
        setPrBanner({
          duration: d,
          improvement: pr.improvement,
          type: pr.type,
        })
      }
    }

    hapticFeedback('light')
    onAddSet({ weight_kg: w || null, reps: null, duration_seconds: d, rpe })
    setDuration('')
  } else {
    const r = parseInt(reps, 10)
    if (isNaN(r) || r <= 0) return

    let isPR = false
    if (historicalSets.length > 0) {
      const pr = detectPR(exercise.name, w, r, historicalSets)
      if (pr && pr.isPR) {
        isPR = true
        setPrBanner({
          weight: toDisplayWeight(w, unit),
          reps: r,
          improvement: toDisplayWeight(pr.improvement, unit),
          type: pr.type,
        })
      }
    }

    hapticFeedback(isPR ? 'heavy' : 'light')
    onAddSet({ weight_kg: w, reps: r, duration_seconds: null, rpe })
  }
}
```

- [ ] **Step 4: Update input form — show duration input for time exercises**

Replace the reps input section with a conditional:

```typescript
{isTimeExercise ? (
  <input
    type="number"
    inputMode="numeric"
    placeholder="sec"
    value={duration}
    onChange={e => setDuration(e.target.value)}
    className={/* same styles as reps input */}
    aria-label="Duur in seconden"
  />
) : (
  <input
    type="number"
    inputMode="numeric"
    placeholder="reps"
    value={reps}
    onChange={e => setReps(e.target.value)}
    className={/* existing styles */}
    aria-label="Reps"
  />
)}
```

Weight input stays but is optional for time exercises (for weighted planks etc.).

- [ ] **Step 5: Update set display (lines 287-309)**

Update the logged set display to show duration for time exercises:

```typescript
<span className="text-[0.9375rem] font-bold tracking-tight text-white tabular">
  {s.duration_seconds ? (
    <>
      {s.duration_seconds}<span className="text-xs text-gray-600">s</span>
      {s.weight_kg ? (
        <>
          <span className="mx-1.5 text-gray-700">@</span>
          {toDisplayWeight(s.weight_kg, unit)}<span className="text-xs text-gray-600">{unitLabel}</span>
        </>
      ) : null}
    </>
  ) : (
    <>
      {toDisplayWeight(s.weight_kg, unit)}<span className="text-xs text-gray-600">{unitLabel}</span>
      <span className="mx-1.5 text-gray-700">{'\u00D7'}</span>
      {s.reps}
    </>
  )}
</span>
```

Also update the `aria-label` to reflect the correct format.

- [ ] **Step 6: Update last-used suggestion display**

Where the component pre-fills from last-used data, handle duration:

```typescript
// For time exercises, pre-fill duration instead of reps
if (isTimeExercise) {
  setDuration(lastUsed?.duration_seconds?.toString() || exercise.plan?.duration_min?.toString() || '')
} else {
  setReps(exercise.plan?.reps_min?.toString() || lastUsed?.reps?.toString() || '')
}
```

- [ ] **Step 7: Verify UI renders correctly**

Run:
```bash
npm run dev
```

Navigate to an active workout. Verify:
- Rep exercises show weight + reps input (unchanged)
- Time exercises (if in workout) show weight + duration(s) input
- Logged sets display correctly for both types

- [ ] **Step 8: Commit**

```bash
git add src/components/workout/ExerciseBlock.tsx
git commit -m "feat: ExerciseBlock supports time-based exercise input and display"
```

---

### Task 4: useActiveWorkout Hook Updates

**Files:**
- Modify: `src/hooks/useActiveWorkout.ts:16-27` (SetInput, LastUsedData)
- Modify: `src/hooks/useActiveWorkout.ts:220-248` (addSet)
- Modify: `src/hooks/useActiveWorkout.ts:283-291` (pendingSets)

- [ ] **Step 1: Update interfaces (lines 16-27)**

```typescript
interface LastUsedData {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
}

interface SetInput {
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe?: number | null
}
```

- [ ] **Step 2: Update addSet function (lines 220-248)**

Update last-used storage and ActiveWorkoutSet creation:

```typescript
const addSet = useCallback((exerciseName: string, setData: SetInput): void => {
  const store = load<LastUsedStore>(LAST_USED_KEY) || {}
  store[exerciseName] = {
    weight_kg: setData.weight_kg,
    reps: setData.reps,
    duration_seconds: setData.duration_seconds,
  }
  save(LAST_USED_KEY, store)

  setWorkout(prev => {
    if (!prev) return prev
    const now = new Date().toISOString()
    return {
      ...prev,
      lastActivityAt: now,
      exercises: prev.exercises.map(e => {
        if (e.name !== exerciseName) return e
        const newSet: ActiveWorkoutSet = {
          id: crypto.randomUUID(),
          weight_kg: setData.weight_kg,
          reps: setData.reps,
          duration_seconds: setData.duration_seconds,
          rpe: setData.rpe || null,
          created_at: now,
        }
        return { ...e, sets: [...e.sets, newSet] }
      }),
    }
  })
}, [])
```

- [ ] **Step 3: Update pendingSets building (lines 283-291)**

Add `duration_seconds` to the set objects sent to Supabase:

```typescript
const pendingSets = workout.exercises.flatMap(ex =>
  ex.sets.map(s => ({
    user_id: userId,
    exercise: ex.name,
    weight_kg: s.weight_kg,
    reps: s.reps,
    duration_seconds: s.duration_seconds,
    rpe: s.rpe,
  }))
)
```

- [ ] **Step 4: Update any FinishedWorkoutResult type**

If there is a return type for the finished workout that includes sets, add `duration_seconds` there too. Search for `FinishedWorkoutResult` or the return type of `finishWorkout`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useActiveWorkout.ts
git commit -m "feat: useActiveWorkout supports duration_seconds for time-based sets"
```

---

### Task 5: Volume Tracker — TUT Metric

**Files:**
- Modify: `src/lib/volumeTracker.ts:34-43` (calcWorkoutVolume)
- Modify: `src/lib/volumeTracker.ts` (add TUT functions)

- [ ] **Step 1: Update calcWorkoutVolume to exclude time-based sets (lines 34-43)**

```typescript
function calcWorkoutVolume(workout: Workout): number {
  const sets = workout.workout_sets || []
  return sets.reduce((sum, s) => {
    // Skip time-based sets — they have their own TUT metric
    if (s.duration_seconds && !s.reps) return sum
    const weight = s.weight_kg || 0
    const reps = s.reps || 0
    return sum + (weight > 0 ? weight * reps : reps)
  }, 0)
}
```

- [ ] **Step 2: Add TUT calculation function**

Add after `calcWorkoutVolume`:

```typescript
export function calcWorkoutTUT(workout: Workout): number {
  const sets = workout.workout_sets || []
  return sets.reduce((sum, s) => {
    if (!s.duration_seconds) return sum
    return sum + s.duration_seconds
  }, 0)
}

export function groupTUTByWeek(workouts: Workout[], weeks: number = 12): { label: string; value: number }[] {
  // Same pattern as groupVolumeByWeek but using calcWorkoutTUT
  const now = new Date()
  const result: { label: string; value: number }[] = []

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - (i + 1) * 7)
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() - i * 7)

    const weekWorkouts = workouts.filter(w => {
      const d = new Date(w.created_at)
      return d >= weekStart && d < weekEnd
    })

    const totalTUT = weekWorkouts.reduce((sum, w) => sum + calcWorkoutTUT(w), 0)
    const label = `W${weeks - i}`
    result.push({ label, value: totalTUT })
  }

  return result
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/volumeTracker.ts
git commit -m "feat: exclude time sets from rep volume, add TUT tracking"
```

---

### Task 6: PR Detector — Duration PRs

**Files:**
- Modify: `src/lib/prDetector.ts` (add detectDurationPR)

- [ ] **Step 1: Add PRDetectionResult type for duration (if not already flexible enough)**

Check the existing `PRDetectionResult` interface. If `type` is a string union like `'e1rm' | 'weight'`, extend it:

```typescript
export interface PRDetectionResult {
  isPR: boolean
  type: 'e1rm' | 'weight' | 'duration'
  previousBest: number
  newBest: number
  improvement: number
}
```

- [ ] **Step 2: Add detectDurationPR function**

Add after the existing `detectPR` function:

```typescript
export function detectDurationPR(
  exerciseName: string,
  durationSeconds: number,
  historicalSets: Pick<WorkoutSet, 'exercise' | 'duration_seconds'>[]
): PRDetectionResult | null {
  if (!durationSeconds || durationSeconds <= 0) return null
  if (!historicalSets || historicalSets.length === 0) return null

  const exerciseSets = historicalSets.filter(s =>
    areExercisesEquivalent(s.exercise ?? '', exerciseName) && s.duration_seconds
  )

  if (exerciseSets.length === 0) return null

  const bestHistorical = Math.max(...exerciseSets.map(s => s.duration_seconds!))

  if (durationSeconds > bestHistorical) {
    return {
      isPR: true,
      type: 'duration',
      previousBest: bestHistorical,
      newBest: durationSeconds,
      improvement: durationSeconds - bestHistorical,
    }
  }

  return null
}
```

- [ ] **Step 3: Update detectPR to guard against time-based sets**

Add an early return at the top of the existing `detectPR` function to skip if no reps:

The existing guard `if (!weight || weight <= 0 || !reps || reps <= 0) return null` already handles this — time-based sets with `reps: null` will return null. No change needed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prDetector.ts
git commit -m "feat: add duration PR detection for time-based exercises"
```

---

### Task 7: Momentum Calculator — Duration Signals

**Files:**
- Modify: `src/lib/momentumCalculator.ts:46-78`

- [ ] **Step 1: Add duration-based signals after existing signals (after line 78)**

```typescript
// Signal 4: Duration trend (for time-based exercises)
const setsWithDuration = recentSets.filter(s => s.duration_seconds)
if (setsWithDuration.length >= 3) {
  const durations = setsWithDuration.map(s => s.duration_seconds!)
  const trend = durations[durations.length - 1]! - durations[0]!
  const trendPct = durations[0]! > 0 ? (trend / durations[0]!) * 100 : 0

  if (trendPct > 5) { score += 15; signals.push('duration_rising') }
  else if (trendPct < -10) { score -= 15; signals.push('duration_dropping') }
}
```

- [ ] **Step 2: Update the signal type if it's a typed union**

If `signals` uses a typed array, add `'duration_rising' | 'duration_dropping'` to the type.

- [ ] **Step 3: Commit**

```bash
git add src/lib/momentumCalculator.ts
git commit -m "feat: add duration trend signals to momentum calculator"
```

---

### Task 8: Training Analysis — Recovery with Duration

**Files:**
- Modify: `src/lib/training-analysis.ts:208-220` (calcMuscleRecovery)

- [ ] **Step 1: Add duration effort parameter to calcMuscleRecovery**

Update the function signature and volume multiplier calculation:

```typescript
export function calcMuscleRecovery(
  muscle: string,
  hoursSinceTrained: number | null,
  avgRPE: number | null,
  setsCount: number,
  totalDurationSeconds: number = 0
): number {
  if (hoursSinceTrained == null || !Number.isFinite(hoursSinceTrained)) return 100
  const safeHours = Math.max(0, hoursSinceTrained)
  const baseHours = RECOVERY_HOURS[muscle as MuscleGroup] || 72
  const safeSets = Number.isFinite(setsCount) ? setsCount : 0

  // Duration-based sets contribute as set-equivalents (30s = 1 set)
  const durationSetEquivalent = totalDurationSeconds > 0 ? totalDurationSeconds / 30 : 0
  const effectiveSets = safeSets + durationSetEquivalent

  const volumeMult = 1 + Math.max(0, (effectiveSets - 6) * 0.13)
  const safeRPE = (avgRPE != null && Number.isFinite(avgRPE)) ? avgRPE : 7
  const clampedRPE = Math.max(1, Math.min(10, safeRPE))
  const rpeMult = Math.max(0.95, 1 + (clampedRPE - 7) * 0.15)
  const adjustedHours = baseHours * volumeMult * rpeMult
  return Math.min(100, Math.round((safeHours / adjustedHours) * 100))
}
```

- [ ] **Step 2: Update all call sites of calcMuscleRecovery**

Search for all calls to `calcMuscleRecovery` and pass the new `totalDurationSeconds` parameter. The callers need to sum `duration_seconds` from the relevant sets for that muscle group. If no duration sets exist, passing 0 (the default) keeps behavior unchanged.

Find call sites:
```bash
npx grep -rn "calcMuscleRecovery" src/
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/training-analysis.ts
git commit -m "feat: recovery calculation accounts for time-based exercise effort"
```

---

### Task 9: AI & Workout Generation — Duration Support

**Files:**
- Modify: `src/lib/ai.ts:56-87` (formatExerciseHistory)
- Modify: `src/lib/localWorkoutGenerator.ts` (exercise templates)

- [ ] **Step 1: Update formatExerciseHistory (ai.ts lines 56-87)**

Update the set summary formatter:

```typescript
const summary = recent.map(s => {
  if (s.duration_seconds) {
    return `${s.duration_seconds}s${s.rpe ? ` @${s.rpe}` : ''}`
  }
  return `${s.weight || '?'}kg x${s.reps || '?'}${s.rpe ? ` @${s.rpe}` : ''}`
}).join(', ')
```

Also update the `byExercise` record type to include `duration_seconds`:

```typescript
const byExercise: Record<string, { weight: number | null; reps: number | null; duration_seconds: number | null; rpe: number | null; date: string }[]> = {}
```

And include `duration_seconds` when pushing:

```typescript
byExercise[set.exercise]!.push({
  weight: set.weight_kg,
  reps: set.reps,
  duration_seconds: set.duration_seconds ?? null,
  rpe: set.rpe,
  date: workout.date,
})
```

- [ ] **Step 2: Update localWorkoutGenerator exercise pool**

In `EXERCISE_POOL`, add `exercise_type` to time-based exercises. Find exercises that should be time-based (Plank, etc.) and add the field:

```typescript
// Example for core exercises in the pool:
{ name: 'Plank', muscle_group: 'core', isCompound: false, equipment: 'bodyweight', bwMultiplier: 0, exercise_type: 'time' as const },
```

For any exercise pool entry with `exercise_type: 'time'`, the generator should produce `duration_min`/`duration_max` instead of `reps_min`/`reps_max`.

- [ ] **Step 3: Update exercise-to-AIExercise mapping in generator**

Where the generator converts pool entries to `AIExercise` objects, branch on type:

```typescript
if (poolEntry.exercise_type === 'time') {
  return {
    ...base,
    exercise_type: 'time',
    reps_min: 0,
    reps_max: 0,
    duration_min: 20,  // sensible defaults for time exercises
    duration_max: 60,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai.ts src/lib/localWorkoutGenerator.ts
git commit -m "feat: AI history and workout generation support time-based exercises"
```

---

### Task 10: Data Export — Duration Column

**Files:**
- Modify: `src/lib/dataExport.ts:12-17` (ExportWorkoutSet)
- Modify: `src/lib/dataExport.ts:109-134` (exportWorkoutsToCSV)

- [ ] **Step 1: Update ExportWorkoutSet interface (lines 12-17)**

```typescript
export interface ExportWorkoutSet {
  exercise: string
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
}
```

- [ ] **Step 2: Update exportWorkoutsToCSV (lines 109-134)**

Add `Duration (s)` column and handle time-based volume:

```typescript
export function exportWorkoutsToCSV(workouts: Workout[]): string {
  const headers = ['Date', 'Workout ID', 'Split', 'Exercise', 'Weight (kg)', 'Reps', 'Duration (s)', 'RPE', 'Volume (kg)']
  const rows: string[] = [csvRow(headers)]

  for (const w of workouts) {
    const date = w.created_at.split('T')[0] ?? ''
    const shortId = w.id.slice(0, 8)
    for (const s of (w.workout_sets || [])) {
      const weight = s.weight_kg ?? 0
      const reps = s.reps ?? 0
      const duration = s.duration_seconds ?? ''
      const volume = s.duration_seconds ? 'N/A' : (weight * reps).toFixed(1)
      rows.push(csvRow([
        date,
        shortId,
        w.split,
        s.exercise,
        String(weight),
        s.reps != null ? String(reps) : '',
        String(duration),
        s.rpe != null ? String(s.rpe) : '',
        volume,
      ]))
    }
  }

  return rows.join('\n')
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/dataExport.ts
git commit -m "feat: CSV export includes duration_seconds column"
```

---

### Task 11: Junk Volume Detector — Skip Time Exercises

**Files:**
- Modify: `src/lib/junkVolumeDetector.ts:34-40`

- [ ] **Step 1: Add early return for time-based exercises**

At the top of `detectJunkVolume`, skip time-based sets:

```typescript
export function detectJunkVolume(exerciseName: string, allSetsThisExercise: JunkVolumeSet[]): JunkVolumeDetectionResult | null {
  if (!allSetsThisExercise || allSetsThisExercise.length < 3) return null

  // Skip time-based exercises — junk volume is a rep/weight concept
  const repSets = allSetsThisExercise.filter(s => s.reps != null && !s.duration_seconds)
  if (repSets.length < 3) return null

  const workSets = filterWarmupSets(repSets)
  if (workSets.length < 3) return null
  // ... rest unchanged, but operate on workSets from filtered repSets
```

- [ ] **Step 2: Update JunkVolumeSet type if needed**

If `JunkVolumeSet` doesn't include `duration_seconds`, add it:

```typescript
interface JunkVolumeSet {
  weight_kg: number | null
  reps: number | null
  rpe: number | null
  duration_seconds?: number | null
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/junkVolumeDetector.ts
git commit -m "feat: junk volume detector skips time-based exercises"
```

---

### Task 12: Data Migration — Fix Existing Plank Data

**Files:**
- No code files — database operation only

This task depends on Task 1 (schema migration) being complete.

- [ ] **Step 1: Migrate existing plank sets from reps to duration_seconds**

Run via Supabase REST API with service_role key:

```bash
curl -X PATCH "https://zumgldearteriftennle.supabase.co/rest/v1/sets?exercise=in.(Plank,Copenhagen Plank,Side Plank,Hollow Body Hold,L-Sit,Dead Bug)&duration_seconds=is.null&reps=not.is.null" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"duration_seconds": "reps", "reps": null}'
```

Note: Supabase REST API doesn't support column references in PATCH. Use RPC or raw SQL instead:

```sql
UPDATE sets
SET duration_seconds = reps, reps = NULL
WHERE exercise IN ('Plank', 'Copenhagen Plank', 'Side Plank', 'Hollow Body Hold', 'L-Sit', 'Dead Bug')
  AND duration_seconds IS NULL
  AND reps IS NOT NULL;
```

- [ ] **Step 2: Verify migration**

Query plank sets to confirm they have `duration_seconds` and `reps IS NULL`:

```bash
curl -s "https://zumgldearteriftennle.supabase.co/rest/v1/sets?exercise=eq.Plank&select=exercise,reps,duration_seconds" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY"
```

Expected: `{ "exercise": "Plank", "reps": null, "duration_seconds": 30 }`

---

### Task 13: Dashboard & Progress — TUT Display

**Files:**
- Modify: `src/pages/Dashboard.tsx` (add TUT stat)
- Modify: `src/pages/Progress.tsx` (add TUT chart/section)

- [ ] **Step 1: Import TUT functions in Dashboard.tsx**

```typescript
import { calcWorkoutTUT } from '../lib/volumeTracker'
```

- [ ] **Step 2: Add TUT to weekly stats in Dashboard**

In the `stats` useMemo (around line 59), add TUT calculation:

```typescript
const weeklyTUT = thisWeek.reduce((sum, w) => sum + calcWorkoutTUT(w), 0)
return { thisWeekCount: thisWeek.length, streak, weeklyTUT }
```

Display it alongside existing stats — format as minutes if > 60s:

```typescript
const tutDisplay = stats.weeklyTUT >= 60
  ? `${Math.floor(stats.weeklyTUT / 60)}m ${stats.weeklyTUT % 60}s`
  : `${stats.weeklyTUT}s`
```

- [ ] **Step 3: Import and display TUT in Progress.tsx**

```typescript
import { groupTUTByWeek } from '../lib/volumeTracker'
```

Add a TUT trend section using the same chart pattern as volume. Show weekly TUT alongside volume charts. Only display if there are time-based sets in the data.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Progress.tsx
git commit -m "feat: Dashboard and Progress pages display TUT metrics"
```

---

### Task 14: Final Typecheck & Verification

- [ ] **Step 1: Run full typecheck**

```bash
npx tsc --noEmit
```

Fix any remaining type errors. Common issues:
- Places where `s.reps` is used without null check (now nullable)
- Places where `s.weight_kg` is used on `ActiveWorkoutSet` without null check (now nullable)

- [ ] **Step 2: Run existing tests**

```bash
npm test 2>&1 | tail -30
```

Fix any test failures caused by the type changes. Tests that create mock sets need `duration_seconds: null` added.

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors and test failures from time-based exercise support"
```
