import { useMemo, useCallback, useState, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Play, Dumbbell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { DashboardSkeleton } from '../components/Skeleton'
import InjuryBanner from '../components/InjuryBanner'
import InjuryCheckIn from '../components/InjuryCheckIn'
import InjuryReport from '../components/InjuryReport'
import TrainingStoryBanner from '../components/TrainingStoryBanner'
import ResumeWorkoutBanner from '../components/ResumeWorkoutBanner'
import PrGoalsDashboard from '../components/PrGoalsDashboard'
import { useInjuries } from '../hooks/useInjuries'
import type { ActiveInjury } from '../lib/injuryRecovery'

import OptimalHourCard from '../components/OptimalHourCard'
import { useOptimalHour } from '../hooks/useOptimalHour'
import { formatSlotLabel } from '../lib/optimalHour'
import { getCurrentBlock, getBlockProgress, PHASES } from '../lib/periodization'
import { getLocalDateString } from '../lib/dateUtils'
import { analyzeTraining } from '../lib/training-analysis'
import { generateTodaysWorkout } from '../lib/todaysWorkout'
import { computeTrainingStory, isStoryViewed, markStoryViewed } from '../lib/trainingStory'
import { getMonthName } from '../lib/trainingStoryShare'
import { buildStoryShareText } from '../lib/trainingStoryShare'
import type { AIExercise } from '../types'

const TrainingStory = lazy(() => import('../components/TrainingStory'))

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user, settings } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)
  const nav = useNavigate()
  const { activeInjuries, addInjury, checkIn, resolve } = useInjuries()
  const [checkInInjury, setCheckInInjury] = useState<ActiveInjury | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showStory, setShowStory] = useState(false)
  const [storyDismissed, setStoryDismissed] = useState(false)

  const optimalHourResult = useOptimalHour(workouts)

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const thisWeek = workouts.filter(w => new Date(w.created_at) >= weekStart)

    let streak = 0
    const dates = new Set(workouts.map(w => getLocalDateString(new Date(w.created_at))))
    const d = new Date()
    let check = getLocalDateString(d)
    if (!dates.has(check)) { d.setDate(d.getDate() - 1); check = getLocalDateString(d) }
    while (dates.has(check)) {
      streak++; d.setDate(d.getDate() - 1); check = getLocalDateString(d)
    }

    return { thisWeekCount: thisWeek.length, streak }
  }, [workouts])

  const muscleStatus = useMemo(() => analyzeTraining(workouts.slice(0, 30)), [workouts])

  const block = getCurrentBlock()
  const progress = block ? getBlockProgress(block) : null
  const phase = block ? PHASES[block.phase] : null

  const todaysWorkout = useMemo(() => generateTodaysWorkout(workouts), [workouts])

  // Training Story
  const storyContext = useMemo(() => {
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return { prevMonth, prevYear }
  }, [])

  const storyData = useMemo(() => {
    if (workouts.length < 3) return null
    const data = computeTrainingStory(workouts, storyContext.prevMonth, storyContext.prevYear, parseInt(settings.frequency) || 4)
    if (!data.hasEnoughData) return null
    return data
  }, [workouts, storyContext.prevMonth, storyContext.prevYear, settings.frequency])

  const storyViewed = isStoryViewed(storyContext.prevMonth, storyContext.prevYear)
  const showBanner = storyData !== null && !storyViewed && !storyDismissed
  const storyMonthLabel = getMonthName(storyContext.prevMonth, i18n.language)

  const handleStoryDismiss = useCallback(() => {
    markStoryViewed(storyContext.prevMonth, storyContext.prevYear)
    setStoryDismissed(true)
  }, [storyContext.prevMonth, storyContext.prevYear])

  const handleStoryShare = useCallback(() => {
    if (!storyData) return
    const text = buildStoryShareText(storyData, i18n.language)
    if (navigator.share) {
      navigator.share({ text }).catch(() => { navigator.clipboard?.writeText(text) })
    } else {
      navigator.clipboard?.writeText(text)
    }
  }, [storyData, i18n.language])

  const handleStartTodaysWorkout = useCallback(() => {
    if (!todaysWorkout) return
    const pending = todaysWorkout.exercises.map((ex: AIExercise) => ({
      name: ex.name,
      muscle_group: ex.muscle_group,
      sets: [],
      plan: {
        sets: ex.sets, reps_min: ex.reps_min, reps_max: ex.reps_max,
        weight_kg: ex.weight_kg, rpe_target: ex.rpe_target,
        rest_seconds: ex.rest_seconds, notes: ex.notes || '',
      },
    }))
    localStorage.setItem('coach-pending-workout', JSON.stringify(pending))
    nav('/log')
  }, [todaysWorkout, nav])

  const recentWorkouts = workouts.slice(0, 3)

  if (loading) return <DashboardSkeleton />

  // Empty state
  if (workouts.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-display mb-3">{t(getGreetingKey())}</h1>
        <p className="mb-8 text-sm text-gray-500">{t('dashboard.time_to_start')}</p>
        <button onClick={() => nav('/coach')} className="btn-primary mb-3 max-w-xs">{t('dashboard.start_training')}</button>
        <button onClick={() => nav('/log')} className="btn-secondary max-w-xs">{t('dashboard.free_training')}</button>
      </div>
    )
  }

  // ── Muscle recovery data ──
  const MUSCLE_DISPLAY: Record<string, string> = {
    chest: t('muscles.chest'), back: t('muscles.back'), shoulders: t('muscles.shoulders'),
    quads: t('muscles.quads'), hamstrings: t('muscles.hamstrings'), glutes: t('muscles.glutes'),
    biceps: t('muscles.biceps'), triceps: t('muscles.triceps'), core: t('muscles.core'),
  }
  const muscles = muscleStatus
    ? Object.entries(muscleStatus)
        .filter(([, ms]) => ms.setsThisWeek > 0 || ms.daysSinceLastTrained != null)
        .sort(([, a], [, b]) => (a.recoveryPct ?? 100) - (b.recoveryPct ?? 100))
    : []

  const liftMax = settings.mainLift
    ? Number((settings as unknown as Record<string, unknown>)[`${settings.mainLift}Max`]) || 0
    : 0

  return (
    <div className="px-5 pt-6 pb-28">

      {/* ━━ Greeting + inline stats ━━ */}
      <div className="mb-7">
        <p className="label-caps mb-1">{getDayName(i18n.language)}</p>
        <h1 className="text-display">
          {t(getGreetingKey())}{settings.name ? `, ${settings.name}` : ''}
        </h1>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-sm text-gray-500">
            <span className="font-bold tabular text-white">{stats.thisWeekCount}</span> {t('dashboard.workouts').toLowerCase()}
          </span>
          {stats.streak > 0 && (
            <span className="text-sm text-gray-500">
              <span className="font-bold tabular text-white">{stats.streak}</span> {t('dashboard.streak').toLowerCase()}
            </span>
          )}
          {block && phase && (
            <span className="text-sm text-gray-500">
              {phase.label} <span className="text-gray-600">Wk {progress?.currentWeek}/{progress?.totalWeeks}</span>
            </span>
          )}
        </div>
      </div>

      {/* ━━ Resume Workout Banner ━━ */}
      <ResumeWorkoutBanner />

      {/* ━━ Training Story Banner ━━ */}
      {showBanner && (
        <div className="mb-4">
          <TrainingStoryBanner
            monthLabel={storyMonthLabel}
            onOpen={() => setShowStory(true)}
            onDismiss={handleStoryDismiss}
          />
        </div>
      )}

      {/* ━━ Injury Banner ━━ */}
      {activeInjuries.length > 0 && (
        <div className="mb-4">
          <InjuryBanner
            injuries={activeInjuries}
            onCheckIn={(injury) => setCheckInInjury(injury)}
            onResolve={(injury) => resolve(injury.id)}
          />
        </div>
      )}

      {/* ━━ Optimal Hour Insight ━━ */}
      {optimalHourResult && optimalHourResult.hasEnoughData && optimalHourResult.bestSlot && (
        <OptimalHourCard
          bestSlot={formatSlotLabel(optimalHourResult.bestSlot.slot, i18n.language)}
          percentageDifference={optimalHourResult.percentageDifference}
          confidence={optimalHourResult.confidence}
          totalWorkouts={optimalHourResult.totalWorkouts}
          onViewDetails={() => nav('/progress?tab=optimal_hour')}
        />
      )}

      {/* ━━ Hero: Today's Workout ━━ */}
      {todaysWorkout && (
        <button
          onClick={handleStartTodaysWorkout}
          className="card-accent mb-5 w-full text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="label-caps text-cyan-500 mb-1">{t('dashboard.todays_workout')}</p>
              <p className="text-title">{todaysWorkout.split}</p>
              <p className="mt-1 text-sm text-gray-500">
                {todaysWorkout.exerciseCount} {t('common.exercises')} · ~{todaysWorkout.estimatedDuration} min
              </p>
            </div>
            <div className="ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-500 glow-cyan">
              <Play size={20} className="text-white ml-0.5" fill="white" />
            </div>
          </div>
        </button>
      )}

      {/* ━━ Main Lift Progress ━━ */}
      {settings.mainLift && settings.mainLiftGoalKg && liftMax > 0 && (
        <div
          onClick={() => nav('/progress')}
          className="card mb-4 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <p className="label-caps mb-3">{t(`main_lift.${settings.mainLift}`)} PR</p>
          <div className="flex items-end justify-between mb-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black tabular text-white">{liftMax}</span>
              <span className="text-xs text-gray-600">kg</span>
              <span className="text-gray-700 mx-1">/</span>
              <span className="text-2xl font-black tabular text-cyan-400">{settings.mainLiftGoalKg}</span>
              <span className="text-xs text-gray-600">kg</span>
            </div>
            {settings.mainLiftGoalDate && (
              <p className="text-xs text-gray-600">
                {Math.max(0, Math.ceil((new Date(settings.mainLiftGoalDate).getTime() - Date.now()) / 86400000))}d
              </p>
            )}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.round((liftMax / settings.mainLiftGoalKg) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* ━━ Custom PR Goals ━━ */}
      <PrGoalsDashboard onNavigate={() => nav('/profile')} />

      {/* ━━ Muscle Recovery ━━ */}
      {muscles.length > 0 && (
        <div className="card mb-4">
          <p className="label-caps mb-4">{t('dashboard.recovery')}</p>
          <div className="space-y-3">
            {muscles.map(([muscle, ms]) => {
              const pct = ms.recoveryPct ?? 100
              const color = pct < 40 ? '#ef4444' : pct < 75 ? '#f97316' : '#22c55e'
              return (
                <div key={muscle}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-white">{MUSCLE_DISPLAY[muscle] || muscle}</span>
                    <span className="tabular text-xs font-bold" style={{ color }}>{Math.round(pct)}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ━━ CTAs ━━ */}
      {!todaysWorkout && (
        <>
          <button onClick={() => nav('/coach')} className="btn-primary mb-3">{t('dashboard.start_training')}</button>
          <button onClick={() => nav('/log')} className="btn-secondary mb-4">{t('dashboard.free_training')}</button>
        </>
      )}
      {todaysWorkout && (
        <button onClick={() => nav('/log')} className="btn-secondary mb-4">
          <Dumbbell size={16} />
          {t('dashboard.free_training')}
        </button>
      )}

      {/* ━━ Recent Workouts ━━ */}
      {recentWorkouts.length > 0 && (
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="label-caps">{t('dashboard.recent')}</p>
            <button onClick={() => nav('/history')} className="text-xs font-medium text-gray-600 active:text-white">{t('dashboard.view_all')}</button>
          </div>
          <div className="space-y-2">
            {recentWorkouts.map(w => {
              const date = new Date(w.created_at)
              const exercises = [...new Set((w.workout_sets || []).map(s => s.exercise))].slice(0, 3)
              const vol = (w.workout_sets || []).reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0)
              return (
                <div
                  key={w.id}
                  onClick={() => nav(`/history/${w.id}`)}
                  className="card flex cursor-pointer items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-600">
                      {date.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-white">
                      {exercises.length > 0 ? exercises.join(', ') : t('dashboard.no_exercises')}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-3 shrink-0">
                    {vol > 0 && (
                      <span className="text-xs tabular font-bold text-gray-600">
                        {vol >= 1000 ? `${(vol / 1000).toFixed(1)}t` : `${Math.round(vol)}kg`}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-700" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ━━ Blessure melden (subtle) ━━ */}
      <button
        onClick={() => setShowReportModal(true)}
        className="w-full py-3 text-xs font-medium text-gray-700 active:text-gray-400 transition-colors"
      >
        {t('injury.report_injury')}
      </button>

      {/* ━━ Modals ━━ */}
      <InjuryReport
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onReport={(area, severity, side) => { addInjury(area, severity, side); setShowReportModal(false) }}
      />

      {checkInInjury && (
        <InjuryCheckIn
          isOpen={!!checkInInjury}
          onClose={() => setCheckInInjury(null)}
          onCheckIn={(feeling) => { checkIn(checkInInjury.id, feeling) }}
          injuryArea={checkInInjury.bodyArea}
        />
      )}

      {showStory && storyData && (
        <Suspense fallback={null}>
          <TrainingStory
            data={storyData}
            onClose={() => { setShowStory(false); markStoryViewed(storyContext.prevMonth, storyContext.prevYear); setStoryDismissed(true) }}
            onShare={handleStoryShare}
          />
        </Suspense>
      )}
    </div>
  )
}

function getGreetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'dashboard.greeting_morning'
  if (h < 17) return 'dashboard.greeting_afternoon'
  return 'dashboard.greeting_evening'
}

function getDayName(language: string): string {
  return new Intl.DateTimeFormat(language === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'long' }).format(new Date())
}
