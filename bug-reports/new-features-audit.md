# New Features Bug Audit — 2026-03-16

**Scope:** Duur-kiezer flow, time-gated generation, session cache, auth headers
**Files:** `src/pages/Logger.jsx`, `api/generate.js`, `src/lib/anthropic.js`
**Auditor:** Spark (subagent)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 3 |
| LOW | 2 |
| **Total** | **9** |

---

## CRITICAL

### BUG-001: Race condition — multiple parallel generations when user taps time chips quickly
- **File:** `src/pages/Logger.jsx` (regel ~285-300, `handleTimeChange`)
- **Severity:** CRITICAL
- **Type:** Async / Race Condition
- **Description:** `handleTimeChange` roept `generateForSplit` aan zonder te checken of er al een generatie bezig is. Er is geen `generating` guard of abort controller. Als de user snel achtereenvolgens op 30m → 45m → 60m klikt, lopen er 3 parallel API calls naar Gemini.
- **Impact:** 
  1. Verspilling van Gemini API quota (3x de kosten)
  2. Onvoorspelbaar welke response uiteindelijk in state komt (de snelste of de laatste?)
  3. Session cache kan corrupte state krijgen (mix van verschillende durations)
  4. UI toont "generating" maar stopt plotseling als een eerdere call eerder klaar is
- **Fix:**
```jsx
// In generateForSplit, aan het begin:
if (startFlowState.generating) return // Block if already generating

// Of beter: AbortController pattern
const abortControllerRef = useRef(null)

const generateForSplit = useCallback(async (splitName, overrideTime = null) => {
  // Abort previous request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort()
  }
  const controller = new AbortController()
  abortControllerRef.current = controller
  
  try {
    // ... existing code, pass controller.signal to fetch
  } catch (err) {
    if (err.name === 'AbortError') return // Silently ignore aborted requests
    // ... handle other errors
  }
}, [...deps])
```

---

## HIGH

### BUG-002: getAuthHeaders fails silently — user gets generic 401 error instead of "Please log in"
- **File:** `src/lib/anthropic.js` (regel ~4-15, `getAuthHeaders`)
- **Severity:** HIGH
- **Type:** UX / Error Handling
- **Description:** Als de Supabase session expired is of niet beschikbaar, returned `getAuthHeaders` alleen `Content-Type` zonder Authorization header. De API call faalt dan met 401, maar de error message is `"API error 401: ..."` in plaats van een duidelijke "Sessie verlopen, log opnieuw in".
- **Impact:** User ziet cryptische foutmelding en weet niet dat ze moeten inloggen. Ze proberen opnieuw, krijgen dezelfde fout, en geven op.
- **Fix:**
```js
async function getAuthHeaders() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    }
  } catch {}
  // Throw expliciet als er geen auth is
  throw new Error('SESSION_EXPIRED')
}

// In generateScientificWorkout etc:
try {
  const authHeaders = await getAuthHeaders()
  // ...
} catch (err) {
  if (err.message === 'SESSION_EXPIRED') {
    throw new Error('Je sessie is verlopen. Log opnieuw in.')
  }
  throw err
}
```

---

### BUG-003: Session cache useEffect race condition with analysis useEffect
- **File:** `src/pages/Logger.jsx` (regel ~95-106 vs ~113-180)
- **Severity:** HIGH
- **Type:** React / Async / Race Condition
- **Description:** Twee useEffects hebben dezelfde dependency `[user?.id]`:
  1. Cache load effect (regel ~95) — laadt cached `availableTime` uit sessionStorage
  2. Analyse effect (regel ~113) — checkt `availableTimeRef.current` om te beslissen of er gegenereerd moet worden
  
  React garandeert NIET de volgorde waarin deze effects draaien. Als de analyse effect eerst draait, is `availableTimeRef.current` nog `null` (initial state), terwijl de cache wellicht `availableTime: 60` bevat. De analyse stopt dan onterecht bij "geen tijd geselecteerd".
