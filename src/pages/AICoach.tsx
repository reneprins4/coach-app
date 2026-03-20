import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, RefreshCw, ChevronDown, ChevronUp,
  AlertCircle, ArrowUpRight, User
} from 'lucide-react'
import { WorkoutReview } from '../components/workout/WorkoutReview'
import { generateScientificWorkout } from '../lib/ai'
import { fetchRecentHistory } from '../hooks/useWorkouts'
import { analyzeTraining, scoreSplits, getRelevantHistory, calcMuscleRecovery, classifyExercise } from '../lib/training-analysis'
import { analyzeWeaknesses } from '../lib/weaknessHunter'
import { getSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { getCurrentBlock, getCurrentWeekTarget, PHASES } from '../lib/periodization'
import { buildWorkoutPreferences } from '../lib/workoutPreferences'
import { useAuthContext } from '../App'

const ALL_MUSCLES: import('../types').MuscleGroup[] = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core']

function calcRecovery(muscle: string, ms: import('../types').MuscleStatus) {
  return calcMuscleRecovery(muscle, ms.hoursSinceLastTrained, ms.avgRpeLastSession, ms.setsLastSession)
}

function RecoveryBar({ muscle, ms, t }: { muscle: string; ms: import('../types').MuscleStatus; t: import('i18next').TFunction }) {
  const recovery = ms.recoveryPct ?? calcRecovery(muscle, ms)
  const isOverTrained = ms.setsThisWeek >= ms.target.max
  const effectiveRecovery = isOverTrained ? Math.min(recovery, 60) : recovery

  const color = effectiveRecovery < 50 ? '#06b6d4' : effectiveRecovery < 80 ? '#eab308' : '#22c55e'

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-white">{t(`muscles.${muscle}`)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600 tabular">{ms.setsThisWeek}/{ms.target.min}-{ms.target.max}</span>
          <span className="text-xs font-bold tabular" style={{ color }}>{Math.round(effectiveRecovery)}%</span>
        </div>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${effectiveRecovery}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function AICoach() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { user } = useAuthContext()
  const settings = getSettings()

  const [analyzing, setAnalyzing] = useState(true)
  const [workoutHistory, setWorkoutHistory] = useState<import('../types').Workout[]>([])
  const [muscleStatus, setMuscleStatus] = useState<Record<import('../types').MuscleGroup, import('../types').MuscleStatus> | null>(null)
  const [splitScores, setSplitScores] = useState<import('../types').SplitScore[]>([])
  const [selectedSplit, setSelectedSplit] = useState<string | null>(null)

  const block = getCurrentBlock()
  const weekTarget = block ? getCurrentWeekTarget(block) : null
  const phase = block ? PHASES[block.phase] : null

  const [energy, setEnergy] = useState('medium')
  const [time, setTime] = useState(60)
  const [focusedMuscles, setFocusedMuscles] = useState<import('../types').MuscleGroup[]>([])

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState<import('../types').AIWorkoutResponse | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const showProfileBanner = !settings.bodyweight

  const [lastWorkoutInfo, setLastWorkoutInfo] = useState<{ split: string; hoursSince: number } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function analyze() {
      setAnalyzing(true)
      try {
        const history = await fetchRecentHistory(user?.id ?? '', 21)
        if (cancelled) return

        setWorkoutHistory(history)
        const analysis = analyzeTraining(history, settings.goal || 'hypertrophy')
        if (cancelled) return

        setMuscleStatus(analysis)

        let lwInfo = null
        if (history.length > 0) {
          const lastWorkout = history[0]!
          const lastWorkoutDate = new Date(lastWorkout.created_at)
          const hoursSince = (Date.now() - lastWorkoutDate.getTime()) / 3600000
          const lastSplit = detectSplitFromWorkout(lastWorkout)
          lwInfo = { split: lastSplit, hoursSince }
          if (!cancelled) setLastWorkoutInfo(lwInfo)
        }

        if (cancelled) return

        const scores = scoreSplits(analysis, lwInfo, settings.experienceLevel || 'intermediate')
        if (cancelled) return

        setSplitScores(scores)
        if (scores.length > 0) setSelectedSplit(scores[0]!.name)

        const weakAnalysis = analyzeWeaknesses(history, 4)
        const weakMuscles = weakAnalysis.imbalances
          .filter(imb => imb.severity === 'high')
          .map(imb => imb.weak)
          .filter(Boolean)
        if (weakMuscles.length > 0 && !cancelled) {
          setFocusedMuscles(weakMuscles as import('../types').MuscleGroup[])
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Analysis failed:', err)
      }
      if (!cancelled) setTimeout(() => setAnalyzing(false), 800)
    }
    analyze()

    return () => { cancelled = true }
  }, [user?.id])

  function detectSplitFromWorkout(workout: import('../types').Workout): string {
    const muscles = new Set()
    for (const set of (workout.workout_sets || [])) {
      const muscle = classifyExercise(set.exercise)
      if (muscle) muscles.add(muscle)
    }

    const hasUpper = muscles.has('chest') || muscles.has('back') || muscles.has('shoulders')
    const hasLower = muscles.has('quads') || muscles.has('hamstrings') || muscles.has('glutes')

    if (hasUpper && hasLower && muscles.size >= 4) return 'Full Body'
    if (hasUpper && !hasLower) {
      if (muscles.has('chest') && !muscles.has('back')) return 'Push'
      if (muscles.has('back') && !muscles.has('chest')) return 'Pull'
      return 'Upper'
    }
    if (hasLower && !hasUpper) return 'Lower'
    return 'Full Body'
  }

  function toggleFocus(muscle: import('../types').MuscleGroup) {
    setFocusedMuscles(prev =>
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    )
  }

  async function handleGenerate() {
    if (!selectedSplit || !muscleStatus) return
    setGenerating(true)
    setError(null)
    try {
      const relevantHistory = getRelevantHistory(workoutHistory, selectedSplit)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError(t('aicoach.auth_error', 'Authentication error. Please log in again.'))
        return
      }
      const preferences = buildWorkoutPreferences(settings, block, { energy, time, focusedMuscles })
      const workout = await generateScientificWorkout({
        muscleStatus, recommendedSplit: selectedSplit, recentHistory: relevantHistory, userId: user?.id || null, preferences,
      })
      setResult(workout)
      setRetryCount(0)
    } catch (err) {
      const message = (err as Error).message === 'SESSION_EXPIRED'
        ? t('auth.session_expired', 'Je sessie is verlopen, log opnieuw in')
        : (err as Error).message
      setError(message)
      setRetryCount(prev => prev + 1)
    } finally {
      setGenerating(false)
    }
  }

  function handleAccept() {
    if (!result?.exercises) return
    const pending = result.exercises.map(ex => ({
      name: ex.name, muscle_group: ex.muscle_group || '', category: '', sets: [],
      plan: { sets: ex.sets, reps_min: ex.reps_min, reps_max: ex.reps_max, weight_kg: ex.weight_kg, rpe_target: ex.rpe_target, rest_seconds: ex.rest_seconds, notes: ex.notes },
    }))
    localStorage.setItem('coach-pending-workout', JSON.stringify(pending))
    nav('/log')
  }

  function handleSwapExercise(index: number, newExercise: import('../types').AIExercise) {
    if (!result) return
    const updatedExercises = [...result.exercises]
    updatedExercises[index] = newExercise
    setResult({ ...result, exercises: updatedExercises })
  }

  // ── Loading ──
  if (analyzing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-5">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
        <p className="text-title">{t('aicoach.loading')}</p>
        <p className="mt-1 text-sm text-gray-600">{t('aicoach.loading_sub')}</p>
      </div>
    )
  }

  // ── Result → WorkoutReview ──
  if (result) {
    return (
      <WorkoutReview
        workout={result}
        split={result.split || selectedSplit || 'Workout'}
        estimatedDuration={result.estimated_duration_min || time}
        onStart={handleAccept}
        onBack={() => setResult(null)}
        onSwapExercise={handleSwapExercise}
      />
    )
  }

  // ── Toggle button styling helper ──
  const toggle = (active: boolean) =>
    `flex-1 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${
      active
        ? 'bg-cyan-500 text-white shadow-[0_0_16px_rgba(6,182,212,0.3)]'
        : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
    }`

  const chip = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-[0.97] ${
      active
        ? 'bg-cyan-500 text-white shadow-[0_0_16px_rgba(6,182,212,0.3)]'
        : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
    }`

  return (
    <div className="min-h-dvh px-5 pt-6 pb-28">
      {/* ━━ Back ━━ */}
      <button
        onClick={() => nav(-1)}
        className="mb-6 flex h-10 items-center gap-1.5 rounded-xl text-sm font-medium text-gray-600 transition-colors active:text-white min-h-[44px] -ml-1"
      >
        <ArrowLeft size={16} /> {t('common.back')}
      </button>

      {/* ━━ Profile banner ━━ */}
      {showProfileBanner && (
        <Link to="/profile" className="card-accent mb-5 flex items-center gap-3 active:scale-[0.98] transition-transform">
          <User size={18} className="shrink-0 text-cyan-400" />
          <span className="text-sm text-cyan-400">{t('aicoach.profile_banner')}</span>
          <ArrowUpRight size={16} className="ml-auto shrink-0 text-cyan-600" />
        </Link>
      )}

      {/* ━━ Header ━━ */}
      <div className="mb-6">
        <p className="label-caps mb-1">{t('aicoach.your_training')}</p>
        <h1 className="text-display">{selectedSplit || t('aicoach.today')}</h1>
        {workoutHistory.length === 0 && settings.experienceLevel !== 'advanced' && (
          <p className="text-sm text-gray-500 mt-1">{t('aicoach.first_training')}</p>
        )}
        {workoutHistory.length === 0 && settings.experienceLevel === 'advanced' && (
          <p className="text-sm text-gray-500 mt-1">{t('aicoach.first_training_advanced')}</p>
        )}
        {workoutHistory.length > 0 && splitScores[0] && (
          <p className="text-sm text-gray-500 mt-1">{splitScores[0].reasoning}</p>
        )}
        {lastWorkoutInfo && lastWorkoutInfo.hoursSince < 20 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            {t('aicoach.trained_hours_ago', { hours: Math.round(lastWorkoutInfo.hoursSince) })}
          </p>
        )}
      </div>

      {/* ━━ Block context ━━ */}
      {block && phase && weekTarget && (
        <div className="card-accent mb-5">
          <p className="text-xs font-semibold text-cyan-400">{phase.label} · {t('plan.week')} {block.currentWeek}/{phase.weeks}</p>
          <p className="text-sm text-white mt-0.5">
            {weekTarget.isDeload ? t('aicoach.deload_hint') : `RPE ${weekTarget.rpe} · ${weekTarget.repRange[0]}-${weekTarget.repRange[1]} reps`}
          </p>
        </div>
      )}

      {/* ━━ Time ━━ */}
      <div className="mb-6">
        <p className="label-caps mb-3">{t('aicoach.how_long')}</p>
        <div className="flex gap-2">
          {[45, 60, 75, 90].map(tm => (
            <button key={tm} onClick={() => setTime(tm)} className={toggle(time === tm)}>
              {tm}m
            </button>
          ))}
        </div>
      </div>

      {/* ━━ Generate ━━ */}
      <button onClick={handleGenerate} disabled={generating || !selectedSplit} className="btn-primary mb-5 disabled:opacity-50">
        {generating ? t('common.loading') : t('aicoach.make_training')}
      </button>

      {/* ━━ Advanced options ━━ */}
      <button
        onClick={() => setShowAdvanced(v => !v)}
        className="flex w-full items-center justify-center gap-1.5 py-3 text-sm text-gray-600 active:text-gray-400"
      >
        {t('aicoach.adjust')}
        {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showAdvanced && (
        <div className="mt-2 space-y-5">
          {/* Energy */}
          <div>
            <p className="label-caps mb-2">{t('aicoach.energy_today')}</p>
            <div className="flex gap-2">
              {[
                { value: 'low', labelKey: 'aicoach.energy_low' },
                { value: 'medium', labelKey: 'aicoach.energy_medium' },
                { value: 'high', labelKey: 'aicoach.energy_high' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setEnergy(opt.value)} className={toggle(energy === opt.value)}>
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Split */}
          {splitScores.length > 1 && (
            <div>
              <p className="label-caps mb-2">{t('aicoach.training_type')}</p>
              <div className="flex flex-wrap gap-2">
                {splitScores.map(s => (
                  <button key={s.name} onClick={() => setSelectedSplit(s.name)} className={chip(selectedSplit === s.name)}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Focus muscles */}
          <div>
            <p className="label-caps mb-2">{t('aicoach.want_extra')}</p>
            <div className="flex flex-wrap gap-2">
              {ALL_MUSCLES.map(m => (
                <button key={m} onClick={() => toggleFocus(m)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-[0.97] ${
                    focusedMuscles.includes(m)
                      ? 'bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
                  }`}
                >
                  {t(`muscles.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Recovery */}
          {muscleStatus && (
            <div className="card">
              <p className="label-caps mb-4">{t('aicoach.recovery')}</p>
              {ALL_MUSCLES.map(m => (
                <RecoveryBar
                  key={m}
                  muscle={m}
                  ms={(muscleStatus as Record<string, import('../types').MuscleStatus>)[m] || {
                    setsThisWeek: 0, daysSinceLastTrained: null, hoursSinceLastTrained: null,
                    avgRpeLastSession: null, setsLastSession: 0, recoveryPct: 100,
                    recentExercises: [], lastSessionSets: [],
                    target: { min: 10, max: 16, mev: 6 }, status: 'ready' as const,
                  }}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ━━ Error ━━ */}
      {error && (
        <div className="card mt-5 border-red-500/20">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400">{t('aicoach.error')}</p>
              {retryCount < 2 && <p className="mt-1 text-sm text-gray-500">{error}</p>}
              {retryCount >= 2 && <p className="mt-1 text-sm text-gray-500">{t('common.retry')}</p>}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 active:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                {t('aicoach.retry')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
