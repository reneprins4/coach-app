import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Trash2, Calendar, CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'

const DAY_NAMES_NL = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function History() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthContext()
  const nav = useNavigate()
  const { workouts, loading, deleteWorkout } = useWorkouts(user?.id)
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  const DAY_NAMES = i18n.language === 'nl' ? DAY_NAMES_NL : DAY_NAMES_EN

  const filtered = useMemo(() => {
    if (!query.trim()) return workouts
    const lower = query.toLowerCase()
    return workouts.filter(w =>
      w.exerciseNames?.some(n => n.toLowerCase().includes(lower)) ||
      (w.notes || '').toLowerCase().includes(lower)
    )
  }, [workouts, query])

  async function handleDelete() {
    if (deleteId) {
      try { await deleteWorkout(deleteId) } catch {}
      setDeleteId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 pb-28">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">{t('history.subtitle')}</p>
          <h1 className="text-3xl font-black tracking-tight text-white">{t('history.title')}</h1>
        </div>
        <button
          onClick={() => nav('/calendar')}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 active:bg-gray-800 active:text-white"
          aria-label="Kalender"
        >
          <CalendarDays size={20} />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('history.search_placeholder')}
          className="h-12 w-full rounded-2xl bg-gray-900 pl-10 pr-4 text-white placeholder-gray-500 outline-none ring-1 ring-gray-800 focus:ring-gray-600"
        />
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Calendar size={40} className="mb-4 text-gray-700" />
          <p className="text-gray-500">{query ? t('history.no_results') : t('history.no_workouts')}</p>
          {!query && (
            <Link to="/log" className="mt-4 text-sm font-medium text-cyan-500">
              {t('history.start_first')}
            </Link>
          )}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(w => {
          const d = new Date(w.created_at)
          return (
            <div key={w.id} className="group relative">
              <Link
                to={`/history/${w.id}`}
                className="block rounded-2xl p-4 active:opacity-80 transition-opacity"
                style={{background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.06)'}}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">{DAY_NAMES[d.getDay()]} {d.getDate()}/{d.getMonth()+1}</span>
                  <span className="text-sm font-bold text-cyan-400 tabular-nums">{formatVol(w.totalVolume)}</span>
                </div>
                <p className="text-sm font-semibold text-white truncate">
                  {w.exerciseNames?.join(', ') || t('history.empty_workout')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {w.workout_sets.length} {t('common.sets')}
                </p>
              </Link>
              <button
                onClick={(e) => { e.preventDefault(); setDeleteId(w.id) }}
                className="absolute right-3 top-3 p-2 text-gray-700 active:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">{t('history.delete_confirm')}</h3>
            <p className="mb-6 text-sm text-gray-400">{t('history.delete_confirm_sub')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700 active:bg-gray-800"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="h-12 flex-1 rounded-xl bg-cyan-600 font-semibold text-white active:bg-cyan-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatVol(kg) {
  if (!kg) return '0kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
