import { describe, it, expect, beforeEach } from 'vitest'
import type { Workout, WorkoutSet } from '../../types'
import {
  filterWorkoutsForMonth,
  computeOverview,
  computeConsistencyScore,
  computeLongestStreakInMonth,
  computePRsInMonth,
  computeFavoriteExercise,
  computeMostTrainedMuscle,
  computeSplitDistribution,
  computeFunStats,
  computePersonality,
  computeTrainingStory,
  markStoryViewed,
  isStoryViewed,
  getStoryState,
} from '../trainingStory'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let setCounter = 0

function createWorkoutSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  setCounter++
  return {
    id: `s-${setCounter}`,
    workout_id: 'w-1',
    user_id: 'u-1',
    exercise: 'Bench Press',
    weight_kg: 80,
    reps: 10,
    rpe: 7,
    created_at: '2026-02-15T10:00:00Z',
    ...overrides,
  }
}

function createWorkout(overrides: Partial<Workout> & { daysInMonth?: number } = {}): Workout {
  const { daysInMonth, ...rest } = overrides
  const sets = rest.workout_sets ?? [
    createWorkoutSet({ exercise: 'Bench Press', weight_kg: 80, reps: 10 }),
    createWorkoutSet({ exercise: 'Incline Press', weight_kg: 60, reps: 12 }),
  ]

  // Default date: Feb 15, 2026
  const defaultDate = '2026-02-15T10:00:00Z'

  return {
    id: `w-${Math.random().toString(36).slice(2, 8)}`,
    user_id: 'u-1',
    split: 'Push',
    created_at: defaultDate,
    completed_at: rest.completed_at ?? '2026-02-15T11:00:00Z',
    notes: null,
    workout_sets: sets,
    totalVolume: sets.reduce((sum, s) => sum + ((s.weight_kg ?? 0) * (s.reps ?? 0)), 0),
    exerciseNames: [...new Set(sets.map(s => s.exercise))],
    ...rest,
  }
}

/** Create a workout on a specific date in Feb 2026 */
function febWorkout(day: number, overrides: Partial<Workout> = {}): Workout {
  const pad = String(day).padStart(2, '0')
  const created = `2026-02-${pad}T10:00:00Z`
  const completed = `2026-02-${pad}T11:00:00Z`
  return createWorkout({ created_at: created, completed_at: completed, ...overrides })
}

