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

export async function generateScientificWorkout({ muscleStatus, recommendedSplit, recentHistory, preferences }) {
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

  const periodizationNote = preferences.trainingPhase
    ? `\n## Training Block\n- Phase: ${preferences.trainingPhase} (Week ${preferences.blockWeek}/${preferences.blockTotalWeeks})\n- ${preferences.isDeload ? 'DELOAD WEEK: Reduce volume 40-50%, keep same weight, RPE max 6. No grinding.' : `Target RPE: ${preferences.targetRPE} | Rep range: ${preferences.targetRepRange?.[0]}-${preferences.targetRepRange?.[1]} reps`}\n- Volume note: ${preferences.weekTargetNote || 'standard'}`
    : ''

  const prompt = `## Athlete Profile
- Name: ${preferences.name || 'athlete'}
- Bodyweight: ${bw}
- Experience: ${level}
- Goal: ${preferences.goal || 'hypertrophy'}
- Equipment: ${equipment}
- Training frequency: ${preferences.frequency || '4x'}/week
- Energy today: ${preferences.energy || 'medium'}
- Available time: ${preferences.time || 60} min
${focusNote}
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

  return result
}


export async function getExerciseSubstitute({ exercise, reason, equipment, experienceLevel, bodyweight }) {
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

  return extractJSON(data.content)
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
