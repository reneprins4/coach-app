/**
 * PT Team Testing - Training Analysis Personas
 * Test alle 12 personas en specifieke bug checks
 */

import { 
  analyzeTraining, 
  scoreSplits, 
  classifyExercise, 
  classifyExerciseFull,
  calcMuscleRecovery 
} from './src/lib/training-analysis.js';

// Helper: create workout object
function createWorkout(date, sets, defaultRPE = null) {
  return {
    created_at: date.toISOString(),
    workout_sets: sets.map(s => ({
      exercise: s.exercise,
      weight_kg: s.weight || 0,
      reps: s.reps || 10,
      rpe: s.rpe !== undefined ? s.rpe : defaultRPE,
    }))
  };
}

// Helper: generate sets for exercises
function generateSets(exercises, setsPerExercise = 3, defaultRPE = 7) {
  const sets = [];
  for (const ex of exercises) {
    for (let i = 0; i < setsPerExercise; i++) {
      sets.push({ exercise: ex, reps: 10, rpe: defaultRPE });
    }
  }
  return sets;
}

// Helper: create date relative to now
function daysAgo(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
}

const results = [];
let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
  if (condition) {
    passed++;
    results.push({ name, status: '✅', details });
  } else {
    failed++;
    results.push({ name, status: '❌', details });
  }
}

console.log('='.repeat(60));
console.log('🏋️ PT TEAM TESTING - KRAVEX FITNESS APP');
console.log('='.repeat(60));

// ============================================================
// GROEP A: NIEUWE GEBRUIKERS (dag 1-14)
// ============================================================

console.log('\n📋 GROEP A: NIEUWE GEBRUIKERS\n');

