/**
 * Local Workout Generator — Zero LLM Cost
 *
 * Template-based workout generator for basic/free tier users.
 * Uses periodization, training analysis, and exercise databases
 * to generate workouts without any AI API calls.
 *
 * Not as adaptive as the AI generator, but provides solid
 * evidence-based programming at zero cost.
 */

import type {
  MuscleGroup, MuscleStatusMap, AIWorkoutResponse, AIExercise,
  ExperienceLevel, RecentSession,
} from '../types'
import { SET_TARGETS_BY_GOAL, getVolumeCeiling } from './training-analysis'
import { calculateProgression } from './progressiveOverload'

// --- Exercise Templates ---

interface TemplateExercise {
  name: string
  muscle_group: MuscleGroup
  isCompound: boolean
  equipment: 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight'
  /** Base weight multiplier relative to bodyweight for intermediates */
  bwMultiplier: number
}

const EXERCISE_POOL: Record<MuscleGroup, TemplateExercise[]> = {
  chest: [
    { name: 'Flat Barbell Bench Press', muscle_group: 'chest', isCompound: true, equipment: 'barbell', bwMultiplier: 0.8 },
    { name: 'Incline Dumbbell Press', muscle_group: 'chest', isCompound: true, equipment: 'dumbbell', bwMultiplier: 0.35 },
    { name: 'Cable Fly (Mid)', muscle_group: 'chest', isCompound: false, equipment: 'cable', bwMultiplier: 0.15 },
    { name: 'Incline Barbell Bench Press', muscle_group: 'chest', isCompound: true, equipment: 'barbell', bwMultiplier: 0.65 },
    { name: 'Flat Dumbbell Bench Press', muscle_group: 'chest', isCompound: true, equipment: 'dumbbell', bwMultiplier: 0.35 },
    { name: 'Pec Deck', muscle_group: 'chest', isCompound: false, equipment: 'machine', bwMultiplier: 0.5 },
  ],
  back: [
    { name: 'Barbell Row', muscle_group: 'back', isCompound: true, equipment: 'barbell', bwMultiplier: 0.7 },
    { name: 'Lat Pulldown (Wide)', muscle_group: 'back', isCompound: true, equipment: 'cable', bwMultiplier: 0.6 },
    { name: 'Seated Cable Row', muscle_group: 'back', isCompound: true, equipment: 'cable', bwMultiplier: 0.6 },
    { name: 'Dumbbell Row', muscle_group: 'back', isCompound: true, equipment: 'dumbbell', bwMultiplier: 0.4 },
    { name: 'Pull-up', muscle_group: 'back', isCompound: true, equipment: 'bodyweight', bwMultiplier: 0 },
    { name: 'Straight Arm Pulldown', muscle_group: 'back', isCompound: false, equipment: 'cable', bwMultiplier: 0.25 },
  ],
  shoulders: [
    { name: 'Dumbbell Overhead Press', muscle_group: 'shoulders', isCompound: true, equipment: 'dumbbell', bwMultiplier: 0.3 },
    { name: 'Lateral Raise', muscle_group: 'shoulders', isCompound: false, equipment: 'dumbbell', bwMultiplier: 0.1 },
    { name: 'Face Pull', muscle_group: 'shoulders', isCompound: false, equipment: 'cable', bwMultiplier: 0.15 },
    { name: 'Barbell Overhead Press', muscle_group: 'shoulders', isCompound: true, equipment: 'barbell', bwMultiplier: 0.5 },
    { name: 'Cable Lateral Raise', muscle_group: 'shoulders', isCompound: false, equipment: 'cable', bwMultiplier: 0.08 },
    { name: 'Rear Delt Fly', muscle_group: 'shoulders', isCompound: false, equipment: 'dumbbell', bwMultiplier: 0.08 },
  ],
  quads: [
    { name: 'Back Squat', muscle_group: 'quads', isCompound: true, equipment: 'barbell', bwMultiplier: 1.2 },
    { name: 'Leg Press', muscle_group: 'quads', isCompound: true, equipment: 'machine', bwMultiplier: 2.0 },
    { name: 'Leg Extension', muscle_group: 'quads', isCompound: false, equipment: 'machine', bwMultiplier: 0.5 },
    { name: 'Front Squat', muscle_group: 'quads', isCompound: true, equipment: 'barbell', bwMultiplier: 0.9 },
    { name: 'Bulgarian Split Squat', muscle_group: 'quads', isCompound: true, equipment: 'dumbbell', bwMultiplier: 0.25 },
    { name: 'Hack Squat', muscle_group: 'quads', isCompound: true, equipment: 'machine', bwMultiplier: 1.0 },
  ],
  hamstrings: [
    { name: 'Romanian Deadlift', muscle_group: 'hamstrings', isCompound: true, equipment: 'barbell', bwMultiplier: 0.9 },
    { name: 'Lying Leg Curl', muscle_group: 'hamstrings', isCompound: false, equipment: 'machine', bwMultiplier: 0.4 },
    { name: 'Seated Leg Curl', muscle_group: 'hamstrings', isCompound: false, equipment: 'machine', bwMultiplier: 0.4 },
    { name: 'Nordic Curl', muscle_group: 'hamstrings', isCompound: false, equipment: 'bodyweight', bwMultiplier: 0 },
  ],
  glutes: [
    { name: 'Hip Thrust', muscle_group: 'glutes', isCompound: true, equipment: 'barbell', bwMultiplier: 1.2 },
    { name: 'Glute Bridge', muscle_group: 'glutes', isCompound: false, equipment: 'bodyweight', bwMultiplier: 0 },
    { name: 'Cable Kickback', muscle_group: 'glutes', isCompound: false, equipment: 'cable', bwMultiplier: 0.15 },
  ],
  biceps: [
    { name: 'Barbell Curl', muscle_group: 'biceps', isCompound: false, equipment: 'barbell', bwMultiplier: 0.3 },
    { name: 'Dumbbell Curl', muscle_group: 'biceps', isCompound: false, equipment: 'dumbbell', bwMultiplier: 0.12 },
    { name: 'Hammer Curl', muscle_group: 'biceps', isCompound: false, equipment: 'dumbbell', bwMultiplier: 0.14 },
    { name: 'Incline Dumbbell Curl', muscle_group: 'biceps', isCompound: false, equipment: 'dumbbell', bwMultiplier: 0.1 },
    { name: 'Cable Curl', muscle_group: 'biceps', isCompound: false, equipment: 'cable', bwMultiplier: 0.2 },
  ],
  triceps: [
    { name: 'Tricep Pushdown', muscle_group: 'triceps', isCompound: false, equipment: 'cable', bwMultiplier: 0.25 },
    { name: 'Skull Crusher', muscle_group: 'triceps', isCompound: false, equipment: 'barbell', bwMultiplier: 0.3 },
    { name: 'Overhead Tricep Extension', muscle_group: 'triceps', isCompound: false, equipment: 'cable', bwMultiplier: 0.2 },
    { name: 'Close Grip Bench Press', muscle_group: 'triceps', isCompound: true, equipment: 'barbell', bwMultiplier: 0.6 },
    { name: 'Diamond Push-up', muscle_group: 'triceps', isCompound: false, equipment: 'bodyweight', bwMultiplier: 0 },
  ],
  core: [
    { name: 'Cable Crunch', muscle_group: 'core', isCompound: false, equipment: 'cable', bwMultiplier: 0.3 },
    { name: 'Hanging Leg Raise', muscle_group: 'core', isCompound: false, equipment: 'bodyweight', bwMultiplier: 0 },
    { name: 'Plank', muscle_group: 'core', isCompound: false, equipment: 'bodyweight', bwMultiplier: 0 },
    { name: 'Ab Wheel Rollout', muscle_group: 'core', isCompound: false, equipment: 'bodyweight', bwMultiplier: 0 },
  ],
}

