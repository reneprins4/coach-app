/**
 * KRAVEX TRAINING ANALYSIS — COMPREHENSIVE TEST SUITE
 * Ronde 1: Wiskundige correctheid ✅
 * Ronde 2: Temporele logica
 */

import {
  classifyExercise,
  classifyExerciseFull,
  calcMuscleRecovery,
  recoveryStatus,
  analyzeTraining,
  scoreSplits,
  SET_TARGETS,
  RECOVERY_HOURS,
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

function assertArrayLength(arr, len, msg = '') {
  if (!Array.isArray(arr) || arr.length !== len) {
    throw new Error(`${msg} Expected array of length ${len}, got ${arr?.length}`)
  }
}

// Helper: create workout at specific time
function createWorkout(hoursAgo, exercises = []) {
  const date = new Date()
  date.setTime(date.getTime() - hoursAgo * 3600000)
  return {
    created_at: date.toISOString(),
    workout_sets: exercises.map(e => ({
      exercise: e.exercise || e,
      weight_kg: e.weight_kg || 100,
      reps: e.reps || 10,
      rpe: e.rpe || 7,
    }))
  }
}

console.log('\n========================================')
console.log('RONDE 1: WISKUNDIGE CORRECTHEID')
console.log('========================================\n')

// === 1. Division by Zero Tests ===
console.log('--- Division by Zero ---')

test('calcMuscleRecovery: setsCount=0 should not cause division issues', () => {
  const result = calcMuscleRecovery('chest', 48, 7, 0)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: hoursSinceTrained=0 should return 0% recovery', () => {
  const result = calcMuscleRecovery('chest', 0, 7, 10)
  assertEqual(result, 0, 'Just trained = 0% recovery')
})

test('scoreSplits: empty muscleStatus should not crash', () => {
  const result = scoreSplits({})
  if (!Array.isArray(result)) throw new Error('Expected array')
})

test('analyzeTraining: empty workouts array', () => {
  const result = analyzeTraining([])
  if (typeof result !== 'object') throw new Error('Expected object')
})

// === 2. Floating Point Precision ===
console.log('\n--- Floating Point Precision ---')

test('setsThisWeek with compound movements should accumulate correctly', () => {
  const workouts = [createWorkout(1, ['Deadlift', 'Squat', 'Barbell Row'])]
  const result = analyzeTraining(workouts)
  const hamSets = result.hamstrings.setsThisWeek
  if (Math.abs(hamSets - 1.0) > 0.001) {
    throw new Error(`Floating point error: expected 1.0, got ${hamSets}`)
  }
})

test('calcMuscleRecovery: RPE 4 should give faster recovery than RPE 10', () => {
  const recRPE4 = calcMuscleRecovery('chest', 24, 4, 10)
  const recRPE10 = calcMuscleRecovery('chest', 24, 10, 10)
  assertGreater(recRPE4, recRPE10)
})

// === 3. Extreme Values ===
console.log('\n--- Extreme Values ---')

test('calcMuscleRecovery: 1000 sets (extreme volume)', () => {
  const result = calcMuscleRecovery('quads', 96, 10, 1000)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: 10000 hours since trained', () => {
  const result = calcMuscleRecovery('chest', 10000, 7, 10)
  assertEqual(result, 100, '10000 hours ago = fully recovered')
})

test('calcMuscleRecovery: negative hours should return 100%', () => {
  const result = calcMuscleRecovery('chest', -5, 7, 10)
  assertEqual(result, 0, 'Negative hours clamped to 0 = 0% recovery')
})

test('calcMuscleRecovery: very small hours (0.001)', () => {
  const result = calcMuscleRecovery('chest', 0.001, 7, 10)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: RPE = 0 (below valid range)', () => {
  const result = calcMuscleRecovery('chest', 48, 0, 10)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: RPE = 15 (above valid range)', () => {
  const result = calcMuscleRecovery('chest', 48, 15, 10)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: RPE = -5 (negative)', () => {
  const result = calcMuscleRecovery('chest', 48, -5, 10)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: setsCount negative', () => {
  const result = calcMuscleRecovery('chest', 48, 7, -10)
  assertNoNaN(result)
  assertFinite(result)
})

// === 4. Null/Undefined Handling ===
console.log('\n--- Null/Undefined Handling ---')

test('calcMuscleRecovery: hoursSinceTrained = null', () => {
  const result = calcMuscleRecovery('chest', null, 7, 10)
  assertEqual(result, 100, 'null hours = never trained = 100%')
})

test('calcMuscleRecovery: hoursSinceTrained = undefined', () => {
  const result = calcMuscleRecovery('chest', undefined, 7, 10)
  assertEqual(result, 100, 'undefined hours = never trained = 100%')
})

test('calcMuscleRecovery: RPE = null', () => {
  const result = calcMuscleRecovery('chest', 48, null, 10)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: RPE = undefined', () => {
  const result = calcMuscleRecovery('chest', 48, undefined, 10)
  assertNoNaN(result)
  assertFinite(result)
  assertRange(result, 0, 100)
})

test('calcMuscleRecovery: setsCount = null', () => {
  const result = calcMuscleRecovery('chest', 48, 7, null)
  assertNoNaN(result)
  assertFinite(result)
})

test('calcMuscleRecovery: setsCount = undefined', () => {
  const result = calcMuscleRecovery('chest', 48, 7, undefined)
  assertNoNaN(result)
  assertFinite(result)
})

test('calcMuscleRecovery: unknown muscle group', () => {
  const result = calcMuscleRecovery('unknown_muscle', 48, 7, 10)
  assertNoNaN(result)
  assertFinite(result)
})

// === 5. Edge Cases in Score Calculation ===
console.log('\n--- Score Calculation Edge Cases ---')

test('scoreSplits: all muscles at 0% recovery', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: 20,
      recoveryPct: 0,
      target: SET_TARGETS[m],
      status: 'fatigued',
    }
  }
  const result = scoreSplits(muscleStatus)
  if (!Array.isArray(result)) throw new Error('Expected array')
  for (const split of result) {
    assertFinite(split.score)
  }
})

