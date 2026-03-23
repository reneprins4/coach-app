/**
 * Experience-Level Awareness Tests
 *
 * Validates that workout generation respects experience-level science:
 *   - Beginners should never be pushed to RPE 9
 *   - Set counts scale with training age
 *   - Overload percentages adapt to experience
 *
 * References:
 *   - Helms et al. (2014) — RPE guidelines for novice vs advanced trainees
 *   - Schoenfeld et al. (2017) — Volume dose-response for hypertrophy
 */
import { describe, it, expect } from 'vitest'
import { generateLocalWorkout } from '../../lib/localWorkoutGenerator'
import { getRpeCap, getExperienceSets } from '../../lib/experienceLevel'
import { calculateProgression } from '../../lib/progressiveOverload'
import { createMuscleStatusMap, createRecentSession } from '../helpers'
import type { MuscleGroup, ExperienceLevel } from '../../types'

// --- Factory ---

function makeInput(overrides: Record<string, unknown> = {}) {
  return {
    muscleStatus: createMuscleStatusMap({
      chest: { setsThisWeek: 0 },
      shoulders: { setsThisWeek: 0 },
      triceps: { setsThisWeek: 0 },
      back: { setsThisWeek: 0 },
      biceps: { setsThisWeek: 0 },
      quads: { setsThisWeek: 0 },
      hamstrings: { setsThisWeek: 0 },
      glutes: { setsThisWeek: 0 },
      core: { setsThisWeek: 0 },
    }),
    recommendedSplit: 'Push' as string,
    recentHistory: [] as ReturnType<typeof createRecentSession>[],
    preferences: {
      goal: 'hypertrophy',
      trainingGoal: 'hypertrophy',
      experienceLevel: 'intermediate' as ExperienceLevel,
      bodyweight: '80',
      equipment: 'full_gym',
      energy: 'medium',
      time: 60,
      focusedMuscles: [] as MuscleGroup[],
      isDeload: false,
      targetRPE: null as number | null,
      targetRepRange: null as [number, number] | null,
    },
    ...overrides,
  }
}

function makeInputWithLevel(level: ExperienceLevel, extra: Record<string, unknown> = {}) {
  return makeInput({
    preferences: {
      ...makeInput().preferences,
      experienceLevel: level,
      ...extra,
    },
  })
}

// =============================================================================
// RPE Cap — getRpeCap() unit tests
// =============================================================================

describe('getRpeCap()', () => {
  it('complete_beginner RPE cap is 7', () => {
    expect(getRpeCap('complete_beginner')).toBe(7)
  })

  it('beginner RPE cap is 7', () => {
    expect(getRpeCap('beginner')).toBe(7)
  })

  it('returning RPE cap is 7', () => {
    expect(getRpeCap('returning')).toBe(7)
  })

  it('intermediate RPE cap is 8.5', () => {
    expect(getRpeCap('intermediate')).toBe(8.5)
  })

  it('advanced RPE cap is 9.5', () => {
    expect(getRpeCap('advanced')).toBe(9.5)
  })
})

// =============================================================================
// Set Count — getExperienceSets() unit tests
// =============================================================================

describe('getExperienceSets()', () => {
  // Beginner
  it('beginner gets 3 sets per compound exercise', () => {
    expect(getExperienceSets(true, false, 'beginner')).toBe(3)
  })

  it('beginner gets 2 sets per isolation exercise', () => {
    expect(getExperienceSets(false, false, 'beginner')).toBe(2)
  })

  // Complete beginner
  it('complete_beginner gets 2 sets per compound', () => {
    expect(getExperienceSets(true, false, 'complete_beginner')).toBe(2)
  })

  it('complete_beginner gets 2 sets per isolation', () => {
    expect(getExperienceSets(false, false, 'complete_beginner')).toBe(2)
  })

  // Returning
  it('returning gets 2 sets per compound', () => {
    expect(getExperienceSets(true, false, 'returning')).toBe(2)
  })

  it('returning gets 2 sets per isolation', () => {
    expect(getExperienceSets(false, false, 'returning')).toBe(2)
  })

  // Intermediate
  it('intermediate gets 4 sets per compound', () => {
    expect(getExperienceSets(true, false, 'intermediate')).toBe(4)
  })

  it('intermediate gets 3 sets per isolation', () => {
    expect(getExperienceSets(false, false, 'intermediate')).toBe(3)
  })

  // Advanced
  it('advanced gets 4 sets per compound', () => {
    expect(getExperienceSets(true, false, 'advanced')).toBe(4)
  })

  it('advanced gets 3 sets per isolation', () => {
    expect(getExperienceSets(false, false, 'advanced')).toBe(3)
  })

  // Deload overrides
  it('deload compound always gets 2 sets regardless of level', () => {
    const levels: ExperienceLevel[] = ['complete_beginner', 'beginner', 'returning', 'intermediate', 'advanced']
    for (const level of levels) {
      expect(getExperienceSets(true, true, level)).toBe(2)
    }
  })

  it('deload isolation always gets 1 set regardless of level', () => {
    const levels: ExperienceLevel[] = ['complete_beginner', 'beginner', 'returning', 'intermediate', 'advanced']
    for (const level of levels) {
      expect(getExperienceSets(false, true, level)).toBe(1)
    }
  })
})

