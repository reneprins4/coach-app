import { describe, it, expect } from 'vitest'
import { getVisibleTabs, workoutsUntilAnalysis } from '../progressHelpers'

describe('Progress Page - Beginner Mode', () => {
  const BASE_TAB_IDS = ['exercise', 'volume', 'muscle', 'records', 'lichaam', 'analyse', 'balans']
  const ALL_TAB_IDS = [...BASE_TAB_IDS, 'optimal_hour']

  it('hides Analyse tab when fewer than 4 workouts', () => {
    const tabs = getVisibleTabs(3)
    expect(tabs.map(t => t.id)).not.toContain('analyse')
  })

  it('hides Balans tab when fewer than 4 workouts', () => {
    const tabs = getVisibleTabs(2)
    expect(tabs.map(t => t.id)).not.toContain('balans')
  })

  it('hides Optimal Hour tab when fewer than 20 workouts', () => {
    const tabs = getVisibleTabs(19)
    expect(tabs.map(t => t.id)).not.toContain('optimal_hour')
  })

  it('shows encouragement message when fewer than 4 workouts', () => {
    const remaining = workoutsUntilAnalysis(1)
    expect(remaining).toBe(3)
  })

  it('returns 0 workouts remaining when threshold met', () => {
    const remaining = workoutsUntilAnalysis(4)
    expect(remaining).toBe(0)
  })

  it('shows base tabs when 4+ workouts but fewer than 20', () => {
    const tabs = getVisibleTabs(4)
    expect(tabs.map(t => t.id)).toEqual(BASE_TAB_IDS)
  })

  it('shows all tabs including optimal_hour when 20+ workouts', () => {
    const tabs = getVisibleTabs(20)
    expect(tabs.map(t => t.id)).toEqual(ALL_TAB_IDS)
  })
})
