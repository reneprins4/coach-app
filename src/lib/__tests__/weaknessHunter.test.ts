/**
 * Tests for src/lib/weaknessHunter.ts
 * ALGO-005: Verify exercise-to-muscle-group regex classification
 */
import { describe, it, expect } from 'vitest'
import { getDetailedMuscleGroup, getSimpleMuscleGroup } from '../weaknessHunter'

describe('weaknessHunter', () => {
  describe('getDetailedMuscleGroup', () => {
    // -- Shoulders --
    it('"Arnold Press" is classified as shoulders', () => {
      expect(getDetailedMuscleGroup('Arnold Press')).toBe('shoulders_front')
    })

    it('"Machine Shoulder Press" is classified as shoulders', () => {
      expect(getDetailedMuscleGroup('Machine Shoulder Press')).toBe('shoulders_front')
    })

    it('"Cable Lateral Raise" is classified as shoulders (side)', () => {
      expect(getDetailedMuscleGroup('Cable Lateral Raise')).toBe('shoulders_side')
    })

    it('"Dumbbell Lateral Raise" is classified as shoulders (side)', () => {
      expect(getDetailedMuscleGroup('Dumbbell Lateral Raise')).toBe('shoulders_side')
    })

    it('"Face Pull" is classified as shoulders (rear)', () => {
      expect(getDetailedMuscleGroup('Face Pull')).toBe('shoulders_rear')
    })

    it('"Front Raise" is classified as shoulders (front)', () => {
      expect(getDetailedMuscleGroup('Front Raise')).toBe('shoulders_front')
    })

    it('"Overhead Press" is classified as shoulders (front)', () => {
      expect(getDetailedMuscleGroup('Overhead Press')).toBe('shoulders_front')
    })

    it('"Military Press" is classified as shoulders (front)', () => {
      expect(getDetailedMuscleGroup('Military Press')).toBe('shoulders_front')
    })

    // -- Biceps --
    it('"Z-bar Curl" is classified as biceps', () => {
      expect(getDetailedMuscleGroup('Z-bar Curl')).toBe('biceps')
    })

    it('"Hammer Curl" is classified as biceps', () => {
      expect(getDetailedMuscleGroup('Hammer Curl')).toBe('biceps')
    })

    it('"Preacher Curl" is classified as biceps', () => {
      expect(getDetailedMuscleGroup('Preacher Curl')).toBe('biceps')
    })

    // -- Hamstrings --
    it('"Leg Curl" is classified as hamstrings', () => {
      expect(getDetailedMuscleGroup('Leg Curl')).toBe('hamstrings')
    })

    it('"Seated Leg Curl" is classified as hamstrings', () => {
      expect(getDetailedMuscleGroup('Seated Leg Curl')).toBe('hamstrings')
    })

    it('"Lying Leg Curl" is classified as hamstrings', () => {
      expect(getDetailedMuscleGroup('Lying Leg Curl')).toBe('hamstrings')
    })

    it('"Romanian Deadlift" is classified as hamstrings', () => {
      expect(getDetailedMuscleGroup('Romanian Deadlift')).toBe('hamstrings')
    })

    // -- Glutes --
    it('"Hip Thrust" is classified as glutes', () => {
      expect(getDetailedMuscleGroup('Hip Thrust')).toBe('glutes')
    })

    it('"Barbell Hip Thrust" is classified as glutes', () => {
      expect(getDetailedMuscleGroup('Barbell Hip Thrust')).toBe('glutes')
    })

    it('"Glute Bridge" is classified as glutes', () => {
      expect(getDetailedMuscleGroup('Glute Bridge')).toBe('glutes')
    })

    // -- Calves --
    it('"Calf Raise" is classified as calves', () => {
      expect(getDetailedMuscleGroup('Calf Raise')).toBe('calves')
    })

    it('"Standing Calf Raise" is classified as calves', () => {
      expect(getDetailedMuscleGroup('Standing Calf Raise')).toBe('calves')
    })

    it('"Seated Calf Raise" is classified as calves', () => {
      expect(getDetailedMuscleGroup('Seated Calf Raise')).toBe('calves')
    })

    // -- Chest --
    it('"Bench Press" is classified as chest', () => {
      expect(getDetailedMuscleGroup('Bench Press')).toBe('chest')
    })

    it('"Incline Dumbbell Fly" is classified as chest', () => {
      expect(getDetailedMuscleGroup('Incline Dumbbell Fly')).toBe('chest')
    })

    it('"Chest Dip" is classified as chest', () => {
      expect(getDetailedMuscleGroup('Chest Dip')).toBe('chest')
    })

    // -- Triceps --
    it('"Tricep Dip" is classified as triceps', () => {
      expect(getDetailedMuscleGroup('Tricep Dip')).toBe('triceps')
    })

    it('"Assisted Dip" is classified as triceps', () => {
      expect(getDetailedMuscleGroup('Assisted Dip')).toBe('triceps')
    })

    it('"Cable Pushdown" is classified as triceps', () => {
      expect(getDetailedMuscleGroup('Cable Pushdown')).toBe('triceps')
    })

    // -- Back --
    it('"Barbell Row" is classified as back', () => {
      expect(getDetailedMuscleGroup('Barbell Row')).toBe('back')
    })

    it('"Lat Pulldown" is classified as back', () => {
      expect(getDetailedMuscleGroup('Lat Pulldown')).toBe('back')
    })

    // -- Quadriceps --
    it('"Barbell Squat" is classified as quadriceps', () => {
      expect(getDetailedMuscleGroup('Barbell Squat')).toBe('quadriceps')
    })

    it('"Leg Press" is classified as quadriceps', () => {
      expect(getDetailedMuscleGroup('Leg Press')).toBe('quadriceps')
    })

    it('"Leg Extension" is classified as quadriceps', () => {
      expect(getDetailedMuscleGroup('Leg Extension')).toBe('quadriceps')
    })

    // -- Core --
    it('"Plank" is classified as core', () => {
      expect(getDetailedMuscleGroup('Plank')).toBe('core')
    })

    // -- Unknown --
    it('unknown exercise returns null', () => {
      expect(getDetailedMuscleGroup('Wrist Roller')).toBeNull()
    })
  })

  describe('getSimpleMuscleGroup', () => {
    it('"Hip Thrust" maps to legs', () => {
      expect(getSimpleMuscleGroup('Hip Thrust')).toBe('legs')
    })

    it('"Calf Raise" maps to legs', () => {
      expect(getSimpleMuscleGroup('Calf Raise')).toBe('legs')
    })

    it('"Cable Lateral Raise" maps to shoulders', () => {
      expect(getSimpleMuscleGroup('Cable Lateral Raise')).toBe('shoulders')
    })

    it('"Z-bar Curl" maps to arms', () => {
      expect(getSimpleMuscleGroup('Z-bar Curl')).toBe('arms')
    })
  })
})
