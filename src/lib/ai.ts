import { supabase } from './supabase'
import { workoutCacheKey, substituteCacheKey, cacheGet, cacheSet } from './aiCache'
import { getExerciseSubstituteLocal } from './exerciseSubstitutes'
import { getVolumeCeiling } from './training-analysis'
import { generateLocalWorkout } from './localWorkoutGenerator'
import { logWarn } from './logger'
import { detectFatigue } from './fatigueDetector'
import { loadInjuries, filterWorkoutForInjuries } from './injuryRecovery'
import type {
  MuscleStatusMap, MuscleGroup, ExperienceLevel, AIWorkoutResponse,
  ExerciseSubstituteInput, ExerciseSubstituteResponse, ExerciseGuideResponse,
  RecentSession,
} from '../types'

interface WorkoutGenerationPreferences {
  name?: string
  gender?: string
  goal?: string
  trainingGoal?: string
  trainingPhase?: string
  equipment?: string
  experienceLevel?: ExperienceLevel
  bodyweight?: string
  frequency?: string
  energy?: string
  time?: number
  benchMax?: string
  squatMax?: string
  deadliftMax?: string
  focusedMuscles?: MuscleGroup[]
  priorityMuscles?: MuscleGroup[]
  mainLift?: string | null
  mainLiftGoalKg?: number | null
  isDeload?: boolean
  blockWeek?: number
  blockTotalWeeks?: number | null
  targetRPE?: number | null
  targetRepRange?: [number, number] | null
  weekTargetNote?: string | null
}

interface WorkoutGenerationInput {
  muscleStatus: MuscleStatusMap
  recommendedSplit: string
  recentHistory: RecentSession[]
  preferences: WorkoutGenerationPreferences
  userId?: string | null
  signal?: AbortSignal | null
  /** Raw workouts for fatigue detection (optional, enables fatigue-aware prompts) */
  workouts?: import('../types').Workout[]
}

/**
 * Format exercise history for progressive overload in AI prompt
 */
function formatExerciseHistory(history: RecentSession[]): string {
  if (!history || history.length === 0) return 'No previous session data available'

  // Group all sets by exercise name
  const byExercise: Record<string, { weight: number | null; reps: number | null; rpe: number | null; date: string }[]> = {}
  for (const workout of history) {
    for (const set of (workout.sets || [])) {
      if (!set.exercise) continue
      if (!byExercise[set.exercise]) byExercise[set.exercise] = []
      byExercise[set.exercise]!.push({
        weight: set.weight_kg,
        reps: set.reps,
        rpe: set.rpe,
        date: workout.date,
      })
    }
  }

  // Format top exercises (limit to 8 to keep prompt small)
  const lines: string[] = []
  const exercises = Object.entries(byExercise).slice(0, 8)
  for (const [name, sets] of exercises) {
    // Take last 2 sets to show recent progression
    const recent = sets.slice(-2)
    const summary = recent.map(s =>
      `${s.weight || '?'}kg x${s.reps || '?'}${s.rpe ? ` @${s.rpe}` : ''}`
    ).join(', ')
    lines.push(`${name}:${summary}`)
  }

  return lines.join('\n') || 'No previous session data available'
}

/** Get auth headers for API calls */
async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    }
  } catch { /* fall through */ }
  return { 'Content-Type': 'application/json' }
}

// Robust JSON extractor — handles markdown fences and surrounding text
function extractJSON<T>(raw: string): T {
  if (!raw || typeof raw !== 'string') throw new Error('Empty response from AI')
  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Direct parse first
  try { return JSON.parse(text) as T } catch { /* continue */ }
  // Find outermost { ... }
  const start: number = text.indexOf('{')
  const end: number = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) as T } catch { /* continue */ }
  }
  // Give up
  if (import.meta.env.DEV) console.error('Raw AI response that failed to parse:', raw.slice(0, 500))
  throw new Error('Failed to parse AI response. Please try again.')
}

