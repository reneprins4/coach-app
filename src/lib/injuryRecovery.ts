/**
 * Injury Recovery System
 *
 * Manages active injuries, exercise exclusions, safe alternatives,
 * rehab exercises, and recovery progression tracking.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InjuryArea = 'shoulder' | 'knee' | 'lower_back' | 'elbow' | 'wrist' | 'hip' | 'neck' | 'ankle' | 'upper_back' | 'chest' | 'groin' | 'foot'
export type InjurySeverity = 'mild' | 'moderate' | 'severe'
export type InjurySide = 'left' | 'right' | 'both'
export type InjuryStatus = 'active' | 'recovering' | 'resolved'
export type CheckInFeeling = 'worse' | 'same' | 'better' | 'recovered'

export interface ActiveInjury {
  id: string
  bodyArea: InjuryArea
  side: InjurySide
  severity: InjurySeverity
  reportedDate: string
  status: InjuryStatus
  checkIns: InjuryCheckIn[]
}

export interface InjuryCheckIn {
  date: string
  feeling: CheckInFeeling
}

export interface RehabExercise {
  name: string
  description: string
  sets: number
  reps: string
  frequency: string
}

export interface InjuryAreaConfig {
  nameKey: string
  affectedMuscles: string[]
  excludedPatterns: string[]
  /** Additional patterns only excluded when severity is 'severe' */
  severeOnlyExclusions: string[]
  /** Subset of severeOnlyExclusions also excluded for 'moderate' severity (highest-risk exercises) */
  moderateExclusions: string[]
  alternatives: Record<string, string>
  rehabExercises: RehabExercise[]
}

export interface RecoveryGuidance {
  weightModifier: number
  message: string
}

