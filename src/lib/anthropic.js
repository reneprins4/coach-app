import { supabase } from './supabase'
import { workoutCacheKey, substituteCacheKey, cacheGet, cacheSet } from './aiCache'
import { getExerciseSubstituteLocal } from './exerciseSubstitutes'

// Robust JSON extractor — handles markdown fences and surrounding text
function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('Empty response from AI')
  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Direct parse first
  try { return JSON.parse(text) } catch {}
  // Find outermost { ... }
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) } catch {}
  }
  // Give up
  console.error('Raw AI response that failed to parse:', raw.slice(0, 500))
  throw new Error('Failed to parse AI response. Please try again.')
}

export async function generateScientificWorkout({ muscleStatus, recommendedSplit, recentHistory, preferences, userId = null }) {
  // --- Cache check ---
  const cacheKey = workoutCacheKey({ split: recommendedSplit, muscleStatus, preferences })
  const cached = await cacheGet(cacheKey, userId)
  if (cached) {
    console.log('[aiCache] Workout cache HIT:', cacheKey)
    return cached
  }
  console.log('[aiCache] Workout cache MISS — calling Gemini')
  // --- End cache check ---

  const muscleStatusText = Object.entries(muscleStatus)
    .map(([muscle, ms]) =>
      `${muscle}: ${ms.setsThisWeek} sets this week (target ${ms.target.min}-${ms.target.max}), ` +
      `last trained ${ms.daysSinceLastTrained ?? 'never'} days ago, ` +
      `avg RPE: ${ms.avgRpeLastSession ?? 'N/A'}, status: ${ms.status}, ` +
      `recent: ${ms.recentExercises.join(', ') || 'none'}`
    ).join('\n')

  const historyText = recentHistory.length > 0
    ? recentHistory.map(s => {
        const date = new Date(s.date).toLocaleDateString()
        const sets = s.sets.map(x => `  ${x.exercise}: ${x.weight_kg}kg x ${x.reps}${x.rpe ? ` @RPE${x.rpe}` : ''}`).join('\n')
        return `${date}:\n${sets}`
      }).join('\n\n')
    : 'No recent history for this split.'

  // Build athlete profile section
  const bw = preferences.bodyweight ? `${preferences.bodyweight}kg` : 'unknown'
  const level = preferences.experienceLevel || 'intermediate'
  const equipment = preferences.equipment || 'full_gym'
  const knowns = []
  if (preferences.benchMax) knowns.push(`bench 1RM ~${preferences.benchMax}kg`)
  if (preferences.squatMax) knowns.push(`squat 1RM ~${preferences.squatMax}kg`)
  if (preferences.deadliftMax) knowns.push(`deadlift 1RM ~${preferences.deadliftMax}kg`)

  // Weight estimation rules based on experience and bodyweight
  const weightGuidance = preferences.bodyweight
    ? `WEIGHT ESTIMATION (when no history):
- Bodyweight: ${bw}, Level: ${level}
- Beginner bench ~0.5x BW, squat ~0.75x BW, deadlift ~1x BW
- Intermediate bench ~0.8x BW, squat ~1.2x BW, deadlift ~1.5x BW  
- Advanced bench ~1.2x BW, squat ~1.5x BW, deadlift ~2x BW
- Isolation exercises: scale proportionally (e.g. curls ~20-30% bench)
- NEVER suggest 0kg. Always estimate based on the above.
${knowns.length > 0 ? `Known maxes: ${knowns.join(', ')}` : ''}`
    : 'WEIGHT ESTIMATION: User has not set bodyweight. Ask them to fill in their profile, but still estimate conservatively based on intermediate standards (bench ~60kg, squat ~80kg, deadlift ~100kg). NEVER suggest 0kg.'

  const focusNote = preferences.focusedMuscles?.length > 0
    ? `\nFOCUS MUSCLES (add extra sets/exercises): ${preferences.focusedMuscles.join(', ')}`
    : ''

  // Priority muscles (Feature 3) - add 1-2 extra sets
  const priorityNote = preferences.priorityMuscles?.length > 0
    ? `\nPRIORITY MUSCLES (add 1-2 extra sets): ${preferences.priorityMuscles.join(', ')}`
    : ''

  // Main lift focus (Feature 2)
  const mainLiftNote = preferences.mainLift && preferences.mainLiftGoalKg
    ? `\nMAIN LIFT FOCUS: ${preferences.mainLift.toUpperCase()} - Target PR: ${preferences.mainLiftGoalKg}kg. Prioritize this lift with optimal placement and intensity.`
    : ''

  // Training goal and phase (Feature 1)
  const trainingGoalNote = preferences.trainingGoal
    ? `\nTRAINING GOAL: ${preferences.trainingGoal}${preferences.trainingPhase ? ` (Phase: ${preferences.trainingPhase})` : ''}`
    : ''
  
  // Rep range adjustments based on training goal
  const goalRepRanges = {
    strength: { min: 1, max: 5, note: 'Low reps, high weight, focus on compound lifts' },
    hypertrophy: { min: 8, max: 12, note: 'Moderate weight, higher volume' },
    powerbuilding: { min: 4, max: 8, note: 'Mix of strength and hypertrophy ranges' },
    conditioning: { min: 12, max: 20, note: 'Lighter weight, higher reps, shorter rest' },
  }
  const goalReps = goalRepRanges[preferences.trainingGoal] || goalRepRanges.hypertrophy
  const goalRepNote = preferences.trainingGoal 
    ? `\nGOAL-BASED REP RANGE: ${goalReps.min}-${goalReps.max} reps — ${goalReps.note}`
    : ''

  const periodizationNote = preferences.trainingPhase
    ? `\n## Training Block\n- Phase: ${preferences.trainingPhase} (Week ${preferences.blockWeek}/${preferences.blockTotalWeeks})\n- ${preferences.isDeload ? 'DELOAD WEEK: Reduce volume 40-50%, keep same weight, RPE max 6. No grinding.' : `Target RPE: ${preferences.targetRPE} | Rep range: ${preferences.targetRepRange?.[0]}-${preferences.targetRepRange?.[1]} reps`}\n- Volume note: ${preferences.weekTargetNote || 'standard'}`
    : ''

  // Gender-specific training guidance
  const genderNote = preferences.gender
    ? `\nATHLETE GENDER: ${preferences.gender}. Adjust rep ranges and recovery accordingly:
- Women generally recover faster between sets but may need different volume approaches
- For strength goals: men typically respond better to higher intensity, women to higher frequency
- For hypertrophy: women generally benefit from slightly higher rep ranges (12-20) vs men (8-15)
- Consider hormonal factors affecting recovery and strength output`
    : ''

  const prompt = `## Athlete Profile
- Name: ${preferences.name || 'athlete'}
- Gender: ${preferences.gender || 'not specified'}
- Bodyweight: ${bw}
- Experience: ${level}
- Goal: ${preferences.goal || 'hypertrophy'}
- Equipment: ${equipment}
- Training frequency: ${preferences.frequency || '4x'}/week
- Energy today: ${preferences.energy || 'medium'}
- Available time: ${preferences.time || 60} min
${focusNote}${priorityNote}${mainLiftNote}${trainingGoalNote}${goalRepNote}${genderNote}
${periodizationNote}

${weightGuidance}

## Muscle Recovery Status
${muscleStatusText}

## Recommended Split: ${recommendedSplit}

## Recent Training History
${historyText}

VOLUME RULES (strict):
- Include AT LEAST 2 exercises per muscle group in the split
- For a ${preferences.time || 60}-minute session, target 6-8 exercises total
- If energy=high and time>=75: aim for 8-10 exercises
- Each compound exercise gets 3-5 sets; each isolation gets 3-4 sets
- For focused muscles: add 1-2 extra exercises or sets vs normal
${preferences.isDeload ? '- DELOAD: 2-3 sets max per exercise, RPE never above 6' : preferences.trainingPhase ? `- This is ${preferences.trainingPhase} Week ${preferences.blockWeek}: strictly follow the target RPE ${preferences.targetRPE} — do not go heavier even if the athlete feels good` : ''}

EXERCISE VARIETY (important):
- Check the recent training history above. Do NOT repeat the exact same exercise selection as the most recent session for this split.
- Swap at least 1-2 exercises for alternatives that hit the same muscle group differently (e.g. if last session had Barbell Row → use Cable Row or Dumbbell Row today).
- Rotate between compound variations to prevent adaptation (e.g. alternate Squat / Front Squat / Hack Squat across sessions).

PROGRESSIVE OVERLOAD:
- RPE <8 last time → add 2.5-5kg
- RPE 8-9 → same weight
- RPE 9+ → reduce 5%
- New exercise → estimate from profile (NEVER use 0kg)

Return ONLY valid JSON (no markdown, no code fences, no comments):
{
  "split": "string",
  "reasoning": "2-3 sentences: why this split, volume decisions, overload choices",
  "exercises": [
    {
      "name": "string",
      "muscle_group": "string (one of: chest/back/shoulders/quads/hamstrings/glutes/biceps/triceps/core)",
      "sets": number,
      "reps_min": number,
      "reps_max": number,
      "weight_kg": number,
      "rpe_target": number,
      "rest_seconds": number,
      "notes": "specific coaching cue",
      "vs_last_session": "up/same/down/new - brief explanation"
    }
  ],
  "estimated_duration_min": number,
  "volume_notes": "total sets/muscle this week after this workout"
}`

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error)

  const result = extractJSON(data.content)

  // Post-process: fix any 0kg weights using bodyweight estimates
  const bwKg = parseFloat(preferences.bodyweight) || 80
  const levelMult = preferences.experienceLevel === 'beginner' ? 0.5 : preferences.experienceLevel === 'advanced' ? 1.2 : 0.8
  const fallbacks = {
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

  // --- Cache write (2h TTL) ---
  cacheSet(cacheKey, userId, result, 2)

  return result
}