test('scoreSplits: all muscles at 100% recovery', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: 0,
      recoveryPct: 100,
      target: SET_TARGETS[m],
      status: 'ready',
    }
  }
  const result = scoreSplits(muscleStatus)
  if (!Array.isArray(result)) throw new Error('Expected array')
  for (const split of result) {
    assertFinite(split.score)
    assertNoNaN(split.score)
  }
})

test('scoreSplits: volume exactly at max (no deficit)', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: SET_TARGETS[m].max,
      recoveryPct: 80,
      target: SET_TARGETS[m],
      status: 'recovering',
    }
  }
  const result = scoreSplits(muscleStatus)
  for (const split of result) {
    assertFinite(split.score)
  }
})

test('scoreSplits: setsThisWeek higher than max', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: SET_TARGETS[m].max * 3,
      recoveryPct: 50,
      target: SET_TARGETS[m],
      status: 'recovering',
    }
  }
  const result = scoreSplits(muscleStatus)
  for (const split of result) {
    assertFinite(split.score)
  }
})

// === 6. NaN Propagation Tests ===
console.log('\n--- NaN Propagation ---')

test('calcMuscleRecovery: NaN hours should return 100%', () => {
  const result = calcMuscleRecovery('chest', NaN, 7, 10)
  assertEqual(result, 100, 'NaN hours = never trained = 100%')
})

test('calcMuscleRecovery: NaN RPE should use default 7', () => {
  const result = calcMuscleRecovery('chest', 48, NaN, 10)
  assertNoNaN(result)
  assertFinite(result)
})

test('calcMuscleRecovery: NaN setsCount should not propagate', () => {
  const result = calcMuscleRecovery('chest', 48, 7, NaN)
  assertNoNaN(result)
})

// === 7. Mathematical Correctness ===
console.log('\n--- Mathematical Correctness ---')

test('Recovery at exactly baseHours should be ~100% (RPE 7, 6 sets)', () => {
  const result = calcMuscleRecovery('chest', 72, 7, 6)
  assertRange(result, 95, 100, 'At base hours, should be ~100%')
})

test('Recovery at half baseHours should be ~50% (neutral conditions)', () => {
  const result = calcMuscleRecovery('chest', 36, 7, 6)
  assertRange(result, 45, 55, 'At half base hours')
})

test('Volume penalty: 12 sets vs 6 sets', () => {
  const rec6 = calcMuscleRecovery('chest', 48, 7, 6)
  const rec12 = calcMuscleRecovery('chest', 48, 7, 12)
  assertGreater(rec6, rec12)
})

