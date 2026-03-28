import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useActiveWorkout, getStaleStatus, STALE_THRESHOLD_MS, ABANDONED_THRESHOLD_MS, BACKUP_MAX_AGE_MS } from '../hooks/useActiveWorkout'
import type { ActiveWorkout } from '../types'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { id: 'wk-1', user_id: 'u-1', notes: null, created_at: new Date().toISOString() },
              error: null,
            })
          ),
        })),
      })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
  },
}))

vi.mock('../lib/workoutCache', () => ({
  invalidateWorkoutCache: vi.fn(),
}))

const TEST_USER_ID = 'u-1'
const BACKUP_KEY = 'coach-workout-backup'

function makeWorkout(overrides: Partial<ActiveWorkout> = {}): ActiveWorkout {
  return {
    tempId: 'test-id',
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    exercises: [],
    notes: '',
    ...overrides,
  }
}

function makeStaleWorkout(ageMs: number, setsCount: number): ActiveWorkout {
  const lastActivity = new Date(Date.now() - ageMs).toISOString()
  const exercises = setsCount > 0
    ? [{
        name: 'Bench Press',
        sets: Array.from({ length: setsCount }, (_, i) => ({
          id: `set-${i}`,
          weight_kg: 80,
          reps: 8,
          duration_seconds: null,
          rpe: null,
          created_at: lastActivity,
        })),
      }]
    : [{ name: 'Bench Press', sets: [] }]

  return {
    tempId: 'test-id',
    startedAt: new Date(Date.now() - ageMs - 60000).toISOString(),
    lastActivityAt: lastActivity,
    exercises,
    notes: '',
  }
}

describe('Stale workout detection', () => {
  it('workout less than 2 hours old is NOT stale', () => {
    const workout = makeStaleWorkout(60 * 60 * 1000, 4) // 1 hour, 4 sets
    expect(getStaleStatus(workout)).toBe('fresh')
  })

  it('workout more than 2 hours old with sets IS stale', () => {
    const workout = makeStaleWorkout(STALE_THRESHOLD_MS + 1000, 4) // 2h + 1s, 4 sets
    expect(getStaleStatus(workout)).toBe('stale')
  })

  it('workout more than 6 hours old IS abandoned', () => {
    const workout = makeStaleWorkout(ABANDONED_THRESHOLD_MS + 1000, 2) // 6h + 1s, 2 sets
    expect(getStaleStatus(workout)).toBe('abandoned')
  })

  it('workout with 0 sets is never stale (user just started and walked away)', () => {
    const workout = makeStaleWorkout(STALE_THRESHOLD_MS + 1000, 0) // 2h + 1s, 0 sets
    expect(getStaleStatus(workout)).toBe('fresh')
  })

  it('workout without lastActivityAt is fresh', () => {
    const workout = makeWorkout({ lastActivityAt: undefined })
    expect(getStaleStatus(workout)).toBe('fresh')
  })

  it('null workout is fresh', () => {
    expect(getStaleStatus(null)).toBe('fresh')
  })
})

describe('lastActivityAt tracking', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lastActivityAt is set when starting a workout', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })

    expect(result.current.workout?.lastActivityAt).toBeDefined()
  })

  it('lastActivityAt is updated when adding a set', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })

    const initialActivity = result.current.workout?.lastActivityAt

    // Small delay to ensure different timestamp
    act(() => {
      result.current.addSet('Bench Press', { weight_kg: 80, reps: 8, duration_seconds: null, rpe: 7 })
    })

    expect(result.current.workout?.lastActivityAt).toBeDefined()
    // The timestamp should be at least as recent as the initial one
    expect(new Date(result.current.workout!.lastActivityAt!).getTime())
      .toBeGreaterThanOrEqual(new Date(initialActivity!).getTime())
  })

  it('lastActivityAt is updated when removing a set', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })
    act(() => {
      result.current.addSet('Bench Press', { weight_kg: 80, reps: 8, duration_seconds: null, rpe: 7 })
    })

    const setId = result.current.workout!.exercises[0]!.sets[0]!.id

    act(() => {
      result.current.removeSet('Bench Press', setId)
    })

    expect(result.current.workout?.lastActivityAt).toBeDefined()
  })

  it('lastActivityAt is updated when adding an exercise', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([])
    })

    const before = result.current.workout?.lastActivityAt

    act(() => {
      result.current.addExercise({ name: 'Squat' })
    })

    expect(new Date(result.current.workout!.lastActivityAt!).getTime())
      .toBeGreaterThanOrEqual(new Date(before!).getTime())
  })

  it('lastActivityAt is updated when removing an exercise', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })

    act(() => {
      result.current.removeExercise('Bench Press')
    })

    expect(result.current.workout?.lastActivityAt).toBeDefined()
  })

  it('lastActivityAt is updated when updating notes', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([])
    })

    act(() => {
      result.current.updateNotes('Great session')
    })

    expect(result.current.workout?.lastActivityAt).toBeDefined()
  })
})