// Split templates: which muscles and how many exercises per muscle
const SPLIT_TEMPLATES: Record<string, { muscles: MuscleGroup[]; exercisesPerMuscle: Record<MuscleGroup, number> }> = {
  'Push': {
    muscles: ['chest', 'shoulders', 'triceps'],
    exercisesPerMuscle: { chest: 3, shoulders: 2, triceps: 2, back: 0, quads: 0, hamstrings: 0, glutes: 0, biceps: 0, core: 0 },
  },
  'Pull': {
    muscles: ['back', 'biceps'],
    exercisesPerMuscle: { back: 3, biceps: 2, chest: 0, shoulders: 0, triceps: 0, quads: 0, hamstrings: 0, glutes: 0, core: 0 },
  },
  'Legs': {
    muscles: ['quads', 'hamstrings', 'glutes', 'core'],
    exercisesPerMuscle: { quads: 2, hamstrings: 2, glutes: 1, core: 1, chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0 },
  },
  'Upper': {
    muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    exercisesPerMuscle: { chest: 2, back: 2, shoulders: 1, biceps: 1, triceps: 1, quads: 0, hamstrings: 0, glutes: 0, core: 0 },
  },
  'Lower': {
    muscles: ['quads', 'hamstrings', 'glutes', 'core'],
    exercisesPerMuscle: { quads: 2, hamstrings: 2, glutes: 1, core: 1, chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0 },
  },
  'Full Body': {
    muscles: ['chest', 'back', 'quads', 'shoulders', 'hamstrings', 'biceps', 'triceps'],
    exercisesPerMuscle: { chest: 1, back: 1, shoulders: 1, quads: 1, hamstrings: 1, glutes: 0, biceps: 1, triceps: 1, core: 0 },
  },
}

