/**
 * Static Exercise Substitute Database
 * Replaces LLM calls for getExerciseSubstitute — zero API cost.
 *
 * Logic:
 * 1. Direct lookup by exercise name + reason
 * 2. Fallback: pick best match from same muscle group based on available equipment
 */

import type { EquipmentType, StaticExercise, SubstituteOption, SubstituteOptionsInput, ExerciseSubstituteResponse, SubstitutionReason } from '../types'

// Equipment priority order per reason
const EQUIPMENT_PRIORITY: Record<string, EquipmentType[]> = {
  machine_busy: ['barbell', 'dumbbell', 'cable', 'bodyweight'],
  no_equipment: ['bodyweight', 'dumbbell'],
  injury:        ['bodyweight', 'machine', 'dumbbell', 'cable'],
  default:       ['dumbbell', 'cable', 'barbell', 'bodyweight', 'machine'],
}

// Equipment availability map
const EQUIPMENT_SETS: Record<string, EquipmentType[]> = {
  full_gym:    ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'],
  home_gym:    ['barbell', 'dumbbell', 'bodyweight'],
  dumbbells:   ['dumbbell', 'bodyweight'],
  bodyweight:  ['bodyweight'],
}

// Direct substitution map
const DIRECT_SUBSTITUTES: Record<string, Record<string, string>> = {
  // ---- CHEST ----
  'Flat Barbell Bench Press':     { machine_busy: 'Flat Dumbbell Bench Press',   no_equipment: 'Push-up',          injury: 'Push-up' },
  'Incline Barbell Bench Press':  { machine_busy: 'Incline Dumbbell Press',       no_equipment: 'Push-up',          injury: 'Incline Dumbbell Press' },
  'Decline Barbell Bench Press':  { machine_busy: 'Decline Dumbbell Press',       no_equipment: 'Push-up',          injury: 'Push-up' },
  'Flat Dumbbell Bench Press':    { machine_busy: 'Flat Barbell Bench Press',     no_equipment: 'Push-up',          injury: 'Push-up' },
  'Incline Dumbbell Press':       { machine_busy: 'Incline Barbell Bench Press',  no_equipment: 'Push-up',          injury: 'Push-up' },
  'Decline Dumbbell Press':       { machine_busy: 'Decline Barbell Bench Press',  no_equipment: 'Push-up',          injury: 'Push-up' },
  'Pec Deck':                     { machine_busy: 'Cable Fly (Mid)',              no_equipment: 'Push-up',          injury: 'Push-up' },
  'Cable Fly':                    { machine_busy: 'Flat Dumbbell Bench Press',    no_equipment: 'Push-up',          injury: 'Push-up' },
  'Cable Fly (Mid)':              { machine_busy: 'Flat Dumbbell Bench Press',    no_equipment: 'Push-up',          injury: 'Push-up' },
  'Cable Fly (High)':             { machine_busy: 'Decline Dumbbell Press',       no_equipment: 'Push-up',          injury: 'Push-up' },
  'Cable Fly (Low)':              { machine_busy: 'Incline Dumbbell Press',       no_equipment: 'Push-up',          injury: 'Push-up' },
  'Chest Dip':                    { machine_busy: 'Decline Dumbbell Press',       no_equipment: 'Push-up',          injury: 'Push-up' },
  'Push-up':                      { machine_busy: 'Push-up',                      no_equipment: 'Push-up',          injury: 'Push-up' },
  'Incline Bench Press':          { machine_busy: 'Incline Dumbbell Press',       no_equipment: 'Push-up',          injury: 'Push-up' },
  // ---- BACK ----
  'Barbell Row':                  { machine_busy: 'Dumbbell Row',               no_equipment: 'Pull-up',              injury: 'Chest Supported Row' },
  'Pendlay Row':                  { machine_busy: 'Dumbbell Row',               no_equipment: 'Pull-up',              injury: 'Chest Supported Row' },
  'T-Bar Row':                    { machine_busy: 'Barbell Row',                no_equipment: 'Pull-up',              injury: 'Chest Supported Row' },
  'Meadows Row':                  { machine_busy: 'Dumbbell Row',               no_equipment: 'Pull-up',              injury: 'Chest Supported Row' },
  'Dumbbell Row':                 { machine_busy: 'Barbell Row',                no_equipment: 'Pull-up',              injury: 'Chest Supported Row' },
  'Chest Supported Row':          { machine_busy: 'Dumbbell Row',               no_equipment: 'Pull-up',              injury: 'Chin-up' },
  'Seated Cable Row':             { machine_busy: 'Barbell Row',                no_equipment: 'Pull-up',              injury: 'Chest Supported Row' },
  'Lat Pulldown (Wide)':          { machine_busy: 'Pull-up',                    no_equipment: 'Pull-up',              injury: 'Lat Pulldown (Close)' },
  'Lat Pulldown (Close)':         { machine_busy: 'Chin-up',                    no_equipment: 'Chin-up',              injury: 'Lat Pulldown (Wide)' },
  'Pull-up':                      { machine_busy: 'Lat Pulldown (Wide)',         no_equipment: 'Pull-up',              injury: 'Lat Pulldown (Wide)' },
  'Chin-up':                      { machine_busy: 'Lat Pulldown (Close)',        no_equipment: 'Chin-up',              injury: 'Lat Pulldown (Close)' },
  'Straight Arm Pulldown':        { machine_busy: 'Dumbbell Row',               no_equipment: 'Pull-up',              injury: 'Straight Arm Pulldown' },
  'Conventional Deadlift':        { machine_busy: 'Romanian Deadlift',          no_equipment: 'Hyperextension',       injury: 'Hyperextension' },
  'Hyperextension':               { machine_busy: 'Barbell Row',                no_equipment: 'Hyperextension',       injury: 'Hyperextension' },
  // ---- SHOULDERS ----
  'Barbell Overhead Press':       { machine_busy: 'Dumbbell Overhead Press',    no_equipment: 'Lateral Raise',        injury: 'Dumbbell Overhead Press' },
  'Dumbbell Overhead Press':      { machine_busy: 'Barbell Overhead Press',     no_equipment: 'Lateral Raise',        injury: 'Machine Shoulder Press' },
  'Machine Shoulder Press':       { machine_busy: 'Dumbbell Overhead Press',    no_equipment: 'Lateral Raise',        injury: 'Dumbbell Overhead Press' },
  'Arnold Press':                 { machine_busy: 'Dumbbell Overhead Press',    no_equipment: 'Lateral Raise',        injury: 'Dumbbell Overhead Press' },
  'Lateral Raise':                { machine_busy: 'Cable Lateral Raise',        no_equipment: 'Lateral Raise',        injury: 'Cable Lateral Raise' },
  'Cable Lateral Raise':          { machine_busy: 'Lateral Raise',              no_equipment: 'Lateral Raise',        injury: 'Lateral Raise' },
  'Machine Lateral Raise':        { machine_busy: 'Cable Lateral Raise',        no_equipment: 'Lateral Raise',        injury: 'Lateral Raise' },
  'Face Pull':                    { machine_busy: 'Rear Delt Fly',              no_equipment: 'Rear Delt Fly',        injury: 'Rear Delt Fly' },
  'Rear Delt Fly':                { machine_busy: 'Cable Rear Delt Fly',        no_equipment: 'Rear Delt Fly',        injury: 'Cable Rear Delt Fly' },
  'Cable Rear Delt Fly':          { machine_busy: 'Rear Delt Fly',              no_equipment: 'Rear Delt Fly',        injury: 'Rear Delt Fly' },
  'Barbell Shrug':                { machine_busy: 'Dumbbell Overhead Press',    no_equipment: 'Lateral Raise',        injury: 'Lateral Raise' },
  'Upright Row':                  { machine_busy: 'Barbell Overhead Press',     no_equipment: 'Lateral Raise',        injury: 'Lateral Raise' },
  // ---- LEGS ----
  'Back Squat':                   { machine_busy: 'Leg Press',                  no_equipment: 'Walking Lunges',       injury: 'Leg Press' },
  'Front Squat':                  { machine_busy: 'Back Squat',                 no_equipment: 'Walking Lunges',       injury: 'Leg Press' },
  'Leg Press':                    { machine_busy: 'Back Squat',                 no_equipment: 'Bulgarian Split Squat',injury: 'Bulgarian Split Squat' },
  'Hack Squat':                   { machine_busy: 'Back Squat',                 no_equipment: 'Bulgarian Split Squat',injury: 'Leg Press' },
  'Bulgarian Split Squat':        { machine_busy: 'Walking Lunges',             no_equipment: 'Walking Lunges',       injury: 'Leg Press' },
  'Walking Lunges':               { machine_busy: 'Bulgarian Split Squat',      no_equipment: 'Walking Lunges',       injury: 'Leg Extension' },
  'Romanian Deadlift':            { machine_busy: 'Lying Leg Curl',             no_equipment: 'Nordic Curl',          injury: 'Lying Leg Curl' },
  'Sumo Deadlift':                { machine_busy: 'Romanian Deadlift',          no_equipment: 'Nordic Curl',          injury: 'Lying Leg Curl' },
  'Lying Leg Curl':               { machine_busy: 'Seated Leg Curl',            no_equipment: 'Nordic Curl',          injury: 'Seated Leg Curl' },
  'Seated Leg Curl':              { machine_busy: 'Lying Leg Curl',             no_equipment: 'Nordic Curl',          injury: 'Lying Leg Curl' },
  'Leg Curl':                     { machine_busy: 'Lying Leg Curl',             no_equipment: 'Nordic Curl',          injury: 'Seated Leg Curl' },
  'Leg Extension':                { machine_busy: 'Back Squat',                 no_equipment: 'Walking Lunges',       injury: 'Walking Lunges' },
  'Nordic Curl':                  { machine_busy: 'Lying Leg Curl',             no_equipment: 'Nordic Curl',          injury: 'Lying Leg Curl' },
  'Hip Thrust':                   { machine_busy: 'Glute Bridge',               no_equipment: 'Glute Bridge',         injury: 'Glute Bridge' },
  'Glute Bridge':                 { machine_busy: 'Hip Thrust',                 no_equipment: 'Glute Bridge',         injury: 'Glute Bridge' },
  'Cable Kickback':               { machine_busy: 'Glute Bridge',               no_equipment: 'Glute Bridge',         injury: 'Glute Bridge' },
  'Seated Calf Raise':            { machine_busy: 'Standing Calf Raise',        no_equipment: 'Walking Lunges',       injury: 'Standing Calf Raise' },
  'Standing Calf Raise':          { machine_busy: 'Seated Calf Raise',          no_equipment: 'Walking Lunges',       injury: 'Seated Calf Raise' },
  // ---- ARMS (biceps) ----
  'Barbell Curl':                 { machine_busy: 'Dumbbell Curl',              no_equipment: 'Chin-up',              injury: 'Concentration Curl' },
  'Dumbbell Curl':                { machine_busy: 'Barbell Curl',               no_equipment: 'Chin-up',              injury: 'Concentration Curl' },
  'EZ-Bar Curl':                  { machine_busy: 'Barbell Curl',               no_equipment: 'Chin-up',              injury: 'Concentration Curl' },
  'Cable Curl':                   { machine_busy: 'Barbell Curl',               no_equipment: 'Chin-up',              injury: 'Concentration Curl' },
  'Hammer Curl':                  { machine_busy: 'Dumbbell Curl',              no_equipment: 'Chin-up',              injury: 'Concentration Curl' },
  'Concentration Curl':           { machine_busy: 'Dumbbell Curl',              no_equipment: 'Chin-up',              injury: 'Dumbbell Curl' },
  'Preacher Curl':                { machine_busy: 'Barbell Curl',               no_equipment: 'Chin-up',              injury: 'Concentration Curl' },
  'Incline Dumbbell Curl':        { machine_busy: 'Dumbbell Curl',              no_equipment: 'Chin-up',              injury: 'Concentration Curl' },
  // ---- ARMS (triceps) ----
  'Skull Crusher':                { machine_busy: 'Close Grip Bench Press',     no_equipment: 'Diamond Push-Up',      injury: 'Tricep Pushdown' },
  'Close Grip Bench Press':       { machine_busy: 'Skull Crusher',              no_equipment: 'Diamond Push-Up',      injury: 'Tricep Pushdown' },
  'Tricep Pushdown':              { machine_busy: 'Skull Crusher',              no_equipment: 'Diamond Push-Up',      injury: 'Overhead Tricep Extension' },
  'Overhead Tricep Extension':    { machine_busy: 'Skull Crusher',              no_equipment: 'Diamond Push-Up',      injury: 'Tricep Pushdown' },
  'Tricep Kickback':              { machine_busy: 'Tricep Pushdown',            no_equipment: 'Diamond Push-Up',      injury: 'Tricep Pushdown' },
  'Dip':                          { machine_busy: 'Close Grip Bench Press',     no_equipment: 'Diamond Push-Up',      injury: 'Tricep Pushdown' },
  'Diamond Push-Up':              { machine_busy: 'Tricep Pushdown',            no_equipment: 'Diamond Push-Up',      injury: 'Diamond Push-Up' },
  // ---- CORE ----
  'Plank':                        { machine_busy: 'Dead Bug',                   no_equipment: 'Plank',                injury: 'Dead Bug' },
  'Cable Crunch':                 { machine_busy: 'Ab Wheel Rollout',           no_equipment: 'Bicycle Crunch',       injury: 'Dead Bug' },
  'Ab Wheel Rollout':             { machine_busy: 'Cable Crunch',               no_equipment: 'V-Up',                 injury: 'Dead Bug' },
  'Ab Wheel':                     { machine_busy: 'Cable Crunch',               no_equipment: 'V-Up',                 injury: 'Dead Bug' },
  'Hanging Leg Raise':            { machine_busy: 'Cable Crunch',               no_equipment: 'V-Up',                 injury: 'Dead Bug' },
  'Dragon Flag':                  { machine_busy: 'Hanging Leg Raise',          no_equipment: 'V-Up',                 injury: 'Dead Bug' },
  'Bicycle Crunch':               { machine_busy: 'Hanging Leg Raise',          no_equipment: 'Bicycle Crunch',       injury: 'Dead Bug' },
  'Russian Twist':                { machine_busy: 'Cable Crunch',               no_equipment: 'Russian Twist',        injury: 'Pallof Press' },
  'V-Up':                         { machine_busy: 'Hanging Leg Raise',          no_equipment: 'V-Up',                 injury: 'Dead Bug' },
  'Side Plank':                   { machine_busy: 'Pallof Press',               no_equipment: 'Side Plank',           injury: 'Dead Bug' },
  'Pallof Press':                 { machine_busy: 'Side Plank',                 no_equipment: 'Side Plank',           injury: 'Dead Bug' },
  'Dead Bug':                     { machine_busy: 'Plank',                      no_equipment: 'Dead Bug',             injury: 'Dead Bug' },
}

