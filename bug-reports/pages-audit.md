# Pages Audit Bug Report

**Auditor:** Spark (subagent)  
**Date:** 2026-03-16  
**Scope:** `src/pages/` — Dashboard, Logger, AICoach, Plan, History, WorkoutDetail, Calendar  
**Methodology:** Full file read + checklist from coach-app-bug-hunter skill

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 5 |
| MEDIUM | 8 |
| LOW | 4 |
| **Total** | **18** |

---

## CRITICAL Bugs

### BUG-001: AICoach useEffect missing cancelled guard for multiple setState calls
- **File:** `src/pages/AICoach.jsx` (lines ~62-89)
- **Severity:** CRITICAL
- **Type:** React Hooks / State after unmount
- **Description:** The `useEffect` in AICoach that runs `analyze()` has multiple `setState` calls after async operations (`fetchRecentHistory`, `scoreSplits`) but only the final operations are guarded. If the component unmounts during analysis, `setWorkoutHistory(history)`, `setMuscleStatus(analysis)`, `setSplitScores(scores)`, and `setLastWorkoutInfo(lwInfo)` will all fire after unmount.
- **Impact:** React memory leak warning in console, potential crash in strict mode, stale state issues.
- **Fix:**
```javascript
// Add cancelled checks after each await:
if (cancelled) return
setWorkoutHistory(history)
if (cancelled) return
const analysis = analyzeTraining(history, settings.goal || 'hypertrophy')
setMuscleStatus(analysis)
// ... etc for all setState calls
```

---

## HIGH Bugs

### BUG-002: Plan.jsx useEffect missing cancelled guard
- **File:** `src/pages/Plan.jsx` (line ~42)
- **Severity:** HIGH
- **Type:** React Hooks / State after unmount
- **Description:** `useEffect` calls `loadBlock(user?.id).then(b => setBlock(b))` without a cancelled flag. If user navigates away before promise resolves, state update fires on unmounted component.
- **Impact:** React memory leak warning, potential stale state.
- **Fix:**
```javascript
useEffect(() => {
  let cancelled = false
  loadBlock(user?.id).then(b => {
    if (!cancelled) setBlock(b)
  })
  return () => { cancelled = true }
}, [user?.id])
```

### BUG-003: AICoach supabase.auth.getUser() error not checked
- **File:** `src/pages/AICoach.jsx` (line ~135)
- **Severity:** HIGH
- **Type:** Supabase Patterns
- **Description:** In `handleGenerate()`, `supabase.auth.getUser()` destructures `{ data: { user } }` but never checks for error. If auth fails, user will be undefined and userId will be null.
- **Impact:** Silent failure, AI generation proceeds without proper user context.
- **Fix:**
```javascript
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError) {
  setError(t('aicoach.auth_error'))
  return
}
```

### BUG-004: Logger.jsx localStorage.setItem not in try-catch
- **File:** `src/pages/Logger.jsx` (line ~465)
- **Severity:** HIGH
- **Type:** Null/Undefined Safety / localStorage quota
- **Description:** `localStorage.setItem('coach-pending-workout', ...)` in `handleStartAIWorkout` is not wrapped in try-catch. Can throw `QuotaExceededError` when storage is full.
- **Impact:** Crash when starting AI workout on devices with full localStorage.
- **Fix:**
```javascript
try {
  localStorage.setItem('coach-pending-workout', JSON.stringify(startFlowState.generatedWorkout))
} catch (e) {
  console.warn('localStorage quota exceeded:', e)
}
```

### BUG-005: Logger.jsx coach-pending-workout useEffect missing dependency
- **File:** `src/pages/Logger.jsx` (lines ~135-143)
- **Severity:** HIGH
- **Type:** React Hooks / Missing dependency
- **Description:** The `useEffect` that loads `coach-pending-workout` from localStorage has an empty dependency array `[]`, but it references `aw.isActive`. This means it only runs on mount and won't re-check if `aw.isActive` changes.
- **Impact:** If user navigates back and forth, pending workout may not be loaded correctly.
- **Fix:**
```javascript
useEffect(() => {
  const raw = localStorage.getItem('coach-pending-workout')
  if (raw && !aw.isActive) {
    // ... existing logic
  }
}, [aw.isActive]) // Add dependency
```

