import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, TrendingUp, Calendar, Award, Sparkles, ChevronRight, Target, BarChart2 } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'
import { analyzeTraining, SET_TARGETS } from '../lib/training-analysis'
import { getCurrentBlock, getCurrentWeekTarget, getBlockProgress, PHASES } from '../lib/periodization'
import { getSettings } from '../lib/settings'

function e1rm(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

const MUSCLE_ORDER = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'core']

function RecoveryDot({ pct }) {
  if (pct >= 90) return <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
  if (pct >= 50) return <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
  return <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
}

export default function Dashboard() {
  const { workouts, loading } = useWorkouts()
  const settings = getSettings()
  const nav = useNavigate()

  const { stats, muscleStatus } = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    const thisWeek = workouts.filter(w => new Date(w.created_at) >= weekStart)
    const weekVolume = thisWeek.reduce((s, w) => s + (w.totalVolume || 0), 0)

    const lastWorkout = workouts[0]
    const daysSince = lastWorkout
      ? Math.floor((now.getTime() - new Date(lastWorkout.created_at).getTime()) / 86400000)
      : null

    // Streak
    let streak = 0
    const dates = new Set(workouts.map(w => new Date(w.created_at).toISOString().split('T')[0]))
    const d = new Date()
    let check = d.toISOString().split('T')[0]
    if (!dates.has(check)) { d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0] }
    while (dates.has(check)) {
      streak++; d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0]
    }

    // Recent PRs
    const prWindow = new Date(now); prWindow.setDate(now.getDate() - 7)
    const allSets = workouts.flatMap(w => (w.workout_sets || []).map(s => ({ ...s, workout_date: w.created_at })))
    const exerciseBest = {}
    for (const s of allSets) {
      const val = e1rm(s.weight_kg || 0, s.reps || 0)
      if (!exerciseBest[s.exercise] || val > exerciseBest[s.exercise].best) {
        exerciseBest[s.exercise] = { best: val, date: s.workout_date, weight: s.weight_kg, reps: s.reps }
      }
    }
    const recentPRs = Object.entries(exerciseBest)
      .filter(([, v]) => new Date(v.date) >= prWindow)
      .map(([name, v]) => ({ name, ...v })).slice(0, 3)

    const ms = analyzeTraining(workouts.slice(0, 30))

    return {
      stats: { thisWeekCount: thisWeek.length, weekVolume, daysSince, streak, recentPRs },
      muscleStatus: ms,
    }
  }, [workouts])

  const block = getCurrentBlock()
  const weekTarget = block ? getCurrentWeekTarget(block) : null
  const progress = block ? getBlockProgress(block) : null
  const phase = block ? PHASES[block.phase] : null

  const phaseColors = {
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', bar: 'bg-blue-500', border: 'border-blue-500/30' },
    orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', bar: 'bg-orange-500', border: 'border-orange-500/30' },
    red: { bg: 'bg-red-500/15', text: 'text-red-400', bar: 'bg-red-500', border: 'border-red-500/30' },
    gray: { bg: 'bg-gray-500/15', text: 'text-gray-400', bar: 'bg-gray-500', border: 'border-gray-500/30' },
  }
  const phaseColor = phaseColors[phase?.color || 'orange']

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-24">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold">
          Good {getTimeOfDay()}{settings.name ? `, ${settings.name}` : ''}
        </h1>
        <p className="text-gray-400">{getDayName()} — let's get after it</p>
      </div>

      {/* Training Plan Block */}
      {block && phase ? (
        <div className={`mb-4 rounded-xl border ${phaseColor.border} ${phaseColor.bg} p-4`}>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{phase.emoji}</span>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wider ${phaseColor.text}`}>Active Plan</p>
                <p className="font-bold text-white">{phase.label}</p>
              </div>
            </div>
            <Link to="/plan" className={`text-xs ${phaseColor.text}`}>
              View plan <ChevronRight size={12} className="inline" />
            </Link>
          </div>
          {weekTarget && (
            <div className="mb-2 text-xs text-gray-400">
              Week {progress?.currentWeek}/{progress?.totalWeeks} · {weekTarget.isDeload ? '🔄 Deload week' : `Target RPE ${weekTarget.rpe} · ${weekTarget.repRange[0]}-${weekTarget.repRange[1]} reps`}
            </div>
          )}
          <div className="relative h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div className={`absolute inset-y-0 left-0 rounded-full ${phaseColor.bar}`}
              style={{ width: `${progress?.pct || 0}%` }} />
          </div>
        </div>
      ) : (
        <Link
          to="/plan"
          className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4"
        >
          <Target size={20} className="text-gray-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-300">No training plan active</p>
            <p className="text-xs text-gray-600">Start a 4-week block for structured periodization</p>
          </div>
          <ChevronRight size={16} className="text-gray-600" />
        </Link>
      )}

      {/* Muscle Recovery Map */}
      <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">Muscle Recovery</h2>
          <Link to="/coach" className="text-xs text-orange-500">Train now →</Link>
        </div>
        <div className="space-y-2">
          {MUSCLE_ORDER.map(muscle => {
            const ms = muscleStatus[muscle]
            if (!ms) return null
            const pct = ms.recoveryPct || 0
            let barColor = 'bg-green-500'
            if (pct < 50) barColor = 'bg-red-500'
            else if (pct < 90) barColor = 'bg-yellow-500'

            return (
              <div key={muscle}>
                <div className="mb-0.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <RecoveryDot pct={pct} />
                    <span className="text-xs font-medium capitalize text-gray-300">{muscle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">
                      {ms.setsThisWeek}/{ms.target.min} sets
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400">{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex gap-3 text-[10px] text-gray-600">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Ready</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" />Recovering</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Fatigued</span>
        </div>
      </div>

      {/* Weekly Volume */}
      <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">Weekly Volume</h2>
          <span className="text-xs text-gray-600">sets / target</span>
        </div>
        <div className="space-y-2">
          {MUSCLE_ORDER.map(muscle => {
            const ms = muscleStatus[muscle]
            if (!ms) return null
            const pct = Math.min(100, (ms.setsThisWeek / ms.target.min) * 100)
            const over = ms.setsThisWeek >= ms.target.max
            const hit = ms.setsThisWeek >= ms.target.min
            return (
              <div key={muscle} className="flex items-center gap-2">
                <span className="w-20 text-[11px] capitalize text-gray-400">{muscle}</span>
                <div className="relative flex-1 h-2 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-orange-500' : hit ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`w-12 text-right text-[10px] ${over ? 'text-orange-400' : hit ? 'text-green-400' : 'text-gray-600'}`}>
                  {ms.setsThisWeek}/{ms.target.min}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-gray-900 p-3 text-center">
          <p className="text-xl font-bold text-white">{stats.thisWeekCount}</p>
          <p className="text-[10px] text-gray-500">workouts</p>
        </div>
        <div className="rounded-xl bg-gray-900 p-3 text-center">
          <p className="text-xl font-bold text-white">{formatVolume(stats.weekVolume)}</p>
          <p className="text-[10px] text-gray-500">volume</p>
        </div>
        <div className="rounded-xl bg-gray-900 p-3 text-center">
          <p className="text-xl font-bold text-white">{stats.streak}</p>
          <p className="text-[10px] text-gray-500">streak</p>
        </div>
        <div className="rounded-xl bg-gray-900 p-3 text-center">
          <p className="text-xl font-bold text-white">{stats.daysSince ?? '--'}</p>
          <p className="text-[10px] text-gray-500">days ago</p>
        </div>
      </div>

      {/* Recent PRs */}
      {stats.recentPRs.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-300">Personal Records This Week 🏆</h2>
          <div className="space-y-2">
            {stats.recentPRs.map(pr => (
              <div key={pr.name} className="flex items-center justify-between">
                <span className="text-sm text-white">{pr.name}</span>
                <span className="text-sm font-bold text-orange-500">{pr.weight}kg × {pr.reps}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate workout CTA */}
      <button
        onClick={() => nav('/coach')}
        className="flex h-16 w-full items-center gap-4 rounded-2xl bg-orange-500 px-5 text-left transition-colors active:bg-orange-600"
      >
        <Sparkles size={26} className="text-white shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-white">Generate today's workout</p>
          <p className="text-sm text-orange-200">AI personalizes based on your recovery</p>
        </div>
        <ChevronRight size={20} className="text-orange-200 shrink-0" />
      </button>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function getDayName() {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()]
}

function formatVolume(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
