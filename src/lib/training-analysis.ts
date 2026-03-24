/**
 * Scientific training analysis engine.
 * Uses evidence-based recovery rates per muscle group.
 */

import type {
  MuscleGroup, SetTarget, MuscleStatus, RecoveryStatusLabel,
  SplitScore, Workout, ExerciseClassification, ExperienceLevel,
  LastSessionSet, SplitName,
} from '../types'
import { loadInjuries } from './injuryRecovery'
import type { InjuryArea, InjurySeverity } from './injuryRecovery'

/** All tracked muscle groups */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core',
]

type GoalKey = 'hypertrophy' | 'strength' | 'endurance'

// Weekly set targets by goal (Israetel MEV/MAV ranges)
export const SET_TARGETS_BY_GOAL: Record<GoalKey, Record<MuscleGroup, SetTarget>> = {
  hypertrophy: {
    chest:      { min: 10, max: 20, mev: 8 },
    back:       { min: 14, max: 22, mev: 10 },
    shoulders:  { min: 8,  max: 20, mev: 6 },
    quads:      { min: 12, max: 20, mev: 8 },
    hamstrings: { min: 10, max: 16, mev: 6 },
    glutes:     { min: 6,  max: 16, mev: 4 },
    biceps:     { min: 8,  max: 14, mev: 6 },
    triceps:    { min: 8,  max: 14, mev: 6 },
    core:       { min: 4,  max: 12, mev: 2 },
  },
  strength: {
    chest:      { min: 6,  max: 12, mev: 4 },
    back:       { min: 8,  max: 14, mev: 5 },
    shoulders:  { min: 4,  max: 10, mev: 3 },
    quads:      { min: 6,  max: 12, mev: 4 },
    hamstrings: { min: 6,  max: 10, mev: 3 },
    glutes:     { min: 6,  max: 10, mev: 3 },
    biceps:     { min: 4,  max: 8,  mev: 3 },
    triceps:    { min: 4,  max: 8,  mev: 3 },
    core:       { min: 4,  max: 8,  mev: 2 },
  },
  endurance: {
    chest:      { min: 8,  max: 16, mev: 6 },
    back:       { min: 10, max: 18, mev: 7 },
    shoulders:  { min: 6,  max: 12, mev: 4 },
    quads:      { min: 10, max: 18, mev: 6 },
    hamstrings: { min: 8,  max: 14, mev: 5 },
    glutes:     { min: 8,  max: 16, mev: 5 },
    biceps:     { min: 6,  max: 12, mev: 4 },
    triceps:    { min: 6,  max: 12, mev: 4 },
    core:       { min: 8,  max: 14, mev: 5 },
  },
}

// Keep SET_TARGETS as hypertrophy default for backward compatibility
export const SET_TARGETS = SET_TARGETS_BY_GOAL.hypertrophy

// Muscle-specific recovery hours (evidence-based)
export const RECOVERY_HOURS: Record<MuscleGroup, number> = {
  chest:      72,
  back:       72,
  shoulders:  48,
  quads:      96,
  hamstrings: 72,
  glutes:     72,
  biceps:     48,
  triceps:    48,
  core:       36,
}

const SPLIT_MUSCLES: Record<SplitName | 'Lower Body', MuscleGroup[]> = {
  'Push':       ['chest', 'shoulders', 'triceps', 'core'],
  'Pull':       ['back', 'biceps', 'core'],
  'Legs':       ['quads', 'hamstrings', 'glutes', 'core'],
  'Upper':      ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core'],
  'Lower':      ['quads', 'hamstrings', 'glutes', 'core'],
  'Lower Body': ['quads', 'hamstrings', 'glutes'],
  'Full Body':  ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'],
}

// Primaire (zware) spieren per split
const SPLIT_PRIMARY_MUSCLES: Record<string, MuscleGroup[]> = {
  'Push':       ['chest', 'shoulders', 'triceps'],
  'Pull':       ['back', 'biceps'],
  'Legs':       ['quads', 'hamstrings', 'glutes'],
  'Upper':      ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  'Lower':      ['quads', 'hamstrings', 'glutes'],
  'Lower Body': ['quads', 'hamstrings', 'glutes'],
  'Full Body':  ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps'],
}

