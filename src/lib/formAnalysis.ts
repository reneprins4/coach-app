import { supabase } from './supabase'
import type { Workout, FormInsight } from '../types'

const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 uur

interface ExerciseDataPoint {
  date: string
  weight: number | null
  reps: number | null
  rpe: number | null
  e1rm: number
}

export async function analyzeFormPatterns(workouts: Workout[]): Promise<FormInsight[]> {
  const exerciseData: Record<string, ExerciseDataPoint[]> = {}

  for (const workout of workouts) {
    for (const set of workout.workout_sets || []) {
      if (!exerciseData[set.exercise]) exerciseData[set.exercise] = []
      exerciseData[set.exercise]!.push({
        date: workout.created_at,
        weight: set.weight_kg,
        reps: set.reps,
        rpe: set.rpe,
        e1rm: set.reps === 1 ? (set.weight_kg ?? 0) : (set.weight_kg ?? 0) * (1 + (set.reps ?? 0) / 30)
      })
    }
  }

  // Filter oefeningen met minimaal 3 datapunten
  const filtered: Record<string, ExerciseDataPoint[]> = {}
  for (const [ex, data] of Object.entries(exerciseData)) {
    if (data.length >= 3) {
      filtered[ex] = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
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

    const data = await response.json() as { content?: string }
    const text = data.content || ''

    // Parse JSON from response
    const match = text.match(/\[[\s\S]*\]/)
    if (match) {
      return JSON.parse(match[0]) as FormInsight[]
    }

    return JSON.parse(text) as FormInsight[]
  } catch (err) {
    console.error('Form analysis error:', err)
    throw err
  }
}

// Cache in Supabase per gebruiker
export async function getCachedAnalysis(userId: string | null): Promise<FormInsight[] | null> {
  if (!userId) {
    // Fallback: localStorage voor niet-ingelogde gebruikers
    return getLocalCache()
  }

  try {
    const { data, error } = await supabase
      .from('form_analysis_cache')
      .select('insights, created_at')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null

    const age = Date.now() - new Date(data.created_at as string).getTime()
    if (age > CACHE_DURATION) return null

    return data.insights as FormInsight[]
  } catch {
    return getLocalCache()
  }
}

export async function setCachedAnalysis(userId: string | null, insights: FormInsight[]): Promise<void> {
  if (!userId) {
    setLocalCache(insights)
    return
  }

  try {
    await supabase
      .from('form_analysis_cache')
      .upsert({ user_id: userId, insights, created_at: new Date().toISOString() })
  } catch {
    setLocalCache(insights)
  }
}

export async function clearAnalysisCache(userId: string | null): Promise<void> {
  if (!userId) {
    localStorage.removeItem('ragnarok_form_analysis')
    return
  }

  try {
    await supabase
      .from('form_analysis_cache')
      .delete()
      .eq('user_id', userId)
  } catch {
    localStorage.removeItem('ragnarok_form_analysis')
  }
}

// localStorage fallback
function getLocalCache(): FormInsight[] | null {
  try {
    const cached = localStorage.getItem('ragnarok_form_analysis')
    if (!cached) return null
    const { timestamp, data } = JSON.parse(cached) as { timestamp: number; data: FormInsight[] }
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem('ragnarok_form_analysis')
      return null
    }
    return data
  } catch {
    return null
  }
}

function setLocalCache(data: FormInsight[]): void {
  try {
    localStorage.setItem('ragnarok_form_analysis', JSON.stringify({ timestamp: Date.now(), data }))
  } catch { /* ignore */ }
}
