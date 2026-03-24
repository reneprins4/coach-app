/**
 * Unit tests: Plan-Aware Workout Preferences Pipeline
 *
 * Verifies that buildWorkoutPreferences correctly incorporates periodization
 * block data (phase, week, RPE targets, rep ranges, deload flags) and that
 * overrides (energy, focusedMuscles) are passed through.
 */

import { describe, it, expect, vi } from 'vitest'
import { buildWorkoutPreferences } from '../../lib/workoutPreferences'
import { createTrainingBlock, createSettings } from '../helpers'
import type { TrainingBlock, UserSettings, MuscleGroup } from '../../types'

// Mock periodization module — needed because buildWorkoutPreferences imports it
vi.mock('../../lib/periodization', () => ({
  getCurrentWeekTarget: vi.fn((block: TrainingBlock | null) => {
    if (!block) return null
    const phases: Record<string, { weekTargets: Array<{ week: number; rpe: number; repRange: [number, number]; setNote: string; isDeload: boolean }> }> = {
      accumulation: {
        weekTargets: [
          { week: 1, rpe: 7, repRange: [10, 12], setNote: 'Basisvolume', isDeload: false },
          { week: 2, rpe: 7.5, repRange: [10, 12], setNote: '+1 set per spiergroep', isDeload: false },
          { week: 3, rpe: 8, repRange: [10, 12], setNote: '+2 sets per spiergroep', isDeload: false },
          { week: 4, rpe: 5, repRange: [10, 12], setNote: 'Deload - 40% volume', isDeload: true },
        ],
      },
      intensification: {
        weekTargets: [
          { week: 1, rpe: 7.5, repRange: [6, 8], setNote: 'Basisvolume', isDeload: false },
          { week: 2, rpe: 8, repRange: [6, 8], setNote: '+1 set', isDeload: false },
          { week: 3, rpe: 8.5, repRange: [5, 6], setNote: 'Push', isDeload: false },
          { week: 4, rpe: 5, repRange: [6, 8], setNote: 'Deload', isDeload: true },
        ],
      },
      strength: {
        weekTargets: [
          { week: 1, rpe: 8, repRange: [3, 5], setNote: 'Zware compounds', isDeload: false },
          { week: 2, rpe: 9, repRange: [2, 4], setNote: 'Bijna-max', isDeload: false },
          { week: 3, rpe: 5, repRange: [3, 5], setNote: 'Deload', isDeload: true },
        ],
      },
      deload: {
        weekTargets: [
          { week: 1, rpe: 5, repRange: [10, 12], setNote: 'Niet forceren', isDeload: true },
        ],
      },
    }
    const phaseData = phases[block.phase]
    if (!phaseData) return null
    const weekIdx = Math.min(block.currentWeek - 1, phaseData.weekTargets.length - 1)
    return phaseData.weekTargets[weekIdx] ?? null
  }),
  PHASES: {
    accumulation: {
      label: 'Opbouw',
      labelKey: 'phases.accumulation',
      weeks: 4,
      description: '',
      descriptionKey: 'phases.accumulation_desc',
      color: 'blue',
      weekTargets: [
        { week: 1, rpe: 7, repRange: [10, 12], setNote: 'Basisvolume', isDeload: false },
        { week: 2, rpe: 7.5, repRange: [10, 12], setNote: '+1 set per spiergroep', isDeload: false },
        { week: 3, rpe: 8, repRange: [10, 12], setNote: '+2 sets per spiergroep', isDeload: false },
        { week: 4, rpe: 5, repRange: [10, 12], setNote: 'Deload - 40% volume', isDeload: true },
      ],
    },
    intensification: {
      label: 'Intensivering',
      labelKey: 'phases.intensification',
      weeks: 4,
      description: '',
      descriptionKey: 'phases.intensification_desc',
      color: 'orange',
      weekTargets: [],
    },
    strength: {
      label: 'Kracht Piek',
      labelKey: 'phases.strength',
      weeks: 3,
      description: '',
      descriptionKey: 'phases.strength_desc',
      color: 'red',
      weekTargets: [],
    },
    deload: {
      label: 'Deload',
      labelKey: 'phases.deload',
      weeks: 1,
      description: '',
      descriptionKey: 'phases.deload_desc',
      color: 'gray',
      weekTargets: [
        { week: 1, rpe: 5, repRange: [10, 12], setNote: 'Niet forceren', isDeload: true },
      ],
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultSettings(): UserSettings {
  return createSettings({
    name: 'Test User',
    gender: 'male',
    bodyweight: '80',
    experienceLevel: 'intermediate',
    equipment: 'full_gym',
    goal: 'hypertrophy',
    trainingGoal: 'hypertrophy',
    frequency: '4x',
    time: 60,
    benchMax: '100',
    squatMax: '140',
    deadliftMax: '180',
  })
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('buildWorkoutPreferences — plan-aware pipeline', () => {
  // 1. Accumulation block week 2
  describe('with accumulation block week 2', () => {
    it('includes trainingPhase as "accumulation"', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.trainingPhase).toBe('accumulation')
    })

    it('includes blockWeek = 2', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.blockWeek).toBe(2)
    })

    it('includes targetRPE = 7.5 (week 2 of accumulation)', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.targetRPE).toBe(7.5)
    })

    it('includes targetRepRange = [10, 12] (accumulation reps)', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.targetRepRange).toEqual([10, 12])
    })

    it('isDeload is false (week 2 is not deload)', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.isDeload).toBe(false)
    })

    it('blockTotalWeeks is 4 (accumulation has 4 weeks)', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.blockTotalWeeks).toBe(4)
    })
  })

  // 2. Deload block
  describe('with deload block', () => {
    it('isDeload is true', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'deload', currentWeek: 1, daysElapsed: 3 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.isDeload).toBe(true)
    })

    it('targetRPE is 5 (deload RPE)', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'deload', currentWeek: 1, daysElapsed: 3 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.targetRPE).toBe(5)
    })

    it('trainingPhase is "deload"', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'deload', currentWeek: 1, daysElapsed: 3 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.trainingPhase).toBe('deload')
    })
  })

  // 3. No block
  describe('with no block (null)', () => {
    it('trainingPhase is undefined', () => {
      const settings = defaultSettings()
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.trainingPhase).toBeUndefined()
    })

    it('blockWeek is undefined', () => {
      const settings = defaultSettings()
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.blockWeek).toBeUndefined()
    })

    it('targetRPE is null', () => {
      const settings = defaultSettings()
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.targetRPE).toBeNull()
    })

    it('targetRepRange is null', () => {
      const settings = defaultSettings()
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.targetRepRange).toBeNull()
    })

    it('isDeload is false', () => {
      const settings = defaultSettings()
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.isDeload).toBe(false)
    })

    it('blockTotalWeeks is null', () => {
      const settings = defaultSettings()
      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.blockTotalWeeks).toBeNull()
    })
  })

  // 4. Energy override
  describe('with energy override', () => {
    it('energy override is passed through when block is active', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 1, daysElapsed: 3 })

      const prefs = buildWorkoutPreferences(settings, block, { energy: 'low' })

      expect(prefs.energy).toBe('low')
    })

    it('energy override is passed through without block', () => {
      const settings = defaultSettings()

      const prefs = buildWorkoutPreferences(settings, null, { energy: 'high' })

      expect(prefs.energy).toBe('high')
    })

    it('default energy is "medium" when no override', () => {
      const settings = defaultSettings()

      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.energy).toBe('medium')
    })
  })

  // 5. focusedMuscles override
  describe('with focusedMuscles override', () => {
    it('focusedMuscles override is passed through', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 1, daysElapsed: 3 })
      const muscles: MuscleGroup[] = ['chest', 'shoulders']

      const prefs = buildWorkoutPreferences(settings, block, { focusedMuscles: muscles })

      expect(prefs.focusedMuscles).toEqual(['chest', 'shoulders'])
    })

    it('default focusedMuscles is empty array', () => {
      const settings = defaultSettings()

      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.focusedMuscles).toEqual([])
    })
  })

  // 6. Time override
  describe('with time override', () => {
    it('time override replaces settings time', () => {
      const settings = defaultSettings() // time: 60
      const block = createTrainingBlock({ phase: 'accumulation', currentWeek: 1, daysElapsed: 3 })

      const prefs = buildWorkoutPreferences(settings, block, { time: 90 })

      expect(prefs.time).toBe(90)
    })
  })

  // 7. Settings passthrough
  describe('settings passthrough', () => {
    it('preserves user settings fields (equipment, experienceLevel, goal)', () => {
      const settings = createSettings({
        equipment: 'home_gym',
        experienceLevel: 'advanced',
        goal: 'strength',
        trainingGoal: 'strength',
      })

      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.equipment).toBe('home_gym')
      expect(prefs.experienceLevel).toBe('advanced')
      expect(prefs.goal).toBe('strength')
      expect(prefs.trainingGoal).toBe('strength')
    })

    it('preserves lift maxes', () => {
      const settings = createSettings({
        benchMax: '120',
        squatMax: '160',
        deadliftMax: '200',
      })

      const prefs = buildWorkoutPreferences(settings, null)

      expect(prefs.benchMax).toBe('120')
      expect(prefs.squatMax).toBe('160')
      expect(prefs.deadliftMax).toBe('200')
    })
  })

  // 8. Strength phase week targets
  describe('with strength block week 2', () => {
    it('targetRPE is 9 (strength week 2)', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'strength', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.targetRPE).toBe(9)
    })

    it('targetRepRange is [2, 4] (strength week 2)', () => {
      const settings = defaultSettings()
      const block = createTrainingBlock({ phase: 'strength', currentWeek: 2, daysElapsed: 10 })

      const prefs = buildWorkoutPreferences(settings, block)

      expect(prefs.targetRepRange).toEqual([2, 4])
    })
  })
})
