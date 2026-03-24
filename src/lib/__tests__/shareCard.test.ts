import { describe, it, expect } from 'vitest'
import { generateShareCardData } from '../shareCard'
import type { FinishModalResult } from '../../types'

// ---- Helper: build a minimal FinishModalResult ----
function makeResult(overrides: Partial<FinishModalResult> = {}): FinishModalResult {
  return {
    id: 'workout-1',
    duration: 2700, // 45 minutes in seconds
    workout_sets: [
      { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 7 },
      { exercise: 'Bench Press', weight_kg: 80, reps: 8, rpe: 7.5 },
      { exercise: 'Bench Press', weight_kg: 80, reps: 7, rpe: 8 },
      { exercise: 'Bench Press', weight_kg: 80, reps: 7, rpe: 8.5 },
      { exercise: 'Incline DB Press', weight_kg: 30, reps: 10, rpe: 7 },
      { exercise: 'Incline DB Press', weight_kg: 30, reps: 10, rpe: 7 },
      { exercise: 'Incline DB Press', weight_kg: 30, reps: 9, rpe: 7.5 },
      { exercise: 'Cable Fly', weight_kg: 15, reps: 12, rpe: 7 },
      { exercise: 'Cable Fly', weight_kg: 15, reps: 12, rpe: 7 },
      { exercise: 'Cable Fly', weight_kg: 15, reps: 12, rpe: 7 },
      { exercise: 'Tricep Pushdown', weight_kg: 25, reps: 12, rpe: 7 },
      { exercise: 'Tricep Pushdown', weight_kg: 25, reps: 12, rpe: 7 },
      { exercise: 'Tricep Pushdown', weight_kg: 25, reps: 12, rpe: 7.5 },
    ],
    totalVolume: 4610,
    exerciseNames: ['Bench Press', 'Incline DB Press', 'Cable Fly', 'Tricep Pushdown'],
    ...overrides,
  }
}

describe('Share Card Generator', () => {
  it('generateShareCardData returns correct structure', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 3 })
    expect(data).toHaveProperty('date')
    expect(data).toHaveProperty('split')
    expect(data).toHaveProperty('duration')
    expect(data).toHaveProperty('volume')
    expect(data).toHaveProperty('sets')
    expect(data).toHaveProperty('exercises')
    expect(data).toHaveProperty('extraExercises')
    expect(data).toHaveProperty('prs')
    expect(data).toHaveProperty('streak')
  })

  it('includes workout date formatted nicely', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 0 })
    // Should be a non-empty string with a day name
    expect(data.date.length).toBeGreaterThan(5)
    // Should contain some recognizable date fragment (month name, day number)
    expect(data.date).toMatch(/\d/)
  })

  it('includes duration in minutes', () => {
    const data = generateShareCardData(makeResult({ duration: 2700 }), { locale: 'nl', prs: [], streak: 0 })
    expect(data.duration).toBe(45)
  })

  it('includes total volume formatted (kg or tons)', () => {
    // Under 1000 kg — includes unit suffix
    const small = generateShareCardData(makeResult({ totalVolume: 850 }), { locale: 'nl', prs: [], streak: 0 })
    expect(small.volume).toMatch(/850/)

    // Over 1000 kg should show tons
    const big = generateShareCardData(makeResult({ totalVolume: 12500 }), { locale: 'nl', prs: [], streak: 0 })
    expect(big.volume).toMatch(/12\.5/)
  })

  it('includes total sets count', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 0 })
    expect(data.sets).toBe(13) // 4 + 3 + 3 + 3
  })

  it('includes exercise names (max 6, then "+X more")', () => {
    const manyExercises = makeResult({
      exerciseNames: ['Ex1', 'Ex2', 'Ex3', 'Ex4', 'Ex5', 'Ex6', 'Ex7', 'Ex8'],
    })
    const data = generateShareCardData(manyExercises, { locale: 'nl', prs: [], streak: 0 })
    expect(data.exercises).toHaveLength(6)
    expect(data.extraExercises).toBe(2)
  })

  it('includes PRs if any', () => {
    const prs = [{ exercise: 'Bench Press', weight: 85 }]
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs, streak: 0 })
    expect(data.prs).toHaveLength(1)
    expect(data.prs[0]!.exercise).toBe('Bench Press')
    expect(data.prs[0]!.weight).toBe(85)
  })

  it('includes split name if detected', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 0, split: 'Push' })
    expect(data.split).toBe('Push')
  })

  it('includes Kravex branding', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 0 })
    expect(data.branding).toBe('kravex.app')
  })

  it('handles zero PRs gracefully', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 0 })
    expect(data.prs).toHaveLength(0)
  })

  it('handles empty exercise list', () => {
    const empty = makeResult({
      workout_sets: [],
      exerciseNames: [],
      totalVolume: 0,
    })
    const data = generateShareCardData(empty, { locale: 'nl', prs: [], streak: 0 })
    expect(data.exercises).toHaveLength(0)
    expect(data.extraExercises).toBe(0)
    expect(data.sets).toBe(0)
  })

  it('includes streak count', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 7 })
    expect(data.streak).toBe(7)
  })

  it('returns null split when not provided', () => {
    const data = generateShareCardData(makeResult(), { locale: 'nl', prs: [], streak: 0 })
    expect(data.split).toBeNull()
  })
})