export async function generateScientificWorkout({
  muscleStatus,
  recommendedSplit,
  recentHistory,
  preferences,
  userId = null,
  signal = null,
  workouts,
}: WorkoutGenerationInput): Promise<AIWorkoutResponse> {
  // --- Cache check ---
  const cacheKeyVal = workoutCacheKey({
    split: recommendedSplit,
    muscleStatus,
    preferences: {
      goal: (preferences.goal || 'hypertrophy') as AIWorkoutResponse['split'] extends string ? never : never,
      equipment: (preferences.equipment || 'full_gym') as 'full_gym',
      time: preferences.time || 60,
      energy: preferences.energy,
      isDeload: preferences.isDeload,
      trainingPhase: preferences.trainingPhase as 'build' | undefined,
      blockWeek: preferences.blockWeek,
      focusedMuscles: preferences.focusedMuscles,
    },
  })
  const cached = await cacheGet(cacheKeyVal, userId)
  if (cached) {
    if (import.meta.env.DEV) console.log('[aiCache] Workout cache HIT:', cacheKeyVal)
    return cached as AIWorkoutResponse
  }
  if (import.meta.env.DEV) console.log('[aiCache] Workout cache MISS — calling Gemini')
  // --- End cache check ---

  // Filter muscle status to only relevant muscles for this split
  const splitMuscleMap: Record<string, string[]> = {
    'Push': ['chest', 'shoulders', 'triceps', 'core'],
    'Pull': ['back', 'biceps', 'core'],
    'Legs': ['quads', 'hamstrings', 'glutes', 'core'],
    'Upper': ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core'],
    'Lower': ['quads', 'hamstrings', 'glutes', 'core'],
    'Full Body': ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core'],
  }
  const relevantMuscles = splitMuscleMap[recommendedSplit] || Object.keys(muscleStatus)

  // Compact muscle status: only relevant muscles, abbreviated format
  const muscleStatusText = Object.entries(muscleStatus)
    .filter(([muscle]) => relevantMuscles.includes(muscle))
    .map(([muscle, ms]) =>
      `${muscle}:${ms.setsThisWeek}/${ms.target.min}-${ms.target.max}sets,${ms.daysSinceLastTrained ?? '?'}d ago,RPE${ms.avgRpeLastSession ?? '?'},${ms.status}${ms.recentExercises.length ? ',ex:' + ms.recentExercises.slice(0, 3).join('/') : ''}`
    ).join('\n')

  // Limit history to last 5 sessions to reduce prompt size
  const limitedHistory = recentHistory.slice(0, 5)
  const historyText = limitedHistory.length > 0
    ? limitedHistory.map(s => {
        const date = new Date(s.date).toLocaleDateString()
        const sets = s.sets.map(x => `  ${x.exercise}:${x.weight_kg}kg x${x.reps}${x.rpe ? ` @${x.rpe}` : ''}`).join('\n')
        return `${date}:\n${sets}`
      }).join('\n')
    : 'No recent history.'

  // Build athlete profile section
  const bw = preferences.bodyweight ? `${preferences.bodyweight}kg` : 'unknown'
  const level = preferences.experienceLevel || 'intermediate'
  const equipment = preferences.equipment || 'full_gym'
  const knowns: string[] = []
  if (preferences.benchMax) knowns.push(`bench 1RM ~${preferences.benchMax}kg`)
  if (preferences.squatMax) knowns.push(`squat 1RM ~${preferences.squatMax}kg`)
  if (preferences.deadliftMax) knowns.push(`deadlift 1RM ~${preferences.deadliftMax}kg`)

  const weightGuidance = preferences.bodyweight
    ? `Weight est: ${bw}/${level}. Beg:bench=0.5xBW,squat=0.75x,DL=1x. Int:0.8x,1.2x,1.5x. Adv:1.2x,1.5x,2x. Iso~20-30% bench. NEVER 0kg.${knowns.length > 0 ? ` Known: ${knowns.join(', ')}` : ''}`
    : 'No BW set. Estimate: bench~60kg,squat~80kg,DL~100kg. NEVER 0kg.'

  const focusNote = preferences.focusedMuscles && preferences.focusedMuscles.length > 0
    ? `\nFOCUS MUSCLES (add extra sets/exercises): ${preferences.focusedMuscles.join(', ')}`
    : ''

  const priorityNote = preferences.priorityMuscles && preferences.priorityMuscles.length > 0
    ? `\nPRIORITY MUSCLES (add 1-2 extra sets): ${preferences.priorityMuscles.join(', ')}`
    : ''

  const mainLiftNote = preferences.mainLift && preferences.mainLiftGoalKg
    ? `\nMAIN LIFT FOCUS: ${preferences.mainLift.toUpperCase()} - Target PR: ${preferences.mainLiftGoalKg}kg. Prioritize this lift with optimal placement and intensity.`
    : ''

  const trainingGoalNote = preferences.trainingGoal
    ? `\nTRAINING GOAL: ${preferences.trainingGoal}${preferences.trainingPhase ? ` (Phase: ${preferences.trainingPhase})` : ''}`
    : ''

  const goalRepRanges: Record<string, { min: number; max: number; note: string }> = {
    strength: { min: 1, max: 5, note: 'Low reps, high weight, focus on compound lifts' },
    hypertrophy: { min: 8, max: 12, note: 'Moderate weight, higher volume' },
    powerbuilding: { min: 4, max: 8, note: 'Mix of strength and hypertrophy ranges' },
    conditioning: { min: 12, max: 20, note: 'Lighter weight, higher reps, shorter rest' },
  }
  const goalReps = goalRepRanges[preferences.trainingGoal || ''] ?? goalRepRanges.hypertrophy!
  const goalRepNote = preferences.trainingGoal
    ? `\nGOAL-BASED REP RANGE: ${goalReps.min}-${goalReps.max} reps — ${goalReps.note}`
    : ''

  const periodizationNote = preferences.trainingPhase
    ? `\nBlock: ${preferences.trainingPhase} Wk${preferences.blockWeek}/${preferences.blockTotalWeeks}. ${preferences.isDeload ? 'DELOAD: -40-50% vol, RPE<=6.' : `RPE ${preferences.targetRPE}, ${preferences.targetRepRange?.[0]}-${preferences.targetRepRange?.[1]} reps.`} ${preferences.weekTargetNote || ''}`
    : ''

  const genderNote = preferences.gender ? `\nGender:${preferences.gender}` : ''

  // Injury context for AI prompt
  const activeInjuries = loadInjuries().filter(i => i.status !== 'resolved')
  const injuryNote = activeInjuries.length > 0
    ? `\nINJURIES:\n${activeInjuries.map(i =>
        `INJURY: ${i.bodyArea} (${i.side}) - ${i.severity} - ${i.status} — AVOID exercises that stress this area. ${i.status === 'recovering' ? 'Use 70% weight for affected area. Consider unilateral alternatives for the unaffected side.' : 'DO NOT include exercises for this area.'}`
      ).join('\n')}`
    : ''

  // Fatigue detection: if enough workout history is available, check for fatigue signals
  const fatigue = workouts && workouts.length >= 4
    ? detectFatigue(workouts, 3, parseInt(preferences.frequency || '') || 4)
    : null
  const fatigueNote = fatigue?.fatigued
    ? '\nFATIGUE ALERT: User shows fatigue signals. Reduce total volume by 20% and lower RPE targets by 1.'
    : ''

  const prompt = `Athlete: ${preferences.gender || '?'}/${bw}/${level}, goal:${preferences.goal || 'hypertrophy'}, equip:${equipment}, freq:${preferences.frequency || '4x'}/wk, energy:${preferences.energy || 'medium'}, time:${preferences.time || 60}min${focusNote}${priorityNote}${mainLiftNote}${trainingGoalNote}${goalRepNote}${genderNote ? `\nGender note: ${preferences.gender} — adjust volume/recovery accordingly` : ''}${injuryNote}${fatigueNote}
${periodizationNote}
${weightGuidance}

## Muscle Status (sets_done/target,days_ago,RPE,status)
${muscleStatusText}

## Split: ${recommendedSplit}

## History
${historyText}

## Exercise Progression
${formatExerciseHistory(limitedHistory)}

Rules:
- Overload (percentage-based): RPE<8 + not at top of rep range → add 1-2 reps same weight; RPE<8 + at top of rep range → increase weight (lower compounds +5-7.5%, upper compounds +2.5-5%, isolations +2.5-5%) and reset to bottom of rep range; RPE 8-9 → same weight & reps; RPE 9.5+ → reduce 5%; new → estimate from bodyweight, NEVER 0kg. Round all weights to nearest 2.5kg.
- Note overload decision in "notes" field
- 2+ exercises per muscle, ${preferences.time || 60}min→6-8 exercises (high energy+75min→8-10)
- Compounds 3-5 sets, isolations 3-4 sets. Focus muscles get +1-2 extra sets
- VOLUME CEILING (${level}, sets/muscle/week): ${Object.entries(getVolumeCeiling(level)).map(([m, v]) => `${m}:${v}`).join(', ')}. Check sets_done in muscle status and do NOT exceed ceiling including today's workout.
${preferences.isDeload ? '- DELOAD: 2-3 sets max, RPE<=6' : preferences.trainingPhase ? `- ${preferences.trainingPhase} Wk${preferences.blockWeek}: strict RPE ${preferences.targetRPE}` : ''}
- Always include 1-2 core/ab exercises at the end of every workout regardless of split
- Vary 1-2 exercises vs last session (rotate compound variations)

Return JSON:{"split":"","reasoning":"2-3 sentences","exercises":[{"name":"","muscle_group":"chest|back|shoulders|quads|hamstrings|glutes|biceps|triceps|core","sets":0,"reps_min":0,"reps_max":0,"weight_kg":0,"rpe_target":0,"rest_seconds":0,"notes":"coaching cue","vs_last_session":"up|same|down|new - explanation"}],"estimated_duration_min":0,"volume_notes":""}`

  let result: AIWorkoutResponse

  try {
    const authHeaders = await getAuthHeaders()
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ prompt }),
      signal: signal ?? undefined,
    })

    if (!response.ok) {
      if (response.status === 401) throw new Error('SESSION_EXPIRED')
      const err = await response.text()
      throw new Error(`API error ${response.status}: ${err}`)
    }

    const data = await response.json() as { error?: string; content: string }
    if (data.error) throw new Error(data.error)

    result = extractJSON<AIWorkoutResponse>(data.content)

    // Post-process: fix any 0kg weights using bodyweight estimates
    const bwKg = parseFloat(preferences.bodyweight || '') || 80
    const LEVEL_MULTIPLIERS: Record<string, number> = {
      complete_beginner: 0.45,
      beginner: 0.6,
      returning: 0.6,
      intermediate: 1.0,
      advanced: 1.3,
    }
    const levelMult = LEVEL_MULTIPLIERS[preferences.experienceLevel || 'intermediate'] ?? 1.0
    const fallbacks: Record<string, number> = {
      chest: Math.round(bwKg * levelMult * 0.6 / 2.5) * 2.5,
      back: Math.round(bwKg * levelMult * 0.7 / 2.5) * 2.5,
      shoulders: Math.round(bwKg * levelMult * 0.4 / 2.5) * 2.5,
      quads: Math.round(bwKg * levelMult * 0.9 / 2.5) * 2.5,
      hamstrings: Math.round(bwKg * levelMult * 0.7 / 2.5) * 2.5,
      glutes: Math.round(bwKg * levelMult * 0.8 / 2.5) * 2.5,
      biceps: Math.round(bwKg * levelMult * 0.2 / 2.5) * 2.5,
      triceps: Math.round(bwKg * levelMult * 0.2 / 2.5) * 2.5,
      core: 0,
    }
    if (result.exercises) {
      result.exercises = result.exercises.map(ex => ({
        ...ex,
        weight_kg: (!ex.weight_kg || ex.weight_kg === 0)
          ? (fallbacks[ex.muscle_group] ?? 20)
          : ex.weight_kg,
      }))
    }

    // --- Injury safety net: filter AI result for active injuries ---
    if (activeInjuries.length > 0 && result.exercises) {
      const filtered = filterWorkoutForInjuries(
        result.exercises as unknown as Array<{ name: string; muscle_group: string; [key: string]: unknown }>,
        activeInjuries,
      )
      result.exercises = filtered.map(fe => {
        const existing = result.exercises.find(e => e.name === fe.name)
        if (existing) return existing
        return {
          name: fe.name,
          muscle_group: fe.muscle_group as typeof result.exercises[0]['muscle_group'],
          sets: fe.isRehab ? 3 : 3,
          reps_min: fe.isRehab ? 12 : 8,
          reps_max: fe.isRehab ? 15 : 12,
          weight_kg: 0,
          rpe_target: fe.isRehab ? 5 : 7,
          rest_seconds: fe.isRehab ? 60 : 90,
          notes: fe.isRehab ? 'Rehab exercise' : `Alternative for ${fe.originalExercise || 'excluded exercise'}`,
          vs_last_session: 'new' as const,
        }
      })
    }

    // --- Cache write (2h TTL) ---
    cacheSet(cacheKeyVal, userId, result, 2)
  } catch (apiError: unknown) {
    // Don't fallback for auth errors — those need user action
    if (apiError instanceof Error && apiError.message === 'SESSION_EXPIRED') {
      throw apiError
    }
    // Don't fallback for user-initiated aborts
    if (apiError instanceof DOMException && apiError.name === 'AbortError') {
      throw apiError
    }

    // Fallback to local workout generator (zero cost, works offline)
    logWarn('ai.generateScientificWorkout', 'API unavailable, using local generator')
    try {
      result = generateLocalWorkout({
        muscleStatus,
        recommendedSplit,
        recentHistory,
        preferences: {
          trainingGoal: preferences.trainingGoal || preferences.goal || 'hypertrophy',
          experienceLevel: preferences.experienceLevel || 'intermediate',
          equipment: preferences.equipment || 'full_gym',
          bodyweight: preferences.bodyweight || '80',
          time: preferences.time || 60,
          energy: preferences.energy || 'medium',
          isDeload: preferences.isDeload,
          targetRPE: preferences.targetRPE ?? null,
          targetRepRange: preferences.targetRepRange ?? null,
          focusedMuscles: preferences.focusedMuscles || [],
          gender: preferences.gender,
          benchMax: preferences.benchMax,
          squatMax: preferences.squatMax,
          deadliftMax: preferences.deadliftMax,
        },
      })
      result.reasoning = (result.reasoning || '') + ' (Lokaal gegenereerd)'
    } catch (localErr: unknown) {
      // Local generator also failed — return minimal valid response instead of crashing
      logWarn('ai.generateScientificWorkout', `Local generator failed: ${localErr instanceof Error ? localErr.message : String(localErr)}`)
      result = {
        split: recommendedSplit,
        reasoning: 'Fallback workout',
        exercises: [],
        estimated_duration_min: 0,
        volume_notes: '',
      }
    }
  }

  return result
}


