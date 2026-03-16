# React Patterns, PWA & Mobile UX Audit

**Date:** 2026-03-16
**Auditor:** Spark (subagent)
**Scope:** React hooks, training-analysis.js edge cases, PWA/Service Worker, Mobile UX, Math/Algorithm review
**Model:** Claude Opus 4.5

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 6 |
| LOW | 3 |
| **Total** | **12** |

---

## HIGH

### BUG-001: useTemplates fetchTemplates has no cancelled flag
- **File:** `src/hooks/useTemplates.js` (lines ~11-28)
- **Severity:** HIGH
- **Type:** React / Hooks
- **Description:** The `fetchTemplates` async function in useEffect has no cancelled flag. All state updates (`setTemplates`, `setError`, `setLoading`) execute without checking if component is still mounted.
- **Impact:** React "Can't perform state update on unmounted component" warning. Memory leak on rapid navigation.
- **Fix:**
```javascript
const fetchTemplates = useCallback(async () => {
  if (!userId) {
    setTemplates([])
    setLoading(false)
    return
  }

  setLoading(true)
  setError(null)
  
  let cancelled = false
  try {
    const { data, error: err } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (err) throw err
    if (!cancelled) setTemplates(data || [])
  } catch (err) {
    if (!cancelled) setError(err.message)
  } finally {
    if (!cancelled) setLoading(false)
  }
  
  return () => { cancelled = true }
}, [userId])
```

Note: The fix above won't work because useCallback doesn't return cleanup. Better pattern:
```javascript
useEffect(() => {
  let cancelled = false
  
  async function fetch() {
    if (!userId) {
      setTemplates([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase...
      if (err) throw err
      if (!cancelled) setTemplates(data || [])
    } catch (err) {
      if (!cancelled) setError(err.message)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  
  fetch()
  return () => { cancelled = true }
}, [userId])
```

---

### BUG-002: AuthContext value creates new object every render
- **File:** `src/App.jsx` (line ~71)
- **Severity:** HIGH
- **Type:** React / Performance
- **Description:** `<AuthContext.Provider value={{ ...auth, settings, updateSettings, settingsLoaded }}>` creates a new object literal on every render. All components using `useAuthContext()` will re-render even when no values changed.
- **Impact:** Unnecessary re-renders throughout the app on every App.jsx render. Performance degradation, especially on lower-end mobile devices.
- **Fix:**
```javascript
// Memoize the context value
const authContextValue = useMemo(() => ({
  ...auth,
  settings,
  updateSettings,
  settingsLoaded,
}), [auth, settings, updateSettings, settingsLoaded])

return (
  <AuthContext.Provider value={authContextValue}>
    ...
  </AuthContext.Provider>
)

// Also ensure updateSettings is wrapped in useCallback:
const updateSettings = useCallback((newSettings) => {
  const merged = saveSettings(newSettings, auth.user?.id)
  setSettings(merged)
  return merged
}, [auth.user?.id])
```

---

### BUG-003: index.html missing viewport-fit=cover for iOS safe areas
- **File:** `index.html` (line ~6)
- **Severity:** HIGH
- **Type:** Mobile UX
- **Description:** The viewport meta tag is `width=device-width, initial-scale=1.0` but missing `viewport-fit=cover`. On iOS devices with notch/Dynamic Island, the app won't properly handle safe-area-insets.
- **Impact:** Bottom nav and fixed buttons may be hidden behind the iOS home indicator. Content may be cut off near the notch on landscape.
- **Fix:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

---

## MEDIUM

### BUG-004: index.html missing theme-color meta tag
- **File:** `index.html` (head section)
- **Severity:** MEDIUM
- **Type:** PWA / Mobile UX
- **Description:** While `manifest.json` (via vite-plugin-pwa) specifies `theme_color: '#030712'`, the HTML doesn't have a `<meta name="theme-color">` tag. Some browsers (especially Android Chrome) prefer the meta tag for status bar coloring.
- **Impact:** Status bar may show default color instead of app's dark theme during initial page load before manifest is processed.
- **Fix:**
```html
<meta name="theme-color" content="#030712" />
```

