import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Award, TrendingUp, Trophy, ArrowUp, ArrowDown, Minus, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import PageTransition from '../components/PageTransition'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import VolumeChart from '../components/VolumeChart'
import { Skeleton } from '../components/Skeleton'
import { computeAllPRs, sortPRsForDisplay } from '../lib/prDetector'
import { groupVolumeByWeek, groupVolumeByMonth, groupVolumeByMuscle, calcTrend, calcAvgWeeklyVolume, findBestWeek } from '../lib/volumeTracker'
import { getVisibleTabs, workoutsUntilAnalysis } from './progressHelpers'
import { toDisplayWeight, formatVolume, getUnitLabel } from '../lib/unitConversion'
import { useMeasurements } from '../hooks/useMeasurements'
import { MEASUREMENT_TYPES, groupByType, calculateTrend, formatMeasurement } from '../lib/measurements'
import type { MeasurementType } from '../lib/measurements'
import MeasurementInput from '../components/MeasurementInput'
import MeasurementChart from '../components/MeasurementChart'
import { useOptimalHour } from '../hooks/useOptimalHour'
import { computeTrainingStory, markStoryViewed } from '../lib/trainingStory'
import { parseFrequency } from '../lib/settings'
import { buildStoryShareText } from '../lib/trainingStoryShare'

// Lazy load heavy analysis components (only rendered when their tab is active)
const FormDetective = lazy(() => import('../components/FormDetective'))
const WeaknessHunter = lazy(() => import('../components/WeaknessHunter'))
const PerformanceForecast = lazy(() => import('../components/PerformanceForecast'))
const TrainingStory = lazy(() => import('../components/TrainingStory'))
const OptimalHourDetail = lazy(() => import('../components/OptimalHourDetail'))

