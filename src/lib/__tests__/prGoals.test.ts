/**
 * Tests for src/lib/prGoals.ts
 * MF-009: Custom PR goals for any exercise
 *
 * Users can track up to 5 PR goals for any exercise (not just the 4 main lifts).
 * Goals are stored in localStorage independently from UserSettings.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getPrGoals,
  addPrGoal,
  removePrGoal,
  updatePrGoal,
  savePrGoals,
  type PrGoal,
} from '../prGoals'

// Mock localStorage
const store: Record<string, string> = {}
beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key]
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { for (const k of Object.keys(store)) delete store[k] },
    },
    writable: true,
    configurable: true,
  })
})

describe('PR Goals', () => {
  it('getPrGoals returns empty array when no goals exist', () => {
    expect(getPrGoals()).toEqual([])
  })

  it('addPrGoal adds a new goal', () => {
    const goal = addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    expect(goal).not.toBeNull()
    expect(goal!.exercise).toBe('Pull-up')
    expect(goal!.targetKg).toBe(20)
    expect(goal!.createdAt).toBeTruthy()

    const goals = getPrGoals()
    expect(goals).toHaveLength(1)
    expect(goals[0]!.exercise).toBe('Pull-up')
  })

  it('removePrGoal removes a goal by exercise name', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    addPrGoal({ exercise: 'Leg Press', targetKg: 200, targetDate: null })
    expect(getPrGoals()).toHaveLength(2)

    removePrGoal('Pull-up')
    const goals = getPrGoals()
    expect(goals).toHaveLength(1)
    expect(goals[0]!.exercise).toBe('Leg Press')
  })

  it('updatePrGoal updates target weight', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    updatePrGoal('Pull-up', { targetKg: 30 })

    const goals = getPrGoals()
    expect(goals[0]!.targetKg).toBe(30)
  })

  it('updatePrGoal updates target date', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    updatePrGoal('Pull-up', { targetDate: '2026-06-01' })

    const goals = getPrGoals()
    expect(goals[0]!.targetDate).toBe('2026-06-01')
  })

  it('getPrGoals returns all goals', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    addPrGoal({ exercise: 'Leg Press', targetKg: 200, targetDate: null })
    addPrGoal({ exercise: 'Barbell Curl', targetKg: 50, targetDate: '2026-12-01' })

    const goals = getPrGoals()
    expect(goals).toHaveLength(3)
    expect(goals.map(g => g.exercise)).toEqual(['Pull-up', 'Leg Press', 'Barbell Curl'])
  })

  it('max 5 PR goals allowed', () => {
    addPrGoal({ exercise: 'Exercise 1', targetKg: 10, targetDate: null })
    addPrGoal({ exercise: 'Exercise 2', targetKg: 20, targetDate: null })
    addPrGoal({ exercise: 'Exercise 3', targetKg: 30, targetDate: null })
    addPrGoal({ exercise: 'Exercise 4', targetKg: 40, targetDate: null })
    addPrGoal({ exercise: 'Exercise 5', targetKg: 50, targetDate: null })

    const sixth = addPrGoal({ exercise: 'Exercise 6', targetKg: 60, targetDate: null })
    expect(sixth).toBeNull()
    expect(getPrGoals()).toHaveLength(5)
  })

  it('duplicate exercise name rejected', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    const duplicate = addPrGoal({ exercise: 'Pull-up', targetKg: 30, targetDate: null })
    expect(duplicate).toBeNull()
    expect(getPrGoals()).toHaveLength(1)
  })

  it('goal has exercise, targetKg, targetDate (optional), and createdAt', () => {
    const goal = addPrGoal({ exercise: 'Hip Thrust', targetKg: 120, targetDate: '2026-09-15' })
    expect(goal).toMatchObject({
      exercise: 'Hip Thrust',
      targetKg: 120,
      targetDate: '2026-09-15',
    })
    expect(typeof goal!.createdAt).toBe('string')
    expect(new Date(goal!.createdAt).getTime()).not.toBeNaN()
  })

  it('savePrGoals overwrites all goals', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    addPrGoal({ exercise: 'Leg Press', targetKg: 200, targetDate: null })

    const newGoals: PrGoal[] = [
      { exercise: 'Dip', targetKg: 60, targetDate: null, createdAt: new Date().toISOString() },
    ]
    savePrGoals(newGoals)

    const goals = getPrGoals()
    expect(goals).toHaveLength(1)
    expect(goals[0]!.exercise).toBe('Dip')
  })

  it('removePrGoal is a no-op for non-existent exercise', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    removePrGoal('Does Not Exist')
    expect(getPrGoals()).toHaveLength(1)
  })

  it('updatePrGoal is a no-op for non-existent exercise', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    updatePrGoal('Does Not Exist', { targetKg: 999 })
    expect(getPrGoals()[0]!.targetKg).toBe(20)
  })

  it('duplicate check is case-sensitive', () => {
    addPrGoal({ exercise: 'Pull-up', targetKg: 20, targetDate: null })
    // Exact duplicate is rejected
    expect(addPrGoal({ exercise: 'Pull-up', targetKg: 30, targetDate: null })).toBeNull()
    // Different casing is allowed (exercise names are specific)
    expect(addPrGoal({ exercise: 'pull-up', targetKg: 30, targetDate: null })).not.toBeNull()
  })
})
