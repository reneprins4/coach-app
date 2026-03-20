import type { UserSettings, WorkoutPreferences, TrainingBlock } from '../types'
import { getCurrentWeekTarget, PHASES } from './periodization'

/**
 * Build the workout preferences object used by generateScientificWorkout.
 * This logic was duplicated across Logger (analyzeAndGenerate, generateForSplit)
 * and AICoach (handleGenerate). Now it lives in one place.
 */
export function buildWorkoutPreferences(
  settings: UserSettings,
  block: TrainingBlock | null,
  overrides: Partial<WorkoutPreferences> = {}
): WorkoutPreferences {
  const weekTarget = block ? getCurrentWeekTarget(block) : null
  const phase = block ? PHASES[block.phase] : null

  const base: WorkoutPreferences = {
    name: settings.name || 'athlete',
    gender: settings.gender,
    bodyweight: settings.bodyweight || '',
    experienceLevel: settings.experienceLevel || 'intermediate',
    equipment: settings.equipment || 'full_gym',
    goal: settings.goal,
    frequency: settings.frequency,
    time: settings.time || 60,
    energy: 'medium',
    benchMax: settings.benchMax || '',
    squatMax: settings.squatMax || '',
    deadliftMax: settings.deadliftMax || '',
    focusedMuscles: [],
    priorityMuscles: settings.priorityMuscles || [],
    trainingGoal: settings.trainingGoal,
    trainingPhase: block?.phase,
    blockWeek: block?.currentWeek,
    blockTotalWeeks: phase?.weeks ?? null,
    isDeload: block?.phase === 'deload',
    targetRPE: weekTarget?.rpe ?? null,
    targetRepRange: weekTarget?.repRange ?? null,
    weekTargetNote: weekTarget?.setNote ?? null,
  }

  return { ...base, ...overrides }
}
