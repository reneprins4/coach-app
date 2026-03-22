/**
 * Tests for src/lib/exerciseAliases.ts
 * DATA-001: Exercise rename loses PR history
 *
 * Verifies that exercise name variants ("Bench", "Bench Press", "BB Bench Press")
 * all resolve to the same canonical name from the exercise library.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeExerciseName,
  areExercisesEquivalent,
  getExerciseAliases,
} from '../exerciseAliases'

describe('Exercise Name Normalization', () => {
  // ── Bench Press variants ──
  it('"Bench" normalizes to match "Flat Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Bench')).toBe('Flat Barbell Bench Press')
  })

  it('"Bench Press" normalizes to match "Flat Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Bench Press')).toBe('Flat Barbell Bench Press')
  })

  it('"BB Bench Press" normalizes to match "Flat Barbell Bench Press"', () => {
    expect(normalizeExerciseName('BB Bench Press')).toBe('Flat Barbell Bench Press')
  })

  it('"bench press" (lowercase) normalizes correctly', () => {
    expect(normalizeExerciseName('bench press')).toBe('Flat Barbell Bench Press')
  })

  it('"Flat Bench" normalizes to match "Flat Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Flat Bench')).toBe('Flat Barbell Bench Press')
  })

  it('"Flat Bench Press" normalizes to match "Flat Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Flat Bench Press')).toBe('Flat Barbell Bench Press')
  })

  it('"Barbell Bench Press" normalizes to match "Flat Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Barbell Bench Press')).toBe('Flat Barbell Bench Press')
  })

  // ── OHP variants ──
  it('"OHP" normalizes to match "Barbell Overhead Press"', () => {
    expect(normalizeExerciseName('OHP')).toBe('Barbell Overhead Press')
  })

  it('"Overhead Press" normalizes to match "Barbell Overhead Press"', () => {
    expect(normalizeExerciseName('Overhead Press')).toBe('Barbell Overhead Press')
  })

  // ── Squat variants ──
  it('"Squat" normalizes to match "Back Squat"', () => {
    expect(normalizeExerciseName('Squat')).toBe('Back Squat')
  })

  it('"Squats" normalizes to match "Back Squat"', () => {
    expect(normalizeExerciseName('Squats')).toBe('Back Squat')
  })

  it('"BB Squat" normalizes to match "Back Squat"', () => {
    expect(normalizeExerciseName('BB Squat')).toBe('Back Squat')
  })

  // ── Dumbbell Curl variants ──
  it('"DB Curl" normalizes to match "Dumbbell Curl"', () => {
    expect(normalizeExerciseName('DB Curl')).toBe('Dumbbell Curl')
  })

  it('"DB Curls" normalizes to match "Dumbbell Curl"', () => {
    expect(normalizeExerciseName('DB Curls')).toBe('Dumbbell Curl')
  })

  // ── Deadlift variants ──
  it('"Deadlift" normalizes to match "Conventional Deadlift"', () => {
    expect(normalizeExerciseName('Deadlift')).toBe('Conventional Deadlift')
  })

  it('"RDL" normalizes to match "Romanian Deadlift"', () => {
    expect(normalizeExerciseName('RDL')).toBe('Romanian Deadlift')
  })

  // ── Row variants ──
  it('"BB Row" normalizes to match "Barbell Row"', () => {
    expect(normalizeExerciseName('BB Row')).toBe('Barbell Row')
  })

  it('"DB Row" normalizes to match "Dumbbell Row"', () => {
    expect(normalizeExerciseName('DB Row')).toBe('Dumbbell Row')
  })

  // ── Incline variants ──
  it('"Incline Bench" normalizes to match "Incline Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Incline Bench')).toBe('Incline Barbell Bench Press')
  })

  it('"Incline Bench Press" normalizes to match "Incline Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Incline Bench Press')).toBe('Incline Barbell Bench Press')
  })

  it('"Incline DB Press" normalizes to match "Incline Dumbbell Press"', () => {
    expect(normalizeExerciseName('Incline DB Press')).toBe('Incline Dumbbell Press')
  })

  // ── Lat Pulldown variants ──
  it('"Lat Pulldown" normalizes to match "Lat Pulldown (Wide)"', () => {
    expect(normalizeExerciseName('Lat Pulldown')).toBe('Lat Pulldown (Wide)')
  })

  // ── Exact library name passthrough ──
  it('exact library name returns unchanged', () => {
    expect(normalizeExerciseName('Flat Barbell Bench Press')).toBe('Flat Barbell Bench Press')
    expect(normalizeExerciseName('Back Squat')).toBe('Back Squat')
    expect(normalizeExerciseName('Conventional Deadlift')).toBe('Conventional Deadlift')
    expect(normalizeExerciseName('Barbell Overhead Press')).toBe('Barbell Overhead Press')
    expect(normalizeExerciseName('Dumbbell Curl')).toBe('Dumbbell Curl')
  })

  // ── Unknown exercise passthrough ──
  it('unknown exercise returns itself (trimmed and title-cased)', () => {
    const result = normalizeExerciseName('  some weird exercise  ')
    expect(result).toBe('Some Weird Exercise')
  })

  // ── Edge cases ──
  it('empty string returns empty string', () => {
    expect(normalizeExerciseName('')).toBe('')
  })

  it('whitespace-only returns empty string', () => {
    expect(normalizeExerciseName('   ')).toBe('')
  })

  // ── Parenthetical suffix stripping ──
  it('"Bench Press (Barbell)" normalizes to "Flat Barbell Bench Press"', () => {
    expect(normalizeExerciseName('Bench Press (Barbell)')).toBe('Flat Barbell Bench Press')
  })

  // ── Plural stripping ──
  it('"Lateral Raises" normalizes to "Lateral Raise"', () => {
    expect(normalizeExerciseName('Lateral Raises')).toBe('Lateral Raise')
  })

  it('"Pull-ups" normalizes to "Pull-up"', () => {
    expect(normalizeExerciseName('Pull-ups')).toBe('Pull-up')
  })
})

describe('areExercisesEquivalent', () => {
  it('"Bench" and "Bench Press" are equivalent', () => {
    expect(areExercisesEquivalent('Bench', 'Bench Press')).toBe(true)
  })

  it('"Bench" and "Flat Barbell Bench Press" are equivalent', () => {
    expect(areExercisesEquivalent('Bench', 'Flat Barbell Bench Press')).toBe(true)
  })

  it('"BB Bench Press" and "bench press" are equivalent', () => {
    expect(areExercisesEquivalent('BB Bench Press', 'bench press')).toBe(true)
  })

  it('"Squat" and "Back Squat" are equivalent', () => {
    expect(areExercisesEquivalent('Squat', 'Back Squat')).toBe(true)
  })

  it('"Squat" and "Leg Press" are NOT equivalent', () => {
    expect(areExercisesEquivalent('Squat', 'Leg Press')).toBe(false)
  })

  it('"OHP" and "Barbell Overhead Press" are equivalent', () => {
    expect(areExercisesEquivalent('OHP', 'Barbell Overhead Press')).toBe(true)
  })

  it('"Bench" and "Incline Bench Press" are NOT equivalent', () => {
    expect(areExercisesEquivalent('Bench', 'Incline Bench Press')).toBe(false)
  })

  it('same exact name is equivalent', () => {
    expect(areExercisesEquivalent('Back Squat', 'Back Squat')).toBe(true)
  })

  it('case-insensitive exact match is equivalent', () => {
    expect(areExercisesEquivalent('back squat', 'BACK SQUAT')).toBe(true)
  })
})

describe('getExerciseAliases', () => {
  it('returns aliases for "Flat Barbell Bench Press"', () => {
    const aliases = getExerciseAliases('Flat Barbell Bench Press')
    expect(aliases).toContain('bench')
    expect(aliases).toContain('bench press')
    expect(aliases).toContain('bb bench press')
    expect(aliases).toContain('barbell bench press')
    expect(aliases).toContain('flat bench press')
  })

  it('returns aliases for "Back Squat"', () => {
    const aliases = getExerciseAliases('Back Squat')
    expect(aliases).toContain('squat')
    expect(aliases).toContain('bb squat')
  })

  it('returns empty array for unknown exercise', () => {
    expect(getExerciseAliases('Unknown Exercise')).toEqual([])
  })
})
