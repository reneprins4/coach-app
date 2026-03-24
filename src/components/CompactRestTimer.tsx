import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { hapticFeedback } from '../lib/native'

interface CompactRestTimerProps {
  remaining: number
  total: number
  onStop: () => void
  onAddTime: (seconds: number) => void
}

export default function CompactRestTimer({ remaining, total, onStop, onAddTime }: CompactRestTimerProps) {
  const { t } = useTranslation()
  const progress = total > 0 ? (total - remaining) / total : 0
  const isUrgent = remaining <= 10 && remaining > 0
  const didFinishRef = useRef(false)

  // Auto-dismiss with haptic when timer hits 0
  useEffect(() => {
    if (remaining <= 0 && !didFinishRef.current) {
      didFinishRef.current = true
      hapticFeedback('medium')
      // Brief delay before auto-dismiss so user sees 0:00
      const timeout = setTimeout(() => {
        onStop()
      }, 600)
      return () => clearTimeout(timeout)
    }
    if (remaining > 0) {
      didFinishRef.current = false
    }
  }, [remaining, onStop])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const display = `${minutes}:${String(seconds).padStart(2, '0')}`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -48, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="flex h-12 items-center gap-3 border-b border-white/[0.06] bg-white/[0.04] px-4"
        role="timer"
        aria-live="off"
        aria-label={t('rest_timer.rest')}
        data-testid="compact-rest-timer"
      >
        {/* Countdown */}
        <motion.span
          className={[
            'min-w-[3.5rem] tabular text-lg font-bold',
            isUrgent ? 'text-cyan-400' : 'text-white',
          ].join(' ')}
          animate={isUrgent ? { opacity: [1, 0.6, 1] } : { opacity: 1 }}
          transition={isUrgent ? { duration: 1, repeat: Infinity, ease: 'easeInOut' } : {}}
          data-testid="timer-display"
        >
          {display}
        </motion.span>

        {/* Progress bar */}
        <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-cyan-500"
            style={{ boxShadow: '0 0 8px rgba(6, 182, 212, 0.5)' }}
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.9, ease: 'linear' }}
            data-testid="progress-bar"
          />
        </div>

        {/* +30s button */}
        <button
          type="button"
          onClick={() => onAddTime(30)}
          aria-label="+30s"
          className="h-7 rounded-md bg-white/[0.08] px-2 text-xs font-semibold text-cyan-400 active:bg-white/[0.12] transition-colors"
          data-testid="add-time-btn"
        >
          +30s
        </button>

        {/* Skip button */}
        <button
          type="button"
          onClick={onStop}
          aria-label={t('rest_timer.skip') || 'Skip'}
          className="text-xs font-medium text-white/40 active:text-white/70 transition-colors"
          data-testid="skip-btn"
        >
          {t('rest_timer.skip')}
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
