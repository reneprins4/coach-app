// Superset Architect - Intelligente antagonist superset matching
// Bouwt workouts om naar supersets voor ~30% tijdwinst

import type { SupersetExerciseInput, SupersetGroupResult, TimeSavings } from '../types'

// Antagonist muscle pairs voor superset matching
const ANTAGONIST_PAIRS: [string, string][] = [
  ['chest', 'back'],
  ['biceps', 'triceps'],
  ['quads', 'hamstrings'],
  ['shoulders', 'back'],
  ['core', 'back'],
  ['front_delts', 'rear_delts'],
  ['quadriceps', 'hamstrings'],
]

// Map muscle_group naar normalized naam voor matching
function normalizeMuscle(muscle: string | undefined): string | null {
  if (!muscle) return null
  const m = muscle.toLowerCase()
  if (m.includes('bicep')) return 'biceps'
  if (m.includes('tricep')) return 'triceps'
  if (m.includes('quad') || m === 'legs') return 'quads'
  if (m.includes('hamstring')) return 'hamstrings'
  if (m.includes('glute')) return 'glutes'
  if (m.includes('chest') || m.includes('borst')) return 'chest'
  if (m.includes('back') || m.includes('rug') || m === 'lats') return 'back'
  if (m.includes('shoulder') || m.includes('schouder') || m.includes('delt')) return 'shoulders'
  if (m.includes('core') || m.includes('abs') || m.includes('buik')) return 'core'
  return m
}

// Check of twee spiergroepen antagonisten zijn
function areAntagonists(muscleA: string | undefined, muscleB: string | undefined): boolean {
  const normA = normalizeMuscle(muscleA)
  const normB = normalizeMuscle(muscleB)
  if (!normA || !normB) return false

  for (const [a, b] of ANTAGONIST_PAIRS) {
    if ((normA === a && normB === b) || (normA === b && normB === a)) {
      return true
    }
  }
  return false
}

// Get primary muscle van een exercise
function getPrimaryMuscle(exercise: SupersetExerciseInput): string | undefined {
  if (exercise.primary_muscles && exercise.primary_muscles.length > 0) {
    return exercise.primary_muscles[0]
  }
  return exercise.muscle_group
}

/**
 * Bouw supersets van een lijst oefeningen
 */
export function buildSupersets(exercises: SupersetExerciseInput[]): SupersetGroupResult[] {
  if (!exercises || exercises.length === 0) return []

  const result: SupersetGroupResult[] = []
  const unpaired = [...exercises]
  const pairedIndices = new Set<number>()

  // Eerste pass: zoek antagonist pairs
  for (let i = 0; i < unpaired.length; i++) {
    if (pairedIndices.has(i)) continue

    const exA = unpaired[i]!
    const muscleA = getPrimaryMuscle(exA)

    for (let j = i + 1; j < unpaired.length; j++) {
      if (pairedIndices.has(j)) continue

      const exB = unpaired[j]!
      const muscleB = getPrimaryMuscle(exB)

      if (areAntagonists(muscleA, muscleB)) {
        result.push({
          type: 'superset',
          exercises: [exA, exB],
          restBetween: 0,
          restAfter: 90,
          pairReason: `${normalizeMuscle(muscleA)} + ${normalizeMuscle(muscleB)}`,
        })
        pairedIndices.add(i)
        pairedIndices.add(j)
        break
      }
    }
  }

  // Resterende oefeningen als singles
  for (let i = 0; i < unpaired.length; i++) {
    if (pairedIndices.has(i)) continue
    result.push({
      type: 'single',
      exercises: [unpaired[i]!],
      restBetween: 0,
      restAfter: 120,
    })
  }

  return result
}

/**
 * Schat de workout tijd in minuten
 */
export function estimateWorkoutTime(supersets: SupersetGroupResult[]): number {
  if (!supersets || supersets.length === 0) return 0

  let totalSeconds = 0
  const setTime = 45

  for (const group of supersets) {
    const setSizes = group.exercises.map(e => e.plan?.sets || e.sets || 3)
    const totalSets = setSizes.reduce((sum, s) => sum + s, 0)

    if (group.type === 'superset') {
      const rounds = Math.max(...setSizes)
      totalSeconds += totalSets * setTime + rounds * group.restAfter
    } else {
      totalSeconds += totalSets * setTime + totalSets * group.restAfter
    }
  }

  return Math.round(totalSeconds / 60)
}

/**
 * Schat de normale workout tijd (zonder supersets)
 */
export function estimateNormalTime(exercises: SupersetExerciseInput[]): number {
  if (!exercises || exercises.length === 0) return 0

  let totalSeconds = 0
  const setTime = 45
  const restTime = 120

  for (const ex of exercises) {
    const sets = ex.plan?.sets || ex.sets || 3
    totalSeconds += sets * setTime + sets * restTime
  }

  return Math.round(totalSeconds / 60)
}

/**
 * Bereken de tijdwinst door supersets
 */
export function calculateTimeSavings(exercises: SupersetExerciseInput[]): TimeSavings {
  const supersets = buildSupersets(exercises)
  const normalMinutes = estimateNormalTime(exercises)
  const supersetMinutes = estimateWorkoutTime(supersets)
  const savedMinutes = normalMinutes - supersetMinutes
  const savedPercent = normalMinutes > 0 ? Math.round((savedMinutes / normalMinutes) * 100) : 0

  return {
    normalMinutes,
    supersetMinutes,
    savedMinutes,
    savedPercent,
    supersets,
    hasSupersets: supersets.some(g => g.type === 'superset'),
  }
}

/**
 * Genereer een tekstueel superset plan
 */
export function formatSupersetPlan(supersets: SupersetGroupResult[]): string {
  const lines: string[] = []
  let groupNum = 1

  for (const group of supersets) {
    if (group.type === 'superset') {
      const a = group.exercises[0]!
      const b = group.exercises[1]!
      const setsA = a.plan?.sets || a.sets || 3
      const setsB = b.plan?.sets || b.sets || 3

      lines.push(`SUPERSET ${groupNum}:`)
      lines.push(`  A: ${a.name} (${setsA} sets)`)
      lines.push(`  B: ${b.name} (${setsB} sets)`)
      lines.push(`  Rust: ${group.restAfter} sec na elke ronde`)
      lines.push('')
      groupNum++
    } else {
      const ex = group.exercises[0]!
      const sets = ex.plan?.sets || ex.sets || 3
      lines.push(`${ex.name}: ${sets} sets (${group.restAfter} sec rust)`)
      lines.push('')
    }
  }

  return lines.join('\n')
}
