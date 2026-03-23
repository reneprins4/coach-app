import { describe, it, expect } from 'vitest'
import type { ExperienceLevel } from '../../types'
import { isBeginnerMode } from '../beginnerMode'
import { LEVEL_MULTIPLIERS } from '../localWorkoutGenerator'

describe('MF-001: Returning athlete experience level', () => {
  it('"returning" is a valid ExperienceLevel', () => {
    const level: ExperienceLevel = 'returning'
    expect(level).toBe('returning')
  })

  it('returning athlete gets weight estimates equal to beginner (technique memory compensates)', () => {
    expect(LEVEL_MULTIPLIERS.returning).toBeDefined()
    // Returning athletes have technique memory which compensates for lost strength.
    // They should start at the same level as beginners, not below them.
    expect(LEVEL_MULTIPLIERS.returning).toBeGreaterThan(LEVEL_MULTIPLIERS.complete_beginner)
    expect(LEVEL_MULTIPLIERS.returning).toBe(LEVEL_MULTIPLIERS.beginner)
  })

  it('isBeginnerMode returns true for returning (they need guidance)', () => {
    expect(isBeginnerMode('returning')).toBe(true)
  })
})
