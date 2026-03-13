import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Minus, Clock, Flame, Target
} from 'lucide-react'
import { generateScientificWorkout } from '../lib/anthropic'
import { fetchRecentHistory } from '../hooks/useWorkouts'
import { analyzeTraining, scoreSplits, getRelevantHistory, calcMuscleRecovery } from '../lib/training-analysis'
import { getSettings } from '../lib/settings'
import { getCurrentBlock, getCurrentWeekTarget, PHASES } from '../lib/periodization'
import { useAuthContext } from '../App'

const TIME_OPTIONS = [45, 60, 75, 90]

const ENERGY_OPTIONS = [
  { value: 'low', label: 'Laag', color: 'text-blue-400 bg-blue-500/15' },
  { value: 'medium', label: 'Gemiddeld', color: 'text-yellow-400 bg-yellow-500/15' },
  { value: 'high', label: 'Hoog', color: 'text-red-400 bg-red-500/15' },
]

const VS_ICONS = {
  up: { icon: ArrowUpRight, color: 'text-green-400', label: 'Omhoog' },
  same: { icon: Minus, color: 'text-gray-400', label: 'Zelfde' },
  down: { icon: ArrowDownRight, color: 'text-red-400', label: 'Omlaag' },
  new: { icon: Sparkles, color: 'text-red-400', label: 'Nieuw' },
}