// A1: Absolute beginner — dag 1 (nul history)
console.log('--- A1: Absolute beginner ---');
const a1 = analyzeTraining([]);
const a1Splits = scoreSplits(a1);
console.log('Muscle status:', Object.entries(a1).map(([m, s]) => `${m}: ${s.status}`).join(', '));
console.log('Top splits:', a1Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

const a1AllNeedsWork = Object.values(a1).every(s => s.status === 'needs_work');
const a1NoFatigued = Object.values(a1).every(s => s.status !== 'fatigued');
test('A1: Alle spieren needs_work', a1AllNeedsWork, `Status: ${Object.values(a1).map(s => s.status).join(', ')}`);
test('A1: Geen fatigued spieren', a1NoFatigued);

// A2: Beginner — eerste workout ooit (24u geleden)
console.log('\n--- A2: Beginner - eerste workout 24u geleden ---');
const a2Exercises = ['Squat', 'Bench Press', 'Bent Over Row', 'Shoulder Press', 'Bicep Curl'];
const a2Workouts = [
  createWorkout(daysAgo(1), generateSets(a2Exercises, 2, 6))
];
const a2 = analyzeTraining(a2Workouts);
const a2Splits = scoreSplits(a2);
console.log('Muscle status:', Object.entries(a2).map(([m, s]) => `${m}: ${s.recoveryPct}% (${s.status})`).join(', '));
console.log('Top splits:', a2Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

// Quads na 24u bij 96u herstel = 25% recovery → fatigued
const a2QuadsFatigued = a2.quads.status === 'fatigued' || a2.quads.recoveryPct < 50;
const a2TopNotLegs = a2Splits[0].name !== 'Legs';
test('A2: Quads fatigued/recovering (96u herstel)', a2QuadsFatigued, `Quads: ${a2.quads.recoveryPct}%`);
test('A2: Top split is NIET Legs', a2TopNotLegs, `Top: ${a2Splits[0].name}`);

// A3: Beginner — na 3 workouts in eerste week
console.log('\n--- A3: Beginner - 3 workouts deze week ---');
const a3Exercises = ['Squat', 'Bench Press', 'Bent Over Row', 'Shoulder Press', 'Bicep Curl', 'Deadlift'];
const a3Workouts = [
  createWorkout(daysAgo(1), generateSets(a3Exercises, 3, 6)),   // Vrijdag (gisteren)
  createWorkout(daysAgo(3), generateSets(a3Exercises, 3, 6)),   // Woensdag
  createWorkout(daysAgo(5), generateSets(a3Exercises, 3, 6)),   // Maandag
];
const a3 = analyzeTraining(a3Workouts);
const a3Splits = scoreSplits(a3);
console.log('Sets this week:', Object.entries(a3).map(([m, s]) => `${m}: ${s.setsThisWeek}`).join(', '));
console.log('Top splits:', a3Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

// 3 workouts x 3 sets per exercise = 9 sets direct + compound overlap
const a3ChestSets = a3.chest.setsThisWeek;
test('A3: Weekly sets correct geteld', a3ChestSets >= 9, `Chest sets: ${a3ChestSets}`);

// A4: Enthousiaste starter — overtraind in week 1
console.log('\n--- A4: Overtraining detectie ---');
const a4Exercises = ['Squat', 'Bench Press', 'Bent Over Row', 'Shoulder Press', 'Bicep Curl', 'Deadlift', 'Leg Press', 'Pull Up'];
const a4Workouts = [
  createWorkout(daysAgo(1), generateSets(a4Exercises, 4, 8)),   // Vrijdag
  createWorkout(daysAgo(2), generateSets(a4Exercises, 4, 8)),   // Donderdag
  createWorkout(daysAgo(3), generateSets(a4Exercises, 4, 8)),   // Woensdag
  createWorkout(daysAgo(4), generateSets(a4Exercises, 4, 8)),   // Dinsdag
  createWorkout(daysAgo(5), generateSets(a4Exercises, 4, 8)),   // Maandag
];
const a4 = analyzeTraining(a4Workouts);
const a4Splits = scoreSplits(a4);
console.log('Muscle status:', Object.entries(a4).map(([m, s]) => `${m}: ${s.recoveryPct}% (${s.status})`).join(', '));
console.log('Top splits:', a4Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

const a4FatiguedCount = Object.values(a4).filter(s => s.status === 'fatigued').length;
const a4AllScoresLow = a4Splits.every(s => s.score < 20); // Overtraining = low scores
test('A4: Meerdere spieren fatigued', a4FatiguedCount >= 4, `Fatigued: ${a4FatiguedCount}/9`);
test('A4: Alle split scores laag (overtraining)', a4AllScoresLow || a4Splits[0].score < 30, `Top score: ${a4Splits[0].score}`);

// A5: Starter met inconsistente data
console.log('\n--- A5: Inconsistente data ---');
const a5Workouts = [
  createWorkout(daysAgo(1), [
    { exercise: 'Deadlift', reps: 5, rpe: 8 },
    { exercise: 'Deadlift', reps: 5, rpe: 8 },
  ]),
  createWorkout(daysAgo(3), [
    { exercise: 'Bench Press', reps: 10, rpe: 7 },
    { exercise: 'Bench Press', reps: 10, rpe: 7 },
    { exercise: 'Bench Press', reps: 10, rpe: 7 },
    { exercise: 'Bench Press', reps: 10, rpe: 7 },
  ]),
  createWorkout(daysAgo(5), [
    { exercise: 'Squat', reps: 8, rpe: null },  // No RPE!
    { exercise: 'Squat', reps: 8, rpe: null },
    { exercise: 'Squat', reps: 8, rpe: null },
  ]),
];
let a5Crashed = false;
let a5;
try {
  a5 = analyzeTraining(a5Workouts);
  console.log('Processed successfully:', Object.entries(a5).map(([m, s]) => `${m}: ${s.recoveryPct}%`).join(', '));
} catch (e) {
  a5Crashed = true;
  console.log('CRASHED:', e.message);
}
test('A5: Geen crash bij partial data', !a5Crashed);
test('A5: Null RPE handled gracefully', a5 && a5.quads.avgRpeLastSession === null, `Quads RPE: ${a5?.quads?.avgRpeLastSession}`);

// A6: Iemand die alleen Push traint
console.log('\n--- A6: Push-only trainer (imbalance) ---');
const a6Workouts = [];
for (let i = 0; i < 7; i++) {
  a6Workouts.push(createWorkout(daysAgo(i), [
    ...Array(5).fill({ exercise: 'Bench Press', reps: 10, rpe: 8 }),
    ...Array(5).fill({ exercise: 'Overhead Press', reps: 10, rpe: 8 }),
  ]));
}
const a6 = analyzeTraining(a6Workouts);
const a6Splits = scoreSplits(a6);
console.log('Sets this week:', Object.entries(a6).map(([m, s]) => `${m}: ${s.setsThisWeek}`).join(', '));
console.log('Top splits:', a6Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

const a6PushFatigued = a6.chest.status === 'fatigued' && a6.shoulders.status === 'fatigued';
const a6TopIsPullOrLegs = ['Pull', 'Legs'].includes(a6Splits[0].name);
test('A6: Push spieren fatigued', a6PushFatigued, `Chest: ${a6.chest.status}, Shoulders: ${a6.shoulders.status}`);
test('A6: Pull of Legs aanbevolen (niet Push)', a6TopIsPullOrLegs, `Top: ${a6Splits[0].name}`);

// ============================================================
// GROEP B: LANGDURIGE GEBRUIKERS (4+ weken data)
// ============================================================

console.log('\n📋 GROEP B: LANGDURIGE GEBRUIKERS\n');

// B1: Consistent PPL-atleet — 8 weken data
console.log('--- B1: 8-weeks PPL atleet ---');
const b1Workouts = [];
const pushExercises = ['Bench Press', 'Overhead Press', 'Cable Fly', 'Tricep Pushdown'];
const pullExercises = ['Deadlift', 'Barbell Row', 'Lat Pulldown', 'Bicep Curl'];
const legExercises = ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl'];

// 8 weken PPL, 2x per week (48 workouts)
for (let week = 0; week < 8; week++) {
  const weekStart = week * 7;
  // Ma: Push, Di: Pull, Wo: Legs, Do: Push, Vr: Pull, Za: Legs
  b1Workouts.push(createWorkout(daysAgo(weekStart + 6), generateSets(pushExercises, 3, 7)));  // Ma
  b1Workouts.push(createWorkout(daysAgo(weekStart + 5), generateSets(pullExercises, 3, 7)));  // Di
  b1Workouts.push(createWorkout(daysAgo(weekStart + 4), generateSets(legExercises, 3, 7)));   // Wo
  b1Workouts.push(createWorkout(daysAgo(weekStart + 3), generateSets(pushExercises, 3, 8)));  // Do
  b1Workouts.push(createWorkout(daysAgo(weekStart + 2), generateSets(pullExercises, 3, 8)));  // Vr
  b1Workouts.push(createWorkout(daysAgo(weekStart + 1), generateSets(legExercises, 3, 8)));   // Za (gisteren)
}
// Sorteer zodat meest recente eerst is
b1Workouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const b1 = analyzeTraining(b1Workouts);
const b1Splits = scoreSplits(b1);
console.log('Sets this week:', Object.entries(b1).map(([m, s]) => `${m}: ${s.setsThisWeek}`).join(', '));
console.log('Recovery:', Object.entries(b1).map(([m, s]) => `${m}: ${s.recoveryPct}%`).join(', '));
console.log('Top splits:', b1Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

// Gisteren was Legs, dus Legs zou laag moeten scoren
const b1LegsNotTop = b1Splits[0].name !== 'Legs';
const b1PushOrPullTop = ['Push', 'Pull'].includes(b1Splits[0].name);
test('B1: Legs niet top split (net getraind)', b1LegsNotTop, `Top: ${b1Splits[0].name}`);
test('B1: Push of Pull aanbevolen', b1PushOrPullTop, `Top: ${b1Splits[0].name}`);

// B2: Powerlifter — 12 weken strength focus
console.log('\n--- B2: Powerlifter (12 weken) ---');
const b2Workouts = [];
for (let week = 0; week < 12; week++) {
  const weekStart = week * 7;
  // Maandag: Squat + Bench
  b2Workouts.push(createWorkout(daysAgo(weekStart + 6), [
    ...Array(5).fill({ exercise: 'Squat', reps: 3, rpe: 9 }),
    ...Array(5).fill({ exercise: 'Bench Press', reps: 3, rpe: 8.5 }),
  ]));
  // Woensdag: Deadlift + OHP
  b2Workouts.push(createWorkout(daysAgo(weekStart + 4), [
    ...Array(4).fill({ exercise: 'Deadlift', reps: 3, rpe: 9 }),
    ...Array(4).fill({ exercise: 'Overhead Press', reps: 5, rpe: 8 }),
  ]));
  // Vrijdag: Squat + Bench (gisteren voor week 0)
  b2Workouts.push(createWorkout(daysAgo(weekStart + 1), [
    ...Array(5).fill({ exercise: 'Squat', reps: 3, rpe: 9 }),
    ...Array(5).fill({ exercise: 'Bench Press', reps: 3, rpe: 8.5 }),
  ]));
}
b2Workouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const b2 = analyzeTraining(b2Workouts, 'strength');
const b2Splits = scoreSplits(b2);
console.log('Recovery:', Object.entries(b2).map(([m, s]) => `${m}: ${s.recoveryPct}%`).join(', '));
console.log('Top splits:', b2Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

const b2QuadsFatigued = b2.quads.recoveryPct < 50;
const b2PullRecommended = b2Splits[0].name === 'Pull' || !['Legs', 'Lower'].includes(b2Splits[0].name);
test('B2: Quads fatigued (Squat RPE 9 gisteren)', b2QuadsFatigued, `Quads: ${b2.quads.recoveryPct}%`);
test('B2: Pull of niet-Legs aanbevolen', b2PullRecommended, `Top: ${b2Splits[0].name}`);

// B3: Bodybuilder — hoog volume
console.log('\n--- B3: Bodybuilder (16 weken, hoog volume) ---');
const b3Workouts = [];
// Gisteren: Pull
b3Workouts.push(createWorkout(daysAgo(1), [
  ...Array(5).fill({ exercise: 'Deadlift', reps: 10, rpe: 7 }),
  ...Array(5).fill({ exercise: 'Barbell Row', reps: 10, rpe: 7 }),
  ...Array(4).fill({ exercise: 'Lat Pulldown', reps: 12, rpe: 7 }),
  ...Array(3).fill({ exercise: 'Bicep Curl', reps: 12, rpe: 7 }),
  ...Array(3).fill({ exercise: 'Face Pull', reps: 15, rpe: 6 }),
]));
// Vorige dagen: Push/Pull/Legs x2
for (let i = 2; i <= 7; i++) {
  const day = i % 3;
  if (day === 0) { // Push
    b3Workouts.push(createWorkout(daysAgo(i), [
      ...Array(5).fill({ exercise: 'Bench Press', reps: 10, rpe: 7 }),
      ...Array(4).fill({ exercise: 'Incline Press', reps: 10, rpe: 7 }),
      ...Array(4).fill({ exercise: 'Cable Fly', reps: 12, rpe: 7 }),
      ...Array(4).fill({ exercise: 'Overhead Press', reps: 10, rpe: 7 }),
      ...Array(3).fill({ exercise: 'Tricep Pushdown', reps: 12, rpe: 7 }),
    ]));
  } else if (day === 1) { // Legs
    b3Workouts.push(createWorkout(daysAgo(i), [
      ...Array(5).fill({ exercise: 'Squat', reps: 10, rpe: 7 }),
      ...Array(4).fill({ exercise: 'Leg Press', reps: 12, rpe: 7 }),
      ...Array(4).fill({ exercise: 'Romanian Deadlift', reps: 10, rpe: 7 }),
      ...Array(3).fill({ exercise: 'Leg Curl', reps: 12, rpe: 7 }),
      ...Array(3).fill({ exercise: 'Leg Extension', reps: 12, rpe: 7 }),
    ]));
  } else { // Pull
    b3Workouts.push(createWorkout(daysAgo(i), generateSets(pullExercises, 4, 7)));
  }
}
b3Workouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const b3 = analyzeTraining(b3Workouts);
const b3Splits = scoreSplits(b3);
console.log('Recovery:', Object.entries(b3).map(([m, s]) => `${m}: ${s.recoveryPct}%`).join(', '));
console.log('Top splits:', b3Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

const b3NotPull = b3Splits[0].name !== 'Pull';
test('B3: Niet Pull aanbevolen (net gedaan)', b3NotPull, `Top: ${b3Splits[0].name}`);

// B4: Recreatieve sporter — onregelmatig schema
console.log('\n--- B4: Recreatieve sporter (onregelmatig) ---');
const fullBodyExercises = ['Squat', 'Bench Press', 'Barbell Row', 'Overhead Press', 'Deadlift'];
const b4Workouts = [
  createWorkout(daysAgo(2), generateSets(fullBodyExercises, 3, 7)),
  createWorkout(daysAgo(5), generateSets(fullBodyExercises, 3, 7)),
  createWorkout(daysAgo(9), generateSets(fullBodyExercises, 3, 7)),
  createWorkout(daysAgo(13), generateSets(fullBodyExercises, 3, 6)),
  createWorkout(daysAgo(16), generateSets(fullBodyExercises, 3, 6)),
  createWorkout(daysAgo(20), generateSets(fullBodyExercises, 3, 6)),
  createWorkout(daysAgo(22), generateSets(fullBodyExercises, 3, 7)),
  createWorkout(daysAgo(26), generateSets(fullBodyExercises, 3, 7)),
  createWorkout(daysAgo(28), generateSets(fullBodyExercises, 3, 7)),
];
const b4 = analyzeTraining(b4Workouts);
const b4Splits = scoreSplits(b4);
console.log('Top splits:', b4Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

test('B4: Verwerkt scattered data', true);  // Als we hier komen is het OK

// B5: Deload week gebruiker
console.log('\n--- B5: Deload week (lage RPE) ---');
const b5Workouts = [
  createWorkout(daysAgo(1), generateSets(fullBodyExercises, 2, 5)),  // Deload: 50% volume, RPE 5
  createWorkout(daysAgo(4), generateSets(fullBodyExercises, 2, 5)),  // Deload
];
const b5 = analyzeTraining(b5Workouts);
console.log('Recovery (deload RPE 5):', Object.entries(b5).map(([m, s]) => `${m}: ${s.recoveryPct}%`).join(', '));

// Met lage RPE zou recovery sneller moeten zijn dan bij RPE 7
// RPE 5 → rpeMult = 0.7, dus 24h / (72h * 0.7) ≈ 48%
// Vergelijk met RPE 7: 24h / 72h = 33%
const b5HighRecovery = b5.chest.recoveryPct >= 45;  // Should be ~48% with low RPE bonus
test('B5: Snellere recovery door lage RPE', b5HighRecovery, `Chest: ${b5.chest.recoveryPct}% (expected ≈48% with RPE 5)`);

// B6: Atleet met blessure-periode
console.log('\n--- B6: Na blessure (14 dagen geen upper) ---');
const b6Workouts = [];
// Week 7-8: alleen Legs (blessure)
for (let i = 0; i < 14; i += 3) {
  b6Workouts.push(createWorkout(daysAgo(i + 1), generateSets(legExercises, 4, 7)));
}
// Week 1-6: normaal PPL (maar >14 dagen geleden voor upper)
for (let week = 3; week < 9; week++) {
  const weekStart = week * 7;
  b6Workouts.push(createWorkout(daysAgo(weekStart), generateSets(pushExercises, 3, 7)));
  b6Workouts.push(createWorkout(daysAgo(weekStart + 1), generateSets(pullExercises, 3, 7)));
  b6Workouts.push(createWorkout(daysAgo(weekStart + 2), generateSets(legExercises, 3, 7)));
}
b6Workouts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const b6 = analyzeTraining(b6Workouts);
const b6Splits = scoreSplits(b6);
console.log('Days since trained:', Object.entries(b6).map(([m, s]) => `${m}: ${s.daysSinceLastTrained}d`).join(', '));
console.log('Status:', Object.entries(b6).map(([m, s]) => `${m}: ${s.status}`).join(', '));
console.log('Top splits:', b6Splits.slice(0, 3).map(s => `${s.name}: ${s.score}`).join(', '));

const b6UpperRecommended = ['Upper', 'Push', 'Pull'].includes(b6Splits[0].name);
const b6ChestNeedsWork = b6.chest.status === 'needs_work' || b6.chest.daysSinceLastTrained > 7;
test('B6: Upper body needs work', b6ChestNeedsWork, `Chest: ${b6.chest.status}, days: ${b6.chest.daysSinceLastTrained}`);
test('B6: Upper/Push/Pull aanbevolen', b6UpperRecommended, `Top: ${b6Splits[0].name}`);

// ============================================================
// SPECIFIEKE BUG CHECKS
// ============================================================

console.log('\n📋 SPECIFIEKE BUG CHECKS\n');

// Bug check 1: setsThisWeek over meerdere workouts
console.log('--- Bug 1: setsThisWeek aggregatie ---');
const bug1Workouts = [
  createWorkout(daysAgo(0), Array(4).fill({ exercise: 'Bench Press', reps: 10, rpe: 7 })),
  createWorkout(daysAgo(2), Array(4).fill({ exercise: 'Bench Press', reps: 10, rpe: 7 })),
  createWorkout(daysAgo(4), Array(4).fill({ exercise: 'Bench Press', reps: 10, rpe: 7 })),
];
const bug1 = analyzeTraining(bug1Workouts);
console.log(`Chest sets this week: ${bug1.chest.setsThisWeek} (expected: 12)`);
test('Bug 1: setsThisWeek = 12', bug1.chest.setsThisWeek === 12, `Got: ${bug1.chest.setsThisWeek}`);

// Bug check 2: "week" definitie
console.log('\n--- Bug 2: Week definitie (rolling 7 dagen) ---');
const exactlySevenDaysAgo = daysAgo(7, 1);  // Just over 7 days
const bug2Workouts = [
  createWorkout(exactlySevenDaysAgo, Array(4).fill({ exercise: 'Bench Press', reps: 10, rpe: 7 })),
];
const bug2 = analyzeTraining(bug2Workouts);
console.log(`Sets from 7+ days ago: ${bug2.chest.setsThisWeek} (expected: 0)`);
test('Bug 2: 7+ dagen geleden telt niet mee', bug2.chest.setsThisWeek === 0, `Got: ${bug2.chest.setsThisWeek}`);

// Bug check 3: compound overlap
console.log('\n--- Bug 3: Compound overlap (Deadlift → back + hamstrings + glutes) ---');
const bug3Classification = classifyExerciseFull('Deadlift');
console.log('Deadlift classification:', bug3Classification);
test('Bug 3a: Deadlift primary = back', bug3Classification.primary === 'back');
test('Bug 3b: Deadlift secondary includes hamstrings', bug3Classification.secondary.includes('hamstrings'));
test('Bug 3c: Deadlift secondary includes glutes', bug3Classification.secondary.includes('glutes'));

// Test: 2 sets Deadlift = 2 back, 1 hamstrings, 1 glutes
const bug3Workouts = [
  createWorkout(daysAgo(0), Array(2).fill({ exercise: 'Deadlift', reps: 5, rpe: 8 })),
];
const bug3 = analyzeTraining(bug3Workouts);
console.log(`Back sets: ${bug3.back.setsThisWeek}, Hamstrings: ${bug3.hamstrings.setsThisWeek}, Glutes: ${bug3.glutes.setsThisWeek}`);
test('Bug 3d: Back = 2 sets', bug3.back.setsThisWeek === 2);
test('Bug 3e: Hamstrings = 1 set (50%)', bug3.hamstrings.setsThisWeek === 1, `Got: ${bug3.hamstrings.setsThisWeek}`);
test('Bug 3f: Glutes = 1 set (50%)', bug3.glutes.setsThisWeek === 1, `Got: ${bug3.glutes.setsThisWeek}`);

// Bug check 4: recovery bij very low volume
console.log('\n--- Bug 4: Recovery bij 1 set (low volume) ---');
const bug4Recovery = calcMuscleRecovery('quads', 24, 7, 1);
console.log(`1 set Squat, 24h ago, RPE 7 → recovery: ${bug4Recovery}% (expected: ~25%)`);
// 24h / 96h = 25%
test('Bug 4: Low volume recovery correct', bug4Recovery >= 20 && bug4Recovery <= 30, `Got: ${bug4Recovery}%`);

// Bug check 5: RPE edge cases
console.log('\n--- Bug 5: RPE multiplier ---');
const bug5High = calcMuscleRecovery('chest', 24, 10, 4);  // RPE 10
const bug5Normal = calcMuscleRecovery('chest', 24, 7, 4); // RPE 7
const bug5Low = calcMuscleRecovery('chest', 24, 5, 4);    // RPE 5
console.log(`RPE 10: ${bug5High}%, RPE 7: ${bug5Normal}%, RPE 5: ${bug5Low}%`);
console.log('Expected: RPE 10 < RPE 7 < RPE 5 (higher RPE = slower recovery)');

// BUG: RPE 5 en RPE 7 geven zelfde resultaat (geen bonus voor lage RPE)
const bug5Correct = bug5Low > bug5Normal && bug5Normal > bug5High;
test('Bug 5: RPE 5 herstel sneller dan RPE 7', bug5Low > bug5Normal, `RPE 5: ${bug5Low}%, RPE 7: ${bug5Normal}%`);

// ============================================================
// SAMENVATTING
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('📊 SAMENVATTING');
console.log('='.repeat(60));
console.log(`\nPassed: ${passed}/${passed + failed}`);
console.log(`Failed: ${failed}/${passed + failed}`);

if (failed > 0) {
  console.log('\n❌ GEFAALDE TESTS:');
  results.filter(r => r.status === '❌').forEach(r => {
    console.log(`  - ${r.name}: ${r.details}`);
  });
}

console.log('\n✅ GESLAAGDE TESTS:');
results.filter(r => r.status === '✅').forEach(r => {
  console.log(`  - ${r.name}`);
});
