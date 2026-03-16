# User Flow Bug Audit Report

**Date:** 2026-03-16  
**Auditor:** Spark (Subagent)  
**Scope:** Complete user flow analysis — onboarding, workout generation, active workout, finish, offline

---

## Critical Bugs

### BUG-001: Wrong table name in FinishModal PR detection
- **File:** `src/components/FinishModal.jsx` (line ~55-60)
- **Severity:** CRITICAL
- **Type:** Supabase query error
- **Description:** The PR detection query uses table name `'workout_sets'` but the actual table is `'sets'`. This causes the query to fail (table doesn't exist), silently returning empty results or throwing an error.
- **Impact:** PR detection is completely broken. Users never see "New PR!" celebrations after beating their records. Major UX and motivation feature is dead.
- **Fix:**
```javascript
// Change from:
const { data: history, error: historyError } = await supabase
  .from('workout_sets')  // WRONG
  
// To:
const { data: history, error: historyError } = await supabase
  .from('sets')  // CORRECT
```

---

### BUG-002: Offline workout completion doesn't use offline queue
- **File:** `src/hooks/useActiveWorkout.js` (line ~105-140)
- **Severity:** CRITICAL
- **Type:** Data loss / Offline handling
- **Description:** When `finishWorkout()` fails due to network issues, the error is set but the workout data is NOT queued to the offline queue. If the user dismisses the error or navigates away, their entire workout is lost.
- **Impact:** Users who complete a workout while offline (or with spotty connection) lose all their training data. Critical data loss scenario.
- **Fix:**
```javascript
// In finishWorkout catch block, add offline queue fallback:
} catch (err) {
  setError(err.message)
  // Queue workout for offline sync
  const offlineData = {
    type: 'workout_complete',
    workout: {
      user_id: userId,
      notes: workout.notes,
      created_at: workout.startedAt,
      exercises: workout.exercises,
    }
  }
  // Would need to import/use offline queue here
  return null
}
```

---

## High Severity Bugs

### BUG-003: Template save error not shown to user
- **File:** `src/components/FinishModal.jsx` (line ~216-227)
- **Severity:** HIGH
- **Type:** Silent failure / UX
- **Description:** When `onSaveTemplate()` fails, the error is caught and logged to console, but the user sees no feedback. The saving spinner stops, but no error message appears.
- **Impact:** User thinks template saved successfully, but it didn't. They lose their custom template without knowing.
- **Fix:**
```javascript
async function handleSaveTemplate() {
  if (!templateName.trim() || saving) return
  setSaving(true)
  try {
    await onSaveTemplate(templateName.trim())
    setSaved(true)
    setShowTemplateInput(false)
  } catch (err) {
    console.error('Failed to save template:', err)
    // ADD: Show error to user
    setTemplateError(t('finish_modal.template_save_failed'))
  } finally {
    setSaving(false)
  }
}
// ADD: templateError state and render it in UI
```

---

### BUG-004: useActiveWorkout.startWorkout can overwrite active workout
- **File:** `src/hooks/useActiveWorkout.js` (line ~45-54)
- **Severity:** HIGH
- **Type:** Data loss potential
- **Description:** `startWorkout()` doesn't check if a workout is already active. Calling it while `isActive` is true will silently overwrite the current workout, losing all logged sets.
- **Impact:** If user somehow triggers workout start twice (race condition, double-tap, browser back/forward), they lose their current workout progress.
- **Fix:**
```javascript
const startWorkout = useCallback((preloadedExercises) => {
  // Guard against overwriting active workout
  if (workout) {
    console.warn('Attempted to start workout while one is active')
    return
  }
  const w = {
    tempId: crypto.randomUUID(),
    // ...
  }
  setWorkout(w)
}, [workout])  // Add workout to deps
```

---

## Medium Severity Bugs

### BUG-005: Onboarding has no back button
- **File:** `src/pages/Onboarding.jsx`
- **Severity:** MEDIUM
- **Type:** UX / Navigation
- **Description:** Once a user selects an option in onboarding, they cannot go back to change their previous selection. The flow is strictly forward-only.
- **Impact:** User who accidentally selects wrong goal/experience level must complete onboarding and then go to Profile to fix it. Frustrating UX.
- **Fix:** Add back button that decrements `step` state, with guard for step === 0.

---

### BUG-006: Onboarding bypass via direct navigation
- **File:** `src/App.jsx` (line ~74-85)
- **Severity:** MEDIUM
- **Type:** Flow bypass
- **Description:** The onboarding redirect only triggers on the "/" route. A new user can navigate directly to `/log`, `/coach`, `/history` etc. without completing onboarding.
- **Impact:** Users may miss critical setup (goal, equipment, frequency) affecting AI workout generation quality. App may generate suboptimal workouts.
- **Fix:** Add `needsOnboarding` check to Layout component or create a wrapper that redirects from all protected routes:
```javascript
// In Layout.jsx or a ProtectedRoute wrapper:
if (needsOnboarding && location.pathname !== '/onboarding') {
  return <Navigate to="/onboarding" replace />
}
```

---

### BUG-007: Logger ExerciseBlock warmup sets shown even after first set logged
- **File:** `src/pages/Logger.jsx` (line ~511-515)
- **Severity:** MEDIUM  
- **Type:** Logic error
- **Description:** The warmup section checks `exercise.sets.length === 0` to show warmup calculator, but it also recalculates warmupSets in useMemo with `exercise.sets.length > 0` check. However, the collapse logic (`setShowWarmup(false)` after all warmup done) uses a timeout, and if user logs a working set before all warmup done, the warmup section disappears abruptly.
- **Impact:** Minor UX jank where warmup section disappears mid-use.
- **Fix:** Change condition to hide warmup section only when user explicitly collapses it OR after they log their first working set.

---

## Low Severity Bugs

### BUG-008: FinishModal formatVol function doesn't handle negative values
- **File:** `src/components/FinishModal.jsx` (line ~308-312)
- **Severity:** LOW
- **Type:** Edge case
- **Description:** `formatVol()` assumes kg >= 0 but doesn't guard against negative values (which shouldn't happen, but could from bad data).
- **Impact:** Would display "-500kg" instead of "0" if somehow negative volume was passed. Very unlikely.
- **Fix:** Add `Math.max(0, kg)` at start of function.