---

### BUG-005: Layout.jsx active workout banner missing pb-safe padding
- **File:** `src/components/Layout.jsx` (line ~30-37)
- **Severity:** MEDIUM
- **Type:** Mobile UX / iOS Safe Areas
- **Description:** The active workout banner at the top uses `fixed top-0` but the main content offset (`pt-12`) doesn't account for iOS safe areas at the top (notch area).
- **Impact:** On iPhones with notch, the banner may overlap with the status bar/notch area.
- **Fix:**
```jsx
// Add safe-area padding to the banner
<button
  onClick={() => navigate('/log')}
  className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-cyan-500 px-4 py-3 pt-safe active:bg-cyan-600"
>
```

And for the main content:
```jsx
<main className={`flex-1 pb-20 ${hasActiveWorkout && !isOnLogPage ? 'pt-[calc(3rem+env(safe-area-inset-top))]' : ''}`}>
```

---

### BUG-006: Logger.jsx session cache not isolated per user
- **File:** `src/pages/Logger.jsx` (lines ~163-180)
- **Severity:** MEDIUM
- **Type:** Security / Data Isolation
- **Description:** Session cache uses a single key `SESSION_CACHE_KEY = '__kravex_start_flow_cache__'` for all users. If user A logs out and user B logs in (same browser session), user B could see user A's cached generated workout.
- **Impact:** User data leakage between accounts, wrong workout shown to user.
- **Fix:**
```javascript
// Change the cache key to include userId
const SESSION_CACHE_PREFIX = '__kravex_start_flow_cache_'

function getSessionCacheKey(userId) {
  return `${SESSION_CACHE_PREFIX}${userId || 'anonymous'}__`
}

// Update all sessionStorage calls to use:
sessionStorage.setItem(getSessionCacheKey(user.id), JSON.stringify(cacheData))
sessionStorage.getItem(getSessionCacheKey(user.id))
sessionStorage.removeItem(getSessionCacheKey(user.id))
```

---

### BUG-007: plateauDetector uses hardcoded 'nl-NL' locale
- **File:** `src/lib/plateauDetector.js` (line ~65)
- **Severity:** MEDIUM
- **Type:** i18n / Date formatting
- **Description:** `formatWeekLabel` uses hardcoded `'nl-NL'` locale: `d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })`. English users see Dutch-formatted dates.
- **Impact:** Plateau detector shows Dutch date format regardless of user language setting.
- **Fix:**
```javascript
// Export a configurable version or accept locale parameter
function formatWeekLabel(weekKey, locale = 'en-GB') {
  const d = new Date(weekKey)
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

// Or better: pass locale from component that has i18n access
```

---

### BUG-008: plateauDetector recommendations are hardcoded Dutch
- **File:** `src/lib/plateauDetector.js` (lines ~69-92)
- **Severity:** MEDIUM
- **Type:** i18n Completeness
- **Description:** All `getPlateauRecommendation` strings are hardcoded Dutch: "Wissel naar incline...", "Voeg paused reps toe...", "Probeer front squats...", etc.
- **Impact:** English users see Dutch recommendations in plateau alerts.
- **Fix:** Return translation keys instead of strings, translate in component:
```javascript
function getPlateauRecommendation(exercise, isFullPlateau) {
  const lower = exercise.toLowerCase()
  if (/bench|press/.test(lower)) {
    return isFullPlateau ? 'plateau.bench_full' : 'plateau.bench_slow'
  }
  // ... etc
}
```

---