// Map exercise names -> muscle groups
const EXERCISE_MUSCLE_MAP: Record<string, MuscleGroup> = {
  // Hamstrings
  'glute.*ham':         'hamstrings',
  'romanian':           'hamstrings', 'rdl':          'hamstrings', 'leg.*curl':      'hamstrings',
  'nordic':             'hamstrings', 'good.*morning':'hamstrings', 'stiff.?leg':     'hamstrings',
  'hamstring':          'hamstrings',
  // Glutes
  'hip.*thrust':        'glutes', 'glute.*bridge': 'glutes', 'sumo.*deadlift': 'glutes',
  'kickback':           'glutes', 'abductor':   'glutes',
  // Shoulders
  'reverse.*pec':       'shoulders', 'landmine':     'shoulders',
  'overhead.*press':    'shoulders', 'ohp':          'shoulders', 'lateral.*raise': 'shoulders',
  'face.*pull':         'shoulders', 'rear.*delt':   'shoulders', 'arnold':         'shoulders',
  'upright.*row':       'shoulders', 'shoulder.*press': 'shoulders', 'cable.*lateral': 'shoulders',
  'military.*press':    'shoulders', 'front.*raise': 'shoulders', 'reverse.*fly':   'shoulders',
  'side.*raise':        'shoulders', 'delt.*raise':  'shoulders', 'band.*pull.*apart': 'shoulders',
  // Chest dip
  'chest.*dip':         'chest',
  // Triceps
  'close.*grip.*bench': 'triceps', 'pushdown':      'triceps', 'skull.*crush':    'triceps',
  'overhead.*extension':'triceps',  'tricep':        'triceps', 'dip':             'triceps',
  'cable.*extension':   'triceps', 'jm.*press':     'triceps',
  // Chest
  'bench':              'chest',  'press.*chest':  'chest',  'incline.*press':  'chest',
  'cable.*cross':       'chest',  'crossover':     'chest',  'fly(?!.*reverse)':'chest',
  'pec':                'chest',  'push.?up':      'chest',  'cable.*fly':      'chest',
  'floor.*press':       'chest',  'spoto':         'chest',  'board.*press':    'chest',
  'pin.*press':         'chest',  'machine.*press':'chest',  'pullover':        'chest',
  // Back
  'deadlift':           'back',   'row(?!.*upright)': 'back', 'pull.?up':       'back',
  'pullup':             'back',   'chin.?up':      'back',   'pulldown':        'back',
  'lat.*pull':          'back',   'hyperextension':'back',
  // Quads
  'squat':              'quads',  'leg.*press':    'quads',  'hack':            'quads',
  'lunge':              'quads',  'leg.*extension':'quads',  'split.*squat':    'quads',
  'front.*squat':       'quads',  'bulgarian':     'quads',  'step.?up':        'quads',
  // Biceps
  'curl(?!.*leg)':      'biceps', 'hammer':        'biceps', 'preacher':        'biceps',
  'concentration':      'biceps', 'ez.*bar.*curl': 'biceps',
  // Core
  'plank':              'core',   'crunch':        'core',   'ab.*wheel':       'core',
  'leg.*raise':         'core',   'pallof':        'core',   'dead.*bug':       'core',
  'russian.*twist':     'core',   'sit.?up':       'core',   'woodchop':        'core',
}

// Compound exercises hit multiple muscle groups
const COMPOUND_SECONDARY_MUSCLES: Record<string, MuscleGroup[]> = {
  'deadlift':         ['hamstrings', 'glutes'],
  'trap.*bar':        ['quads', 'hamstrings'],
  'squat':            ['hamstrings', 'glutes'],
  'leg.*press':       ['hamstrings', 'glutes'],
  'lunge':            ['hamstrings', 'glutes'],
  'split.*squat':     ['hamstrings', 'glutes'],
  'bulgarian':        ['hamstrings', 'glutes'],
  'bench(?!.*close)': ['triceps', 'shoulders'],
  'incline.*press':   ['triceps', 'shoulders'],
  'row(?!.*upright)': ['biceps'],
  'pull.?up':         ['biceps'],
  'chin.?up':         ['biceps'],
  'pulldown':         ['biceps'],
  'lat.*pull':        ['biceps'],
  'romanian':         ['glutes'],
  'rdl':              ['glutes'],
  'stiff.?leg':       ['glutes'],
  'good.*morning':    ['glutes'],
  'hip.*thrust':      ['hamstrings'],
  'glute.*bridge':    ['hamstrings'],
  'overhead.*press':  ['triceps'],
  'ohp':              ['triceps'],
  'military.*press':  ['triceps'],
  'shoulder.*press':  ['triceps'],
}

