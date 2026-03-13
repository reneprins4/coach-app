import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

// Comprehensive fallback exercise library (80+)
const FALLBACK = [
  // CHEST (12)
  { id: 'c1', name: 'Flat Barbell Bench Press', muscle_group: 'chest', category: 'compound', equipment: 'barbell', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'intermediate', subfocus: 'mid chest' },
  { id: 'c2', name: 'Incline Barbell Bench Press', muscle_group: 'chest', category: 'compound', equipment: 'barbell', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'intermediate', subfocus: 'upper chest' },
  { id: 'c3', name: 'Decline Barbell Bench Press', muscle_group: 'chest', category: 'compound', equipment: 'barbell', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'intermediate', subfocus: 'lower chest' },
  { id: 'c4', name: 'Flat Dumbbell Bench Press', muscle_group: 'chest', category: 'compound', equipment: 'dumbbell', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c5', name: 'Incline Dumbbell Press', muscle_group: 'chest', category: 'compound', equipment: 'dumbbell', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'upper chest' },
  { id: 'c6', name: 'Decline Dumbbell Press', muscle_group: 'chest', category: 'compound', equipment: 'dumbbell', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'lower chest' },
  { id: 'c7', name: 'Cable Fly (High)', muscle_group: 'chest', category: 'isolation', equipment: 'cable', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'lower chest' },
  { id: 'c8', name: 'Cable Fly (Mid)', muscle_group: 'chest', category: 'isolation', equipment: 'cable', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c9', name: 'Cable Fly (Low)', muscle_group: 'chest', category: 'isolation', equipment: 'cable', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'upper chest' },
  { id: 'c10', name: 'Pec Deck', muscle_group: 'chest', category: 'isolation', equipment: 'machine', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c11', name: 'Push-up', muscle_group: 'chest', category: 'compound', equipment: 'bodyweight', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts','core'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c12', name: 'Chest Dip', muscle_group: 'chest', category: 'compound', equipment: 'bodyweight', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'intermediate', subfocus: 'lower chest' },
  // BACK (14)
  { id: 'b1', name: 'Conventional Deadlift', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back','hamstrings','glutes'], secondary_muscles: ['core','forearms'], difficulty: 'advanced', subfocus: 'posterior chain' },
  { id: 'b2', name: 'Barbell Row', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'intermediate', subfocus: 'mid back' },
  { id: 'b3', name: 'Pendlay Row', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts','core'], difficulty: 'intermediate', subfocus: 'mid back' },
  { id: 'b4', name: 'T-Bar Row', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'intermediate', subfocus: 'mid back' },
  { id: 'b5', name: 'Seated Cable Row', muscle_group: 'back', category: 'compound', equipment: 'cable', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'mid back' },
  { id: 'b6', name: 'Dumbbell Row', muscle_group: 'back', category: 'compound', equipment: 'dumbbell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'lats' },
  { id: 'b7', name: 'Chest Supported Row', muscle_group: 'back', category: 'compound', equipment: 'dumbbell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'mid back' },
  { id: 'b8', name: 'Pull-up', muscle_group: 'back', category: 'compound', equipment: 'bodyweight', primary_muscles: ['back'], secondary_muscles: ['biceps','core'], difficulty: 'intermediate', subfocus: 'lats' },
  { id: 'b9', name: 'Chin-up', muscle_group: 'back', category: 'compound', equipment: 'bodyweight', primary_muscles: ['back','biceps'], secondary_muscles: ['core'], difficulty: 'intermediate', subfocus: 'lats' },
  { id: 'b10', name: 'Lat Pulldown (Wide)', muscle_group: 'back', category: 'compound', equipment: 'cable', primary_muscles: ['back'], secondary_muscles: ['biceps'], difficulty: 'beginner', subfocus: 'lats' },
  { id: 'b11', name: 'Lat Pulldown (Close)', muscle_group: 'back', category: 'compound', equipment: 'cable', primary_muscles: ['back'], secondary_muscles: ['biceps'], difficulty: 'beginner', subfocus: 'lats' },
  { id: 'b12', name: 'Straight Arm Pulldown', muscle_group: 'back', category: 'isolation', equipment: 'cable', primary_muscles: ['back'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'lats' },
  { id: 'b13', name: 'Hyperextension', muscle_group: 'back', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['back','glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'lower back' },
  { id: 'b14', name: 'Meadows Row', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'advanced', subfocus: 'lats' },
  // SHOULDERS (9)
  { id: 's1', name: 'Barbell Overhead Press', muscle_group: 'shoulders', category: 'compound', equipment: 'barbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps','core'], difficulty: 'intermediate', subfocus: 'front delts' },
  { id: 's2', name: 'Dumbbell Overhead Press', muscle_group: 'shoulders', category: 'compound', equipment: 'dumbbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'beginner', subfocus: 'front delts' },
  { id: 's3', name: 'Arnold Press', muscle_group: 'shoulders', category: 'compound', equipment: 'dumbbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'intermediate', subfocus: 'all heads' },
  { id: 's4', name: 'Lateral Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['side_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'side delts' },
  { id: 's5', name: 'Cable Lateral Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['side_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'side delts' },
  { id: 's6', name: 'Face Pull', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's7', name: 'Rear Delt Fly', muscle_group: 'shoulders', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's8', name: 'Upright Row', muscle_group: 'shoulders', category: 'compound', equipment: 'barbell', primary_muscles: ['side_delts','traps'], secondary_muscles: ['biceps'], difficulty: 'intermediate', subfocus: 'side delts' },
  { id: 's9', name: 'Machine Shoulder Press', muscle_group: 'shoulders', category: 'compound', equipment: 'machine', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'beginner', subfocus: 'front delts' },
  // LEGS (17)
  { id: 'l1', name: 'Back Squat', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l2', name: 'Front Squat', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['quads'], secondary_muscles: ['glutes','core'], difficulty: 'advanced', subfocus: 'quads' },
  { id: 'l3', name: 'Bulgarian Split Squat', muscle_group: 'legs', category: 'compound', equipment: 'dumbbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l4', name: 'Leg Press', muscle_group: 'legs', category: 'compound', equipment: 'machine', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l5', name: 'Hack Squat', muscle_group: 'legs', category: 'compound', equipment: 'machine', primary_muscles: ['quads'], secondary_muscles: ['glutes'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l6', name: 'Walking Lunges', muscle_group: 'legs', category: 'compound', equipment: 'dumbbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l7', name: 'Hip Thrust', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['glutes'], secondary_muscles: ['hamstrings'], difficulty: 'intermediate', subfocus: 'glutes' },
  { id: 'l8', name: 'Romanian Deadlift', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['back','core'], difficulty: 'intermediate', subfocus: 'hamstrings' },
  { id: 'l9', name: 'Lying Leg Curl', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['hamstrings'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'hamstrings' },
  { id: 'l10', name: 'Seated Leg Curl', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['hamstrings'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'hamstrings' },
  { id: 'l11', name: 'Nordic Curl', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['hamstrings'], secondary_muscles: [], difficulty: 'advanced', subfocus: 'hamstrings' },
  { id: 'l12', name: 'Leg Extension', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['quads'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l13', name: 'Standing Calf Raise', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['calves'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'calves' },
  { id: 'l14', name: 'Seated Calf Raise', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['calves'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'calves' },
  { id: 'l15', name: 'Sumo Deadlift', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['glutes','quads'], secondary_muscles: ['hamstrings','back','core'], difficulty: 'advanced', subfocus: 'glutes' },
  { id: 'l16', name: 'Glute Bridge', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'glutes' },
  { id: 'l17', name: 'Cable Kickback', muscle_group: 'legs', category: 'isolation', equipment: 'cable', primary_muscles: ['glutes'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'glutes' },
  // ARMS (14)
  { id: 'a1', name: 'Barbell Curl', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['biceps'], secondary_muscles: ['forearms'], difficulty: 'beginner', subfocus: 'biceps' },
  { id: 'a2', name: 'EZ-Bar Curl', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['biceps'], secondary_muscles: ['forearms'], difficulty: 'beginner', subfocus: 'biceps' },
  { id: 'a3', name: 'Dumbbell Curl', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['biceps'], secondary_muscles: ['forearms'], difficulty: 'beginner', subfocus: 'biceps' },
  { id: 'a4', name: 'Hammer Curl', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['biceps','brachialis'], secondary_muscles: ['forearms'], difficulty: 'beginner', subfocus: 'brachialis' },
  { id: 'a5', name: 'Incline Dumbbell Curl', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['biceps'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'long head' },
  { id: 'a6', name: 'Cable Curl', muscle_group: 'arms', category: 'isolation', equipment: 'cable', primary_muscles: ['biceps'], secondary_muscles: ['forearms'], difficulty: 'beginner', subfocus: 'biceps' },
  { id: 'a7', name: 'Preacher Curl', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['biceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'short head' },
  { id: 'a8', name: 'Concentration Curl', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['biceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'peak' },
  { id: 'a9', name: 'Tricep Pushdown', muscle_group: 'arms', category: 'isolation', equipment: 'cable', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'lateral head' },
  { id: 'a10', name: 'Overhead Tricep Extension', muscle_group: 'arms', category: 'isolation', equipment: 'cable', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'long head' },
  { id: 'a11', name: 'Skull Crusher', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'long head' },
  { id: 'a12', name: 'Close Grip Bench Press', muscle_group: 'arms', category: 'compound', equipment: 'barbell', primary_muscles: ['triceps'], secondary_muscles: ['chest','front_delts'], difficulty: 'intermediate', subfocus: 'triceps' },
  { id: 'a13', name: 'Tricep Kickback', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'lateral head' },
  { id: 'a14', name: 'Diamond Push-up', muscle_group: 'arms', category: 'compound', equipment: 'bodyweight', primary_muscles: ['triceps'], secondary_muscles: ['chest'], difficulty: 'intermediate', subfocus: 'triceps' },
  // CORE (8)
  { id: 'co1', name: 'Plank', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['shoulders'], difficulty: 'beginner', subfocus: 'stability' },
  { id: 'co2', name: 'Ab Wheel Rollout', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['lats','shoulders'], difficulty: 'intermediate', subfocus: 'rectus abdominis' },
  { id: 'co3', name: 'Cable Crunch', muscle_group: 'core', category: 'isolation', equipment: 'cable', primary_muscles: ['core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'rectus abdominis' },
  { id: 'co4', name: 'Hanging Leg Raise', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors'], difficulty: 'intermediate', subfocus: 'lower abs' },
  { id: 'co5', name: 'Pallof Press', muscle_group: 'core', category: 'isolation', equipment: 'cable', primary_muscles: ['core'], secondary_muscles: ['obliques'], difficulty: 'beginner', subfocus: 'anti-rotation' },
  { id: 'co6', name: 'Dead Bug', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors'], difficulty: 'beginner', subfocus: 'stability' },
  { id: 'co7', name: 'Side Plank', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['obliques'], secondary_muscles: ['core'], difficulty: 'beginner', subfocus: 'obliques' },
  { id: 'co8', name: 'Russian Twist', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['obliques','core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'rotation' },
]

export function useExercises() {
  const [exercises, setExercises] = useState(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await supabase.from('exercises').select('*').order('name')
        if (!error && data?.length > 0 && !cancelled) setExercises(data)
      } catch { /* keep fallback */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { exercises, loading }
}

export function useFilteredExercises(exercises, query, muscleFilter, equipmentFilter) {
  return useMemo(() => {
    let result = exercises
    if (muscleFilter) {
      result = result.filter(e => e.muscle_group === muscleFilter)
    }
    if (equipmentFilter) {
      result = result.filter(e => e.equipment === equipmentFilter)
    }
    if (query.trim()) {
      const lower = query.toLowerCase()
      result = result.filter(e =>
        e.name.toLowerCase().includes(lower) ||
        e.muscle_group.toLowerCase().includes(lower) ||
        (e.subfocus || '').toLowerCase().includes(lower)
      )
    }
    // Sort: compounds first, then alphabetical
    result = [...result].sort((a, b) => {
      if (a.category === 'compound' && b.category !== 'compound') return -1
      if (a.category !== 'compound' && b.category === 'compound') return 1
      return a.name.localeCompare(b.name)
    })
    return result
  }, [exercises, query, muscleFilter, equipmentFilter])
}

export function getExercisesByMuscle(exercises) {
  const map = {}
  for (const e of exercises) {
    const muscles = [...(e.primary_muscles || []), e.muscle_group]
    for (const m of new Set(muscles)) {
      if (!map[m]) map[m] = []
      map[m].push(e)
    }
  }
  return map
}
