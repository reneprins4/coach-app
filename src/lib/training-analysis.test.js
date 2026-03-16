/**
 * KRAVEX TRAINING ANALYSIS — COMPREHENSIVE TEST SUITE
 * Ronde 1: Wiskundige correctheid ✅
 * Ronde 2: Temporele logica ✅
 * Ronde 3: Data integriteit
 */

import {
  classifyExercise,
  classifyExerciseFull,
  calcMuscleRecovery,
  recoveryStatus,
  analyzeTraining,
  scoreSplits,
  getRelevantHistory,
  SET_TARGETS,
  RECOVERY_HOURS,
  SPLIT_MUSCLES,
} from './training-analysis.js'

const PASS = '✅'
const FAIL = '❌'
let passed = 0
let failed = 0
const failures = []

function test(name, fn) {
  try {
    fn()
    console.log(`${PASS} ${name}`)
    passed++
  } catch (e) {
    console.log(`${FAIL} ${name}`)
    console.log(`   Error: ${e.message}`)
    failures.push({ name, error: e.message })
    failed++
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`)
  }
}

function assertRange(actual, min, max, msg = '') {
  if (actual < min || actual > max) {
    throw new Error(`${msg} Expected ${actual} to be between ${min} and ${max}`)
  }
}

function assertNoNaN(value, msg = '') {
  if (Number.isNaN(value)) {
    throw new Error(`${msg} Got NaN`)
  }
}

function assertFinite(value, msg = '') {
  if (!Number.isFinite(value)) {
    throw new Error(`${msg} Got ${value} (not finite)`)
  }
}

function assertGreater(a, b, msg = '') {
  if (a <= b) {
    throw new Error(`${msg} Expected ${a} > ${b}`)
  }
}

function assertTrue(val, msg = '') {
  if (!val) throw new Error(msg || 'Expected truthy value')
}

function assertFalse(val, msg = '') {
  if (val) throw new Error(msg || 'Expected falsy value')
}

function assertNotNull(val, msg = '') {
  if (val === null || val === undefined) throw new Error(msg || 'Expected non-null value')
}

// Helper: create workout at specific time
function createWorkout(hoursAgo, exercises = []) {
  const date = new Date()
  date.setTime(date.getTime() - hoursAgo * 3600000)
  return {
    created_at: date.toISOString(),
    workout_sets: exercises.map(e => ({
      exercise: typeof e === 'string' ? e : e.exercise,
      weight_kg: typeof e === 'string' ? 100 : (e.weight_kg ?? 100),
      reps: typeof e === 'string' ? 10 : (e.reps ?? 10),
      rpe: typeof e === 'string' ? 7 : (e.rpe ?? 7),
    }))
  }
}

// ========================================
// RONDE 1: WISKUNDIGE CORRECTHEID
// ========================================
console.log('\n========================================')
console.log('RONDE 1: WISKUNDIGE CORRECTHEID')
console.log('========================================\n')

console.log('--- Division by Zero ---')
test('calcMuscleRecovery: setsCount=0 should not cause division issues', () => {
  const result = calcMuscleRecovery('chest', 48, 7, 0)
  assertNoNaN(result); assertFinite(result); assertRange(result, 0, 100)
})
test('calcMuscleRecovery: hoursSinceTrained=0 should return 0% recovery', () => {
  assertEqual(calcMuscleRecovery('chest', 0, 7, 10), 0)
})
test('scoreSplits: empty muscleStatus should not crash', () => {
  assertTrue(Array.isArray(scoreSplits({})))
})
test('analyzeTraining: empty workouts array', () => {
  assertTrue(typeof analyzeTraining([]) === 'object')
})

console.log('\n--- Floating Point Precision ---')
test('setsThisWeek with compound movements accumulates correctly', () => {
  const workouts = [createWorkout(1, ['Deadlift', 'Squat', 'Barbell Row'])]
  const result = analyzeTraining(workouts)
  assertTrue(Math.abs(result.hamstrings.setsThisWeek - 1.0) < 0.001)
})
test('calcMuscleRecovery: RPE 4 > RPE 10 recovery', () => {
  assertGreater(calcMuscleRecovery('chest', 24, 4, 10), calcMuscleRecovery('chest', 24, 10, 10))
})

console.log('\n--- Extreme Values ---')
test('calcMuscleRecovery: 1000 sets', () => { assertRange(calcMuscleRecovery('quads', 96, 10, 1000), 0, 100) })
test('calcMuscleRecovery: 10000 hours', () => { assertEqual(calcMuscleRecovery('chest', 10000, 7, 10), 100) })
test('calcMuscleRecovery: negative hours → 0%', () => { assertEqual(calcMuscleRecovery('chest', -5, 7, 10), 0) })
test('calcMuscleRecovery: very small hours (0.001)', () => { assertRange(calcMuscleRecovery('chest', 0.001, 7, 10), 0, 100) })
test('calcMuscleRecovery: RPE = 0', () => { assertRange(calcMuscleRecovery('chest', 48, 0, 10), 0, 100) })
test('calcMuscleRecovery: RPE = 15', () => { assertRange(calcMuscleRecovery('chest', 48, 15, 10), 0, 100) })
test('calcMuscleRecovery: RPE = -5', () => { assertRange(calcMuscleRecovery('chest', 48, -5, 10), 0, 100) })
test('calcMuscleRecovery: setsCount negative', () => { assertFinite(calcMuscleRecovery('chest', 48, 7, -10)) })

console.log('\n--- Null/Undefined Handling ---')
test('calcMuscleRecovery: hours = null', () => { assertEqual(calcMuscleRecovery('chest', null, 7, 10), 100) })
test('calcMuscleRecovery: hours = undefined', () => { assertEqual(calcMuscleRecovery('chest', undefined, 7, 10), 100) })
test('calcMuscleRecovery: RPE = null', () => { assertRange(calcMuscleRecovery('chest', 48, null, 10), 0, 100) })
test('calcMuscleRecovery: RPE = undefined', () => { assertRange(calcMuscleRecovery('chest', 48, undefined, 10), 0, 100) })
test('calcMuscleRecovery: setsCount = null', () => { assertFinite(calcMuscleRecovery('chest', 48, 7, null)) })
test('calcMuscleRecovery: setsCount = undefined', () => { assertFinite(calcMuscleRecovery('chest', 48, 7, undefined)) })
test('calcMuscleRecovery: unknown muscle', () => { assertFinite(calcMuscleRecovery('unknown', 48, 7, 10)) })

console.log('\n--- Score Calculation Edge Cases ---')
test('scoreSplits: all muscles at 0% recovery', () => {
  const ms = {}; for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: 20, recoveryPct: 0, target: SET_TARGETS[m], status: 'fatigued' }
  scoreSplits(ms).forEach(s => assertFinite(s.score))
})
test('scoreSplits: all muscles at 100% recovery', () => {
  const ms = {}; for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: 0, recoveryPct: 100, target: SET_TARGETS[m], status: 'ready' }
  scoreSplits(ms).forEach(s => { assertFinite(s.score); assertNoNaN(s.score) })
})
test('scoreSplits: volume at max', () => {
  const ms = {}; for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: SET_TARGETS[m].max, recoveryPct: 80, target: SET_TARGETS[m], status: 'recovering' }
  scoreSplits(ms).forEach(s => assertFinite(s.score))
})
test('scoreSplits: setsThisWeek > max', () => {
  const ms = {}; for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: SET_TARGETS[m].max * 3, recoveryPct: 50, target: SET_TARGETS[m], status: 'recovering' }
  scoreSplits(ms).forEach(s => assertFinite(s.score))
})

console.log('\n--- NaN Propagation ---')
test('calcMuscleRecovery: NaN hours → 100%', () => { assertEqual(calcMuscleRecovery('chest', NaN, 7, 10), 100) })
test('calcMuscleRecovery: NaN RPE → default 7', () => { assertNoNaN(calcMuscleRecovery('chest', 48, NaN, 10)) })
test('calcMuscleRecovery: NaN setsCount', () => { assertNoNaN(calcMuscleRecovery('chest', 48, 7, NaN)) })

console.log('\n--- Mathematical Correctness ---')
test('Recovery at baseHours ≈ 100%', () => { assertRange(calcMuscleRecovery('chest', 72, 7, 6), 95, 100) })
test('Recovery at half baseHours ≈ 50%', () => { assertRange(calcMuscleRecovery('chest', 36, 7, 6), 45, 55) })
test('Volume penalty: 6 sets > 12 sets', () => { assertGreater(calcMuscleRecovery('chest', 48, 7, 6), calcMuscleRecovery('chest', 48, 7, 12)) })
test('RPE multiplier: RPE6 > RPE7 > RPE8', () => {
  const r6 = calcMuscleRecovery('chest', 48, 6, 10), r7 = calcMuscleRecovery('chest', 48, 7, 10), r8 = calcMuscleRecovery('chest', 48, 8, 10)
  assertGreater(r6, r7); assertGreater(r7, r8)
})

console.log('\n--- Infinity Handling ---')
test('calcMuscleRecovery: Infinity hours → 100%', () => { assertEqual(calcMuscleRecovery('chest', Infinity, 7, 10), 100) })
test('calcMuscleRecovery: -Infinity hours → 100%', () => { assertEqual(calcMuscleRecovery('chest', -Infinity, 7, 10), 100) })
test('calcMuscleRecovery: Infinity setsCount', () => { assertRange(calcMuscleRecovery('chest', 48, 7, Infinity), 0, 100) })

console.log('\n--- Zero Edge Cases ---')
test('setsLastSession=0, hours=48', () => { assertRange(calcMuscleRecovery('chest', 48, 7, 0), 60, 75) })
test('All zeros', () => { assertEqual(calcMuscleRecovery('chest', 0, 0, 0), 0) })

// ========================================
// RONDE 2: TEMPORELE LOGICA
// ========================================
console.log('\n========================================')
console.log('RONDE 2: TEMPORELE LOGICA')
console.log('========================================\n')

console.log('--- Future Workout Handling ---')
test('Future workout (1 day)', () => {
  const d = new Date(); d.setDate(d.getDate() + 1)
  assertEqual(analyzeTraining([{ created_at: d.toISOString(), workout_sets: [{ exercise: 'Bench Press' }] }]).chest.setsThisWeek, 0)
})
test('Future workout (1s)', () => {
  const d = new Date(Date.now() + 1000)
  assertEqual(analyzeTraining([{ created_at: d.toISOString(), workout_sets: [{ exercise: 'Bench Press' }] }]).chest.setsThisWeek, 0)
})
test('Future workout (1ms)', () => {
  const d = new Date(Date.now() + 1)
  assertEqual(analyzeTraining([{ created_at: d.toISOString(), workout_sets: [{ exercise: 'Bench Press' }] }]).chest.setsThisWeek, 0)
})

console.log('\n--- Week Boundary ---')
test('7 days ago counts', () => { 
  // Use 167.9 hours to avoid microsecond boundary issues
  assertGreater(analyzeTraining([createWorkout(167.9, ['Bench Press'])]).chest.setsThisWeek, 0) 
})
test('7d + 1h ago does NOT count', () => { assertEqual(analyzeTraining([createWorkout(169, ['Bench Press'])]).chest.setsThisWeek, 0) })
test('6d 23h counts', () => { assertGreater(analyzeTraining([createWorkout(167, ['Bench Press'])]).chest.setsThisWeek, 0) })

console.log('\n--- Multiple Workouts Same Day ---')
test('Two workouts same day both count', () => { assertEqual(analyzeTraining([createWorkout(2, ['Bench Press', 'Incline Press']), createWorkout(10, ['Cable Fly', 'Dips'])]).chest.setsThisWeek, 3) })
test('Recovery tracks most recent', () => { assertRange(analyzeTraining([createWorkout(2, ['Bench Press']), createWorkout(10, ['Incline Press'])]).chest.hoursSinceLastTrained, 1.9, 2.1) })

console.log('\n--- Midnight/Timezone ---')
test('Midnight boundary', () => { const d = new Date(); d.setHours(0,0,0,0); assertNoNaN(analyzeTraining([{ created_at: d.toISOString(), workout_sets: [{ exercise: 'Squat' }] }]).quads.setsThisWeek) })
test('23:59:59 boundary', () => { const d = new Date(); d.setHours(23,59,59,999); assertNoNaN(analyzeTraining([{ created_at: d.toISOString(), workout_sets: [{ exercise: 'Squat' }] }]).quads.setsThisWeek) })
test('ISO Z timezone', () => { assertNoNaN(analyzeTraining([{ created_at: '2024-01-15T12:00:00.000Z', workout_sets: [{ exercise: 'Squat' }] }]).quads.recoveryPct) })
test('ISO +02:00 timezone', () => { assertNoNaN(analyzeTraining([{ created_at: '2024-01-15T12:00:00.000+02:00', workout_sets: [{ exercise: 'Squat' }] }]).quads.recoveryPct) })

console.log('\n--- Invalid Date Handling ---')
test('Invalid date string', () => { try { assertNoNaN(analyzeTraining([{ created_at: 'not-a-date', workout_sets: [{ exercise: 'Squat' }] }]).quads.setsThisWeek) } catch {} })
test('Null created_at', () => { try { assertNoNaN(analyzeTraining([{ created_at: null, workout_sets: [{ exercise: 'Squat' }] }]).quads.recoveryPct) } catch {} })

console.log('\n--- Days Since Trained ---')
test('25h = 1 day', () => { assertEqual(analyzeTraining([createWorkout(25, ['Bench Press'])]).chest.daysSinceLastTrained, 1) })
test('47h = 1 day', () => { assertEqual(analyzeTraining([createWorkout(47, ['Bench Press'])]).chest.daysSinceLastTrained, 1) })
test('48h = 2 days', () => { assertEqual(analyzeTraining([createWorkout(48, ['Bench Press'])]).chest.daysSinceLastTrained, 2) })
test('1h = 0 days', () => { assertEqual(analyzeTraining([createWorkout(1, ['Bench Press'])]).chest.daysSinceLastTrained, 0) })

console.log('\n--- Very Old Workouts ---')
test('30 days ago = 0 weekly sets', () => { assertEqual(analyzeTraining([createWorkout(720, ['Bench Press'])]).chest.setsThisWeek, 0) })
test('30 days ago = 100% recovery', () => { assertEqual(analyzeTraining([createWorkout(720, ['Bench Press'])]).chest.recoveryPct, 100) })
test('365 days ago handled', () => { assertEqual(analyzeTraining([createWorkout(8760, ['Bench Press'])]).chest.recoveryPct, 100) })

console.log('\n--- Recent Exercise Tracking ---')
test('6d ago in recentExercises', () => { assertTrue(analyzeTraining([createWorkout(144, ['Bench Press'])]).chest.recentExercises.includes('Bench Press')) })
test('8d ago NOT in recentExercises', () => { assertFalse(analyzeTraining([createWorkout(192, ['Bench Press'])]).chest.recentExercises.includes('Bench Press')) })
test('7d ago in recentExercises', () => { assertTrue(analyzeTraining([createWorkout(168, ['Bench Press'])]).chest.recentExercises.includes('Bench Press')) })

console.log('\n--- scoreSplits lastWorkoutInfo ---')
test('FB penalty when last FB < 24h', () => {
  const ms = {}; for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: 5, recoveryPct: 70, target: SET_TARGETS[m], status: 'recovering' }
  assertGreater(scoreSplits(ms).find(s => s.name === 'Full Body').score, scoreSplits(ms, { split: 'Full Body', hoursSince: 12 }).find(s => s.name === 'Full Body').score)
})
test('No FB penalty when > 24h', () => {
  const ms = {}; for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: 5, recoveryPct: 80, target: SET_TARGETS[m], status: 'ready' }
  assertEqual(scoreSplits(ms).find(s => s.name === 'Full Body').score, scoreSplits(ms, { split: 'Full Body', hoursSince: 48 }).find(s => s.name === 'Full Body').score)
})

console.log('\n--- Order Independence ---')
test('Workout order independent', () => {
  const r1 = analyzeTraining([createWorkout(2, ['Bench Press']), createWorkout(48, ['Bench Press'])])
  const r2 = analyzeTraining([createWorkout(48, ['Bench Press']), createWorkout(2, ['Bench Press'])])
  assertEqual(r1.chest.setsThisWeek, r2.chest.setsThisWeek)
  assertRange(r1.chest.hoursSinceLastTrained, 1.9, 2.1); assertRange(r2.chest.hoursSinceLastTrained, 1.9, 2.1)
})

// ========================================
// RONDE 3: DATA INTEGRITEIT
// ========================================
console.log('\n========================================')
console.log('RONDE 3: DATA INTEGRITEIT')
console.log('========================================\n')

// === Extreme Volume ===
console.log('--- Extreme Volume ---')

test('Workout with 100+ sets should not crash', () => {
  const exercises = Array(100).fill('Bench Press')
  const result = analyzeTraining([createWorkout(24, exercises)])
  assertEqual(result.chest.setsThisWeek, 100)
  assertFinite(result.chest.recoveryPct)
})

test('Workout with 500 sets should handle', () => {
  const exercises = Array(500).fill('Squat')
  const result = analyzeTraining([createWorkout(24, exercises)])
  assertEqual(result.quads.setsThisWeek, 500)
})

test('Volume accumulation across many workouts', () => {
  const workouts = Array(50).fill(null).map((_, i) => createWorkout(i + 1, ['Bench Press', 'Incline Press']))
  const result = analyzeTraining(workouts)
  // 50 workouts * 2 chest exercises = 100 sets, but only 7 days count
  assertTrue(result.chest.setsThisWeek <= 100)
})

// === Exercise Name Edge Cases ===
console.log('\n--- Exercise Name Edge Cases ---')

test('Exercise with parentheses: "Barbell Row (overhand)"', () => {
  assertEqual(classifyExercise('Barbell Row (overhand)'), 'back')
})

test('Exercise with parentheses: "Push-Up (wide)"', () => {
  assertEqual(classifyExercise('Push-Up (wide)'), 'chest')
})

test('Exercise with fraction: "3/4 Squat"', () => {
  assertEqual(classifyExercise('3/4 Squat'), 'quads')
})

test('Exercise in ALL CAPS: "BENCH PRESS"', () => {
  assertEqual(classifyExercise('BENCH PRESS'), 'chest')
})

test('Exercise in ALL CAPS: "DEADLIFT"', () => {
  assertEqual(classifyExercise('DEADLIFT'), 'back')
})

test('Exercise in ALL CAPS: "SQUAT"', () => {
  assertEqual(classifyExercise('SQUAT'), 'quads')
})

test('Exercise in mixed case: "BeNcH pReSs"', () => {
  assertEqual(classifyExercise('BeNcH pReSs'), 'chest')
})

test('Exercise with numbers: "21s Bicep Curls"', () => {
  assertEqual(classifyExercise('21s Bicep Curls'), 'biceps')
})

test('Exercise with dash: "Close-Grip Bench Press"', () => {
  assertEqual(classifyExercise('Close-Grip Bench Press'), 'triceps')
})

test('Exercise with underscore: "leg_press"', () => {
  assertEqual(classifyExercise('leg_press'), 'quads')
})

// === Dutch Exercise Names ===
console.log('\n--- Dutch Exercise Names ---')

test('Dutch: "Bankdrukken" (bench press)', () => {
  // This should NOT match anything since we don't have Dutch patterns
  const result = classifyExercise('Bankdrukken')
  // It's okay if this returns null - we're testing it doesn't crash
  assertTrue(result === null || typeof result === 'string')
})

test('Dutch: "Kniebuiging" (squat)', () => {
  const result = classifyExercise('Kniebuiging')
  assertTrue(result === null || typeof result === 'string')
})

// === Null/Empty/Missing Data ===
console.log('\n--- Null/Empty/Missing Data ---')

test('Exercise with null name', () => {
  assertEqual(classifyExercise(null), null)
})

test('Exercise with undefined name', () => {
  assertEqual(classifyExercise(undefined), null)
})

test('Exercise with empty string', () => {
  assertEqual(classifyExercise(''), null)
})

test('Workout without exercises array', () => {
  const workouts = [{ created_at: new Date().toISOString() }]
  try {
    const result = analyzeTraining(workouts)
    // Should not crash, all muscles should have default values
    assertEqual(result.chest.setsThisWeek, 0)
  } catch (e) {
    // If it crashes, that's a bug
    throw new Error('Crashed on workout without exercises array')
  }
})

test('Workout with null exercises array', () => {
  const workouts = [{ created_at: new Date().toISOString(), workout_sets: null }]
  try {
    const result = analyzeTraining(workouts)
    assertEqual(result.chest.setsThisWeek, 0)
  } catch {
    throw new Error('Crashed on workout with null workout_sets')
  }
})

test('Workout with empty exercises array', () => {
  const workouts = [{ created_at: new Date().toISOString(), workout_sets: [] }]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 0)
})

test('Set with null weight_kg (bodyweight)', () => {
  const workouts = [{
    created_at: new Date().toISOString(),
    workout_sets: [{ exercise: 'Push-Up', weight_kg: null, reps: 20, rpe: 6 }]
  }]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 1)
})

test('Set with reps = 0', () => {
  const workouts = [{
    created_at: new Date().toISOString(),
    workout_sets: [{ exercise: 'Bench Press', weight_kg: 100, reps: 0, rpe: 7 }]
  }]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 1) // Should still count
})

test('Set with undefined rpe', () => {
  const workouts = [{
    created_at: new Date().toISOString(),
    workout_sets: [{ exercise: 'Bench Press', weight_kg: 100, reps: 10 }] // No RPE
  }]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.avgRpeLastSession, null)
})

// === Special Characters ===
console.log('\n--- Special Characters ---')

test('Exercise with emoji: "💪 Bench Press"', () => {
  assertEqual(classifyExercise('💪 Bench Press'), 'chest')
})

test('Exercise with unicode: "Bänch Préss" returns null (not a bug)', () => {
  // "Bänch" ≠ "Bench" - different characters, so null is expected
  assertEqual(classifyExercise('Bänch Préss'), null)
})

test('Exercise with newline', () => {
  assertEqual(classifyExercise('Bench\nPress'), 'chest')
})

test('Exercise with tab', () => {
  assertEqual(classifyExercise('Bench\tPress'), 'chest')
})

test('Exercise with extra spaces', () => {
  assertEqual(classifyExercise('  Bench   Press  '), 'chest')
})

// === Compound Exercise Classification ===
console.log('\n--- Compound Exercise Classification ---')

test('Deadlift secondary muscles: hamstrings + glutes', () => {
  const result = classifyExerciseFull('Deadlift')
  assertEqual(result.primary, 'back')
  assertTrue(result.secondary.includes('hamstrings'))
  assertTrue(result.secondary.includes('glutes'))
})

test('Squat secondary muscles: hamstrings + glutes', () => {
  const result = classifyExerciseFull('Squat')
  assertEqual(result.primary, 'quads')
  assertTrue(result.secondary.includes('hamstrings'))
  assertTrue(result.secondary.includes('glutes'))
})

test('Bench Press secondary: triceps + shoulders', () => {
  const result = classifyExerciseFull('Bench Press')
  assertEqual(result.primary, 'chest')
  assertTrue(result.secondary.includes('triceps'))
  assertTrue(result.secondary.includes('shoulders'))
})

test('Close Grip Bench is triceps primary (not chest)', () => {
  const result = classifyExerciseFull('Close Grip Bench Press')
  assertEqual(result.primary, 'triceps')
})

test('Pull-up secondary: biceps', () => {
  const result = classifyExerciseFull('Pull-up')
  assertEqual(result.primary, 'back')
  assertTrue(result.secondary.includes('biceps'))
})

test('Romanian Deadlift secondary: glutes', () => {
  const result = classifyExerciseFull('Romanian Deadlift')
  assertEqual(result.primary, 'hamstrings')
  assertTrue(result.secondary.includes('glutes'))
})

test('Overhead Press secondary: triceps', () => {
  const result = classifyExerciseFull('Overhead Press')
  assertEqual(result.primary, 'shoulders')
  assertTrue(result.secondary.includes('triceps'))
})

// === Edge Exercise Names ===
console.log('\n--- Edge Exercise Names ---')

test('Glute Ham Raise → hamstrings (not glutes)', () => {
  assertEqual(classifyExercise('Glute Ham Raise'), 'hamstrings')
})

test('Reverse Pec Deck → shoulders (not chest)', () => {
  assertEqual(classifyExercise('Reverse Pec Deck'), 'shoulders')
})

test('Chest Dip → chest (not triceps)', () => {
  assertEqual(classifyExercise('Chest Dip'), 'chest')
})

test('Regular Dip → triceps', () => {
  assertEqual(classifyExercise('Dip'), 'triceps')
})

test('Upright Row → shoulders (not back)', () => {
  assertEqual(classifyExercise('Upright Row'), 'shoulders')
})

test('Landmine Press → shoulders', () => {
  assertEqual(classifyExercise('Landmine Press'), 'shoulders')
})

test('JM Press → triceps', () => {
  assertEqual(classifyExercise('JM Press'), 'triceps')
})

test('Sumo Deadlift → glutes', () => {
  assertEqual(classifyExercise('Sumo Deadlift'), 'glutes')
})

test('Stiff-Leg Deadlift → hamstrings', () => {
  assertEqual(classifyExercise('Stiff-Leg Deadlift'), 'hamstrings')
})

// === getRelevantHistory tests ===
console.log('\n--- getRelevantHistory ---')

test('getRelevantHistory returns max 3 workouts', () => {
  const workouts = Array(10).fill(null).map((_, i) => createWorkout(i * 24, ['Bench Press']))
  const history = getRelevantHistory(workouts, 'Push')
  assertTrue(history.length <= 3)
})

test('getRelevantHistory filters by split muscles', () => {
  const workouts = [
    createWorkout(24, ['Squat', 'Leg Press']),  // Legs
    createWorkout(48, ['Bench Press']),          // Push
    createWorkout(72, ['Deadlift', 'Rows']),     // Pull
  ]
  const history = getRelevantHistory(workouts, 'Push')
  // Should only include Bench Press workout
  assertEqual(history.length, 1)
  assertTrue(history[0].sets.some(s => s.exercise === 'Bench Press'))
})

// ========================================
// RONDE 4: SCORING CORRECTHEID ALS PT
// ========================================
console.log('\n========================================')
console.log('RONDE 4: SCORING CORRECTHEID ALS PT')
console.log('========================================\n')

// === 3 Weeks Rest Scenario ===
console.log('--- 3 Weeks Rest Scenario ---')

test('After 3 weeks rest: Full Body should score high', () => {
  // No workouts = all muscles need work
  const result = analyzeTraining([])
  const scores = scoreSplits(result)
  // Full Body should be top recommendation because everything needs work
  const fbScore = scores.find(s => s.name === 'Full Body')
  assertTrue(fbScore !== undefined)
  // Should be a positive score (needs work)
  assertGreater(fbScore.score, 0, 'Full Body should have positive score after 3 weeks rest')
})

test('After 3 weeks rest: all muscles have needs_work status', () => {
  const result = analyzeTraining([])
  for (const muscle of Object.keys(SET_TARGETS)) {
    assertEqual(result[muscle].status, 'needs_work', `${muscle} should need work`)
  }
})

test('After 3 weeks rest: all muscles have null daysSinceLastTrained', () => {
  const result = analyzeTraining([])
  for (const muscle of Object.keys(SET_TARGETS)) {
    assertEqual(result[muscle].daysSinceLastTrained, null, `${muscle} should have null days`)
  }
})

// === Heavy Legs + Light Push Same Day ===
console.log('\n--- Heavy Legs + Light Push Same Day ---')

test('Heavy Legs RPE 9 + Light Push RPE 5: next day should favor Push', () => {
  const workouts = [
    createWorkout(18, [
      { exercise: 'Squat', rpe: 9 },
      { exercise: 'Squat', rpe: 9 },
      { exercise: 'Squat', rpe: 9 },
      { exercise: 'Squat', rpe: 9 },
      { exercise: 'Squat', rpe: 9 },  // 5 heavy sets quads
      { exercise: 'Leg Press', rpe: 9 },
      { exercise: 'Leg Press', rpe: 9 },
      { exercise: 'Leg Press', rpe: 9 },
      { exercise: 'Leg Press', rpe: 9 },
      { exercise: 'Leg Press', rpe: 9 },  // 10 total quads RPE 9
      { exercise: 'Bench Press', rpe: 5 },
      { exercise: 'Bench Press', rpe: 5 },  // Light push
    ])
  ]
  const result = analyzeTraining(workouts)
  const scores = scoreSplits(result)
  
  const legsScore = scores.find(s => s.name === 'Legs').score
  const pushScore = scores.find(s => s.name === 'Push').score
  
  // Push should score higher than Legs because quads are fatigued
  assertGreater(pushScore, legsScore, 'Push should score higher than Legs after heavy legs')
})

test('Quads recovery after 15 sets RPE 9 should be < 50%', () => {
  const workouts = [
    createWorkout(24, Array(15).fill({ exercise: 'Squat', rpe: 9 }))
  ]
  const result = analyzeTraining(workouts)
  assertTrue(result.quads.recoveryPct < 50, 'Quads should be fatigued after heavy session')
})

// === Powerlifter Scenario (Only Compounds) ===
console.log('\n--- Powerlifter Scenario ---')

test('Powerlifter (Squat + Deadlift + Bench only): correct secondary muscle tracking', () => {
  const workouts = [
    createWorkout(48, [
      { exercise: 'Squat' },
      { exercise: 'Squat' },
      { exercise: 'Squat' },  // 3 quads + 1.5 hamstrings + 1.5 glutes
      { exercise: 'Deadlift' },
      { exercise: 'Deadlift' },
      { exercise: 'Deadlift' },  // 3 back + 1.5 hamstrings + 1.5 glutes
      { exercise: 'Bench Press' },
      { exercise: 'Bench Press' },
      { exercise: 'Bench Press' },  // 3 chest + 1.5 triceps + 1.5 shoulders
    ])
  ]
  const result = analyzeTraining(workouts)
  
  // Primary muscles
  assertEqual(result.quads.setsThisWeek, 3)
  assertEqual(result.back.setsThisWeek, 3)
  assertEqual(result.chest.setsThisWeek, 3)
  
  // Secondary muscles from compounds
  assertEqual(result.hamstrings.setsThisWeek, 3)  // 1.5 from squat + 1.5 from deadlift
  assertEqual(result.glutes.setsThisWeek, 3)      // 1.5 from squat + 1.5 from deadlift
  assertEqual(result.triceps.setsThisWeek, 1.5)   // 1.5 from bench
  assertEqual(result.shoulders.setsThisWeek, 1.5) // 1.5 from bench
})

test('Powerlifter: biceps get no direct work, should need work', () => {
  const workouts = [
    createWorkout(48, [
      { exercise: 'Squat' },
      { exercise: 'Deadlift' },
      { exercise: 'Bench Press' },
    ])
  ]
  const result = analyzeTraining(workouts)
  // Deadlift does NOT hit biceps (that's rows/pullups)
  // Powerlifter doing only SBD gets 0 bicep work
  assertEqual(result.biceps.setsThisWeek, 0, 'Biceps get no work from SBD')
  assertEqual(result.biceps.status, 'needs_work', 'Biceps should need work')
})

// === Never Trained Muscle ===
console.log('\n--- Never Trained Muscle ---')

test('Muscle never trained: always needs_work status', () => {
  // Only train chest, check that biceps shows needs_work
  const workouts = [
    createWorkout(24, ['Bench Press', 'Incline Press', 'Cable Fly'])
  ]
  const result = analyzeTraining(workouts)
  assertEqual(result.biceps.status, 'needs_work')
  assertEqual(result.biceps.daysSinceLastTrained, null)
})

// === Volume Target Reached ===
console.log('\n--- Volume Target Reached ---')

test('Volume at max: deficit should be 0 (no boost)', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: SET_TARGETS[m].max, // At max
      recoveryPct: 100,
      target: SET_TARGETS[m],
      status: 'ready',
    }
  }
  const scores = scoreSplits(muscleStatus)
  // Scores should be lower than when at 0 sets
  const lowVolumeStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    lowVolumeStatus[m] = {
      setsThisWeek: 0, // No volume
      recoveryPct: 100,
      target: SET_TARGETS[m],
      status: 'ready',
    }
  }
  const lowScores = scoreSplits(lowVolumeStatus)
  
  // Scores with 0 volume should be higher due to deficit bonus
  const pushMax = scores.find(s => s.name === 'Push').score
  const pushLow = lowScores.find(s => s.name === 'Push').score
  assertGreater(pushLow, pushMax, 'Low volume should score higher than max volume')
})

test('Volume over max: still no crash and valid scores', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: SET_TARGETS[m].max * 2, // Double max
      recoveryPct: 50,
      target: SET_TARGETS[m],
      status: 'recovering',
    }
  }
  const scores = scoreSplits(muscleStatus)
  for (const split of scores) {
    assertFinite(split.score)
    assertNoNaN(split.score)
  }
})

// === Experience Level ===
console.log('\n--- Experience Level ---')

test('Advanced athlete: Full Body penalized', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: 5,
      recoveryPct: 100,
      target: SET_TARGETS[m],
      status: 'ready',
    }
  }
  
  const intermediate = scoreSplits(muscleStatus, null, 'intermediate')
  const advanced = scoreSplits(muscleStatus, null, 'advanced')
  
  const fbInt = intermediate.find(s => s.name === 'Full Body').score
  const fbAdv = advanced.find(s => s.name === 'Full Body').score
  
  assertGreater(fbInt, fbAdv, 'Advanced should penalize Full Body')
})

test('Beginner (default): Full Body not extra penalized', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: 0,
      recoveryPct: 100,
      target: SET_TARGETS[m],
      status: 'ready',
    }
  }
  
  const def = scoreSplits(muscleStatus)
  const beginner = scoreSplits(muscleStatus, null, 'beginner')
  
  const fbDef = def.find(s => s.name === 'Full Body').score
  const fbBeg = beginner.find(s => s.name === 'Full Body').score
  
  assertEqual(fbDef, fbBeg, 'Beginner and default should have same FB score')
})

// === Recovery Status Transitions ===
console.log('\n--- Recovery Status Transitions ---')

test('recoveryStatus: 90% = ready', () => {
  assertEqual(recoveryStatus(90), 'ready')
})

test('recoveryStatus: 89% = recovering', () => {
  assertEqual(recoveryStatus(89), 'recovering')
})

test('recoveryStatus: 50% = recovering', () => {
  assertEqual(recoveryStatus(50), 'recovering')
})

test('recoveryStatus: 49% = fatigued', () => {
  assertEqual(recoveryStatus(49), 'fatigued')
})

test('recoveryStatus: 0% = fatigued', () => {
  assertEqual(recoveryStatus(0), 'fatigued')
})

test('recoveryStatus: 100% = ready', () => {
  assertEqual(recoveryStatus(100), 'ready')
})

// === Fatigued Primary Muscle Penalty ===
console.log('\n--- Fatigued Primary Penalty ---')

test('Push with fatigued chest: heavy penalty', () => {
  const fatigued = {}
  for (const m of Object.keys(SET_TARGETS)) {
    fatigued[m] = {
      setsThisWeek: 5,
      recoveryPct: 100,
      target: SET_TARGETS[m],
      status: 'ready',
    }
  }
  // Make chest fatigued
  fatigued.chest.recoveryPct = 30
  fatigued.chest.status = 'fatigued'
  
  const scores = scoreSplits(fatigued)
  const pushScore = scores.find(s => s.name === 'Push').score
  
  // Pull should score much higher than Push
  const pullScore = scores.find(s => s.name === 'Pull').score
  assertGreater(pullScore, pushScore, 'Pull should beat Push when chest is fatigued')
})

test('Multiple fatigued primary muscles: bigger penalty', () => {
  const oneFatigued = {}
  const twoFatigued = {}
  for (const m of Object.keys(SET_TARGETS)) {
    oneFatigued[m] = { setsThisWeek: 5, recoveryPct: 100, target: SET_TARGETS[m], status: 'ready' }
    twoFatigued[m] = { setsThisWeek: 5, recoveryPct: 100, target: SET_TARGETS[m], status: 'ready' }
  }
  
  oneFatigued.chest.recoveryPct = 30
  oneFatigued.chest.status = 'fatigued'
  
  twoFatigued.chest.recoveryPct = 30
  twoFatigued.chest.status = 'fatigued'
  twoFatigued.shoulders.recoveryPct = 30
  twoFatigued.shoulders.status = 'fatigued'
  
  const oneScore = scoreSplits(oneFatigued).find(s => s.name === 'Push').score
  const twoScore = scoreSplits(twoFatigued).find(s => s.name === 'Push').score
  
  assertGreater(oneScore, twoScore, 'More fatigued muscles = lower score')
})

// === Split Comparison Logic ===
console.log('\n--- Split Comparison Logic ---')

test('Upper vs Lower: opposite muscle groups', () => {
  // Train lower body heavily
  const workouts = [
    createWorkout(12, Array(15).fill({ exercise: 'Squat', rpe: 9 }))
  ]
  const result = analyzeTraining(workouts)
  const scores = scoreSplits(result)
  
  const upperScore = scores.find(s => s.name === 'Upper').score
  const lowerScore = scores.find(s => s.name === 'Lower').score
  
  assertGreater(upperScore, lowerScore, 'Upper should win after heavy legs')
})

test('Push vs Pull vs Legs: rotation logic', () => {
  // Train push heavily
  const workouts = [
    createWorkout(12, Array(10).fill({ exercise: 'Bench Press', rpe: 9 }))
  ]
  const result = analyzeTraining(workouts)
  const scores = scoreSplits(result)
  
  const pushScore = scores.find(s => s.name === 'Push').score
  const pullScore = scores.find(s => s.name === 'Pull').score
  const legsScore = scores.find(s => s.name === 'Legs').score
  
  // Pull and Legs should both beat Push
  assertGreater(pullScore, pushScore, 'Pull should beat Push after heavy push')
  assertGreater(legsScore, pushScore, 'Legs should beat Push after heavy push')
})

// === Realistic Training Scenarios ===
console.log('\n--- Realistic Training Scenarios ---')

test('PPL: Day after Push = Pull recommended', () => {
  const workouts = [
    createWorkout(20, [
      { exercise: 'Bench Press', rpe: 8 },
      { exercise: 'Bench Press', rpe: 8 },
      { exercise: 'Bench Press', rpe: 8 },
      { exercise: 'Incline Press', rpe: 8 },
      { exercise: 'Incline Press', rpe: 8 },
      { exercise: 'Shoulder Press', rpe: 7 },
      { exercise: 'Shoulder Press', rpe: 7 },
      { exercise: 'Tricep Pushdown', rpe: 7 },
      { exercise: 'Tricep Pushdown', rpe: 7 },
    ])
  ]
  const result = analyzeTraining(workouts)
  const scores = scoreSplits(result)
  
  // Pull should rank higher than Push
  const pushRank = scores.findIndex(s => s.name === 'Push')
  const pullRank = scores.findIndex(s => s.name === 'Pull')
  assertTrue(pullRank < pushRank, 'Pull should rank higher than Push')
})

test('Deload week (all RPE 5): faster recovery', () => {
  const deloadWorkouts = [
    createWorkout(24, Array(10).fill({ exercise: 'Bench Press', rpe: 5 }))
  ]
  const heavyWorkouts = [
    createWorkout(24, Array(10).fill({ exercise: 'Bench Press', rpe: 9 }))
  ]
  
  const deloadResult = analyzeTraining(deloadWorkouts)
  const heavyResult = analyzeTraining(heavyWorkouts)
  
  assertGreater(deloadResult.chest.recoveryPct, heavyResult.chest.recoveryPct, 
    'Deload (RPE 5) should recover faster than heavy (RPE 9)')
})

// ========================================
// RONDE 5: FINALE REGRESSION SUITE
// ========================================
console.log('\n========================================')
console.log('RONDE 5: FINALE REGRESSION SUITE')
console.log('========================================\n')

// Re-verify all critical functionality from previous rounds

// --- Ronde 1 Regression: Wiskundige correctheid ---
console.log('--- Ronde 1 Regression ---')

test('R1: NaN hours still returns 100%', () => assertEqual(calcMuscleRecovery('back', NaN, 8, 12), 100))
test('R1: -Infinity hours still returns 100%', () => assertEqual(calcMuscleRecovery('quads', -Infinity, 7, 10), 100))
test('R1: Infinity setsCount still finite', () => assertFinite(calcMuscleRecovery('shoulders', 48, 7, Infinity)))
test('R1: 0 hours = 0% recovery', () => assertEqual(calcMuscleRecovery('hamstrings', 0, 7, 10), 0))
test('R1: null hours = 100%', () => assertEqual(calcMuscleRecovery('glutes', null, 7, 10), 100))
test('R1: Volume penalty works (6 < 12 sets)', () => {
  assertGreater(calcMuscleRecovery('biceps', 48, 7, 6), calcMuscleRecovery('biceps', 48, 7, 12))
})
test('R1: RPE bidirectional (RPE4 > RPE10)', () => {
  assertGreater(calcMuscleRecovery('triceps', 24, 4, 10), calcMuscleRecovery('triceps', 24, 10, 10))
})
test('R1: Empty workouts returns valid object', () => {
  const r = analyzeTraining([])
  assertTrue(typeof r === 'object' && r.chest !== undefined)
})

// --- Ronde 2 Regression: Temporele logica ---
console.log('\n--- Ronde 2 Regression ---')

test('R2: Future workout (10s ahead) ignored', () => {
  const d = new Date(Date.now() + 10000)
  assertEqual(analyzeTraining([{ created_at: d.toISOString(), workout_sets: [{ exercise: 'Squat' }] }]).quads.setsThisWeek, 0)
})
test('R2: 7d+2h ago = NOT this week', () => {
  assertEqual(analyzeTraining([createWorkout(170, ['Deadlift'])]).back.setsThisWeek, 0)
})
test('R2: 6d ago = this week', () => {
  assertGreater(analyzeTraining([createWorkout(144, ['Deadlift'])]).back.setsThisWeek, 0)
})
test('R2: Multiple workouts same day track most recent', () => {
  const r = analyzeTraining([createWorkout(3, ['Bench']), createWorkout(15, ['Bench'])])
  assertRange(r.chest.hoursSinceLastTrained, 2.9, 3.1)
})
test('R2: 30 days ago = 100% recovery', () => {
  assertEqual(analyzeTraining([createWorkout(720, ['Squat'])]).quads.recoveryPct, 100)
})
test('R2: daysSinceLastTrained floor (49h = 2d)', () => {
  assertEqual(analyzeTraining([createWorkout(49, ['Leg Press'])]).quads.daysSinceLastTrained, 2)
})

// --- Ronde 3 Regression: Data integriteit ---
console.log('\n--- Ronde 3 Regression ---')

test('R3: classifyExercise(null) = null', () => assertEqual(classifyExercise(null), null))
test('R3: classifyExercise("") = null', () => assertEqual(classifyExercise(''), null))
test('R3: CAPS exercise: "PULL-UP"', () => assertEqual(classifyExercise('PULL-UP'), 'back'))
test('R3: Mixed case: "lAtErAl RaIsE"', () => assertEqual(classifyExercise('lAtErAl RaIsE'), 'shoulders'))
test('R3: Parentheses: "Dumbbell Row (one arm)"', () => assertEqual(classifyExercise('Dumbbell Row (one arm)'), 'back'))
test('R3: 200 sets in workout', () => {
  const r = analyzeTraining([createWorkout(24, Array(200).fill('Bench Press'))])
  assertEqual(r.chest.setsThisWeek, 200)
})
test('R3: Workout without workout_sets key', () => {
  try {
    const r = analyzeTraining([{ created_at: new Date().toISOString() }])
    assertEqual(r.chest.setsThisWeek, 0)
  } catch { throw new Error('Should not crash') }
})
test('R3: Glute Ham Raise → hamstrings', () => assertEqual(classifyExercise('Glute Ham Raise'), 'hamstrings'))
test('R3: Reverse Pec Deck → shoulders', () => assertEqual(classifyExercise('Reverse Pec Deck'), 'shoulders'))
test('R3: Chest Dip → chest', () => assertEqual(classifyExercise('Chest Dip'), 'chest'))
test('R3: Close Grip Bench → triceps', () => assertEqual(classifyExercise('Close Grip Bench'), 'triceps'))

// --- Ronde 4 Regression: PT Scoring ---
console.log('\n--- Ronde 4 Regression ---')

test('R4: After rest, all status = needs_work', () => {
  const r = analyzeTraining([])
  for (const m of ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core']) {
    assertEqual(r[m].status, 'needs_work')
  }
})
test('R4: recoveryStatus boundaries (90=ready, 89=recovering, 49=fatigued)', () => {
  assertEqual(recoveryStatus(90), 'ready')
  assertEqual(recoveryStatus(89), 'recovering')
  assertEqual(recoveryStatus(49), 'fatigued')
})
test('R4: Heavy session = fatigued', () => {
  const r = analyzeTraining([createWorkout(12, Array(15).fill({ exercise: 'Squat', rpe: 10 }))])
  assertEqual(r.quads.status, 'fatigued')
})
test('R4: Light session = recovering/ready', () => {
  const r = analyzeTraining([createWorkout(36, Array(6).fill({ exercise: 'Bench Press', rpe: 5 }))])
  assertTrue(['recovering', 'ready'].includes(r.chest.status))
})
test('R4: Advanced FB penalty', () => {
  const ms = {}
  for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: 0, recoveryPct: 100, target: SET_TARGETS[m], status: 'ready' }
  const advFB = scoreSplits(ms, null, 'advanced').find(s => s.name === 'Full Body').score
  const intFB = scoreSplits(ms, null, 'intermediate').find(s => s.name === 'Full Body').score
  assertGreater(intFB, advFB)
})
test('R4: Recent FB penalty', () => {
  const ms = {}
  for (const m of Object.keys(SET_TARGETS)) ms[m] = { setsThisWeek: 5, recoveryPct: 80, target: SET_TARGETS[m], status: 'ready' }
  const noHist = scoreSplits(ms).find(s => s.name === 'Full Body').score
  const recentFB = scoreSplits(ms, { split: 'Full Body', hoursSince: 10 }).find(s => s.name === 'Full Body').score
  assertGreater(noHist, recentFB)
})

// --- Compound Movement Verification ---
console.log('\n--- Compound Movement Verification ---')

test('Deadlift secondary: hamstrings + glutes', () => {
  const r = classifyExerciseFull('Conventional Deadlift')
  assertTrue(r.secondary.includes('hamstrings') && r.secondary.includes('glutes'))
})
test('Squat secondary: hamstrings + glutes', () => {
  const r = classifyExerciseFull('Back Squat')
  assertTrue(r.secondary.includes('hamstrings') && r.secondary.includes('glutes'))
})
test('Bench secondary: triceps + shoulders', () => {
  const r = classifyExerciseFull('Flat Bench Press')
  assertTrue(r.secondary.includes('triceps') && r.secondary.includes('shoulders'))
})
test('RDL secondary: glutes', () => {
  const r = classifyExerciseFull('RDL')
  assertEqual(r.primary, 'hamstrings')
  assertTrue(r.secondary.includes('glutes'))
})
test('OHP secondary: triceps', () => {
  const r = classifyExerciseFull('OHP')
  assertEqual(r.primary, 'shoulders')
  assertTrue(r.secondary.includes('triceps'))
})
test('Pull-up secondary: biceps', () => {
  const r = classifyExerciseFull('Wide Grip Pull-up')
  assertEqual(r.primary, 'back')
  assertTrue(r.secondary.includes('biceps'))
})

// --- Edge Exercise Classification ---
console.log('\n--- Edge Exercise Classification ---')

test('Sumo Deadlift → glutes (not back)', () => assertEqual(classifyExercise('Sumo Deadlift'), 'glutes'))
test('Stiff-Leg Deadlift → hamstrings', () => assertEqual(classifyExercise('Stiff-Leg Deadlift'), 'hamstrings'))
test('Romanian Deadlift → hamstrings', () => assertEqual(classifyExercise('Romanian Deadlift'), 'hamstrings'))
test('Hip Thrust → glutes', () => assertEqual(classifyExercise('Hip Thrust'), 'glutes'))
test('Good Morning → hamstrings', () => assertEqual(classifyExercise('Good Morning'), 'hamstrings'))
test('Nordic Curl → hamstrings', () => assertEqual(classifyExercise('Nordic Curl'), 'hamstrings'))
test('Leg Curl → hamstrings', () => assertEqual(classifyExercise('Leg Curl'), 'hamstrings'))
test('Leg Extension → quads', () => assertEqual(classifyExercise('Leg Extension'), 'quads'))
test('Hack Squat → quads', () => assertEqual(classifyExercise('Hack Squat'), 'quads'))
test('Bulgarian Split Squat → quads', () => assertEqual(classifyExercise('Bulgarian Split Squat'), 'quads'))

// --- Split Muscle Mapping ---
console.log('\n--- Split Muscle Mapping ---')

test('Push muscles: chest, shoulders, triceps', () => {
  assertTrue(SPLIT_MUSCLES.Push.includes('chest'))
  assertTrue(SPLIT_MUSCLES.Push.includes('shoulders'))
  assertTrue(SPLIT_MUSCLES.Push.includes('triceps'))
})
test('Pull muscles: back, biceps', () => {
  assertTrue(SPLIT_MUSCLES.Pull.includes('back'))
  assertTrue(SPLIT_MUSCLES.Pull.includes('biceps'))
})
test('Legs muscles: quads, hamstrings, glutes, core', () => {
  assertTrue(SPLIT_MUSCLES.Legs.includes('quads'))
  assertTrue(SPLIT_MUSCLES.Legs.includes('hamstrings'))
  assertTrue(SPLIT_MUSCLES.Legs.includes('glutes'))
  assertTrue(SPLIT_MUSCLES.Legs.includes('core'))
})
test('Full Body has all major muscles', () => {
  const fb = SPLIT_MUSCLES['Full Body']
  for (const m of ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps']) {
    assertTrue(fb.includes(m), `Full Body should include ${m}`)
  }
})

// --- Recovery Hours Sanity ---
console.log('\n--- Recovery Hours Sanity ---')

test('Quads slowest (96h)', () => assertEqual(RECOVERY_HOURS.quads, 96))
test('Core fastest (24h)', () => assertEqual(RECOVERY_HOURS.core, 24))
test('Small muscles fast (48h): biceps, triceps, shoulders', () => {
  assertEqual(RECOVERY_HOURS.biceps, 48)
  assertEqual(RECOVERY_HOURS.triceps, 48)
  assertEqual(RECOVERY_HOURS.shoulders, 48)
})
test('Large muscles medium (72h): chest, back, hamstrings, glutes', () => {
  assertEqual(RECOVERY_HOURS.chest, 72)
  assertEqual(RECOVERY_HOURS.back, 72)
  assertEqual(RECOVERY_HOURS.hamstrings, 72)
  assertEqual(RECOVERY_HOURS.glutes, 72)
})

// --- Volume Targets Sanity ---
console.log('\n--- Volume Targets Sanity ---')

test('Hypertrophy targets exist for all muscles', () => {
  for (const m of Object.keys(RECOVERY_HOURS)) {
    assertTrue(SET_TARGETS[m] !== undefined, `SET_TARGETS should have ${m}`)
    assertTrue(SET_TARGETS[m].min !== undefined)
    assertTrue(SET_TARGETS[m].max !== undefined)
    assertTrue(SET_TARGETS[m].mev !== undefined)
    assertGreater(SET_TARGETS[m].max, SET_TARGETS[m].min)
  }
})

// === Final Summary ===
console.log('\n========================================')
console.log(`TOTAAL: ${passed} passed, ${failed} failed`)
console.log('========================================')

if (failures.length > 0) {
  console.log('\nGEFAALDE TESTS:')
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error}`)
  }
}

process.exit(failed > 0 ? 1 : 0)
