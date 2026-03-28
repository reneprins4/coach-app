/**
 * BUG-002: Verify that finishWorkout rejects workouts with 0 logged sets
 * and succeeds for workouts with at least 1 set.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useActiveWorkout } from '../hooks/useActiveWorkout'

// Mock Supabase – prevent real network calls
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

const TEST_USER_ID = 'u-1'

describe('BUG-002: useActiveWorkout.finishWorkout', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('finishWorkout returns null when workout has no logged sets', async () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    // Start workout with exercises but no sets
    act(() => {
      result.current.startWorkout([
        { name: 'Bench Press', sets: [] },
        { name: 'Squat', sets: [] },
      ])
    })

    expect(result.current.workout).not.toBeNull()
    expect(result.current.totalSets).toBe(0)

    // Attempt to finish – should be rejected
    let finished: unknown
    await act(async () => {
      finished = await result.current.finishWorkout()
    })

    expect(finished).toBeNull()
    // Workout should NOT be cleared (still active so user can add sets)
    expect(result.current.workout).not.toBeNull()
    // Error message should be set
    expect(result.current.error).toBeTruthy()
  })

  it('finishWorkout succeeds when workout has at least 1 set', async () => {
    const { result } = renderHook(() => useActiveWorkout(TEST_USER_ID))

    // Start workout and log a set
    act(() => {
      result.current.startWorkout([{ name: 'Bench Press', sets: [] }])
    })
    act(() => {
      result.current.addSet('Bench Press', { weight_kg: 80, reps: 8, duration_seconds: null, rpe: 7 })
    })

    expect(result.current.totalSets).toBe(1)

    let finished: unknown
    await act(async () => {
      finished = await result.current.finishWorkout()
    })

    // Should return a result object (not null)
    expect(finished).not.toBeNull()
    expect(finished).toHaveProperty('id')
    // Workout should be cleared after successful save
    expect(result.current.workout).toBeNull()
  })
})