export async function getExerciseSubstitute({ exercise, reason, equipment, experienceLevel, bodyweight }) {
  // --- Static lookup first (zero API cost) ---
  try {
    const local = getExerciseSubstituteLocal({ exercise, reason, equipment, experienceLevel, bodyweight })
    if (local && local.name !== exercise.name) {
      console.log('[exerciseSubstitutes] Static HIT for:', exercise.name)
      return local
    }
  } catch (e) {
    console.warn('[exerciseSubstitutes] Static lookup failed:', e.message)
  }
  // --- Fallback: LLM (for unknown exercises) ---
  console.log('[exerciseSubstitutes] LLM fallback for:', exercise.name)

  // --- Cache check (global, 30-day TTL) ---
  const subKey = substituteCacheKey({ exercise, reason, equipment })
  const cachedSub = await cacheGet(subKey, null)  // null = global cache
  if (cachedSub) {
    console.log('[aiCache] Substitute cache HIT:', subKey)
    return cachedSub
  }
  console.log('[aiCache] Substitute cache MISS — calling Gemini')
  // --- End cache check ---

  const prompt = `Suggest ONE substitute exercise for: "${exercise.name}" (targets: ${exercise.muscle_group || 'same muscle group'})

Reason for substitution: ${reason}
Equipment available: ${equipment || 'full_gym'}
Athlete level: ${experienceLevel || 'intermediate'}
Bodyweight: ${bodyweight ? bodyweight + 'kg' : 'unknown'}

Rules:
- Must train the SAME primary muscle group (${exercise.muscle_group})
- Must be practical with the available equipment
- If reason is "machine busy" → suggest free-weight or cable alternative
- If reason is "no equipment" → suggest bodyweight or dumbbell alternative
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

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  if (data.error) throw new Error(data.error)

  const subResult = extractJSON(data.content)

  // --- Cache write (30-day TTL, global) ---
  cacheSet(subKey, null, subResult, 30 * 24)

  return subResult
}


export async function getExerciseGuide(exerciseName) {
  const prompt = `Geef een beknopte uitvoeringshandleiding voor: "${exerciseName}"

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

  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!response.ok) throw new Error(`API error ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(data.error)
  return extractJSON(data.content)
}
