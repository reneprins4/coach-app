/**
 * Simulation user profiles — fictitious athletes for integration testing.
 *
 * Each profile maps to a realistic training persona. The `toSettings` helper
 * converts a profile into a full UserSettings object suitable for passing
 * to any library function that expects UserSettings.
 */

import type { UserSettings, ExperienceLevel, Equipment, TrainingGoal, Gender } from '../../../types'

// ---------------------------------------------------------------------------
// Profile type
// ---------------------------------------------------------------------------

export interface UserProfile {
  name: string
  age: number
  experienceLevel: ExperienceLevel
  equipment: Equipment
  frequency: string
  goal: TrainingGoal
  bodyweight: string
  gender: Gender
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

/** Complete beginner, bodyweight at home, 3x/week Full Body */
export const EMMA: UserProfile = {
  name: 'Emma',
  age: 19,
  experienceLevel: 'complete_beginner',
  equipment: 'bodyweight',
  frequency: '3',
  goal: 'hypertrophy',
  bodyweight: '58',
  gender: 'female',
}

/** Advanced lifter, full gym, 4x/week, strength-focused */
export const MARCUS: UserProfile = {
  name: 'Marcus',
  age: 34,
  experienceLevel: 'advanced',
  equipment: 'full_gym',
  frequency: '4',
  goal: 'strength',
  bodyweight: '90',
  gender: 'male',
}

/** Returning lifter, full gym, 3x/week, hypertrophy */
export const JAAP: UserProfile = {
  name: 'Jaap',
  age: 54,
  experienceLevel: 'returning',
  equipment: 'full_gym',
  frequency: '3',
  goal: 'hypertrophy',
  bodyweight: '85',
  gender: 'male',
}

/** Advanced lifter, full gym, 6x/week PPL, hypertrophy */
export const TYLER: UserProfile = {
  name: 'Tyler',
  age: 26,
  experienceLevel: 'advanced',
  equipment: 'full_gym',
  frequency: '6',
  goal: 'hypertrophy',
  bodyweight: '82',
  gender: 'male',
}

/** Intermediate lifter, full gym, 3x/week, hypertrophy */
export const SOFIA: UserProfile = {
  name: 'Sofia',
  age: 29,
  experienceLevel: 'intermediate',
  equipment: 'full_gym',
  frequency: '3',
  goal: 'hypertrophy',
  bodyweight: '65',
  gender: 'female',
}

/** Intermediate lifter, full gym, 3x/week, hypertrophy — switches programs */
export const LENA: UserProfile = {
  name: 'Lena',
  age: 38,
  experienceLevel: 'intermediate',
  equipment: 'full_gym',
  frequency: '3',
  goal: 'hypertrophy',
  bodyweight: '70',
  gender: 'female',
}

// ---------------------------------------------------------------------------
// Conversion helper
// ---------------------------------------------------------------------------

/**
 * Convert a UserProfile to a full UserSettings object.
 * Fills in sensible defaults for fields not present on the profile.
 */
export function toSettings(profile: UserProfile): UserSettings {
  const bw = parseFloat(profile.bodyweight) || 80

  // Rough 1RM estimates based on bodyweight and experience level
  const levelMult: Record<ExperienceLevel, number> = {
    complete_beginner: 0.5,
    beginner: 0.65,
    returning: 0.75,
    intermediate: 1.0,
    advanced: 1.3,
  }
  const mult = levelMult[profile.experienceLevel]

  return {
    name: profile.name,
    gender: profile.gender,
    goal: profile.goal,
    frequency: `${profile.frequency}x`,
    restTime: 90,
    units: 'kg',
    memberSince: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    bodyweight: profile.bodyweight,
    experienceLevel: profile.experienceLevel,
    equipment: profile.equipment,
    benchMax: String(Math.round(bw * 1.0 * mult / 2.5) * 2.5),
    squatMax: String(Math.round(bw * 1.4 * mult / 2.5) * 2.5),
    deadliftMax: String(Math.round(bw * 1.8 * mult / 2.5) * 2.5),
    ohpMax: String(Math.round(bw * 0.6 * mult / 2.5) * 2.5),
    onboardingCompleted: true,
    language: 'auto',
    time: 60,
    trainingGoal: profile.goal,
    trainingPhase: 'build',
    mainLift: null,
    mainLiftGoalKg: null,
    mainLiftGoalDate: null,
    priorityMuscles: [],
    priorityMusclesUntil: null,
  }
}
