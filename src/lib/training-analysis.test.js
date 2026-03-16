/**
 * KRAVEX TRAINING ANALYSIS — COMPREHENSIVE TEST SUITE
 * Ronde 1: Wiskundige correctheid
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
  // Should return array, not crash
  if (!Array.isArray(result)) throw new Error('Expected array')
})

test('analyzeTraining: empty workouts array', () => {
  const result = analyzeTraining([])
  if (typeof result !== 'object') throw new Error('Expected object')
})

// === 2. Floating Point Precision ===
console.log('\n--- Floating Point Precision ---')

test('setsThisWeek with compound movements should accumulate correctly', () => {
  // 0.5 + 0.5 + 0.5 should equal 1.5, not 1.4999999999
  const workouts = [{
    created_at: new Date().toISOString(),
    workout_sets: [
      { exercise: 'Deadlift' },
      { exercise: 'Squat' },
      { exercise: 'Barbell Row' },
    ]
  }]
  const result = analyzeTraining(workouts)
  // Deadlift -> back primary, hamstrings/glutes secondary (0.5 each)
  // Squat -> quads primary, hamstrings/glutes secondary (0.5 each)
  // Check hamstrings: 0.5 (from deadlift) + 0.5 (from squat) = 1.0
  const hamSets = result.hamstrings.setsThisWeek
  // Test for floating point errors
  if (Math.abs(hamSets - 1.0) > 0.001) {
    throw new Error(`Floating point error: expected 1.0, got ${hamSets}`)
  }
})

test('calcMuscleRecovery: RPE 4 should give faster recovery than RPE 10', () => {
  const recRPE4 = calcMuscleRecovery('chest', 24, 4, 10)
  const recRPE10 = calcMuscleRecovery('chest', 24, 10, 10)
  if (recRPE4 <= recRPE10) {
    throw new Error(`RPE 4 (${recRPE4}%) should recover faster than RPE 10 (${recRPE10}%)`)
  }
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

test('calcMuscleRecovery: negative hours should not break', () => {
  // Edge case: what if hoursSinceTrained is negative?
  const result = calcMuscleRecovery('chest', -5, 7, 10)
  assertNoNaN(result)
  assertFinite(result)
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
  // All splits should have negative scores due to penalties
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
  // Check that deficit calculation handles this correctly
  for (const split of result) {
    assertFinite(split.score)
  }
})

test('scoreSplits: setsThisWeek higher than max', () => {
  const muscleStatus = {}
  for (const m of Object.keys(SET_TARGETS)) {
    muscleStatus[m] = {
      setsThisWeek: SET_TARGETS[m].max * 3, // Way over
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

test('calcMuscleRecovery: NaN hours should not propagate', () => {
  const result = calcMuscleRecovery('chest', NaN, 7, 10)
  // NaN is not null/undefined, so it won't return 100
  // But it should not crash or propagate NaN
  if (Number.isNaN(result)) {
    throw new Error('NaN propagated to result')
  }
})

test('calcMuscleRecovery: NaN RPE should not propagate', () => {
  const result = calcMuscleRecovery('chest', 48, NaN, 10)
  assertNoNaN(result)
})

test('calcMuscleRecovery: NaN setsCount should not propagate', () => {
  const result = calcMuscleRecovery('chest', 48, 7, NaN)
  assertNoNaN(result)
})

// === 7. Mathematical Correctness ===
console.log('\n--- Mathematical Correctness ---')

test('Recovery at exactly baseHours should be ~100% (RPE 7, 6 sets)', () => {
  // At baseHours with RPE 7 and 6 sets (no volume penalty), should be ~100%
  const result = calcMuscleRecovery('chest', 72, 7, 6)
  assertRange(result, 95, 100, 'At base hours, should be ~100%')
})

test('Recovery at half baseHours should be ~50% (neutral conditions)', () => {
  const result = calcMuscleRecovery('chest', 36, 7, 6)
  assertRange(result, 45, 55, 'At half base hours')
})

test('Volume penalty: 12 sets vs 6 sets', () => {
  // 12 sets = 6 extra sets * 0.08 = 48% more time needed
  const rec6 = calcMuscleRecovery('chest', 48, 7, 6)
  const rec12 = calcMuscleRecovery('chest', 48, 7, 12)
  if (rec6 <= rec12) {
    throw new Error(`6 sets (${rec6}%) should recover faster than 12 sets (${rec12}%)`)
  }
})

test('RPE multiplier: RPE 7 gives rpeMult = 1.0', () => {
  // At RPE 7, rpeMult should be exactly 1.0 (no change)
  const recRPE6 = calcMuscleRecovery('chest', 48, 6, 10)
  const recRPE7 = calcMuscleRecovery('chest', 48, 7, 10)
  const recRPE8 = calcMuscleRecovery('chest', 48, 8, 10)
  // RPE 6 should be higher than RPE 7, which should be higher than RPE 8
  if (recRPE6 <= recRPE7 || recRPE7 <= recRPE8) {
    throw new Error(`Expected RPE6 (${recRPE6}) > RPE7 (${recRPE7}) > RPE8 (${recRPE8})`)
  }
})

// === 8. Infinity Tests ===
console.log('\n--- Infinity Handling ---')

test('calcMuscleRecovery: Infinity hours', () => {
  const result = calcMuscleRecovery('chest', Infinity, 7, 10)
  // Should be capped at 100
  assertEqual(result, 100)
})

test('calcMuscleRecovery: -Infinity hours', () => {
  const result = calcMuscleRecovery('chest', -Infinity, 7, 10)
  assertFinite(result)
})

test('calcMuscleRecovery: Infinity setsCount', () => {
  const result = calcMuscleRecovery('chest', 48, 7, Infinity)
  // Should not crash — Infinity is treated as invalid, defaults to 0 sets
  assertFinite(result)
  assertNoNaN(result)
  assertRange(result, 0, 100)
})

// === 9. Zero Edge Cases ===
console.log('\n--- Zero Edge Cases ---')

test('setsLastSession = 0, hoursSinceTrained = 48: should still calculate', () => {
  const result = calcMuscleRecovery('chest', 48, 7, 0)
  // 0 sets means no volume penalty, should recover normally
  assertRange(result, 60, 75, '48h with 0 sets')
})

test('All zeros: hoursSinceTrained=0, RPE=0, setsCount=0', () => {
  const result = calcMuscleRecovery('chest', 0, 0, 0)
  assertNoNaN(result)
  assertFinite(result)
  // Just trained = 0% recovery
  assertEqual(result, 0)
})

// === Summary ===
console.log('\n========================================')
console.log(`RONDE 1 RESULTAAT: ${passed} passed, ${failed} failed`)
console.log('========================================')

if (failures.length > 0) {
  console.log('\nGEFAALDE TESTS:')
  for (const f of failures) {
    console.log(`  - ${f.name}: ${f.error}`)
  }
}

process.exit(failed > 0 ? 1 : 0)