### BUG-009: PWA workbox config missing navigateFallback
- **File:** `vite.config.js` (workbox config, lines ~38-48)
- **Severity:** MEDIUM
- **Type:** PWA / Offline
- **Description:** The workbox configuration has `runtimeCaching` but no `navigateFallback`. When offline, direct navigation to routes like `/progress` or `/history/123` may show browser offline error instead of the cached app shell.
- **Impact:** Offline navigation to deep links fails with error page instead of loading cached app.
- **Fix:**
```javascript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
  navigateFallback: '/index.html',  // Add this
  navigateFallbackDenylist: [/^\/api\//],  // Exclude API routes
  runtimeCaching: [...]
}
```

---

## LOW

### BUG-010: training-analysis.js prototype pollution potential in goal validation
- **File:** `src/lib/training-analysis.js` (line ~167)
- **Severity:** LOW
- **Type:** Security / Edge Case
- **Description:** `const targets = SET_TARGETS_BY_GOAL[safeGoal]` — while `safeGoal` is validated against `validGoals` array, an attacker who bypasses validation could potentially pass `'__proto__'` or `'constructor'`. This is theoretical since the validation exists.
- **Impact:** Unlikely to be exploited due to validation, but defense in depth would be better.
- **Fix:** Already mitigated by the `validGoals.includes(goal)` check. No action needed, but consider:
```javascript
const targets = Object.hasOwn(SET_TARGETS_BY_GOAL, safeGoal) 
  ? SET_TARGETS_BY_GOAL[safeGoal] 
  : SET_TARGETS_BY_GOAL.hypertrophy
```

---

### BUG-011: Layout.jsx uses polling interval for active workout check
- **File:** `src/components/Layout.jsx` (lines ~19-26)
- **Severity:** LOW
- **Type:** Performance / Code Quality
- **Description:** The component polls localStorage every 2000ms to check for active workout status. This is wasteful and doesn't immediately reflect changes.
- **Impact:** Unnecessary CPU cycles, 2-second delay in showing/hiding active workout banner.
- **Fix:** Use a custom event or context instead of polling:
```javascript
// In useActiveWorkout.js, dispatch event when workout changes:
useEffect(() => {
  window.dispatchEvent(new Event('workout-changed'))
}, [workout])

// In Layout.jsx, listen for the event:
useEffect(() => {
  function check() {
    try {
      const raw = localStorage.getItem('coach-active-workout')
      setHasActiveWorkout(!!raw)
    } catch { setHasActiveWorkout(false) }
  }
  check()
  window.addEventListener('workout-changed', check)
  window.addEventListener('storage', check)  // Cross-tab support
  return () => {
    window.removeEventListener('workout-changed', check)
    window.removeEventListener('storage', check)
  }
}, [])
```

---

### BUG-012: prDetector getMuscleGroup has incomplete pattern matching
- **File:** `src/lib/prDetector.js` (lines ~89-97)
- **Severity:** LOW
- **Type:** App-Specific Logic
- **Description:** `getMuscleGroup` uses regex patterns that may misclassify some exercises:
- `/curl(?!.*(bicep|hammer|dumbbell))/` in legs pattern would match "curl" but exclude bicep/hammer/dumbbell curls — but "Preacher Curl" would still match legs
- `/press(?!.*bench)/` in shoulders would miss exercises like "Smith Machine Bench Press"
- **Impact:** Some PRs may be categorized under wrong muscle group in the PR display.
- **Fix:** Reorder patterns and make them more specific, or use the centralized `classifyExercise` from training-analysis.js instead of duplicating logic.

---

## Training-Analysis.js Edge Cases Review

### ✅ scoreSplits - All muscles fatigued scenario
**Test case:** All muscles have recoveryPct < 50%
**Result:** All splits receive negative penalties proportional to fatigue. This is correct behavior — it signals that no split is optimal and the user should consider a rest day.

### ✅ calcMuscleRecovery - RPE 1 edge case
**Test case:** RPE 1 (minimum possible)
**Result:** `clampedRPE = Math.max(1, Math.min(10, 1)) = 1`
`rpeMult = Math.max(0.5, 1 + (1 - 7) * 0.15) = Math.max(0.5, 0.1) = 0.5`
Recovery is calculated at 2x speed (0.5 multiplier). This is reasonable — very light work recovers faster.

