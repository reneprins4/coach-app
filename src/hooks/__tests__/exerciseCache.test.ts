import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  cacheExercises,
  getCachedExercises,
  isCacheStale,
  CACHE_KEY,
  CACHE_TIMESTAMP_KEY,
  CACHE_TTL_MS,
} from '../../lib/exerciseCache'
import type { ExerciseLibraryEntry } from '../useExercises'

const SAMPLE_EXERCISES: ExerciseLibraryEntry[] = [
  {
    id: 'c1',
    name: 'Flat Barbell Bench Press',
    muscle_group: 'chest',
    category: 'compound',
    equipment: 'barbell',
    primary_muscles: ['chest'],
    secondary_muscles: ['triceps', 'front_delts'],
    difficulty: 'intermediate',
    subfocus: 'mid chest',
  },
  {
    id: 'b1',
    name: 'Conventional Deadlift',
    muscle_group: 'back',
    category: 'compound',
    equipment: 'barbell',
    primary_muscles: ['back', 'hamstrings', 'glutes'],
    secondary_muscles: ['core', 'forearms'],
    difficulty: 'advanced',
    subfocus: 'posterior chain',
  },
]

describe('Exercise Cache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('CACHE_TTL_MS equals 7 days in milliseconds', () => {
    expect(CACHE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('cacheExercises stores exercises in localStorage', () => {
    cacheExercises(SAMPLE_EXERCISES)

    const stored = localStorage.getItem(CACHE_KEY)
    expect(stored).not.toBeNull()
    expect(JSON.parse(stored!)).toEqual(SAMPLE_EXERCISES)

    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    expect(timestamp).not.toBeNull()
    expect(Number(timestamp)).toBeGreaterThan(0)
  })

  it('getCachedExercises returns null when no cache exists', () => {
    expect(getCachedExercises()).toBeNull()
  })

  it('getCachedExercises returns exercises from cache', () => {
    cacheExercises(SAMPLE_EXERCISES)
    const result = getCachedExercises()
    expect(result).toEqual(SAMPLE_EXERCISES)
  })

  it('isCacheStale returns true when no cache exists', () => {
    expect(isCacheStale()).toBe(true)
  })

  it('isCacheStale returns false for fresh cache (<7 days)', () => {
    cacheExercises(SAMPLE_EXERCISES)
    expect(isCacheStale()).toBe(false)
  })

  it('isCacheStale returns true for stale cache (>7 days)', () => {
    cacheExercises(SAMPLE_EXERCISES)
    // Overwrite timestamp to 8 days ago
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000
    localStorage.setItem(CACHE_TIMESTAMP_KEY, eightDaysAgo.toString())
    expect(isCacheStale()).toBe(true)
  })

  it('cache survives JSON serialization roundtrip', () => {
    cacheExercises(SAMPLE_EXERCISES)
    const retrieved = getCachedExercises()
    expect(retrieved).toEqual(SAMPLE_EXERCISES)
    // Verify array structure is preserved
    expect(Array.isArray(retrieved)).toBe(true)
    expect(retrieved).toHaveLength(2)
    expect(retrieved![0]!.primary_muscles).toEqual(['chest'])
    expect(retrieved![1]!.secondary_muscles).toEqual(['core', 'forearms'])
  })

  it('cacheExercises overwrites existing cache', () => {
    cacheExercises(SAMPLE_EXERCISES)
    const newExercises = [SAMPLE_EXERCISES[0]!]
    cacheExercises(newExercises)

    const result = getCachedExercises()
    expect(result).toEqual(newExercises)
    expect(result).toHaveLength(1)
  })

  it('getCachedExercises returns null for corrupted JSON', () => {
    localStorage.setItem(CACHE_KEY, '{invalid json')
    expect(getCachedExercises()).toBeNull()
  })
})
