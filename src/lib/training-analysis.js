/**
 * Scientific training analysis engine.
 * Uses evidence-based recovery rates per muscle group.
 */

// Weekly set targets (Israetel MEV/MAV ranges for hypertrophy)
export const SET_TARGETS = {
  chest:      { min: 10, max: 20, mev: 8 },
  back:       { min: 14, max: 22, mev: 10 },
  shoulders:  { min: 8,  max: 16, mev: 6 },
  quads:      { min: 12, max: 20, mev: 8 },
  hamstrings: { min: 10, max: 16, mev: 6 },
  glutes:     { min: 10, max: 20, mev: 8 },
  biceps:     { min: 8,  max: 14, mev: 6 },
  triceps:    { min: 8,  max: 14, mev: 6 },
  core:       { min: 6,  max: 12, mev: 4 },
}

// Muscle-specific recovery hours (evidence-based)
// Large/compound-heavy = slower recovery; small/single-joint = faster
const RECOVERY_HOURS = {
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

// Map exercise names → muscle groups
const EXERCISE_MUSCLE_MAP = {
  // Chest
  'bench':              'chest', 'press.*chest': 'chest', 'dumbbell.*press': 'chest',
  'incline.*press':     'chest', 'fly':          'chest', 'pec':             'chest',
  'push-up':            'chest', 'push up':      'chest', 'cable.*fly':      'chest',
  // Back
  'row':                'back',  'pull-up':       'back',  'pullup':          'back',
  'chin-up':            'back',  'chinup':        'back',  'pulldown':        'back',
  'lat.*pull':          'back',  'hyperextension':'back',  'deadlift(?!.*(romanian|rdl|sumo))': 'back',
  // Shoulders
  'overhead.*press':    'shoulders', 'ohp':       'shoulders', 'lateral.*raise': 'shoulders',
  'face.*pull':         'shoulders', 'rear.*delt':'shoulders', 'arnold':         'shoulders',
  'upright.*row':       'shoulders', 'shoulder.*press': 'shoulders',
  'cable.*lateral':     'shoulders',
  // Quads
  'squat':              'quads', 'leg.*press':  'quads', 'hack':          'quads',
  'lunge':              'quads', 'leg.*extension': 'quads', 'split.*squat':'quads',
  'front.*squat':       'quads', 'bulgarian':   'quads',
  // Hamstrings
  'romanian':           'hamstrings', 'rdl':     'hamstrings', 'leg.*curl':  'hamstrings',
  'nordic':             'hamstrings', 'good.*morning': 'hamstrings',
  // Glutes
  'hip.*thrust':        'glutes', 'glute.*bridge': 'glutes', 'sumo.*deadlift': 'glutes',
  'kickback':           'glutes', 'abductor':   'glutes',
  // Biceps
  'curl(?!.*leg)':      'biceps', 'hammer':    'biceps', 'preacher':     'biceps',
  'concentration':      'biceps', 'ez.*bar.*curl': 'biceps',
  // Triceps
  'pushdown':           'triceps', 'skull.*crush': 'triceps', 'close.*grip': 'triceps',
  'overhead.*extension':'triceps', 'tricep':   'triceps', 'dip':          'triceps',
  'cable.*extension':   'triceps',
  // Core
  'plank':              'core',  'crunch':      'core',  'ab.*wheel':     'core',
  'leg.*raise':         'core',  'pallof':      'core',  'dead.*bug':     'core',
  'russian.*twist':     'core',  'sit.?up':     'core',
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
 * Calculate recovery % for a muscle group.
 * Accounts for: time elapsed, avg RPE, number of sets trained
 */
export function calcMuscleRecovery(muscle, hoursSinceTrained, avgRPE, setsCount) {
  if (hoursSinceTrained === null || hoursSinceTrained === undefined) return 100
  const baseHours = RECOVERY_HOURS[muscle] || 72
  // Volume penalty: each set above 6 adds 8% more recovery time needed
  const volumeMult = 1 + Math.max(0, ((setsCount || 0) - 6) * 0.08)
  // Intensity penalty: RPE above 7 slows recovery
  const rpeMult = 1 + Math.max(0, ((avgRPE || 7) - 7) * 0.15)
  const adjustedHours = baseHours * volumeMult * rpeMult
  return Math.min(100, Math.round((hoursSinceTrained / adjustedHours) * 100))
}

export function recoveryStatus(pct) {
  if (pct >= 90) return 'ready'
  if (pct >= 50) return 'recovering'
  return 'fatigued'
}

/**
 * Analyze recent workout history to determine per-muscle status.
 */
export function analyzeTraining(workouts) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const muscleStatus = {}
  for (const muscle of Object.keys(SET_TARGETS)) {
    muscleStatus[muscle] = {
      setsThisWeek: 0,
      daysSinceLastTrained: null,
      hoursSinceLastTrained: null,
      avgRpeLastSession: null,
      setsLastSession: 0,
      recoveryPct: 100,
      recentExercises: [],
      lastSessionSets: [],
      target: SET_TARGETS[muscle],
      status: 'needs_work',
    }
  }

  for (const w of workouts) {
    const workoutDate = new Date(w.created_at)
    const daysAgo = (now - workoutDate) / 86400000
    const hoursAgo = (now - workoutDate) / 3600000
    const isThisWeek = workoutDate >= weekStart

    for (const s of (w.workout_sets || [])) {
      const muscle = classifyExercise(s.exercise)
      if (!muscle || !muscleStatus[muscle]) continue

      if (isThisWeek) muscleStatus[muscle].setsThisWeek++

      if (
        muscleStatus[muscle].hoursSinceLastTrained === null ||
        hoursAgo < muscleStatus[muscle].hoursSinceLastTrained
      ) {
        muscleStatus[muscle].daysSinceLastTrained = Math.floor(daysAgo)
        muscleStatus[muscle].hoursSinceLastTrained = hoursAgo
      }

      if (daysAgo <= 7 && !muscleStatus[muscle].recentExercises.includes(s.exercise)) {
        muscleStatus[muscle].recentExercises.push(s.exercise)
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

/**
 * Score each split based on current training state.
 * @param {Object} muscleStatus - Per-muscle analysis data
 * @param {Object} lastWorkoutInfo - Optional: { split: string, hoursSince: number }
 */
export function scoreSplits(muscleStatus, lastWorkoutInfo = null) {
  const scores = {}
  for (const [splitName, muscles] of Object.entries(SPLIT_MUSCLES)) {
    let score = 0
    for (const muscle of muscles) {
      const ms = muscleStatus[muscle]
      if (!ms) continue
      // Recovery score: higher recovery = better time to train
      score += ms.recoveryPct * 0.3
      // Volume deficit: need to hit weekly targets
      const deficit = Math.max(0, ms.target.min - ms.setsThisWeek)
      score += deficit * 2
      // Penalize muscles that are still fatigued
      if (ms.recoveryPct < 50) score -= 15
    }
    
    // Penalty for Full Body if last workout was also Full Body and <24h ago
    // Full Body needs more recovery time between sessions
    if (splitName === 'Full Body' && lastWorkoutInfo?.split === 'Full Body' && lastWorkoutInfo.hoursSince < 24) {
      score -= 30  // Strong penalty - Full Body back-to-back is suboptimal
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
    if (needsWork.length > 0) reasoning += `${needsWork.join(', ')} need volume. `
    if (ready.length > 0) reasoning += `${ready.join(', ')} fully recovered. `
    if (fatigued.length > 0) reasoning += `${fatigued.join(', ')} still recovering — intensity reduced.`
    if (!reasoning) reasoning = 'Well-balanced based on your training history.'

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