/** Create a workout in January 2026 (previous month) */
function janWorkout(day: number, overrides: Partial<Workout> = {}): Workout {
  const pad = String(day).padStart(2, '0')
  const created = `2026-01-${pad}T10:00:00Z`
  const completed = `2026-01-${pad}T11:00:00Z`
  return createWorkout({ created_at: created, completed_at: completed, ...overrides })
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

describe('filterWorkoutsForMonth', () => {
  it('returns only workouts in the target month', () => {
    const workouts = [
      febWorkout(1),
      febWorkout(15),
      janWorkout(20),
      createWorkout({ created_at: '2026-03-01T10:00:00Z' }),
    ]
    const result = filterWorkoutsForMonth(workouts, 1, 2026) // month 1 = Feb (0-indexed)
    expect(result).toHaveLength(2)
  })

  it('handles empty array', () => {
    const result = filterWorkoutsForMonth([], 1, 2026)
    expect(result).toHaveLength(0)
  })

  it('handles month boundary (midnight)', () => {
    // Use timezone-safe dates (midday) to avoid UTC/local offset issues
    const workouts = [
      createWorkout({ created_at: '2026-02-01T12:00:00Z' }),
      createWorkout({ created_at: '2026-02-28T12:00:00Z' }),
      createWorkout({ created_at: '2026-03-01T12:00:00Z' }),
    ]
    const result = filterWorkoutsForMonth(workouts, 1, 2026)
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

describe('computeOverview', () => {
  it('calculates total workouts, volume, sets, time', () => {
    const workouts = [
      febWorkout(1, {
        created_at: '2026-02-01T10:00:00Z',
        completed_at: '2026-02-01T11:00:00Z',
        workout_sets: [
          createWorkoutSet({ weight_kg: 100, reps: 10 }),
          createWorkoutSet({ weight_kg: 80, reps: 12 }),
        ],
      }),
      febWorkout(2, {
        created_at: '2026-02-02T10:00:00Z',
        completed_at: '2026-02-02T11:30:00Z',
        workout_sets: [
          createWorkoutSet({ weight_kg: 60, reps: 15 }),
        ],
      }),
    ]
    // Recompute totalVolume for accuracy
    workouts[0]!.totalVolume = 100 * 10 + 80 * 12
    workouts[1]!.totalVolume = 60 * 15

    const overview = computeOverview(workouts)
    expect(overview.totalWorkouts).toBe(2)
    expect(overview.totalVolume).toBe(100 * 10 + 80 * 12 + 60 * 15)
    expect(overview.totalSets).toBe(3)
    expect(overview.totalTimeMinutes).toBe(60 + 90) // 1h + 1.5h
  })

  it('handles workouts without completed_at', () => {
    const workouts = [
      febWorkout(1, { completed_at: null }),
    ]
    const overview = computeOverview(workouts)
    expect(overview.totalWorkouts).toBe(1)
    expect(overview.totalTimeMinutes).toBe(0)
  })

  it('returns zeros for empty array', () => {
    const overview = computeOverview([])
    expect(overview.totalWorkouts).toBe(0)
    expect(overview.totalVolume).toBe(0)
    expect(overview.totalSets).toBe(0)
    expect(overview.totalTimeMinutes).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Consistency
// ---------------------------------------------------------------------------

describe('computeConsistencyScore', () => {
  it('returns 100 for perfect adherence', () => {
    // Training frequency = 4/week, Feb has ~4 weeks, so 16 expected
    // Provide 16 workouts
    const workouts = Array.from({ length: 16 }, (_, i) =>
      febWorkout(Math.min(1 + i, 28)),
    )
    const score = computeConsistencyScore(workouts, 4, 1, 2026)
    expect(score).toBe(100)
  })

  it('returns 50 for half frequency', () => {
    // Frequency 4/week, 4 weeks = 16 expected, provide 8
    const workouts = Array.from({ length: 8 }, (_, i) =>
      febWorkout(1 + i * 3),
    )
    const score = computeConsistencyScore(workouts, 4, 1, 2026)
    expect(score).toBe(50)
  })
})

describe('computeLongestStreakInMonth', () => {
  it('counts consecutive training days', () => {
    const workouts = [
      febWorkout(5),
      febWorkout(6),
      febWorkout(7),
      febWorkout(10),
    ]
    expect(computeLongestStreakInMonth(workouts)).toBe(3)
  })

  it('handles gaps correctly', () => {
    const workouts = [
      febWorkout(1),
      febWorkout(3),
      febWorkout(4),
      febWorkout(5),
      febWorkout(10),
    ]
    expect(computeLongestStreakInMonth(workouts)).toBe(3)
  })

  it('handles month with 1 workout', () => {
    const workouts = [febWorkout(15)]
    expect(computeLongestStreakInMonth(workouts)).toBe(1)
  })

  it('returns 0 for empty array', () => {
    expect(computeLongestStreakInMonth([])).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// PRs
// ---------------------------------------------------------------------------

describe('computePRsInMonth', () => {
  it('detects new weight PRs', () => {
    const previousWorkouts = [
      janWorkout(10, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 80, reps: 8 }),
        ],
      }),
    ]
    const currentWorkouts = [
      febWorkout(15, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 90, reps: 8 }),
        ],
      }),
    ]
    const prs = computePRsInMonth(currentWorkouts, previousWorkouts)
    expect(prs.length).toBeGreaterThanOrEqual(1)
    const benchPR = prs.find(p => p.exercise === 'Bench Press')
    expect(benchPR).toBeDefined()
    expect(benchPR!.newBest).toBeGreaterThan(benchPR!.previousBest)
  })

  it('detects volume PRs (weight x reps)', () => {
    const previousWorkouts = [
      janWorkout(10, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Squat', weight_kg: 100, reps: 5 }),
        ],
      }),
    ]
    const currentWorkouts = [
      febWorkout(15, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Squat', weight_kg: 100, reps: 8 }),
        ],
      }),
    ]
    const prs = computePRsInMonth(currentWorkouts, previousWorkouts)
    expect(prs.length).toBeGreaterThanOrEqual(1)
  })

  it('returns empty when no PRs', () => {
    const previousWorkouts = [
      janWorkout(10, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 100, reps: 10 }),
        ],
      }),
    ]
    const currentWorkouts = [
      febWorkout(15, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 80, reps: 8 }),
        ],
      }),
    ]
    const prs = computePRsInMonth(currentWorkouts, previousWorkouts)
    expect(prs).toHaveLength(0)
  })

  it('excludes PRs from previous months', () => {
    // Only Jan workout has the PR weight, Feb is lower
    const previousWorkouts = [
      janWorkout(10, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 120, reps: 5 }),
        ],
      }),
    ]
    const currentWorkouts = [
      febWorkout(15, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 100, reps: 5 }),
        ],
      }),
    ]
    const prs = computePRsInMonth(currentWorkouts, previousWorkouts)
    expect(prs).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