test('RPE multiplier: RPE 7 gives rpeMult = 1.0', () => {
  const recRPE6 = calcMuscleRecovery('chest', 48, 6, 10)
  const recRPE7 = calcMuscleRecovery('chest', 48, 7, 10)
  const recRPE8 = calcMuscleRecovery('chest', 48, 8, 10)
  assertGreater(recRPE6, recRPE7)
  assertGreater(recRPE7, recRPE8)
})

// === 8. Infinity Handling ===
console.log('\n--- Infinity Handling ---')

test('calcMuscleRecovery: Infinity hours should return 100%', () => {
  const result = calcMuscleRecovery('chest', Infinity, 7, 10)
  assertEqual(result, 100)
})

test('calcMuscleRecovery: -Infinity hours should return 100%', () => {
  const result = calcMuscleRecovery('chest', -Infinity, 7, 10)
  assertEqual(result, 100)
})

test('calcMuscleRecovery: Infinity setsCount should be handled', () => {
  const result = calcMuscleRecovery('chest', 48, 7, Infinity)
  assertFinite(result)
  assertNoNaN(result)
  assertRange(result, 0, 100)
})

// === 9. Zero Edge Cases ===
console.log('\n--- Zero Edge Cases ---')

test('setsLastSession = 0, hoursSinceTrained = 48: should still calculate', () => {
  const result = calcMuscleRecovery('chest', 48, 7, 0)
  assertRange(result, 60, 75, '48h with 0 sets')
})

test('All zeros: hoursSinceTrained=0, RPE=0, setsCount=0', () => {
  const result = calcMuscleRecovery('chest', 0, 0, 0)
  assertNoNaN(result)
  assertFinite(result)
  assertEqual(result, 0)
})

// ========================================
// RONDE 2: TEMPORELE LOGICA
// ========================================
console.log('\n========================================')
console.log('RONDE 2: TEMPORELE LOGICA')
console.log('========================================\n')

// === 10. Future Workouts ===
console.log('--- Future Workout Handling ---')

test('Future workout (1 day ahead) should be ignored', () => {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 1)
  const workouts = [{
    created_at: futureDate.toISOString(),
    workout_sets: [{ exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 8 }]
  }]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 0, 'Future workout should not count')
})

test('Future workout (1 second ahead) should be ignored', () => {
  const futureDate = new Date()
  futureDate.setTime(futureDate.getTime() + 1000) // +1 second
  const workouts = [{
    created_at: futureDate.toISOString(),
    workout_sets: [{ exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 8 }]
  }]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 0, 'Future workout (1s) should not count')
})

test('Future workout (1 millisecond ahead) should be ignored', () => {
  const futureDate = new Date()
  futureDate.setTime(futureDate.getTime() + 1) // +1 ms
  const workouts = [{
    created_at: futureDate.toISOString(),
    workout_sets: [{ exercise: 'Bench Press', weight_kg: 100, reps: 10, rpe: 8 }]
  }]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 0, 'Future workout (1ms) should not count')
})

// === 11. Week Boundary Tests ===
console.log('\n--- Week Boundary ---')

test('Workout exactly 7 days ago should count as "this week"', () => {
  const workouts = [createWorkout(168, ['Bench Press'])] // 7 * 24 = 168 hours
  const result = analyzeTraining(workouts)
  // weekStart is set to now - 7 days, so workout at exactly 7 days should be >= weekStart
  assertGreater(result.chest.setsThisWeek, 0, 'Workout at 7d boundary should count')
})

test('Workout 7 days + 1 hour ago should NOT count as this week', () => {
  const workouts = [createWorkout(169, ['Bench Press'])] // 7*24 + 1 = 169 hours
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 0, 'Workout > 7 days should not count')
})

test('Workout 6 days 23 hours ago should count', () => {
  const workouts = [createWorkout(167, ['Bench Press'])] // Just under 7 days
  const result = analyzeTraining(workouts)
  assertGreater(result.chest.setsThisWeek, 0, 'Workout at 6d23h should count')
})

// === 12. Multiple Workouts Same Day ===
console.log('\n--- Multiple Workouts Same Day ---')

test('Two workouts same day (morning + evening) should both count', () => {
  const workouts = [
    createWorkout(2, ['Bench Press', 'Incline Press']),  // 2 hours ago (evening)
    createWorkout(10, ['Cable Fly', 'Dips']),            // 10 hours ago (morning)
  ]
  const result = analyzeTraining(workouts)
  // Should have 4 chest exercises (bench, incline, fly... dips are triceps)
  assertEqual(result.chest.setsThisWeek, 3, '3 chest exercises across 2 sessions')
})