// =============================================================================
// Beginner Experience (0-6 months) — integration
// =============================================================================

describe('Beginner Experience (0-6 months)', () => {
  it('beginner RPE target never exceeds 7', () => {
    const result = generateLocalWorkout(makeInputWithLevel('beginner', { targetRPE: 9 }))
    for (const ex of result.exercises) {
      expect(ex.rpe_target).toBeLessThanOrEqual(7)
    }
  })

  it('complete_beginner RPE target never exceeds 7', () => {
    const result = generateLocalWorkout(makeInputWithLevel('complete_beginner', { targetRPE: 9 }))
    for (const ex of result.exercises) {
      expect(ex.rpe_target).toBeLessThanOrEqual(7)
    }
  })

  it('returning athlete RPE target never exceeds 7', () => {
    const result = generateLocalWorkout(makeInputWithLevel('returning', { targetRPE: 9 }))
    for (const ex of result.exercises) {
      expect(ex.rpe_target).toBeLessThanOrEqual(7)
    }
  })

  it('beginner gets fewer sets per compound than intermediate', () => {
    const beginner = generateLocalWorkout(makeInputWithLevel('beginner'))
    const intermediate = generateLocalWorkout(makeInputWithLevel('intermediate'))

    const beginnerCompoundSets = beginner.exercises
      .filter(e => ['Flat Barbell Bench Press', 'Incline Dumbbell Press'].includes(e.name))
      .map(e => e.sets)
    const intermediateCompoundSets = intermediate.exercises
      .filter(e => ['Flat Barbell Bench Press', 'Incline Dumbbell Press'].includes(e.name))
      .map(e => e.sets)

    // Beginner compounds: 3 sets; Intermediate compounds: 4 sets
    for (const sets of beginnerCompoundSets) {
      expect(sets).toBeLessThanOrEqual(3)
    }
    for (const sets of intermediateCompoundSets) {
      expect(sets).toBeGreaterThanOrEqual(4)
    }
  })

  it('complete_beginner gets 2 sets per compound in generated workout', () => {
    const result = generateLocalWorkout(makeInputWithLevel('complete_beginner'))
    const compounds = result.exercises.filter(e =>
      ['Flat Barbell Bench Press', 'Incline Dumbbell Press', 'Incline Barbell Bench Press',
       'Flat Dumbbell Bench Press', 'Dumbbell Overhead Press', 'Barbell Overhead Press',
       'Close Grip Bench Press'].includes(e.name),
    )
    for (const ex of compounds) {
      expect(ex.sets).toBe(2)
    }
  })

  it('beginner isolation exercises get 2 sets', () => {
    const result = generateLocalWorkout(makeInputWithLevel('beginner'))
    const isolations = result.exercises.filter(e =>
      ['Cable Fly (Mid)', 'Pec Deck', 'Lateral Raise', 'Cable Lateral Raise',
       'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension'].includes(e.name),
    )
    for (const ex of isolations) {
      expect(ex.sets).toBe(2)
    }
  })
})

// =============================================================================
// Intermediate Experience (6-24 months)
// =============================================================================

describe('Intermediate Experience (6-24 months)', () => {
  it('intermediate RPE range: capped at 8.5', () => {
    const result = generateLocalWorkout(makeInputWithLevel('intermediate', { targetRPE: 9.5 }))
    for (const ex of result.exercises) {
      expect(ex.rpe_target).toBeLessThanOrEqual(8.5)
    }
  })

  it('intermediate gets 4 sets per compound in generated workout', () => {
    const result = generateLocalWorkout(makeInputWithLevel('intermediate'))
    const compounds = result.exercises.filter(e =>
      ['Flat Barbell Bench Press', 'Incline Dumbbell Press'].includes(e.name),
    )
    for (const ex of compounds) {
      expect(ex.sets).toBe(4)
    }
  })

  it('intermediate gets 3 sets per isolation in generated workout', () => {
    const result = generateLocalWorkout(makeInputWithLevel('intermediate'))
    const isolations = result.exercises.filter(e =>
      ['Cable Fly (Mid)', 'Pec Deck', 'Lateral Raise', 'Cable Lateral Raise',
       'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension'].includes(e.name),
    )
    for (const ex of isolations) {
      expect(ex.sets).toBe(3)
    }
  })
})

