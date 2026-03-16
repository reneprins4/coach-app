# Components Audit Report

**Date:** 2026-03-16
**Scope:** `src/components/` — All JSX files
**Auditor:** Spark (subagent)

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 8 |
| LOW | 4 |
| **Total** | **16** |

---

## CRITICAL

### BUG-001: State update after unmount in FinishModal loadData
- File: `src/components/FinishModal.jsx` (line ~53-118)
- Severity: CRITICAL
- Type: React / Hooks
- Description: The `loadData()` async function inside useEffect has no `cancelled` flag or cleanup. All `setPrs()`, `setNextWorkout()`, and `setLoading()` calls execute without checking if the component is still mounted.
- Impact: React warning "Can't perform state update on unmounted component". Potential memory leak if user navigates away quickly after opening FinishModal.
- Fix:
```jsx
useEffect(() => {
  let cancelled = false
  async function loadData() {
    if (!user?.id) {
      if (!cancelled) setLoading(false)
      return
    }
    try {
      // ... queries ...
      if (!cancelled) setPrs(newPrs)
      // ... more queries ...
      if (!cancelled) setNextWorkout({ ... })
    } catch (err) {
      console.error('Failed to load finish data:', err)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }
  loadData()
  return () => { cancelled = true }
}, [user?.id, result])
```

---

## HIGH

### BUG-002: Supabase errors not checked in FinishModal
- File: `src/components/FinishModal.jsx` (line ~68, ~93)
- Severity: HIGH
- Type: Supabase Patterns
- Description: Two Supabase queries destructure only `{ data: history }` and `{ data: workouts }` without checking for `error`. If queries fail (network issue, RLS), `data` is null and code continues with null.
- Impact: Silent failure - PRs and next workout recommendation won't load, user sees incomplete data without explanation.
- Fix:
```jsx
const { data: history, error: historyError } = await supabase...
if (historyError) throw historyError

const { data: workouts, error: workoutsError } = await supabase...
if (workoutsError) throw workoutsError
```

### BUG-003: InjuryRadar hardcoded Dutch strings bypass i18n
- File: `src/components/InjuryRadar.jsx` (lines ~29, 36, 54, 66, 82, 97, 114, 128)
- Severity: HIGH
- Type: i18n Completeness
- Description: All `reason` strings in analysis functions are hardcoded Dutch (e.g., `"Volume ${x}% hoger dan 4-weeks gemiddelde"`, `"Push/Pull disbalans: ratio ${x}x"`). Level strings `'hoog'` and `'matig'` are also hardcoded.
- Impact: English users see Dutch text in injury radar alerts. Breaks multi-language support.
- Fix: Add translation keys like `t('injury_radar.volume_spike', { pct: increase })` and use `level: 'high'` / `level: 'moderate'` internally, translate for display.

### BUG-004: PlateauAlert entirely missing i18n
- File: `src/components/PlateauAlert.jsx` (lines ~12-17, 43, 82-90)
- Severity: HIGH
- Type: i18n Completeness
- Description: No `useTranslation` hook imported. All UI strings are hardcoded Dutch: `'Plateau'`, `'Vertraagt'`, `'Aandachtspunten'`, `'oefening'`/`'oefeningen'`, `'Minder tonen'`, `'Toon X meer'`.
- Impact: Component displays only Dutch regardless of language setting.
- Fix: Add `useTranslation` import, create keys in nl.json/en.json, replace all hardcoded strings with `t()` calls.

---

## MEDIUM

### BUG-005: hover: class in FinishModal save template button
- File: `src/components/FinishModal.jsx` (line ~221)
- Severity: MEDIUM
- Type: Mobile UX (Tailwind)
- Description: `hover:bg-gray-800` on save template button. This is a touch app where hover doesn't work.
- Impact: No visual feedback on touch. Button appears non-interactive.
- Fix: Replace with `active:bg-gray-800`

### BUG-006: hover: class in FinishModal plan next button
- File: `src/components/FinishModal.jsx` (line ~266)
- Severity: MEDIUM
- Type: Mobile UX (Tailwind)
- Description: `hover:bg-gray-900` on plan next button.
- Impact: No visual feedback on touch.
- Fix: Replace with `active:bg-gray-900`

### BUG-007: MuscleMap entirely missing i18n
- File: `src/components/MuscleMap.jsx` (lines ~149-150, 227-231)
- Severity: MEDIUM
- Type: i18n Completeness
- Description: No `useTranslation` import. Hardcoded labels: `'Voor'`, `'Achter'` (view labels), `'Klaar'`, `'Herstellend'`, `'Vermoeid'` (legend).
- Impact: Muscle map always shows Dutch labels regardless of language setting.
- Fix: Add `useTranslation` hook, add keys to locale files, use `t()` for labels.

### BUG-008: Layout hardcoded Dutch strings
- File: `src/components/Layout.jsx` (line ~25)
- Severity: MEDIUM
- Type: i18n Completeness
- Description: Active workout banner has hardcoded `'Training actief'` and `'Ga terug'`.
- Impact: Dutch text shown to English users when workout is active.
- Fix: Use `t('layout.workout_active')` and `t('layout.go_back')`

