/**
 * First Workout Generator — MF-004
 *
 * Generates a simple, reassuring Full Body workout for beginners
 * with 0 previous workouts. No choices required — just start.
 *
 * Conservative parameters: 4-6 exercises, 2-3 sets, RPE 6-7.
 * Equipment-aware exercise selection.
 */

import type { UserSettings, AIWorkoutResponse, AIExercise, MuscleGroup } from '../types'

// --- Exercise templates for first workout ---

interface FirstWorkoutExercise {
  name: string
  muscle_group: MuscleGroup
  isCompound: boolean
  equipment: ('bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'cable')[]
  /** Bodyweight multiplier for weight estimation */
  bwMultiplier: number
  note: string
}

const FIRST_WORKOUT_POOL: FirstWorkoutExercise[] = [
  // Compounds — full gym
  { name: 'Back Squat', muscle_group: 'quads', isCompound: true, equipment: ['barbell'], bwMultiplier: 0.5, note: 'Focus op de juiste techniek, niet op gewicht. Hak naar achteren, borst omhoog.' },
  { name: 'Flat Barbell Bench Press', muscle_group: 'chest', isCompound: true, equipment: ['barbell'], bwMultiplier: 0.4, note: 'Focus op de juiste techniek, niet op gewicht. Schouderbladen samen, gecontroleerde beweging.' },
  { name: 'Barbell Row', muscle_group: 'back', isCompound: true, equipment: ['barbell'], bwMultiplier: 0.35, note: 'Focus op de juiste techniek, niet op gewicht. Trek de stang naar je navel, rug recht.' },
  { name: 'Dumbbell Overhead Press', muscle_group: 'shoulders', isCompound: true, equipment: ['dumbbell'], bwMultiplier: 0.15, note: 'Focus op de juiste techniek, niet op gewicht. Druk recht omhoog, core aanspannen.' },
  { name: 'Lying Leg Curl', muscle_group: 'hamstrings', isCompound: false, equipment: ['machine'], bwMultiplier: 0.2, note: 'Langzame, gecontroleerde beweging. Voel de hamstrings werken.' },
  { name: 'Plank', muscle_group: 'core', isCompound: false, equipment: ['bodyweight'], bwMultiplier: 0, note: 'Houd je lichaam in een rechte lijn. Begin met 20-30 seconden.' },

  // Dumbbell alternatives
  { name: 'Goblet Squat', muscle_group: 'quads', isCompound: true, equipment: ['dumbbell'], bwMultiplier: 0.15, note: 'Focus op de juiste techniek, niet op gewicht. Houd de dumbbell voor je borst.' },
  { name: 'Flat Dumbbell Bench Press', muscle_group: 'chest', isCompound: true, equipment: ['dumbbell'], bwMultiplier: 0.15, note: 'Focus op de juiste techniek, niet op gewicht. Ellebogen op 45 graden.' },
  { name: 'Dumbbell Row', muscle_group: 'back', isCompound: true, equipment: ['dumbbell'], bwMultiplier: 0.2, note: 'Focus op de juiste techniek, niet op gewicht. Trek naar je heup, rug recht.' },
  { name: 'Dumbbell Lunge', muscle_group: 'quads', isCompound: true, equipment: ['dumbbell'], bwMultiplier: 0.1, note: 'Neem grote stappen, knie niet voorbij de tenen. Gecontroleerde beweging.' },

  // Bodyweight alternatives
  { name: 'Bodyweight Squat', muscle_group: 'quads', isCompound: true, equipment: ['bodyweight'], bwMultiplier: 0, note: 'Voeten op schouderbreedte, hak naar achteren. Probeer diep te gaan.' },
  { name: 'Push-up', muscle_group: 'chest', isCompound: true, equipment: ['bodyweight'], bwMultiplier: 0, note: 'Begin op je knieen als dat nodig is. Borst bijna tot de grond.' },
  { name: 'Inverted Row', muscle_group: 'back', isCompound: true, equipment: ['bodyweight'], bwMultiplier: 0, note: 'Gebruik een lage stang of tafel. Trek je borst naar de stang.' },
  { name: 'Glute Bridge', muscle_group: 'glutes', isCompound: false, equipment: ['bodyweight'], bwMultiplier: 0, note: 'Knijp je billen samen aan de top. Houd 2 seconden vast.' },
  { name: 'Dead Bug', muscle_group: 'core', isCompound: false, equipment: ['bodyweight'], bwMultiplier: 0, note: 'Houd je onderrug tegen de grond. Langzaam en gecontroleerd.' },
  { name: 'Step-Up', muscle_group: 'quads', isCompound: true, equipment: ['bodyweight'], bwMultiplier: 0, note: 'Gebruik een stabiele verhoging. Duw af met het bovenste been.' },

  // Machine alternatives for full gym
  { name: 'Leg Press', muscle_group: 'quads', isCompound: true, equipment: ['machine'], bwMultiplier: 0.8, note: 'Voeten op schouderbreedte. Laat je knieen niet naar binnen vallen.' },
  { name: 'Machine Chest Press', muscle_group: 'chest', isCompound: true, equipment: ['machine'], bwMultiplier: 0.25, note: 'Goed alternatief om het bewegingspatroon te leren. Gecontroleerde beweging.' },
  { name: 'Seated Cable Row', muscle_group: 'back', isCompound: true, equipment: ['cable'], bwMultiplier: 0.3, note: 'Trek naar je navel, schouderbladen samen. Rug recht houden.' },
  { name: 'Lat Pulldown (Wide)', muscle_group: 'back', isCompound: true, equipment: ['cable'], bwMultiplier: 0.3, note: 'Trek de stang naar je bovenborst. Leun licht achterover.' },
  { name: 'Leg Extension', muscle_group: 'quads', isCompound: false, equipment: ['machine'], bwMultiplier: 0.25, note: 'Langzame, gecontroleerde beweging. Strek volledig uit aan de top.' },
]

// --- Equipment mapping ---

const EQUIPMENT_AVAILABLE: Record<string, string[]> = {
  full_gym: ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'],
  home_gym: ['barbell', 'dumbbell', 'bodyweight'],
  dumbbells: ['dumbbell', 'bodyweight'],
  bodyweight: ['bodyweight'],
}

// --- Target exercise slots for the first workout ---

interface ExerciseSlot {
  muscle: MuscleGroup
  preferCompound: boolean
}

const FIRST_WORKOUT_SLOTS: ExerciseSlot[] = [
  { muscle: 'quads', preferCompound: true },       // Squat variant
  { muscle: 'chest', preferCompound: true },        // Press variant
  { muscle: 'back', preferCompound: true },         // Row variant
  { muscle: 'shoulders', preferCompound: true },    // OHP variant
  { muscle: 'hamstrings', preferCompound: false },  // Curl / bridge
  { muscle: 'core', preferCompound: false },        // Plank / dead bug
]

// --- Weight estimation ---

function estimateBeginnerWeight(exercise: FirstWorkoutExercise, bodyweightKg: number): number {
  if (exercise.equipment.includes('bodyweight') && exercise.bwMultiplier === 0) return 0
  const raw = bodyweightKg * exercise.bwMultiplier
  return Math.max(2.5, Math.round(raw / 2.5) * 2.5)
}

// --- Main generator ---

export function generateFirstWorkout(settings: UserSettings): AIWorkoutResponse {
  const equipment = settings.equipment || 'full_gym'
  const availableEquipment = EQUIPMENT_AVAILABLE[equipment] || EQUIPMENT_AVAILABLE['full_gym']!
  const bwKg = parseFloat(settings.bodyweight || '') || 70

  const exercises: AIExercise[] = []
  const usedNames = new Set<string>()

  for (const slot of FIRST_WORKOUT_SLOTS) {
    // Find matching exercises from the pool
    const candidates = FIRST_WORKOUT_POOL.filter(ex =>
      ex.muscle_group === slot.muscle &&
      ex.equipment.some(eq => availableEquipment.includes(eq)) &&
      !usedNames.has(ex.name)
    )

    if (candidates.length === 0) continue

    // Prefer compound if requested, otherwise take first available
    const sorted = [...candidates].sort((a, b) => {
      if (slot.preferCompound) {
        if (a.isCompound && !b.isCompound) return -1
        if (!a.isCompound && b.isCompound) return 1
      }
      return 0
    })

    const picked = sorted[0]!
    usedNames.add(picked.name)

    const weight = estimateBeginnerWeight(picked, bwKg)
    const sets = picked.isCompound ? 3 : 2
    const repsMin = picked.isCompound ? 8 : 10
    const repsMax = picked.isCompound ? 12 : 15
    const restSeconds = picked.isCompound ? 90 : 60

    exercises.push({
      name: picked.name,
      muscle_group: picked.muscle_group,
      sets,
      reps_min: repsMin,
      reps_max: repsMax,
      weight_kg: weight,
      rpe_target: 6.5,
      rest_seconds: restSeconds,
      notes: picked.note,
      vs_last_session: 'new',
    })
  }

  // Calculate estimated duration
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0)
  const avgRestMin = exercises.length > 0
    ? exercises.reduce((sum, e) => sum + e.rest_seconds, 0) / exercises.length / 60
    : 1
  const estimatedDuration = Math.round(totalSets * (1.5 + avgRestMin))

  return {
    split: 'Full Body',
    reasoning: 'Je eerste training! Een Full Body workout is ideaal om te starten. Alle grote spiergroepen komen aan bod met veilige, effectieve oefeningen. Focus op techniek, niet op gewicht.',
    exercises,
    estimated_duration_min: estimatedDuration,
    volume_notes: `Eerste training: ${exercises.length} oefeningen, ${totalSets} sets totaal. Conservatieve opbouw.`,
  }
}

export function isFirstWorkoutEligible(workoutCount: number, experienceLevel: string): boolean {
  return workoutCount === 0 && (experienceLevel === 'complete_beginner' || experienceLevel === 'beginner')
}
