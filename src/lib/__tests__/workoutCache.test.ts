import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock generateScientificWorkout before importing the module under test
vi.mock('../ai', () => ({
  generateScientificWorkout: vi.fn(),
}))

// Mock training-analysis
vi.mock('../training-analysis', () => ({
  analyzeTraining: vi.fn(() => ({
    chest: { setsThisWeek: 6, daysSinceLastTrained: 2, hoursSinceLastTrained: 48, avgRpeLastSession: 7.5, setsLastSession: 4, recoveryPct: 85, recentExercises: ['Bench Press'], lastSessionSets: [], target: { min: 10, max: 20, mev: 8 }, status: 'ready' },
    back: { setsThisWeek: 8, daysSinceLastTrained: 1, hoursSinceLastTrained: 24, avgRpeLastSession: 8, setsLastSession: 5, recoveryPct: 60, recentExercises: ['Barbell Row'], lastSessionSets: [], target: { min: 14, max: 22, mev: 10 }, status: 'recovering' },
    shoulders: { setsThisWeek: 4, daysSinceLastTrained: 3, hoursSinceLastTrained: 72, avgRpeLastSession: 7, setsLastSession: 3, recoveryPct: 95, recentExercises: [], lastSessionSets: [], target: { min: 8, max: 20, mev: 6 }, status: 'ready' },
    quads: { setsThisWeek: 0, daysSinceLastTrained: null, hoursSinceLastTrained: null, avgRpeLastSession: null, setsLastSession: 0, recoveryPct: 100, recentExercises: [], lastSessionSets: [], target: { min: 12, max: 20, mev: 8 }, status: 'needs_work' },
    hamstrings: { setsThisWeek: 0, daysSinceLastTrained: null, hoursSinceLastTrained: null, avgRpeLastSession: null, setsLastSession: 0, recoveryPct: 100, recentExercises: [], lastSessionSets: [], target: { min: 10, max: 16, mev: 6 }, status: 'needs_work' },
    glutes: { setsThisWeek: 0, daysSinceLastTrained: null, hoursSinceLastTrained: null, avgRpeLastSession: null, setsLastSession: 0, recoveryPct: 100, recentExercises: [], lastSessionSets: [], target: { min: 6, max: 16, mev: 4 }, status: 'needs_work' },
    biceps: { setsThisWeek: 4, daysSinceLastTrained: 1, hoursSinceLastTrained: 24, avgRpeLastSession: 7, setsLastSession: 3, recoveryPct: 70, recentExercises: [], lastSessionSets: [], target: { min: 8, max: 14, mev: 6 }, status: 'recovering' },
    triceps: { setsThisWeek: 4, daysSinceLastTrained: 2, hoursSinceLastTrained: 48, avgRpeLastSession: 7, setsLastSession: 3, recoveryPct: 90, recentExercises: [], lastSessionSets: [], target: { min: 8, max: 14, mev: 6 }, status: 'ready' },
    core: { setsThisWeek: 2, daysSinceLastTrained: 3, hoursSinceLastTrained: 72, avgRpeLastSession: 6, setsLastSession: 2, recoveryPct: 100, recentExercises: [], lastSessionSets: [], target: { min: 4, max: 12, mev: 2 }, status: 'ready' },
  })),
  scoreSplits: vi.fn(() => [
    { name: 'Push', score: 85, reasoning: 'Test reasoning' },
    { name: 'Pull', score: 70, reasoning: 'Test reasoning 2' },
  ]),
  getRecentSplits: vi.fn(() => []),
}))

// Mock settings
vi.mock('../settings', () => ({
  getSettings: vi.fn(() => ({
    name: 'Test',
    gender: 'male',
    goal: 'hypertrophy',
    trainingGoal: 'hypertrophy',
    frequency: '4x',
    time: 60,
    bodyweight: '80',
    experienceLevel: 'intermediate',
    equipment: 'full_gym',
    benchMax: '',
    squatMax: '',
    deadliftMax: '',
    priorityMuscles: [],
  })),
}))

// Mock periodization
vi.mock('../periodization', () => ({
  getCurrentBlock: vi.fn(() => null),
}))

// Mock workoutPreferences
vi.mock('../workoutPreferences', () => ({
  buildWorkoutPreferences: vi.fn((_s, _b, overrides) => ({
    trainingGoal: 'hypertrophy',
    experienceLevel: 'intermediate',
    equipment: 'full_gym',
    bodyweight: '80',
    time: overrides?.time ?? 60,
    energy: 'medium',
    isDeload: false,
    targetRPE: null,
    targetRepRange: null,
    focusedMuscles: [],
  })),
}))

// Mock injuryRecovery
vi.mock('../injuryRecovery', () => ({
  loadInjuries: vi.fn(() => []),
}))

import {
  buildContextHash,
  cacheWorkout,
  getCachedWorkout,
  invalidateWorkoutCache,
  generateWorkoutPreview,
  generateFullWorkout,
  CACHE_KEY,
  CACHE_TTL_MS,
} from '../workoutCache'
import { generateScientificWorkout } from '../ai'
import type { AIWorkoutResponse, Workout } from '../../types'

