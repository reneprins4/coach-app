/**
 * Synthetic workout data generators for simulation tests.
 *
 * Each generator returns properly typed Workout[] arrays with unique IDs,
 * correctly spaced dates, calculated totalVolume, and exerciseNames.
 */

import type { Workout, WorkoutSet } from '../../../types'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let globalIdCounter = 0

function nextId(prefix: string): string {
  globalIdCounter++
  return `${prefix}-${globalIdCounter}-${Date.now().toString(36)}`
}

function createDate(baseDate: Date, offsetDays: number): Date {
  const d = new Date(baseDate)
  d.setDate(d.getDate() + offsetDays)
  // Normalise to 18:00 (typical gym time) to avoid midnight edge cases
  d.setHours(18, 0, 0, 0)
  return d
}

function roundWeight(kg: number): number {
  return Math.max(0, Math.round(kg / 2.5) * 2.5)
}

function buildWorkout(opts: {
  sets: Array<{ exercise: string; weight_kg: number; reps: number; rpe?: number }>
  date: Date
  split?: string
}): Workout {
  const workoutId = nextId('sim-w')
  const userId = 'sim-user'
  const dateStr = opts.date.toISOString()

  const workoutSets: WorkoutSet[] = opts.sets.map((s, idx) => ({
    id: nextId(`sim-s-${idx}`),
    workout_id: workoutId,
    user_id: userId,
    exercise: s.exercise,
    weight_kg: s.weight_kg,
    reps: s.reps,
    rpe: s.rpe ?? 7,
    created_at: dateStr,
  }))

  const exerciseNames = [...new Set(workoutSets.map(s => s.exercise))]
  const totalVolume = workoutSets.reduce(
    (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0),
    0,
  )

  return {
    id: workoutId,
    user_id: userId,
    split: opts.split ?? 'Full Body',
    created_at: dateStr,
    completed_at: dateStr,
    notes: null,
    workout_sets: workoutSets,
    totalVolume,
    exerciseNames,
  }
}

// ---------------------------------------------------------------------------
// Public generators
// ---------------------------------------------------------------------------

export interface LinearProgressionConfig {
  exercises: string[]
  weeks: number
  sessionsPerWeek: number
  startWeights: Record<string, number>
  weeklyIncreasePct: number
  repsPerSet?: number
  setsPerExercise?: number
  startDate?: Date
  rpe?: number
  split?: string
}

/**
 * Generate workouts with linear weight progression over weeks.
 * Each session contains all exercises; weight increases per week by the given %.
 */
export function generateLinearProgression(config: LinearProgressionConfig): Workout[] {
  const {
    exercises,
    weeks,
    sessionsPerWeek,
    startWeights,
    weeklyIncreasePct,
    repsPerSet = 8,
    setsPerExercise = 3,
    startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000),
    rpe = 7,
    split,
  } = config

  const workouts: Workout[] = []

  for (let week = 0; week < weeks; week++) {
    for (let session = 0; session < sessionsPerWeek; session++) {
      const dayOffset = week * 7 + Math.floor((session * 7) / sessionsPerWeek)
      const date = createDate(startDate, dayOffset)

      const sets: Array<{ exercise: string; weight_kg: number; reps: number; rpe: number }> = []

      for (const exercise of exercises) {
        const baseWeight = startWeights[exercise] ?? 20
        const weight = roundWeight(baseWeight * Math.pow(1 + weeklyIncreasePct, week))

        for (let s = 0; s < setsPerExercise; s++) {
          sets.push({ exercise, weight_kg: weight, reps: repsPerSet, rpe })
        }
      }

      workouts.push(buildWorkout({ sets, date, split }))
    }
  }

  return workouts
}

// ---------------------------------------------------------------------------

export interface PlateauConfig {
  exercise: string
  weeks: number
  weight: number
  reps: number
  sessionsPerWeek?: number
  otherExercises?: Array<{ name: string; weight: number }>
  startDate?: Date
  split?: string
}

/**
 * Generate workouts where one exercise stays at a flat weight/rep for the
 * entire duration (plateau). Optional other exercises can progress normally.
 */
export function generatePlateau(config: PlateauConfig): Workout[] {
  const {
    exercise,
    weeks,
    weight,
    reps,
    sessionsPerWeek = 3,
    otherExercises = [],
    startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000),
    split,
  } = config

  const workouts: Workout[] = []

  for (let week = 0; week < weeks; week++) {
    for (let session = 0; session < sessionsPerWeek; session++) {
      const dayOffset = week * 7 + Math.floor((session * 7) / sessionsPerWeek)
      const date = createDate(startDate, dayOffset)

      const sets: Array<{ exercise: string; weight_kg: number; reps: number; rpe: number }> = []

      // Plateau exercise: same weight/reps every session
      for (let s = 0; s < 3; s++) {
        sets.push({ exercise, weight_kg: weight, reps, rpe: 7.5 })
      }

      // Other exercises: slight linear progression
      for (const other of otherExercises) {
        const w = roundWeight(other.weight * (1 + week * 0.02))
        for (let s = 0; s < 3; s++) {
          sets.push({ exercise: other.name, weight_kg: w, reps: 8, rpe: 7 })
        }
      }

      workouts.push(buildWorkout({ sets, date, split }))
    }
  }

  return workouts
}

