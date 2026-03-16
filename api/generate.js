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
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt required' })
  }
  if (prompt.length > 50000) {
    return res.status(400).json({ error: 'prompt too long' })
  }

  try {
    // Use gemini-2.5-flash with thinking disabled for clean JSON output
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are an elite strength and hypertrophy coach AI.
OUTPUT RULES (STRICTLY ENFORCED):
- Return ONLY valid JSON. No markdown. No code fences. No explanations. No preamble.
- Start your response with { and end with }
- Do not include any text before or after the JSON object
COACHING RULES:
- Progressive overload: RPE <8 last time → add 2.5kg; RPE 8-9 → same weight; RPE 9+ → reduce 5%
- No history → estimate conservatively from athlete profile (NEVER 0kg)
- Compounds first, isolation last
- Vary exercises from last session`
            }]
          },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.3,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          }
        })
      }
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      return res.status(geminiRes.status).json({ error: `Gemini error: ${err}` })
    }

    const data = await geminiRes.json()

    // Extract text — handle both standard and thinking model responses
    // Gemini 2.5 Flash returns thinking in parts[0], actual output in a later part
    const parts = data.candidates?.[0]?.content?.parts || []
    // Find the last non-thought text part (actual output)
    let text = ''
    for (const part of parts) {
      if (!part.thought && part.text) {
        text = part.text
      }
    }
    if (!text && parts.length > 0) {
      text = parts[parts.length - 1]?.text || ''
    }

    // Strip any markdown fences just in case
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    res.status(200).json({ content: cleaned })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