- **Impact:** Na terugkeren naar Logger-tab met een cached sessie, wordt de workout niet automatisch hersteld. User moet opnieuw tijd selecteren.
- **Fix:**
```jsx
// Combineer beide effecten in één:
useEffect(() => {
  if (aw.isActive || !user?.id) return
  
  let cancelled = false
  
  async function init() {
    // 1. Eerst cache laden
    let cachedState = null
    try {
      const cacheKey = getSessionCacheKey(user.id)
      const raw = sessionStorage.getItem(cacheKey)
      if (raw) {
        const cached = JSON.parse(raw)
        if (cached.generatedWorkout && cached.cachedAt && cached.userId === user.id && Date.now() - cached.cachedAt < 30 * 60 * 1000) {
          cachedState = cached
          setStartFlowState({ ...cached, loading: false, generating: false, showSplitPicker: false })
          return // Cached workout is valid, don't re-analyze
        }
      }
    } catch {}
    
    if (cancelled) return
    
    // 2. Geen valid cache → analyze and generate
    await analyzeAndGenerate()
  }
  
  init()
  return () => { cancelled = true }
}, [user?.id, aw.isActive])
```

---

### BUG-004: No rate limiting on /api/generate endpoint
- **File:** `api/generate.js` (entire file)
- **Severity:** HIGH
- **Type:** API Security
- **Description:** Er is geen rate limiting. Een authenticated user kan unlimited Gemini API calls maken. Een kwaadwillende gebruiker of bot kan de API kosten explosief laten stijgen.
- **Impact:** 
  1. Gemini API quota/budget kan binnen minuten uitgeput zijn
  2. Legitieme gebruikers worden geblokkeerd
  3. Financiële schade door hoge API kosten
- **Fix:**
```js
// Voeg een simple in-memory rate limiter toe, of gebruik Vercel Edge Config / Upstash Redis

const rateLimitMap = new Map() // userId -> { count, resetAt }
const RATE_LIMIT = 20 // calls
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour

function checkRateLimit(userId) {
  const now = Date.now()
  const entry = rateLimitMap.get(userId) || { count: 0, resetAt: now + RATE_WINDOW }
  
  if (now > entry.resetAt) {
    entry.count = 0
    entry.resetAt = now + RATE_WINDOW
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false
  }
  
  entry.count++
  rateLimitMap.set(userId, entry)
  return true
}

// Na auth check:
if (!checkRateLimit(user.id)) {
  return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' })
}
```

---

## MEDIUM

### BUG-005: Session cache not cleared when user logs out
- **File:** `src/pages/Logger.jsx` (session cache handling)
- **Severity:** MEDIUM
- **Type:** Data Isolation / Privacy
- **Description:** De session cache (`sessionStorage`) wordt alleen gecleared bij:
  - Workout start (`handleStartAIWorkout`)
  - Time change (`handleTimeChange`)
  
  Als de user uitlogt en een andere user inlogt (shared device), kan de oude cache nog kort zichtbaar zijn voordat de userId check in de useEffect het afvangt.
- **Impact:** Potentieel ziet nieuwe user even de workout van de vorige user (split naam, exercise count). Geen sensitive data, maar slechte UX.
- **Fix:**
```js
// In App.jsx of een auth listener:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear all session caches
    for (let key of Object.keys(sessionStorage)) {
      if (key.startsWith('__kravex_start_flow_cache_')) {
        sessionStorage.removeItem(key)
      }
    }
  }
})
```

---