export function classifyExercise(exerciseName: string): MuscleGroup | null {
  if (!exerciseName) return null
  const lower = exerciseName.toLowerCase()
  for (const [pattern, muscle] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (new RegExp(pattern, 'i').test(lower)) return muscle
  }
  return null
}

/**
 * Get all muscles trained by an exercise (primary + secondary)
 */
export function classifyExerciseFull(exerciseName: string): ExerciseClassification {
  if (!exerciseName) return { primary: null, secondary: [] }
  const lower = exerciseName.toLowerCase()
  const primary = classifyExercise(exerciseName)
  const secondary: MuscleGroup[] = []

  for (const [pattern, muscles] of Object.entries(COMPOUND_SECONDARY_MUSCLES)) {
    if (new RegExp(pattern, 'i').test(lower)) {
      for (const m of muscles) {
        if (m !== primary && !secondary.includes(m)) {
          secondary.push(m)
        }
      }
    }
  }

  return { primary, secondary }
}

/**
 * Calculate recovery % for a muscle group.
 *
 * Safety fixes applied:
 * - Volume multiplier 0.13/set (was 0.08) for realistic fatigue at high volumes
 * - RPE floor clamped to 0.95 so RPE 6 doesn't give unrealistic recovery bonus
 * - Compound-heavy groups (quads, back, glutes) already use higher base hours
 */
export function calcMuscleRecovery(muscle: string, hoursSinceTrained: number | null, avgRPE: number | null, setsCount: number): number {
  if (hoursSinceTrained == null || !Number.isFinite(hoursSinceTrained)) return 100
  const safeHours = Math.max(0, hoursSinceTrained)
  const baseHours = RECOVERY_HOURS[muscle as MuscleGroup] || 72
  const safeSets = Number.isFinite(setsCount) ? setsCount : 0
  const volumeMult = 1 + Math.max(0, (safeSets - 6) * 0.13)
  const safeRPE = (avgRPE != null && Number.isFinite(avgRPE)) ? avgRPE : 7
  const clampedRPE = Math.max(1, Math.min(10, safeRPE))
  // Floor at 0.95: RPE 6 and below should not dramatically reduce recovery time
  const rpeMult = Math.max(0.95, 1 + (clampedRPE - 7) * 0.15)
  const adjustedHours = baseHours * volumeMult * rpeMult
  return Math.min(100, Math.round((safeHours / adjustedHours) * 100))
}

/**
 * Weekly volume ceiling per muscle group based on experience level.
 * Evidence-based maximum recoverable volume (MRV) thresholds.
 *
 * Uses SET_TARGETS (hypertrophy) max values as the advanced ceiling,
 * then scales down for lower experience levels:
 * - Beginner:      max * 0.6 (rounded)
 * - Intermediate:  max * 0.85 (rounded)
 * - Advanced:      max * 1.0
 */
export function getVolumeCeiling(experienceLevel: string): Record<string, number> {
  const scale = (['complete_beginner', 'beginner', 'returning'].includes(experienceLevel)) ? 0.6 : experienceLevel === 'advanced' ? 1.0 : 0.85
  return Object.fromEntries(
    MUSCLE_GROUPS.map(m => [m, Math.round(SET_TARGETS[m].max * scale)])
  )
}

export function recoveryStatus(pct: number): RecoveryStatusLabel {
  if (pct >= 90) return 'ready'
  if (pct >= 50) return 'recovering'
  return 'fatigued'
}

/**
 * Analyze recent workout history to determine per-muscle status.
 */