// --- Interfaces ---

interface LocalWorkoutInput {
  muscleStatus: MuscleStatusMap
  recommendedSplit: string
  recentHistory: RecentSession[]
  preferences: {
    goal?: string
    trainingGoal?: string
    trainingPhase?: string
    equipment?: string
    experienceLevel?: ExperienceLevel
    bodyweight?: string
    energy?: string
    time?: number
    focusedMuscles?: MuscleGroup[]
    isDeload?: boolean
    blockWeek?: number
    targetRPE?: number | null
    targetRepRange?: [number, number] | null
  }
}

// --- Helper Functions ---

const LEVEL_MULTIPLIERS: Record<ExperienceLevel, number> = {
  beginner: 0.6,
  intermediate: 1.0,
  advanced: 1.3,
}

function estimateWeight(template: TemplateExercise, bodyweightKg: number, level: ExperienceLevel): number {
  if (template.equipment === 'bodyweight') return 0
  const mult = LEVEL_MULTIPLIERS[level] || 1.0
  const raw = bodyweightKg * template.bwMultiplier * mult
  return Math.max(2.5, Math.round(raw / 2.5) * 2.5)
}

function getRepRange(goal: string, isCompound: boolean): [number, number] {
  const ranges: Record<string, [number, number]> = {
    strength: isCompound ? [3, 5] : [6, 8],
    hypertrophy: isCompound ? [8, 10] : [10, 12],
    powerbuilding: isCompound ? [4, 6] : [8, 10],
    conditioning: isCompound ? [12, 15] : [15, 20],
    endurance: isCompound ? [12, 15] : [15, 20],
  }
  return ranges[goal] || ranges.hypertrophy!
}

function getSets(isCompound: boolean, isDeload: boolean): number {
  if (isDeload) return 2
  return isCompound ? 4 : 3
}

function getRestSeconds(isCompound: boolean, goal: string): number {
  if (goal === 'strength' || goal === 'powerbuilding') return isCompound ? 180 : 120
  if (goal === 'conditioning' || goal === 'endurance') return isCompound ? 60 : 45
  return isCompound ? 120 : 90
}

/**
 * Build a map of recent exercise performance for progressive overload decisions.
 */
function buildHistoryMap(history: RecentSession[]): Record<string, { weight: number; reps: number; rpe: number | null }> {
  const map: Record<string, { weight: number; reps: number; rpe: number | null }> = {}
  // Most recent first — only keep the latest entry per exercise
  for (const session of history) {
    for (const set of session.sets) {
      if (!set.exercise || map[set.exercise]) continue
      map[set.exercise] = {
        weight: set.weight_kg ?? 0,
        reps: set.reps ?? 0,
        rpe: set.rpe,
      }
    }
  }
  return map
}

/**
 * Apply percentage-based progressive overload using the new progression engine.
 * Returns [adjustedWeight, suggestedReps, vsLastSession note].
 */