---

### BUG-009: Dashboard muscleStatus filter may exclude recently trained muscles
- **File:** `src/pages/Dashboard.jsx` (line ~106-108)
- **Severity:** LOW
- **Type:** Edge case / Display logic
- **Description:** The filter `ms.setsThisWeek > 0 || ms.daysSinceLastTrained != null` could theoretically exclude a muscle trained exactly 7.0 days ago (sets would be 0 for "this week", but daysSinceLastTrained would be 7).
- **Impact:** Muscle that was trained exactly on the week boundary might not show in recovery view. Edge case timing issue.
- **Fix:** Consider using `hoursSinceLastTrained` check with larger window (e.g., 10 days).

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 2 |
| MEDIUM | 3 |
| LOW | 2 |
| **Total** | **9** |

### Priority Order for Fixes:
1. **BUG-001** — PR detection broken (easy fix: table name)
2. **BUG-002** — Offline data loss (requires offline queue integration)
3. **BUG-003** — Template save silent failure (easy fix: add error state)
4. **BUG-004** — Workout overwrite risk (easy fix: guard check)
5. **BUG-006** — Onboarding bypass (medium effort: route protection)
6. **BUG-005** — Onboarding back button (low effort: add button)
7. Rest are low priority

---

## Verified Working Flows

The following flows were verified to work correctly:

### ✅ Flow 1: First-time user (0 workouts)
- `analyzeTraining([])` returns valid muscleStatus with all muscles at 100% recovery
- `scoreSplits()` returns valid recommendations
- AI workout generation works (waits for time selection)
- Dashboard shows proper empty state
- No crashes on empty arrays

### ✅ Flow 5: Onboarding flow
- Step progression works correctly
- Settings saved to localStorage + Supabase
- Redirect to "/" triggers needsOnboarding check
- (Only issue: no back button, see BUG-005)

### ✅ useOfflineQueue implementation
- Has `isFlushingRef` to prevent double-flush race condition
- Snapshots queue before async iteration
- Handles localStorage quota errors
- (Issue is it's not used by finishWorkout, see BUG-002)

### ✅ Empty array guards
- `Math.max()` calls are guarded (checked in known-bugs.md)
- Optional chaining used appropriately
- Supabase queries check errors
