import { describe, it, expect } from 'vitest'
import type { ExperienceLevel } from '../../types'
import { isBeginnerMode } from '../beginnerMode'
import { LEVEL_MULTIPLIERS } from '../localWorkoutGenerator'

describe('MF-001: Returning athlete experience level', () => {
  it('"returning" is a valid ExperienceLevel', () => {
    const level: ExperienceLevel = 'returning'
    expect(level).toBe('returning')
  })

  it('returning athlete gets conservative weight estimates (between beginner and intermediate)', () => {
    expect(LEVEL_MULTIPLIERS.returning).toBeDefined()
    expect(LEVEL_MULTIPLIERS.returning).toBeGreaterThan(LEVEL_MULTIPLIERS.beginner)
    expect(LEVEL_MULTIPLIERS.returning).toBeLessThan(LEVEL_MULTIPLIERS.intermediate)
  })

  it('isBeginnerMode returns true for returning (they need guidance)', () => {
    expect(isBeginnerMode('returning')).toBe(true)
  })
})
