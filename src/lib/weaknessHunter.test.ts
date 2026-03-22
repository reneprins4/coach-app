import { describe, it, expect } from 'vitest'
import { getDetailedMuscleGroup } from './weaknessHunter'

describe('getDetailedMuscleGroup', () => {
  // --- ALGO-004: Tricep dip classified incorrectly ---

  it('"Tricep Dip" is classified as triceps, not chest', () => {
    expect(getDetailedMuscleGroup('Tricep Dip')).toBe('triceps')
  })

  it('"Assisted Dip" is classified as triceps', () => {
    expect(getDetailedMuscleGroup('Assisted Dip')).toBe('triceps')
  })

  it('"Chest Dip" is classified as chest', () => {
    expect(getDetailedMuscleGroup('Chest Dip')).toBe('chest')
  })

  it('"Arnold Press" is classified as shoulders, not chest', () => {
    const result = getDetailedMuscleGroup('Arnold Press')
    expect(result).toMatch(/^shoulders/)
  })

  it('unknown exercise returns null, not chest', () => {
    expect(getDetailedMuscleGroup('Underwater Basket Weaving')).toBeNull()
  })

  // --- Regression: existing classifications still work ---

  it('"Bench Press" is still chest', () => {
    expect(getDetailedMuscleGroup('Bench Press')).toBe('chest')
  })

  it('"Push Up" is still chest', () => {
    expect(getDetailedMuscleGroup('Push Up')).toBe('chest')
  })

  it('"Tricep Pushdown" is still triceps', () => {
    expect(getDetailedMuscleGroup('Tricep Pushdown')).toBe('triceps')
  })

  it('"Dip" (bare word) is classified as triceps', () => {
    expect(getDetailedMuscleGroup('Dip')).toBe('triceps')
  })
})
