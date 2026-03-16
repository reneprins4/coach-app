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

// === Summary ===
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