### ✅ analyzeTraining - Empty/minimal history
**Test cases:**
1. Empty workouts array: Returns all muscles at 100% recovery, status 'needs_work'. ✅ No crash
2. 1 workout: Correctly analyzes single workout data. ✅ No crash
3. 100 workouts: Performance is O(workouts × sets), may be slow but no crashes. ✅

### ✅ Floating point edge cases
All Math operations have guards:
- `Number.isFinite()` checks for NaN/Infinity
- Division by zero protected with null checks
- `Math.max(0.5, ...)` floor prevents extreme values

---

## PWA / Service Worker Assessment

### ✅ Good
- `registerType: 'autoUpdate'` enables automatic SW updates
- Runtime caching for Supabase API with NetworkFirst strategy
- Proper cache expiration (24h for API, default for assets)

### ⚠️ Concerns
- No offline-first caching for the main app shell (only runtime caching)
- Missing `navigateFallback` (covered in BUG-009)
- No "new version available" banner/prompt for users

### Recommendation
Consider adding a SW update notification:
```javascript
// In main.jsx or App.jsx
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    // Show "Update available" toast
    if (confirm('New version available. Reload?')) {
      updateSW(true)
    }
  },
})
```

---

## Mobile UX Assessment

### ✅ Good
- Uses `min-h-dvh` instead of `h-screen` for dynamic viewport ✓
- Bottom nav has `pb-safe` for iOS home indicator ✓
- Active states used throughout (not hover) ✓
- Touch targets appear to be adequate (44px+ buttons) ✓

### ⚠️ Concerns
- Viewport meta missing `viewport-fit=cover` (BUG-003)
- Top safe area not handled for active workout banner (BUG-005)
- No explicit `touch-action: manipulation` on interactive elements (may have iOS tap delay)

### Recommendation
Add to global CSS:
```css
button, a, [role="button"] {
  touch-action: manipulation;
}
```

---

## Files Reviewed

### Hooks (7 files)
- [x] useActiveWorkout.js - ✓ (QuotaExceeded handling present)
- [x] useAuth.js - ✓
- [x] useWorkouts.js - ✓
- [x] useOfflineQueue.js - ✓ (isFlushingRef pattern present)
- [x] useRestTimer.js - ✓
- [x] useTemplates.js - ⚠️ BUG-001
- [x] useExercises.js - ✓

### App.jsx
- [x] Context provider - ⚠️ BUG-002

### Lib
- [x] training-analysis.js - ✓ (robust edge case handling)
- [x] prDetector.js - ⚠️ BUG-012 (minor)
- [x] plateauDetector.js - ⚠️ BUG-007, BUG-008 (i18n)

### PWA
- [x] vite.config.js - ⚠️ BUG-009
- [x] index.html - ⚠️ BUG-003, BUG-004

### Layout
- [x] Layout.jsx - ⚠️ BUG-005, BUG-011

### Logger
- [x] Logger.jsx (partial) - ⚠️ BUG-006

---

## Priority Fixes

### Immediate (before deploy)
1. **BUG-003** - viewport-fit=cover (1-line fix, big iOS impact)
2. **BUG-001** - useTemplates cancelled flag (prevents React warnings)

### Short-term (this week)
3. **BUG-002** - Memoize AuthContext value (performance)
4. **BUG-006** - Session cache user isolation (security)
5. **BUG-009** - navigateFallback for offline routing

### Medium-term
6. **BUG-004, BUG-005** - Safe area handling improvements
7. **BUG-007, BUG-008** - plateauDetector i18n
8. **BUG-011** - Replace polling with events
9. **BUG-012** - Consolidate muscle classification logic

---

*Report generated by coach-app-bug-hunter skill*
