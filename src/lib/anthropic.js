const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function generateScientificWorkout({ muscleStatus, recommendedSplit, recentHistory, preferences }) {
  if (!API_KEY) throw new Error('Anthropic API key not configured')

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

  const userMessage = `## Muscle Status
${muscleStatusText}

## Recommended Split: ${recommendedSplit}

## Last 3 Relevant Sessions
${historyText}

## User Preferences
- Energy level: ${preferences.energy || 'medium'}
- Available time: ${preferences.time || 60} minutes
- Training goal: ${preferences.goal || 'hypertrophy'}
- Training frequency: ${preferences.frequency || '4x per week'}

Generate an optimal ${recommendedSplit} workout. Return ONLY valid JSON:
{
  "split": "string",
  "reasoning": "string explaining programming logic, progressive overload decisions, and exercise selection rationale",
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
      "notes": "string with coaching cues",
      "vs_last_session": "string: up/same/down/new with brief explanation"
    }
  ],
  "estimated_duration_min": number,
  "volume_notes": "string summarizing total volume and muscle group breakdown"
}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 3000,
      system: `You are an elite hypertrophy and strength coach with deep knowledge of exercise science. Generate evidence-based workouts following these rules:

PROGRESSIVE OVERLOAD:
- If RPE was <8 last time: add 2.5kg to the weight
- If RPE was 8-9: keep the same weight
- If RPE was 9+: reduce weight by 5%
- For new exercises with no history: pick a conservative starting weight

EXERCISE SELECTION:
- Rotate exercises if the same movement was used in the last session (e.g. swap barbell row for dumbbell row)
- Start with heavy compounds, end with isolation
- Include proper warm-up progression in notes

REST PERIODS:
- Compounds: 120-180 seconds
- Isolation: 60-90 seconds
- Adjusted for energy level (low = longer rest, high = shorter)

Return ONLY valid JSON. No markdown, no code fences.`,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response. Please try again.')
  }
}
