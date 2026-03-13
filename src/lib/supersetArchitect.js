// Superset Architect - Intelligente antagonist superset matching
// Bouwt workouts om naar supersets voor ~30% tijdwinst

// Antagonist muscle pairs voor superset matching
// Gebaseerd op tegengestelde spiergroepen die goed samen trainen
const ANTAGONIST_PAIRS = [
  ['chest', 'back'],
  ['biceps', 'triceps'],
  ['quads', 'hamstrings'],
  ['shoulders', 'back'],
  ['core', 'back'],
  // Extra voor primary_muscles matching
  ['front_delts', 'rear_delts'],
  ['quadriceps', 'hamstrings'],
]

// Map muscle_group naar normalized naam voor matching
function normalizeMuscle(muscle) {
  if (!muscle) return null
  const m = muscle.toLowerCase()
  // Map arms subdivisions
  if (m.includes('bicep')) return 'biceps'
  if (m.includes('tricep')) return 'triceps'
  // Map legs subdivisions
  if (m.includes('quad') || m === 'legs') return 'quads'
  if (m.includes('hamstring')) return 'hamstrings'
  if (m.includes('glute')) return 'glutes'
  // Map torso
  if (m.includes('chest') || m.includes('borst')) return 'chest'
  if (m.includes('back') || m.includes('rug') || m === 'lats') return 'back'
  if (m.includes('shoulder') || m.includes('schouder') || m.includes('delt')) return 'shoulders'
  if (m.includes('core') || m.includes('abs') || m.includes('buik')) return 'core'
  return m
}

// Check of twee spiergroepen antagonisten zijn
function areAntagonists(muscleA, muscleB) {
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
function getPrimaryMuscle(exercise) {
  // Probeer eerst primary_muscles array
  if (exercise.primary_muscles?.length > 0) {
    return exercise.primary_muscles[0]
  }
  // Fallback naar muscle_group
  return exercise.muscle_group
}

/**
 * Bouw supersets van een lijst oefeningen
 * @param {Array} exercises - Array van { name, muscle_group, primary_muscles?, sets?, plan? }
 * @returns {Array} - Array van superset groups
 */
export function buildSupersets(exercises) {
  if (!exercises || exercises.length === 0) return []
  
  const result = []
  const unpaired = [...exercises]
  const pairedIndices = new Set()
  
  // Eerste pass: zoek antagonist pairs
  for (let i = 0; i < unpaired.length; i++) {
    if (pairedIndices.has(i)) continue
    
    const exA = unpaired[i]
    const muscleA = getPrimaryMuscle(exA)
    
    // Zoek een antagonist partner
    for (let j = i + 1; j < unpaired.length; j++) {
      if (pairedIndices.has(j)) continue
      
      const exB = unpaired[j]
      const muscleB = getPrimaryMuscle(exB)
      
      if (areAntagonists(muscleA, muscleB)) {
        result.push({
          type: 'superset',
          exercises: [exA, exB],
          restBetween: 0, // Geen rust tussen A en B
          restAfter: 90,  // 90 sec na de superset
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
      exercises: [unpaired[i]],
      restBetween: 0,
      restAfter: 120,
    })
  }
  
  return result
}

/**
 * Schat de workout tijd in minuten
 * @param {Array} supersets - Output van buildSupersets
 * @returns {number} - Geschatte minuten
 */
export function estimateWorkoutTime(supersets) {
  if (!supersets || supersets.length === 0) return 0
  
  let totalSeconds = 0
  const setTime = 45 // seconden per set gemiddeld
  
  for (const group of supersets) {
    const totalSets = group.exercises.reduce((sum, e) => {
      // Check plan voor geplande sets, anders default 3
      const sets = e.plan?.sets || e.sets || 3
      return sum + sets
    }, 0)
    
    if (group.type === 'superset') {
      // Superset: set A + set B + korte rust, herhaal
      const setsPerRound = 2
      const rounds = Math.ceil(totalSets / setsPerRound)
      totalSeconds += totalSets * setTime + rounds * group.restAfter
    } else {
      // Single: set + rust, herhaal
      totalSeconds += totalSets * setTime + totalSets * group.restAfter
    }
  }
  
  return Math.round(totalSeconds / 60)
}

/**
 * Schat de normale workout tijd (zonder supersets)
 * @param {Array} exercises - Originele oefeningen array
 * @returns {number} - Geschatte minuten
 */
export function estimateNormalTime(exercises) {
  if (!exercises || exercises.length === 0) return 0
  
  let totalSeconds = 0
  const setTime = 45
  const restTime = 120 // 2 min rust per set bij normale workout
  
  for (const ex of exercises) {
    const sets = ex.plan?.sets || ex.sets || 3
    totalSeconds += sets * setTime + sets * restTime
  }
  
  return Math.round(totalSeconds / 60)
}

/**
 * Bereken de tijdwinst door supersets
 * @param {Array} exercises - Originele oefeningen
 * @returns {Object} - { normalMinutes, supersetMinutes, savedMinutes, savedPercent }
 */
export function calculateTimeSavings(exercises) {
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
 * @param {Array} supersets - Output van buildSupersets
 * @returns {string} - Leesbaar plan
 */
export function formatSupersetPlan(supersets) {
  const lines = []
  let groupNum = 1
  
  for (const group of supersets) {
    if (group.type === 'superset') {
      const [a, b] = group.exercises
      const setsA = a.plan?.sets || a.sets || 3
      const setsB = b.plan?.sets || b.sets || 3
      
      lines.push(`SUPERSET ${groupNum}:`)
      lines.push(`  A: ${a.name} (${setsA} sets)`)
      lines.push(`  B: ${b.name} (${setsB} sets)`)
      lines.push(`  Rust: ${group.restAfter} sec na elke ronde`)
      lines.push('')
      groupNum++
    } else {
      const ex = group.exercises[0]
      const sets = ex.plan?.sets || ex.sets || 3
      lines.push(`${ex.name}: ${sets} sets (${group.restAfter} sec rust)`)
      lines.push('')
    }
  }
  
  return lines.join('\n')
}