### BUG-006: Logger.jsx sessionStorage cache restored without user check
- **File:** `src/pages/Logger.jsx` (lines ~163-180)
- **Severity:** HIGH
- **Type:** Security / State corruption
- **Description:** Session cache is restored from `sessionStorage` without checking if it belongs to the current user. If user A logs out and user B logs in (same browser session), user B could see user A's cached workout.
- **Impact:** Data leakage between users, wrong workout shown.
- **Fix:**
```javascript
// Store userId in cache and validate on restore:
if (cached.userId === user?.id && cached.generatedWorkout && ...) {
  return { ...cached, loading: false, ... }
}
```

---

## MEDIUM Bugs

### BUG-007: Calendar.jsx hardcoded Dutch strings (no i18n)
- **File:** `src/pages/Calendar.jsx` (multiple lines)
- **Severity:** MEDIUM
- **Type:** i18n Completeness
- **Description:** Multiple hardcoded Dutch strings not using `t()`:
  - Line ~156-162: "Overzicht", "Kalender", "deze maand", "streak", "dit jaar"
  - Line ~267: "Bekijk volledige workout"
  - Line ~274: "Tap op een dag met training om details te zien"
  - Line ~280: "Nog geen trainingen gelogd", "Start je eerste training"
  - Line ~245: `+${...} meer`
  - `formatDate()` function uses hardcoded Dutch day/month names
  - `DAYS_NL`, `MONTHS_NL` arrays hardcoded
- **Impact:** English users see Dutch text, broken i18n experience.
- **Fix:** Replace all hardcoded strings with `t()` calls and add corresponding keys to both `nl.json` and `en.json`.

### BUG-008: Logger.jsx hardcoded Dutch strings (no i18n)
- **File:** `src/pages/Logger.jsx` (multiple lines)
- **Severity:** MEDIUM
- **Type:** i18n Completeness
- **Description:** Multiple hardcoded Dutch strings:
  - "Analyseren...", "AI bezig...", "Klaar", "Fout"
  - "Workout laden...", "Genereren mislukt"
  - "Lege training", "Zelf oefeningen kiezen"
  - "Template", "{n} opgeslagen"
  - "Andere split kiezen", "Kies split", "Annuleren"
  - "Geavanceerde opties"
  - MUSCLE_NL object (borst, rug, etc) should use t('muscles.X')
  - `formattedDate` uses hardcoded 'nl-NL' locale
- **Impact:** English users see Dutch text.
- **Fix:** Replace with `t()` calls.

### BUG-009: Dashboard.jsx hardcoded Dutch strings (no i18n)
- **File:** `src/pages/Dashboard.jsx` (multiple lines)
- **Severity:** MEDIUM
- **Type:** i18n Completeness
- **Description:** Hardcoded strings:
  - "Tijd om te beginnen." / "Time to get started."
  - "Start training" / "Vrije training" / "Free training"
  - "Geen oefeningen" / "No exercises"
  - `getGreeting()` returns hardcoded greetings
  - `getDayName()` returns hardcoded day names
- **Impact:** Inconsistent i18n, ternary operator pattern instead of proper t() usage.
- **Fix:** Use `t('dashboard.greeting_morning')` etc instead of manual language checks.

### BUG-010: Dashboard.jsx locale hardcoded in toLocaleDateString
- **File:** `src/pages/Dashboard.jsx` (line ~197)
- **Severity:** MEDIUM
- **Type:** i18n / Date formatting
- **Description:** `date.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB', {...})` hardcodes locale mapping. Should use a proper i18n date formatter or at minimum support more locales.
- **Impact:** Users with other languages get inconsistent date formatting.
- **Fix:** Use i18n date formatting: `new Intl.DateTimeFormat(i18n.language, {...}).format(date)`

### BUG-011: Logger.jsx inconsistent date locale
- **File:** `src/pages/Logger.jsx` (line ~495)
- **Severity:** MEDIUM
- **Type:** i18n / Date formatting
- **Description:** `today.toLocaleDateString('nl-NL', {...})` is hardcoded to Dutch regardless of user's language setting.
- **Impact:** English users see Dutch date format.
- **Fix:** Use `i18n.language` to determine locale.