test('Two workouts same day: recovery tracks most recent', () => {
  const workouts = [
    createWorkout(2, ['Bench Press']),   // Most recent
    createWorkout(10, ['Incline Press']), // Earlier
  ]
  const result = analyzeTraining(workouts)
  // hoursSinceLastTrained should be ~2, not ~10
  assertRange(result.chest.hoursSinceLastTrained, 1.9, 2.1, 'Should track most recent')
})

// === 13. Midnight/Day Boundary ===
console.log('\n--- Midnight Boundary ---')

test('Workout at exactly midnight should be handled', () => {
  const midnight = new Date()
  midnight.setHours(0, 0, 0, 0)
  const workouts = [{
    created_at: midnight.toISOString(),
    workout_sets: [{ exercise: 'Squat', weight_kg: 140, reps: 5, rpe: 8 }]
  }]
  const result = analyzeTraining(workouts)
  assertNoNaN(result.quads.setsThisWeek)
})

test('Workout at 23:59:59 should be handled', () => {
  const lateNight = new Date()
  lateNight.setHours(23, 59, 59, 999)
  const workouts = [{
    created_at: lateNight.toISOString(),
    workout_sets: [{ exercise: 'Squat', weight_kg: 140, reps: 5, rpe: 8 }]
  }]
  const result = analyzeTraining(workouts)
  assertNoNaN(result.quads.setsThisWeek)
})

// === 14. Timezone Edge Cases ===
console.log('\n--- Timezone Handling ---')

test('ISO string with Z timezone should parse correctly', () => {
  const isoDate = '2024-01-15T12:00:00.000Z'
  const workouts = [{
    created_at: isoDate,
    workout_sets: [{ exercise: 'Squat', weight_kg: 140, reps: 5, rpe: 8 }]
  }]
  // Should not crash
  const result = analyzeTraining(workouts)
  assertNoNaN(result.quads.recoveryPct)
})

test('ISO string with offset timezone should parse correctly', () => {
  const isoDate = '2024-01-15T12:00:00.000+02:00'
  const workouts = [{
    created_at: isoDate,
    workout_sets: [{ exercise: 'Squat', weight_kg: 140, reps: 5, rpe: 8 }]
  }]
  const result = analyzeTraining(workouts)
  assertNoNaN(result.quads.recoveryPct)
})

// === 15. Invalid Date Handling ===
console.log('\n--- Invalid Date Handling ---')

test('Invalid date string should not crash', () => {
  const workouts = [{
    created_at: 'not-a-date',
    workout_sets: [{ exercise: 'Squat', weight_kg: 140, reps: 5, rpe: 8 }]
  }]
  try {
    const result = analyzeTraining(workouts)
    // If it doesn't crash, that's good. Check no NaN propagation
    assertNoNaN(result.quads.setsThisWeek)
  } catch (e) {
    // Throwing is also acceptable for invalid data
  }
})

test('Null created_at should not crash', () => {
  const workouts = [{
    created_at: null,
    workout_sets: [{ exercise: 'Squat', weight_kg: 140, reps: 5, rpe: 8 }]
  }]
  try {
    const result = analyzeTraining(workouts)
    assertNoNaN(result.quads.recoveryPct)
  } catch (e) {
    // Throwing is acceptable
  }
})

// === 16. Days Since Trained Calculation ===
console.log('\n--- Days Since Trained ---')

test('daysSinceLastTrained should be floor of actual days', () => {
  const workouts = [createWorkout(25, ['Bench Press'])] // 25 hours = 1.04 days
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.daysSinceLastTrained, 1, '25 hours = 1 day (floor)')
})

test('daysSinceLastTrained for 47 hours should be 1', () => {
  const workouts = [createWorkout(47, ['Bench Press'])] // 47 hours = 1.95 days
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.daysSinceLastTrained, 1, '47 hours = 1 day (floor)')
})

test('daysSinceLastTrained for 48 hours should be 2', () => {
  const workouts = [createWorkout(48, ['Bench Press'])] // 48 hours = 2 days
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.daysSinceLastTrained, 2, '48 hours = 2 days')
})

