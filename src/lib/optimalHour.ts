/**
 * Optimal Hour Data Engine
 *
 * Analyzes when a user performs best based on their workout history.
 * Groups workouts into 2-hour time slots and scores each slot by
 * volume (60%) and RPE efficiency (40%).
 */

import type {
  Workout,
  TimeSlotLabel,
  TimeSlotPerformance,
  OptimalHourResult,
  OptimalHourConfidence,
} from '../types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const TIME_SLOTS: { slot: TimeSlotLabel; hourStart: number; hourEnd: number }[] = [
  { slot: '06-08', hourStart: 6, hourEnd: 8 },
  { slot: '08-10', hourStart: 8, hourEnd: 10 },
  { slot: '10-12', hourStart: 10, hourEnd: 12 },
  { slot: '12-14', hourStart: 12, hourEnd: 14 },
  { slot: '14-16', hourStart: 14, hourEnd: 16 },
  { slot: '16-18', hourStart: 16, hourEnd: 18 },
  { slot: '18-20', hourStart: 18, hourEnd: 20 },
  { slot: '20-22', hourStart: 20, hourEnd: 22 },
]

export const MIN_TOTAL_WORKOUTS = 20
export const MIN_WORKOUTS_PER_SLOT = 3

// ---------------------------------------------------------------------------
// Time slot mapping
// ---------------------------------------------------------------------------

/** Map a date to its 2-hour time slot label. Hours outside 6-22 are clamped. */
export function getTimeSlot(date: Date): TimeSlotLabel {
  let hour = date.getHours()

  // Clamp to supported range
  if (hour < 6) hour = 6
  if (hour >= 22) hour = 20

  // Find the slot where hour falls into [hourStart, hourEnd)
  for (const s of TIME_SLOTS) {
    if (hour >= s.hourStart && hour < s.hourEnd) {
      return s.slot
    }
  }

  // Fallback (should not happen with clamping)
  return '20-22'
}

// ---------------------------------------------------------------------------
// Workout scoring
// ---------------------------------------------------------------------------

