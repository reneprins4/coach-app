const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export async function generateScientificWorkout({ muscleStatus, recommendedSplit, recentHistory, preferences }) {
  if (!GEMINI_KEY) throw new Error('Gemini API key not configured')

  const muscleStatusText = Object.entries(muscleStatus)
    .map(([muscle, ms]) =>
      `${muscle}: ${ms.setsThisWeek} sets this week (target ${ms.target.min}-${ms.target.max}), ` +
      `last trained ${ms.daysSinceLastTrained ?? 'never'} days ago, ` +
      `avg RPE last session: ${ms.avgRpeLastSession ?? 'N/A'}, ` +
      `status: ${ms.status}, ` +
      `recent exercises: ${ms.recentExercises.join(', ') || 'none'}`
    ).join('\n')

  const historyText = recentHistory.length > 0
    ? recentHistory.map(session => {
        const date = new Date(session.date).toLocaleDateString()
        const sets = session.sets.map(s =>
          `  ${s.exercise}: ${s.weight_kg}kg x ${s.reps}${s.rpe ? ` @RPE${s.rpe}` : ''}`
        ).join('\n')
        return `${date}:\n${sets}`
      }).join('\n\n')
    : 'No recent history for this split.'

  const systemPrompt = `You are an elite hypertrophy and strength coach. Generate evidence-based workouts.

PROGRESSIVE OVERLOAD RULES:
- RPE <8 last time: add 2.5kg to weight
- RPE 8-9: keep same weight  
- RPE 9+: reduce weight by 5%
- No history: pick a conservative starting weight

EXERCISE RULES:
- Rotate exercises if the same movement was used in the last session
- Start with heavy compounds, end with isolation
- Adjust rest times for energy level (low = longer rest)

CRITICAL: Return ONLY valid JSON. No markdown. No code fences. No extra text.`

  const userPrompt = `## Muscle Status
${muscleStatusText}

## Recommended Split: ${recommendedSplit}

## Last 3 Relevant Sessions
${historyText}

## User Preferences
- Energy level: ${preferences.energy || 'medium'}
- Available time: ${preferences.time || 60} minutes
- Training goal: ${preferences.goal || 'hypertrophy'}
- Training frequency: ${preferences.frequency || '4x per week'}

Generate an optimal ${recommendedSplit} workout. Return ONLY this JSON structure:
{
  "split": "string",
  "reasoning": "explain why this workout today, progressive overload decisions, and exercise selection",
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

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.3,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response. Please try again.')
  }
}
