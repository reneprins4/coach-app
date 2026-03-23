import { describe, it, expect } from 'vitest'
import type { ExperienceLevel } from '../../types'
import { isBeginnerMode } from '../beginnerMode'
import { LEVEL_MULTIPLIERS } from '../localWorkoutGenerator'

describe('MF-001: Returning athlete experience level', () => {
  it('"returning" is a valid ExperienceLevel', () => {
    const level: ExperienceLevel = 'returning'
    expect(level).toBe('returning')
  })

  it('returning athlete gets conservative weight estimates (between complete_beginner and beginner)', () => {
    expect(LEVEL_MULTIPLIERS.returning).toBeDefined()
    // Returning athletes have technique memory but lost strength.
    // Multiplier sits between complete_beginner (0.45) and beginner (0.6).
    expect(LEVEL_MULTIPLIERS.returning).toBeGreaterThan(LEVEL_MULTIPLIERS.complete_beginner)
    expect(LEVEL_MULTIPLIERS.returning).toBeLessThan(LEVEL_MULTIPLIERS.beginner)
  })

  it('isBeginnerMode returns true for returning (they need guidance)', () => {
    expect(isBeginnerMode('returning')).toBe(true)
  })
})
