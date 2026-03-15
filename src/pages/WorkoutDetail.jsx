import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock, Dumbbell, TrendingUp } from 'lucide-react'
import { useWorkoutDetail } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'

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
      <div className="px-4 py-6">
        <button onClick={() => nav('/history')} className="flex items-center gap-2 text-gray-400">
          <ArrowLeft size={20} /> {t('common.back')}
        </button>
        <p className="mt-8 text-center text-gray-500">{t('workout_detail.not_found')}</p>
      </div>
    )
  }

  const d = new Date(workout.created_at)
  const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-US'
  const dateStr = d.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Group sets by exercise
  const grouped = {}
  for (const s of workout.workout_sets) {
    if (!grouped[s.exercise]) grouped[s.exercise] = []
    grouped[s.exercise].push(s)
  }

  return (
    <div className="px-4 py-6 pb-28">
      <button
        onClick={() => nav('/history')}
        className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 active:text-white"
      >
        <ArrowLeft size={16} /> {t('workout_detail.history')}
      </button>

      <div className="mb-5">
        <p className="label-caps mb-1">{dateStr}</p>
        <h1 className="text-2xl font-black tracking-tight text-white">
          {workout.exerciseNames?.slice(0, 2).join(' + ') || 'Training'}
          {(workout.exerciseNames?.length ?? 0) > 2 && ` +${(workout.exerciseNames?.length ?? 0) - 2}`}
        </h1>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { icon: Dumbbell, value: Object.keys(grouped).length, label: t('common.exercises') },
          { icon: TrendingUp, value: formatVol(workout.totalVolume), label: t('workout_detail.volume') },
          { icon: Clock, value: workout.workout_sets.length, label: t('common.sets') },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="rounded-2xl p-3 text-center"
            style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xl font-black text-white tabular-nums">{value}</p>
            <p className="label-caps mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Notes */}
      {workout.notes && (
        <div className="mb-4 rounded-2xl bg-gray-900 px-4 py-3">
          <p className="text-sm text-gray-400">{workout.notes}</p>
        </div>
      )}

      {/* Exercise breakdown */}
      <p className="label-caps mb-3">{t('workout_detail.exercises')}</p>
      <div className="space-y-3">
        {Object.entries(grouped).map(([exercise, sets]) => (
          <div key={exercise} className="rounded-2xl bg-gray-900 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800/60">
              <h3 className="text-sm font-bold text-white">{exercise}</h3>
            </div>
            <div className="px-4 pt-2 pb-3">
              <div className="grid grid-cols-[1.5rem_1fr_1fr_3rem] gap-2 px-1 pb-1 label-caps">
                <span>#</span><span>Kg</span><span>{t('common.reps')}</span><span>RPE</span>
              </div>
              {sets.map((s, i) => (
                <div key={s.id} className="grid grid-cols-[1.5rem_1fr_1fr_3rem] items-center gap-2 px-1 py-2 text-sm border-t border-gray-800/40">
                  <span className="text-gray-600">{i + 1}</span>
                  <span className="font-semibold text-white">{s.weight_kg}</span>
                  <span className="font-semibold text-white">{s.reps}</span>
                  <span className="text-gray-500">{s.rpe || '—'}</span>
                </div>
              ))}
              <p className="mt-2 text-right text-xs text-gray-600">
                {formatVol(sets.reduce((sum, x) => sum + (x.weight_kg || 0) * (x.reps || 0), 0))} {t('workout_detail.volume').toLowerCase()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatVol(kg) {
  if (!kg) return '0kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
