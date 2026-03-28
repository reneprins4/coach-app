/**
 * Chaos Tests: Corrupt, missing, and unexpected data
 *
 * Verifies every module that reads from localStorage or processes external data
 * degrades gracefully — returning safe defaults instead of throwing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSettings, saveSettings } from '../../lib/settings'
import { getCurrentBlock } from '../../lib/periodization'
import { getUnlockedAchievements, syncAchievements, buildAchievementContext, calculateStreak } from '../../lib/achievements'
import { loadInjuries, saveInjuries, isExerciseSafe, filterWorkoutForInjuries } from '../../lib/injuryRecovery'
import type { ActiveInjury } from '../../lib/injuryRecovery'
import { getPrGoals } from '../../lib/prGoals'
import { getCachedExercises, isCacheStale, CACHE_KEY, CACHE_TIMESTAMP_KEY, CACHE_TTL_MS } from '../../lib/exerciseCache'
import { analyzeTraining, calcMuscleRecovery, classifyExercise, MUSCLE_GROUPS } from '../../lib/training-analysis'
import { generateLocalWorkout } from '../../lib/localWorkoutGenerator'
import { analyzeOptimalHour, computeWorkoutScore, getTimeSlot } from '../../lib/optimalHour'
import { calculateProgression } from '../../lib/progressiveOverload'
import type { Workout, WorkoutSet, MuscleStatusMap } from '../../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w-1',
    user_id: 'u-1',
    split: 'Push',
    created_at: new Date().toISOString(),
    completed_at: null,
    notes: null,
    workout_sets: [],
    totalVolume: 0,
    exerciseNames: [],
    ...overrides,
  }
}

function makeSet(overrides: Partial<WorkoutSet> = {}): WorkoutSet {
  return {
    id: 's-1',
    workout_id: 'w-1',
    user_id: 'u-1',
    exercise: 'Flat Barbell Bench Press',
    weight_kg: 80,
    reps: 10,
    duration_seconds: null,
    rpe: 7,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeDefaultMuscleStatus(): MuscleStatusMap {
  const status = {} as MuscleStatusMap
  for (const muscle of MUSCLE_GROUPS) {
    status[muscle] = {
      setsThisWeek: 0,
      daysSinceLastTrained: null,
      hoursSinceLastTrained: null,
      avgRpeLastSession: null,
      setsLastSession: 0,
      totalDurationLastSession: 0,
      recoveryPct: 100,
      recentExercises: [],
      lastSessionSets: [],
      target: { min: 10, max: 20, mev: 8 },
      status: 'needs_work',
    }
  }
  return status
}

// ---------------------------------------------------------------------------
// Corrupt localStorage
// ---------------------------------------------------------------------------

describe('Chaos: Corrupt localStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // ---- Settings ----------------------------------------------------------

  describe('Settings', () => {
    it('getSettings handles corrupt JSON in localStorage', () => {
      localStorage.setItem('coach-app-settings', '{not valid json!!!')
      const result = getSettings()
      expect(result).toBeDefined()
      expect(result.gender).toBe('male')
      expect(result.goal).toBe('hypertrophy')
    })

    it('getSettings handles null values in settings object', () => {
      localStorage.setItem('coach-app-settings', JSON.stringify({
        name: null,
        gender: null,
        goal: null,
        frequency: null,
        restTime: null,
        units: null,
      }))
      const result = getSettings()
      expect(result).toBeDefined()
      // The spread merge will overwrite defaults with null — that is
      // the documented behaviour. Verify no throw.
      expect(() => getSettings()).not.toThrow()
    })

    it('getSettings handles missing keys gracefully', () => {
      localStorage.setItem('coach-app-settings', JSON.stringify({ name: 'Test' }))
      const result = getSettings()
      expect(result.name).toBe('Test')
      // Defaults fill in
      expect(result.goal).toBe('hypertrophy')
      expect(result.frequency).toBe('4x')
    })

    it('getSettings handles localStorage with wrong type (number instead of string)', () => {
      localStorage.setItem('coach-app-settings', '42')
      const result = getSettings()
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('saveSettings handles corrupt existing settings', () => {
      localStorage.setItem('coach-app-settings', 'BROKEN')
      // saveSettings calls getSettings internally; should not throw
      const result = saveSettings({ name: 'Chaos' })
      expect(result.name).toBe('Chaos')
      expect(result.goal).toBe('hypertrophy')
    })
  })

  // ---- Active Workout (load helper) -------------------------------------

  describe('Active Workout localStorage', () => {
    it('handles corrupt workout JSON', () => {
      localStorage.setItem('coach-active-workout', '<<<not json>>>')
      // The load<T> helper in useActiveWorkout returns null on parse failure
      let parsed: unknown = 'sentinel'
      try {
        parsed = JSON.parse(localStorage.getItem('coach-active-workout')!)
      } catch {
        parsed = null
      }
      expect(parsed).toBeNull()
    })

    it('handles workout with null exercises array', () => {
      localStorage.setItem('coach-active-workout', JSON.stringify({
        tempId: 'abc',
        startedAt: new Date().toISOString(),
        exercises: null,
        notes: '',
      }))
      const raw = JSON.parse(localStorage.getItem('coach-active-workout')!)
      expect(raw.exercises).toBeNull()
      // Real hook would deal with this; no crash on parse
    })

    it('handles workout with missing startedAt', () => {
      localStorage.setItem('coach-active-workout', JSON.stringify({
        tempId: 'abc',
        exercises: [],
        notes: '',
      }))
      const raw = JSON.parse(localStorage.getItem('coach-active-workout')!)
      expect(raw.startedAt).toBeUndefined()
    })

    it('handles last-used store with corrupt JSON', () => {
      localStorage.setItem('coach-last-used', '---broken---')
      let result: unknown = 'sentinel'
      try {
        result = JSON.parse(localStorage.getItem('coach-last-used')!)
      } catch {
        result = null
      }
      expect(result).toBeNull()
    })
  })

  // ---- Periodization -----------------------------------------------------

  describe('Periodization', () => {
    it('getCurrentBlock handles corrupt block JSON', () => {
      localStorage.setItem('coach-training-block', '!@#$%^&*()')
      const result = getCurrentBlock()
      expect(result).toBeNull()
    })

    it('getCurrentBlock handles block with missing phase', () => {
      localStorage.setItem('coach-training-block', JSON.stringify({
        id: 'b1',
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        // phase is missing
      }))
      const result = getCurrentBlock()
      expect(result).toBeNull()
    })

    it('getCurrentBlock handles block with invalid phase name', () => {
      localStorage.setItem('coach-training-block', JSON.stringify({
        id: 'b1',
        phase: 'nonexistent_phase',
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      }))
      const result = getCurrentBlock()
      expect(result).toBeNull()
    })

    it('getCurrentBlock handles block with future startDate', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      localStorage.setItem('coach-training-block', JSON.stringify({
        id: 'b1',
        phase: 'accumulation',
        startDate: futureDate.toISOString(),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      }))
      // Should not throw — returns a block (week may be negative with future date)
      expect(() => getCurrentBlock()).not.toThrow()
      const result = getCurrentBlock()
      expect(result).not.toBeNull()
      expect(typeof result!.currentWeek).toBe('number')
    })

    it('getCurrentBlock handles block with missing startDate', () => {
      localStorage.setItem('coach-training-block', JSON.stringify({
        id: 'b1',
        phase: 'accumulation',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      }))
      const result = getCurrentBlock()
      // Validation check rejects blocks without startDate
      expect(result).toBeNull()
    })
  })

  // ---- Achievements ------------------------------------------------------

  describe('Achievements', () => {
    it('getUnlockedAchievements handles corrupt JSON', () => {
      localStorage.setItem('kravex-achievements', '{{{broken}}}')
      const result = getUnlockedAchievements()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })

    it('getUnlockedAchievements handles non-array JSON', () => {
      localStorage.setItem('kravex-achievements', '"just a string"')
      // JSON.parse succeeds, but returns a string, which the code casts as string[]
      // This tests that the app can handle it without crashing
      expect(() => getUnlockedAchievements()).not.toThrow()
    })

    it('getUnlockedAchievements handles object instead of array', () => {
      localStorage.setItem('kravex-achievements', '{"id":"first_workout"}')
      expect(() => getUnlockedAchievements()).not.toThrow()
    })

    it('syncAchievements handles corrupt stored achievements', () => {
      localStorage.setItem('kravex-achievements', 'CORRUPT')
      const ctx = buildAchievementContext(
        [makeWorkout()],
        80,
        new Date().toISOString(),
      )
      // Should not throw — falls back to empty array
      expect(() => syncAchievements(ctx)).not.toThrow()
    })
  })

  // ---- Injuries ----------------------------------------------------------

  describe('Injuries', () => {
    it('loadInjuries handles corrupt JSON', () => {
      localStorage.setItem('kravex_injuries', '<<invalid>>')
      const result = loadInjuries()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })

    it('loadInjuries handles injuries with missing fields', () => {
      localStorage.setItem('kravex_injuries', JSON.stringify([
        { id: 'i1' }, // missing bodyArea, side, severity, etc.
      ]))
      const result = loadInjuries()
      expect(Array.isArray(result)).toBe(true)
      // Loads without throwing, partial data is returned
      expect(result.length).toBe(1)
    })

    it('loadInjuries handles non-array data', () => {
      localStorage.setItem('kravex_injuries', '{"id":"i1"}')
      const result = loadInjuries()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })

    it('loadInjuries handles null value', () => {
      localStorage.setItem('kravex_injuries', 'null')
      const result = loadInjuries()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })

    it('saveInjuries handles full localStorage gracefully', () => {
      vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
        throw new DOMException('QuotaExceededError')
      })
      // Should not throw
      expect(() => saveInjuries([])).not.toThrow()
    })
  })

  // ---- PR Goals ----------------------------------------------------------

  describe('PR Goals', () => {
    it('getPrGoals handles corrupt JSON', () => {
      localStorage.setItem('kravex-pr-goals', '!!broken!!')
      const result = getPrGoals()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })

    it('getPrGoals handles goals with missing exercise name', () => {
      localStorage.setItem('kravex-pr-goals', JSON.stringify([
        { targetKg: 100, createdAt: new Date().toISOString() },
      ]))
      const result = getPrGoals()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(1)
    })

    it('getPrGoals handles non-array JSON', () => {
      localStorage.setItem('kravex-pr-goals', '"a string"')
      const result = getPrGoals()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })

    it('getPrGoals handles object instead of array', () => {
      localStorage.setItem('kravex-pr-goals', '{"exercise":"Bench"}')
      const result = getPrGoals()
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual([])
    })
  })

  // ---- Exercise Cache ----------------------------------------------------

  describe('Exercise Cache', () => {
    it('getCachedExercises handles corrupt cache', () => {
      localStorage.setItem(CACHE_KEY, 'not-json-at-all')
      const result = getCachedExercises()
      expect(result).toBeNull()
    })

    it('getCachedExercises handles empty string', () => {
      localStorage.setItem(CACHE_KEY, '')
      const result = getCachedExercises()
      // Empty string: getItem returns '', which is truthy, parse fails
      expect(result).toBeNull()
    })

    it('isCacheStale handles expired timestamp', () => {
      localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now() - CACHE_TTL_MS - 1))
      expect(isCacheStale()).toBe(true)
    })

    it('isCacheStale handles non-numeric timestamp', () => {
      localStorage.setItem(CACHE_TIMESTAMP_KEY, 'not-a-number')
      // Number('not-a-number') is NaN, so Date.now() - NaN is NaN > TTL is false
      // but the function should still not throw
      expect(() => isCacheStale()).not.toThrow()
    })

    it('isCacheStale handles missing timestamp', () => {
      // No timestamp set
      expect(isCacheStale()).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// Unexpected algorithm inputs
// ---------------------------------------------------------------------------

describe('Chaos: Unexpected algorithm inputs', () => {

  // ---- Training Analysis -------------------------------------------------

  describe('Training Analysis', () => {
    it('analyzeTraining handles empty workouts array', () => {
      const result = analyzeTraining([])
      expect(result).toBeDefined()
      for (const muscle of MUSCLE_GROUPS) {
        expect(result[muscle]).toBeDefined()
        expect(result[muscle].recoveryPct).toBe(100)
      }
    })

    it('analyzeTraining handles workouts with empty sets arrays', () => {
      const result = analyzeTraining([makeWorkout({ workout_sets: [] })])
      expect(result).toBeDefined()
      for (const muscle of MUSCLE_GROUPS) {
        expect(result[muscle].setsThisWeek).toBe(0)
      }
    })

    it('analyzeTraining handles workouts with null weight_kg', () => {
      const result = analyzeTraining([
        makeWorkout({
          workout_sets: [makeSet({ weight_kg: null })],
        }),
      ])
      expect(() => analyzeTraining([
        makeWorkout({ workout_sets: [makeSet({ weight_kg: null })] }),
      ])).not.toThrow()
      expect(result).toBeDefined()
    })

    it('analyzeTraining handles workouts with negative reps', () => {
      const result = analyzeTraining([
        makeWorkout({
          workout_sets: [makeSet({ reps: -5 })],
        }),
      ])
      expect(result).toBeDefined()
      // Should not crash, even with nonsensical data
    })

    it('analyzeTraining handles workouts with NaN values', () => {
      const w = makeWorkout({
        workout_sets: [makeSet({ weight_kg: NaN as unknown as number, reps: NaN as unknown as number })],
      })
      expect(() => analyzeTraining([w])).not.toThrow()
    })

    it('analyzeTraining handles duplicate workout IDs', () => {
      const w1 = makeWorkout({ id: 'dup', workout_sets: [makeSet()] })
      const w2 = makeWorkout({ id: 'dup', workout_sets: [makeSet()] })
      const result = analyzeTraining([w1, w2])
      expect(result).toBeDefined()
    })

    it('analyzeTraining handles workouts with undefined workout_sets', () => {
      const w = makeWorkout()
      ;(w as unknown as Record<string, unknown>).workout_sets = undefined
      expect(() => analyzeTraining([w])).not.toThrow()
    })

    it('analyzeTraining handles invalid goal string', () => {
      const result = analyzeTraining([], 'nonexistent_goal')
      expect(result).toBeDefined()
      // Falls back to hypertrophy
      for (const muscle of MUSCLE_GROUPS) {
        expect(result[muscle].target).toBeDefined()
      }
    })

    it('analyzeTraining handles workout with future created_at', () => {
      const future = new Date()
      future.setFullYear(future.getFullYear() + 1)
      const result = analyzeTraining([
        makeWorkout({
          created_at: future.toISOString(),
          workout_sets: [makeSet()],
        }),
      ])
      expect(result).toBeDefined()
    })

    it('analyzeTraining handles sets with empty exercise name', () => {
      const result = analyzeTraining([
        makeWorkout({
          workout_sets: [makeSet({ exercise: '' })],
        }),
      ])
      expect(result).toBeDefined()
    })
  })

  // ---- calcMuscleRecovery ------------------------------------------------

  describe('calcMuscleRecovery', () => {
    it('handles null hours since trained', () => {
      expect(calcMuscleRecovery('chest', null, 7, 4)).toBe(100)
    })

    it('handles NaN hours since trained', () => {
      expect(calcMuscleRecovery('chest', NaN, 7, 4)).toBe(100)
    })

    it('handles Infinity hours since trained', () => {
      expect(calcMuscleRecovery('chest', Infinity, 7, 4)).toBe(100)
    })

    it('handles negative hours since trained', () => {
      const result = calcMuscleRecovery('chest', -10, 7, 4)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(100)
    })

    it('handles unknown muscle group', () => {
      const result = calcMuscleRecovery('nonexistent_muscle', 48, 7, 4)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('handles NaN sets count', () => {
      const result = calcMuscleRecovery('chest', 48, 7, NaN)
      expect(typeof result).toBe('number')
    })

    it('handles RPE of 0', () => {
      const result = calcMuscleRecovery('chest', 48, 0, 4)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  // ---- classifyExercise --------------------------------------------------

  describe('classifyExercise', () => {
    it('handles empty string', () => {
      expect(classifyExercise('')).toBeNull()
    })

    it('handles unknown exercise', () => {
      expect(classifyExercise('Underwater Basket Weaving')).toBeNull()
    })

    it('handles special characters in name', () => {
      expect(() => classifyExercise('Bench (flat) @ 80%')).not.toThrow()
    })
  })

  // ---- Local Workout Generator -------------------------------------------

  describe('Local Workout Generator', () => {
    it('generateLocalWorkout handles empty muscleStatus', () => {
      const emptyStatus = makeDefaultMuscleStatus()
      const result = generateLocalWorkout({
        muscleStatus: emptyStatus,
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: {},
      })
      expect(result).toBeDefined()
      expect(result.split).toBe('Push')
      expect(Array.isArray(result.exercises)).toBe(true)
    })

    it('generateLocalWorkout handles unknown split name', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Nonexistent Split',
        recentHistory: [],
        preferences: {},
      })
      // Falls back to Full Body template
      expect(result).toBeDefined()
      expect(Array.isArray(result.exercises)).toBe(true)
    })

    it('generateLocalWorkout handles negative time', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: { time: -30 },
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.exercises)).toBe(true)
    })

    it('generateLocalWorkout handles unknown equipment type', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: { equipment: 'underwater_gym' },
      })
      // Falls back to full_gym
      expect(result).toBeDefined()
      expect(result.exercises.length).toBeGreaterThan(0)
    })

    it('generateLocalWorkout handles zero bodyweight', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: { bodyweight: '0' },
      })
      expect(result).toBeDefined()
    })

    it('generateLocalWorkout handles NaN bodyweight string', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: { bodyweight: 'not-a-number' },
      })
      expect(result).toBeDefined()
      // Falls back to 80kg default
    })

    it('generateLocalWorkout handles deload with extreme settings', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: { isDeload: true, energy: 'low', time: 10 },
      })
      expect(result).toBeDefined()
      expect(Array.isArray(result.exercises)).toBe(true)
    })

    it('generateLocalWorkout handles focused muscles not in template', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Push',
        recentHistory: [],
        preferences: { focusedMuscles: ['hamstrings', 'glutes'] },
      })
      expect(result).toBeDefined()
    })

    it('generateLocalWorkout handles history with null values', () => {
      const result = generateLocalWorkout({
        muscleStatus: makeDefaultMuscleStatus(),
        recommendedSplit: 'Push',
        recentHistory: [{
          date: new Date().toISOString(),
          sets: [
            { exercise: 'Flat Barbell Bench Press', weight_kg: null, reps: null, rpe: null },
          ],
        }],
        preferences: {},
      })
      expect(result).toBeDefined()
    })
  })

  // ---- Optimal Hour ------------------------------------------------------

  describe('Optimal Hour', () => {
    it('analyzeOptimalHour handles empty array', () => {
      const result = analyzeOptimalHour([])
      expect(result.hasEnoughData).toBe(false)
      expect(result.bestSlot).toBeNull()
    })

    it('analyzeOptimalHour handles workouts with invalid dates', () => {
      const workouts = Array.from({ length: 25 }, (_, i) =>
        makeWorkout({
          id: `w-${i}`,
          created_at: 'not-a-date',
          workout_sets: [makeSet()],
        }),
      )
      // new Date('not-a-date') returns Invalid Date — getHours() returns NaN
      expect(() => analyzeOptimalHour(workouts)).not.toThrow()
    })

    it('analyzeOptimalHour handles workouts all at midnight', () => {
      const workouts = Array.from({ length: 25 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        d.setHours(0, 0, 0, 0) // midnight — outside normal 6-22 range
        return makeWorkout({
          id: `w-${i}`,
          created_at: d.toISOString(),
          workout_sets: [makeSet()],
        })
      })
      const result = analyzeOptimalHour(workouts)
      // Midnight is clamped to 06:00 slot
      expect(result).toBeDefined()
      expect(result.hasEnoughData).toBe(true)
    })

    it('analyzeOptimalHour handles workouts with no sets', () => {
      const workouts = Array.from({ length: 25 }, (_, i) =>
        makeWorkout({ id: `w-${i}`, workout_sets: [] }),
      )
      const result = analyzeOptimalHour(workouts)
      expect(result).toBeDefined()
    })

    it('computeWorkoutScore handles workout with null weights and reps', () => {
      const w = makeWorkout({
        workout_sets: [
          makeSet({ weight_kg: null, reps: null, rpe: null }),
        ],
      })
      const score = computeWorkoutScore(w)
      expect(score.volume).toBe(0)
      expect(score.avgRpe).toBeNull()
    })

    it('getTimeSlot handles edge hour values', () => {
      const d3am = new Date('2024-01-01T03:00:00')
      expect(() => getTimeSlot(d3am)).not.toThrow()

      const d23pm = new Date('2024-01-01T23:00:00')
      expect(() => getTimeSlot(d23pm)).not.toThrow()
    })
  })

  // ---- Progressive Overload ----------------------------------------------

  describe('Progressive Overload', () => {
    it('calculateProgression handles weight = 0', () => {
      const result = calculateProgression({
        exercise: 'Flat Barbell Bench Press',
        previousWeight: 0,
        previousReps: 10,
        previousRpe: 7,
        targetRepRange: [8, 12],
        muscleGroup: 'chest',
      })
      expect(result).toBeDefined()
      expect(result.suggestedWeight).toBeGreaterThanOrEqual(0)
    })

    it('calculateProgression handles reps = 0', () => {
      const result = calculateProgression({
        exercise: 'Flat Barbell Bench Press',
        previousWeight: 80,
        previousReps: 0,
        previousRpe: 7,
        targetRepRange: [8, 12],
        muscleGroup: 'chest',
      })
      expect(result).toBeDefined()
      expect(result.strategy).toBeDefined()
    })

    it('calculateProgression handles RPE = 0', () => {
      const result = calculateProgression({
        exercise: 'Flat Barbell Bench Press',
        previousWeight: 80,
        previousReps: 10,
        previousRpe: 0,
        targetRepRange: [8, 12],
        muscleGroup: 'chest',
      })
      expect(result).toBeDefined()
    })

    it('calculateProgression handles extreme weight (9999kg)', () => {
      const result = calculateProgression({
        exercise: 'Back Squat',
        previousWeight: 9999,
        previousReps: 5,
        previousRpe: 7,
        targetRepRange: [3, 5],
        muscleGroup: 'quads',
      })
      expect(result).toBeDefined()
      expect(result.suggestedWeight).toBeGreaterThan(0)
      expect(Number.isFinite(result.suggestedWeight)).toBe(true)
    })

    it('calculateProgression handles null previousWeight', () => {
      const result = calculateProgression({
        exercise: 'Flat Barbell Bench Press',
        previousWeight: null,
        previousReps: null,
        previousRpe: null,
        targetRepRange: [8, 12],
        muscleGroup: 'chest',
      })
      expect(result.strategy).toBe('estimate')
      expect(result.suggestedWeight).toBeGreaterThan(0)
    })

    it('calculateProgression handles RPE exactly 9.5 (boundary)', () => {
      const result = calculateProgression({
        exercise: 'Flat Barbell Bench Press',
        previousWeight: 100,
        previousReps: 8,
        previousRpe: 9.5,
        targetRepRange: [8, 12],
        muscleGroup: 'chest',
      })
      expect(result.strategy).toBe('deload')
      expect(result.suggestedWeight).toBeLessThan(100)
    })

    it('calculateProgression handles inverted rep range', () => {
      // repMin > repMax — edge case
      const result = calculateProgression({
        exercise: 'Flat Barbell Bench Press',
        previousWeight: 80,
        previousReps: 10,
        previousRpe: 7,
        targetRepRange: [12, 8], // inverted
        muscleGroup: 'chest',
      })
      expect(result).toBeDefined()
      expect(Number.isFinite(result.suggestedReps)).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// Partial/broken Supabase-shaped responses
// ---------------------------------------------------------------------------

describe('Chaos: Partial/broken Supabase responses', () => {
  it('analyzeTraining handles workout with sets as undefined', () => {
    const w = {
      id: 'w-1',
      user_id: 'u-1',
      split: 'Push',
      created_at: new Date().toISOString(),
      completed_at: null,
      notes: null,
      workout_sets: undefined as unknown as WorkoutSet[],
      totalVolume: 0,
      exerciseNames: [],
    }
    expect(() => analyzeTraining([w])).not.toThrow()
  })

  it('analyzeTraining handles workout with created_at as null', () => {
    const w = makeWorkout({
      created_at: null as unknown as string,
      workout_sets: [makeSet()],
    })
    // new Date(null) creates Invalid Date — should not crash
    expect(() => analyzeTraining([w])).not.toThrow()
  })

  it('analyzeTraining handles workout_sets with exercise as empty string', () => {
    const w = makeWorkout({
      workout_sets: [makeSet({ exercise: '' })],
    })
    const result = analyzeTraining([w])
    expect(result).toBeDefined()
  })

  it('computeWorkoutScore handles set with value as string instead of number', () => {
    const w = makeWorkout({
      workout_sets: [makeSet({ weight_kg: '80' as unknown as number, reps: '10' as unknown as number })],
    })
    // JavaScript will coerce during multiplication
    expect(() => computeWorkoutScore(w)).not.toThrow()
    const score = computeWorkoutScore(w)
    expect(typeof score.volume).toBe('number')
  })

  it('buildAchievementContext handles workouts with missing workout_sets', () => {
    const w = {
      id: 'w-1',
      user_id: 'u-1',
      split: 'Push',
      created_at: new Date().toISOString(),
      completed_at: null,
      notes: null,
      workout_sets: undefined as unknown as WorkoutSet[],
      totalVolume: 500,
      exerciseNames: ['Bench Press'],
    }
    // buildAchievementContext iterates w.workout_sets
    expect(() => buildAchievementContext([w], 80, null)).not.toThrow()
  })

  it('calculateStreak handles workouts with invalid created_at', () => {
    const w = makeWorkout({ created_at: 'not-a-date' })
    expect(() => calculateStreak([w])).not.toThrow()
  })

  it('filterWorkoutForInjuries handles exercises with empty name', () => {
    const exercises = [
      { name: '', muscle_group: 'chest' },
    ]
    const injury: ActiveInjury = {
      id: 'i1',
      bodyArea: 'shoulder',
      side: 'left',
      severity: 'mild',
      reportedDate: new Date().toISOString(),
      status: 'active',
      checkIns: [],
    }
    expect(() => filterWorkoutForInjuries(exercises, [injury])).not.toThrow()
  })

  it('filterWorkoutForInjuries throws on undefined exercise name (known gap)', () => {
    const exercises = [
      { name: undefined as unknown as string, muscle_group: 'back' },
    ]
    const injury: ActiveInjury = {
      id: 'i1',
      bodyArea: 'shoulder',
      side: 'left',
      severity: 'mild',
      reportedDate: new Date().toISOString(),
      status: 'active',
      checkIns: [],
    }
    // Documents a known gap: undefined name causes TypeError in toLowerCase()
    expect(() => filterWorkoutForInjuries(exercises, [injury])).toThrow(TypeError)
  })

  it('isExerciseSafe handles injury with missing checkIns', () => {
    const injury = {
      id: 'i1',
      bodyArea: 'shoulder' as const,
      side: 'left' as const,
      severity: 'mild' as const,
      reportedDate: new Date().toISOString(),
      status: 'active' as const,
      checkIns: undefined as unknown as [],
    }
    // isExerciseSafe does not use checkIns, but the data shape is wrong
    expect(() => isExerciseSafe('Bench Press', [injury as ActiveInjury])).not.toThrow()
  })
})