function e1rm(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core']
const MG_COLORS = { chest: '#ef4444', back: '#3b82f6', legs: '#22c55e', shoulders: '#eab308', arms: '#a855f7', core: '#06b6d4' }

function getMuscleGroup(name: string): string | null {
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
  contentStyle: { background: '#121218', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, fontSize: 12, padding: '8px 12px' },
  labelStyle: { color: 'rgba(255,255,255,0.32)' },
  itemStyle: { color: 'rgba(255,255,255,0.92)' },
}

export default function Progress() {
  const { t, i18n } = useTranslation()
  const { user, settings, updateSettings } = useAuthContext()
  const unit = settings?.units || 'kg'
  const unitLabel = getUnitLabel(unit)
  const { workouts, loading } = useWorkouts(user?.id)
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'exercise'
  const [tab, setTab] = useState(initialTab)
  const [query, setQuery] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [volumePeriod, setVolumePeriod] = useState('12w')
  const { measurements, addMeasurement } = useMeasurements(user?.id)
  const [selectedMeasurementType, setSelectedMeasurementType] = useState<MeasurementType>('weight')
  const [showStory, setShowStory] = useState(false)
  const optimalHourResult = useOptimalHour(workouts)

  // Sync tab from URL search params (e.g. navigating from Dashboard card)
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    if (urlTab && urlTab !== tab) setTab(urlTab)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Training Story for previous month
  const storyContext = useMemo(() => {
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return { prevMonth, prevYear }
  }, [])

  const storyData = useMemo(() => {
    if (workouts.length < 3) return null
    const data = computeTrainingStory(
      workouts,
      storyContext.prevMonth,
      storyContext.prevYear,
      parseFrequency(settings.frequency),
    )
    if (!data.hasEnoughData) return null
    return data
  }, [workouts, storyContext.prevMonth, storyContext.prevYear, settings.frequency])

  const handleStoryShare = useCallback(() => {
    if (!storyData) return
    const text = buildStoryShareText(storyData, i18n.language)
    if (navigator.share) {
      navigator.share({ text }).catch(() => {
        navigator.clipboard?.writeText(text)
      })
    } else {
      navigator.clipboard?.writeText(text)
    }
  }, [storyData, i18n.language])

  const remainingForAnalysis = workoutsUntilAnalysis(workouts.length)

  // Body measurements grouped by type
  const measurementsByType = useMemo(() => groupByType(measurements), [measurements])

  // Sync weight measurement with profile bodyweight
  const handleAddMeasurement = async (type: MeasurementType, value: number, date: string) => {
    await addMeasurement(type, value, date)
    if (type === 'weight' && settings) {
      updateSettings({ bodyweight: String(value) })
    }
  }

  const TABS = useMemo(() =>
    getVisibleTabs(workouts.length).map(tab => ({
      id: tab.id,
      label: t(tab.labelKey),
    })),
  [workouts.length, t])

  const exerciseNames = useMemo(() => {
    const names = new Set<string>()
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
      const entry: Record<string, string | number> = { week: `W${i + 1}` }
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
    const counts: Record<string, number> = {}
    workouts.forEach(w => (w.workout_sets || []).forEach(s => {
      counts[s.exercise as string] = (counts[s.exercise as string] || 0) + 1
    }))
    const favorite = (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1])[0]
    return { totalWorkouts, totalVol, favorite: favorite?.[0] || '—' }
  }, [workouts])

  // Compute all-time PRs for Records tab
  const allPRs = useMemo(() => {
    const prsMap = computeAllPRs(workouts)
    return sortPRsForDisplay(prsMap)
  }, [workouts])

  // Group PRs by muscle group for display
  const prsByMuscle = useMemo(() => {
    const grouped: Record<string, import('../types').PRDisplayRecord[]> = {}
    for (const pr of allPRs) {
      const mg = pr.muscleGroup || 'other'
      if (!grouped[mg]) grouped[mg] = []
      grouped[mg]!.push(pr)
    }
    return grouped
  }, [allPRs])

  // Volume tracking data
  const volumeData = useMemo(() => {
    if (volumePeriod === '6m') {
      return groupVolumeByMonth(workouts, 6)
    } else if (volumePeriod === '4w') {
      return groupVolumeByWeek(workouts, 4)
    } else if (volumePeriod === '8w') {
      return groupVolumeByWeek(workouts, 8)
    } else if (volumePeriod === '16w') {
      return groupVolumeByWeek(workouts, 16)
    } else {
      return groupVolumeByWeek(workouts, 12)
    }
  }, [workouts, volumePeriod])

  const volumeStats = useMemo(() => {
    const weeklyData = groupVolumeByWeek(workouts, 12)
    const trend = calcTrend(weeklyData, 4)
    const avgVolume = calcAvgWeeklyVolume(weeklyData)
    const best = findBestWeek(weeklyData)
    const weeksForMuscle = volumePeriod === '4w' ? 4 : volumePeriod === '8w' ? 8 : volumePeriod === '16w' ? 16 : volumePeriod === '6m' ? 26 : 12
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
    <PageTransition>
    <div className="relative overflow-hidden px-4 py-6 pb-28">
      {/* Atmospheric glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[400px] w-[500px] bg-[radial-gradient(ellipse,rgba(6,182,212,0.08)_0%,transparent_70%)] blur-[80px] z-0" />
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="label-caps mb-1">{t('progress.stats')}</p>
          <h1 className="text-display">{t('progress.title')}</h1>
        </div>
        {storyData && (
          <button
            onClick={() => setShowStory(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-2 text-xs font-bold text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all active:scale-95 active:bg-cyan-500/20"
          >
            <Sparkles size={14} />
            {t('story.view_story')}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="mb-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-none rounded-2xl bg-white/[0.03] border border-white/[0.06] p-1">
          {TABS.map(tabItem => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === tabItem.id
                  ? 'bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                  : 'text-gray-500 active:text-gray-300'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Encouragement message for beginners with few workouts */}
      {remainingForAnalysis > 0 && (
        <div className="card-accent mb-4 text-center">
          <p className="text-sm text-cyan-400 font-semibold">
            {t('progress.workouts_until_analysis', { count: remainingForAnalysis })}
          </p>
        </div>
      )}

      {/* Tab content with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
      {/* -- Per oefening ----------------------------------------- */}
      {tab === 'exercise' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedExercise(null) }}
              placeholder={t('progress.search_exercise')}
              aria-label={t('progress.search_exercise')}
              className="h-12 w-full rounded-xl pl-10 pr-4 text-sm text-white placeholder-gray-600 outline-none"
            />
          </div>

          {!selectedExercise && (
            <div className="card p-0 overflow-hidden divide-y divide-white/[0.04]">
              {filteredNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Search size={40} className="mb-3 text-gray-700" />
                  <p className="text-sm text-gray-500">{t('progress.no_exercises')}</p>
                </div>
              ) : (
                filteredNames.map(name => {
                  const mg = getMuscleGroup(name)
                  return (
                    <button
                      key={name}
                      onClick={() => { setSelectedExercise(name); setQuery(name) }}
                      className="flex w-full items-center justify-between px-4 py-3.5 transition-colors active:bg-white/[0.03]"
                    >
                      <div className="flex items-center gap-3">
                        {mg && (
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: (MG_COLORS as Record<string, string>)[mg] }}
                          />
                        )}
                        <span className="text-sm font-medium text-white">{name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {mg && (
                          <span className="label-caps">{t(`muscles.${mg}`)}</span>
                        )}
                        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="text-gray-700">
                          <path d="M1 1L6 6L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {selectedExercise && exerciseData && (
            <div className="space-y-4">
              {/* All-time PR */}
              <div className="card-accent flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
                  <Award size={22} className="text-cyan-400" />
                </div>
                <div>
                  <p className="label-caps text-cyan-500/60">{t('progress.all_time_e1rm')}</p>
                  <p className="text-4xl font-black tracking-tight text-white">
                    {toDisplayWeight(exerciseData.allTimeE1rm, unit).toFixed(1)}
                    <span className="ml-1.5 text-base font-semibold text-gray-500">{unitLabel}</span>
                  </p>
                </div>
              </div>

              {exerciseData.sessions.length > 1 && (
                <>
                  {/* E1RM trend */}
                  <div className="card p-5">
                    <div className="mb-4 flex items-center gap-2">
                      <TrendingUp size={15} className="text-orange-400" />
                      <p className="label-caps">{t('progress.estimated_1rm')}</p>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={exerciseData.sessions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.32)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.32)' }} axisLine={false} tickLine={false} width={32} />
                        <Tooltip {...CHART_TOOLTIP_STYLE} />
                        <Line type="monotone" dataKey="e1rm" stroke="#f97316" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Volume */}
                  <div className="card p-5">
                    <p className="label-caps mb-4">{t('progress.volume_per_session')}</p>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={exerciseData.sessions}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.32)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.32)' }} axisLine={false} tickLine={false} width={32} />
                        <Tooltip {...CHART_TOOLTIP_STYLE} />
                        <Bar dataKey="volume" fill="#f97316" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* Performance forecast */}
              <Suspense fallback={<div className="card p-5"><Skeleton className="h-32 w-full rounded-xl" /></div>}>
                <PerformanceForecast sessions={exerciseData.sessions} exerciseName={selectedExercise} />
              </Suspense>

              {/* Recent sessions */}
              <div className="card p-0 overflow-hidden">
                <p className="label-caps px-5 pt-5 pb-3">{t('progress.recent_sessions')}</p>
                <div className="divide-y divide-white/[0.04]">
                  {exerciseData.sessions.slice(-5).reverse().map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3.5">
                      <span className="text-xs text-gray-500">{s.date}</span>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">
                          {s.sets.map(x => `${toDisplayWeight(x.weight_kg || 0, unit)}x${x.reps}`).join('  ')}
                        </p>
                        <p className="text-[10px] text-gray-600">e1RM {toDisplayWeight(s.e1rm, unit)} {unitLabel}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -- Volume ------------------------------------------------ */}
      {tab === 'volume' && (
        <div className="space-y-5">
          {/* Header with period selector */}
          <div className="flex items-end justify-between">
            <div>
              <p className="label-caps mb-1">{t('volume.title')}</p>
            </div>
            <div className="flex gap-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06] p-1">
              {['4w', '8w', '12w', '16w', '6m'].map(p => (
                <button
                  key={p}
                  onClick={() => setVolumePeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    volumePeriod === p
                      ? 'bg-white text-black shadow-sm'
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
            <div className="card p-5">
              <p className="label-caps mb-4">{t('volume.total_volume')}</p>
              <VolumeChart data={volumeData} unit={unitLabel} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <TrendingUp size={40} className="mb-3 text-gray-700" />
              <p className="text-sm text-gray-500">{t('volume.no_data')}</p>
            </div>
          )}

          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Avg per week */}
            <div className="card p-4 text-center">
              <p className="text-2xl font-black tabular-nums text-white">
                {volumeStats.avgVolume >= 1000
                  ? `${(volumeStats.avgVolume / 1000).toFixed(1)}k`
                  : volumeStats.avgVolume}
              </p>
              <p className="label-caps mt-1">{t('volume.avg_per_week')}</p>
            </div>

            {/* Best week */}
            <div className="card p-4 text-center">
              <p className="text-2xl font-black tabular-nums text-white">
                {volumeStats.best
                  ? volumeStats.best.totalVolume >= 1000
                    ? `${(volumeStats.best.totalVolume / 1000).toFixed(1)}k`
                    : volumeStats.best.totalVolume
                  : '---'}
              </p>
              <p className="label-caps mt-1">{t('volume.best_week')}</p>
            </div>

            {/* Trend */}
            <div className="card p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {volumeStats.trend.direction === 'up' && (
                  <>
                    <ArrowUp size={20} className="text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                    <span className="text-2xl font-black tabular-nums text-emerald-400">
                      {volumeStats.trend.pct}%
                    </span>
                  </>
                )}
                {volumeStats.trend.direction === 'down' && (
                  <>
                    <ArrowDown size={20} className="text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.5)]" />
                    <span className="text-2xl font-black tabular-nums text-red-400">
                      {volumeStats.trend.pct}%
                    </span>
                  </>
                )}
                {volumeStats.trend.direction === 'flat' && (
                  <>
                    <Minus size={20} className="text-gray-400" />
                    <span className="text-2xl font-black tabular-nums text-gray-400">---</span>
                  </>
                )}
              </div>
              <p className="label-caps mt-1">{t('volume.trend')}</p>
            </div>
          </div>

          {/* Muscle breakdown */}
          {muscleSorted.length > 0 && (
            <div className="card">
              <p className="label-caps mb-5">{t('volume.muscle_breakdown')}</p>
              <div className="space-y-4">
                {muscleSorted.map(group => (
                  <div key={group.key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-white">
                        {t(`muscles.${group.key}`, group.key)}
                      </span>
                      <span className="tabular-nums text-sm font-bold text-gray-300">
                        {group.sets} <span className="font-normal text-gray-600">{t('volume.sets_label')}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-cyan-500 glow-bar transition-all duration-500"
                        style={{ width: `${group.pct}%`, minWidth: group.sets > 0 ? '6px' : '0' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* -- Spiergroepen ------------------------------------------ */}
      {tab === 'muscle' && (
        <div className="space-y-4">
          {/* Volume chart */}
          <div className="card p-5">
            <p className="label-caps mb-4">{t('progress.volume_per_muscle')}</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={muscleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.32)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.32)' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                {MUSCLE_GROUPS.map(mg => (
                  <Bar key={mg} dataKey={mg} fill={(MG_COLORS as Record<string, string>)[mg]} stackId="a" radius={mg === 'core' ? [4, 4, 0, 0] : undefined} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              {MUSCLE_GROUPS.map(mg => (
                <div key={mg} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: (MG_COLORS as Record<string, string>)[mg] }} />
                  <span className="text-xs text-gray-500">{t(`muscles.${mg}`)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('progress.workouts_stat'), value: totalStats.totalWorkouts },
              { label: t('progress.volume_stat'),     value: formatVolume(totalStats.totalVol, unit) },
              { label: t('progress.favorite_stat'),   value: null, name: totalStats.favorite },
            ].map(({ label, value, name }) => (
              <div
                key={label}
                className="card p-4 text-center"
              >
                <p className="text-xl font-black text-white tabular-nums">{value ?? ''}</p>
                {name && <p className="truncate text-xs font-bold text-white">{name}</p>}
                <p className="label-caps mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -- Records ----------------------------------------------- */}
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
              {(Object.entries(prsByMuscle) as [string, import('../types').PRDisplayRecord[]][]).map(([muscleGroup, prs]) => (
                <div key={muscleGroup} className="space-y-2">
                  <p className="label-caps text-cyan-500 capitalize">{t(`muscles.${muscleGroup}`, muscleGroup)}</p>
                  {prs.map((pr, idx) => (
                    <div
                      key={`${pr.exercise}-${idx}`}
                      className="card"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black tracking-tight text-white truncate">{pr.exercise}</h3>
                          <div className="mt-1.5 flex items-center gap-3">
                            <span className="text-lg font-bold tabular-nums text-white">
                              {toDisplayWeight(pr.bestWeight, unit)}<span className="text-sm font-normal text-gray-500">{unitLabel}</span>
                              <span className="mx-1 text-gray-600">x</span>
                              {pr.bestReps}
                            </span>
                            <span className="inline-flex items-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-bold tabular-nums text-cyan-400">
                              {t('pr.e1rm_label')}: {toDisplayWeight(pr.bestE1RM, unit)}{unitLabel}
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

      {/* -- Lichaam (Body Measurements) --------------------------- */}
      {tab === 'lichaam' && (
        <div className="space-y-4">
          {/* Input form */}
          <MeasurementInput onSave={handleAddMeasurement} />

          {/* Latest values summary */}
          <div className="grid grid-cols-3 gap-2">
            {MEASUREMENT_TYPES.map(({ type, labelKey }) => {
              const entries = measurementsByType[type]
              const latest = entries.length > 0 ? entries[entries.length - 1] : null
              const trend = calculateTrend(entries.map(e => e.value))
              const isSelected = selectedMeasurementType === type

              return (
                <button
                  key={type}
                  onClick={() => setSelectedMeasurementType(type)}
                  className={`card p-3 text-center transition-all ${
                    isSelected
                      ? 'border-cyan-500/40'
                      : 'border-white/[0.06]'
                  }`}
                >
                  <p className="label-caps mb-1">{t(labelKey)}</p>
                  {latest ? (
                    <>
                      <p className="text-lg font-black tabular-nums text-white">
                        {formatMeasurement(type, latest.value)}
                      </p>
                      <div className="mt-1 flex items-center justify-center gap-0.5">
                        {trend === 'up' && <ArrowUp size={12} className="text-emerald-400" />}
                        {trend === 'down' && <ArrowDown size={12} className="text-red-400" />}
                        {trend === 'stable' && <Minus size={12} className="text-gray-400" />}
                        <span className="text-[10px] text-gray-500">
                          {trend === 'up' && t('measurements.trend_up')}
                          {trend === 'down' && t('measurements.trend_down')}
                          {trend === 'stable' && t('measurements.trend_stable')}
                          {!trend && '---'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600">---</p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Chart for selected type */}
          <div className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-cyan-400" />
              <p className="label-caps">
                {t(MEASUREMENT_TYPES.find(m => m.type === selectedMeasurementType)?.labelKey ?? 'measurements.weight')}
              </p>
            </div>
            <MeasurementChart
              data={measurementsByType[selectedMeasurementType]}
              type={selectedMeasurementType}
            />
          </div>
        </div>
      )}

      {/* -- Analyse ----------------------------------------------- */}
      {tab === 'analyse' && (
        <Suspense fallback={<div className="space-y-3"><div className="card p-5"><Skeleton className="h-24 w-full rounded-xl" /></div><div className="card p-5"><Skeleton className="h-24 w-full rounded-xl" /></div></div>}>
          <FormDetective workouts={workouts} userId={user?.id} />
        </Suspense>
      )}

      {/* -- Balans ------------------------------------------------ */}
      {tab === 'balans' && (
        <Suspense fallback={<div className="space-y-3"><div className="card p-5"><Skeleton className="h-24 w-full rounded-xl" /></div><div className="card p-5"><Skeleton className="h-24 w-full rounded-xl" /></div></div>}>
          <WeaknessHunter workouts={workouts} priorityMuscles={settings?.priorityMuscles || []} />
        </Suspense>
      )}

      {/* -- Optimale Trainingstijd -------------------------------- */}
      {tab === 'optimal_hour' && (
        <Suspense fallback={<div className="space-y-3"><div className="card p-5"><Skeleton className="h-24 w-full rounded-xl" /></div><div className="card p-5"><Skeleton className="h-24 w-full rounded-xl" /></div></div>}>
          <OptimalHourDetail
            result={optimalHourResult ?? {
              hasEnoughData: false,
              totalWorkouts: workouts.length,
              slotsAnalyzed: 0,
              bestSlot: null,
              worstSlot: null,
              allSlots: [],
              percentageDifference: 0,
              confidence: 'none',
            }}
            language={i18n.language}
          />
        </Suspense>
      )}

        </motion.div>
      </AnimatePresence>

      {/* Training Story Overlay */}
      {showStory && storyData && (
        <Suspense fallback={null}>
          <TrainingStory
            data={storyData}
            onClose={() => {
              setShowStory(false)
              markStoryViewed(storyContext.prevMonth, storyContext.prevYear)
            }}
            onShare={handleStoryShare}
          />
        </Suspense>
      )}
    </div>
    </PageTransition>
  )
}