/** Compute volume and average RPE for a single workout. */
export function computeWorkoutScore(workout: Workout): { volume: number; avgRpe: number | null } {
  const sets = workout.workout_sets || []

  let volume = 0
  let rpeSum = 0
  let rpeCount = 0

  for (const s of sets) {
    const w = s.weight_kg ?? 0
    const r = s.reps ?? 0
    volume += w * r

    if (s.rpe != null && s.rpe > 0) {
      rpeSum += s.rpe
      rpeCount++
    }
  }

  return {
    volume,
    avgRpe: rpeCount > 0 ? rpeSum / rpeCount : null,
  }
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

function computeConfidence(totalWorkouts: number): OptimalHourConfidence {
  if (totalWorkouts < MIN_TOTAL_WORKOUTS) return 'none'
  if (totalWorkouts < 40) return 'low'
  if (totalWorkouts < 60) return 'medium'
  return 'high'
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------

/** Analyze workout history to determine optimal training time slots. */
export function analyzeOptimalHour(workouts: Workout[]): OptimalHourResult {
  const empty: OptimalHourResult = {
    hasEnoughData: false,
    totalWorkouts: 0,
    slotsAnalyzed: 0,
    bestSlot: null,
    worstSlot: null,
    allSlots: [],
    percentageDifference: 0,
    confidence: 'none',
  }

  if (!workouts || workouts.length === 0) return empty

  const totalWorkouts = workouts.length
  const hasEnoughData = totalWorkouts >= MIN_TOTAL_WORKOUTS

  if (!hasEnoughData) {
    return { ...empty, totalWorkouts, hasEnoughData: false }
  }

  // Group workouts by slot
  const slotData = new Map<TimeSlotLabel, { volumes: number[]; rpes: number[] }>()

  for (const w of workouts) {
    const slot = getTimeSlot(new Date(w.created_at))
    const score = computeWorkoutScore(w)

    if (!slotData.has(slot)) {
      slotData.set(slot, { volumes: [], rpes: [] })
    }
    const data = slotData.get(slot)!
    data.volumes.push(score.volume)
    if (score.avgRpe !== null) {
      data.rpes.push(score.avgRpe)
    }
  }

  // Compute global averages for normalization
  let globalVolumeSum = 0
  let globalVolumeCount = 0
  let globalRpeSum = 0
  let globalRpeCount = 0

  for (const data of slotData.values()) {
    for (const v of data.volumes) {
      globalVolumeSum += v
      globalVolumeCount++
    }
    for (const r of data.rpes) {
      globalRpeSum += r
      globalRpeCount++
    }
  }

  const globalAvgVolume = globalVolumeCount > 0 ? globalVolumeSum / globalVolumeCount : 0
  const globalAvgRpe = globalRpeCount > 0 ? globalRpeSum / globalRpeCount : 0

  // Build slot performance entries
  const allSlots: TimeSlotPerformance[] = []

  for (const def of TIME_SLOTS) {
    const data = slotData.get(def.slot)
    if (!data || data.volumes.length === 0) continue

    const workoutCount = data.volumes.length
    const avgVolume = data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length
    const avgRpe = data.rpes.length > 0
      ? data.rpes.reduce((a, b) => a + b, 0) / data.rpes.length
      : 0

    // Performance score: volume 60% + RPE efficiency 40%
    const normalizedVolume = globalAvgVolume > 0 ? avgVolume / globalAvgVolume : 1
    let rpeBonus = 0
    if (globalAvgRpe > 0 && data.rpes.length > 0) {
      rpeBonus = (globalAvgRpe - avgRpe) / globalAvgRpe
    }

    const hasRpeData = data.rpes.length > 0
    const performanceScore = hasRpeData
      ? normalizedVolume * 0.6 + (1 + rpeBonus) * 0.4
      : normalizedVolume

    allSlots.push({
      slot: def.slot,
      hourStart: def.hourStart,
      hourEnd: def.hourEnd,
      workoutCount,
      avgVolume: Math.round(avgVolume),
      avgRpe: Math.round(avgRpe * 10) / 10,
      performanceScore: Math.round(performanceScore * 1000) / 1000,
      normalizedScore: 0, // computed after all slots
    })
  }

  // Normalize scores 0-100
  if (allSlots.length > 0) {
    const maxScore = Math.max(...allSlots.map(s => s.performanceScore))
    const minScore = Math.min(...allSlots.map(s => s.performanceScore))
    const range = maxScore - minScore

    for (const s of allSlots) {
      s.normalizedScore = range > 0
        ? Math.round(((s.performanceScore - minScore) / range) * 100)
        : 50
    }
  }

  // Filter confident slots (>= MIN_WORKOUTS_PER_SLOT) for best/worst selection
  const confidentSlots = allSlots.filter(s => s.workoutCount >= MIN_WORKOUTS_PER_SLOT)

  let bestSlot: TimeSlotPerformance | null = null
  let worstSlot: TimeSlotPerformance | null = null

  if (confidentSlots.length > 0) {
    bestSlot = confidentSlots.reduce((a, b) =>
      a.performanceScore >= b.performanceScore ? a : b,
    )
    worstSlot = confidentSlots.reduce((a, b) =>
      a.performanceScore <= b.performanceScore ? a : b,
    )
  }

  // Percentage difference: best vs worst
  let percentageDifference = 0
  if (bestSlot && worstSlot && worstSlot.performanceScore > 0) {
    percentageDifference = Math.round(
      ((bestSlot.performanceScore - worstSlot.performanceScore) / worstSlot.performanceScore) * 100,
    )
  }

  return {
    hasEnoughData: true,
    totalWorkouts,
    slotsAnalyzed: allSlots.length,
    bestSlot,
    worstSlot,
    allSlots,
    percentageDifference,
    confidence: computeConfidence(totalWorkouts),
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format a time slot label for display, respecting locale. */
export function formatSlotLabel(slot: TimeSlotLabel, language: string): string {
  const parts = slot.split('-')
  const startHour = parseInt(parts[0] ?? '0', 10)
  const endHour = parseInt(parts[1] ?? '0', 10)

  if (language === 'en') {
    return `${format12h(startHour)} - ${format12h(endHour)}`
  }

  // Default: 24h format (nl, de, etc.)
  return `${pad2(startHour)}:00 - ${pad2(endHour)}:00`
}

function format12h(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  return `${h}:00 ${period}`
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
