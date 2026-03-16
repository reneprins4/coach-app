import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Award, TrendingUp, Trophy, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import FormDetective from '../components/FormDetective'
import WeaknessHunter from '../components/WeaknessHunter'
import PerformanceForecast from '../components/PerformanceForecast'
import VolumeChart from '../components/VolumeChart'
import { computeAllPRs, sortPRsForDisplay } from '../lib/prDetector'
import { groupVolumeByWeek, groupVolumeByMonth, groupVolumeByMuscle, calcTrend, calcAvgWeeklyVolume, findBestWeek } from '../lib/volumeTracker'

function e1rm(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']
const MG_COLORS = { chest: '#ef4444', back: '#3b82f6', legs: '#22c55e', shoulders: '#eab308', arms: '#a855f7', core: '#06b6d4' }

function getMuscleGroup(name) {
  const l = name.toLowerCase()
  if (/bench|chest|fly|dip|push.?up/.test(l)) return 'chest'
  if (/squat|leg|lunge|hip|calf|extension|curl(?!.*(bicep|hammer|dumbbell))/.test(l)) return 'legs'
  if (/dead|row|pull|lat|back/.test(l)) return 'back'
  if (/press(?!.*bench)|shoulder|lateral|raise|face|shrug/.test(l)) return 'shoulders'
  if (/curl|bicep|tricep|hammer|skull|pushdown/.test(l)) return 'arms'
  if (/plank|ab|crunch|core/.test(l)) return 'core'
  return null
}

const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#6b7280' },
  itemStyle: { color: '#e5e7eb' },
}

