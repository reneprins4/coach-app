import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sparkles, ChevronRight, Target, CalendarDays } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { analyzeTraining } from '../lib/training-analysis'
import { getCurrentBlock, getCurrentWeekTarget, getBlockProgress, PHASES } from '../lib/periodization'
import { getSettings } from '../lib/settings'
import PlateauAlert from '../components/PlateauAlert'
import DeloadAlert from '../components/DeloadAlert'

function e1rm(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

const MUSCLE_ORDER = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'core']

const MUSCLE_NL = {
  chest: 'Borst', back: 'Rug', shoulders: 'Schouders', biceps: 'Biceps',
  triceps: 'Triceps', quads: 'Quadriceps', hamstrings: 'Hamstrings', glutes: 'Billen', core: 'Core'
}

export default function Dashboard() {
  const { user } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)
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

    let streak = 0
    const dates = new Set(workouts.map(w => new Date(w.created_at).toISOString().split('T')[0]))
    const d = new Date()
    let check = d.toISOString().split('T')[0]
    if (!dates.has(check)) { d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0] }
    while (dates.has(check)) {
      streak++; d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0]
    }

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
    blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   bar: 'bg-blue-500',   border: 'border-blue-500/20' },
    orange: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', bar: 'bg-cyan-500', border: 'border-cyan-500/20' },
    red:    { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    bar: 'bg-cyan-500',    border: 'border-cyan-500/20' },
    gray:   { bg: 'bg-gray-500/10',   text: 'text-gray-400',   bar: 'bg-gray-500',   border: 'border-gray-500/20' },
  }
  const phaseColor = phaseColors[phase?.color || 'orange']

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
      </div>
    )
  }

  // Empty state for new users
  if (workouts.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-3 text-2xl font-bold text-white">{getGreeting()}</h1>
        <p className="mb-8 text-sm text-gray-500">
          Je hebt nog geen trainingen.<br />
          Laten we beginnen.
        </p>
        <button
          onClick={() => nav('/log')}
          className="mb-4 w-full max-w-xs rounded-xl bg-cyan-500 px-6 py-4 font-bold text-white transition-colors active:bg-cyan-600"
        >
          Start eerste training
        </button>
        <p className="mb-3 text-xs text-gray-600">Of laat de AI een plan maken</p>
        <button
          onClick={() => nav('/coach')}
          className="w-full max-w-xs rounded-xl bg-gray-900 px-6 py-4 font-semibold text-white ring-1 ring-gray-800 transition-colors active:bg-gray-800"
        >
          Maak trainingsplan
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28">

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{getDayName()}</p>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}{settings.name ? `, ${settings.name}` : ''}
        </h1>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-4 gap-2">
        {[
          { value: stats.thisWeekCount, label: 'Trainingen' },
          { value: formatVolume(stats.weekVolume), label: 'Volume' },
          { value: stats.streak, label: 'Reeks' },
          { value: stats.daysSince ?? '--', label: 'Dagen terug' },
        ].map(({ value, label }) => (
          <div key={label} className="rounded-xl bg-gray-900 p-3 text-center">
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Kalender link */}
      <Link to="/calendar" className="mb-4 flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-3">
          <CalendarDays size={18} className="text-gray-400" />
          <span className="text-sm font-medium text-white">Trainingskalender</span>
        </div>
        <ChevronRight size={16} className="text-gray-600" />
      </Link>

      {/* Plateau alerts */}
      <PlateauAlert workouts={workouts} maxItems={3} />

      {/* Deload alert — vermoeidheidsdetectie */}
      {workouts.length >= 4 && <DeloadAlert workouts={workouts} />}

      {/* Actief trainingsblok */}
      {block && phase ? (
        <div className={`mb-4 rounded-xl border ${phaseColor.border} ${phaseColor.bg} p-4`}>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className={`text-[10px] font-semibold uppercase tracking-widest ${phaseColor.text}`}>{phase.label}</p>
              <p className="text-sm font-semibold text-white">
                Week {progress?.currentWeek} van {progress?.totalWeeks}
              </p>
            </div>
            <Link to="/plan" className={`text-xs font-medium ${phaseColor.text}`}>
              Bekijk plan <ChevronRight size={12} className="inline" />
            </Link>
          </div>
          {weekTarget && (
            <p className="mb-2 text-xs text-gray-400">
              {weekTarget.isDeload
                ? 'Deload week'
                : `Doel RPE ${weekTarget.rpe} · ${weekTarget.repRange[0]}-${weekTarget.repRange[1]} herh.`}
            </p>
          )}
          <div className="h-1 overflow-hidden rounded-full bg-gray-800">
            <div className={`h-full rounded-full ${phaseColor.bar} transition-all`}
              style={{ width: `${progress?.pct || 0}%` }} />
          </div>
        </div>
      ) : (
        <Link
          to="/plan"
          className="mb-4 flex items-center gap-3 rounded-xl border border-dashed border-gray-700 bg-gray-900 p-4"
        >
          <Target size={18} className="text-gray-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Geen trainingsplan actief</p>
            <p className="text-xs text-gray-500">Start een 4-weekse blok voor gestructureerde periodisering</p>
          </div>
          <ChevronRight size={16} className="text-gray-600" />
        </Link>
      )}

      {/* Spierherstel */}
      <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Spierherstel</p>
          <Link to="/coach" className="text-xs font-medium text-cyan-500">Nu trainen</Link>
        </div>
        <div className="space-y-2.5">
          {MUSCLE_ORDER.map(muscle => {
            const ms = muscleStatus[muscle]
            if (!ms) return null
            const pct = ms.recoveryPct || 0
            let barColor = 'bg-green-500'
            let textColor = 'text-green-400'
            if (pct < 50) { barColor = 'bg-cyan-500'; textColor = 'text-cyan-400' }
            else if (pct < 90) { barColor = 'bg-yellow-500'; textColor = 'text-yellow-400' }

            return (
              <div key={muscle}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-300">{MUSCLE_NL[muscle] || muscle}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600">{ms.setsThisWeek}/{ms.target.min} sets</span>
                    <span className={`text-[10px] font-bold tabular-nums ${textColor}`}>{pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex gap-4 text-[10px] text-gray-600">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Gereed</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />Herstellend</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />Vermoeid</span>
        </div>
      </div>

      {/* Wekelijks volume */}
      <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Wekelijks volume</p>
          <span className="text-[10px] text-gray-600">sets / doel</span>
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
                <span className="w-24 text-[11px] text-gray-400">{MUSCLE_NL[muscle] || muscle}</span>
                <div className="relative flex-1 h-1.5 overflow-hidden rounded-full bg-gray-800">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-cyan-500' : hit ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`w-10 text-right text-[10px] tabular-nums ${over ? 'text-cyan-400' : hit ? 'text-green-400' : 'text-gray-600'}`}>
                  {ms.setsThisWeek}/{ms.target.min}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Persoonlijke records */}
      {stats.recentPRs.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Persoonlijke records</p>
          <div className="space-y-2">
            {stats.recentPRs.map(pr => (
              <div key={pr.name} className="flex items-center justify-between">
                <span className="text-sm text-white">{pr.name}</span>
                <span className="text-sm font-bold tabular-nums text-cyan-500">{pr.weight}kg x {pr.reps}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => nav('/coach')}
        className="flex h-14 w-full items-center gap-4 rounded-xl bg-cyan-500 px-5 text-left transition-colors active:bg-cyan-600"
      >
        <Sparkles size={20} className="text-white shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-white">Genereer training van vandaag</p>
          <p className="text-xs text-cyan-200">AI personaliseert op basis van jouw herstel</p>
        </div>
        <ChevronRight size={18} className="text-cyan-200 shrink-0" />
      </button>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Goedemorgen'
  if (h < 17) return 'Goedemiddag'
  return 'Goedenavond'
}

function getDayName() {
  return ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'][new Date().getDay()]
}

function formatVolume(kg) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
