export async function analyzeFormPatterns(workouts) {
  const exerciseData = {}

  for (const workout of workouts) {
    for (const set of workout.workout_sets || []) {
      if (!exerciseData[set.exercise]) exerciseData[set.exercise] = []
      exerciseData[set.exercise].push({
        date: workout.created_at,
        weight: set.weight_kg,
        reps: set.reps,
        rpe: set.rpe,
        e1rm: set.reps === 1 ? set.weight_kg : set.weight_kg * (1 + set.reps / 30)
      })
    }
  }

  // Filter oefeningen met minimaal 3 datapunten
  const filtered = {}
  for (const [ex, data] of Object.entries(exerciseData)) {
    if (data.length >= 3) {
      filtered[ex] = data.sort((a, b) => new Date(a.date) - new Date(b.date))
    }
  }

  if (Object.keys(filtered).length === 0) {
    return []
  }

  const prompt = `Je bent een expert personal trainer. Analyseer deze trainingsdata en geef 3-5 concrete inzichten.

Data per oefening (gesorteerd op datum):
${JSON.stringify(filtered, null, 2)}

Focus op:
1. RPE-drift: als RPE stijgt maar gewicht gelijk blijft = techniek breakdown of overtraining
2. e1RM stagnatie: progressie vertraagt of stokt
3. Imbalances: agonist vs antagonist progressie-verschil
4. Consistentie: hoge reps-variance bij zelfde gewicht = techniek issues

Geef inzichten in het Nederlands. Wees specifiek met oefening namen en getallen.
Formaat: JSON array met objecten: { "exercise": string, "insight": string, "severity": "low"|"medium"|"high", "recommendation": string }
Max 5 inzichten, meest impactvol eerst.`

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })

    if (!response.ok) {
      throw new Error('API request failed')
    }

    const data = await response.json()
    const text = data.content || ''

    // Parse JSON from response
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0])
    }

    // Fallback: probeer hele response als JSON
    return JSON.parse(text)
  } catch (err) {
    console.error('Form analysis error:', err)
    return []
  }
}

// Cache helpers
const CACHE_KEY = 'ragnarok_form_analysis'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 uur

export function getCachedAnalysis() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const { timestamp, data } = JSON.parse(cached)
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return data
  } catch {
    return null
  }
}

export function setCachedAnalysis(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }))
  } catch {
    // localStorage full of niet beschikbaar
  }
}

export function clearAnalysisCache() {
  localStorage.removeItem(CACHE_KEY)
}
