import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Trash2, Calendar, CalendarDays, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWorkouts } from '../hooks/useWorkouts'
import { useAuthContext } from '../App'
import { logError } from '../lib/logger'
import { HistorySkeleton } from '../components/Skeleton'

export default function History() {
  const { t, i18n } = useTranslation()
  const { user } = useAuthContext()
  const nav = useNavigate()
  const { workouts, loading, loadingMore, hasMore, loadMore, deleteWorkout } = useWorkouts(user?.id)
  const [query, setQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const locale = i18n.language === 'nl' ? 'nl-NL' : 'en-GB'

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
      try { await deleteWorkout(deleteId) } catch (err) { logError('History.deleteWorkout', err) }
      setDeleteId(null)
    }
  }

  if (loading) return <HistorySkeleton />

  return (
    <div className="px-5 pt-6 pb-28">
      {/* ━━ Header ━━ */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="label-caps mb-1">{t('history.subtitle')}</p>
          <h1 className="text-display">{t('history.title')}</h1>
        </div>
        <button
          onClick={() => nav('/calendar')}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 transition-colors active:bg-white/5 active:text-white min-h-[44px] min-w-[44px]"
          aria-label="Kalender"
        >
          <CalendarDays size={20} />
        </button>
      </div>

      {/* ━━ Search ━━ */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('history.search_placeholder')}
          className="h-12 w-full rounded-2xl pl-11 pr-4 text-sm text-white placeholder-gray-600 outline-none"
        />
      </div>

      {/* ━━ Empty state ━━ */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <Calendar size={36} className="mb-4 text-gray-800" />
          <p className="text-sm text-gray-600">{query ? t('history.no_results') : t('history.no_workouts')}</p>
          {!query && (
            <Link to="/log" className="mt-4 text-sm font-semibold text-cyan-500 active:text-cyan-400">
              {t('history.start_first')}
            </Link>
          )}
        </div>
      )}

      {/* ━━ Workout list ━━ */}
      <div className="space-y-3">
        {filtered.map(w => {
          const d = new Date(w.created_at)
          const exercises = (w.exerciseNames || []).slice(0, 3)
          const extraCount = (w.exerciseNames?.length || 0) - 3
          const vol = w.totalVolume || 0

          return (
            <div key={w.id} className="group relative">
              <Link
                to={`/history/${w.id}`}
                className="card flex items-center gap-4 active:scale-[0.98] transition-transform"
              >
                {/* Date column */}
                <div className="shrink-0 w-12 text-center">
                  <p className="text-lg font-black tabular text-white leading-none">{d.getDate()}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mt-0.5">
                    {d.toLocaleDateString(locale, { month: 'short' })}
                  </p>
                </div>

                {/* Divider */}
                <div className="w-px h-10 bg-white/[0.06] shrink-0" />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {exercises.join(', ')}{extraCount > 0 ? ` +${extraCount}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {w.workout_sets.length} {t('common.sets')}
                    {vol > 0 && <span className="text-gray-700"> · </span>}
                    {vol > 0 && <span className="tabular font-semibold text-gray-500">{formatVol(vol)}</span>}
                  </p>
                </div>

                <ChevronRight size={14} className="shrink-0 text-gray-800" />
              </Link>

              {/* Delete button — revealed on hover/touch */}
              <button
                onClick={(e) => { e.preventDefault(); setDeleteId(w.id) }}
                className="absolute right-14 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg text-gray-800 transition-colors active:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}

        {/* ━━ Load more ━━ */}
        {hasMore && !query && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn-secondary h-12 text-sm"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-700 border-t-cyan-500" />
                {t('common.loading')}
              </span>
            ) : (
              t('history.load_more')
            )}
          </button>
        )}
      </div>

      {/* ━━ Delete confirmation ━━ */}
      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5">
          <div className="card w-full max-w-sm text-center">
            <h3 className="text-title mb-2">{t('history.delete_confirm')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('history.delete_confirm_sub')}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary h-12 text-sm">
                {t('common.cancel')}
              </button>
              <button onClick={handleDelete} className="btn-primary h-12 text-sm">
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatVol(kg: number | undefined | null): string {
  if (!kg) return '0kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)}kg`
}