export async function getExerciseSubstitute({
  exercise,
  reason,
  equipment,
  experienceLevel,
  bodyweight,
}: ExerciseSubstituteInput): Promise<ExerciseSubstituteResponse> {
  // --- Static lookup first (zero API cost) ---
  try {
    const local = getExerciseSubstituteLocal({ exercise, reason, equipment, experienceLevel, bodyweight })
    if (local && local.name !== exercise.name) {
      if (import.meta.env.DEV) console.log('[exerciseSubstitutes] Static HIT for:', exercise.name)
      return local
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[exerciseSubstitutes] Static lookup failed:', (e as Error).message)
  }
  // --- Fallback: LLM (for unknown exercises) ---
  if (import.meta.env.DEV) console.log('[exerciseSubstitutes] LLM fallback for:', exercise.name)

  // --- Cache check (global, 30-day TTL) ---
  const subKey = substituteCacheKey({ exercise, reason, equipment })
  const cachedSub = await cacheGet(subKey, null)  // null = global cache
  if (cachedSub) {
    if (import.meta.env.DEV) console.log('[aiCache] Substitute cache HIT:', subKey)
    return cachedSub as ExerciseSubstituteResponse
  }
  if (import.meta.env.DEV) console.log('[aiCache] Substitute cache MISS — calling Gemini')
  // --- End cache check ---

  const prompt = `Suggest ONE substitute exercise for: "${exercise.name}" (targets: ${exercise.muscle_group || 'same muscle group'})

Reason for substitution: ${reason}
Equipment available: ${equipment || 'full_gym'}
Athlete level: ${experienceLevel || 'intermediate'}
Bodyweight: ${bodyweight ? bodyweight + 'kg' : 'unknown'}

Rules:
- Must train the SAME primary muscle group (${exercise.muscle_group})
- Must be practical with the available equipment
- If reason is "machine busy" -> suggest free-weight or cable alternative
- If reason is "no equipment" -> suggest bodyweight or dumbbell alternative
- Suggest appropriate starting weight (NEVER 0kg)

Return ONLY this JSON (no markdown):
{
  "name": "exercise name",
  "muscle_group": "${exercise.muscle_group || 'same'}",
  "weight_kg": number,
  "sets": ${exercise.plan?.sets || 3},
  "reps_min": ${exercise.plan?.reps_min || 8},
  "reps_max": ${exercise.plan?.reps_max || 12},
  "rpe_target": ${exercise.plan?.rpe_target || 8},
  "rest_seconds": ${exercise.plan?.rest_seconds || 90},
  "notes": "brief coaching cue + why this is a good substitute",
  "why": "one sentence explaining why this works as a substitute"
}`

  const authHeaders = await getAuthHeaders()
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    if (response.status === 401) throw new Error('SESSION_EXPIRED')
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json() as { error?: string; content: string }
  if (data.error) throw new Error(data.error)

  const subResult = extractJSON<ExerciseSubstituteResponse>(data.content)

  // --- Cache write (30-day TTL, global) ---
  cacheSet(subKey, null, subResult, 30 * 24)

  return subResult
}


export async function getExerciseGuide(exerciseName: string, language: string = 'nl'): Promise<ExerciseGuideResponse> {
  // --- Cache check (30-day TTL, global — guides are generic, shared across all users) ---
  const guideCacheKey = `guide-${exerciseName.toLowerCase().replace(/\s+/g, '_')}-${language}`
  const cached = await cacheGet(guideCacheKey, null)
  if (cached) {
    if (import.meta.env.DEV) console.log('[aiCache] Guide cache HIT:', guideCacheKey)
    return cached as ExerciseGuideResponse
  }
  if (import.meta.env.DEV) console.log('[aiCache] Guide cache MISS — calling API')
  // --- End cache check ---

  const isNl = language === 'nl'
  const prompt = isNl
    ? `Geef een beknopte uitvoeringshandleiding voor: "${exerciseName}"

Return ONLY this JSON (no markdown):
{
  "steps": ["stap 1 tekst", "stap 2 tekst", "stap 3 tekst", "stap 4 tekst"],
  "muscles": ["primaire spier", "secundaire spier"],
  "mistakes": ["fout 1", "fout 2"],
  "tip": "1 gouden tip voor optimale uitvoering"
}

Regels:
- Stappen: max 5, elke stap max 12 woorden, concreet en actionabel
- Spieren: max 4, Nederlandse namen
- Fouten: max 3, meest gemaakte fouten
- Tip: max 15 woorden, impactvol
- Alles in het Nederlands`
    : `Give a concise execution guide for: "${exerciseName}"

Return ONLY this JSON (no markdown):
{
  "steps": ["step 1 text", "step 2 text", "step 3 text", "step 4 text"],
  "muscles": ["primary muscle", "secondary muscle"],
  "mistakes": ["mistake 1", "mistake 2"],
  "tip": "1 golden tip for optimal execution"
}

Rules:
- Steps: max 5, each step max 12 words, concrete and actionable
- Muscles: max 4, English names
- Mistakes: max 3, most common mistakes
- Tip: max 15 words, impactful
- Everything in English`

  try {
    const authHeaders = await getAuthHeaders()
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      if (response.status === 401) throw new Error('SESSION_EXPIRED')
      throw new Error(`API error ${response.status}`)
    }
    const data = await response.json() as { error?: string; content: string }
    if (data.error) throw new Error(data.error)
    const result = extractJSON<ExerciseGuideResponse>(data.content)

    // --- Cache write (30-day TTL, global) ---
    cacheSet(guideCacheKey, null, result, 30 * 24)

    return result
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'SESSION_EXPIRED') throw err

    // Fallback: return a basic guide based on exercise name
    logWarn('ai.getExerciseGuide', 'API unavailable, returning basic guide')
    const fallbackGuide: ExerciseGuideResponse = {
      steps: isNl
        ? ['Neem de startpositie aan', 'Voer de beweging gecontroleerd uit', 'Houd spanning op de spier', 'Keer langzaam terug naar start']
        : ['Get into starting position', 'Perform the movement with control', 'Maintain tension on the muscle', 'Return slowly to start'],
      muscles: [],
      mistakes: isNl
        ? ['Te snel bewegen', 'Geen volledige range of motion']
        : ['Moving too fast', 'Not using full range of motion'],
      tip: isNl ? 'Focus op de spier die je traint, niet op het gewicht.' : 'Focus on the muscle you\'re training, not the weight.',
    }
    return fallbackGuide
  }
}