export function analyzeTraining(workouts: Workout[], goal: string = 'hypertrophy'): Record<MuscleGroup, MuscleStatus> {
  const validGoals: GoalKey[] = ['hypertrophy', 'strength', 'endurance']
  const safeGoal: GoalKey = validGoals.includes(goal as GoalKey) ? goal as GoalKey : 'hypertrophy'
  const targets = SET_TARGETS_BY_GOAL[safeGoal]
  const now = new Date()
  // Note: weekStart uses local time (via Date constructor + setDate), which is
  // consistent with getLocalDateString() from dateUtils.ts. Both rely on the
  // browser's local timezone, so weekly boundary matches the user's calendar day.
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const muscleStatus = {} as Record<MuscleGroup, MuscleStatus>
  for (const muscle of Object.keys(targets) as MuscleGroup[]) {
    muscleStatus[muscle] = {
      setsThisWeek: 0,
      daysSinceLastTrained: null,
      hoursSinceLastTrained: null,
      avgRpeLastSession: null,
      setsLastSession: 0,
      recoveryPct: 100,
      recentExercises: [],
      lastSessionSets: [],
      target: targets[muscle],
      status: 'needs_work',
    }
  }

  for (const w of workouts) {
    const workoutDate = new Date(w.created_at)
    if (workoutDate > now) continue

    const daysAgo = (now.getTime() - workoutDate.getTime()) / 86400000
    const hoursAgo = (now.getTime() - workoutDate.getTime()) / 3600000
    const isThisWeek = workoutDate >= weekStart

    for (const s of (w.workout_sets || [])) {
      const { primary, secondary } = classifyExerciseFull(s.exercise)

      // Process primary muscle (full credit)
      if (primary && muscleStatus[primary]) {
        if (isThisWeek) muscleStatus[primary].setsThisWeek++

        if (
          muscleStatus[primary].hoursSinceLastTrained === null ||
          hoursAgo < muscleStatus[primary].hoursSinceLastTrained
        ) {
          muscleStatus[primary].daysSinceLastTrained = Math.floor(daysAgo)
          muscleStatus[primary].hoursSinceLastTrained = hoursAgo
        }

        if (daysAgo <= 7 && !muscleStatus[primary].recentExercises.includes(s.exercise)) {
          muscleStatus[primary].recentExercises.push(s.exercise)
        }
      }

      // Process secondary muscles (50% credit)
      for (const secMuscle of secondary) {
        if (muscleStatus[secMuscle]) {
          if (isThisWeek) muscleStatus[secMuscle].setsThisWeek += 0.5

          if (
            muscleStatus[secMuscle].hoursSinceLastTrained === null ||
            hoursAgo < muscleStatus[secMuscle].hoursSinceLastTrained
          ) {
            muscleStatus[secMuscle].daysSinceLastTrained = Math.floor(daysAgo)
            muscleStatus[secMuscle].hoursSinceLastTrained = hoursAgo
          }

          if (daysAgo <= 7 && !muscleStatus[secMuscle].recentExercises.includes(s.exercise + ' (compound)')) {
            muscleStatus[secMuscle].recentExercises.push(s.exercise + ' (compound)')
          }
        }
      }
    }
  }

  // Calculate RPE + recovery % from most recent session
  for (const muscle of Object.keys(muscleStatus) as MuscleGroup[]) {
    const ms = muscleStatus[muscle]
    for (const w of workouts) {
      const sets = (w.workout_sets || []).filter(s => classifyExercise(s.exercise) === muscle)
      if (sets.length > 0) {
        const rpeSets = sets.filter(s => s.rpe != null)
        ms.avgRpeLastSession = rpeSets.length > 0
          ? Math.round(rpeSets.reduce((sum, s) => sum + Number(s.rpe), 0) / rpeSets.length * 10) / 10
          : null
        ms.setsLastSession = sets.length
        ms.lastSessionSets = sets.map(s => ({
          exercise: s.exercise, weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe,
        } satisfies LastSessionSet))
        break
      }
    }
    ms.recoveryPct = calcMuscleRecovery(muscle, ms.hoursSinceLastTrained, ms.avgRpeLastSession, ms.setsLastSession)
    ms.status = recoveryStatus(ms.recoveryPct)
    if (ms.daysSinceLastTrained === null) ms.status = 'needs_work'
  }

  return muscleStatus
}

// Dutch muscle name mapping for user-facing text
const MUSCLE_NL: Record<MuscleGroup, string> = {
  chest: 'Borst', back: 'Rug', shoulders: 'Schouders',
  quads: 'Bovenbenen', hamstrings: 'Hamstrings', glutes: 'Billen',
  biceps: 'Biceps', triceps: 'Triceps', core: 'Core',
}

function toNL(muscles: string[]): string {
  return muscles.map(m => MUSCLE_NL[m as MuscleGroup] || m).join(', ')
}

