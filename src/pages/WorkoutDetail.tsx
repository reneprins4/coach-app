import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { motion } from 'motion/react'
import { useWorkoutDetail } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import PageTransition from '../components/PageTransition'

export default function WorkoutDetail() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuthContext()
  const { workout, loading } = useWorkoutDetail(id, user?.id)

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="px-5 pt-6">
        <button
          onClick={() => nav('/history')}
          className="flex h-10 items-center gap-1.5 rounded-xl text-sm text-gray-500 active:text-white min-h-[44px]"
        >
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        <p className="mt-12 text-center text-sm text-gray-600">{t('workout_detail.not_found')}</p>
      </div>
    )
  }

  const d = new Date(workout.created_at)
  const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-GB'
  const dateStr = d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })

  // Group sets by exercise
  const grouped: Record<string, import('../types').WorkoutSet[]> = {}
  for (const s of workout.workout_sets) {
    if (!grouped[s.exercise]) grouped[s.exercise] = []
    grouped[s.exercise]!.push(s)
  }

  const totalExercises = Object.keys(grouped).length
  const totalSets = workout.workout_sets.length
  const totalVol = workout.totalVolume || 0

  return (
    <PageTransition>
    <div className="relative overflow-hidden px-5 pt-6 pb-28">
      {/* Atmospheric glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[400px] w-[500px] bg-[radial-gradient(ellipse,rgba(6,182,212,0.08)_0%,transparent_70%)] blur-[80px] z-0" />
      {/* ━━ Back ━━ */}
      <button
        onClick={() => nav('/history')}
        className="mb-6 flex h-10 items-center gap-1.5 rounded-xl text-sm font-medium text-gray-600 transition-colors active:text-white min-h-[44px] -ml-1"
      >
        <ArrowLeft size={16} /> {t('workout_detail.history')}
      </button>

      {/* ━━ Header ━━ */}
      <div className="mb-6">
        <p className="label-caps mb-1">{dateStr}</p>
        <h1 className="text-display">
          {workout.exerciseNames?.slice(0, 2).join(' + ') || t('workout_detail.workout')}
          {(workout.exerciseNames?.length ?? 0) > 2 && (
            <span className="text-gray-600"> +{(workout.exerciseNames?.length ?? 0) - 2}</span>
          )}
        </h1>
      </div>

      {/* ━━ Stats row — inline, not cards ━━ */}
      <div className="mb-6 flex items-center gap-5">
        {[
          { value: totalExercises, label: t('common.exercises') },
          { value: totalSets, label: t('common.sets') },
          ...(totalVol > 0
            ? [{ value: formatVol(totalVol), label: t('workout_detail.volume').toLowerCase(), accent: true }]
            : []),
        ].map((stat, i) => (
          <motion.span
            key={i}
            className="text-sm text-gray-500"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.06 }}
          >
            <span className={`font-bold tabular ${('accent' in stat && stat.accent) ? 'text-cyan-400' : 'text-white'}`}>{stat.value}</span> {stat.label}
          </motion.span>
        ))}
      </div>

      {/* ━━ Notes ━━ */}
      {workout.notes && (
        <div className="card mb-5">
          <p className="label-caps mb-2">{t('workout_detail.notes')}</p>
          <p className="text-sm text-gray-400 leading-relaxed">{workout.notes}</p>
        </div>
      )}

      {/* ━━ Exercises ━━ */}
      <p className="label-caps mb-3">{t('workout_detail.exercises')}</p>
      <div className="space-y-3">
        {Object.entries(grouped).map(([exercise, sets], exerciseIndex) => {
          const exerciseVol = sets.reduce((sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0), 0)

          return (
            <motion.div
              key={exercise}
              className="card p-0 overflow-hidden"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
                delay: Math.min(exerciseIndex * 0.06, 0.3),
              }}
            >
              {/* Exercise header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <h3 className="text-sm font-bold text-white">{exercise}</h3>
                {exerciseVol > 0 && (
                  <span className="text-xs tabular font-semibold text-gray-600">{formatVol(exerciseVol)}</span>
                )}
              </div>

              {/* Sets */}
              <div className="px-5 pb-4">
                {/* Header row */}
                <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] gap-3 mb-1">
                  <span className="label-caps">#</span>
                  <span className="label-caps">Kg</span>
                  <span className="label-caps">{t('common.reps')}</span>
                  <span className="label-caps text-right">RPE</span>
                </div>

                {/* Data rows */}
                {sets.map((s, i) => (
                  <motion.div
                    key={s.id}
                    className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-center gap-3 py-2.5 border-t border-white/[0.04]"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.25,
                      ease: 'easeOut',
                      delay: Math.min(exerciseIndex * 0.06 + i * 0.04, 0.5),
                    }}
                  >
                    <span className="text-xs tabular text-gray-700">{i + 1}</span>
                    <span className="text-sm tabular font-semibold text-white">{s.weight_kg ?? '—'}</span>
                    <span className="text-sm tabular font-semibold text-white">{s.reps ?? '—'}</span>
                    <span className="text-xs tabular text-gray-600 text-right">{s.rpe || '—'}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
    </PageTransition>
  )
}

function formatVol(kg: number | undefined | null): string {
  if (!kg) return '0kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
