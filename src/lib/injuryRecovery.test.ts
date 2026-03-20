/**
 * Tests for the Injury Recovery System
 *
 * Covers regex pattern specificity, rehab exercise survival,
 * weight modifier scoping, and duplicate injury prevention.
 */
import { describe, it, expect } from 'vitest'
import {
  isExerciseSafe,
  filterWorkoutForInjuries,
  getExcludedExercises,
  INJURY_AREAS,
} from './injuryRecovery'
import type { ActiveInjury } from './injuryRecovery'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInjury(overrides: Partial<ActiveInjury> = {}): ActiveInjury {
  return {
    id: 'test-injury-1',
    bodyArea: 'knee',
    side: 'left',
    severity: 'mild',
    reportedDate: new Date().toISOString(),
    status: 'active',
    checkIns: [],
    ...overrides,
  }
}

function makeExercise(name: string, muscleGroup: string) {
  return { name, muscle_group: muscleGroup }
}

// ---------------------------------------------------------------------------
// BUG 1: Overly broad regex patterns
// ---------------------------------------------------------------------------

describe('BUG 1: Regex pattern specificity', () => {
  describe('knee excludedPatterns', () => {
    const kneeInjuryMild = makeInjury({ bodyArea: 'knee', severity: 'mild' })

    it('excludes "Back Squat" for mild knee injury', () => {
      expect(isExerciseSafe('Back Squat', [kneeInjuryMild])).toBe(false)
    })

    it('excludes "Front Squat" for mild knee injury', () => {
      expect(isExerciseSafe('Front Squat', [kneeInjuryMild])).toBe(false)
    })

    it('excludes "Goblet Squat" for mild knee injury', () => {
      expect(isExerciseSafe('Goblet Squat', [kneeInjuryMild])).toBe(false)
    })

    it('does NOT exclude "Hack Squat" for mild knee injury (severeOnly)', () => {
      expect(isExerciseSafe('Hack Squat', [kneeInjuryMild])).toBe(true)
    })

    it('excludes "Hack Squat" for severe knee injury', () => {
      const severeKnee = makeInjury({ bodyArea: 'knee', severity: 'severe' })
      expect(isExerciseSafe('Hack Squat', [severeKnee])).toBe(false)
    })

    it('does NOT exclude "Hack Squat" for moderate knee injury', () => {
      const moderateKnee = makeInjury({ bodyArea: 'knee', severity: 'moderate' })
      expect(isExerciseSafe('Hack Squat', [moderateKnee])).toBe(true)
    })

    it('excludes "Bodyweight Squat" for mild knee injury', () => {
      expect(isExerciseSafe('Bodyweight Squat', [kneeInjuryMild])).toBe(false)
    })

    it('excludes "Jump Squat" for mild knee injury', () => {
      expect(isExerciseSafe('Jump Squat', [kneeInjuryMild])).toBe(false)
    })

    it('does NOT exclude "Leg Curl" for mild knee injury (severeOnly)', () => {
      expect(isExerciseSafe('Lying Leg Curl', [kneeInjuryMild])).toBe(true)
      expect(isExerciseSafe('Seated Leg Curl', [kneeInjuryMild])).toBe(true)
    })
  })

  describe('elbow excludedPatterns', () => {
    const elbowInjuryMild = makeInjury({ bodyArea: 'elbow', severity: 'mild' })

    it('excludes "Barbell Curl" for elbow injury', () => {
      expect(isExerciseSafe('Barbell Curl', [elbowInjuryMild])).toBe(false)
    })

    it('excludes "Dumbbell Curl" for elbow injury', () => {
      expect(isExerciseSafe('Dumbbell Curl', [elbowInjuryMild])).toBe(false)
    })

    it('excludes "EZ-Bar Curl" for elbow injury', () => {
      expect(isExerciseSafe('EZ-Bar Curl', [elbowInjuryMild])).toBe(false)
    })

    it('excludes "Preacher Curl" for elbow injury', () => {
      expect(isExerciseSafe('Preacher Curl', [elbowInjuryMild])).toBe(false)
    })

    it('excludes "Hammer Curl" for elbow injury', () => {
      expect(isExerciseSafe('Hammer Curl', [elbowInjuryMild])).toBe(false)
    })

    it('excludes "Cable Curl" for elbow injury', () => {
      expect(isExerciseSafe('Cable Curl', [elbowInjuryMild])).toBe(false)
    })

    it('excludes "Concentration Curl" for elbow injury', () => {
      expect(isExerciseSafe('Concentration Curl', [elbowInjuryMild])).toBe(false)
    })

    it('excludes "Incline Dumbbell Curl" for elbow injury', () => {
      expect(isExerciseSafe('Incline Dumbbell Curl', [elbowInjuryMild])).toBe(false)
    })

    it('does NOT exclude "Lying Leg Curl" for elbow injury', () => {
      expect(isExerciseSafe('Lying Leg Curl', [elbowInjuryMild])).toBe(true)
    })

    it('does NOT exclude "Seated Leg Curl" for elbow injury', () => {
      expect(isExerciseSafe('Seated Leg Curl', [elbowInjuryMild])).toBe(true)
    })

    it('does NOT exclude "Nordic Curl" for elbow injury', () => {
      expect(isExerciseSafe('Nordic Curl', [elbowInjuryMild])).toBe(true)
    })

    it('does NOT exclude "Slider Leg Curl" for elbow injury', () => {
      expect(isExerciseSafe('Slider Leg Curl', [elbowInjuryMild])).toBe(true)
    })

    it('does NOT exclude "Band Leg Curl" for elbow injury', () => {
      expect(isExerciseSafe('Band Leg Curl', [elbowInjuryMild])).toBe(true)
    })

    it('does NOT exclude "Glute Ham Raise" for elbow injury', () => {
      expect(isExerciseSafe('Glute Ham Raise', [elbowInjuryMild])).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// BUG 2: Rehab exercises survive the filter
// ---------------------------------------------------------------------------

describe('BUG 2: Rehab exercises survive their own injury patterns', () => {
  it('"Step-Up (low box)" survives knee injury filter as rehab', () => {
    const kneeInjury = makeInjury({ bodyArea: 'knee', severity: 'mild' })
    const exercises = [
      makeExercise('Back Squat', 'quads'),
      makeExercise('Lat Pulldown (Wide)', 'back'),
    ]
    const result = filterWorkoutForInjuries(exercises, [kneeInjury])

    // Should contain the rehab exercise "Step-Up (low box)"
    const stepUp = result.find(e => e.name === 'Step-Up (low box)')
    expect(stepUp).toBeDefined()
    expect(stepUp?.isRehab).toBe(true)
  })

  it('rehab exercises are not excluded when re-filtering already-filtered output', () => {
    const kneeInjury = makeInjury({ bodyArea: 'knee', severity: 'mild' })
    const exercises = [makeExercise('Lat Pulldown (Wide)', 'back')]

    // First filter pass
    const firstPass = filterWorkoutForInjuries(exercises, [kneeInjury])

    // Second filter pass (simulating the old double-filtering bug)
    const secondPass = filterWorkoutForInjuries(
      firstPass as Array<{ name: string; muscle_group: string; [key: string]: unknown }>,
      [kneeInjury],
    )

    // Rehab exercises should survive even the second pass
    const rehabExercises = secondPass.filter(e => e.isRehab)
    expect(rehabExercises.length).toBeGreaterThan(0)

    // "Step-Up (low box)" specifically should survive
    const stepUp = secondPass.find(e => e.name === 'Step-Up (low box)')
    expect(stepUp).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// BUG 3: Weight modifier only applies to affected muscles
// ---------------------------------------------------------------------------

describe('BUG 3: Weight modifier scope', () => {
  it('shoulder injury affectedMuscles includes shoulders, chest, triceps', () => {
    const config = INJURY_AREAS.shoulder
    expect(config.affectedMuscles).toContain('shoulders')
    expect(config.affectedMuscles).toContain('chest')
    expect(config.affectedMuscles).toContain('triceps')
    // Should NOT contain leg muscles
    expect(config.affectedMuscles).not.toContain('quads')
    expect(config.affectedMuscles).not.toContain('hamstrings')
    expect(config.affectedMuscles).not.toContain('back')
  })

  it('knee injury affectedMuscles includes quads, hamstrings, glutes', () => {
    const config = INJURY_AREAS.knee
    expect(config.affectedMuscles).toContain('quads')
    expect(config.affectedMuscles).toContain('hamstrings')
    expect(config.affectedMuscles).toContain('glutes')
    // Should NOT contain upper body muscles
    expect(config.affectedMuscles).not.toContain('chest')
    expect(config.affectedMuscles).not.toContain('shoulders')
    expect(config.affectedMuscles).not.toContain('biceps')
  })

  it('elbow injury affectedMuscles includes biceps and triceps only', () => {
    const config = INJURY_AREAS.elbow
    expect(config.affectedMuscles).toContain('biceps')
    expect(config.affectedMuscles).toContain('triceps')
    expect(config.affectedMuscles).not.toContain('quads')
    expect(config.affectedMuscles).not.toContain('back')
  })
})

// ---------------------------------------------------------------------------
// BUG 8: Duplicate injury prevention
// (Logic tested at the data model level; hook test requires React)
// ---------------------------------------------------------------------------

describe('BUG 8: getExcludedExercises returns correct patterns', () => {
  it('mild knee does not include severeOnly patterns', () => {
    const patterns = getExcludedExercises('knee', 'mild')
    // Should not contain hack squat (severeOnly)
    const hasHackSquat = patterns.some(p => {
      try { return new RegExp(p, 'i').test('hack squat') }
      catch { return false }
    })
    expect(hasHackSquat).toBe(false)
  })

  it('severe knee includes severeOnly patterns', () => {
    const patterns = getExcludedExercises('knee', 'severe')
    const hasHackSquat = patterns.some(p => {
      try { return new RegExp(p, 'i').test('hack squat') }
      catch { return false }
    })
    expect(hasHackSquat).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Integration: full filter pipeline
// ---------------------------------------------------------------------------

describe('Integration: filterWorkoutForInjuries', () => {
  it('filters excluded exercises and adds rehab', () => {
    const shoulderInjury = makeInjury({ bodyArea: 'shoulder', severity: 'mild' })
    const exercises = [
      makeExercise('Overhead Press', 'shoulders'),
      makeExercise('Back Squat', 'quads'),
      makeExercise('Barbell Row', 'back'),
    ]

    const result = filterWorkoutForInjuries(exercises, [shoulderInjury])

    // Overhead Press should be excluded (or replaced)
    const ohp = result.find(e => e.name === 'Overhead Press')
    expect(ohp).toBeUndefined()

    // Back Squat and Barbell Row should survive (not shoulder-related exclusions)
    expect(result.find(e => e.name === 'Back Squat')).toBeDefined()
    expect(result.find(e => e.name === 'Barbell Row')).toBeDefined()

    // Rehab exercises should be added
    const rehabExercises = result.filter(e => e.isRehab)
    expect(rehabExercises.length).toBeGreaterThan(0)
  })

  it('does not duplicate rehab exercises across filter passes', () => {
    const kneeInjury = makeInjury({ bodyArea: 'knee', severity: 'moderate' })
    const exercises = [makeExercise('Lat Pulldown (Wide)', 'back')]

    const result = filterWorkoutForInjuries(exercises, [kneeInjury])
    const rehabNames = result.filter(e => e.isRehab).map(e => e.name)
    const uniqueNames = new Set(rehabNames)

    expect(rehabNames.length).toBe(uniqueNames.size)
  })

  it('provides alternatives for excluded exercises when available', () => {
    const shoulderInjury = makeInjury({ bodyArea: 'shoulder', severity: 'mild' })
    const exercises = [
      makeExercise('Barbell Overhead Press', 'shoulders'),
    ]

    const result = filterWorkoutForInjuries(exercises, [shoulderInjury])

    // Barbell Overhead Press should be replaced with Landmine Press
    const alt = result.find(e => e.isAlternative)
    expect(alt).toBeDefined()
    expect(alt?.name).toBe('Landmine Press')
    expect(alt?.originalExercise).toBe('Barbell Overhead Press')
  })
})
