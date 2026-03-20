import { describe, it, expect } from 'vitest'
import { getVisibleTabs, workoutsUntilAnalysis } from '../progressHelpers'

describe('Progress Page - Beginner Mode', () => {
  const ALL_TAB_IDS = ['exercise', 'volume', 'muscle', 'records', 'lichaam', 'analyse', 'balans']

  it('hides Analyse tab when fewer than 4 workouts', () => {
    const tabs = getVisibleTabs(3)
    expect(tabs.map(t => t.id)).not.toContain('analyse')
  })

  it('hides Balans tab when fewer than 4 workouts', () => {
    const tabs = getVisibleTabs(2)
    expect(tabs.map(t => t.id)).not.toContain('balans')
  })

  it('shows encouragement message when fewer than 4 workouts', () => {
    const remaining = workoutsUntilAnalysis(1)
    expect(remaining).toBe(3)
  })

  it('returns 0 workouts remaining when threshold met', () => {
    const remaining = workoutsUntilAnalysis(4)
    expect(remaining).toBe(0)
  })

  it('shows all tabs when 4+ workouts', () => {
    const tabs = getVisibleTabs(4)
    expect(tabs.map(t => t.id)).toEqual(ALL_TAB_IDS)
  })

  it('shows all tabs when many workouts', () => {
    const tabs = getVisibleTabs(20)
    expect(tabs.map(t => t.id)).toEqual(ALL_TAB_IDS)
  })
})
