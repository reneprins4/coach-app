const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export async function generateWorkout(history, preferences) {
  if (!API_KEY) throw new Error('Anthropic API key not configured')

  const historyText = history.length > 0
    ? history.map(w => {
        const date = new Date(w.created_at).toLocaleDateString()
        const setsText = (w.workout_sets || []).map(s =>
          `  ${s.exercise}: ${s.weight_kg}kg x ${s.reps} ${s.rpe ? `@RPE${s.rpe}` : ''}`
        ).join('\n')
        return `${date}:\n${setsText || '  (no sets recorded)'}`
      }).join('\n\n')
    : 'No workout history available yet.'

  const userMessage = `## Training History (last 30 days)
${historyText}

## Preferences
- Focus: ${preferences.focus || 'full body'}
- Available time: ${preferences.time || 60} minutes
- Energy level: ${preferences.energy || 'medium'}
- Training goal: ${preferences.goal || 'hypertrophy'}
- Training frequency: ${preferences.frequency || '4x per week'}

Generate an optimal workout for today. Return valid JSON only with this structure:
{
  "exercises": [{"name": "string", "sets": number, "reps_target": "string like 8-10", "weight_kg": number, "notes": "string"}],
  "reasoning": "string explaining the programming logic",
  "focus": "string describing workout focus",
  "estimated_duration": "string like 45 min"
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
      max_tokens: 2048,
      system: 'You are an expert strength coach specializing in hypertrophy and strength training. Analyze the training history and generate an optimal workout. Be specific about weights based on the person\'s history, apply progressive overload principles. Output valid JSON only — no markdown, no code fences, just the JSON object.',
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  // Parse JSON, handling potential markdown wrapping
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    throw new Error('Failed to parse AI response. Please try again.')
  }
}