// ---------------------------------------------------------------------------

/**
 * Insert a time gap (vacation) between existing workouts and optional
 * after-workouts. Returns the combined array with properly spaced dates.
 */
export function generateVacationGap(
  beforeWorkouts: Workout[],
  gapDays: number,
  afterWorkouts?: Workout[],
): Workout[] {
  if (beforeWorkouts.length === 0) return afterWorkouts ?? []

  const result = [...beforeWorkouts]

  if (afterWorkouts && afterWorkouts.length > 0) {
    // Find the last date from the before-workouts
    const lastBeforeDate = new Date(
      Math.max(...beforeWorkouts.map(w => new Date(w.created_at).getTime())),
    )

    // Find the first date from after-workouts to calculate offset
    const firstAfterDate = new Date(
      Math.min(...afterWorkouts.map(w => new Date(w.created_at).getTime())),
    )

    // Shift all after-workouts so the gap is exactly gapDays from last before
    const targetStart = new Date(lastBeforeDate)
    targetStart.setDate(targetStart.getDate() + gapDays)
    const shiftMs = targetStart.getTime() - firstAfterDate.getTime()

    for (const w of afterWorkouts) {
      const newDate = new Date(new Date(w.created_at).getTime() + shiftMs)
      const newDateStr = newDate.toISOString()
      result.push({
        ...w,
        created_at: newDateStr,
        completed_at: newDateStr,
        workout_sets: w.workout_sets.map(s => ({
          ...s,
          created_at: newDateStr,
        })),
      })
    }
  }

  return result
}

// ---------------------------------------------------------------------------

/** PPL split exercise templates */
const PPL_EXERCISES: Record<string, string[]> = {
  Push: [
    'Flat Barbell Bench Press',
    'Incline Dumbbell Press',
    'Dumbbell Overhead Press',
    'Tricep Pushdown',
    'Cable Fly (Mid)',
  ],
  Pull: [
    'Barbell Row',
    'Lat Pulldown (Wide)',
    'Face Pull',
    'Barbell Curl',
    'Seated Cable Row',
  ],
  Legs: [
    'Back Squat',
    'Romanian Deadlift',
    'Leg Press',
    'Lying Leg Curl',
    'Cable Crunch',
  ],
}

export interface PPLCycleConfig {
  weeks: number
  startWeights: Record<string, number>
  weeklyIncreasePct: number
  startDate?: Date
  repsPerSet?: number
  setsPerExercise?: number
}

/**
 * Generate PPL (Push/Pull/Legs) cycle workouts.
 * Each week has 2 rotations: P/P/L/P/P/L (6 sessions).
 */
export function generatePPLCycle(config: PPLCycleConfig): Workout[] {
  const {
    weeks,
    startWeights,
    weeklyIncreasePct,
    startDate = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000),
    repsPerSet = 8,
    setsPerExercise = 3,
  } = config

  const workouts: Workout[] = []
  const splitOrder: Array<'Push' | 'Pull' | 'Legs'> = ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs']

  for (let week = 0; week < weeks; week++) {
    for (let day = 0; day < 6; day++) {
      const dayOffset = week * 7 + day
      const date = createDate(startDate, dayOffset)
      const splitName = splitOrder[day % 6]!
      const exercises = PPL_EXERCISES[splitName]!

      const sets: Array<{ exercise: string; weight_kg: number; reps: number; rpe: number }> = []

      for (const exercise of exercises) {
        const baseWeight = startWeights[exercise] ?? 20
        const weight = roundWeight(baseWeight * Math.pow(1 + weeklyIncreasePct, week))

        for (let s = 0; s < setsPerExercise; s++) {
          sets.push({ exercise, weight_kg: weight, reps: repsPerSet, rpe: 7 })
        }
      }

      workouts.push(buildWorkout({ sets, date, split: splitName }))
    }
  }

  return workouts
}

// ---------------------------------------------------------------------------

export interface FullBodyConfig {
  weeks: number
  sessionsPerWeek: number
  exercises: string[]
  startWeights: Record<string, number>
  weeklyIncreasePct: number
  startDate?: Date
  repsPerSet?: number
  setsPerExercise?: number
}

/**
 * Generate Full Body workout sessions.
 * All exercises per session, weight increases weekly.
 */
export function generateFullBodyWorkouts(config: FullBodyConfig): Workout[] {
  return generateLinearProgression({
    exercises: config.exercises,
    weeks: config.weeks,
    sessionsPerWeek: config.sessionsPerWeek,
    startWeights: config.startWeights,
    weeklyIncreasePct: config.weeklyIncreasePct,
    startDate: config.startDate,
    repsPerSet: config.repsPerSet,
    setsPerExercise: config.setsPerExercise,
    split: 'Full Body',
  })
}
