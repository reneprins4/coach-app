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

  const prompt = `## Muscle Status
${muscleStatusText}

## Recommended Split: ${recommendedSplit}

## Last 3 Relevant Sessions
${historyText}

## User Preferences
- Energy: ${preferences.energy || 'medium'}
- Available time: ${preferences.time || 60} min
- Goal: ${preferences.goal || 'hypertrophy'}
- Frequency: ${preferences.frequency || '4x/week'}

Generate an optimal ${recommendedSplit} workout. Return ONLY this JSON (no markdown):
{
  "split": "string",
  "reasoning": "why this workout today, progressive overload decisions, exercise selection",
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
      "notes": "coaching cue",
      "vs_last_session": "up/same/down/new with brief explanation"
    }
  ],
  "estimated_duration_min": number,
  "volume_notes": "volume summary"
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

  try {
    return JSON.parse(data.content)
  } catch {
    throw new Error('Failed to parse AI response. Please try again.')
  }
}
