export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  const { prompt } = req.body || {}
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' })
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are an elite hypertrophy and strength coach. Generate evidence-based workouts.
PROGRESSIVE OVERLOAD: RPE <8 → add 2.5kg. RPE 8-9 → same weight. RPE 9+ → reduce 5%. No history → conservative start.
EXERCISE RULES: Rotate if same movement used last session. Compounds first, isolation last.
CRITICAL: Return ONLY valid JSON. No markdown. No code fences. No extra text.`
            }]
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.3 }
        })
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      return res.status(geminiRes.status).json({ error: `Gemini error: ${err}` })
    }

    const data = await geminiRes.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim()

    res.status(200).json({ content: cleaned })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