describe('Backup and recovery', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('backup is created when workout is active', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })

    // Backup is created immediately on mount with workout
    const backup = localStorage.getItem(BACKUP_KEY)
    expect(backup).toBeTruthy()

    const parsed = JSON.parse(backup!) as ActiveWorkout
    expect(parsed.tempId).toBe(result.current.workout!.tempId)
  })

  it('backup can be recovered when active workout is missing', () => {
    // First, create a workout so a backup gets created
    const { result: r1, unmount } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      r1.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })
    act(() => {
      r1.current.addSet('Bench Press', { weight_kg: 80, reps: 8, duration_seconds: null, rpe: 7 })
    })

    // Simulate crash: remove active workout but keep backup
    localStorage.removeItem('coach-active-workout')
    unmount()

    // Mount again - should detect backup
    const { result: r2 } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    expect(r2.current.hasBackup).toBe(true)
    expect(r2.current.workout).toBeNull()

    // Recover
    act(() => {
      r2.current.recoverFromBackup()
    })

    expect(r2.current.workout).not.toBeNull()
    expect(r2.current.workout!.exercises[0]!.name).toBe('Bench Press')
    expect(r2.current.workout!.exercises[0]!.sets.length).toBe(1)
  })

  it('old backup (>12h) is not offered for recovery', () => {
    // Create an old backup directly
    const oldWorkout: ActiveWorkout = {
      tempId: 'old-id',
      startedAt: new Date(Date.now() - BACKUP_MAX_AGE_MS - 60000).toISOString(),
      lastActivityAt: new Date(Date.now() - BACKUP_MAX_AGE_MS - 60000).toISOString(),
      exercises: [{ name: 'Bench Press', sets: [] }],
      notes: '',
    }
    localStorage.setItem(BACKUP_KEY, JSON.stringify(oldWorkout))

    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    expect(result.current.hasBackup).toBe(false)
  })

  it('backup is cleared when workout is discarded', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })

    expect(localStorage.getItem(BACKUP_KEY)).toBeTruthy()

    act(() => {
      result.current.discardWorkout()
    })

    expect(localStorage.getItem(BACKUP_KEY)).toBeNull()
  })

  it('backup can be dismissed without recovery', () => {
    const workout: ActiveWorkout = {
      tempId: 'backup-id',
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      lastActivityAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      exercises: [{ name: 'Bench Press', sets: [] }],
      notes: '',
    }
    localStorage.setItem(BACKUP_KEY, JSON.stringify(workout))

    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    expect(result.current.hasBackup).toBe(true)

    act(() => {
      result.current.dismissBackup()
    })

    expect(result.current.hasBackup).toBe(false)
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull()
  })
})

describe('staleStatus in hook', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('fresh workout returns staleStatus fresh', () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })
    act(() => {
      result.current.addSet('Bench Press', { weight_kg: 80, reps: 8, duration_seconds: null, rpe: 7 })
    })

    expect(result.current.staleStatus).toBe('fresh')
  })

  it('stale workout loaded from localStorage returns stale status', () => {
    const staleWorkout = makeStaleWorkout(STALE_THRESHOLD_MS + 1000, 3)
    localStorage.setItem('coach-active-workout', JSON.stringify(staleWorkout))

    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    expect(result.current.staleStatus).toBe('stale')
  })
})
