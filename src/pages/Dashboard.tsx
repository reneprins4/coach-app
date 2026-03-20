import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { DashboardSkeleton } from '../components/Skeleton'

import { getCurrentBlock, getBlockProgress, PHASES } from '../lib/periodization'
import { analyzeTraining } from '../lib/training-analysis'


export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user, settings } = useAuthContext()
  const { workouts, loading } = useWorkouts(user?.id)
  const nav = useNavigate()

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    const thisWeek = workouts.filter(w => new Date(w.created_at) >= weekStart)

    let streak = 0
    const dates = new Set(workouts.map(w => new Date(w.created_at).toISOString().split('T')[0]))
    const d = new Date()
    let check = d.toISOString().split('T')[0]
    if (!dates.has(check)) { d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0] }
    while (dates.has(check)) {
      streak++; d.setDate(d.getDate() - 1); check = d.toISOString().split('T')[0]
    }

    return { thisWeekCount: thisWeek.length, streak }
  }, [workouts])

  const muscleStatus = useMemo(() => analyzeTraining(workouts.slice(0, 30)), [workouts])

  const block = getCurrentBlock()
  const progress = block ? getBlockProgress(block) : null
  const phase = block ? PHASES[block.phase] : null

  const recentWorkouts = workouts.slice(0, 2)

  if (loading) {
    return <DashboardSkeleton />
  }

  // Empty state for new users
  if (workouts.length === 0) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-3 text-3xl font-black tracking-tight text-white">{t(getGreetingKey())}</h1>
        <p className="mb-8 text-sm text-gray-500">
          {t('dashboard.time_to_start')}
        </p>
        <button
          onClick={() => nav('/coach')}
          className="btn-primary mb-4 max-w-xs"
        >
          {t('dashboard.start_training')}
        </button>
        <button
          onClick={() => nav('/log')}
          className="btn-secondary max-w-xs"
        >
          {t('dashboard.free_training')}
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28">

      {/* Header */}
      <div className="mb-6">
        <p className="label-caps">{getDayName(i18n.language)}</p>
        <h1 className="text-3xl font-black tracking-tight text-white">
          {t(getGreetingKey())}{settings.name ? `, ${settings.name}` : ''}
        </h1>
      </div>

      {/* Stats - 2 columns with visual weight */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-900 p-4 text-center">
          <p className="text-3xl font-bold tabular text-white">{stats.thisWeekCount}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{t('dashboard.workouts')}</p>
        </div>
        <div className="rounded-xl bg-gray-900 p-4 text-center">
          <p className="text-3xl font-bold tabular text-white">{stats.streak}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">{t('dashboard.streak')}</p>
        </div>
      </div>

      {/* Training Goal + Phase status card */}
      {settings.trainingGoal && (
        <div
          onClick={() => nav('/profile')}
          className="mb-5 flex cursor-pointer items-center justify-between rounded-2xl p-4 active:opacity-80"
          style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="label-caps mb-1">{t('training_goal.title')}</p>
            <p className="text-sm font-black tracking-tight text-white">
              {t(`training_goal.${settings.trainingGoal}`)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-cyan-500/20 px-2 py-1 text-xs font-bold text-cyan-400">
              {t(`training_goal.phase_${settings.trainingPhase || 'build'}`)}
            </span>
            <ChevronRight size={16} className="text-gray-600" />
          </div>
        </div>
      )}

      {/* Main Lift PR Progress card */}
      {settings.mainLift && settings.mainLiftGoalKg && (
        <div
          onClick={() => nav('/profile')}
          className="mb-5 cursor-pointer rounded-2xl p-4 active:opacity-80"
          style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="label-caps mb-3">{t(`main_lift.${settings.mainLift}`)} PR</p>
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tabular-nums text-white">
                  {String((settings as unknown as Record<string, unknown>)[`${settings.mainLift}Max`] ?? '?') || '?'}
                </span>
                <span className="text-sm text-gray-500">kg</span>
                <span className="text-gray-600 mx-1">→</span>
                <span className="text-2xl font-black tabular-nums text-cyan-400">
                  {settings.mainLiftGoalKg}
                </span>
                <span className="text-sm text-gray-500">kg</span>
              </div>
            </div>
            {settings.mainLiftGoalDate && (
              <div className="text-right">
                <p className="text-xl font-black tabular-nums text-white">
                  {Math.max(0, Math.ceil((new Date(settings.mainLiftGoalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                </p>
                <p className="text-xs text-gray-500">{t('main_lift.days_left')}</p>
              </div>
            )}
          </div>
          {(() => {
            const liftMax = Number((settings as unknown as Record<string, unknown>)[`${settings.mainLift}Max`]) || 0
            return liftMax > 0 && settings.mainLiftGoalKg ? (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${Math.min(100, Math.round((liftMax / settings.mainLiftGoalKg) * 100))}%` }}
                />
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* Active block - with subtle cyan gradient and glowing progress */}
      {block && phase && (
        <div className="card-premium mb-5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-white">{phase.label}</span>
            <span className="text-xs text-gray-500">Week {progress?.currentWeek}/{progress?.totalWeeks}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              style={{ width: `${progress?.pct || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Muscle Recovery */}
      {workouts.length > 0 && muscleStatus && (() => {
        const MUSCLE_DISPLAY = {
          chest: t('muscles.chest'), back: t('muscles.back'), shoulders: t('muscles.shoulders'),
          quads: t('muscles.quads'), hamstrings: t('muscles.hamstrings'), glutes: t('muscles.glutes'),
          biceps: t('muscles.biceps'), triceps: t('muscles.triceps'), core: t('muscles.core'),
        }
        const muscles = Object.entries(muscleStatus)
          .filter(([, ms]) => ms.setsThisWeek > 0 || ms.daysSinceLastTrained != null)
          .sort(([, a], [, b]) => (a.recoveryPct ?? 100) - (b.recoveryPct ?? 100))

        if (muscles.length === 0) return null

        return (
          <div className="mb-6 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="label-caps mb-4">{t('dashboard.recovery')}</p>
            <div className="space-y-3">
              {muscles.map(([muscle, ms]) => {
                const pct = ms.recoveryPct ?? 100
                const barColor = pct < 40 ? '#ef4444' : pct < 75 ? '#f97316' : '#22c55e'
                const statusKey = pct < 40 ? 'dashboard.recovery_fatigued' : pct < 75 ? 'dashboard.recovery_recovering' : 'dashboard.recovery_ready'
                const days = ms.daysSinceLastTrained
                return (
                  <div key={muscle}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black tracking-tight text-white">{(MUSCLE_DISPLAY as Record<string, string>)[muscle] || muscle}</span>
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ color: barColor, background: `${barColor}22` }}>{t(statusKey)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <span className="text-xs text-gray-600">
                          {days === 0 ? t('dashboard.trained_today') : days === 1 ? t('dashboard.trained_yesterday') : days != null ? t('dashboard.trained_days_ago', { days }) : ''}
                        </span>
                        <span className="tabular-nums text-sm font-black" style={{ color: barColor }}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Primary CTA */}
      <button
        onClick={() => nav('/coach')}
        className="btn-primary mb-3"
      >
        {t('dashboard.start_training')}
      </button>

      {/* Secondary CTA */}
      <button
        onClick={() => nav('/log')}
        className="btn-secondary mb-6"
      >
        {t('dashboard.free_training')}
      </button>

      {/* Recent workouts - clean list style */}
      {recentWorkouts.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="label-caps">{t('dashboard.recent')}</p>
            <button onClick={() => nav('/history')} className="text-xs font-medium text-gray-500 active:text-white">{t('dashboard.view_all')}</button>
          </div>
          <div className="divide-y divide-gray-800/50">
            {recentWorkouts.map(w => {
              const date = new Date(w.created_at)
              const exercises = [...new Set((w.workout_sets || []).map(s => s.exercise))].slice(0, 4)
              return (
                <div
                  key={w.id}
                  onClick={() => nav(`/history/${w.id}`)}
                  className="flex cursor-pointer items-center justify-between py-3 active:opacity-70"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-400">
                      {date.toLocaleDateString(i18n.language === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                    <p className="truncate text-sm text-white">
                      {exercises.length > 0 ? exercises.join(', ') : t('dashboard.no_exercises')}
                    </p>
                  </div>
                  <ChevronRight size={16} className="ml-2 shrink-0 text-gray-600" />
                </div>
              )
            })}
          </div>
        </div>
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