const ALL_MUSCLES = ['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'biceps', 'triceps', 'core']

// Use imported calcMuscleRecovery from training-analysis
function calcRecovery(muscle, ms) {
  return calcMuscleRecovery(muscle, ms.hoursSinceLastTrained, ms.avgRpeLastSession, ms.setsLastSession)
}

function RecoveryBar({ muscle, ms }) {
  const recovery = ms.recoveryPct ?? calcRecovery(muscle, ms)
  const isOverTrained = ms.setsThisWeek >= ms.target.max
  const effectiveRecovery = isOverTrained ? Math.min(recovery, 60) : recovery

  let barColor = 'bg-green-500'
  let textColor = 'text-green-400'
  if (effectiveRecovery < 50) { barColor = 'bg-red-500'; textColor = 'text-red-400' }
  else if (effectiveRecovery < 80) { barColor = 'bg-yellow-500'; textColor = 'text-yellow-400' }

  const label = effectiveRecovery >= 90 ? 'Gereed' : effectiveRecovery >= 50 ? 'Herstellend' : 'Vermoeid'

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium capitalize text-gray-300">{muscle}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{ms.setsThisWeek}/{ms.target.min}-{ms.target.max} sets</span>
          <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
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

// Weekly plan based on frequency
const WEEK_PLANS = {
  '3x': ['Push', 'Pull', 'Legs'],
  '4x': ['Push', 'Pull', 'Legs', 'Upper'],
  '5x': ['Push', 'Pull', 'Legs', 'Push', 'Pull'],
  '6x': ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs'],
}

export default function AICoach() {
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
  const [result, setResult] = useState(null)
  const [showReasoning, setShowReasoning] = useState(false)
  const [showRecovery, setShowRecovery] = useState(true)
  const [showWeekPlan, setShowWeekPlan] = useState(false)

  useEffect(() => {
    async function analyze() {
      setAnalyzing(true)
      try {
        const history = await fetchRecentHistory(user?.id, 21)
        setWorkoutHistory(history)
        const analysis = analyzeTraining(history)
        setMuscleStatus(analysis)
        const scores = scoreSplits(analysis)
        setSplitScores(scores)
        if (scores.length > 0) setSelectedSplit(scores[0].name)
      } catch (err) {
        console.error('Analysis failed:', err)
      }
      setTimeout(() => setAnalyzing(false), 800)
    }
    analyze()
  }, [user?.id])

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
      const workout = await generateScientificWorkout({
        muscleStatus,
        recommendedSplit: selectedSplit,
        recentHistory: relevantHistory,
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
    } catch (err) {
      setError(err.message)
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

  if (analyzing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-4">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-red-500" />
        <p className="text-lg font-semibold text-white">Training analyseren...</p>
        <p className="mt-1 text-sm text-gray-500">Laatste 3 weken data doornemen</p>
      </div>
    )
  }

  const weekPlan = WEEK_PLANS[settings.frequency] || WEEK_PLANS['4x']
  const todayIndex = new Date().getDay() // 0=Sun, use Mon as day 1
  const planDayIndex = ((todayIndex + 6) % 7) % weekPlan.length // Mon=0

  return (
    <div className="min-h-dvh bg-gray-950 px-4 py-6 pb-28">
      <button
        onClick={() => nav(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-gray-400 active:text-white"
      >
        <ArrowLeft size={18} /> Terug
      </button>

      <div className="mb-6 flex items-center gap-3">
        <Sparkles size={28} className="text-red-500" />
        <h1 className="text-2xl font-bold">AI Coach</h1>
      </div>

      {!result ? (
        <>
          {/* ── RECOVERY SECTION ───────────────────────────── */}
          <div className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-4">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setShowRecovery(v => !v)}
            >
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Spierherstel</h2>
              {showRecovery ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>

            {showRecovery && muscleStatus && (
              <div className="mt-4">
                {ALL_MUSCLES.map(m => (
                  <RecoveryBar key={m} muscle={m} ms={muscleStatus[m] || { setsThisWeek: 0, target: { min: 10, max: 16 }, daysSinceLastTrained: null, avgRpeLastSession: null }} />
                ))}
              </div>
            )}
          </div>

          {/* ── WEEK PLAN ───────────────────────────────────── */}
          <div className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-4">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setShowWeekPlan(v => !v)}
            >
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Weekstructuur</h2>
              {showWeekPlan ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>

            {showWeekPlan && (
              <div className="mt-3 flex gap-1.5">
                {weekPlan.map((split, i) => (
                  <div
                    key={i}
                    className={`flex flex-1 flex-col items-center rounded-lg py-2 text-center ${
                      i === planDayIndex
                        ? 'bg-red-500/20 ring-1 ring-red-500/50'
                        : 'bg-gray-800'
                    }`}
                  >
                    <span className={`text-[9px] font-medium uppercase tracking-wider ${i === planDayIndex ? 'text-red-400' : 'text-gray-500'}`}>
                      Dag {i + 1}
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 ${i === planDayIndex ? 'text-white' : 'text-gray-400'}`}>
                      {split}
                    </span>
                    {i === planDayIndex && (
                      <span className="mt-1 text-[8px] text-red-400">Vandaag</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── BLOCK CONTEXT ──────────────────────────────── */}
          {block && phase && weekTarget && (
            <div className={`mb-4 rounded-xl border border-${phase.color === 'gray' ? 'gray' : phase.color}-500/30 bg-${phase.color === 'gray' ? 'gray' : phase.color}-500/10 px-4 py-3`}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {phase.label} · Week {block.currentWeek}/{phase.weeks}
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {weekTarget.isDeload ? 'Deload — rustige training vandaag' : `RPE ${weekTarget.rpe} · ${weekTarget.repRange[0]}-${weekTarget.repRange[1]} reps`}
              </p>
              <p className="text-xs text-gray-500">{weekTarget.setNote}</p>
            </div>
          )}

          {/* ── TODAY'S SPLIT ───────────────────────────────── */}
          {selectedSplit && (
            <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Vandaag aanbevolen</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xl font-black text-white">{selectedSplit}</p>
                {splitScores.length > 1 && (
                  <select
                    value={selectedSplit}
                    onChange={e => setSelectedSplit(e.target.value)}
                    className="rounded-lg bg-gray-800 px-2 py-1 text-xs text-gray-300 outline-none"
                  >
                    {splitScores.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {splitScores[0] && (
                <p className="mt-1 text-xs text-gray-400">{splitScores[0].reasoning}</p>
              )}
            </div>
          )}

          {/* ── MUSCLE FOCUS ────────────────────────────────── */}
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2">
              <Target size={14} className="text-red-500" />
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Extra focus <span className="normal-case font-normal">(optioneel)</span></h2>
            </div>
            <p className="mb-2 text-xs text-gray-600">Tik op spieren om te benadrukken in de training</p>
            <div className="flex flex-wrap gap-2">
              {ALL_MUSCLES.map(m => {
                const ms = muscleStatus?.[m]
                const recovery = ms ? (ms.recoveryPct ?? calcRecovery(m, ms)) : 100
                const focused = focusedMuscles.includes(m)
                return (
                  <button
                    key={m}
                    onClick={() => toggleFocus(m)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition-colors ${
                      focused
                        ? 'bg-red-500 text-white'
                        : recovery < 50
                        ? 'bg-red-500/10 text-red-400 ring-1 ring-red-500/30'
                        : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                    }`}
                  >
                    {m}
                    {focused && <span className="ml-1 text-red-200">★</span>}
                  </button>
                )
              })}
            </div>
            {focusedMuscles.length > 0 && (
              <p className="mt-2 text-xs text-red-400">
                AI voegt extra sets toe voor: {focusedMuscles.join(', ')}
              </p>
            )}
          </div>

          {/* ── ENERGY ──────────────────────────────────────── */}
          <div className="mb-4">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Energieniveau</h2>
            <div className="flex gap-2">
              {ENERGY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEnergy(opt.value)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                    energy === opt.value
                      ? opt.color + ' ring-1 ring-current'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── TIME ────────────────────────────────────────── */}
          <div className="mb-6">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Beschikbare tijd</h2>
            <div className="flex gap-2">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                    time === t
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-900/20 p-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={handleGenerate} className="mt-2 text-sm font-medium text-red-500">Probeer opnieuw</button>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedSplit}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-500 text-lg font-bold text-white disabled:opacity-60 active:scale-[0.97] transition-transform"
          >
            {generating ? (
              <><Loader2 size={20} className="animate-spin" />Training genereren...</>
            ) : (
              <><Sparkles size={20} />Genereer mijn training</>
            )}
          </button>
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
                  {result.estimated_duration_min} min
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-sm text-gray-400">
                <Flame size={14} className="text-red-500" />
                {result.exercises?.length || 0} oefeningen
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
                <span>Motivatie coach</span>
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
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
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
                          <span className="text-[10px]">{vsInfo.label}</span>
                        </div>
                      </div>

                      <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-lg bg-gray-800 py-2">
                          <p className="text-lg font-bold text-white">{ex.sets}</p>
                          <p className="text-[10px] text-gray-500">sets</p>
                        </div>
                        <div className="rounded-lg bg-gray-800 py-2">
                          <p className="text-lg font-bold text-white">{ex.reps_min}-{ex.reps_max}</p>
                          <p className="text-[10px] text-gray-500">herh.</p>
                        </div>
                        <div className="rounded-lg bg-red-500/15 py-2">
                          <p className="text-lg font-bold text-red-400">{ex.weight_kg}kg</p>
                          <p className="text-[10px] text-gray-500">gewicht</p>
                        </div>
                        <div className="rounded-lg bg-gray-800 py-2">
                          <p className="text-lg font-bold text-white">RPE {ex.rpe_target}</p>
                          <p className="text-[10px] text-gray-500">intensiteit</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          {ex.rest_seconds}s rust
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
                <Flame size={14} className="mt-0.5 text-red-500 shrink-0" />
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
              Opnieuw genereren
            </button>
            <button
              onClick={handleAccept}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-red-500 font-bold text-white active:scale-[0.97] transition-transform"
            >
              Start training
            </button>
          </div>
        </>
      )}
    </div>
  )
}
