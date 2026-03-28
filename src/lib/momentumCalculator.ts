/**
 * Session Momentum Calculator
 * Berekent real-time performance trend binnen een training sessie
 * Score 0-100: hoger = meer in de zone
 */

import type { MomentumResult, MomentumSignal, MomentumStatus } from '../types'

interface MomentumSet {
  created_at: string
  weight_kg?: number | null
  reps?: number | null
  rpe?: number | null
  duration_seconds?: number | null
  exercise?: string
}

interface MomentumExercise {
  name: string
  sets?: MomentumSet[]
}

interface MomentumWorkout {
  exercises?: MomentumExercise[]
}

interface MomentumOptions {
  isDeload?: boolean
}

export function calculateMomentum(workout: MomentumWorkout, options?: MomentumOptions): MomentumResult | null {
  if (!workout?.exercises) return null

  // Verzamel alle sets van alle oefeningen in tijdsvolgorde
  const allSets: MomentumSet[] = workout.exercises.flatMap(e =>
    (e.sets || []).map(s => ({ ...s, exercise: e.name }))
  ).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const validSets = allSets.filter(s => (s.reps && s.weight_kg) || s.rpe || s.duration_seconds)
  if (validSets.length < 3) return null

  const recentSets = validSets.slice(-5) // laatste 5 sets

  let score = 50
  const signals: MomentumSignal[] = []

  // Signal 1: e1RM trend (stijgend = goed)
  const setsWithE1rm = recentSets.filter(s => s.weight_kg && s.reps)
  if (setsWithE1rm.length >= 3) {
    const e1rms = setsWithE1rm.map(s =>
      s.reps === 1 ? s.weight_kg! : s.weight_kg! * (1 + s.reps! / 30)
    )
    const trend = e1rms[e1rms.length - 1]! - e1rms[0]!
    const trendPct = e1rms[0]! > 0 ? (trend / e1rms[0]!) * 100 : 0

    if (trendPct > 2) { score += 20; signals.push('e1rm_rising') }
    else if (trendPct < -5) { score -= 20; signals.push('e1rm_dropping') }
  }

  // Signal 2: RPE trend (dalend = goed, stijgend = vermoeidheid)
  const setsWithRPE = recentSets.filter(s => s.rpe)
  if (setsWithRPE.length >= 3) {
    const rpes = setsWithRPE.map(s => s.rpe!)
    const rpeTrend = rpes[rpes.length - 1]! - rpes[0]!

    if (rpeTrend <= -1) { score += 15; signals.push('rpe_improving') }
    else if (rpeTrend >= 2) { score -= 25; signals.push('rpe_degrading') }
  }

  // Signal 3: Reps consistency
  const setsWithReps = recentSets.filter(s => s.reps)
  if (setsWithReps.length >= 3) {
    const reps = setsWithReps.map(s => s.reps!)
    const maxReps = Math.max(...reps)
    const lastReps = reps[reps.length - 1]!

    if (lastReps >= maxReps) { score += 10; signals.push('reps_peak') }
    else if (maxReps > 0 && lastReps < maxReps * 0.7) { score -= 15; signals.push('reps_dropping') }
  }

  // Signal 4: Duration trend (for time-based exercises)
  const setsWithDuration = recentSets.filter(s => s.duration_seconds)
  if (setsWithDuration.length >= 3) {
    const durations = setsWithDuration.map(s => s.duration_seconds!)
    const trend = durations[durations.length - 1]! - durations[0]!
    const trendPct = durations[0]! > 0 ? (trend / durations[0]!) * 100 : 0

    if (trendPct > 5) { score += 15; signals.push('duration_rising') }
    else if (trendPct < -10) { score -= 15; signals.push('duration_dropping') }
  }

  score = Math.max(0, Math.min(100, score))

  // During deload weeks, suppress negative signals and override status
  if (options?.isDeload) {
    const filteredSignals = signals.filter(
      s => s !== 'e1rm_dropping' && s !== 'rpe_degrading' && s !== 'reps_dropping' && s !== 'duration_dropping'
    )
    return {
      score: Math.max(score, 50), // floor at 50 during deload
      status: 'deload' as MomentumStatus,
      message: 'Deload week — herstel heeft prioriteit. Lagere intensiteit is het doel.',
      signals: filteredSignals,
      showPRHint: false,
      totalSets: validSets.length,
    }
  }

  let status: MomentumStatus
  let message: string
  let showPRHint: boolean
  if (score >= 75) {
    status = 'peak'
    message = 'Je zit in je beste zone. Ideaal moment voor een zware set.'
    showPRHint = true
  } else if (score >= 50) {
    status = 'good'
    message = 'Goede sessie. Blijf op huidig niveau.'
    showPRHint = false
  } else if (score >= 30) {
    status = 'declining'
    message = 'Performance daalt licht. Overweeg volume af te bouwen.'
    showPRHint = false
  } else {
    status = 'fatigue'
    message = 'Vermoeidheid gedetecteerd. Afronden of gewicht verlagen.'
    showPRHint = false
  }

  return { score, status, message, signals, showPRHint, totalSets: validSets.length }
}