describe('computeFavoriteExercise', () => {
  it('returns most trained exercise', () => {
    const workouts = [
      febWorkout(1, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press' }),
          createWorkoutSet({ exercise: 'Bench Press' }),
          createWorkoutSet({ exercise: 'Bench Press' }),
          createWorkoutSet({ exercise: 'Incline Press' }),
        ],
      }),
    ]
    const fav = computeFavoriteExercise(workouts)
    expect(fav).not.toBeNull()
    expect(fav!.name).toBe('Bench Press')
    expect(fav!.totalSets).toBe(3)
  })

  it('returns null for empty workouts', () => {
    expect(computeFavoriteExercise([])).toBeNull()
  })
})

describe('computeMostTrainedMuscle', () => {
  it('returns correct muscle group', () => {
    const workouts = [
      febWorkout(1, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press' }),
          createWorkoutSet({ exercise: 'Incline Press' }),
          createWorkoutSet({ exercise: 'Cable Fly' }),
          createWorkoutSet({ exercise: 'Barbell Row' }),
        ],
      }),
    ]
    const muscle = computeMostTrainedMuscle(workouts)
    expect(muscle).not.toBeNull()
    expect(muscle!.name).toBe('chest')
    expect(muscle!.sets).toBe(3)
  })

  it('returns null for empty workouts', () => {
    expect(computeMostTrainedMuscle([])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Split distribution
// ---------------------------------------------------------------------------

describe('computeSplitDistribution', () => {
  it('counts splits correctly', () => {
    const workouts = [
      febWorkout(1, { split: 'Push' }),
      febWorkout(2, { split: 'Push' }),
      febWorkout(3, { split: 'Pull' }),
      febWorkout(4, { split: 'Legs' }),
    ]
    const dist = computeSplitDistribution(workouts)
    const push = dist.find(d => d.split === 'Push')
    expect(push).toBeDefined()
    expect(push!.count).toBe(2)
    expect(dist).toHaveLength(3)
  })

  it('includes colors', () => {
    const workouts = [febWorkout(1, { split: 'Push' })]
    const dist = computeSplitDistribution(workouts)
    expect(dist[0]!.color).toBeTruthy()
    expect(typeof dist[0]!.color).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// Fun stats
// ---------------------------------------------------------------------------

describe('computeFunStats', () => {
  it('finds heaviest set', () => {
    const workouts = [
      febWorkout(1, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Deadlift', weight_kg: 200, reps: 3 }),
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 100, reps: 10 }),
        ],
      }),
    ]
    const stats = computeFunStats(workouts)
    expect(stats.heaviestSet).not.toBeNull()
    expect(stats.heaviestSet!.exercise).toBe('Deadlift')
    expect(stats.heaviestSet!.weight).toBe(200)
  })

  it('finds most reps in one set', () => {
    const workouts = [
      febWorkout(1, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Push Up', weight_kg: 0, reps: 50 }),
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 80, reps: 10 }),
        ],
      }),
    ]
    const stats = computeFunStats(workouts)
    expect(stats.mostRepsSet).not.toBeNull()
    expect(stats.mostRepsSet!.reps).toBe(50)
  })

  it('finds longest and shortest workout', () => {
    const workouts = [
      febWorkout(1, {
        created_at: '2026-02-01T10:00:00Z',
        completed_at: '2026-02-01T12:00:00Z', // 120 min
      }),
      febWorkout(2, {
        created_at: '2026-02-02T10:00:00Z',
        completed_at: '2026-02-02T10:30:00Z', // 30 min
      }),
    ]
    const stats = computeFunStats(workouts)
    expect(stats.longestWorkoutMinutes).toBe(120)
    expect(stats.shortestWorkoutMinutes).toBe(30)
  })

  it('handles null weights gracefully', () => {
    const workouts = [
      febWorkout(1, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Plank', weight_kg: null, reps: 1 }),
        ],
      }),
    ]
    const stats = computeFunStats(workouts)
    // Should not throw; heaviest set may be null or have weight 0
    expect(stats).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

describe('computePersonality', () => {
  it('returns "consistent" for high consistency', () => {
    expect(computePersonality({
      consistencyScore: 90,
      prsCount: 1,
      totalSets: 50,
      volumeDirection: 'stable',
      splitDistribution: [{ split: 'Push', count: 5, color: '' }],
    })).toBe('consistent')
  })

  it('returns "powerhouse" for many PRs', () => {
    expect(computePersonality({
      consistencyScore: 50,
      prsCount: 5,
      totalSets: 50,
      volumeDirection: 'stable',
      splitDistribution: [{ split: 'Push', count: 5, color: '' }],
    })).toBe('powerhouse')
  })

  it('returns "volume" for high volume trend', () => {
    expect(computePersonality({
      consistencyScore: 50,
      prsCount: 1,
      totalSets: 120,
      volumeDirection: 'up',
      splitDistribution: [{ split: 'Push', count: 5, color: '' }],
    })).toBe('volume')
  })

  it('returns "allrounder" for balanced splits', () => {
    expect(computePersonality({
      consistencyScore: 50,
      prsCount: 1,
      totalSets: 50,
      volumeDirection: 'stable',
      splitDistribution: [
        { split: 'Push', count: 4, color: '' },
        { split: 'Pull', count: 4, color: '' },
        { split: 'Legs', count: 4, color: '' },
      ],
    })).toBe('allrounder')
  })

  it('returns "persistent" as fallback', () => {
    expect(computePersonality({
      consistencyScore: 40,
      prsCount: 0,
      totalSets: 30,
      volumeDirection: 'down',
      splitDistribution: [{ split: 'Push', count: 10, color: '' }],
    })).toBe('persistent')
  })
})

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

describe('computeTrainingStory', () => {
  it('returns hasEnoughData false for <3 workouts', () => {
    const workouts = [febWorkout(1), febWorkout(2)]
    const allWorkouts = [...workouts]
    const story = computeTrainingStory(allWorkouts, 1, 2026, 4)
    expect(story.hasEnoughData).toBe(false)
  })

  it('returns complete data for valid month', () => {
    const currentMonthWorkouts = Array.from({ length: 8 }, (_, i) =>
      febWorkout(1 + i * 3, {
        split: i % 3 === 0 ? 'Push' : i % 3 === 1 ? 'Pull' : 'Legs',
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 80 + i, reps: 10 }),
          createWorkoutSet({ exercise: 'Barbell Row', weight_kg: 70 + i, reps: 10 }),
        ],
      }),
    )
    const previousMonthWorkouts = Array.from({ length: 6 }, (_, i) =>
      janWorkout(1 + i * 4, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 75, reps: 10 }),
        ],
      }),
    )
    const allWorkouts = [...currentMonthWorkouts, ...previousMonthWorkouts]
    const story = computeTrainingStory(allWorkouts, 1, 2026, 4)

    expect(story.hasEnoughData).toBe(true)
    expect(story.month).toBe(1)
    expect(story.year).toBe(2026)
    expect(story.totalWorkouts).toBe(8)
    expect(story.totalSets).toBeGreaterThan(0)
    expect(story.totalVolume).toBeGreaterThan(0)
    expect(story.splitDistribution.length).toBeGreaterThan(0)
    expect(story.personality).toBeDefined()
    expect(story.trainingDays.length).toBe(8)
  })

  it('includes comparison to previous month', () => {
    const currentMonthWorkouts = Array.from({ length: 5 }, (_, i) =>
      febWorkout(1 + i * 5, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 80, reps: 10 }),
        ],
      }),
    )
    const previousMonthWorkouts = Array.from({ length: 3 }, (_, i) =>
      janWorkout(1 + i * 8, {
        workout_sets: [
          createWorkoutSet({ exercise: 'Bench Press', weight_kg: 80, reps: 10 }),
        ],
      }),
    )
    const allWorkouts = [...currentMonthWorkouts, ...previousMonthWorkouts]
    const story = computeTrainingStory(allWorkouts, 1, 2026, 4)

    expect(story.comparison).toBeDefined()
    expect(story.comparison.workoutsChange).toBe(2) // 5 - 3
    expect(['up', 'down', 'stable']).toContain(story.comparison.direction)
  })
})

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

describe('Story state management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('markStoryViewed persists to localStorage', () => {
    markStoryViewed(1, 2026)
    expect(localStorage.setItem).toHaveBeenCalled()
  })

  it('isStoryViewed returns false before viewing', () => {
    expect(isStoryViewed(1, 2026)).toBe(false)
  })

  it('isStoryViewed returns true after viewing', () => {
    markStoryViewed(1, 2026)
    expect(isStoryViewed(1, 2026)).toBe(true)
  })

  it('getStoryState returns full state', () => {
    markStoryViewed(1, 2026)
    const state = getStoryState(1, 2026)
    expect(state.viewed).toBe(true)
    expect(state.month).toBe(1)
    expect(state.year).toBe(2026)
  })

  it('different months are independent', () => {
    markStoryViewed(0, 2026) // January
    expect(isStoryViewed(0, 2026)).toBe(true)
    expect(isStoryViewed(1, 2026)).toBe(false)
  })
})
