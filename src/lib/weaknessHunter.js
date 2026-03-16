// Weakness Hunter - Spiergroep balans analyse

// Uitgebreide spiergroep mapping voor balans analyse
const DETAILED_GROUPS = {
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
const ANTAGONIST_PAIRS = [
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
function getDetailedMuscleGroup(name) {
  const l = name.toLowerCase()
  
  // Borst (bench press VOOR back check — anders matcht "bench" ook /back/ niet maar /lat/ kan conflicteren)
  if (/bench|chest|fly|dip|push.?up|pec/.test(l)) return 'chest'

  // Schouders — VOOR back check: "shoulder press" en "overhead press" moeten hier landen
  if (/front.?raise/.test(l)) return 'shoulders_front'
  if (/face.?pull|rear.?delt|reverse.?fly/.test(l)) return 'shoulders_rear'
  if (/lateral.?raise|side.?raise|upright/.test(l)) return 'shoulders_side'
  if (/shoulder|delt|shrug/.test(l)) return 'shoulders_front'
  // Overhead/military press (geen bench, geen leg)
  if (/overhead|military|(?:press)(?!.*bench)(?!.*leg)(?!.*chest)(?!.*incline)(?!.*decline)/.test(l)) return 'shoulders_front'

  // Hamstrings — VOOR back check: "romanian deadlift", "stiff leg deadlift" hebben "dead" in naam
  if (/hamstring|leg.?curl|romanian|rdl|stiff.?leg|nordic/.test(l)) return 'hamstrings'

  // Glutes — VOOR back check: "hip thrust" kan conflicteren met /back/
  if (/glute|hip.?thrust|bridge/.test(l)) return 'glutes'
  
  // Rug
  if (/dead|row|pull|lat|back/.test(l)) return 'back'
  
  // Benen - gedetailleerd
  if (/squat|leg.?press|lunge|extension|hack/.test(l)) return 'quadriceps'
  if (/calf/.test(l)) return 'calves'
  
  // Armen
  if (/curl|bicep|hammer/.test(l)) return 'biceps'
  if (/tricep|skull|pushdown|extension(?!.*leg)/.test(l)) return 'triceps'
  
  // Core
  if (/plank|ab|crunch|core|sit.?up/.test(l)) return 'core'
  
  // Fallback naar simpele categorisatie
  if (/leg/.test(l)) return 'quadriceps'
  return 'chest'
}

// Simpele spiergroep voor overzicht (compatible met bestaande)
function getSimpleMuscleGroup(name) {
  const detailed = getDetailedMuscleGroup(name)
  if (['quadriceps', 'hamstrings', 'glutes', 'calves'].includes(detailed)) return 'legs'
  if (['shoulders_front', 'shoulders_rear', 'shoulders_side'].includes(detailed)) return 'shoulders'
  if (['biceps', 'triceps'].includes(detailed)) return 'arms'
  return detailed
}

export function analyzeWeaknesses(workouts, weeksBack = 4) {
  // Filter workouts van afgelopen N weken
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - weeksBack * 7)
  
  const recent = workouts.filter(w => new Date(w.created_at) >= cutoff)
  
  // Tel sets per gedetailleerde spiergroep
  const volumeMap = {}
  const simpleVolumeMap = {}
  
  for (const workout of recent) {
    for (const set of workout.workout_sets || []) {
      const detailed = getDetailedMuscleGroup(set.exercise)
      const simple = getSimpleMuscleGroup(set.exercise)
      
      volumeMap[detailed] = (volumeMap[detailed] || 0) + 1
      simpleVolumeMap[simple] = (simpleVolumeMap[simple] || 0) + 1
    }
  }
  
  // Detecteer antagonist imbalances
  const imbalances = []
  
  for (const pair of ANTAGONIST_PAIRS) {
    const a = volumeMap[pair.agonist] || 0
    const b = volumeMap[pair.antagonist] || 0
    
    if (a === 0 && b === 0) continue
    
    const ratio = a > 0 ? b / a : 0
    const threshold = pair.ideal * 0.7 // 30% onder ideaal is probleem
    
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
  
  // Sorteer imbalances op severity
  imbalances.sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1
    if (b.severity === 'high' && a.severity !== 'high') return 1
    return b.deficit - a.deficit
  })
  
  // Bereken totalen
  const totalSets = Object.values(volumeMap).reduce((a, b) => a + b, 0)
  
  // Sorteer spiergroepen op volume (voor bar chart)
  const sortedGroups = Object.entries(simpleVolumeMap)
    .map(([key, sets]) => ({
      key,
      name: { chest: 'Borst', back: 'Rug', legs: 'Benen', shoulders: 'Schouders', arms: 'Armen', core: 'Core' }[key] || key,
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
