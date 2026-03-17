import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Minus, Clock, Flame, User
} from 'lucide-react'
import { generateScientificWorkout } from '../lib/anthropic'
import { fetchRecentHistory } from '../hooks/useWorkouts'
import { analyzeTraining, scoreSplits, getRelevantHistory, calcMuscleRecovery, classifyExercise } from '../lib/training-analysis'
import { analyzeWeaknesses } from '../lib/weaknessHunter'
import { getSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { getCurrentBlock, getCurrentWeekTarget, PHASES } from '../lib/periodization'
import { useAuthContext } from '../App'

const TIME_OPTIONS = [45, 60, 75, 90]

const ALL_MUSCLES = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core']

function calcRecovery(muscle, ms) {
  return calcMuscleRecovery(muscle, ms.hoursSinceLastTrained, ms.avgRpeLastSession, ms.setsLastSession)
}

function RecoveryBar({ muscle, ms, t }) {
  const recovery = ms.recoveryPct ?? calcRecovery(muscle, ms)
  const isOverTrained = ms.setsThisWeek >= ms.target.max
  const effectiveRecovery = isOverTrained ? Math.min(recovery, 60) : recovery

  let barColor = 'bg-green-500'
  let textColor = 'text-green-400'
  let labelKey = 'aicoach.ready'
  if (effectiveRecovery < 50) { barColor = 'bg-cyan-500'; textColor = 'text-cyan-400'; labelKey = 'aicoach.fatigued' }
  else if (effectiveRecovery < 80) { barColor = 'bg-yellow-500'; textColor = 'text-yellow-400'; labelKey = 'aicoach.recovering' }

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">{t(`muscles.${muscle}`)}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{ms.setsThisWeek}/{ms.target.min}-{ms.target.max} sets</span>
          <span className={`text-[10px] font-semibold ${textColor}`}>{t(labelKey)}</span>
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all ${barColor}`}
          style={{ width: `${effectiveRecovery}%` }}
        />
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
  const [workoutHistory, setWorkoutHistory] = useState([])
  const [muscleStatus, setMuscleStatus] = useState(null)
  const [splitScores, setSplitScores] = useState([])
  const [selectedSplit, setSelectedSplit] = useState(null)

  const block = getCurrentBlock()
  const weekTarget = block ? getCurrentWeekTarget(block) : null
  const phase = block ? PHASES[block.phase] : null

  const [energy, setEnergy] = useState('medium')
  const [time, setTime] = useState(60)
  const [focusedMuscles, setFocusedMuscles] = useState([])

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0)
  const [result, setResult] = useState(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Check if profile is incomplete (no bodyweight)
  const showProfileBanner = !settings.bodyweight

  // Track last workout info for consecutive training warnings
  const [lastWorkoutInfo, setLastWorkoutInfo] = useState(null)

  useEffect(() => {
    let cancelled = false
    
    async function analyze() {
      setAnalyzing(true)
      try {
        const history = await fetchRecentHistory(user?.id, 21)
        if (cancelled) return
        
        setWorkoutHistory(history)
        const analysis = analyzeTraining(history, settings.goal || 'hypertrophy')
        if (cancelled) return
        
        setMuscleStatus(analysis)
        
        // Calculate last workout info for consecutive training detection
        let lwInfo = null
        if (history.length > 0) {
          const lastWorkout = history[0]
          const lastWorkoutDate = new Date(lastWorkout.created_at)
          const hoursSince = (Date.now() - lastWorkoutDate.getTime()) / 3600000
          // Detect split from exercises in last workout
          const lastSplit = detectSplitFromWorkout(lastWorkout)
          lwInfo = { split: lastSplit, hoursSince }
          if (!cancelled) setLastWorkoutInfo(lwInfo)
        }
        
        if (cancelled) return
        
        const scores = scoreSplits(analysis, lwInfo, settings.experienceLevel || 'intermediate')
        if (cancelled) return
        
        setSplitScores(scores)
        if (scores.length > 0) setSelectedSplit(scores[0].name)

        // Auto-suggest weak muscles as focus based on imbalance analysis
        const weakAnalysis = analyzeWeaknesses(history, 4)
        const weakMuscles = weakAnalysis.imbalances
          .filter(imb => imb.severity === 'high')
          .map(imb => imb.weak)
          .filter(Boolean)
        if (weakMuscles.length > 0 && !cancelled) {
          setFocusedMuscles(weakMuscles)
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('Analysis failed:', err)
      }
      if (!cancelled) setTimeout(() => setAnalyzing(false), 800)
    }
    analyze()
    
    return () => { cancelled = true }
  }, [user?.id])

  // Helper to detect split type from workout exercises using unified classifier
  function detectSplitFromWorkout(workout) {
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

  function toggleFocus(muscle) {
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
      const workout = await generateScientificWorkout({
        muscleStatus,
        recommendedSplit: selectedSplit,
        recentHistory: relevantHistory,
        userId: user?.id || null,
        preferences: {
          energy,
          time,
          goal: settings.goal,
          frequency: settings.frequency,
          name: settings.name || 'athlete',
          bodyweight: settings.bodyweight || null,
          experienceLevel: settings.experienceLevel || 'intermediate',
          equipment: settings.equipment || 'full_gym',
          benchMax: settings.benchMax || null,
          squatMax: settings.squatMax || null,
          deadliftMax: settings.deadliftMax || null,
          focusedMuscles,
          trainingPhase: phase?.label || null,
          blockWeek: block?.currentWeek || null,
          blockTotalWeeks: phase?.weeks || null,
          targetRPE: weekTarget?.rpe || null,
          targetRepRange: weekTarget?.repRange || null,
          isDeload: weekTarget?.isDeload || false,
          weekTargetNote: weekTarget?.setNote || null,
        },
      })
      setResult(workout)
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      const message = err.message === 'SESSION_EXPIRED'
        ? t('auth.session_expired', 'Je sessie is verlopen, log opnieuw in')
        : err.message
      setError(message)
      setRetryCount(prev => prev + 1)
    } finally {
      setGenerating(false)
    }
  }

  function handleAccept() {
    if (!result?.exercises) return
    const pending = result.exercises.map(ex => ({
      name: ex.name,
      muscle_group: ex.muscle_group || '',
      category: '',
      sets: [],
      plan: {
        sets: ex.sets,
        reps_min: ex.reps_min,
        reps_max: ex.reps_max,
        weight_kg: ex.weight_kg,
        rpe_target: ex.rpe_target,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      },
    }))
    localStorage.setItem('coach-pending-workout', JSON.stringify(pending))
    nav('/log')
  }

  // Group exercises by muscle group for display
  const exercisesByMuscle = useMemo(() => {
    if (!result?.exercises) return {}
    return result.exercises.reduce((acc, ex) => {
      const key = ex.muscle_group || 'other'
      if (!acc[key]) acc[key] = []
      acc[key].push(ex)
      return acc
    }, {})
  }, [result])

  const VS_ICONS = {
    up: { icon: ArrowUpRight, color: 'text-green-400', labelKey: 'aicoach.up' },
    same: { icon: Minus, color: 'text-gray-400', labelKey: 'aicoach.same' },
    down: { icon: ArrowDownRight, color: 'text-cyan-400', labelKey: 'aicoach.down' },
    new: { icon: Sparkles, color: 'text-cyan-400', labelKey: 'aicoach.new' },
  }

  const ENERGY_OPTIONS = [
    { value: 'low', labelKey: 'aicoach.energy_low', color: 'text-blue-400 bg-blue-500/15' },
    { value: 'medium', labelKey: 'aicoach.energy_medium', color: 'text-yellow-400 bg-yellow-500/15' },
    { value: 'high', labelKey: 'aicoach.energy_high', color: 'text-cyan-400 bg-cyan-500/15' },
  ]

  if (analyzing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-4">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
        <p className="text-lg font-black tracking-tight text-white">{t('aicoach.loading')}</p>
        <p className="mt-1 text-sm text-gray-500">{t('aicoach.loading_sub')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-950 px-4 py-6 pb-28">
      <button
        onClick={() => nav(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-gray-400 active:text-white"
      >
        <ArrowLeft size={18} /> {t('common.back')}
      </button>

      {/* Profile completion banner */}
      {showProfileBanner && !result && (
        <Link
          to="/profile"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 active:bg-amber-500/20 transition-colors"
        >
          <User size={18} className="shrink-0" />
          <span>{t('aicoach.profile_banner')}</span>
          <ArrowUpRight size={16} className="ml-auto shrink-0" />
        </Link>
      )}

      {!result ? (
        <>
          {/* ── HEADER ─────────────────────────────────────── */}
          <div className="mb-6">
            <p className="label-caps mb-1">{t('aicoach.your_training')}</p>
            <h1 className="text-3xl font-black tracking-tight">
              {selectedSplit || t('aicoach.today')}
            </h1>
            {workoutHistory.length === 0 && settings.experienceLevel !== 'advanced' && (
              <p className="text-sm text-slate-400 mt-1">{t('aicoach.first_training')}</p>
            )}
            {workoutHistory.length === 0 && settings.experienceLevel === 'advanced' && (
              <p className="text-sm text-slate-400 mt-1">{t('aicoach.first_training_advanced')}</p>
            )}
            {workoutHistory.length > 0 && splitScores[0] && (
              <p className="text-sm text-slate-400 mt-1">{splitScores[0].reasoning}</p>
            )}
            {/* Warning for consecutive training <20h ago */}
            {lastWorkoutInfo && lastWorkoutInfo.hoursSince < 20 && (
              <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                {t('aicoach.trained_hours_ago', { hours: Math.round(lastWorkoutInfo.hoursSince) })}
              </p>
            )}
          </div>

          {/* ── BLOCK CONTEXT ──────────────────────────────── */}
          {block && phase && weekTarget && (
            <div className="mb-4 rounded-xl px-4 py-3" style={{background:'linear-gradient(135deg,rgba(6,182,212,0.08),rgba(6,182,212,0.02))', border:'1px solid rgba(6,182,212,0.2)'}}>
              <p className="text-xs text-cyan-400 font-semibold">{phase.label} · {t('plan.week')} {block.currentWeek}/{phase.weeks}</p>
              <p className="text-sm text-white mt-0.5">{weekTarget.isDeload ? t('aicoach.deload_hint') : `RPE ${weekTarget.rpe} · ${weekTarget.repRange[0]}-${weekTarget.repRange[1]} reps`}</p>
            </div>
          )}

          {/* ── TIME (enige verplichte keuze) ──────────────── */}
          <div className="mb-6">
            <p className="label-caps mb-3">{t('aicoach.how_long')}</p>
            <div className="flex gap-2">
              {[45, 60, 75, 90].map(tm => (
                <button key={tm} onClick={() => setTime(tm)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${time === tm ? 'bg-cyan-500 text-white' : 'bg-gray-900 text-slate-400 ring-1 ring-white/10'}`}>
                  {tm}m
                </button>
              ))}
            </div>
          </div>

          {/* ── GENERATE BUTTON ────────────────────────────── */}
          <button onClick={handleGenerate} disabled={generating || !selectedSplit} className="btn-primary mb-4 disabled:opacity-60">
            {generating ? t('common.loading') : t('aicoach.make_training')}
          </button>

          {/* ── ADVANCED OPTIONS (collapsed) ───────────────── */}
          <button onClick={() => setShowAdvanced(v => !v)}
            className="flex w-full items-center justify-between px-1 py-2 text-sm text-slate-500">
            <span>{t('aicoach.adjust')}</span>
            {showAdvanced ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-4">
              {/* Energie */}
              <div>
                <p className="label-caps mb-2">{t('aicoach.energy_today')}</p>
                <div className="flex gap-2">
                  {ENERGY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setEnergy(opt.value)}
                      className={`flex-1 rounded-xl py-2 text-sm font-bold ${energy === opt.value ? 'bg-cyan-500 text-white' : 'bg-gray-900 text-slate-400 ring-1 ring-white/10'}`}>
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Split kiezen */}
              {splitScores.length > 1 && (
                <div>
                  <p className="label-caps mb-2">{t('aicoach.training_type')}</p>
                  <div className="flex flex-wrap gap-2">
                    {splitScores.map(s => (
                      <button key={s.name} onClick={() => setSelectedSplit(s.name)}
                        className={`rounded-xl px-4 py-2 text-sm font-bold ${selectedSplit === s.name ? 'bg-cyan-500 text-white' : 'bg-gray-900 text-slate-400 ring-1 ring-white/10'}`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra focus */}
              <div>
                <p className="label-caps mb-2">{t('aicoach.want_extra')}</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_MUSCLES.map(m => (
                    <button key={m} onClick={() => toggleFocus(m)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold ${focusedMuscles.includes(m) ? 'bg-cyan-500 text-white' : 'bg-gray-900 text-slate-400 ring-1 ring-white/10'}`}>
                      {t(`muscles.${m}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recovery info */}
              {muscleStatus && (
                <div>
                  <p className="label-caps mb-3">{t('aicoach.recovery')}</p>
                  {ALL_MUSCLES.map(m => (
                    <RecoveryBar key={m} muscle={m} ms={muscleStatus[m] || { setsThisWeek: 0, target: { min: 10, max: 16 } }} t={t} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error state with retry */}
          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="mt-0.5 shrink-0 text-red-400" />
                <div className="flex-1">
                  {retryCount >= 2 ? (
                    <>
                      <p className="text-sm font-medium text-red-400">{t('aicoach.error')}</p>
                      <p className="mt-1 text-sm text-gray-400">{t('common.retry')}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-red-400">{t('aicoach.error')}</p>
                      <p className="mt-1 text-sm text-gray-500">{error}</p>
                      <button 
                        onClick={handleGenerate}
                        disabled={generating}
                        className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 active:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                        {t('aicoach.retry')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ══════════════════════════════
           RESULTS VIEW
           ══════════════════════════════ */
        <>
          <div className="mb-4">
            <p className="text-3xl font-black text-white">{result.split || selectedSplit}</p>
            <div className="mt-2 flex items-center gap-3">
              {result.estimated_duration_min && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-sm text-gray-400">
                  <Clock size={14} />
                  {result.estimated_duration_min} {t('aicoach.min')}
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-sm text-gray-400">
                <Flame size={14} className="text-cyan-500" />
                {result.exercises?.length || 0} {t('aicoach.exercises')}
              </div>
            </div>
          </div>

          {/* Reasoning */}
          {result.reasoning && (
            <div className="mb-4">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex w-full items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-400 ring-1 ring-gray-800"
              >
                <span>{t('aicoach.why_this_training')}</span>
                {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showReasoning && (
                <div className="mt-1 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-300">{result.reasoning}</p>
                </div>
              )}
            </div>
          )}

          {/* Exercises grouped by muscle */}
          {Object.entries(exercisesByMuscle).map(([muscle, exercises]) => (
            <div key={muscle} className="mb-5">
              <h3 className="mb-2 flex items-center gap-2 label-caps">
                <span className="h-px flex-1 bg-gray-800" />
                {muscle}
                <span className="h-px flex-1 bg-gray-800" />
              </h3>
              <div className="space-y-3">
                {exercises.map((ex, i) => {
                  const vsKey = (ex.vs_last_session || '').split(' ')[0]?.toLowerCase()
                  const vsInfo = VS_ICONS[vsKey] || VS_ICONS.new
                  const VsIcon = vsInfo.icon

                  return (
                    <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <p className="font-semibold text-white">{ex.name}</p>
                        <div className={`flex items-center gap-1 ${vsInfo.color}`}>
                          <VsIcon size={14} />
                          <span className="text-[10px]">{t(vsInfo.labelKey)}</span>
                        </div>
                      </div>

                      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg bg-gray-800 py-2">
                          <p className="text-lg font-bold text-white">{ex.sets}</p>
                          <p className="text-[10px] text-gray-500">{t('common.sets')}</p>
                        </div>
                        <div className="rounded-lg bg-gray-800 py-2">
                          <p className="text-lg font-bold text-white">{ex.reps_min}-{ex.reps_max}</p>
                          <p className="text-[10px] text-gray-500">{t('common.reps')}</p>
                        </div>
                        <div className="rounded-lg bg-cyan-500/15 py-2">
                          <p className="text-lg font-bold text-cyan-400">{ex.weight_kg}kg</p>
                          <p className="text-[10px] text-gray-500">{t('logger.weight')}</p>
                        </div>
                        <div className="rounded-lg bg-gray-800 py-2">
                          <p className="text-lg font-bold text-white">RPE {ex.rpe_target}</p>
                          <p className="text-[10px] text-gray-500">{t('logger.intensity')}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {ex.rest_seconds}s {t('aicoach.rest')}
                        </div>
                        {ex.vs_last_session && (
                          <span className="text-[10px] text-gray-600">{ex.vs_last_session}</span>
                        )}
                      </div>

                      {ex.notes && (
                        <p className="mt-2 border-t border-gray-800 pt-2 text-xs text-gray-400">{ex.notes}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Volume summary */}
          {result.volume_notes && (
            <div className="mb-4 rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-400 ring-1 ring-gray-800">
              <div className="flex items-start gap-2">
                <Flame size={14} className="mt-0.5 text-cyan-500 shrink-0" />
                <span>{result.volume_notes}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); handleGenerate() }}
              disabled={generating}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-900"
            >
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              {t('aicoach.regenerate')}
            </button>
            <button
              onClick={handleAccept}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-cyan-500 font-bold text-white active:scale-[0.97] transition-transform"
            >
              {t('aicoach.start_workout')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
