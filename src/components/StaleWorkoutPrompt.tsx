import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { AlertTriangle } from 'lucide-react'

interface StaleWorkoutPromptProps {
  startedAt: Date
  totalSets: number
  totalExercises: number
  onResume: () => void
  onDiscard: () => void
  onSaveAndFinish: () => void
}

function formatRelativeTime(date: Date, language: string): string {
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (language.startsWith('nl')) {
    if (diffDays > 0) return `${diffDays} dag${diffDays > 1 ? 'en' : ''}`
    if (diffHours > 0) return `${diffHours} uur`
    return `${diffMinutes} min`
  }
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`
  if (diffHours > 0) return `${diffHours}h`
  return `${diffMinutes} min`
}

export default function StaleWorkoutPrompt({
  startedAt,
  totalSets,
  totalExercises,
  onResume,
  onDiscard,
  onSaveAndFinish,
}: StaleWorkoutPromptProps) {
  const { t, i18n } = useTranslation()
  const [showConfirm, setShowConfirm] = useState(false)

  const timeAgo = formatRelativeTime(startedAt, i18n.language)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5"
      onKeyDown={(e) => { if (e.key === 'Escape') onResume() }}
    >
      <AnimatePresence>
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stale-workout-title"
          className="card w-full max-w-sm"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {!showConfirm ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                  <AlertTriangle size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 id="stale-workout-title" className="text-title">
                    {t('stale_workout.title')}
                  </h3>
                  <p className="text-xs text-[var(--text-3)] mt-0.5">
                    {t('stale_workout.description', {
                      time: timeAgo,
                      sets: totalSets,
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={onResume}
                  className="btn-primary h-12 w-full text-sm"
                >
                  {t('stale_workout.resume')}
                </button>
                <button
                  onClick={onSaveAndFinish}
                  className="btn-secondary h-12 w-full text-sm"
                  data-testid="stale-save-finish"
                >
                  {t('stale_workout.save_finish')}
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="h-12 w-full rounded-xl text-sm font-bold text-red-400 bg-red-500/10 active:bg-red-500/20 transition-colors"
                  data-testid="stale-discard"
                >
                  {t('stale_workout.discard')}
                </button>
              </div>

              <p className="mt-3 text-center text-[10px] text-[var(--text-3)]">
                {totalExercises} {t('common.exercises')} · {totalSets} {t('common.sets')}
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-2)]">
                {t('stale_workout.discard_confirm')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="btn-secondary h-12 flex-1 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={onDiscard}
                  className="flex-1 h-12 rounded-xl text-sm font-bold text-red-400 bg-red-500/10 active:bg-red-500/20 transition-colors"
                  data-testid="stale-confirm-discard"
                >
                  {t('common.confirm')}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
