import { describe, it, expect } from 'vitest'
import { generateBlockConfig, getTotalWeeks } from '../../components/BlockWizard'

describe('getTotalWeeks', () => {
  it('returns correct weeks for muscle goal', () => {
    const weeks = getTotalWeeks('muscle')
    // 4 + 4 + 4 + 1 = 13 weeks
    expect(weeks).toBe(13)
  })

  it('returns correct weeks for strength goal', () => {
    const weeks = getTotalWeeks('strength')
    // 4 + 4 + 4 + 3 + 1 = 16 weeks
    expect(weeks).toBe(16)
  })

  it('returns correct weeks for both goal', () => {
    const weeks = getTotalWeeks('both')
    // 4 + 4 + 3 + 1 = 12 weeks
    expect(weeks).toBe(12)
  })

  it('returns 0 for invalid goal', () => {
    const weeks = getTotalWeeks('invalid')
    expect(weeks).toBe(0)
  })
})

describe('generateBlockConfig', () => {
  it('generates correct phases for muscle goal', () => {
    const config = generateBlockConfig('muscle', '2025-01-01')
    
    expect(config).not.toBeNull()
    expect(config.goalId).toBe('muscle')
    expect(config.phases).toHaveLength(4)
    
    // Check phase types
    expect(config.phases[0].type).toBe('accumulation')
    expect(config.phases[1].type).toBe('accumulation')
    expect(config.phases[2].type).toBe('intensification')
    expect(config.phases[3].type).toBe('deload')
  })

  it('generates correct phases for strength goal', () => {
    const config = generateBlockConfig('strength', '2025-01-01')
    
    expect(config).not.toBeNull()
    expect(config.goalId).toBe('strength')
    expect(config.phases).toHaveLength(5)
    
    // Check phase sequence
    expect(config.phases[0].type).toBe('accumulation')
    expect(config.phases[1].type).toBe('intensification')
    expect(config.phases[2].type).toBe('intensification')
    expect(config.phases[3].type).toBe('strength')
    expect(config.phases[4].type).toBe('deload')
  })

  it('generates correct phases for both goal', () => {
    const config = generateBlockConfig('both', '2025-01-01')
    
    expect(config).not.toBeNull()
    expect(config.goalId).toBe('both')
    expect(config.phases).toHaveLength(4)
    
    // Check phase sequence
    expect(config.phases[0].type).toBe('accumulation')
    expect(config.phases[1].type).toBe('intensification')
    expect(config.phases[2].type).toBe('strength')
    expect(config.phases[3].type).toBe('deload')
  })

  it('calculates correct end date', () => {
    const config = generateBlockConfig('both', '2025-01-01')
    
    expect(config).not.toBeNull()
    const start = new Date(config.startDate)
    const end = new Date(config.endDate)
    
    // 12 weeks = 84 days
    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(84)
  })

  it('returns null for invalid goal', () => {
    const config = generateBlockConfig('invalid', '2025-01-01')
    expect(config).toBeNull()
  })

  it('includes phase labels and descriptions', () => {
    const config = generateBlockConfig('muscle', '2025-01-01')
    
    expect(config.phases[0].label).toBe('Opbouw')
    expect(config.phases[0].description).toContain('volume')
  })
})