const mockAIResponse: AIWorkoutResponse = {
  split: 'Push',
  reasoning: 'Push day based on recovery',
  exercises: [
    {
      name: 'Bench Press',
      muscle_group: 'chest',
      sets: 4,
      reps_min: 8,
      reps_max: 12,
      weight_kg: 80,
      rpe_target: 8,
      rest_seconds: 120,
      notes: 'Focus on chest squeeze',
      vs_last_session: 'up',
    },
    {
      name: 'Overhead Press',
      muscle_group: 'shoulders',
      sets: 3,
      reps_min: 8,
      reps_max: 10,
      weight_kg: 50,
      rpe_target: 8,
      rest_seconds: 90,
      notes: 'Brace core',
      vs_last_session: 'same',
    },
  ],
  estimated_duration_min: 55,
  volume_notes: 'Good volume',
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    user_id: 'u1',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: null,
    split: 'Push',
    workout_sets: [
      { id: 's1', workout_id: 'w1', exercise: 'Bench Press', weight_kg: 80, reps: 10, rpe: 8, created_at: '' },
      { id: 's2', workout_id: 'w1', exercise: 'Overhead Press', weight_kg: 50, reps: 8, rpe: 7.5, created_at: '' },
    ],
    ...overrides,
  } as Workout
}