// =============================================================================
// Advanced Experience (2+ years)
// =============================================================================

describe('Advanced Experience (2+ years)', () => {
  it('advanced RPE range: capped at 9.5', () => {
    const result = generateLocalWorkout(makeInputWithLevel('advanced', { targetRPE: 10 }))
    for (const ex of result.exercises) {
      expect(ex.rpe_target).toBeLessThanOrEqual(9.5)
    }
  })

  it('advanced gets 4 sets per compound in generated workout', () => {
    const result = generateLocalWorkout(makeInputWithLevel('advanced'))
    const compounds = result.exercises.filter(e =>
      ['Flat Barbell Bench Press', 'Incline Dumbbell Press'].includes(e.name),
    )
    for (const ex of compounds) {
      expect(ex.sets).toBe(4)
    }
  })

  it('advanced gets 3 sets per isolation in generated workout', () => {
    const result = generateLocalWorkout(makeInputWithLevel('advanced'))
    const isolations = result.exercises.filter(e =>
      ['Cable Fly (Mid)', 'Pec Deck', 'Lateral Raise', 'Cable Lateral Raise',
       'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension'].includes(e.name),
    )
    for (const ex of isolations) {
      expect(ex.sets).toBe(3)
    }
  })
})

// =============================================================================
// Returning Athlete
// =============================================================================

describe('Returning Athlete', () => {
  it('returning gets beginner RPE cap (7)', () => {
    expect(getRpeCap('returning')).toBe(7)
  })

  it('returning gets 2 sets per compound initially', () => {
    const result = generateLocalWorkout(makeInputWithLevel('returning'))
    const compounds = result.exercises.filter(e =>
      ['Flat Barbell Bench Press', 'Incline Dumbbell Press'].includes(e.name),
    )
    for (const ex of compounds) {
      expect(ex.sets).toBe(2)
    }
  })
})

// =============================================================================
// Progressive Overload — experience-level scaling
// =============================================================================

describe('Progressive Overload with Experience Level', () => {
  it('beginner overload uses higher percentage range (larger jumps)', () => {
    const beginnerResult = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 60,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [8, 10],
      muscleGroup: 'chest',
      experienceLevel: 'beginner',
    })
    const advancedResult = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 60,
      previousReps: 10,
      previousRpe: 7,
      targetRepRange: [8, 10],
      muscleGroup: 'chest',
      experienceLevel: 'advanced',
    })

    expect(beginnerResult.strategy).toBe('weight_increase')
    expect(advancedResult.strategy).toBe('weight_increase')
    // Beginners get larger jumps than advanced
    expect(beginnerResult.suggestedWeight).toBeGreaterThanOrEqual(advancedResult.suggestedWeight)
  })

  it('advanced overload uses smaller percentage range', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 100,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
      experienceLevel: 'advanced',
    })
    expect(result.strategy).toBe('weight_increase')
    // Advanced upper compound: uses lower end of percentage range
    // Should be a smaller increment than default/intermediate
    expect(result.suggestedWeight).toBeGreaterThan(100)
    expect(result.suggestedWeight).toBeLessThanOrEqual(105)
  })

  it('intermediate overload uses standard tiers (2.5-7.5%)', () => {
    const result = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
      experienceLevel: 'intermediate',
    })
    expect(result.strategy).toBe('weight_increase')
    // Same as default behavior: upper compound midpoint 3.75% -> 80+3=83 -> round 82.5
    expect(result.suggestedWeight).toBe(82.5)
  })

  it('without experienceLevel defaults to intermediate behavior', () => {
    const withLevel = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
      experienceLevel: 'intermediate',
    })
    const withoutLevel = calculateProgression({
      exercise: 'Bench Press',
      previousWeight: 80,
      previousReps: 12,
      previousRpe: 7,
      targetRepRange: [8, 12],
      muscleGroup: 'chest',
    })
    expect(withLevel.suggestedWeight).toBe(withoutLevel.suggestedWeight)
  })
})