// Why messages for common substitutions
const WHY_MESSAGES: Record<string, string> = {
  machine_busy: 'Same muscle group, different equipment — same training stimulus.',
  no_equipment: 'Bodyweight or dumbbell alternative that trains the same muscle group.',
  injury: 'Lower-stress variation that protects the affected area while maintaining training.',
  default: 'Same primary muscle group, adjusted for your available equipment.',
}

// Notes per substitute
const NOTES: Record<string, string> = {
  'Push-up':              'Keep core tight, full range of motion. Elevate feet for more chest emphasis.',
  'Dumbbell Curl':        'Control the eccentric (lowering) phase for maximum growth.',
  'Dumbbell Overhead Press': 'Sit on a bench with back support. Keep core braced throughout.',
  'Dumbbell Row':         'Pull elbow back, not up. Squeeze lats at top.',
  'Lat Pulldown (Wide)':  'Initiate with lats, not arms. Full stretch at top.',
  'Lateral Raise':        'Slight forward lean, lead with elbows. Controlled tempo.',
  'Rear Delt Fly':        'Hinge forward, slight bend in elbows. Squeeze shoulder blades.',
  'Bulgarian Split Squat':'Front foot forward enough to keep shin vertical. Control descent.',
  'Glute Bridge':         'Drive through heels, squeeze glutes at top. 1-second hold.',
  'Nordic Curl':          'Control descent as much as possible. Use hands to assist on the way up.',
  'Concentration Curl':   'Brace elbow against inner thigh. Slow, controlled movement.',
  'Diamond Push-Up':      'Hands close together under chest. Lock elbows out at top.',
  'Dead Bug':             'Press lower back into floor throughout. Slow and controlled.',
}