function applyOverload(
  exerciseName: string,
  estimatedWeight: number,
  muscleGroup: MuscleGroup,
  repRange: [number, number],
  historyMap: Record<string, { weight: number; reps: number; rpe: number | null }>,
): [number, number | null, AIExercise['vs_last_session']] {
  const prev = historyMap[exerciseName]
  if (!prev || prev.weight === 0) {
    return [estimatedWeight, null, 'new']
  }

  const result = calculateProgression({
    exercise: exerciseName,
    previousWeight: prev.weight,
    previousReps: prev.reps,
    previousRpe: prev.rpe,
    targetRepRange: repRange,
    muscleGroup,
  })

  const strategyLabels: Record<string, string> = {
    weight_increase: 'up',
    rep_progression: 'up',
    maintain: 'same',
    deload: 'down',
    estimate: 'new',
  }
  const label = strategyLabels[result.strategy] ?? 'same'
  const vsNote = `${label} - prev ${prev.weight}kg x${prev.reps}${prev.rpe != null ? ` @RPE${prev.rpe}` : ''}, ${result.reason}` as AIExercise['vs_last_session']

  return [result.suggestedWeight, result.suggestedReps, vsNote]
}

/**
 * Pick exercises from the pool, avoiding recently used ones when possible.
 */
function pickExercises(
  muscle: MuscleGroup,
  count: number,
  recentExerciseNames: Set<string>,
  equipment: string,
): TemplateExercise[] {
  const pool = EXERCISE_POOL[muscle] || []
  // Filter by equipment availability
  const equipmentSets: Record<string, string[]> = {
    full_gym: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'],
    home_gym: ['barbell', 'dumbbell', 'bodyweight'],
    dumbbells: ['dumbbell', 'bodyweight'],
    bodyweight: ['bodyweight'],
  }
  const available = equipmentSets[equipment] || equipmentSets.full_gym!
  const filtered = pool.filter(e => available.includes(e.equipment))

  if (filtered.length === 0) return []

  // Prefer exercises not done recently
  const notRecent = filtered.filter(e => !recentExerciseNames.has(e.name))
  const preferred = notRecent.length >= count ? notRecent : filtered

  // Compounds first, then isolations
  const compounds = preferred.filter(e => e.isCompound)
  const isolations = preferred.filter(e => !e.isCompound)
  const sorted = [...compounds, ...isolations]

  return sorted.slice(0, count)
}

// --- Main Generator ---

/**
 * Generate a workout locally without any LLM calls.
 * Returns the same AIWorkoutResponse format for drop-in compatibility.
 */
