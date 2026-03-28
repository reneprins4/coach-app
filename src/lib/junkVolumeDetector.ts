/**
 * Junk Volume Detector
 * Waarschuwt wanneer set-kwaliteit daalt (RPE stijgt of reps dalen bij gelijk gewicht)
 * Dit wijst op training voorbij MRV - "junk volume" dat herstel kost zonder stimulus.
 */

import type { JunkVolumeSet } from '../types'

export interface JunkVolumeDetectionResult {
  type: 'set_quality_degradation' | 'reps_degradation'
  exercise: string
  rpeDrift?: string
  repDropPct?: number
  severity: 'medium' | 'high'
  message: string
  recommendation: string
}

/**
 * Filter out likely warmup sets: sets where weight < 70% of the heaviest
 * set in the sequence. This prevents warmup-to-work RPE increases from
 * triggering false junk volume warnings.
 */
function filterWarmupSets(sets: JunkVolumeSet[]): JunkVolumeSet[] {
  const maxWeight = Math.max(...sets.map(s => s.weight_kg ?? 0))
  if (maxWeight <= 0) return sets
  const threshold = maxWeight * 0.7
  return sets.filter(s => (s.weight_kg ?? 0) >= threshold)
}

/**
 * Detecteer junk volume op basis van set-kwaliteit degradatie
 */
export function detectJunkVolume(exerciseName: string, allSetsThisExercise: JunkVolumeSet[]): JunkVolumeDetectionResult | null {
  // Minimaal 3 sets nodig voor trend detectie
  if (!allSetsThisExercise || allSetsThisExercise.length < 3) return null

  // Skip time-based exercises — junk volume is a rep/weight concept
  const repSets = allSetsThisExercise.filter(s => s.reps != null && !s.duration_seconds)
  if (repSets.length < 3) return null

  // Filter out warmup sets before analysis (ALGO-010)
  const workSets = filterWarmupSets(repSets)
  if (workSets.length < 3) return null

  // Check RPE trend: stijgt RPE terwijl gewicht gelijk blijft?
  const setsWithRPE = workSets.filter(s => s.rpe && s.weight_kg)
  if (setsWithRPE.length >= 3) {
    const recent = setsWithRPE.slice(-3)
    const firstRPE = recent[0]!.rpe!
    const lastRPE = recent[recent.length - 1]!.rpe!
    const avgWeight = recent.reduce((s, x) => s + (x.weight_kg ?? 0), 0) / recent.length
    const lastWeight = recent[recent.length - 1]!.weight_kg!

    // RPE gestegen >= 1.5 bij gelijk of lager gewicht = dalende set kwaliteit
    const rpeDrift = lastRPE - firstRPE
    const weightDropped = lastWeight <= avgWeight

    if (rpeDrift >= 1.5 && weightDropped) {
      const severity: 'high' | 'medium' = rpeDrift >= 2.5 ? 'high' : 'medium'
      return {
        type: 'set_quality_degradation',
        exercise: exerciseName,
        rpeDrift: rpeDrift.toFixed(1),
        severity,
        message: severity === 'high'
          ? `RPE stijgt sterk (+${rpeDrift.toFixed(1)}) bij gelijk gewicht. Stop of verlaag gewicht.`
          : `Set kwaliteit daalt (+${rpeDrift.toFixed(1)} RPE). Overweeg dit de laatste set te maken.`,
        recommendation: severity === 'high'
          ? 'Stop met deze oefening. Resterende sets zijn junk volume.'
          : 'Nog 1 set maximaal. Kwaliteit gaat voor kwantiteit.'
      }
    }
  }

  // Check reps trend: dalen reps significant bij zelfde gewicht?
  const setsWithReps = workSets.filter(s => s.reps && s.weight_kg)
  if (setsWithReps.length >= 3) {
    const recentReps = setsWithReps.slice(-3)
    const firstReps = recentReps[0]!.reps!
    const lastReps = recentReps[recentReps.length - 1]!.reps!
    const firstWeight = recentReps[0]!.weight_kg!
    const lastWeight = recentReps[recentReps.length - 1]!.weight_kg!

    // Reps dalen >= 25% bij gelijk of hoger gewicht
    if (firstReps > 0) {
      const repDrop = (firstReps - lastReps) / firstReps
      const weightSameOrHigher = lastWeight >= firstWeight * 0.95

      if (repDrop >= 0.25 && weightSameOrHigher) {
        const severity: 'high' | 'medium' = repDrop >= 0.35 ? 'high' : 'medium'
        return {
          type: 'reps_degradation',
          exercise: exerciseName,
          repDropPct: Math.round(repDrop * 100),
          severity,
          message: `Reps dalen significant (-${Math.round(repDrop * 100)}%) bij zelfde gewicht.`,
          recommendation: severity === 'high'
            ? 'Stop met deze oefening. Je hebt voldoende stimulus gegeven.'
            : 'Verlaag gewicht of maak dit de laatste set.'
        }
      }
    }
  }

  return null
}