export default function Progress() {
  const { t, i18n } = useTranslation()
  const { user, settings } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)
  const [tab, setTab] = useState('exercise')
  const [query, setQuery] = useState('')
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [volumePeriod, setVolumePeriod] = useState('12w')

  const TABS = [
    { id: 'exercise', label: t('progress.tab_exercise') },
    { id: 'volume',   label: t('volume.tab') },
    { id: 'muscle',   label: t('progress.tab_muscle') },
    { id: 'records',  label: t('pr.tab') },
    { id: 'analyse',  label: t('progress.tab_analyse') },
    { id: 'balans',   label: t('progress.tab_balance') },
  ]

  const exerciseNames = useMemo(() => {
    const names = new Set()
    workouts.forEach(w => (w.workout_sets || []).forEach(s => names.add(s.exercise)))
    return [...names].sort()
  }, [workouts])

  const filteredNames = useMemo(() => {
    if (!query.trim()) return exerciseNames
    const lower = query.toLowerCase()
    return exerciseNames.filter(n => n.toLowerCase().includes(lower))
  }, [exerciseNames, query])

  const exerciseData = useMemo(() => {
    if (!selectedExercise) return null
    const sessions = []
    const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-US'
    for (const w of [...workouts].reverse()) {
      const sets = (w.workout_sets || []).filter(s => s.exercise === selectedExercise)
      if (sets.length === 0) continue
      const bestE1rm = sets.length > 0 ? Math.max(...sets.map(s => e1rm(s.weight_kg || 0, s.reps || 0))) : 0
      const bestWeight = sets.length > 0 ? Math.max(...sets.map(s => s.weight_kg || 0)) : 0
      const volume = sets.reduce((s, x) => s + (x.weight_kg || 0) * (x.reps || 0), 0)
      const date = new Date(w.created_at).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
      sessions.push({ date, e1rm: bestE1rm, bestWeight, volume, sets, fullDate: w.created_at })
    }
    const allTimeE1rm = sessions.length > 0 ? Math.max(...sessions.map(s => s.e1rm)) : 0
    return { sessions, allTimeE1rm }
  }, [workouts, selectedExercise, i18n.language])

  const muscleData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay() - (3 - i) * 7)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 7)
      const entry = { week: `W${i + 1}` }
      const weekWorkouts = workouts.filter(w => {
        const d = new Date(w.created_at)
        return d >= weekStart && d < weekEnd
      })
      for (const mg of MUSCLE_GROUPS) {
        let vol = 0
        for (const w of weekWorkouts)
          for (const s of (w.workout_sets || []))
            if (getMuscleGroup(s.exercise) === mg)
              vol += (s.weight_kg || 0) * (s.reps || 0)
        entry[mg] = Math.round(vol)
      }
      return entry
    })
  }, [workouts])

  const totalStats = useMemo(() => {
    const totalWorkouts = workouts.length
    const totalVol = workouts.reduce((s, w) => s + (w.totalVolume || 0), 0)
    const counts = {}
    workouts.forEach(w => (w.workout_sets || []).forEach(s => {
      counts[s.exercise] = (counts[s.exercise] || 0) + 1
    }))
    const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    return { totalWorkouts, totalVol, favorite: favorite?.[0] || '—' }
  }, [workouts])

  // Compute all-time PRs for Records tab
  const allPRs = useMemo(() => {
    const prsMap = computeAllPRs(workouts)
    return sortPRsForDisplay(prsMap)
  }, [workouts])

  // Group PRs by muscle group for display
  const prsByMuscle = useMemo(() => {
    const grouped = {}
    for (const pr of allPRs) {
      const mg = pr.muscleGroup || 'other'
      if (!grouped[mg]) grouped[mg] = []
      grouped[mg].push(pr)
    }
    return grouped
  }, [allPRs])

  // Volume tracking data
  const volumeData = useMemo(() => {
    if (volumePeriod === '6m') {
      return groupVolumeByMonth(workouts, 6)
    } else if (volumePeriod === '4w') {
      return groupVolumeByWeek(workouts, 4)
    } else {
      return groupVolumeByWeek(workouts, 12)
    }
  }, [workouts, volumePeriod])

  const volumeStats = useMemo(() => {
    const weeklyData = groupVolumeByWeek(workouts, 12)
    const trend = calcTrend(weeklyData, 4)
    const avgVolume = calcAvgWeeklyVolume(weeklyData)
    const best = findBestWeek(weeklyData)
    const weeksForMuscle = volumePeriod === '4w' ? 4 : volumePeriod === '6m' ? 26 : 12
    const muscleBreakdown = groupVolumeByMuscle(workouts, weeksForMuscle)
    return { trend, avgVolume, best, muscleBreakdown }
  }, [workouts, volumePeriod])

  // Muscle breakdown for volume tab (sorted by sets)
  const muscleSorted = useMemo(() => {
    const breakdown = volumeStats.muscleBreakdown
    const entries = Object.entries(breakdown)
    if (entries.length === 0) return []
    const max = Math.max(...entries.map(([, v]) => v))
    return entries
      .map(([key, sets]) => ({ key, sets, pct: max > 0 ? Math.round((sets / max) * 100) : 0 }))
      .sort((a, b) => b.sets - a.sets)
  }, [volumeStats.muscleBreakdown])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28">
      {/* Header */}
      <div className="mb-6">
        <p className="label-caps mb-1">{t('progress.stats')}</p>
        <h1 className="text-3xl font-black tracking-tight text-white">{t('progress.title')}</h1>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-2xl bg-gray-900 p-1">
        {TABS.map(tabItem => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${
              tab === tabItem.id
                ? 'bg-white text-black shadow-sm'
                : 'text-gray-500 active:text-gray-300'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* ── Per oefening ──────────────────────────────────────────── */}
      {tab === 'exercise' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedExercise(null) }}
              placeholder={t('progress.search_exercise')}
              className="h-12 w-full rounded-2xl bg-gray-900 pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
            />
          </div>

          {!selectedExercise && (
            <div className="divide-y divide-gray-800/60 rounded-2xl bg-gray-900 overflow-hidden">
              {filteredNames.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-600">{t('progress.no_exercises')}</p>
              ) : (
                filteredNames.map(name => {
                  const mg = getMuscleGroup(name)
                  return (
                    <button
                      key={name}
                      onClick={() => { setSelectedExercise(name); setQuery(name) }}
                      className="flex w-full items-center justify-between px-4 py-3.5 active:bg-gray-800/80"
                    >
                      <span className="text-sm text-white">{name}</span>
                      {mg && (
                        <span className="label-caps">{t(`muscles.${mg}`)}</span>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          )}

          {selectedExercise && exerciseData && (
            <div className="space-y-4">
              {/* All-time PR */}
              <div className="flex items-center gap-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/8 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
                  <Award size={22} className="text-cyan-400" />
                </div>
                <div>
                  <p className="label-caps text-cyan-600">{t('progress.all_time_e1rm')}</p>
                  <p className="text-3xl font-black tracking-tight text-white">
                    {exerciseData.allTimeE1rm.toFixed(1)}
                    <span className="ml-1 text-lg font-semibold text-gray-400">kg</span>
                  </p>
                </div>
              </div>

              {exerciseData.sessions.length > 1 && (
                <>
                  {/* E1RM trend */}
                  <div className="rounded-2xl bg-gray-900 p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <TrendingUp size={15} className="text-orange-400" />
                      <p className="label-caps">{t('progress.estimated_1rm')}</p>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={exerciseData.sessions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} width={32} />
                        <Tooltip {...CHART_TOOLTIP_STYLE} />
                        <Line type="monotone" dataKey="e1rm" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Volume */}
                  <div className="rounded-2xl bg-gray-900 p-4">
                    <p className="label-caps mb-4">{t('progress.volume_per_session')}</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={exerciseData.sessions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} width={32} />
                        <Tooltip {...CHART_TOOLTIP_STYLE} />
                        <Bar dataKey="volume" fill="#f97316" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* Performance forecast */}
              <PerformanceForecast sessions={exerciseData.sessions} exerciseName={selectedExercise} />

              {/* Recent sessions */}
              <div className="rounded-2xl bg-gray-900 overflow-hidden">
                <p className="label-caps px-4 pt-4 pb-3">{t('progress.recent_sessions')}</p>
                <div className="divide-y divide-gray-800/60">
                  {exerciseData.sessions.slice(-5).reverse().map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs text-gray-500">{s.date}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {s.sets.map(x => `${x.weight_kg}×${x.reps}`).join('  ')}
                        </p>
                        <p className="text-[10px] text-gray-600">e1RM {s.e1rm} kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Volume ─────────────────────────────────────────────────── */}
      {tab === 'volume' && (
        <div className="space-y-5">
          {/* Header with period selector */}
          <div className="flex items-end justify-between">
            <div>
              <p className="label-caps mb-1">{t('volume.title')}</p>
            </div>
            <div className="flex gap-1 rounded-xl bg-gray-900 p-1">
              {['4w', '12w', '6m'].map(p => (
                <button
                  key={p}
                  onClick={() => setVolumePeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    volumePeriod === p
                      ? 'bg-white text-black'
                      : 'text-gray-500 active:text-gray-300'
                  }`}
                >
                  {t(`volume.period_${p}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Volume chart */}
          {volumeData.length > 0 ? (
            <div
              className="rounded-2xl p-4"
              style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="label-caps mb-4">{t('volume.total_volume')}</p>
              <VolumeChart data={volumeData} unit="kg" />
            </div>
          ) : (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-sm text-gray-500">{t('volume.no_data')}</p>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Avg per week */}
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-2xl font-black tabular-nums text-white">
                {volumeStats.avgVolume >= 1000
                  ? `${(volumeStats.avgVolume / 1000).toFixed(1)}k`
                  : volumeStats.avgVolume}
              </p>
              <p className="label-caps mt-1">{t('volume.avg_per_week')}</p>
            </div>

            {/* Best week */}
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-2xl font-black tabular-nums text-white">
                {volumeStats.best
                  ? volumeStats.best.totalVolume >= 1000
                    ? `${(volumeStats.best.totalVolume / 1000).toFixed(1)}k`
                    : volumeStats.best.totalVolume
                  : '—'}
              </p>
              <p className="label-caps mt-1">{t('volume.best_week')}</p>
            </div>

            {/* Trend */}
            <div
              className="rounded-2xl p-4 text-center"
              style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-center gap-1">
                {volumeStats.trend.direction === 'up' && (
                  <>
                    <ArrowUp size={20} className="text-emerald-400" />
                    <span className="text-2xl font-black tabular-nums text-emerald-400">
                      {volumeStats.trend.pct}%
                    </span>
                  </>
                )}
                {volumeStats.trend.direction === 'down' && (
                  <>
                    <ArrowDown size={20} className="text-red-400" />
                    <span className="text-2xl font-black tabular-nums text-red-400">
                      {volumeStats.trend.pct}%
                    </span>
                  </>
                )}
                {volumeStats.trend.direction === 'flat' && (
                  <>
                    <Minus size={20} className="text-gray-400" />
                    <span className="text-2xl font-black tabular-nums text-gray-400">—</span>
                  </>
                )}
              </div>
              <p className="label-caps mt-1">{t('volume.trend')}</p>
            </div>
          </div>

          {/* Muscle breakdown */}
          {muscleSorted.length > 0 && (
            <div
              className="rounded-2xl p-5"
              style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="label-caps mb-4">{t('volume.muscle_breakdown')}</p>
              <div className="space-y-4">
                {muscleSorted.map(group => (
                  <div key={group.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-black tracking-tight text-white">
                        {t(`muscles.${group.key}`, group.key)}
                      </span>
                      <span className="tabular-nums text-sm font-bold text-gray-300">
                        {group.sets} <span className="font-normal text-gray-600">{t('volume.sets_label')}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${group.pct}%`, backgroundColor: '#06b6d4', minWidth: group.sets > 0 ? '6px' : '0' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Spiergroepen ──────────────────────────────────────────── */}
      {tab === 'muscle' && (
        <div className="space-y-4">
          {/* Volume chart */}
          <div className="rounded-2xl bg-gray-900 p-4">
            <p className="label-caps mb-4">{t('progress.volume_per_muscle')}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={muscleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                {MUSCLE_GROUPS.map(mg => (
                  <Bar key={mg} dataKey={mg} fill={MG_COLORS[mg]} stackId="a" radius={mg === 'core' ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {MUSCLE_GROUPS.map(mg => (
                <div key={mg} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: MG_COLORS[mg] }} />
                  <span className="text-xs text-gray-500">{t(`muscles.${mg}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('progress.workouts_stat'), value: totalStats.totalWorkouts },
              { label: t('progress.volume_stat'),     value: totalStats.totalVol >= 1000 ? `${(totalStats.totalVol / 1000).toFixed(1)}t` : `${totalStats.totalVol.toFixed(0)}kg` },
              { label: t('progress.favorite_stat'),   value: null, name: totalStats.favorite },
            ].map(({ label, value, name }) => (
              <div
                key={label}
                className="rounded-2xl p-4 text-center"
                style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xl font-black text-white tabular-nums">{value ?? ''}</p>
                {name && <p className="truncate text-xs font-bold text-white">{name}</p>}
                <p className="label-caps mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Records ─────────────────────────────────────────────── */}
      {tab === 'records' && (
        <div className="space-y-4">
          {allPRs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Trophy size={48} className="mb-4 text-gray-700" />
              <p className="text-gray-500">{t('pr.no_records')}</p>
            </div>
          ) : (
            <>
              <p className="label-caps">{t('pr.all_time_bests')}</p>
              {Object.entries(prsByMuscle).map(([muscleGroup, prs]) => (
                <div key={muscleGroup} className="space-y-2">
                  <p className="label-caps text-cyan-500 capitalize">{t(`muscles.${muscleGroup}`, muscleGroup)}</p>
                  {prs.map((pr, idx) => (
                    <div
                      key={`${pr.exercise}-${idx}`}
                      className="rounded-2xl p-4"
                      style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black tracking-tight text-white truncate">{pr.exercise}</h3>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-lg font-bold tabular-nums text-white">
                              {pr.bestWeight}<span className="text-sm font-normal text-gray-500">kg</span>
                              <span className="mx-1 text-gray-600">x</span>
                              {pr.bestReps}
                            </span>
                            <span className="label-caps text-cyan-500">
                              {t('pr.e1rm_label')}: {pr.bestE1RM}kg
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">
                            {new Date(pr.date).toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Analyse ───────────────────────────────────────────────── */}
      {tab === 'analyse' && (
        <FormDetective workouts={workouts} userId={user?.id} />
      )}

      {/* ── Balans ────────────────────────────────────────────────── */}
      {tab === 'balans' && (
        <WeaknessHunter workouts={workouts} priorityMuscles={settings?.priorityMuscles || []} />
      )}
    </div>
  )
}