export function generateLocalWorkout({
  muscleStatus,
  recommendedSplit,
  recentHistory,
  preferences,
}: LocalWorkoutInput): AIWorkoutResponse {
  const split = recommendedSplit
  const template = SPLIT_TEMPLATES[split] || SPLIT_TEMPLATES['Full Body']!
  const goal = preferences.trainingGoal || preferences.goal || 'hypertrophy'
  const level = preferences.experienceLevel || 'intermediate'
  const bwKg = parseFloat(preferences.bodyweight || '') || 80
  const equipment = preferences.equipment || 'full_gym'
  const isDeload = preferences.isDeload || false
  const targetRPE = isDeload ? 6 : (preferences.targetRPE ?? 8)
  const targetRepRange = preferences.targetRepRange || null
  const focusedMuscles = new Set(preferences.focusedMuscles || [])
  const timeMin = preferences.time || 60
  const energy = preferences.energy || 'medium'

  // Build recent exercise set for variety
  const recentExerciseNames = new Set<string>()
  if (recentHistory.length > 0) {
    // Only consider the most recent session's exercises
    for (const set of recentHistory[0]?.sets || []) {
      recentExerciseNames.add(set.exercise)
    }
  }

  const historyMap = buildHistoryMap(recentHistory.slice(0, 5))

  // Determine exercise counts per muscle
  const exerciseCounts = { ...template.exercisesPerMuscle }

  // Adjust for focused muscles: +1 exercise
  for (const muscle of focusedMuscles) {
    if (exerciseCounts[muscle] !== undefined && exerciseCounts[muscle]! > 0) {
      exerciseCounts[muscle]! += 1
    }
  }

  // Adjust for time/energy
  const totalBase = Object.values(exerciseCounts).reduce((a, b) => a + b, 0)
  if (energy === 'low' || timeMin < 45) {
    // Reduce to minimum
    for (const muscle of template.muscles) {
      if (exerciseCounts[muscle]! > 1) {
        exerciseCounts[muscle] = Math.max(1, exerciseCounts[muscle]! - 1)
      }
    }
  } else if (energy === 'high' && timeMin >= 75 && totalBase < 9) {
    // Add an exercise to a primary muscle
    const primary = template.muscles[0]
    if (primary) exerciseCounts[primary]! += 1
  }

  // Generate exercises
  const exercises: AIExercise[] = []

  for (const muscle of template.muscles) {
    const count = exerciseCounts[muscle] || 0
    if (count === 0) continue

    const picked = pickExercises(muscle, count, recentExerciseNames, equipment)

    for (const tmpl of picked) {
      const estimatedWt = estimateWeight(tmpl, bwKg, level)
      const repRange: [number, number] = targetRepRange || getRepRange(goal, tmpl.isCompound)
      const [repsMin, repsMax] = repRange
      const [weight, suggestedReps, vsNote] = applyOverload(tmpl.name, estimatedWt, tmpl.muscle_group, repRange, historyMap)
      const sets = getSets(tmpl.isCompound, isDeload)
      const restSec = getRestSeconds(tmpl.isCompound, goal)

      exercises.push({
        name: tmpl.name,
        muscle_group: tmpl.muscle_group,
        sets,
        reps_min: suggestedReps ?? repsMin,
        reps_max: repsMax,
        weight_kg: weight,
        rpe_target: Math.min(targetRPE, isDeload ? 6 : 10),
        rest_seconds: restSec,
        notes: vsNote.startsWith('new') ? 'First time — focus on form and control' : '',
        vs_last_session: vsNote,
      })
    }
  }

  // Post-process: ensure no 0kg weights on non-bodyweight exercises
  for (const ex of exercises) {
    const tmpl = EXERCISE_POOL[ex.muscle_group]?.find(t => t.name === ex.name)
    if (tmpl && tmpl.equipment !== 'bodyweight' && (!ex.weight_kg || ex.weight_kg === 0)) {
      ex.weight_kg = estimateWeight(tmpl, bwKg, level)
    }
  }

  // Enforce volume ceilings: cap sets so weekly total does not exceed MRV
  const ceilings = getVolumeCeiling(level)
  for (const ex of exercises) {
    const ceiling = ceilings[ex.muscle_group]
    if (ceiling != null) {
      const currentWeekly = muscleStatus[ex.muscle_group]?.setsThisWeek || 0
      const otherPlanned = exercises
        .filter(e => e !== ex && e.muscle_group === ex.muscle_group)
        .reduce((s, e) => s + e.sets, 0)
      const remaining = Math.max(0, ceiling - currentWeekly - otherPlanned)
      if (ex.sets > remaining && remaining > 0) {
        ex.sets = remaining
      }
    }
  }

  // Calculate estimated duration
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0)
  const avgRestMin = exercises.reduce((sum, e) => sum + e.rest_seconds, 0) / exercises.length / 60
  const estimatedDuration = Math.round(totalSets * (1.5 + avgRestMin))

  // Build volume notes
  const goalKey = (['hypertrophy', 'strength', 'endurance'] as const).includes(goal as 'hypertrophy' | 'strength' | 'endurance')
    ? goal as 'hypertrophy' | 'strength' | 'endurance'
    : 'hypertrophy' as const
  const targets = SET_TARGETS_BY_GOAL[goalKey]
  const volumeLines: string[] = []
  for (const muscle of template.muscles) {
    const target = targets[muscle]
    const currentSets = muscleStatus[muscle]?.setsThisWeek || 0
    const addedSets = exercises.filter(e => e.muscle_group === muscle).reduce((s, e) => s + e.sets, 0)
    volumeLines.push(`${muscle}: ${currentSets + addedSets}/${target.min}-${target.max} sets`)
  }

  const reasoning = `Template-based ${split} workout. ${isDeload ? 'Deload week: reduced volume and intensity.' : `Progressive overload applied from last ${Object.keys(historyMap).length} tracked exercises.`} ${focusedMuscles.size > 0 ? `Extra volume for: ${[...focusedMuscles].join(', ')}.` : ''}`

  return {
    split,
    reasoning,
    exercises,
    estimated_duration_min: estimatedDuration,
    volume_notes: volumeLines.join(', '),
  }
}