// Injury area -> muscles that should be penalized in split scoring
const INJURY_MUSCLE_PENALTIES: Record<InjuryArea, MuscleGroup[]> = {
  knee:       ['quads', 'hamstrings', 'glutes'],
  shoulder:   ['shoulders', 'chest'],
  lower_back: ['back', 'hamstrings'],
  elbow:      ['biceps', 'triceps'],
  wrist:      ['biceps', 'triceps', 'chest'],
  hip:        ['quads', 'hamstrings', 'glutes'],
  neck:       [],  // small general penalty handled separately
  ankle:      ['quads', 'glutes'],
  upper_back: ['back', 'shoulders'],
  chest:      ['chest', 'shoulders', 'triceps'],
  groin:      ['quads', 'hamstrings', 'glutes'],
  foot:       ['quads', 'glutes'],
}

const INJURY_SEVERITY_PENALTY: Record<InjurySeverity, number> = {
  severe:   -200,
  moderate: -100,
  mild:     -50,
}

interface LastWorkoutInfo {
  split: string
  hoursSince: number
}

/**
 * Score each split based on current training state.
 */
export function scoreSplits(
  muscleStatus: Record<string, MuscleStatus>,
  lastWorkoutInfo: LastWorkoutInfo | null = null,
  experienceLevel: ExperienceLevel = 'intermediate',
  frequency: number = 0,
  recentSplits: string[] = [],
): SplitScore[] {
  const scores: Record<string, number> = {}
  for (const [splitName, muscles] of Object.entries(SPLIT_MUSCLES)) {
    let score = 0
    const primaryMuscles = SPLIT_PRIMARY_MUSCLES[splitName] || muscles

    for (const muscle of muscles) {
      const ms = muscleStatus[muscle]
      if (!ms) continue
      const isPrimary = primaryMuscles.includes(muscle as MuscleGroup)
      const recoveryWeight = isPrimary ? 0.3 : 0.1
      score += ms.recoveryPct * recoveryWeight
      if (isPrimary && ms.recoveryPct >= 75) {
        const deficit = Math.max(0, ms.target.min - ms.setsThisWeek)
        score += deficit * 2
      }
      if (ms.recoveryPct < 50) score -= isPrimary ? 40 : 10
      else if (ms.recoveryPct < 75 && isPrimary) score -= 20
    }

    const normFactor = Math.min(primaryMuscles.length || 1, 5)
    score = score / normFactor

    const fatiguedPrimary = primaryMuscles.filter(m => (muscleStatus[m]?.recoveryPct ?? 100) < 50)
    if (fatiguedPrimary.length > 0) {
      score -= 15 * fatiguedPrimary.length
    }

    const lastSplit = lastWorkoutInfo?.split || null
    if (lastSplit && lastSplit === splitName) {
      score -= 25 // penalty for same split consecutively
    }

    // Weekly split distribution penalty: escalating -15 per occurrence this week
    const thisWeekCount = recentSplits.filter(s => s === splitName).length
    score -= thisWeekCount * 15

    if (splitName === 'Full Body' && lastWorkoutInfo?.split === 'Full Body' && lastWorkoutInfo.hoursSince < 24) {
      score -= 30
    }
    if (splitName === 'Full Body' && experienceLevel === 'advanced') {
      score -= 40
    }

    // Beginners and returning athletes should always prefer Full Body
    // to avoid muscle imbalance from incomplete split coverage
    if (['complete_beginner', 'beginner', 'returning'].includes(experienceLevel) && splitName === 'Full Body') {
      score += 50
    }

    // Frequency-based split bonus (DB-013):
    // At 3x/week, Full Body is optimal (each muscle trained 3x/week, Schoenfeld et al.)
    // At 4x/week, Upper/Lower is natural (each muscle trained 2x/week)
    // At 5-6x/week, PPL is the natural fit
    if (frequency > 0) {
      if (frequency <= 3 && splitName === 'Full Body') {
        score += 30
      }
      if (frequency === 4 && (splitName === 'Upper' || splitName === 'Lower')) {
        score += 20
      }
      if (frequency >= 5 && (splitName === 'Push' || splitName === 'Pull' || splitName === 'Legs')) {
        score += 15
      }
    }

    scores[splitName] = Math.round(score * 10) / 10
  }

  // --- Injury-aware penalty: deprioritize splits targeting injured areas ---
  const activeInjuries = loadInjuries().filter(i => i.status !== 'resolved')
  for (const injury of activeInjuries) {
    const penalizedMuscles = INJURY_MUSCLE_PENALTIES[injury.bodyArea]
    const severityPenalty = INJURY_SEVERITY_PENALTY[injury.severity]

    for (const [splitName, muscles] of Object.entries(SPLIT_MUSCLES)) {
      if (penalizedMuscles.length === 0) {
        // neck: small general penalty to all splits
        scores[splitName] = (scores[splitName] ?? 0) + Math.round(severityPenalty * 0.15)
      } else {
        const overlap = muscles.filter(m => penalizedMuscles.includes(m))
        if (overlap.length > 0) {
          const overlapRatio = overlap.length / muscles.length
          scores[splitName] = (scores[splitName] ?? 0) + Math.round(severityPenalty * overlapRatio)
        }
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const scored = sorted.map(([name, score]) => {
    const muscles = SPLIT_MUSCLES[name as keyof typeof SPLIT_MUSCLES] || []
    const fatigued = muscles.filter(m => muscleStatus[m]?.status === 'fatigued')
    const ready = muscles.filter(m => muscleStatus[m]?.status === 'ready')
    const needsWork = muscles.filter(m => muscleStatus[m]?.status === 'needs_work')

    let reasoning = ''
    if (needsWork.length > 0) reasoning += `${toNL(needsWork)} heeft extra volume nodig. `
    if (ready.length > 0) reasoning += `${toNL(ready)} volledig hersteld. `
    if (fatigued.length > 0) reasoning += `${toNL(fatigued)} nog aan het herstellen — intensiteit verlaagd.`
    if (!reasoning) reasoning = 'Goed uitgebalanceerd op basis van je trainingshistorie.'

    return { name, score, reasoning }
  })

  // If the best score is deeply negative, all muscles are fatigued — suggest rest
  if (scored.length > 0 && scored[0]!.score < -20) {
    scored[0]!.reasoning = (scored[0]!.reasoning || '') + ' Overweeg een rustdag — alle spiergroepen zijn vermoeid.'
  }

  return scored
}

interface RelevantHistoryEntry {
  date: string
  sets: LastSessionSet[]
}

export function getRelevantHistory(workouts: Workout[], splitName: string): RelevantHistoryEntry[] {
  const muscles = SPLIT_MUSCLES[splitName as keyof typeof SPLIT_MUSCLES] || []
  const history: RelevantHistoryEntry[] = []
  for (const w of workouts.slice(0, 15)) {
    const relevantSets = (w.workout_sets || []).filter(s => {
      const m = classifyExercise(s.exercise)
      return m && muscles.includes(m)
    })
    if (relevantSets.length > 0) {
      history.push({
        date: w.created_at,
        sets: relevantSets.map(s => ({
          exercise: s.exercise, weight_kg: s.weight_kg, reps: s.reps, rpe: s.rpe,
        })),
      })
      if (history.length >= 3) break
    }
  }
  return history
}

/**
 * Detect which split a workout belongs to based on its `split` field
 * or by analyzing the exercises performed.
 */
export function detectSplit(workout: Workout): string | null {
  // Prefer the explicit split field if it matches a known split
  if (workout.split && Object.keys(SPLIT_MUSCLES).includes(workout.split)) {
    return workout.split
  }

  // Fallback: classify exercises and find best-matching split
  const muscles = new Set<MuscleGroup>()
  for (const s of (workout.workout_sets || [])) {
    const m = classifyExercise(s.exercise)
    if (m) muscles.add(m)
  }
  if (muscles.size === 0) return null

  let bestSplit: string | null = null
  let bestOverlap = 0
  for (const [splitName, splitMuscles] of Object.entries(SPLIT_MUSCLES)) {
    const overlap = splitMuscles.filter(m => muscles.has(m)).length
    if (overlap > bestOverlap) {
      bestOverlap = overlap
      bestSplit = splitName
    }
  }
  return bestSplit
}

/**
 * Get split names from workouts in the last 7 days for weekly distribution tracking.
 */
export function getRecentSplits(workouts: Workout[]): string[] {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return workouts
    .filter(w => new Date(w.created_at) > oneWeekAgo)
    .map(w => detectSplit(w))
    .filter((s): s is string => s != null)
}

export { SPLIT_MUSCLES }
