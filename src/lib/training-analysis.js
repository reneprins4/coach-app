/**
 * Scientific training analysis engine.
 * Analyzes workout history to determine muscle readiness,
 * recommend splits, and provide data for the AI coach.
 */

// Weekly set targets (evidence-based ranges for hypertrophy)
export const SET_TARGETS = {
  chest: { min: 12, max: 20 },
  back: { min: 14, max: 22 },
  shoulders: { min: 10, max: 16 },
  quads: { min: 12, max: 20 },
  hamstrings: { min: 10, max: 16 },
  glutes: { min: 12, max: 20 },
  biceps: { min: 8, max: 14 },
  triceps: { min: 8, max: 14 },
  core: { min: 6, max: 12 },
}

// Muscle groups included in each split
const SPLIT_MUSCLES = {
  'Push': ['chest', 'shoulders', 'triceps'],
  'Pull': ['back', 'biceps'],
  'Legs': ['quads', 'hamstrings', 'glutes', 'core'],
  'Upper': ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
  'Lower': ['quads', 'hamstrings', 'glutes', 'core'],
  'Full Body': ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'],
}

// Map exercise names to muscle groups they target
const EXERCISE_MUSCLE_MAP = {
  // Chest
  bench: 'chest', 'press.*chest': 'chest', 'dumbbell.*press': 'chest', 'fly': 'chest',
  'pec': 'chest', 'push-up': 'chest', 'push up': 'chest', 'dip.*chest': 'chest',
  // Back
  'row': 'back', 'pull-up': 'back', 'pullup': 'back', 'chin-up': 'back', 'chinup': 'back',
  'pulldown': 'back', 'deadlift(?!.*romanian|.*rdl|.*sumo)': 'back', 'hyperextension': 'back',
  // Shoulders
  'overhead.*press': 'shoulders', 'ohp': 'shoulders', 'lateral.*raise': 'shoulders',
  'face.*pull': 'shoulders', 'rear.*delt': 'shoulders', 'arnold': 'shoulders',
  'upright.*row': 'shoulders', 'shoulder.*press': 'shoulders',
  // Quads
  'squat': 'quads', 'leg.*press': 'quads', 'hack': 'quads', 'lunge': 'quads',
  'leg.*extension': 'quads', 'split.*squat': 'quads', 'front.*squat': 'quads',
  // Hamstrings
  'romanian': 'hamstrings', 'rdl': 'hamstrings', 'leg.*curl': 'hamstrings',
  'nordic': 'hamstrings',
  // Glutes
  'hip.*thrust': 'glutes', 'glute.*bridge': 'glutes', 'kickback': 'glutes',
  'sumo.*deadlift': 'glutes',
  // Biceps
  'curl(?!.*leg)': 'biceps', 'hammer': 'biceps', 'preacher': 'biceps',
  'concentration': 'biceps',
  // Triceps
  'pushdown': 'triceps', 'skull.*crush': 'triceps', 'close.*grip': 'triceps',
  'overhead.*extension': 'triceps', 'tricep': 'triceps', 'kickback.*tricep': 'triceps',
  // Core
  'plank': 'core', 'crunch': 'core', 'ab.*wheel': 'core', 'leg.*raise': 'core',
  'pallof': 'core', 'dead.*bug': 'core', 'russian.*twist': 'core',
}

function classifyExercise(exerciseName) {
  const lower = exerciseName.toLowerCase()
  for (const [pattern, muscle] of Object.entries(EXERCISE_MUSCLE_MAP)) {
    if (new RegExp(pattern, 'i').test(lower)) return muscle
  }
  return null
}

/**
 * Analyze recent workout history to determine muscle status.
 * @param {Array} workouts - Recent workouts with workout_sets
 * @returns {Object} Analysis results
 */
export function analyzeTraining(workouts) {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const muscleStatus = {}

  // Initialize all muscles
  for (const muscle of Object.keys(SET_TARGETS)) {
    muscleStatus[muscle] = {
      setsThisWeek: 0,
      daysSinceLastTrained: null,
      avgRpeLastSession: null,
      recentExercises: [],
      lastSessionSets: [],
      target: SET_TARGETS[muscle],
      status: 'unknown',
    }
  }

  // Process each workout
  for (const w of workouts) {
    const workoutDate = new Date(w.created_at)
    const daysAgo = Math.floor((now - workoutDate) / 86400000)
    const isThisWeek = workoutDate >= weekStart

    // Group sets by muscle
    for (const s of (w.workout_sets || [])) {
      const muscle = classifyExercise(s.exercise)
      if (!muscle || !muscleStatus[muscle]) continue

      if (isThisWeek) {
        muscleStatus[muscle].setsThisWeek++
      }

      // Track days since last trained
      if (muscleStatus[muscle].daysSinceLastTrained === null || daysAgo < muscleStatus[muscle].daysSinceLastTrained) {
        muscleStatus[muscle].daysSinceLastTrained = daysAgo
      }

      // Collect recent exercises (last 7 days)
      if (daysAgo <= 7 && !muscleStatus[muscle].recentExercises.includes(s.exercise)) {
        muscleStatus[muscle].recentExercises.push(s.exercise)
      }
    }
  }

  // Calculate avg RPE from last session for each muscle
  for (const muscle of Object.keys(muscleStatus)) {
    const ms = muscleStatus[muscle]

    // Find last session's sets for this muscle
    for (const w of workouts) {
      const sets = (w.workout_sets || []).filter(s => classifyExercise(s.exercise) === muscle)
      if (sets.length > 0) {
        const rpeSets = sets.filter(s => s.rpe != null)
        ms.avgRpeLastSession = rpeSets.length > 0
          ? Math.round(rpeSets.reduce((sum, s) => sum + Number(s.rpe), 0) / rpeSets.length * 10) / 10
          : null
        ms.lastSessionSets = sets.map(s => ({
          exercise: s.exercise,
          weight_kg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
        }))
        break // only need most recent
      }
    }

    // Determine status
    if (ms.daysSinceLastTrained === null) {
      ms.status = 'needs_work'
    } else if (ms.daysSinceLastTrained <= 1 && (ms.avgRpeLastSession || 0) >= 8) {
      ms.status = 'recovering'
    } else if (ms.setsThisWeek < ms.target.min) {
      ms.status = 'needs_work'
    } else if (ms.setsThisWeek >= ms.target.max) {
      ms.status = 'recovering'
    } else {
      ms.status = 'ready'
    }
  }

  return muscleStatus
}

/**
 * Score each split based on current training state.
 * Higher score = more recommended.
 */
export function scoreSplits(muscleStatus) {
  const scores = {}

  for (const [splitName, muscles] of Object.entries(SPLIT_MUSCLES)) {
    let score = 0

    for (const muscle of muscles) {
      const ms = muscleStatus[muscle]
      if (!ms) continue

      // +2 per day since last trained
      const days = ms.daysSinceLastTrained ?? 7
      score += days * 2

      // +1 per set below minimum target
      const deficit = Math.max(0, ms.target.min - ms.setsThisWeek)
      score += deficit

      // -3 per RPE point above 8.5 (fatigue penalty)
      if (ms.avgRpeLastSession && ms.avgRpeLastSession > 8.5) {
        score -= (ms.avgRpeLastSession - 8.5) * 3
      }
    }

    scores[splitName] = Math.round(score * 10) / 10
  }

  // Sort by score descending
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  return sorted.map(([name, score]) => ({ name, score }))
}

/**
 * Get the last 3 sessions' sets for muscles in a given split.
 */
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
          exercise: s.exercise,
          weight_kg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
        })),
      })
      if (history.length >= 3) break
    }
  }

  return history
}