### BUG-012: Calendar.jsx Math.max on potentially empty sets array
- **File:** `src/pages/Calendar.jsx` (line ~238)
- **Severity:** MEDIUM
- **Type:** Math Edge Cases
- **Description:** `Math.max(...sets.map(s => s.weight_kg || 0))` — if `sets` is empty, `Math.max()` with no arguments returns `-Infinity`.
- **Impact:** Shows "-Infinity kg" in UI for exercises with no sets.
- **Fix:**
```javascript
const maxWeight = sets.length > 0 ? Math.max(...sets.map(s => s.weight_kg || 0)) : 0
```
*Note: This may already be in known-bugs but the fix shown here is different from what I see in the code.*

### BUG-013: Logger.jsx missing error feedback when generateForSplit fails silently
- **File:** `src/pages/Logger.jsx` (line ~460)
- **Severity:** MEDIUM
- **Type:** UX / Error handling
- **Description:** When `generateForSplit` early-returns due to missing `muscleStatus`, no error state is set. User sees nothing happen.
- **Impact:** Confusing UX when split regeneration silently fails.
- **Fix:**
```javascript
if (!user?.id || !startFlowState.muscleStatus) {
  setStartFlowState(prev => ({ ...prev, error: t('logger.analysis_required') }))
  return
}
```

### BUG-014: AICoach.jsx split names not translated
- **File:** `src/pages/AICoach.jsx` (multiple lines)
- **Severity:** MEDIUM
- **Type:** i18n Completeness
- **Description:** Split names like "Push", "Pull", "Legs", "Upper", "Lower", "Full Body" are displayed raw from the scoring algorithm without translation.
- **Impact:** UI shows English split names regardless of language setting.
- **Fix:** Add `t('splits.push')`, `t('splits.pull')`, etc. to locale files and use in display.

---

## LOW Bugs

### BUG-015: WorkoutDetail.jsx 'Training' fallback hardcoded
- **File:** `src/pages/WorkoutDetail.jsx` (line ~49)
- **Severity:** LOW
- **Type:** i18n Completeness
- **Description:** `{workout.exerciseNames?.slice(0, 2).join(' + ') || 'Training'}` has hardcoded fallback string.
- **Impact:** Minor i18n gap.
- **Fix:** Use `t('workout_detail.fallback_title')` or similar.

### BUG-016: Logger.jsx getWorkoutType returns hardcoded English strings
- **File:** `src/pages/Logger.jsx` (lines ~980-1000)
- **Severity:** LOW
- **Type:** i18n Completeness
- **Description:** `getWorkoutType()` helper returns "Push Day", "Pull Day", "Leg Day", "Upper Body", "Full Body", "Workout" — all hardcoded English.
- **Impact:** Header shows English workout type regardless of language.
- **Fix:** Return translation keys and use `t()` in the component.

### BUG-017: History.jsx delete error swallowed
- **File:** `src/pages/History.jsx` (line ~32)
- **Severity:** LOW
- **Type:** Error handling
- **Description:** `try { await deleteWorkout(deleteId) } catch {}` — error is swallowed silently without any user feedback.
- **Impact:** User doesn't know if delete failed.
- **Fix:** Show toast with error message in catch block.

### BUG-018: Calendar.jsx typo "zien" suggestion
- **File:** `src/pages/Calendar.jsx` (line ~274)
- **Severity:** LOW
- **Type:** Copy / UX
- **Description:** "Tap op een dag met training om details te zien" — "zien" is correct Dutch, but the whole string is hardcoded (covered in BUG-007).
- **Impact:** N/A — this is informational, the real bug is the hardcoding.
- **Fix:** Covered by BUG-007.

---

## Previously Fixed (Not Re-Reported)

The following issues were found in `known-bugs.md` and confirmed fixed:
- AICoach.jsx `scores[0].name` crash when splits empty
- History.jsx `exerciseNames.some()` without null check
- Calendar.jsx `exerciseNames` crash
- WorkoutDetail.jsx `workout.exerciseNames.length - 2` crash
- Calendar.jsx Math.max on empty sets (partially — see BUG-012 for remaining edge case)

---

## Recommendations

1. **Create i18n audit script** — Many files have inline language checks (`i18n.language === 'nl'`) that should be replaced with proper `t()` calls.

2. **Standardize async effect pattern** — Create a custom hook `useAsyncEffect` that handles cancellation automatically.

3. **Add ESLint rule** — `no-hardcoded-strings` or similar to catch i18n gaps at build time.

4. **Session cache isolation** — Store userId in session cache and validate before restore.

---

*Report generated by Spark subagent using coach-app-bug-hunter skill.*
