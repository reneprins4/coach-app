/**
 * Scientific training analysis engine.
 * Uses evidence-based recovery rates per muscle group.
 */

// Weekly set targets by goal (Israetel MEV/MAV ranges)
export const SET_TARGETS_BY_GOAL = {
  hypertrophy: {
    chest:      { min: 10, max: 20, mev: 8 },
    back:       { min: 14, max: 22, mev: 10 },
    shoulders:  { min: 8,  max: 16, mev: 6 },
    quads:      { min: 12, max: 20, mev: 8 },
    hamstrings: { min: 10, max: 16, mev: 6 },
    glutes:     { min: 10, max: 20, mev: 8 },
    biceps:     { min: 8,  max: 14, mev: 6 },
    triceps:    { min: 8,  max: 14, mev: 6 },
    core:       { min: 6,  max: 12, mev: 4 },
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
// Large/compound-heavy = slower recovery; small/single-joint = faster
export const RECOVERY_HOURS = {
  chest:      72,   // 3 days — moderate compound involvement
  back:       72,   // 3 days — large muscle, many joints
  shoulders:  48,   // 2 days — smaller muscle, recovers faster
  quads:      96,   // 4 days — largest lower body muscle, slowest recovery
  hamstrings: 72,   // 3 days
  glutes:     72,   // 3 days
  biceps:     48,   // 2 days — small single-joint
  triceps:    48,   // 2 days — small single-joint
  core:       24,   // 1 day — high density, fast recovery
}

const SPLIT_MUSCLES = {
  'Push':       ['chest', 'shoulders', 'triceps'],
  'Pull':       ['back', 'biceps'],
  'Legs':       ['quads', 'hamstrings', 'glutes', 'core'],
  'Upper':      ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  'Lower':      ['quads', 'hamstrings', 'glutes', 'core'],
  'Full Body':  ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'],
}

// Primaire (zware) spieren per split — core is altijd secundair (24u herstel)
const SPLIT_PRIMARY_MUSCLES = {
  'Push':       ['chest', 'shoulders', 'triceps'],
  'Pull':       ['back', 'biceps'],
  'Legs':       ['quads', 'hamstrings', 'glutes'],
  'Upper':      ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  'Lower':      ['quads', 'hamstrings', 'glutes'],
  'Full Body':  ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps'],
}

// Map exercise names → muscle groups
const EXERCISE_MUSCLE_MAP = {
  // Hamstrings — MUST come before back (romanian/stiff-leg deadlifts contain "dead" which matches back)
  // Glute Ham Raise contains "glute" but is primarily hamstrings - must come before glutes section
  'glute.*ham':         'hamstrings',
  'romanian':           'hamstrings', 'rdl':          'hamstrings', 'leg.*curl':      'hamstrings',
  'nordic':             'hamstrings', 'good.*morning':'hamstrings', 'stiff.?leg':     'hamstrings',
  'hamstring':          'hamstrings',
  // Glutes — before back (hip thrust can confuse)
  'hip.*thrust':        'glutes', 'glute.*bridge': 'glutes', 'sumo.*deadlift': 'glutes',
  'kickback':           'glutes', 'abductor':   'glutes',
  // Shoulders — before chest: "reverse fly" would match 'fly'→chest if chest comes first
  // Also: "military press" and "front raise" were missing
  // Reverse pec deck MUST come before 'pec' pattern!
  'reverse.*pec':       'shoulders', 'landmine':     'shoulders',
  'overhead.*press':    'shoulders', 'ohp':          'shoulders', 'lateral.*raise': 'shoulders',
  'face.*pull':         'shoulders', 'rear.*delt':   'shoulders', 'arnold':         'shoulders',
  'upright.*row':       'shoulders', 'shoulder.*press': 'shoulders', 'cable.*lateral': 'shoulders',
  'military.*press':    'shoulders', 'front.*raise': 'shoulders', 'reverse.*fly':   'shoulders',
  'side.*raise':        'shoulders', 'delt.*raise':  'shoulders',
  // Chest dip — BEFORE triceps (dip pattern would otherwise match first)
  'chest.*dip':         'chest',
  // Triceps — before chest: "close grip bench press" should be triceps
  'close.*grip.*bench': 'triceps', 'pushdown':      'triceps', 'skull.*crush':    'triceps',
  'overhead.*extension':'triceps',  'tricep':        'triceps', 'dip':             'triceps',
  'cable.*extension':   'triceps', 'jm.*press':     'triceps',
  // Chest - includes bench variations, machine, floor press, specialty presses
  'bench':              'chest',  'press.*chest':  'chest',  'incline.*press':  'chest',
  'cable.*cross':       'chest',  'crossover':     'chest',  'fly(?!.*reverse)':'chest',
  'pec':                'chest',  'push.?up':      'chest',  'cable.*fly':      'chest',
  'floor.*press':       'chest',  'spoto':         'chest',  'board.*press':    'chest',
  'pin.*press':         'chest',  'machine.*press':'chest',  'pullover':        'chest',
  // Back — after hamstrings/glutes (deadlift pattern now simple since special cases handled above)
  'deadlift':           'back',   'row(?!.*upright)': 'back', 'pull.?up':       'back',
  'pullup':             'back',   'chin.?up':      'back',   'pulldown':        'back',
  'lat.*pull':          'back',   'hyperextension':'back',
  // Quads
  'squat':              'quads',  'leg.*press':    'quads',  'hack':            'quads',
  'lunge':              'quads',  'leg.*extension':'quads',  'split.*squat':    'quads',
  'front.*squat':       'quads',  'bulgarian':     'quads',
  // Biceps
  'curl(?!.*leg)':      'biceps', 'hammer':        'biceps', 'preacher':        'biceps',
  'concentration':      'biceps', 'ez.*bar.*curl': 'biceps',
  // Core
  'plank':              'core',   'crunch':        'core',   'ab.*wheel':       'core',
  'leg.*raise':         'core',   'pallof':        'core',   'dead.*bug':       'core',
  'russian.*twist':     'core',   'sit.?up':       'core',
}

// Compound exercises hit multiple muscle groups (primary + secondary)
// This is CRITICAL for powerlifters who do big compound lifts
const COMPOUND_SECONDARY_MUSCLES = {
  // Deadlift patterns → also hit hamstrings and glutes (not just back)
  'deadlift':         ['hamstrings', 'glutes'],
  'trap.*bar':        ['quads', 'hamstrings'],
  // Squat patterns → also hit hamstrings and glutes (not just quads)
  'squat':            ['hamstrings', 'glutes'],
  'leg.*press':       ['hamstrings', 'glutes'],
  'lunge':            ['hamstrings', 'glutes'],
  'split.*squat':     ['hamstrings', 'glutes'],
  'bulgarian':        ['hamstrings', 'glutes'],
  // Bench patterns → also hit triceps and shoulders (not just chest)
  'bench(?!.*close)': ['triceps', 'shoulders'],
  'incline.*press':   ['triceps', 'shoulders'],
  // Row patterns → also hit biceps
  'row(?!.*upright)': ['biceps'],
  'pull.?up':         ['biceps'],
  'chin.?up':         ['biceps'],
  'pulldown':         ['biceps'],
  'lat.*pull':        ['biceps'],
  // Romanian/stiff leg → also hit glutes
  'romanian':         ['glutes'],
  'rdl':              ['glutes'],
  'stiff.?leg':       ['glutes'],
  'good.*morning':    ['glutes'],
  // Hip thrust → also hit hamstrings
  'hip.*thrust':      ['hamstrings'],
  'glute.*bridge':    ['hamstrings'],
  // Overhead press → also hit triceps
  'overhead.*press':  ['triceps'],
  'ohp':              ['triceps'],
  'military.*press':  ['triceps'],
  'shoulder.*press':  ['triceps'],
}

export function classifyExercise(exerciseName) {
  if (!exerciseName) return null
  const lower = exerciseName.toLowerCase()
  for (const [pattern, muscle] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (new RegExp(pattern, 'i').test(lower)) return muscle
  }
  return null
}

/**
 * Get all muscles trained by an exercise (primary + secondary)
 * @returns {Object} { primary: string|null, secondary: string[] }
 */
export function classifyExerciseFull(exerciseName) {
  if (!exerciseName) return { primary: null, secondary: [] }
  const lower = exerciseName.toLowerCase()
  const primary = classifyExercise(exerciseName)
  const secondary = []
  
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
 * Accounts for: time elapsed, avg RPE, number of sets trained
 */
export function calcMuscleRecovery(muscle, hoursSinceTrained, avgRPE, setsCount) {
  // Handle null, undefined, NaN, or invalid hours — treat as never trained = 100%
  if (hoursSinceTrained == null || !Number.isFinite(hoursSinceTrained)) return 100
  // Negative hours shouldn't happen but clamp to 0 just in case
  const safeHours = Math.max(0, hoursSinceTrained)
  const baseHours = RECOVERY_HOURS[muscle] || 72
  // Volume penalty: each set above 6 adds 8% more recovery time needed
  // Handle NaN/Infinity setsCount by defaulting to 0
  const safeSets = Number.isFinite(setsCount) ? setsCount : 0
  const volumeMult = 1 + Math.max(0, (safeSets - 6) * 0.08)
  // Intensity modifier: RPE affects recovery bidirectionally
  // - RPE > 7: slower recovery (more demanding)
  // - RPE < 7: faster recovery (easier session, e.g., deload)
  // Clamp RPE to valid range 1-10, default to 7 if null/undefined/NaN
  const safeRPE = (avgRPE != null && Number.isFinite(avgRPE)) ? avgRPE : 7
  const clampedRPE = Math.max(1, Math.min(10, safeRPE))
  // rpeMult scales from 0.55 (RPE 4) to 1.45 (RPE 10), with 1.0 at RPE 7
  // Floor at 0.5 to prevent unrealistically fast recovery at very low RPE
  const rpeMult = Math.max(0.5, 1 + (clampedRPE - 7) * 0.15)
  const adjustedHours = baseHours * volumeMult * rpeMult
  return Math.min(100, Math.round((safeHours / adjustedHours) * 100))
}

export function recoveryStatus(pct) {
  if (pct >= 90) return 'ready'
  if (pct >= 50) return 'recovering'
  return 'fatigued'
}

/**
 * Analyze recent workout history to determine per-muscle status.
 * @param {Array} workouts - Recent workout history
 * @param {string} goal - Training goal: 'hypertrophy', 'strength', or 'endurance'
 */
export function analyzeTraining(workouts, goal = 'hypertrophy') {
  // Validate goal: must be a known goal, not a prototype method like 'toString' or '__proto__'
  const validGoals = ['hypertrophy', 'strength', 'endurance']
  const safeGoal = validGoals.includes(goal) ? goal : 'hypertrophy'
  const targets = SET_TARGETS_BY_GOAL[safeGoal]
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const muscleStatus = {}
  for (const muscle of Object.keys(targets)) {
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
    // Skip future workouts (invalid data)
    if (workoutDate > now) continue
    
    const daysAgo = (now - workoutDate) / 86400000
    const hoursAgo = (now - workoutDate) / 3600000
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
      
      // Process secondary muscles (50% credit for compound involvement)
      // Critical for powerlifters: Deadlift counts for back + hamstrings + glutes
      for (const secMuscle of secondary) {
        if (muscleStatus[secMuscle]) {
          if (isThisWeek) muscleStatus[secMuscle].setsThisWeek += 0.5
          
          // Also track recovery for secondary muscles
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
  for (const muscle of Object.keys(muscleStatus)) {
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
        }))
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
const MUSCLE_NL = {
  chest: 'Borst', back: 'Rug', shoulders: 'Schouders',
  quads: 'Bovenbenen', hamstrings: 'Hamstrings', glutes: 'Billen',
  biceps: 'Biceps', triceps: 'Triceps', core: 'Core',
}

function toNL(muscles) {
  return muscles.map(m => MUSCLE_NL[m] || m).join(', ')
}

/**
 * Score each split based on current training state.
 * Scores are NORMALIZED per primary muscle count to ensure fair comparison.
 * @param {Object} muscleStatus - Per-muscle analysis data
 * @param {Object} lastWorkoutInfo - Optional: { split: string, hoursSince: number }
 */
export function scoreSplits(muscleStatus, lastWorkoutInfo = null, experienceLevel = 'intermediate') {
  const scores = {}
  for (const [splitName, muscles] of Object.entries(SPLIT_MUSCLES)) {
    let score = 0
    const primaryMuscles = SPLIT_PRIMARY_MUSCLES[splitName] || muscles

    for (const muscle of muscles) {
      const ms = muscleStatus[muscle]
      if (!ms) continue
      const isPrimary = primaryMuscles.includes(muscle)
      // Primaire spieren wegen zwaarder; core/stabilisatoren minder
      const recoveryWeight = isPrimary ? 0.3 : 0.1
      // Recovery score: higher recovery = better time to train
      score += ms.recoveryPct * recoveryWeight
      // Volume deficit: need to hit weekly targets (alleen primaire spieren)
      if (isPrimary) {
        const deficit = Math.max(0, ms.target.min - ms.setsThisWeek)
        score += deficit * 2
      }
      // Penalize muscles that are still fatigued — harder for primary muscles
      if (ms.recoveryPct < 50) score -= isPrimary ? 40 : 10
    }

    // NORMALIZE: divide by number of primary muscles to compare splits fairly
    // This ensures Full Body (8 primary) doesn't auto-win vs Push (3 primary)
    const normFactor = primaryMuscles.length || 1
    score = score / normFactor

    // Harde penalty als ANY primary spier nog vermoeid is (<50%)
    const fatiguedPrimary = primaryMuscles.filter(m => (muscleStatus[m]?.recoveryPct ?? 100) < 50)
    if (fatiguedPrimary.length > 0) {
      // Penalty scales with how many primary muscles are fatigued
      score -= 15 * fatiguedPrimary.length
    }
    
    // Penalty for Full Body if last workout was also Full Body and <24h ago
    if (splitName === 'Full Body' && lastWorkoutInfo?.split === 'Full Body' && lastWorkoutInfo.hoursSince < 24) {
      score -= 30
    }
    // Advanced athletes: penalize Full Body (they benefit more from split training)
    if (splitName === 'Full Body' && experienceLevel === 'advanced') {
      score -= 40
    }
    
    scores[splitName] = Math.round(score * 10) / 10
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return sorted.map(([name, score]) => {
    const muscles = SPLIT_MUSCLES[name] || []
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
}

export function getRelevantHistory(workouts, splitName) {
  const muscles = SPLIT_MUSCLES[splitName] || []
  const history = []
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

export { SPLIT_MUSCLES }
