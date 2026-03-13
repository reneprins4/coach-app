import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Loader2, AlertCircle, ArrowUpRight, ArrowDownRight, Minus, Clock, Flame
} from 'lucide-react'
import { generateScientificWorkout } from '../lib/anthropic'
import { fetchRecentHistory } from '../hooks/useWorkouts'
import { analyzeTraining, scoreSplits, getRelevantHistory } from '../lib/training-analysis'
import { getSettings } from '../lib/settings'

const TIME_OPTIONS = [30, 45, 60, 90]
const ENERGY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-blue-400 bg-blue-500/15' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400 bg-yellow-500/15' },
  { value: 'high', label: 'High', color: 'text-red-400 bg-red-500/15' },
]

const STATUS_STYLES = {
  ready: { label: 'Ready', bg: 'bg-green-500/15', text: 'text-green-400', dot: 'bg-green-500' },
  recovering: { label: 'Recovering', bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  needs_work: { label: 'Needs Work', bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-500' },
  unknown: { label: 'No Data', bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-500' },
}

const VS_ICONS = {
  up: { icon: ArrowUpRight, color: 'text-green-400', label: 'Up' },
  same: { icon: Minus, color: 'text-gray-400', label: 'Same' },
  down: { icon: ArrowDownRight, color: 'text-red-400', label: 'Down' },
  new: { icon: Sparkles, color: 'text-orange-400', label: 'New' },
}

export default function AICoach() {
  const nav = useNavigate()
  const settings = getSettings()

  const [analyzing, setAnalyzing] = useState(true)
  const [workoutHistory, setWorkoutHistory] = useState([])
  const [muscleStatus, setMuscleStatus] = useState(null)
  const [splitScores, setSplitScores] = useState([])
  const [selectedSplit, setSelectedSplit] = useState(null)

  const [energy, setEnergy] = useState('medium')
  const [time, setTime] = useState(60)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [showReasoning, setShowReasoning] = useState(false)

  // Analyze on mount
  useEffect(() => {
    async function analyze() {
      setAnalyzing(true)
      try {
        const history = await fetchRecentHistory(21)
        setWorkoutHistory(history)
        const analysis = analyzeTraining(history)
        setMuscleStatus(analysis)
        const scores = scoreSplits(analysis)
        setSplitScores(scores)
        if (scores.length > 0) setSelectedSplit(scores[0].name)
      } catch (err) {
        console.error('Analysis failed:', err)
      }
      // Simulate minimum analysis time for UX
      setTimeout(() => setAnalyzing(false), 800)
    }
    analyze()
  }, [])

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

  // Analyzing screen
  if (analyzing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-4">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
        <p className="text-lg font-semibold text-white">Analyzing your training...</p>
        <p className="mt-1 text-sm text-gray-500">Reviewing last 3 weeks of data</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gray-950 px-4 py-6 pb-24">
      <button
        onClick={() => nav(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-gray-400 active:text-white"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <Sparkles size={28} className="text-orange-500" />
        <h1 className="text-2xl font-bold">AI Coach</h1>
      </div>

      {!result ? (
        <>
          {/* Muscle status cards */}
          <div className="mb-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-300">Muscle Status</h2>
            <div className="grid grid-cols-3 gap-2">
              {muscleStatus && Object.entries(muscleStatus).map(([muscle, ms]) => {
                const style = STATUS_STYLES[ms.status] || STATUS_STYLES.unknown
                return (
                  <div key={muscle} className={`rounded-lg ${style.bg} p-2.5`}>
                    <div className="mb-1 flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                      <span className="text-[10px] font-medium capitalize text-gray-300">{muscle}</span>
                    </div>
                    <p className={`text-[10px] ${style.text}`}>{style.label}</p>
                    <p className="text-[9px] text-gray-500">
                      {ms.setsThisWeek}/{ms.target.min}-{ms.target.max} sets
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recommended split — auto-selected, no user choice */}
          {selectedSplit && (
            <div className="mb-5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">Today's workout</p>
              <p className="mt-1 text-xl font-black text-white">{selectedSplit}</p>
              {splitScores[0] && (
                <p className="mt-1 text-xs text-gray-400">
                  {splitScores[0].reasoning || 'Optimal based on your recovery and weekly volume.'}
                </p>
              )}
            </div>
          )}

          {/* Energy level */}
          <div className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-300">Energy Level</h2>
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

          {/* Available time */}
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-300">Available Time</h2>
            <div className="flex gap-2">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setTime(t)}
                  className={`flex-1 rounded-xl py-3 text-sm font-medium transition-colors ${
                    time === t
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-900 text-gray-400 ring-1 ring-gray-800'
                  }`}
                >
                  {t}m
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-900/20 p-4">
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm text-red-400">{error}</p>
                <button onClick={handleGenerate} className="mt-2 text-sm font-medium text-orange-500">
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedSplit}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 text-lg font-bold text-white disabled:opacity-60 active:scale-[0.97] transition-transform"
          >
            {generating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating optimal workout...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate my workout
              </>
            )}
          </button>
        </>
      ) : (
        /* ============================
           RESULTS VIEW
           ============================ */
        <>
          {/* Split name */}
          <div className="mb-4 text-center">
            <p className="text-3xl font-black text-white">{result.split || selectedSplit}</p>
            {result.estimated_duration_min && (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gray-900 px-3 py-1 text-sm text-gray-400">
                <Clock size={14} />
                {result.estimated_duration_min} min
              </div>
            )}
          </div>

          {/* Reasoning (collapsible) */}
          {result.reasoning && (
            <div className="mb-4">
              <button
                onClick={() => setShowReasoning(!showReasoning)}
                className="flex w-full items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-400 ring-1 ring-gray-800"
              >
                <span>Coach reasoning</span>
                {showReasoning ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showReasoning && (
                <div className="mt-1 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
                  <p className="text-sm leading-relaxed text-gray-300">{result.reasoning}</p>
                </div>
              )}
            </div>
          )}

          {/* Exercise cards */}
          <div className="mb-4 space-y-3">
            {(result.exercises || []).map((ex, i) => {
              const vsKey = (ex.vs_last_session || '').split(' ')[0]?.toLowerCase()
              const vsInfo = VS_ICONS[vsKey] || VS_ICONS.new
              const VsIcon = vsInfo.icon

              return (
                <div key={i} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-white">{ex.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] capitalize text-gray-400">
                          {ex.muscle_group}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 ${vsInfo.color}`}>
                      <VsIcon size={14} />
                      <span className="text-[10px]">{vsInfo.label}</span>
                    </div>
                  </div>

                  <div className="mb-2 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">{ex.sets}</p>
                      <p className="text-[10px] text-gray-500">sets</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{ex.reps_min}-{ex.reps_max}</p>
                      <p className="text-[10px] text-gray-500">reps</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-orange-500">{ex.weight_kg}kg</p>
                      <p className="text-[10px] text-gray-500">weight</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">{ex.rpe_target}</p>
                      <p className="text-[10px] text-gray-500">RPE</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {ex.rest_seconds}s rest
                    </div>
                    {ex.vs_last_session && (
                      <span className="text-[10px]">{ex.vs_last_session}</span>
                    )}
                  </div>

                  {ex.notes && (
                    <p className="mt-2 border-t border-gray-800 pt-2 text-xs text-gray-400">{ex.notes}</p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Volume notes */}
          {result.volume_notes && (
            <div className="mb-4 rounded-xl bg-gray-900 px-4 py-3 text-sm text-gray-400 ring-1 ring-gray-800">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-orange-500" />
                <span>{result.volume_notes}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => { setResult(null); handleGenerate() }}
              disabled={generating}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-900"
            >
              <RefreshCw size={16} className={generating ? 'animate-spin' : ''} />
              Regenerate
            </button>
            <button
              onClick={handleAccept}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-orange-500 font-bold text-white active:scale-[0.97] transition-transform"
            >
              Accept
            </button>
          </div>
        </>
      )}
    </div>
  )
}
