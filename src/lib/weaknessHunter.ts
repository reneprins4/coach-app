// Weakness Hunter - Spiergroep balans analyse

import type {
  Workout, DetailedMuscleGroup, SimpleMuscleGroup,
  AntagonistPair, MuscleImbalance, SortedMuscleGroup, WeaknessAnalysis,
} from '../types'

// Uitgebreide spiergroep mapping voor balans analyse
const DETAILED_GROUPS: Record<DetailedMuscleGroup, string> = {
  chest: 'Borst',
  back: 'Rug',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Bilspieren',
  calves: 'Kuiten',
  shoulders_front: 'Schouders voor',
  shoulders_rear: 'Schouders achter',
  shoulders_side: 'Schouders zij',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core'
}

// Antagonist paren met ideale ratio's
const ANTAGONIST_PAIRS: AntagonistPair[] = [
  { agonist: 'chest', antagonist: 'back', ideal: 0.8,
    advice: 'Voeg meer rowing en pull-up variaties toe.' },
  { agonist: 'quadriceps', antagonist: 'hamstrings', ideal: 0.75,
    advice: 'Voeg Romanian deadlifts of leg curls toe.' },
  { agonist: 'biceps', antagonist: 'triceps', ideal: 1.0,
    advice: 'Balanceer met tricep dips of pushdowns.' },
  { agonist: 'shoulders_front', antagonist: 'shoulders_rear', ideal: 0.5,
    advice: 'Voeg face pulls of reverse flyes toe.' }
]

// Gedetailleerde exercise mapping
function getDetailedMuscleGroup(name: string): DetailedMuscleGroup | null {
  const l = name.toLowerCase()

  // Tricep/assisted/bare dip → triceps (must precede chest pattern)
  if (/tricep.*dip|assisted.*dip|^dip$/i.test(l)) return 'triceps'
  // Chest dip stays chest
  if (/chest.*dip/.test(l)) return 'chest'

  if (/bench|chest|fly|push.?up|pec/.test(l)) return 'chest'

  // Leg-specific patterns must precede generic shoulder/press patterns
  if (/hamstring|leg.?curl|romanian|rdl|stiff.?leg|nordic/.test(l)) return 'hamstrings'
  if (/glute|hip.?thrust|bridge/.test(l)) return 'glutes'
  if (/squat|leg.?press|leg.?extension|lunge|hack/.test(l)) return 'quadriceps'
  if (/calf/.test(l)) return 'calves'

  if (/front.?raise/.test(l)) return 'shoulders_front'
  if (/face.?pull|rear.?delt|reverse.?fly/.test(l)) return 'shoulders_rear'
  if (/lateral.?raise|side.?raise|upright/.test(l)) return 'shoulders_side'
  if (/shoulder|delt|shrug|arnold/.test(l)) return 'shoulders_front'
  if (/overhead|military|(?:press)(?!.*bench)(?!.*leg)(?!.*chest)(?!.*incline)(?!.*decline)/.test(l)) return 'shoulders_front'

  if (/dead|row|pull|lat|back/.test(l)) return 'back'

  if (/curl|bicep|hammer/.test(l)) return 'biceps'
  if (/tricep|skull|pushdown|extension(?!.*leg)/.test(l)) return 'triceps'

  if (/plank|ab|crunch|core|sit.?up/.test(l)) return 'core'

  if (/leg/.test(l)) return 'quadriceps'
  return null
}

function getSimpleMuscleGroup(name: string): SimpleMuscleGroup | null {
  const detailed = getDetailedMuscleGroup(name)
  if (!detailed) return null
  if (['quadriceps', 'hamstrings', 'glutes', 'calves'].includes(detailed)) return 'legs'
  if (['shoulders_front', 'shoulders_rear', 'shoulders_side'].includes(detailed)) return 'shoulders'
  if (['biceps', 'triceps'].includes(detailed)) return 'arms'
  return detailed as SimpleMuscleGroup
}

export function analyzeWeaknesses(workouts: Workout[], weeksBack: number = 4): WeaknessAnalysis {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)

  const recent = workouts.filter(w => new Date(w.created_at) >= cutoff)

  const volumeMap: Record<string, number> = {}
  const simpleVolumeMap: Record<string, number> = {}

  for (const workout of recent) {
    for (const set of workout.workout_sets || []) {
      const detailed = getDetailedMuscleGroup(set.exercise)
      const simple = getSimpleMuscleGroup(set.exercise)

      if (detailed) {
        volumeMap[detailed] = (volumeMap[detailed] || 0) + 1
      }
      if (simple) {
        simpleVolumeMap[simple] = (simpleVolumeMap[simple] || 0) + 1
      }
    }
  }

  // Detecteer antagonist imbalances
  const imbalances: MuscleImbalance[] = []

  for (const pair of ANTAGONIST_PAIRS) {
    const a = volumeMap[pair.agonist] || 0
    const b = volumeMap[pair.antagonist] || 0

    if (a === 0 && b === 0) continue

    const ratio = a > 0 ? b / a : 0
    const threshold = pair.ideal * 0.7

    if (ratio < threshold) {
      const deficit = a > 0 ? Math.round((1 - ratio / pair.ideal) * 100) : 100
      imbalances.push({
        dominant: pair.agonist,
        dominantNL: DETAILED_GROUPS[pair.agonist],
        weak: pair.antagonist,
        weakNL: DETAILED_GROUPS[pair.antagonist],
        dominantSets: a,
        weakSets: b,
        ratio: ratio,
        idealRatio: pair.ideal,
        deficit: deficit,
        severity: ratio < pair.ideal * 0.5 ? 'high' : 'medium',
        advice: pair.advice
      })
    }
  }

  imbalances.sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1
    if (b.severity === 'high' && a.severity !== 'high') return 1
    return b.deficit - a.deficit
  })

  const totalSets = Object.values(volumeMap).reduce((a, b) => a + b, 0)

  const simpleGroupNames: Record<string, string> = {
    chest: 'Borst', back: 'Rug', legs: 'Benen',
    shoulders: 'Schouders', arms: 'Armen', core: 'Core'
  }

  const sortedGroups: SortedMuscleGroup[] = Object.entries(simpleVolumeMap)
    .map(([key, sets]) => ({
      key,
      name: simpleGroupNames[key] || key,
      sets,
      percentage: totalSets > 0 ? Math.round((sets / totalSets) * 100) : 0
    }))
    .sort((a, b) => b.sets - a.sets)

  return {
    volumeMap,
    simpleVolumeMap,
    sortedGroups,
    imbalances,
    weeksBack,
    totalSets,
    workoutCount: recent.length,
    hasEnoughData: recent.length >= 2
  }
}

export { DETAILED_GROUPS, getDetailedMuscleGroup, getSimpleMuscleGroup }