describe('Workout Cache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  // ---- Cache Key Tests ----

  describe('buildContextHash', () => {
    const baseParams = {
      split: 'Push',
      date: '2026-03-23',
      workoutCount: 10,
      injuryCount: 0,
      equipment: 'full_gym',
      trainingGoal: 'hypertrophy',
      experienceLevel: 'intermediate',
      time: 60,
    }

    it('generates different cache keys for different splits', () => {
      const keyPush = buildContextHash({ ...baseParams, split: 'Push' })
      const keyPull = buildContextHash({ ...baseParams, split: 'Pull' })
      expect(keyPush).not.toBe(keyPull)
    })

    it('generates different cache keys for different dates', () => {
      const key1 = buildContextHash({ ...baseParams, date: '2026-03-23' })
      const key2 = buildContextHash({ ...baseParams, date: '2026-03-24' })
      expect(key1).not.toBe(key2)
    })

    it('generates different cache keys when workout count changes', () => {
      const key1 = buildContextHash({ ...baseParams, workoutCount: 10 })
      const key2 = buildContextHash({ ...baseParams, workoutCount: 11 })
      expect(key1).not.toBe(key2)
    })

    it('generates different cache keys when injuries change', () => {
      const key1 = buildContextHash({ ...baseParams, injuryCount: 0 })
      const key2 = buildContextHash({ ...baseParams, injuryCount: 1 })
      expect(key1).not.toBe(key2)
    })

    it('generates same cache key for same context', () => {
      const key1 = buildContextHash(baseParams)
      const key2 = buildContextHash(baseParams)
      expect(key1).toBe(key2)
    })

    it('generates different cache keys for different equipment', () => {
      const key1 = buildContextHash({ ...baseParams, equipment: 'full_gym' })
      const key2 = buildContextHash({ ...baseParams, equipment: 'dumbbells_only' })
      expect(key1).not.toBe(key2)
    })

    it('generates different cache keys for different time', () => {
      const key1 = buildContextHash({ ...baseParams, time: 60 })
      const key2 = buildContextHash({ ...baseParams, time: 45 })
      expect(key1).not.toBe(key2)
    })
  })

  // ---- Cache Storage Tests ----

  describe('cacheWorkout / getCachedWorkout', () => {
    it('cacheWorkout stores in localStorage with TTL', () => {
      cacheWorkout('test-hash', mockAIResponse)

      const raw = localStorage.getItem(CACHE_KEY)
      expect(raw).not.toBeNull()

      const parsed = JSON.parse(raw!)
      expect(parsed.contextHash).toBe('test-hash')
      expect(parsed.workout).toEqual(mockAIResponse)
      expect(parsed.cachedAt).toBeTypeOf('number')
    })

    it('getCachedWorkout returns cached workout within TTL', () => {
      cacheWorkout('test-hash', mockAIResponse)

      const result = getCachedWorkout('test-hash')
      expect(result).toEqual(mockAIResponse)
    })

    it('getCachedWorkout returns null after TTL expires', () => {
      // Manually write an expired cache entry
      const expired = {
        contextHash: 'test-hash',
        workout: mockAIResponse,
        cachedAt: Date.now() - CACHE_TTL_MS - 1000,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(expired))

      const result = getCachedWorkout('test-hash')
      expect(result).toBeNull()
    })

    it('getCachedWorkout returns null when context changes', () => {
      cacheWorkout('hash-a', mockAIResponse)

      const result = getCachedWorkout('hash-b')
      expect(result).toBeNull()
    })

    it('handles corrupt cache gracefully', () => {
      localStorage.setItem(CACHE_KEY, 'not valid json{{{')

      const result = getCachedWorkout('test-hash')
      expect(result).toBeNull()
    })

    it('returns null when localStorage is empty', () => {
      const result = getCachedWorkout('test-hash')
      expect(result).toBeNull()
    })
  })

  // ---- Invalidation Tests ----

  describe('invalidateWorkoutCache', () => {
    it('removes cached workout from localStorage', () => {
      cacheWorkout('test-hash', mockAIResponse)
      expect(localStorage.getItem(CACHE_KEY)).not.toBeNull()

      invalidateWorkoutCache()
      expect(localStorage.getItem(CACHE_KEY)).toBeNull()
    })

    it('does not throw when cache is already empty', () => {
      expect(() => invalidateWorkoutCache()).not.toThrow()
    })
  })

  // ---- Preview Tests ----

  describe('generateWorkoutPreview', () => {
    it('returns split, duration, and muscle context for sufficient data', () => {
      const workouts = [
        makeWorkout({ created_at: new Date(Date.now() - 2 * 86400000).toISOString() }),
        makeWorkout({ id: 'w2', created_at: new Date(Date.now() - 4 * 86400000).toISOString() }),
        makeWorkout({ id: 'w3', created_at: new Date(Date.now() - 6 * 86400000).toISOString() }),
      ]

      const preview = generateWorkoutPreview(workouts)
      expect(preview).not.toBeNull()
      expect(preview!.split).toBe('Push')
      expect(preview!.estimatedDuration).toBeTypeOf('number')
      expect(preview!.reasoning).toBeTypeOf('string')
      expect(preview!.muscleContext).toBeInstanceOf(Array)
      expect(preview!.muscleContext.length).toBeGreaterThan(0)
      expect(preview!.muscleContext[0]).toHaveProperty('muscle')
      expect(preview!.muscleContext[0]).toHaveProperty('recoveryPct')
      expect(preview!.muscleContext[0]).toHaveProperty('status')
    })

    it('returns null for fewer than 3 workouts', () => {
      const workouts = [makeWorkout(), makeWorkout({ id: 'w2' })]
      const preview = generateWorkoutPreview(workouts)
      expect(preview).toBeNull()
    })

    it('includes isDeload and trainingPhase', () => {
      const workouts = [
        makeWorkout(),
        makeWorkout({ id: 'w2' }),
        makeWorkout({ id: 'w3' }),
      ]
      const preview = generateWorkoutPreview(workouts)
      expect(preview).toHaveProperty('isDeload')
      expect(preview).toHaveProperty('trainingPhase')
    })
  })

  // ---- Full Generation Tests ----

  describe('generateFullWorkout', () => {
    const workouts = [
      makeWorkout(),
      makeWorkout({ id: 'w2', created_at: new Date(Date.now() - 4 * 86400000).toISOString() }),
      makeWorkout({ id: 'w3', created_at: new Date(Date.now() - 6 * 86400000).toISOString() }),
    ]

    it('calls generateScientificWorkout when cache is empty', async () => {
      vi.mocked(generateScientificWorkout).mockResolvedValue(mockAIResponse)

      const result = await generateFullWorkout(workouts, 'user-1')

      expect(generateScientificWorkout).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockAIResponse)
    })

    it('caches the result after generation', async () => {
      vi.mocked(generateScientificWorkout).mockResolvedValue(mockAIResponse)

      await generateFullWorkout(workouts, 'user-1')

      const raw = localStorage.getItem(CACHE_KEY)
      expect(raw).not.toBeNull()
      const parsed = JSON.parse(raw!)
      expect(parsed.workout).toEqual(mockAIResponse)
    })

    it('returns cached result on second call without calling API', async () => {
      vi.mocked(generateScientificWorkout).mockResolvedValue(mockAIResponse)

      // First call: generates and caches
      const result1 = await generateFullWorkout(workouts, 'user-1')
      expect(generateScientificWorkout).toHaveBeenCalledTimes(1)

      // Second call: should use cache
      const result2 = await generateFullWorkout(workouts, 'user-1')
      expect(generateScientificWorkout).toHaveBeenCalledTimes(1) // Still only 1 call
      expect(result2).toEqual(result1)
    })

    it('regenerates when overrides change the context', async () => {
      vi.mocked(generateScientificWorkout).mockResolvedValue(mockAIResponse)

      await generateFullWorkout(workouts, 'user-1', { time: 60 })
      expect(generateScientificWorkout).toHaveBeenCalledTimes(1)

      // Different time = different context hash = cache miss
      await generateFullWorkout(workouts, 'user-1', { time: 45 })
      expect(generateScientificWorkout).toHaveBeenCalledTimes(2)
    })

    it('regenerates when split override changes', async () => {
      vi.mocked(generateScientificWorkout).mockResolvedValue(mockAIResponse)

      await generateFullWorkout(workouts, 'user-1', { split: 'Push' })
      expect(generateScientificWorkout).toHaveBeenCalledTimes(1)

      await generateFullWorkout(workouts, 'user-1', { split: 'Pull' })
      expect(generateScientificWorkout).toHaveBeenCalledTimes(2)
    })

    it('returns result even for null userId', async () => {
      vi.mocked(generateScientificWorkout).mockResolvedValue(mockAIResponse)

      const result = await generateFullWorkout(workouts, null)
      expect(result).toEqual(mockAIResponse)
    })
  })
})