### BUG-009: VolumeChart hardcoded Dutch pluralization
- File: `src/components/VolumeChart.jsx` (line ~118)
- Severity: MEDIUM
- Type: i18n Completeness
- Description: `{workoutCount === 1 ? 'training' : 'trainingen'}` hardcoded Dutch.
- Impact: Tooltip shows Dutch words regardless of language.
- Fix: Use `t('volume.workout', { count: workoutCount })` with plural keys.

### BUG-010: ExerciseGuide hardcoded Dutch error message
- File: `src/components/ExerciseGuide.jsx` (line ~22)
- Severity: MEDIUM
- Type: i18n Completeness
- Description: Fallback error `'Fout bij laden'` is hardcoded Dutch.
- Impact: English users see Dutch error message.
- Fix: Use `t('exercise_guide.error')` or `t('common.error_loading')`

### BUG-011: ExercisePicker equipment labels not translated
- File: `src/components/ExercisePicker.jsx` (lines ~8-13)
- Severity: MEDIUM
- Type: i18n Completeness
- Description: `EQUIPMENT_FILTERS` has hardcoded English labels: `'Barbell'`, `'Dumbbell'`, `'Cable'`, `'Machine'`, `'Bodyweight'` instead of using `t()`.
- Impact: Equipment filter buttons don't translate to Dutch.
- Fix: Change to use `labelKey` like the first item does: `{ value: 'barbell', labelKey: 'equipment.barbell' }`

### BUG-012: InjuryRadar duplicate MUSCLE_NL constant
- File: `src/components/InjuryRadar.jsx` (lines ~10-14)
- Severity: MEDIUM
- Type: App-Specific Logic / Code Quality
- Description: `MUSCLE_NL` map duplicates translation logic that should come from i18n. Also includes `push` and `pull` which aren't standard muscle groups but are used as keys.
- Impact: Inconsistent translations, harder to maintain.
- Fix: Remove `MUSCLE_NL`, always use `t('muscles.xxx')` with fallback to key name.

---

## LOW

### BUG-013: DeloadAlert imports unused useState/useEffect
- File: `src/components/DeloadAlert.jsx` (line ~1)
- Severity: LOW
- Type: Code Quality
- Description: `useState` and `useEffect` are imported but not used (only `useMemo` is used).
- Impact: Minor bundle bloat, lint warning.
- Fix: Remove unused imports: `import { useMemo } from 'react'`

### BUG-014: BlockWizard saveSettings may fail silently
- File: `src/components/BlockWizard.jsx` (line ~98)
- Severity: LOW
- Type: Async / Promise Safety
- Description: `saveSettings({ ...current, goal: mappedGoal })` is called without try/catch. If localStorage is full (QuotaExceededError), this fails silently.
- Impact: User's goal preference may not persist, but wizard flow continues normally.
- Fix: Wrap in try/catch or verify `saveSettings` handles errors internally.

### BUG-015: InjuryRadar push/pull aren't real muscle groups
- File: `src/components/InjuryRadar.jsx` (line ~107)
- Severity: LOW
- Type: App-Specific Logic
- Description: `push` and `pull` are used as muscle keys for imbalance detection, but they're not in the standard muscle group list. The `getMuscleLabel` function won't find translation keys for them.
- Impact: "push" and "pull" display as raw strings instead of translated labels.
- Fix: Add fallback translations for push/pull or use different terminology.

### BUG-016: FinishModal missing dependency in useMemo
- File: `src/components/FinishModal.jsx` (line ~95)
- Severity: LOW
- Type: React / Hooks
- Description: `recoveryForecast` useMemo only depends on `[result.exerciseNames]` but it uses `new Date()` internally. The date is captured at render time which is correct, but the dependency could be more explicit.
- Impact: No functional issue, but lint warning possible.
- Fix: This is acceptable as-is since the memo should recalculate on each mount anyway.

---

## Files Reviewed

| File | Bugs Found |
|------|------------|
| FinishModal.jsx | 4 (BUG-001, 002, 005, 006) |
| InjuryRadar.jsx | 3 (BUG-003, 012, 015) |
| PlateauAlert.jsx | 1 (BUG-004) |
| MuscleMap.jsx | 1 (BUG-007) |
| Layout.jsx | 1 (BUG-008) |
| VolumeChart.jsx | 1 (BUG-009) |
| ExerciseGuide.jsx | 1 (BUG-010) |
| ExercisePicker.jsx | 1 (BUG-011) |
| DeloadAlert.jsx | 1 (BUG-013) |
| BlockWizard.jsx | 1 (BUG-014) |
| WeaknessHunter.jsx | 0 ✓ |
| FormDetective.jsx | 0 ✓ |
| MomentumIndicator.jsx | 0 ✓ |
| JunkVolumeAlert.jsx | 0 ✓ |
| PlateCalculator.jsx | 0 ✓ |
| Toast.jsx | 0 ✓ |
| PerformanceForecast.jsx | 0 ✓ |
| SupersetModal.jsx | 0 ✓ |
| RestTimerBar.jsx | 0 ✓ |
| TemplateLibrary.jsx | 0 ✓ |

---

## Priority Fixes

1. **BUG-001** (CRITICAL): FinishModal unmount crash - Fix immediately
2. **BUG-002** (HIGH): Supabase error handling - Fix with BUG-001
3. **BUG-003, 004, 007-012** (HIGH/MEDIUM): i18n gaps - Batch fix in one PR
4. **BUG-005, 006** (MEDIUM): hover → active - Quick fix

---

*Report generated by coach-app-bug-hunter skill*
