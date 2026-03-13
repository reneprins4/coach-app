const PROXY_URL = 'http://91.99.173.179/coach/generate'

export async function generateScientificWorkout({ muscleStatus, recommendedSplit, recentHistory, preferences }) {
  const muscleStatusText = Object.entries(muscleStatus)
    .map(([muscle, ms]) => {
      return `${muscle}: ${ms.setsThisWeek} sets this week (target ${ms.target.min}-${ms.target.max}), ` +
        `last trained ${ms.daysSinceLastTrained ?? 'never'} days ago, ` +
        `avg RPE last session: ${ms.avgRpeLastSession ?? 'N/A'}, ` +
        `status: ${ms.status}, ` +
        `recent exercises: ${ms.recentExercises.join(', ') || 'none'}`
    })
    .join('\n')

  const historyText = recentHistory.length > 0
    ? recentHistory.map(session => {
        const date = new Date(session.date).toLocaleDateString()
        const sets = session.sets.map(s =>
          `  ${s.exercise}: ${s.weight_kg}kg x ${s.reps} ${s.rpe ? `@RPE${s.rpe}` : ''}`
        ).join('\n')
        return `${date}:\n${sets}`
      }).join('\n\n')
    : 'No recent history for this split.'

  const prompt = `You are an elite hypertrophy and strength coach. Generate an evidence-based workout.

PROGRESSIVE OVERLOAD RULES:
- RPE was <8 last time: add 2.5kg
- RPE was 8-9: keep same weight
- RPE was 9+: reduce 5%
- No history: pick conservative starting weight

EXERCISE RULES:
- Rotate if same movement used last session
- Compounds first, isolation last
- Adjust rest for energy level

## Muscle Status
${muscleStatusText}

## Recommended Split: ${recommendedSplit}

## Last 3 Relevant Sessions
${historyText}

## User Preferences
- Energy level: ${preferences.energy || 'medium'}
- Available time: ${preferences.time || 60} minutes
- Training goal: ${preferences.goal || 'hypertrophy'}
- Training frequency: ${preferences.frequency || '4x per week'}

Generate an optimal ${recommendedSplit} workout. Return ONLY valid JSON, no markdown, no code fences:
{
  "split": "string",
  "reasoning": "explain why this workout today, progressive overload decisions, exercise selection",
  "exercises": [
    {
      "name": "string",
      "muscle_group": "string",
      "sets": number,
      "reps_min": number,
      "reps_max": number,
      "weight_kg": number,
      "rpe_target": number,
      "rest_seconds": number,
      "notes": "coaching cue or progression note",
      "vs_last_session": "up/same/down/new with brief explanation"
    }
  ],
  "estimated_duration_min": number,
  "volume_notes": "total volume and muscle group breakdown"
}`

  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: prompt }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Proxy error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content || ''

  const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response. Please try again.')
  }
}
