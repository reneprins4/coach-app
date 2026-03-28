/**
 * Test helpers — factory functions for creating mock data.
 */
import type {
  Workout, WorkoutSet, MuscleStatusMap, MuscleStatus, MuscleGroup,
  UserSettings, RecentSession, RecentSessionSet, TrainingBlock,
  JunkVolumeSet,
} from '../types'

// ---- Workout factories ----

let setIdCounter = 0

export function createWorkoutSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  setIdCounter++
  return {
    id: `set-${setIdCounter}`,
    workout_id: 'workout-1',
    user_id: 'user-1',
    exercise: 'Bench Press',
    weight_kg: 80,
    reps: 8,
    duration_seconds: null,
    rpe: 7.5,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

let workoutIdCounter = 0

export function createWorkout(overrides: Partial<Workout> = {}, sets?: Partial<WorkoutSet>[]): Workout {
  workoutIdCounter++
  const id = overrides.id ?? `workout-${workoutIdCounter}`
  const workoutSets = sets
    ? sets.map(s => createWorkoutSet({ ...s, workout_id: id }))
    : [createWorkoutSet({ workout_id: id })]

  return {
    id,
    user_id: 'user-1',
    split: 'Push',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    notes: null,
    workout_sets: workoutSets,
    totalVolume: workoutSets.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0),
    exerciseNames: [...new Set(workoutSets.map(s => s.exercise))],
    ...overrides,
  }
}

/**
 * Create a series of workouts spread over multiple weeks.
 * Useful for testing fatigue detection, plateau detection, etc.
 */
export function createWorkoutsOverWeeks(
  weeksBack: number,
  workoutsPerWeek: number,
  setOverrides?: Partial<WorkoutSet>,
): Workout[] {
  const workouts: Workout[] = []
  for (let week = weeksBack; week >= 0; week--) {
    for (let i = 0; i < workoutsPerWeek; i++) {
      const date = new Date()
      date.setDate(date.getDate() - week * 7 - i)
      workouts.push(createWorkout({
        created_at: date.toISOString(),
      }, [
        { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 7 + (weeksBack - week) * 0.3, ...setOverrides },
        { exercise: 'Incline Press', weight_kg: 60, reps: 10, rpe: 7, ...setOverrides },
        { exercise: 'Cable Fly', weight_kg: 20, reps: 12, rpe: 7, ...setOverrides },
      ]))
    }
  }
  return workouts
}

// ---- Muscle status factory ----

export function createMuscleStatus(overrides: Partial<MuscleStatus> = {}): MuscleStatus {
  return {
    setsThisWeek: 10,
    daysSinceLastTrained: 2,
    hoursSinceLastTrained: 48,
    avgRpeLastSession: 7.5,
    setsLastSession: 4,
    totalDurationLastSession: 0,
    recoveryPct: 85,
    recentExercises: ['Bench Press', 'Incline Press'],
    lastSessionSets: [],
    target: { min: 10, max: 20, mev: 8 },
    status: 'ready',
    ...overrides,
  }
}

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core',
]

export function createMuscleStatusMap(
  overrides: Partial<Record<MuscleGroup, Partial<MuscleStatus>>> = {},
): MuscleStatusMap {
  const map: Partial<MuscleStatusMap> = {}
  for (const muscle of ALL_MUSCLES) {
    map[muscle] = createMuscleStatus(overrides[muscle])
  }
  return map as MuscleStatusMap
}

// ---- Settings factory ----

export function createSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    name: 'Test User',
    gender: 'male',
    goal: 'hypertrophy',
    frequency: '4x',
    restTime: 90,
    units: 'kg',
    memberSince: '2024-01-01T00:00:00.000Z',
    bodyweight: '80',
    experienceLevel: 'intermediate',
    equipment: 'full_gym',
    benchMax: '100',
    squatMax: '140',
    deadliftMax: '180',
    ohpMax: '60',
    onboardingCompleted: true,
    language: 'auto',
    time: 60,
    trainingGoal: 'hypertrophy',
    trainingPhase: 'build',
    mainLift: null,
    mainLiftGoalKg: null,
    mainLiftGoalDate: null,
    priorityMuscles: [],
    priorityMusclesUntil: null,
    ...overrides,
  }
}

// ---- Recent session factory ----

export function createRecentSession(overrides: Partial<RecentSession> = {}, sets?: Partial<RecentSessionSet>[]): RecentSession {
  return {
    date: new Date().toISOString(),
    sets: sets
      ? sets.map(s => ({
          exercise: 'Bench Press',
          weight_kg: 80,
          reps: 8,
          rpe: 7.5,
          ...s,
        }))
      : [
          { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 7.5 },
          { exercise: 'Incline Press', weight_kg: 60, reps: 10, rpe: 7 },
        ],
    ...overrides,
  }
}

// ---- Training block factory ----

export function createTrainingBlock(overrides: Partial<TrainingBlock> = {}): TrainingBlock {
  const now = new Date().toISOString()
  return {
    id: 'block-1',
    phase: 'accumulation',
    startDate: now,
    createdAt: now,
    fullPlan: null,
    lastModified: now,
    currentWeek: 1,
    daysElapsed: 0,
    ...overrides,
  }
}

// ---- Junk volume set factory ----

export function createJunkVolumeSets(count: number, pattern: 'stable' | 'degrading_rpe' | 'degrading_reps' = 'stable'): JunkVolumeSet[] {
  const sets: JunkVolumeSet[] = []
  for (let i = 0; i < count; i++) {
    if (pattern === 'degrading_rpe') {
      sets.push({ rpe: 7 + i * 1.0, weight_kg: 80, reps: 8 })
    } else if (pattern === 'degrading_reps') {
      sets.push({ rpe: 8, weight_kg: 80, reps: Math.max(3, 10 - i * 2) })
    } else {
      sets.push({ rpe: 7.5, weight_kg: 80, reps: 8 })
    }
  }
  return sets
}