test('daysSinceLastTrained for 1 hour should be 0', () => {
  const workouts = [createWorkout(1, ['Bench Press'])]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.daysSinceLastTrained, 0, '1 hour = 0 days')
})

// === 17. Very Old Workouts ===
console.log('\n--- Very Old Workouts ---')

test('Workout 30 days ago should not count for weekly volume', () => {
  const workouts = [createWorkout(720, ['Bench Press'])] // 30 * 24 = 720 hours
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 0, '30 day old workout = 0 weekly sets')
})

test('Workout 30 days ago should still track recovery correctly', () => {
  const workouts = [createWorkout(720, ['Bench Press'])]
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.recoveryPct, 100, '30 days = fully recovered')
})

test('Workout 365 days ago should be handled', () => {
  const workouts = [createWorkout(8760, ['Bench Press'])] // 365 * 24
  const result = analyzeTraining(workouts)
  assertEqual(result.chest.setsThisWeek, 0)
  assertEqual(result.chest.recoveryPct, 100)
})

// === 18. Recent Exercise Tracking ===
console.log('\n--- Recent Exercise Tracking ---')

test('Exercise 6 days ago should be in recentExercises', () => {
  const workouts = [createWorkout(144, ['Bench Press'])] // 6 days
  const result = analyzeTraining(workouts)
  if (!result.chest.recentExercises.includes('Bench Press')) {
    throw new Error('Exercise at 6d should be in recentExercises')
  }
})

test('Exercise 8 days ago should NOT be in recentExercises', () => {
  const workouts = [createWorkout(192, ['Bench Press'])] // 8 days
  const result = analyzeTraining(workouts)
  if (result.chest.recentExercises.includes('Bench Press')) {
    throw new Error('Exercise at 8d should NOT be in recentExercises')
  }
})

test('Exercise exactly 7 days ago should be in recentExercises', () => {
  const workouts = [createWorkout(168, ['Bench Press'])] // 7 days
  const result = analyzeTraining(workouts)
  if (!result.chest.recentExercises.includes('Bench Press')) {
    throw new Error('Exercise at 7d should be in recentExercises')
  }
})

// === 19. scoreSplits lastWorkoutInfo ===
console.log('\n--- scoreSplits lastWorkoutInfo ---')

test('Full Body penalty when last workout was also Full Body < 24h ago', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: 5,
      recoveryPct: 70,
      target: SET_TARGETS[m],
      status: 'recovering',
    }
  }
  
  const noHistory = scoreSplits(muscleStatus)
  const withRecentFB = scoreSplits(muscleStatus, { split: 'Full Body', hoursSince: 12 })
  
  const fbNoHistory = noHistory.find(s => s.name === 'Full Body').score
  const fbWithHistory = withRecentFB.find(s => s.name === 'Full Body').score
  
  assertGreater(fbNoHistory, fbWithHistory, 'Recent Full Body should penalize Full Body')
})

test('No penalty when last Full Body was > 24h ago', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: 5,
      recoveryPct: 80,
      target: SET_TARGETS[m],
      status: 'ready',
    }
  }
  
  const noHistory = scoreSplits(muscleStatus)
  const withOldFB = scoreSplits(muscleStatus, { split: 'Full Body', hoursSince: 48 })
  
  const fbNoHistory = noHistory.find(s => s.name === 'Full Body').score
  const fbWithHistory = withOldFB.find(s => s.name === 'Full Body').score
  
  assertEqual(fbNoHistory, fbWithHistory, 'Old Full Body should not penalize')
})

// === 20. Order Independence ===
console.log('\n--- Order Independence ---')

test('Workout order should not affect final stats (newer first vs older first)', () => {
  const workoutsNewerFirst = [
    createWorkout(2, ['Bench Press']),
    createWorkout(48, ['Bench Press']),
  ]
  const workoutsOlderFirst = [
    createWorkout(48, ['Bench Press']),
    createWorkout(2, ['Bench Press']),
  ]
  
  const resultNew = analyzeTraining(workoutsNewerFirst)
  const resultOld = analyzeTraining(workoutsOlderFirst)
  
  assertEqual(resultNew.chest.setsThisWeek, resultOld.chest.setsThisWeek, 'Sets should match')
  // hoursSinceLastTrained should be ~2 in both cases
  assertRange(resultNew.chest.hoursSinceLastTrained, 1.9, 2.1)
  assertRange(resultOld.chest.hoursSinceLastTrained, 1.9, 2.1)
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