### BUG-006: Locale hardcoded for date formatting
- **File:** `src/pages/Logger.jsx` (regel ~377)
- **Severity:** MEDIUM
- **Type:** i18n
- **Description:** 
```js
const dateStr = today.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB', ...)
```
Dit is een ternary die alleen NL en EN ondersteunt. Als je later DE, FR, of andere talen toevoegt, vallen die terug op EN-GB.
- **Impact:** Datum-formatting klopt niet voor toekomstige talen.
- **Fix:**
```js
// Dynamisch op basis van i18n.language:
const localeMap = { nl: 'nl-NL', en: 'en-GB', de: 'de-DE', fr: 'fr-FR' }
const locale = localeMap[i18n.language] || i18n.language
const dateStr = today.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
```

---

### BUG-007: Console.error logs raw AI response in production
- **File:** `src/lib/anthropic.js` (regel ~23)
- **Severity:** MEDIUM
- **Type:** Logging / Security
- **Description:** 
```js
console.error('Raw AI response that failed to parse:', raw.slice(0, 500))
```
In productie worden AI responses (die user-specifieke workout data bevatten) naar de browser console gelogd als parsing faalt.
- **Impact:** 
  1. Potentieel sensitive training data in console
  2. Onprofessioneel in productie builds
- **Fix:**
```js
if (import.meta.env.DEV) {
  console.error('Raw AI response that failed to parse:', raw.slice(0, 500))
}
```

---

## LOW

### BUG-008: ExerciseBlock loads history without checking userId
- **File:** `src/pages/Logger.jsx` (regel ~728-745, ExerciseBlock useEffect)
- **Severity:** LOW
- **Type:** Defensive Coding
- **Description:** 
```js
useEffect(() => {
  let cancelled = false
  if (userId && exercise.name) {
    getExerciseHistory(exercise.name, userId).then(data => {
      // ...
    })
  }
  return () => { cancelled = true }
}, [exercise.name, userId])
```
De check `if (userId && ...)` is goed, maar er is geen `.catch()` op de Promise. Als `getExerciseHistory` faalt (network error, RLS issue), crashed de app niet maar de error is silently swallowed.
- **Impact:** User krijgt geen feedback als history laden faalt. Geen crasher.
- **Fix:**
```js
getExerciseHistory(exercise.name, userId)
  .then(data => { /* existing code */ })
  .catch(err => console.warn('Failed to load exercise history:', err))
```

---

### BUG-009: cacheSet called without try/catch for localStorage quota
- **File:** `src/lib/anthropic.js` (regel ~140, ~200, ~238)
- **Severity:** LOW
- **Type:** Error Handling
- **Description:** `cacheSet(...)` calls zijn niet wrapped in try/catch. Als localStorage quota vol is (5MB limit), throwt `localStorage.setItem` een `QuotaExceededError`.
- **Impact:** Workout generation succeeds maar cache write fails silently. Next time user returns, cache miss triggers new API call. Minor performance/cost impact.
- **Fix:**
```js
// In aiCache.js, wrap the setItem:
export function cacheSet(key, userId, data, ttlHours) {
  try {
    localStorage.setItem(/* ... */)
  } catch (e) {
    console.warn('Cache write failed (quota?):', e)
    // Optionally: clear old cache entries to make room
  }
}
```

---

## Not a Bug (Verified Correct)

✅ **`SUPABASE_SERVICE_ROLE_KEY` missing** — Already handled with graceful 500 error in `api/generate.js` line 42-45

✅ **`overrideTime` parameter** — Correctly passed through `timeToUse` → `preferences.time` → API call

✅ **Prompt injection protection** — User content wrapped in `<user_workout_request>` delimiters with explicit instruction to ignore overrides

✅ **CORS handling** — Explicit allowlist with Vercel preview URL pattern support

---

## Recommendations

1. **Prioriteit 1:** Fix BUG-001 (race condition) — dit veroorzaakt onnodige API kosten en slechte UX
2. **Prioriteit 2:** Fix BUG-004 (rate limiting) — security risk die financiële impact kan hebben
3. **Prioriteit 3:** Fix BUG-002 (auth error messaging) — grote UX verbetering voor edge case

---

*Generated by Spark bug hunter subagent — 2026-03-16 11:02 CET*
