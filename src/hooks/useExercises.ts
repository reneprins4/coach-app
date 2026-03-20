import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { cacheExercises, getCachedExercises, isCacheStale } from '../lib/exerciseCache'

// ---- Exercise Library Types ----

export interface ExerciseLibraryEntry {
  id: string
  name: string
  muscle_group: string
  category: 'compound' | 'isolation'
  equipment: string
  primary_muscles: string[]
  secondary_muscles: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  subfocus: string
  image_url_0?: string | null
  image_url_1?: string | null
}

// Comprehensive fallback exercise library (200+)
const FALLBACK: ExerciseLibraryEntry[] = [
  // ── CHEST (18) ──
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
  { id: 'c13', name: 'Smith Machine Bench Press', muscle_group: 'chest', category: 'compound', equipment: 'smith_machine', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c14', name: 'Smith Machine Incline Press', muscle_group: 'chest', category: 'compound', equipment: 'smith_machine', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'upper chest' },
  { id: 'c15', name: 'Dumbbell Fly', muscle_group: 'chest', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c16', name: 'Incline Dumbbell Fly', muscle_group: 'chest', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'upper chest' },
  { id: 'c17', name: 'Machine Chest Press', muscle_group: 'chest', category: 'compound', equipment: 'machine', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c18', name: 'Svend Press', muscle_group: 'chest', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'inner chest' },
  { id: 'c19', name: 'Cable Crossover', muscle_group: 'chest', category: 'isolation', equipment: 'cable', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'inner chest' },
  { id: 'c20', name: 'Machine Chest Fly', muscle_group: 'chest', category: 'isolation', equipment: 'machine', primary_muscles: ['chest'], secondary_muscles: ['front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c21', name: 'Wide Push-up', muscle_group: 'chest', category: 'compound', equipment: 'bodyweight', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'outer chest' },
  { id: 'c22', name: 'Decline Push-up', muscle_group: 'chest', category: 'compound', equipment: 'bodyweight', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'intermediate', subfocus: 'upper chest' },
  { id: 'c23', name: 'Archer Push-up', muscle_group: 'chest', category: 'compound', equipment: 'bodyweight', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts','core'], difficulty: 'advanced', subfocus: 'unilateral' },
  { id: 'c24', name: 'Kettlebell Floor Press', muscle_group: 'chest', category: 'compound', equipment: 'kettlebell', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'intermediate', subfocus: 'mid chest' },
  { id: 'c25', name: 'Band Chest Press', muscle_group: 'chest', category: 'compound', equipment: 'resistance_band', primary_muscles: ['chest'], secondary_muscles: ['triceps','front_delts'], difficulty: 'beginner', subfocus: 'mid chest' },
  { id: 'c26', name: 'Man Maker', muscle_group: 'chest', category: 'compound', equipment: 'dumbbell', primary_muscles: ['chest','quads','front_delts'], secondary_muscles: ['triceps','core','back'], difficulty: 'advanced', subfocus: 'full body' },
  // ── BACK (22) ──
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
  { id: 'b15', name: 'Rack Pull', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back','glutes'], secondary_muscles: ['hamstrings','forearms'], difficulty: 'intermediate', subfocus: 'upper back' },
  { id: 'b16', name: 'Deficit Deadlift', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back','hamstrings','glutes'], secondary_muscles: ['core','forearms'], difficulty: 'advanced', subfocus: 'posterior chain' },
  { id: 'b17', name: 'Cable Row (Wide Grip)', muscle_group: 'back', category: 'compound', equipment: 'cable', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'upper back' },
  { id: 'b18', name: 'Single Arm Cable Row', muscle_group: 'back', category: 'compound', equipment: 'cable', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts','core'], difficulty: 'beginner', subfocus: 'lats' },
  { id: 'b19', name: 'Machine Row', muscle_group: 'back', category: 'compound', equipment: 'machine', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'mid back' },
  { id: 'b20', name: 'Inverted Row', muscle_group: 'back', category: 'compound', equipment: 'bodyweight', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts','core'], difficulty: 'beginner', subfocus: 'mid back' },
  { id: 'b21', name: 'Kroc Row', muscle_group: 'back', category: 'compound', equipment: 'dumbbell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts','forearms'], difficulty: 'advanced', subfocus: 'lats' },
  { id: 'b22', name: 'Smith Machine Row', muscle_group: 'back', category: 'compound', equipment: 'smith_machine', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'mid back' },
  { id: 'b23', name: 'Snatch Grip Deadlift', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['back','hamstrings','glutes'], secondary_muscles: ['traps','forearms','core'], difficulty: 'advanced', subfocus: 'posterior chain' },
  { id: 'b24', name: 'Trap Bar Deadlift', muscle_group: 'back', category: 'compound', equipment: 'barbell', primary_muscles: ['quads','glutes','back'], secondary_muscles: ['hamstrings','forearms'], difficulty: 'intermediate', subfocus: 'posterior chain' },
  { id: 'b25', name: 'Renegade Row', muscle_group: 'back', category: 'compound', equipment: 'dumbbell', primary_muscles: ['back','core'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'intermediate', subfocus: 'anti-rotation' },
  { id: 'b26', name: 'Machine Lat Pulldown', muscle_group: 'back', category: 'compound', equipment: 'machine', primary_muscles: ['back'], secondary_muscles: ['biceps'], difficulty: 'beginner', subfocus: 'lats' },
  { id: 'b27', name: 'Cable Reverse Fly', muscle_group: 'back', category: 'isolation', equipment: 'cable', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 'b28', name: 'Cable Lat Prayer', muscle_group: 'back', category: 'isolation', equipment: 'cable', primary_muscles: ['back'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'lats' },
  { id: 'b29', name: 'Kettlebell Row', muscle_group: 'back', category: 'compound', equipment: 'kettlebell', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'lats' },
  { id: 'b30', name: 'Band Row', muscle_group: 'back', category: 'compound', equipment: 'resistance_band', primary_muscles: ['back'], secondary_muscles: ['biceps','rear_delts'], difficulty: 'beginner', subfocus: 'mid back' },
  { id: 'b31', name: 'Commando Pull-up', muscle_group: 'back', category: 'compound', equipment: 'bodyweight', primary_muscles: ['back'], secondary_muscles: ['biceps','core'], difficulty: 'advanced', subfocus: 'lats' },
  { id: 'b32', name: 'Muscle Up', muscle_group: 'back', category: 'compound', equipment: 'bodyweight', primary_muscles: ['back','chest'], secondary_muscles: ['biceps','triceps','core'], difficulty: 'advanced', subfocus: 'lats' },
  // ── SHOULDERS (24) ──
  { id: 's1', name: 'Barbell Overhead Press', muscle_group: 'shoulders', category: 'compound', equipment: 'barbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps','core'], difficulty: 'intermediate', subfocus: 'front delts' },
  { id: 's2', name: 'Dumbbell Overhead Press', muscle_group: 'shoulders', category: 'compound', equipment: 'dumbbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'beginner', subfocus: 'front delts' },
  { id: 's3', name: 'Arnold Press', muscle_group: 'shoulders', category: 'compound', equipment: 'dumbbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'intermediate', subfocus: 'all heads' },
  { id: 's4', name: 'Lateral Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['side_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'side delts' },
  { id: 's5', name: 'Cable Lateral Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['side_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'side delts' },
  { id: 's6', name: 'Face Pull', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's7', name: 'Rear Delt Fly', muscle_group: 'shoulders', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's8', name: 'Upright Row', muscle_group: 'shoulders', category: 'compound', equipment: 'barbell', primary_muscles: ['side_delts','traps'], secondary_muscles: ['biceps'], difficulty: 'intermediate', subfocus: 'side delts' },
  { id: 's9', name: 'Machine Shoulder Press', muscle_group: 'shoulders', category: 'compound', equipment: 'machine', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'beginner', subfocus: 'front delts' },
  { id: 's10', name: 'Machine Lateral Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'machine', primary_muscles: ['side_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'side delts' },
  { id: 's11', name: 'Cable Rear Delt Fly', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's12', name: 'Barbell Shrug', muscle_group: 'shoulders', category: 'isolation', equipment: 'barbell', primary_muscles: ['traps'], secondary_muscles: ['side_delts'], difficulty: 'beginner', subfocus: 'traps' },
  { id: 's13', name: 'Seated Dumbbell Press', muscle_group: 'shoulders', category: 'compound', equipment: 'dumbbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'beginner', subfocus: 'front delts' },
  { id: 's14', name: 'Push Press', muscle_group: 'shoulders', category: 'compound', equipment: 'barbell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps','core','quads'], difficulty: 'intermediate', subfocus: 'front delts' },
  { id: 's15', name: 'Smith Machine Overhead Press', muscle_group: 'shoulders', category: 'compound', equipment: 'smith_machine', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'beginner', subfocus: 'front delts' },
  { id: 's16', name: 'Dumbbell Front Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['front_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'front delts' },
  { id: 's17', name: 'Cable Front Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['front_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'front delts' },
  { id: 's18', name: 'Reverse Pec Deck', muscle_group: 'shoulders', category: 'isolation', equipment: 'machine', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's19', name: 'Dumbbell Shrug', muscle_group: 'shoulders', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['traps'], secondary_muscles: ['side_delts'], difficulty: 'beginner', subfocus: 'traps' },
  { id: 's20', name: 'Cable Shrug', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['traps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'traps' },
  { id: 's21', name: 'Kettlebell Overhead Press', muscle_group: 'shoulders', category: 'compound', equipment: 'kettlebell', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps','core'], difficulty: 'intermediate', subfocus: 'front delts' },
  { id: 's22', name: 'Landmine Press', muscle_group: 'shoulders', category: 'compound', equipment: 'barbell', primary_muscles: ['front_delts'], secondary_muscles: ['triceps','core'], difficulty: 'intermediate', subfocus: 'front delts' },
  { id: 's23', name: 'Lu Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['side_delts','front_delts'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'all heads' },
  { id: 's24', name: 'Band Pull-Apart', muscle_group: 'shoulders', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's25', name: 'Pike Push-up', muscle_group: 'shoulders', category: 'compound', equipment: 'bodyweight', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps'], difficulty: 'intermediate', subfocus: 'front delts' },
  { id: 's26', name: 'Handstand Push-up', muscle_group: 'shoulders', category: 'compound', equipment: 'bodyweight', primary_muscles: ['front_delts','side_delts'], secondary_muscles: ['triceps','core'], difficulty: 'advanced', subfocus: 'front delts' },
  { id: 's27', name: 'Cable Upright Row', muscle_group: 'shoulders', category: 'compound', equipment: 'cable', primary_muscles: ['side_delts','traps'], secondary_muscles: ['biceps'], difficulty: 'intermediate', subfocus: 'side delts' },
  { id: 's28', name: 'Cable Face Pull (Rope)', muscle_group: 'shoulders', category: 'isolation', equipment: 'cable', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids','external_rotators'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's29', name: 'Machine Rear Delt Fly', muscle_group: 'shoulders', category: 'isolation', equipment: 'machine', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's30', name: 'Kettlebell Halo', muscle_group: 'shoulders', category: 'isolation', equipment: 'kettlebell', primary_muscles: ['side_delts'], secondary_muscles: ['core','traps'], difficulty: 'beginner', subfocus: 'shoulder mobility' },
  { id: 's31', name: 'Band Lateral Raise', muscle_group: 'shoulders', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['side_delts'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'side delts' },
  { id: 's32', name: 'Band Face Pull', muscle_group: 'shoulders', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['rear_delts'], secondary_muscles: ['rhomboids'], difficulty: 'beginner', subfocus: 'rear delts' },
  { id: 's33', name: 'Clean and Press', muscle_group: 'shoulders', category: 'compound', equipment: 'barbell', primary_muscles: ['front_delts','quads','glutes'], secondary_muscles: ['triceps','core','back'], difficulty: 'advanced', subfocus: 'full body' },
  { id: 's34', name: 'Kettlebell Clean', muscle_group: 'shoulders', category: 'compound', equipment: 'kettlebell', primary_muscles: ['front_delts','glutes'], secondary_muscles: ['core','forearms'], difficulty: 'intermediate', subfocus: 'full body' },
  { id: 's35', name: 'Kettlebell Snatch', muscle_group: 'shoulders', category: 'compound', equipment: 'kettlebell', primary_muscles: ['front_delts','glutes','hamstrings'], secondary_muscles: ['core','back'], difficulty: 'advanced', subfocus: 'full body' },
  { id: 's36', name: 'Battle Rope Slam', muscle_group: 'shoulders', category: 'compound', equipment: 'cable', primary_muscles: ['front_delts','core'], secondary_muscles: ['back','arms'], difficulty: 'intermediate', subfocus: 'conditioning' },
  // ── LEGS (52) ──
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
  { id: 'l18', name: 'Goblet Squat', muscle_group: 'legs', category: 'compound', equipment: 'dumbbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['core'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l19', name: 'Kettlebell Goblet Squat', muscle_group: 'legs', category: 'compound', equipment: 'kettlebell', primary_muscles: ['quads','glutes'], secondary_muscles: ['core'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l20', name: 'Smith Machine Squat', muscle_group: 'legs', category: 'compound', equipment: 'smith_machine', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l21', name: 'Sissy Squat', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['quads'], secondary_muscles: [], difficulty: 'advanced', subfocus: 'quads' },
  { id: 'l22', name: 'Step-Up', muscle_group: 'legs', category: 'compound', equipment: 'dumbbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l23', name: 'Reverse Lunge', muscle_group: 'legs', category: 'compound', equipment: 'dumbbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l24', name: 'Barbell Lunge', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l25', name: 'Pendulum Squat', muscle_group: 'legs', category: 'compound', equipment: 'machine', primary_muscles: ['quads'], secondary_muscles: ['glutes'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l26', name: 'Belt Squat', muscle_group: 'legs', category: 'compound', equipment: 'machine', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l27', name: 'Cyclist Squat', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['quads'], secondary_muscles: ['glutes'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l28', name: 'Wall Sit', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['quads'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l29', name: 'Pistol Squat', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'advanced', subfocus: 'quads' },
  { id: 'l30', name: 'Box Squat', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l31', name: 'Safety Bar Squat', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l32', name: 'Stiff Leg Deadlift', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['back','core'], difficulty: 'intermediate', subfocus: 'hamstrings' },
  { id: 'l33', name: 'Dumbbell Romanian Deadlift', muscle_group: 'legs', category: 'compound', equipment: 'dumbbell', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['back','core'], difficulty: 'beginner', subfocus: 'hamstrings' },
  { id: 'l34', name: 'Single Leg Romanian Deadlift', muscle_group: 'legs', category: 'compound', equipment: 'dumbbell', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['core'], difficulty: 'intermediate', subfocus: 'hamstrings' },
  { id: 'l35', name: 'Kettlebell Swing', muscle_group: 'legs', category: 'compound', equipment: 'kettlebell', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['core','back'], difficulty: 'intermediate', subfocus: 'hamstrings' },
  { id: 'l36', name: 'Good Morning', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['back','core'], difficulty: 'intermediate', subfocus: 'hamstrings' },
  { id: 'l37', name: 'Glute Ham Raise', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['hamstrings','glutes'], secondary_muscles: [], difficulty: 'advanced', subfocus: 'hamstrings' },
  { id: 'l38', name: 'Slider Leg Curl', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['hamstrings'], secondary_muscles: ['glutes'], difficulty: 'intermediate', subfocus: 'hamstrings' },
  { id: 'l39', name: 'Cable Pull Through', muscle_group: 'legs', category: 'compound', equipment: 'cable', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['core'], difficulty: 'beginner', subfocus: 'hamstrings' },
  { id: 'l40', name: 'Barbell Glute Bridge', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['glutes'], secondary_muscles: ['hamstrings'], difficulty: 'intermediate', subfocus: 'glutes' },
  { id: 'l41', name: 'Single Leg Hip Thrust', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'intermediate', subfocus: 'glutes' },
  { id: 'l42', name: 'Cable Hip Abduction', muscle_group: 'legs', category: 'isolation', equipment: 'cable', primary_muscles: ['glutes'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'glute medius' },
  { id: 'l43', name: 'Banded Clamshell', muscle_group: 'legs', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['glutes'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'glute medius' },
  { id: 'l44', name: 'Frog Pump', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['glutes'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'glutes' },
  { id: 'l45', name: 'Smith Machine Hip Thrust', muscle_group: 'legs', category: 'compound', equipment: 'smith_machine', primary_muscles: ['glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'glutes' },
  { id: 'l46', name: 'Lateral Band Walk', muscle_group: 'legs', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['glutes'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'glute medius' },
  { id: 'l47', name: 'Donkey Calf Raise', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['calves'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'calves' },
  { id: 'l48', name: 'Single Leg Calf Raise', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['calves'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'calves' },
  { id: 'l49', name: 'Leg Press Calf Raise', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['calves'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'calves' },
  { id: 'l50', name: 'Barbell Calf Raise', muscle_group: 'legs', category: 'isolation', equipment: 'barbell', primary_muscles: ['calves'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'calves' },
  { id: 'l51', name: 'Smith Machine Calf Raise', muscle_group: 'legs', category: 'isolation', equipment: 'smith_machine', primary_muscles: ['calves'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'calves' },
  { id: 'l52', name: 'Tibialis Raise', muscle_group: 'legs', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['tibialis'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'tibialis' },
  { id: 'l53', name: 'Thrusters', muscle_group: 'legs', category: 'compound', equipment: 'barbell', primary_muscles: ['quads','glutes','front_delts'], secondary_muscles: ['triceps','core'], difficulty: 'intermediate', subfocus: 'full body' },
  { id: 'l54', name: 'Burpee', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['quads','chest'], secondary_muscles: ['core','triceps','front_delts'], difficulty: 'beginner', subfocus: 'full body' },
  { id: 'l55', name: 'Machine Leg Press (Narrow)', muscle_group: 'legs', category: 'compound', equipment: 'machine', primary_muscles: ['quads'], secondary_muscles: ['glutes'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l56', name: 'Machine Leg Press (Wide)', muscle_group: 'legs', category: 'compound', equipment: 'machine', primary_muscles: ['glutes','quads'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'glutes' },
  { id: 'l57', name: 'Smith Machine Lunge', muscle_group: 'legs', category: 'compound', equipment: 'smith_machine', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l58', name: 'Machine Hip Thrust', muscle_group: 'legs', category: 'compound', equipment: 'machine', primary_muscles: ['glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'glutes' },
  { id: 'l59', name: 'Hip Adduction Machine', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['adductors'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'inner thigh' },
  { id: 'l60', name: 'Hip Abduction Machine', muscle_group: 'legs', category: 'isolation', equipment: 'machine', primary_muscles: ['glutes'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'glute medius' },
  { id: 'l61', name: 'Kettlebell Front Squat', muscle_group: 'legs', category: 'compound', equipment: 'kettlebell', primary_muscles: ['quads','glutes'], secondary_muscles: ['core'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l62', name: 'Kettlebell Deadlift', muscle_group: 'legs', category: 'compound', equipment: 'kettlebell', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['back','core'], difficulty: 'beginner', subfocus: 'hamstrings' },
  { id: 'l63', name: 'Kettlebell Sumo Squat', muscle_group: 'legs', category: 'compound', equipment: 'kettlebell', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings','core'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l64', name: 'Band Squat', muscle_group: 'legs', category: 'compound', equipment: 'resistance_band', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l65', name: 'Band Good Morning', muscle_group: 'legs', category: 'compound', equipment: 'resistance_band', primary_muscles: ['hamstrings','glutes'], secondary_muscles: ['back','core'], difficulty: 'beginner', subfocus: 'hamstrings' },
  { id: 'l66', name: 'Band Hip Thrust', muscle_group: 'legs', category: 'compound', equipment: 'resistance_band', primary_muscles: ['glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'glutes' },
  { id: 'l67', name: 'Band Leg Curl', muscle_group: 'legs', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['hamstrings'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'hamstrings' },
  { id: 'l68', name: 'Bodyweight Squat', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['quads','glutes'], secondary_muscles: ['hamstrings'], difficulty: 'beginner', subfocus: 'quads' },
  { id: 'l69', name: 'Jump Squat', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['quads','glutes'], secondary_muscles: ['calves','core'], difficulty: 'intermediate', subfocus: 'quads' },
  { id: 'l70', name: 'Box Jump', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['quads','glutes'], secondary_muscles: ['calves','hamstrings'], difficulty: 'intermediate', subfocus: 'power' },
  { id: 'l71', name: 'Cossack Squat', muscle_group: 'legs', category: 'compound', equipment: 'bodyweight', primary_muscles: ['quads','glutes'], secondary_muscles: ['adductors','hamstrings'], difficulty: 'intermediate', subfocus: 'mobility' },
  // ── ARMS (35) ──
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
  { id: 'a15', name: 'Spider Curl', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['biceps'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'short head' },
  { id: 'a16', name: 'Cable Hammer Curl', muscle_group: 'arms', category: 'isolation', equipment: 'cable', primary_muscles: ['biceps','brachialis'], secondary_muscles: ['forearms'], difficulty: 'beginner', subfocus: 'brachialis' },
  { id: 'a17', name: 'Reverse Barbell Curl', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['brachioradialis'], secondary_muscles: ['biceps','forearms'], difficulty: 'beginner', subfocus: 'forearms' },
  { id: 'a18', name: 'Machine Preacher Curl', muscle_group: 'arms', category: 'isolation', equipment: 'machine', primary_muscles: ['biceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'short head' },
  { id: 'a19', name: 'Bayesian Cable Curl', muscle_group: 'arms', category: 'isolation', equipment: 'cable', primary_muscles: ['biceps'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'long head' },
  { id: 'a20', name: 'Cross Body Hammer Curl', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['brachialis'], secondary_muscles: ['biceps','forearms'], difficulty: 'beginner', subfocus: 'brachialis' },
  { id: 'a21', name: 'Zottman Curl', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['biceps','forearms'], secondary_muscles: ['brachialis'], difficulty: 'intermediate', subfocus: 'all heads' },
  { id: 'a22', name: '21s Barbell Curl', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['biceps'], secondary_muscles: ['forearms'], difficulty: 'intermediate', subfocus: 'biceps' },
  { id: 'a23', name: 'Dip', muscle_group: 'arms', category: 'compound', equipment: 'bodyweight', primary_muscles: ['triceps'], secondary_muscles: ['chest','front_delts'], difficulty: 'intermediate', subfocus: 'triceps' },
  { id: 'a24', name: 'Overhead Dumbbell Extension', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'long head' },
  { id: 'a25', name: 'Cable Overhead Extension', muscle_group: 'arms', category: 'isolation', equipment: 'cable', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'long head' },
  { id: 'a26', name: 'JM Press', muscle_group: 'arms', category: 'compound', equipment: 'barbell', primary_muscles: ['triceps'], secondary_muscles: ['chest'], difficulty: 'advanced', subfocus: 'medial head' },
  { id: 'a27', name: 'Bench Dip', muscle_group: 'arms', category: 'compound', equipment: 'bodyweight', primary_muscles: ['triceps'], secondary_muscles: ['chest','front_delts'], difficulty: 'beginner', subfocus: 'triceps' },
  { id: 'a28', name: 'Single Arm Pushdown', muscle_group: 'arms', category: 'isolation', equipment: 'cable', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'lateral head' },
  { id: 'a29', name: 'Machine Tricep Extension', muscle_group: 'arms', category: 'isolation', equipment: 'machine', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'triceps' },
  { id: 'a30', name: 'Wrist Curl', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['forearms'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'wrist flexors' },
  { id: 'a31', name: 'Reverse Wrist Curl', muscle_group: 'arms', category: 'isolation', equipment: 'barbell', primary_muscles: ['forearms'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'wrist extensors' },
  { id: 'a32', name: 'Farmer Walk', muscle_group: 'arms', category: 'compound', equipment: 'dumbbell', primary_muscles: ['forearms'], secondary_muscles: ['traps','core'], difficulty: 'beginner', subfocus: 'grip strength' },
  { id: 'a33', name: 'Plate Pinch Hold', muscle_group: 'arms', category: 'isolation', equipment: 'dumbbell', primary_muscles: ['forearms'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'grip strength' },
  { id: 'a34', name: 'Dead Hang', muscle_group: 'arms', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['forearms'], secondary_muscles: ['lats','shoulders'], difficulty: 'beginner', subfocus: 'grip strength' },
  { id: 'a35', name: 'Kettlebell Farmer Walk', muscle_group: 'arms', category: 'compound', equipment: 'kettlebell', primary_muscles: ['forearms'], secondary_muscles: ['traps','core'], difficulty: 'beginner', subfocus: 'grip strength' },
  { id: 'a36', name: 'Machine Bicep Curl', muscle_group: 'arms', category: 'isolation', equipment: 'machine', primary_muscles: ['biceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'biceps' },
  { id: 'a37', name: 'Smith Machine Close Grip Press', muscle_group: 'arms', category: 'compound', equipment: 'smith_machine', primary_muscles: ['triceps'], secondary_muscles: ['chest','front_delts'], difficulty: 'beginner', subfocus: 'triceps' },
  { id: 'a38', name: 'Band Curl', muscle_group: 'arms', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['biceps'], secondary_muscles: ['forearms'], difficulty: 'beginner', subfocus: 'biceps' },
  { id: 'a39', name: 'Band Tricep Extension', muscle_group: 'arms', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['triceps'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'triceps' },
  // ── CORE (24) ──
  { id: 'co1', name: 'Plank', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['shoulders'], difficulty: 'beginner', subfocus: 'stability' },
  { id: 'co2', name: 'Ab Wheel Rollout', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['lats','shoulders'], difficulty: 'intermediate', subfocus: 'rectus abdominis' },
  { id: 'co3', name: 'Cable Crunch', muscle_group: 'core', category: 'isolation', equipment: 'cable', primary_muscles: ['core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'rectus abdominis' },
  { id: 'co4', name: 'Hanging Leg Raise', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors'], difficulty: 'intermediate', subfocus: 'lower abs' },
  { id: 'co5', name: 'Pallof Press', muscle_group: 'core', category: 'isolation', equipment: 'cable', primary_muscles: ['core'], secondary_muscles: ['obliques'], difficulty: 'beginner', subfocus: 'anti-rotation' },
  { id: 'co6', name: 'Dead Bug', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors'], difficulty: 'beginner', subfocus: 'stability' },
  { id: 'co7', name: 'Side Plank', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['obliques'], secondary_muscles: ['core'], difficulty: 'beginner', subfocus: 'obliques' },
  { id: 'co8', name: 'Russian Twist', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['obliques','core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'rotation' },
  { id: 'co9', name: 'Bicycle Crunch', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['obliques','core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'obliques' },
  { id: 'co10', name: 'Dragon Flag', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors','lats'], difficulty: 'advanced', subfocus: 'rectus abdominis' },
  { id: 'co11', name: 'V-Up', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core','hip_flexors'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'lower abs' },
  { id: 'co12', name: 'Cable Woodchop', muscle_group: 'core', category: 'isolation', equipment: 'cable', primary_muscles: ['obliques','core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'rotation' },
  { id: 'co13', name: 'Decline Sit-Up', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors'], difficulty: 'intermediate', subfocus: 'rectus abdominis' },
  { id: 'co14', name: 'Weighted Plank', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['shoulders'], difficulty: 'intermediate', subfocus: 'stability' },
  { id: 'co15', name: 'Mountain Climber', muscle_group: 'core', category: 'compound', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors','shoulders'], difficulty: 'beginner', subfocus: 'stability' },
  { id: 'co16', name: 'Toe Touch', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'upper abs' },
  { id: 'co17', name: 'Flutter Kick', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors'], difficulty: 'beginner', subfocus: 'lower abs' },
  { id: 'co18', name: 'L-Sit Hold', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors','triceps'], difficulty: 'advanced', subfocus: 'stability' },
  { id: 'co19', name: 'Hollow Body Hold', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: [], difficulty: 'intermediate', subfocus: 'stability' },
  { id: 'co20', name: 'Copenhagen Plank', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['obliques','adductors'], secondary_muscles: ['core'], difficulty: 'advanced', subfocus: 'obliques' },
  { id: 'co21', name: 'Suitcase Carry', muscle_group: 'core', category: 'compound', equipment: 'dumbbell', primary_muscles: ['obliques','core'], secondary_muscles: ['forearms','traps'], difficulty: 'intermediate', subfocus: 'anti-lateral flexion' },
  { id: 'co22', name: 'Turkish Get-Up', muscle_group: 'core', category: 'compound', equipment: 'kettlebell', primary_muscles: ['core'], secondary_muscles: ['shoulders','glutes','quads'], difficulty: 'advanced', subfocus: 'full body stability' },
  { id: 'co23', name: 'Bear Crawl', muscle_group: 'core', category: 'compound', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['shoulders','quads'], difficulty: 'beginner', subfocus: 'stability' },
  { id: 'co24', name: 'Band Anti-Rotation Hold', muscle_group: 'core', category: 'isolation', equipment: 'resistance_band', primary_muscles: ['core'], secondary_muscles: ['obliques'], difficulty: 'beginner', subfocus: 'anti-rotation' },
  { id: 'co25', name: 'Hanging Knee Raise', muscle_group: 'core', category: 'isolation', equipment: 'bodyweight', primary_muscles: ['core'], secondary_muscles: ['hip_flexors'], difficulty: 'beginner', subfocus: 'lower abs' },
  { id: 'co26', name: 'Machine Abdominal Crunch', muscle_group: 'core', category: 'isolation', equipment: 'machine', primary_muscles: ['core'], secondary_muscles: [], difficulty: 'beginner', subfocus: 'rectus abdominis' },
  { id: 'co27', name: 'Kettlebell Windmill', muscle_group: 'core', category: 'compound', equipment: 'kettlebell', primary_muscles: ['obliques','core'], secondary_muscles: ['shoulders','hamstrings'], difficulty: 'intermediate', subfocus: 'obliques' },
]

interface UseExercisesReturn {
  exercises: ExerciseLibraryEntry[]
  loading: boolean
}

export function useExercises(): UseExercisesReturn {
  const [exercises, setExercises] = useState<ExerciseLibraryEntry[]>(() => {
    // Initialize from cache if available, otherwise use fallback
    return getCachedExercises() ?? FALLBACK
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const cached = getCachedExercises()
    const stale = isCacheStale()
    const online = navigator.onLine

    // If cache exists and is fresh, skip network fetch
    if (cached && !stale) {
      setExercises(cached)
      setLoading(false)
      return
    }

    // If offline, use cache (even if stale) or fallback
    if (!online) {
      if (cached) setExercises(cached)
      // else: keep FALLBACK from initial state
      setLoading(false)
      return
    }

    // Online: fetch from Supabase
    async function load(): Promise<void> {
      try {
        const { data, error } = await supabase.from('exercises').select('*').order('name')
        if (!error && data && data.length > 0 && !cancelled) {
          setExercises(data as ExerciseLibraryEntry[])
          cacheExercises(data as ExerciseLibraryEntry[])
        }
      } catch { /* keep fallback or stale cache */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return { exercises, loading }
}

export function useFilteredExercises(
  exercises: ExerciseLibraryEntry[],
  query: string,
  muscleFilter: string | null,
  equipmentFilter: string | null,
): ExerciseLibraryEntry[] {
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

export function getExercisesByMuscle(exercises: ExerciseLibraryEntry[]): Record<string, ExerciseLibraryEntry[]> {
  const map: Record<string, ExerciseLibraryEntry[]> = {}
  for (const e of exercises) {
    const muscles = [...(e.primary_muscles || []), e.muscle_group]
    for (const m of new Set(muscles)) {
      if (!map[m]) map[m] = []
      map[m]!.push(e)
    }
  }
  return map
}