const DEFAULT_NOTE = 'Keep the same rep range and RPE as your original exercise.'

// All exercises as a flat reference list
const ALL_EXERCISES: StaticExercise[] = [
  // arms
  { name: 'Barbell Curl',              muscle_group: 'arms',      equipment: 'barbell' },
  { name: 'Cable Curl',                muscle_group: 'arms',      equipment: 'cable' },
  { name: 'Close Grip Bench Press',    muscle_group: 'arms',      equipment: 'barbell' },
  { name: 'Concentration Curl',        muscle_group: 'arms',      equipment: 'dumbbell' },
  { name: 'Diamond Push-Up',           muscle_group: 'arms',      equipment: 'bodyweight' },
  { name: 'Dip',                       muscle_group: 'arms',      equipment: 'bodyweight' },
  { name: 'Dumbbell Curl',             muscle_group: 'arms',      equipment: 'dumbbell' },
  { name: 'EZ-Bar Curl',               muscle_group: 'arms',      equipment: 'barbell' },
  { name: 'Hammer Curl',               muscle_group: 'arms',      equipment: 'dumbbell' },
  { name: 'Incline Dumbbell Curl',     muscle_group: 'arms',      equipment: 'dumbbell' },
  { name: 'Overhead Tricep Extension', muscle_group: 'arms',      equipment: 'cable' },
  { name: 'Preacher Curl',             muscle_group: 'arms',      equipment: 'barbell' },
  { name: 'Skull Crusher',             muscle_group: 'arms',      equipment: 'barbell' },
  { name: 'Tricep Kickback',           muscle_group: 'arms',      equipment: 'dumbbell' },
  { name: 'Tricep Pushdown',           muscle_group: 'arms',      equipment: 'cable' },
  // back
  { name: 'Barbell Row',               muscle_group: 'back',      equipment: 'barbell' },
  { name: 'Chest Supported Row',       muscle_group: 'back',      equipment: 'dumbbell' },
  { name: 'Chin-up',                   muscle_group: 'back',      equipment: 'bodyweight' },
  { name: 'Conventional Deadlift',     muscle_group: 'back',      equipment: 'barbell' },
  { name: 'Dumbbell Row',              muscle_group: 'back',      equipment: 'dumbbell' },
  { name: 'Hyperextension',            muscle_group: 'back',      equipment: 'bodyweight' },
  { name: 'Lat Pulldown (Close)',      muscle_group: 'back',      equipment: 'cable' },
  { name: 'Lat Pulldown (Wide)',       muscle_group: 'back',      equipment: 'cable' },
  { name: 'Meadows Row',               muscle_group: 'back',      equipment: 'barbell' },
  { name: 'Pendlay Row',               muscle_group: 'back',      equipment: 'barbell' },
  { name: 'Pull-up',                   muscle_group: 'back',      equipment: 'bodyweight' },
  { name: 'Seated Cable Row',          muscle_group: 'back',      equipment: 'cable' },
  { name: 'Straight Arm Pulldown',     muscle_group: 'back',      equipment: 'cable' },
  { name: 'T-Bar Row',                 muscle_group: 'back',      equipment: 'barbell' },
  // chest
  { name: 'Cable Fly',                 muscle_group: 'chest',     equipment: 'cable' },
  { name: 'Cable Fly (High)',          muscle_group: 'chest',     equipment: 'cable' },
  { name: 'Cable Fly (Low)',           muscle_group: 'chest',     equipment: 'cable' },
  { name: 'Cable Fly (Mid)',           muscle_group: 'chest',     equipment: 'cable' },
  { name: 'Chest Dip',                 muscle_group: 'chest',     equipment: 'bodyweight' },
  { name: 'Decline Barbell Bench Press', muscle_group: 'chest',   equipment: 'barbell' },
  { name: 'Decline Dumbbell Press',    muscle_group: 'chest',     equipment: 'dumbbell' },
  { name: 'Flat Barbell Bench Press',  muscle_group: 'chest',     equipment: 'barbell' },
  { name: 'Flat Dumbbell Bench Press', muscle_group: 'chest',     equipment: 'dumbbell' },
  { name: 'Incline Barbell Bench Press', muscle_group: 'chest',   equipment: 'barbell' },
  { name: 'Incline Bench Press',       muscle_group: 'chest',     equipment: 'barbell' },
  { name: 'Incline Dumbbell Press',    muscle_group: 'chest',     equipment: 'dumbbell' },
  { name: 'Pec Deck',                  muscle_group: 'chest',     equipment: 'machine' },
  { name: 'Push-up',                   muscle_group: 'chest',     equipment: 'bodyweight' },
  // core
  { name: 'Ab Wheel',                  muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Ab Wheel Rollout',          muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Bicycle Crunch',            muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Cable Crunch',              muscle_group: 'core',      equipment: 'cable' },
  { name: 'Dead Bug',                  muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Dragon Flag',               muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Hanging Leg Raise',         muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Pallof Press',              muscle_group: 'core',      equipment: 'cable' },
  { name: 'Plank',                     muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Russian Twist',             muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'Side Plank',                muscle_group: 'core',      equipment: 'bodyweight' },
  { name: 'V-Up',                      muscle_group: 'core',      equipment: 'bodyweight' },
  // legs
  { name: 'Back Squat',                muscle_group: 'legs',      equipment: 'barbell' },
  { name: 'Bulgarian Split Squat',     muscle_group: 'legs',      equipment: 'dumbbell' },
  { name: 'Cable Kickback',            muscle_group: 'legs',      equipment: 'cable' },
  { name: 'Front Squat',               muscle_group: 'legs',      equipment: 'barbell' },
  { name: 'Glute Bridge',              muscle_group: 'legs',      equipment: 'bodyweight' },
  { name: 'Hack Squat',                muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Hip Thrust',                muscle_group: 'legs',      equipment: 'barbell' },
  { name: 'Leg Curl',                  muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Leg Extension',             muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Leg Press',                 muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Lying Leg Curl',            muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Nordic Curl',               muscle_group: 'legs',      equipment: 'bodyweight' },
  { name: 'Romanian Deadlift',         muscle_group: 'legs',      equipment: 'barbell' },
  { name: 'Seated Calf Raise',         muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Seated Leg Curl',           muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Standing Calf Raise',       muscle_group: 'legs',      equipment: 'machine' },
  { name: 'Sumo Deadlift',             muscle_group: 'legs',      equipment: 'barbell' },
  { name: 'Walking Lunges',            muscle_group: 'legs',      equipment: 'dumbbell' },
  // shoulders
  { name: 'Arnold Press',              muscle_group: 'shoulders', equipment: 'dumbbell' },
  { name: 'Barbell Overhead Press',    muscle_group: 'shoulders', equipment: 'barbell' },
  { name: 'Barbell Shrug',             muscle_group: 'shoulders', equipment: 'barbell' },
  { name: 'Cable Lateral Raise',       muscle_group: 'shoulders', equipment: 'cable' },
  { name: 'Cable Rear Delt Fly',       muscle_group: 'shoulders', equipment: 'cable' },
  { name: 'Dumbbell Overhead Press',   muscle_group: 'shoulders', equipment: 'dumbbell' },
  { name: 'Face Pull',                 muscle_group: 'shoulders', equipment: 'cable' },
  { name: 'Lateral Raise',             muscle_group: 'shoulders', equipment: 'dumbbell' },
  { name: 'Machine Lateral Raise',     muscle_group: 'shoulders', equipment: 'machine' },
  { name: 'Machine Shoulder Press',    muscle_group: 'shoulders', equipment: 'machine' },
  { name: 'Rear Delt Fly',             muscle_group: 'shoulders', equipment: 'dumbbell' },
  { name: 'Upright Row',               muscle_group: 'shoulders', equipment: 'barbell' },
]

/**
 * Find substitute name using fallback muscle group lookup.
 */
function findFallbackSubstitute(originalName: string, muscleGroup: string, reason: string, equipment: string): string | null {
  const available = EQUIPMENT_SETS[equipment] ?? EQUIPMENT_SETS['full_gym']!
  const priority = EQUIPMENT_PRIORITY[reason] ?? EQUIPMENT_PRIORITY['default']!

  const candidates = ALL_EXERCISES.filter(
    ex => ex.muscle_group === muscleGroup
       && ex.name !== originalName
       && available.includes(ex.equipment)
  )

  if (candidates.length === 0) return null

  candidates.sort((a, b) => {
    const aIdx = priority.indexOf(a.equipment)
    const bIdx = priority.indexOf(b.equipment)
    return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx)
  })

  return candidates[0]?.name ?? null
}

function getExerciseInfo(name: string): StaticExercise | null {
  return ALL_EXERCISES.find(ex => ex.name === name) || null
}

function estimateSubstituteWeight(originalWeight: number, originalEquipment: string, substituteEquipment: string): number {
  if (!originalWeight || originalWeight === 0) return 0

  const conversions: Record<string, number | null> = {
    'barbell->dumbbell': 0.65,
    'dumbbell->barbell': 1.4,
    'barbell->cable':    0.7,
    'cable->barbell':    1.3,
    'barbell->bodyweight': null,
    'dumbbell->bodyweight': null,
    'cable->bodyweight': null,
    'machine->dumbbell': 0.6,
    'machine->barbell':  0.85,
    'dumbbell->machine': 1.5,
  }

  if (substituteEquipment === 'bodyweight') return 0

  const key = `${originalEquipment}->${substituteEquipment}`
  const factor = conversions[key]
  if (factor != null) return Math.round((originalWeight * factor) / 2.5) * 2.5

  return originalWeight
}

/**
 * Get multiple distinct substitute options for an exercise.
 */
export function getSubstituteOptions({ exercise, equipment, excludeNames = [], max = 4 }: SubstituteOptionsInput): SubstituteOption[] {
  const excluded = new Set([
    exercise.name.toLowerCase(),
    ...excludeNames.map(n => n.toLowerCase()),
  ])
  const available = EQUIPMENT_SETS[equipment] ?? EQUIPMENT_SETS['full_gym']!
  const seen = new Set<string>()
  const results: SubstituteOption[] = []

  // 1. Direct substitutes for each reason
  const reasons: SubstitutionReason[] = ['machine_busy', 'no_equipment', 'injury', 'default']
  const directMap = DIRECT_SUBSTITUTES[exercise.name] || {}
  for (const reason of reasons) {
    const name = directMap[reason]
    if (name && !excluded.has(name.toLowerCase()) && !seen.has(name)) {
      seen.add(name)
      const info = getExerciseInfo(name)
      if (!info || available!.includes(info.equipment)) {
        results.push(_buildOption(name, exercise))
        if (results.length >= max) return results
      }
    }
  }

  // 2. Fallback: all same-muscle-group exercises
  const priorityOrder: EquipmentType[] = ['dumbbell', 'cable', 'barbell', 'machine', 'bodyweight']
  const candidates = ALL_EXERCISES
    .filter(ex =>
      ex.muscle_group === exercise.muscle_group &&
      !excluded.has(ex.name.toLowerCase()) &&
      !seen.has(ex.name) &&
      available.includes(ex.equipment)
    )
    .sort((a, b) => {
      const ai = priorityOrder.indexOf(a.equipment)
      const bi = priorityOrder.indexOf(b.equipment)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })

  for (const candidate of candidates) {
    if (!seen.has(candidate.name)) {
      seen.add(candidate.name)
      results.push(_buildOption(candidate.name, exercise))
      if (results.length >= max) break
    }
  }

  return results
}

function _buildOption(substituteName: string, exercise: SubstituteOptionsInput['exercise']): SubstituteOption {
  const subInfo = getExerciseInfo(substituteName)
  const originalEquipment = getExerciseInfo(exercise.name)?.equipment || 'barbell'
  const subEquipment = subInfo?.equipment || 'dumbbell'
  const weight = estimateSubstituteWeight(
    exercise.plan?.weight_kg || exercise.weight_kg || 0,
    originalEquipment,
    subEquipment
  )
  return {
    name: substituteName,
    muscle_group: exercise.muscle_group || subInfo?.muscle_group || 'unknown',
    equipment: subEquipment,
    weight_kg: weight,
    sets: exercise.plan?.sets || 3,
    reps_min: exercise.plan?.reps_min || 8,
    reps_max: exercise.plan?.reps_max || 12,
    rpe_target: exercise.plan?.rpe_target || 8,
    rest_seconds: exercise.plan?.rest_seconds || 90,
    notes: NOTES[substituteName] || DEFAULT_NOTE,
  }
}

/**
 * Main function: get exercise substitute without LLM.
 * Returns same format as getExerciseSubstitute() from ai.ts.
 */
export function getExerciseSubstituteLocal({ exercise, reason, equipment }: {
  exercise: { name: string; muscle_group?: string; weight_kg?: number; plan?: { sets?: number; reps_min?: number; reps_max?: number; rpe_target?: number; rest_seconds?: number; weight_kg?: number } }
  reason: string
  equipment?: string
  experienceLevel?: string
  bodyweight?: string
}): ExerciseSubstituteResponse {
  const normalizedReason = reason?.toLowerCase().replace(/\s+/g, '_') || 'default'
  const validReasons = ['machine_busy', 'no_equipment', 'injury'] as const
  type ValidReason = typeof validReasons[number]
  const reasonKey: ValidReason = (validReasons as readonly string[]).includes(normalizedReason)
    ? normalizedReason as ValidReason
    : 'machine_busy'

  // 1. Try direct lookup
  const directMap = DIRECT_SUBSTITUTES[exercise.name]
  let substituteName = directMap?.[reasonKey] || directMap?.default

  // 2. Fallback: muscle group lookup
  if (!substituteName) {
    substituteName = findFallbackSubstitute(
      exercise.name,
      exercise.muscle_group || '',
      reasonKey,
      equipment || 'full_gym'
    ) ?? undefined
  }

  // 3. Last resort: same exercise
  if (!substituteName) substituteName = exercise.name

  const subInfo = getExerciseInfo(substituteName)
  const originalEquipment = getExerciseInfo(exercise.name)?.equipment || 'barbell'
  const subEquipment = subInfo?.equipment || 'dumbbell'

  const weight = estimateSubstituteWeight(
    exercise.plan?.weight_kg || exercise.weight_kg || 0,
    originalEquipment,
    subEquipment
  )

  return {
    name: substituteName,
    muscle_group: exercise.muscle_group || subInfo?.muscle_group || 'unknown',
    weight_kg: weight,
    sets: exercise.plan?.sets || 3,
    reps_min: exercise.plan?.reps_min || 8,
    reps_max: exercise.plan?.reps_max || 12,
    rpe_target: exercise.plan?.rpe_target || 8,
    rest_seconds: exercise.plan?.rest_seconds || 90,
    notes: NOTES[substituteName] || DEFAULT_NOTE,
    why: WHY_MESSAGES[reasonKey] || WHY_MESSAGES.default,
  }
}