export interface FilteredExercise {
  name: string
  muscle_group: string
  isRehab?: boolean
  isAlternative?: boolean
  originalExercise?: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Injury Area Configuration
// ---------------------------------------------------------------------------

export const INJURY_AREAS: Record<InjuryArea, InjuryAreaConfig> = {
  shoulder: {
    nameKey: 'injury.area.shoulder',
    affectedMuscles: ['shoulders', 'chest', 'triceps'],
    excludedPatterns: [
      'overhead press', 'ohp', 'military press', 'lateral raise',
      'front raise', 'upright row', 'arnold press', 'behind neck',
      'shoulder press',
    ],
    severeOnlyExclusions: [
      'bench press', 'push.?up', 'dip', 'chest fly', 'cable fly',
      'pec deck', 'incline.*press', 'decline.*press', 'floor press',
    ],
    moderateExclusions: [
      'bench press', 'dip', 'incline.*press', 'decline.*press',
    ],
    alternatives: {
      'Overhead Press': 'Landmine Press',
      'Barbell Overhead Press': 'Landmine Press',
      'Dumbbell Overhead Press': 'Landmine Press',
      'Lateral Raise': 'Cable Lateral Raise (light)',
      'Arnold Press': 'Landmine Press',
      'Upright Row': 'Face Pull',
      'Military Press': 'Landmine Press',
      'Flat Barbell Bench Press': 'Floor Press',
      'Incline Barbell Bench Press': 'Floor Press',
      'Incline Dumbbell Press': 'Floor Press',
    },
    rehabExercises: [
      { name: 'Band Pull-Aparts', description: 'rehab.shoulder_band_pull_apart_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_daily' },
      { name: 'External Rotation', description: 'rehab.shoulder_external_rotation_desc', sets: 3, reps: '12-15', frequency: 'rehab.frequency_daily' },
      { name: 'Face Pulls', description: 'rehab.shoulder_face_pulls_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_3x_week' },
      { name: 'Wall Slides', description: 'rehab.shoulder_wall_slides_desc', sets: 2, reps: '10-12', frequency: 'rehab.frequency_daily' },
    ],
  },

  knee: {
    nameKey: 'injury.area.knee',
    affectedMuscles: ['quads', 'hamstrings', 'glutes'],
    excludedPatterns: [
      'back squat', 'front squat', 'goblet squat', 'barbell squat',
      'bodyweight squat', 'air squat', 'zercher squat', 'overhead squat',
      'box squat', 'safety bar squat', 'cyclist squat', 'pendulum squat',
      'belt squat', 'sissy squat', 'jump squat',
      'lunge', 'leg extension', 'jump', 'box jump',
      'pistol', 'split squat', 'bulgarian', 'step.?up',
    ],
    severeOnlyExclusions: [
      'leg press', 'hack squat', 'smith.*squat', 'leg curl', 'hip thrust',
      'deadlift', 'calf raise',
    ],
    moderateExclusions: [
      'leg press', 'hack squat', 'smith.*squat',
    ],
    alternatives: {
      'Back Squat': 'Leg Press (Limited ROM)',
      'Front Squat': 'Leg Press (Limited ROM)',
      'Hack Squat': 'Leg Press (Limited ROM)',
      'Walking Lunges': 'Glute Bridge',
      'Bulgarian Split Squat': 'Glute Bridge',
      'Leg Extension': 'Straight Leg Raise (isometric)',
      'Barbell Squat': 'Leg Press (Limited ROM)',
    },
    rehabExercises: [
      { name: 'Straight Leg Raise', description: 'rehab.knee_straight_leg_raise_desc', sets: 3, reps: '12-15', frequency: 'rehab.frequency_daily' },
      { name: 'Wall Sit', description: 'rehab.knee_wall_sit_desc', sets: 3, reps: '20-30s hold', frequency: 'rehab.frequency_daily' },
      { name: 'Terminal Knee Extension', description: 'rehab.knee_terminal_knee_ext_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_daily' },
      { name: 'Step-Up (low box)', description: 'rehab.knee_step_up_desc', sets: 2, reps: '10-12', frequency: 'rehab.frequency_3x_week' },
    ],
  },

  lower_back: {
    nameKey: 'injury.area.lower_back',
    affectedMuscles: ['back', 'core', 'glutes'],
    excludedPatterns: [
      'deadlift', 'good morning', 'barbell row', 'pendlay row',
      'bent.?over', 'hyperextension', 't.?bar row',
    ],
    severeOnlyExclusions: [
      'squat', 'overhead press', 'hip thrust', 'romanian',
      'stiff.?leg',
    ],
    moderateExclusions: [
      'squat', 'romanian', 'stiff.?leg',
    ],
    alternatives: {
      'Conventional Deadlift': 'Hyperextension (bodyweight)',
      'Romanian Deadlift': 'Lying Leg Curl',
      'Barbell Row': 'Chest Supported Row',
      'Pendlay Row': 'Chest Supported Row',
      'T-Bar Row': 'Chest Supported Row',
      'Good Morning': 'Glute Bridge',
    },
    rehabExercises: [
      { name: 'Cat-Cow Stretch', description: 'rehab.lower_back_cat_cow_desc', sets: 2, reps: '10-12', frequency: 'rehab.frequency_daily' },
      { name: 'Bird Dog', description: 'rehab.lower_back_bird_dog_desc', sets: 3, reps: '10 per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Dead Bug', description: 'rehab.lower_back_dead_bug_desc', sets: 3, reps: '10 per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Glute Bridge', description: 'rehab.lower_back_glute_bridge_desc', sets: 3, reps: '12-15', frequency: 'rehab.frequency_daily' },
    ],
  },

  elbow: {
    nameKey: 'injury.area.elbow',
    affectedMuscles: ['biceps', 'triceps'],
    excludedPatterns: [
      'bicep curl', 'barbell curl', 'dumbbell curl', 'ez.?bar curl',
      'preacher curl', 'concentration curl', 'hammer curl', 'cable curl',
      'incline.*curl', 'machine.*curl', 'spider curl', 'bayesian.*curl',
      'reverse.*curl', '21s.*curl', 'band curl',
      'skull crush', 'close grip bench', 'preacher',
      'concentration', 'overhead.*extension', 'pushdown',
      'tricep kickback',
    ],
    severeOnlyExclusions: [
      'bench press', 'row', 'pull.?up', 'chin.?up', 'pulldown',
      'dip',
    ],
    moderateExclusions: [
      'pull.?up', 'chin.?up', 'dip',
    ],
    alternatives: {
      'Barbell Curl': 'Hammer Curl (light)',
      'EZ-Bar Curl': 'Hammer Curl (light)',
      'Skull Crusher': 'Tricep Pushdown (light)',
      'Close Grip Bench Press': 'Diamond Push-Up',
      'Preacher Curl': 'Hammer Curl (light)',
    },
    rehabExercises: [
      { name: 'Wrist Flexor Stretch', description: 'rehab.elbow_wrist_flexor_stretch_desc', sets: 3, reps: '30s hold', frequency: 'rehab.frequency_daily' },
      { name: 'Wrist Extensor Stretch', description: 'rehab.elbow_wrist_extensor_stretch_desc', sets: 3, reps: '30s hold', frequency: 'rehab.frequency_daily' },
      { name: 'Pronation/Supination', description: 'rehab.elbow_pronation_supination_desc', sets: 2, reps: '15 per richting', frequency: 'rehab.frequency_daily' },
      { name: 'Eccentric Wrist Curl', description: 'rehab.elbow_eccentric_wrist_curl_desc', sets: 3, reps: '12-15', frequency: 'rehab.frequency_3x_week' },
    ],
  },

  wrist: {
    nameKey: 'injury.area.wrist',
    affectedMuscles: ['biceps', 'triceps'],
    excludedPatterns: [
      'wrist curl', 'reverse.*curl', 'barbell curl',
      'clean', 'snatch', 'front squat',
    ],
    severeOnlyExclusions: [
      'bench press', 'push.?up', 'overhead press', 'deadlift',
      'row',
    ],
    moderateExclusions: [
      'bench press', 'push.?up', 'overhead press',
    ],
    alternatives: {
      'Barbell Curl': 'Machine Bicep Curl',
      'Front Squat': 'Back Squat',
      'Push-up': 'Machine Chest Press',
    },
    rehabExercises: [
      { name: 'Wrist Circles', description: 'rehab.wrist_circles_desc', sets: 2, reps: '10 per richting', frequency: 'rehab.frequency_daily' },
      { name: 'Finger Extensions', description: 'rehab.wrist_finger_extensions_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_daily' },
      { name: 'Rice Bucket Grabs', description: 'rehab.wrist_rice_bucket_desc', sets: 2, reps: '30s', frequency: 'rehab.frequency_daily' },
    ],
  },

  hip: {
    nameKey: 'injury.area.hip',
    affectedMuscles: ['glutes', 'quads', 'hamstrings'],
    excludedPatterns: [
      'hip thrust', 'sumo', 'abductor', 'adductor',
      'kickback', 'cossack', 'lateral.*walk',
    ],
    severeOnlyExclusions: [
      'squat', 'lunge', 'deadlift', 'leg press',
      'split squat', 'step.?up',
    ],
    moderateExclusions: [
      'squat', 'lunge', 'deadlift',
    ],
    alternatives: {
      'Hip Thrust': 'Glute Bridge (bodyweight)',
      'Sumo Deadlift': 'Conventional Deadlift',
      'Bulgarian Split Squat': 'Leg Extension',
    },
    rehabExercises: [
      { name: 'Clamshell', description: 'rehab.hip_clamshell_desc', sets: 3, reps: '15 per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Hip Flexor Stretch', description: 'rehab.hip_flexor_stretch_desc', sets: 2, reps: '30s hold per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Glute Bridge', description: 'rehab.hip_glute_bridge_desc', sets: 3, reps: '12-15', frequency: 'rehab.frequency_daily' },
      { name: 'Fire Hydrant', description: 'rehab.hip_fire_hydrant_desc', sets: 3, reps: '12 per kant', frequency: 'rehab.frequency_3x_week' },
    ],
  },

  neck: {
    nameKey: 'injury.area.neck',
    affectedMuscles: ['shoulders', 'back'],
    excludedPatterns: [
      'shrug', 'upright row', 'behind neck',
      'overhead press', 'military press',
    ],
    severeOnlyExclusions: [
      'deadlift', 'barbell row', 'pull.?up', 'lat pulldown',
      'bench press',
    ],
    moderateExclusions: [
      'deadlift', 'barbell row', 'pull.?up',
    ],
    alternatives: {
      'Barbell Shrug': 'Face Pull',
      'Upright Row': 'Lateral Raise',
      'Barbell Overhead Press': 'Landmine Press',
    },
    rehabExercises: [
      { name: 'Chin Tucks', description: 'rehab.neck_chin_tucks_desc', sets: 3, reps: '10-12', frequency: 'rehab.frequency_daily' },
      { name: 'Neck Isometrics', description: 'rehab.neck_isometrics_desc', sets: 2, reps: '10s per richting', frequency: 'rehab.frequency_daily' },
      { name: 'Upper Trap Stretch', description: 'rehab.neck_upper_trap_stretch_desc', sets: 2, reps: '30s per kant', frequency: 'rehab.frequency_daily' },
    ],
  },

  ankle: {
    nameKey: 'injury.area.ankle',
    affectedMuscles: ['quads', 'hamstrings', 'glutes'],
    excludedPatterns: [
      'calf raise', 'jump', 'box jump', 'lunge',
      'walking', 'step.?up', 'pistol',
    ],
    severeOnlyExclusions: [
      'squat', 'deadlift', 'leg press', 'split squat',
      'bulgarian',
    ],
    moderateExclusions: [
      'squat', 'deadlift',
    ],
    alternatives: {
      'Standing Calf Raise': 'Seated Calf Raise (limited ROM)',
      'Walking Lunges': 'Leg Extension',
      'Box Jump': 'Leg Press',
    },
    rehabExercises: [
      { name: 'Ankle Circles', description: 'rehab.ankle_circles_desc', sets: 2, reps: '10 per richting', frequency: 'rehab.frequency_daily' },
      { name: 'Towel Scrunches', description: 'rehab.ankle_towel_scrunches_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_daily' },
      { name: 'Single Leg Balance', description: 'rehab.ankle_single_leg_balance_desc', sets: 3, reps: '30s per been', frequency: 'rehab.frequency_daily' },
      { name: 'Calf Stretch', description: 'rehab.ankle_calf_stretch_desc', sets: 2, reps: '30s per kant', frequency: 'rehab.frequency_daily' },
    ],
  },

  upper_back: {
    nameKey: 'injury.area.upper_back',
    affectedMuscles: ['back', 'shoulders'],
    excludedPatterns: [
      'barbell row', 'bent.?over.*row', 't.?bar row', 'face pull',
      'shrug', 'upright row',
    ],
    severeOnlyExclusions: [
      'deadlift', 'pull.?up', 'chin.?up', 'lat pulldown',
      'seated row', 'cable row',
    ],
    moderateExclusions: [
      'deadlift', 'pull.?up', 'chin.?up',
    ],
    alternatives: {
      'Barbell Row': 'Chest Supported Row',
      'Pendlay Row': 'Chest Supported Row',
      'Pull-up': 'Lat Pulldown (light)',
      'Chin-up': 'Lat Pulldown (light)',
      'Conventional Deadlift': 'Hip Thrust',
      'Deadlift': 'Hip Thrust',
    },
    rehabExercises: [
      { name: 'Band Pull-Apart', description: 'rehab.upper_back_band_pull_apart_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_daily' },
      { name: 'Thoracic Extension (foam roller)', description: 'rehab.upper_back_foam_roller_desc', sets: 2, reps: '10-12', frequency: 'rehab.frequency_daily' },
      { name: 'Cat-Cow Stretch', description: 'rehab.upper_back_cat_cow_desc', sets: 2, reps: '10-12', frequency: 'rehab.frequency_daily' },
      { name: 'Face Pull (light)', description: 'rehab.upper_back_face_pull_light_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_3x_week' },
    ],
  },

  chest: {
    nameKey: 'injury.area.chest',
    affectedMuscles: ['chest', 'shoulders', 'triceps'],
    excludedPatterns: [
      'bench press', 'chest fly', 'cable fly', 'pec deck',
      'dip', 'push.?up',
    ],
    severeOnlyExclusions: [
      'incline.*press', 'decline.*press', 'floor press',
      'overhead press', 'close grip bench', 'cable crossover',
    ],
    moderateExclusions: [
      'incline.*press', 'dip', 'overhead press',
    ],
    alternatives: {
      'Flat Barbell Bench Press': 'Landmine Press',
      'Incline Barbell Bench Press': 'Landmine Press',
      'Bench Press': 'Landmine Press',
      'Chest Fly': 'Cable Row',
      'Cable Fly': 'Cable Row',
      'Dip': 'Tricep Pushdown',
    },
    rehabExercises: [
      { name: 'Doorway Pec Stretch', description: 'rehab.chest_doorway_stretch_desc', sets: 2, reps: '30s hold per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Light Cable Fly', description: 'rehab.chest_light_cable_fly_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_3x_week' },
      { name: 'Band Chest Press', description: 'rehab.chest_band_press_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_3x_week' },
    ],
  },

  groin: {
    nameKey: 'injury.area.groin',
    affectedMuscles: ['quads', 'hamstrings', 'glutes'],
    excludedPatterns: [
      'sumo.*deadlift', 'sumo.*squat', 'adductor',
      'lateral.*lunge', 'side.*lunge', 'cossack',
    ],
    severeOnlyExclusions: [
      'squat', 'lunge', 'leg press', 'split squat',
      'bulgarian', 'hip thrust', 'deadlift', 'step.?up',
    ],
    moderateExclusions: [
      'squat', 'lunge', 'leg press',
    ],
    alternatives: {
      'Back Squat': 'Leg Extension',
      'Front Squat': 'Leg Extension',
      'Barbell Squat': 'Leg Extension',
      'Walking Lunges': 'Leg Curl',
      'Bulgarian Split Squat': 'Leg Curl',
      'Leg Press': 'Seated Leg Curl',
    },
    rehabExercises: [
      { name: 'Adductor Stretch', description: 'rehab.groin_adductor_stretch_desc', sets: 2, reps: '30s hold per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Side-Lying Adductor Raise', description: 'rehab.groin_side_lying_raise_desc', sets: 3, reps: '12-15 per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Copenhagen Plank', description: 'rehab.groin_copenhagen_plank_desc', sets: 3, reps: '15-20s hold per kant', frequency: 'rehab.frequency_3x_week' },
      { name: 'Light Adductor Squeeze', description: 'rehab.groin_adductor_squeeze_desc', sets: 3, reps: '10-12', frequency: 'rehab.frequency_daily' },
    ],
  },

  foot: {
    nameKey: 'injury.area.foot',
    affectedMuscles: ['quads', 'glutes'],
    excludedPatterns: [
      'calf raise', 'jump', 'box jump', 'jump squat',
      'skipping',
    ],
    severeOnlyExclusions: [
      'squat', 'deadlift', 'lunge', 'leg press',
      'walking.*lunge', 'farmer.*walk', 'step.?up',
    ],
    moderateExclusions: [
      'squat', 'lunge', 'standing.*calf raise',
    ],
    alternatives: {
      'Back Squat': 'Leg Extension',
      'Front Squat': 'Leg Extension',
      'Barbell Squat': 'Leg Extension',
      'Standing Calf Raise': 'Seated Calf Raise',
      'Walking Lunges': 'Leg Curl',
      'Lunge': 'Leg Curl',
    },
    rehabExercises: [
      { name: 'Towel Scrunch', description: 'rehab.foot_towel_scrunch_desc', sets: 3, reps: '15-20', frequency: 'rehab.frequency_daily' },
      { name: 'Calf Stretch', description: 'rehab.foot_calf_stretch_desc', sets: 2, reps: '30s per kant', frequency: 'rehab.frequency_daily' },
      { name: 'Marble Pickup', description: 'rehab.foot_marble_pickup_desc', sets: 2, reps: '10-15', frequency: 'rehab.frequency_daily' },
    ],
  },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'kravex_injuries'

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Get all excluded exercise patterns for an injury area and severity.
 * Returns an array of regex-compatible pattern strings.
 */
export function getExcludedExercises(area: InjuryArea, severity: InjurySeverity): string[] {
  const config = INJURY_AREAS[area]
  if (!config) return []

  const patterns = [...config.excludedPatterns]
  if (severity === 'severe') {
    patterns.push(...config.severeOnlyExclusions)
  } else if (severity === 'moderate') {
    patterns.push(...config.moderateExclusions)
  }
  return patterns
}

/**
 * Find a safe alternative for a given exercise in the context of an injury.
 * Uses substring matching against the alternatives map.
 */
export function getSafeAlternative(area: InjuryArea, exerciseName: string): string | null {
  const config = INJURY_AREAS[area]
  if (!config) return null

  // Direct lookup
  if (config.alternatives[exerciseName]) {
    return config.alternatives[exerciseName]!
  }

  // Fuzzy lookup: find the best matching key
  const lowerName = exerciseName.toLowerCase()
  for (const [key, value] of Object.entries(config.alternatives)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return value
    }
  }

  return null
}

/**
 * Get rehab exercises for an injury area, adjusted for severity.
 * Mild: full sets, all exercises. Severe: reduced sets, fewer exercises.
 */
export function getRehabExercises(area: InjuryArea, severity: InjurySeverity): RehabExercise[] {
  const config = INJURY_AREAS[area]
  if (!config) return []

  const exercises = [...config.rehabExercises]

  if (severity === 'severe') {
    // Severe: limit to first 3, reduce sets
    return exercises.slice(0, 3).map(ex => ({
      ...ex,
      sets: Math.max(1, ex.sets - 1),
    }))
  }

  if (severity === 'moderate') {
    // Moderate: limit to first 4 exercises
    return exercises.slice(0, 4).map(ex => ({ ...ex }))
  }

  // Mild: full exercises
  return exercises.map(ex => ({ ...ex }))
}

/**
 * Check if an exercise is safe to perform given a list of active injuries.
 * Only considers injuries with status 'active' or 'recovering'.
 */
export function isExerciseSafe(exerciseName: string, injuries: ActiveInjury[]): boolean {
  const lowerName = exerciseName.toLowerCase()

  for (const injury of injuries) {
    if (injury.status === 'resolved') continue

    const excluded = getExcludedExercises(injury.bodyArea, injury.severity)
    for (const pattern of excluded) {
      try {
        if (new RegExp(pattern, 'i').test(lowerName)) {
          return false
        }
      } catch {
        // Invalid regex, fall back to substring
        if (lowerName.includes(pattern.toLowerCase())) {
          return false
        }
      }
    }
  }

  return true
}

/**
 * Filter a workout's exercises for active injuries.
 * - Removes excluded exercises (replaces with alternatives when available)
 * - Appends rehab exercises at the end
 */
export function filterWorkoutForInjuries(
  exercises: Array<{ name: string; muscle_group: string; [key: string]: unknown }>,
  injuries: ActiveInjury[],
): FilteredExercise[] {
  const active = injuries.filter(i => i.status !== 'resolved')
  if (active.length === 0) {
    return exercises.map(e => ({ ...e }))
  }

  const result: FilteredExercise[] = []

  // Process each exercise
  // Skip safety check for exercises already flagged as rehab — they are prescribed
  // specifically for the injury and may match their own exclusion patterns
  for (const ex of exercises) {
    if ((ex as FilteredExercise).isRehab || isExerciseSafe(ex.name, active)) {
      result.push({ ...ex })
    } else {
      // Try to find a safe alternative from any matching injury
      let replaced = false
      for (const injury of active) {
        const excluded = getExcludedExercises(injury.bodyArea, injury.severity)
        const isExcluded = excluded.some(p => {
          try {
            return new RegExp(p, 'i').test(ex.name.toLowerCase())
          } catch {
            return ex.name.toLowerCase().includes(p.toLowerCase())
          }
        })

        if (isExcluded) {
          const alt = getSafeAlternative(injury.bodyArea, ex.name)
          if (alt && isExerciseSafe(alt, active)) {
            result.push({
              name: alt,
              muscle_group: ex.muscle_group,
              isAlternative: true,
              originalExercise: ex.name,
            })
            replaced = true
            break
          }
          // Alternative is unsafe or doesn't exist — try next injury's alternative
        }
      }
      // If no safe alternative was found across all injuries, drop the exercise entirely
      if (!replaced) {
        // Exercise is excluded and no safe alternative exists — omitted from workout
      }
    }
  }

  // Append rehab exercises for each active injury
  // Rehab exercises are marked with isRehab: true and skip the safety check
  // because they may match their own injury's excluded patterns (e.g. "Step-Up (low box)" matches step.?up)
  const seenRehabNames = new Set<string>()
  for (const injury of active) {
    const rehab = getRehabExercises(injury.bodyArea, injury.severity)
    for (const ex of rehab) {
      if (!seenRehabNames.has(ex.name)) {
        seenRehabNames.add(ex.name)
        result.push({
          name: ex.name,
          muscle_group: 'rehab',
          isRehab: true,
        })
      }
    }
  }

  // Remove any workout exercises that duplicate a rehab exercise name
  // (rehab exercises take precedence and should not be filtered out)
  const rehabNames = new Set(result.filter(e => e.isRehab).map(e => e.name))
  const filtered = result.filter(e => e.isRehab || !rehabNames.has(e.name))

  return filtered
}

// ---------------------------------------------------------------------------
// Injury State Management
// ---------------------------------------------------------------------------

/**
 * Create a new active injury record.
 */
export function addInjury(input: {
  bodyArea: InjuryArea
  side: InjurySide
  severity: InjurySeverity
}): ActiveInjury {
  return {
    id: crypto.randomUUID(),
    bodyArea: input.bodyArea,
    side: input.side,
    severity: input.severity,
    reportedDate: new Date().toISOString(),
    status: 'active',
    checkIns: [],
  }
}

/**
 * Record a check-in for an injury and update its status accordingly.
 *
 * Status transitions:
 * - 'recovered' feeling -> 'resolved'
 * - 'worse' feeling -> 'active'
 * - Two consecutive 'better' feelings -> 'recovering'
 * - Otherwise status unchanged
 */
export function addCheckIn(injury: ActiveInjury, feeling: CheckInFeeling): ActiveInjury {
  const checkIn: InjuryCheckIn = {
    date: new Date().toISOString(),
    feeling,
  }

  const updated: ActiveInjury = {
    ...injury,
    checkIns: [...injury.checkIns, checkIn],
  }

  // Determine new status
  if (feeling === 'recovered') {
    updated.status = 'resolved'
  } else if (feeling === 'worse') {
    updated.status = 'active'
  } else if (feeling === 'better') {
    // Check for two consecutive 'better' check-ins
    const checkIns = updated.checkIns
    if (checkIns.length >= 2) {
      const last = checkIns[checkIns.length - 1]
      const secondLast = checkIns[checkIns.length - 2]
      if (last?.feeling === 'better' && secondLast?.feeling === 'better') {
        updated.status = 'recovering'
      }
    }
  }

  return updated
}

/**
 * Return only active and recovering injuries (exclude resolved).
 */
export function getActiveInjuries(injuries: ActiveInjury[]): ActiveInjury[] {
  return injuries.filter(i => i.status === 'active' || i.status === 'recovering')
}

// ---------------------------------------------------------------------------
// Recovery Guidance
// ---------------------------------------------------------------------------

/**
 * Get weight modification guidance based on injury status.
 *
 * - active: avoid affected exercises entirely (weightModifier = 0)
 * - recovering: use 70% of normal weight
 * - resolved: normal training (weightModifier = 1)
 */
export function getRecoveryGuidance(injury: ActiveInjury): RecoveryGuidance {
  switch (injury.status) {
    case 'active':
      return {
        weightModifier: 0,
        message: 'injury.guidance.avoid',
      }
    case 'recovering': {
      const severityModifiers: Record<InjurySeverity, number> = {
        mild: 0.85,
        moderate: 0.7,
        severe: 0.5,
      }
      return {
        weightModifier: severityModifiers[injury.severity],
        message: 'injury.guidance.reduced',
      }
    }
    case 'resolved':
      return {
        weightModifier: 1,
        message: 'injury.guidance.normal',
      }
  }
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Save injuries to localStorage.
 */
export function saveInjuries(injuries: ActiveInjury[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(injuries))
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Load injuries from localStorage. Returns empty array on failure.
 */
export function loadInjuries(): ActiveInjury[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as ActiveInjury[]
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Legacy compatibility exports
// ---------------------------------------------------------------------------

/** @deprecated Use addInjury instead */
export function reportInjury(area: InjuryArea, severity: InjurySeverity, side: InjurySide): ActiveInjury {
  return addInjury({ bodyArea: area, side, severity })
}

/** @deprecated Use addCheckIn instead */
export function recordCheckIn(injury: ActiveInjury, feeling: CheckInFeeling): ActiveInjury {
  return addCheckIn(injury, feeling)
}

/** Mark an injury as resolved. */
export function resolveInjury(injury: ActiveInjury): ActiveInjury {
  return { ...injury, status: 'resolved' }
}

/** Check if a check-in is due (3+ days since last check-in or report). */
export function isCheckInDue(injury: ActiveInjury): boolean {
  if (injury.status === 'resolved') return false
  if (injury.checkIns.length === 0) {
    const daysSinceReport = (Date.now() - new Date(injury.reportedDate).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceReport >= 3
  }
  const lastCheckIn = injury.checkIns[injury.checkIns.length - 1]!
  const daysSince = (Date.now() - new Date(lastCheckIn.date).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince >= 3
}

/** Calculate days since injury was reported. */
export function daysSinceInjury(injury: ActiveInjury): number {
  return Math.floor((Date.now() - new Date(injury.reportedDate).getTime()) / (1000 * 60 * 60 * 24))
}
