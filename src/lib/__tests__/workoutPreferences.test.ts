/**
 * Tests for src/lib/workoutPreferences.ts
 */
import { describe, it, expect, vi } from 'vitest'

// Mock supabase (required by periodization import chain)
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}))

import { buildWorkoutPreferences } from '../workoutPreferences'
import { createSettings, createTrainingBlock } from '../../__tests__/helpers'

describe('workoutPreferences', () => {
  describe('buildWorkoutPreferences', () => {
    it('builds preferences from settings with no block', () => {
      const settings = createSettings({ name: 'Test', bodyweight: '80' })
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.name).toBe('Test')
      expect(prefs.bodyweight).toBe('80')
      expect(prefs.experienceLevel).toBe('intermediate')
      expect(prefs.equipment).toBe('full_gym')
      expect(prefs.energy).toBe('medium')
      expect(prefs.trainingPhase).toBeUndefined()
      expect(prefs.blockWeek).toBeUndefined()
      expect(prefs.isDeload).toBe(false)
      expect(prefs.targetRPE).toBeNull()
      expect(prefs.targetRepRange).toBeNull()
    })

    it('includes block info when block is provided', () => {
      const settings = createSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2 })
      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.trainingPhase).toBe('accumulation')
      expect(prefs.blockWeek).toBe(2)
      expect(prefs.blockTotalWeeks).toBe(4)
      expect(prefs.isDeload).toBe(false)
      expect(prefs.targetRPE).toBe(7.5) // week 2 accumulation
      expect(prefs.targetRepRange).toEqual([10, 12])
    })

    it('sets isDeload=true for deload phase', () => {
      const settings = createSettings()
      const block = createTrainingBlock({ phase: 'deload', currentWeek: 1 })
      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.isDeload).toBe(true)
      expect(prefs.targetRPE).toBe(5)
    })

    it('uses default name when settings name is empty', () => {
      const settings = createSettings({ name: '' })
      const prefs = buildWorkoutPreferences(settings, null)
      expect(prefs.name).toBe('athlete')
    })

    it('applies overrides on top of base preferences', () => {
      const settings = createSettings()
      const prefs = buildWorkoutPreferences(settings, null, {
        energy: 'high',
        focusedMuscles: ['chest', 'back'],
        time: 90,
      })

      expect(prefs.energy).toBe('high')
      expect(prefs.focusedMuscles).toEqual(['chest', 'back'])
      expect(prefs.time).toBe(90)
    })

    it('includes lift maxes from settings', () => {
      const settings = createSettings({ benchMax: '120', squatMax: '160', deadliftMax: '200' })
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.benchMax).toBe('120')
      expect(prefs.squatMax).toBe('160')
      expect(prefs.deadliftMax).toBe('200')
    })

    it('includes priority muscles from settings', () => {
      const settings = createSettings({ priorityMuscles: ['chest', 'shoulders'] })
      const prefs = buildWorkoutPreferences(settings, null)
      expect(prefs.priorityMuscles).toEqual(['chest', 'shoulders'])
    })

    it('overrides can replace any base property', () => {
      const settings = createSettings({ bodyweight: '80' })
      const prefs = buildWorkoutPreferences(settings, null, { bodyweight: '90' })
      expect(prefs.bodyweight).toBe('90')
    })

    it('handles settings with missing optional fields', () => {
      const settings = createSettings({
        bodyweight: '',
        benchMax: '',
        squatMax: '',
        deadliftMax: '',
        priorityMuscles: [],
      })
      const prefs = buildWorkoutPreferences(settings, null)
      expect(prefs.bodyweight).toBe('')
      expect(prefs.focusedMuscles).toEqual([])
    })
  })
})
