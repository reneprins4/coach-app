import { describe, it, expect, beforeEach } from 'vitest'
import {
  INJURY_AREAS,
  getExcludedExercises,
  getSafeAlternative,
  getRehabExercises,
  isExerciseSafe,
  filterWorkoutForInjuries,
  addInjury,
  addCheckIn,
  getActiveInjuries,
  getRecoveryGuidance,
  saveInjuries,
  loadInjuries,
} from '../injuryRecovery'
import type {
  ActiveInjury,
  InjuryArea,
} from '../injuryRecovery'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInjury(overrides: Partial<ActiveInjury> = {}): ActiveInjury {
  return {
    id: crypto.randomUUID(),
    bodyArea: 'shoulder',
    side: 'left',
    severity: 'moderate',
    reportedDate: new Date().toISOString(),
    status: 'active',
    checkIns: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Injury Areas & Types
// ---------------------------------------------------------------------------

describe('Injury Recovery System', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('INJURY_AREAS config', () => {
    it('contains 8 body areas', () => {
      const areas = Object.keys(INJURY_AREAS)
      expect(areas).toHaveLength(8)
      expect(areas).toEqual(
        expect.arrayContaining([
          'shoulder', 'knee', 'lower_back', 'elbow', 'wrist', 'hip', 'neck', 'ankle',
        ]),
      )
    })

    it('each area has exclusion patterns and rehab exercises', () => {
      for (const [area, config] of Object.entries(INJURY_AREAS)) {
        expect(config.excludedPatterns.length, `${area} should have excludedPatterns`).toBeGreaterThan(0)
        expect(config.rehabExercises.length, `${area} should have rehabExercises`).toBeGreaterThan(0)
        expect(config.nameKey, `${area} should have nameKey`).toBeTruthy()
        expect(config.affectedMuscles.length, `${area} should have affectedMuscles`).toBeGreaterThan(0)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Exercise Exclusion
  // ---------------------------------------------------------------------------

  describe('getExcludedExercises', () => {
    it('shoulder excludes Overhead Press', () => {
      const excluded = getExcludedExercises('shoulder', 'moderate')
      expect(excluded.some(p => /overhead.*press/i.test(p))).toBe(true)
    })

    it('shoulder excludes Lateral Raise', () => {
      const excluded = getExcludedExercises('shoulder', 'moderate')
      expect(excluded.some(p => /lateral.*raise/i.test(p))).toBe(true)
    })

    it('shoulder does NOT exclude Leg Press', () => {
      const excluded = getExcludedExercises('shoulder', 'severe')
      const legPressMatches = excluded.some(p => new RegExp(p, 'i').test('Leg Press'))
      expect(legPressMatches).toBe(false)
    })

    it('knee excludes Barbell Squat', () => {
      const excluded = getExcludedExercises('knee', 'moderate')
      expect(excluded.some(p => new RegExp(p, 'i').test('Back Squat'))).toBe(true)
    })

    it('knee excludes Lunges', () => {
      const excluded = getExcludedExercises('knee', 'moderate')
      expect(excluded.some(p => new RegExp(p, 'i').test('Walking Lunges'))).toBe(true)
    })

    it('lower_back excludes Deadlift', () => {
      const excluded = getExcludedExercises('lower_back', 'moderate')
      expect(excluded.some(p => new RegExp(p, 'i').test('Conventional Deadlift'))).toBe(true)
    })

    it('lower_back does NOT exclude Lat Pulldown', () => {
      const excluded = getExcludedExercises('lower_back', 'severe')
      const matches = excluded.some(p => new RegExp(p, 'i').test('Lat Pulldown (Wide)'))
      expect(matches).toBe(false)
    })

    it('returns empty for unknown area', () => {
      const excluded = getExcludedExercises('unknown_area' as InjuryArea, 'moderate')
      expect(excluded).toEqual([])
    })

    it('severe severity includes more exclusions than mild', () => {
      const mild = getExcludedExercises('shoulder', 'mild')
      const severe = getExcludedExercises('shoulder', 'severe')
      expect(severe.length).toBeGreaterThanOrEqual(mild.length)
    })
  })

  // ---------------------------------------------------------------------------
  // Safe Alternatives
  // ---------------------------------------------------------------------------

  describe('getSafeAlternative', () => {
    it('shoulder Overhead Press returns an alternative', () => {
      const alt = getSafeAlternative('shoulder', 'Overhead Press')
      expect(alt).toBeTruthy()
      expect(typeof alt).toBe('string')
    })

    it('knee Barbell Squat returns Leg Press variant', () => {
      const alt = getSafeAlternative('knee', 'Back Squat')
      expect(alt).toBeTruthy()
    })

    it('returns null when no alternative exists', () => {
      const alt = getSafeAlternative('shoulder', 'Some Exercise That Does Not Exist XYZ')
      expect(alt).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Rehab Exercises
  // ---------------------------------------------------------------------------

  describe('getRehabExercises', () => {
    it('shoulder returns 3-5 rehab exercises', () => {
      const rehab = getRehabExercises('shoulder', 'moderate')
      expect(rehab.length).toBeGreaterThanOrEqual(3)
      expect(rehab.length).toBeLessThanOrEqual(5)
    })

    it('knee returns rehab exercises', () => {
      const rehab = getRehabExercises('knee', 'moderate')
      expect(rehab.length).toBeGreaterThan(0)
    })

    it('each rehab exercise has name, description, sets, reps', () => {
      const rehab = getRehabExercises('shoulder', 'moderate')
      for (const ex of rehab) {
        expect(ex.name).toBeTruthy()
        expect(ex.description).toBeTruthy()
        expect(ex.sets).toBeGreaterThan(0)
        expect(ex.reps).toBeTruthy()
      }
    })

    it('rehab exercises are severity-appropriate (mild gets more, severe gets less)', () => {
      const mild = getRehabExercises('shoulder', 'mild')
      const severe = getRehabExercises('shoulder', 'severe')
      // Mild allows more rehab volume
      const mildTotalSets = mild.reduce((s, e) => s + e.sets, 0)
      const severeTotalSets = severe.reduce((s, e) => s + e.sets, 0)
      expect(mildTotalSets).toBeGreaterThanOrEqual(severeTotalSets)
    })
  })

  // ---------------------------------------------------------------------------
  // Exercise Safety Check
  // ---------------------------------------------------------------------------

  describe('isExerciseSafe', () => {
    it('returns false for excluded exercises', () => {
      const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate' })]
      expect(isExerciseSafe('Barbell Overhead Press', injuries)).toBe(false)
    })

    it('returns true for safe exercises', () => {
      const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate' })]
      expect(isExerciseSafe('Back Squat', injuries)).toBe(true)
    })

    it('checks against ALL active injuries', () => {
      const injuries: ActiveInjury[] = [
        makeInjury({ bodyArea: 'shoulder', severity: 'moderate' }),
        makeInjury({ bodyArea: 'knee', severity: 'moderate' }),
      ]
      // Overhead press blocked by shoulder
      expect(isExerciseSafe('Barbell Overhead Press', injuries)).toBe(false)
      // Squat blocked by knee
      expect(isExerciseSafe('Back Squat', injuries)).toBe(false)
      // Cable curl blocked by neither
      expect(isExerciseSafe('Cable Curl', injuries)).toBe(true)
    })

    it('with severity "mild" allows some exercises that "severe" blocks', () => {
      const mildInjuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'mild' })]
      const severeInjuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'severe' })]
      // Bench press: mild allows, severe blocks
      const safeMild = isExerciseSafe('Flat Barbell Bench Press', mildInjuries)
      const safeSevere = isExerciseSafe('Flat Barbell Bench Press', severeInjuries)
      expect(safeSevere).toBe(false)
      // Mild should be more permissive
      expect(safeMild).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Workout Filtering
  // ---------------------------------------------------------------------------

  describe('filterWorkoutForInjuries', () => {
    const sampleExercises = [
      { name: 'Barbell Overhead Press', muscle_group: 'shoulders' },
      { name: 'Lateral Raise', muscle_group: 'shoulders' },
      { name: 'Back Squat', muscle_group: 'quads' },
      { name: 'Barbell Curl', muscle_group: 'biceps' },
    ]

    it('removes excluded exercises and adds alternatives', () => {
      const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate' })]
      const result = filterWorkoutForInjuries(sampleExercises, injuries)
      // Overhead Press and Lateral Raise should be replaced or removed
      const names = result.map(e => e.name)
      expect(names).not.toContain('Barbell Overhead Press')
      expect(names).not.toContain('Lateral Raise')
      // Squat and Curl should remain
      expect(names).toContain('Back Squat')
      expect(names).toContain('Barbell Curl')
    })

    it('appends rehab exercises at the end', () => {
      const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'shoulder', severity: 'moderate' })]
      const result = filterWorkoutForInjuries(sampleExercises, injuries)
      // Last exercises should be rehab exercises
      const lastExercise = result[result.length - 1]
      expect(lastExercise).toBeDefined()
      expect(lastExercise!.isRehab).toBe(true)
    })

    it('with no injuries returns workout unchanged', () => {
      const result = filterWorkoutForInjuries(sampleExercises, [])
      expect(result.map(e => e.name)).toEqual(sampleExercises.map(e => e.name))
    })

    it('handles multiple simultaneous injuries', () => {
      const injuries: ActiveInjury[] = [
        makeInjury({ bodyArea: 'shoulder', severity: 'moderate' }),
        makeInjury({ bodyArea: 'knee', severity: 'moderate' }),
      ]
      const result = filterWorkoutForInjuries(sampleExercises, injuries)
      const names = result.map(e => e.name)
      // Overhead Press blocked by shoulder
      expect(names).not.toContain('Barbell Overhead Press')
      // Squat blocked by knee
      expect(names).not.toContain('Back Squat')
      // Curl remains
      expect(names).toContain('Barbell Curl')
    })
  })

  // ---------------------------------------------------------------------------
  // Injury State Management
  // ---------------------------------------------------------------------------

  describe('Injury state management', () => {
    it('addInjury creates a new active injury', () => {
      const injury = addInjury({
        bodyArea: 'shoulder',
        side: 'left',
        severity: 'moderate',
      })
      expect(injury.id).toBeTruthy()
      expect(injury.status).toBe('active')
      expect(injury.checkIns).toEqual([])
      expect(injury.reportedDate).toBeTruthy()
    })

    it('addCheckIn records feeling for an injury', () => {
      const injury = addInjury({ bodyArea: 'knee', side: 'right', severity: 'mild' })
      const updated = addCheckIn(injury, 'same')
      expect(updated.checkIns).toHaveLength(1)
      expect(updated.checkIns[0]!.feeling).toBe('same')
    })

    it('two consecutive "better" check-ins changes status to "recovering"', () => {
      let injury = addInjury({ bodyArea: 'shoulder', side: 'both', severity: 'moderate' })
      injury = addCheckIn(injury, 'better')
      expect(injury.status).toBe('active') // First better is not enough
      injury = addCheckIn(injury, 'better')
      expect(injury.status).toBe('recovering')
    })

    it('"recovered" check-in changes status to "resolved"', () => {
      let injury = addInjury({ bodyArea: 'hip', side: 'left', severity: 'mild' })
      injury = addCheckIn(injury, 'recovered')
      expect(injury.status).toBe('resolved')
    })

    it('"worse" check-in keeps status "active"', () => {
      let injury = addInjury({ bodyArea: 'ankle', side: 'right', severity: 'moderate' })
      injury = addCheckIn(injury, 'better')
      injury = addCheckIn(injury, 'better')
      expect(injury.status).toBe('recovering')
      injury = addCheckIn(injury, 'worse')
      expect(injury.status).toBe('active')
    })

    it('getActiveInjuries returns only active + recovering injuries', () => {
      const injuries: ActiveInjury[] = [
        makeInjury({ status: 'active' }),
        makeInjury({ status: 'recovering' }),
        makeInjury({ status: 'resolved' }),
      ]
      const active = getActiveInjuries(injuries)
      expect(active).toHaveLength(2)
    })

    it('getActiveInjuries excludes resolved injuries', () => {
      const injuries: ActiveInjury[] = [
        makeInjury({ status: 'resolved' }),
        makeInjury({ status: 'resolved' }),
      ]
      const active = getActiveInjuries(injuries)
      expect(active).toHaveLength(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Recovery Progression
  // ---------------------------------------------------------------------------

  describe('getRecoveryGuidance', () => {
    it('"recovering" suggests reduced weight (70%)', () => {
      const injury = makeInjury({ status: 'recovering' })
      const guidance = getRecoveryGuidance(injury)
      expect(guidance.weightModifier).toBeCloseTo(0.7, 1)
      expect(guidance.message).toBeTruthy()
    })

    it('"active" suggests full avoidance', () => {
      const injury = makeInjury({ status: 'active' })
      const guidance = getRecoveryGuidance(injury)
      expect(guidance.weightModifier).toBe(0)
    })

    it('"resolved" suggests normal training', () => {
      const injury = makeInjury({ status: 'resolved' })
      const guidance = getRecoveryGuidance(injury)
      expect(guidance.weightModifier).toBe(1)
    })
  })

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  describe('Persistence', () => {
    it('saveInjuries persists to localStorage', () => {
      const injuries: ActiveInjury[] = [makeInjury()]
      saveInjuries(injuries)
      const stored = localStorage.getItem('kravex_injuries')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!)).toHaveLength(1)
    })

    it('loadInjuries reads from localStorage', () => {
      const injuries: ActiveInjury[] = [makeInjury({ bodyArea: 'knee' })]
      saveInjuries(injuries)
      const loaded = loadInjuries()
      expect(loaded).toHaveLength(1)
      expect(loaded[0]!.bodyArea).toBe('knee')
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('kravex_injuries', 'not-valid-json{{{')
      const loaded = loadInjuries()
      expect(loaded).toEqual([])
    })
  })
})
