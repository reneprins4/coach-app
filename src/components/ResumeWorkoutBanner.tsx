import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ActiveWorkout } from '../types'

const STORAGE_KEY = 'coach-active-workout'

export default function ResumeWorkoutBanner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [elapsedMin, setElapsedMin] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)

  // Read active workout from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setWorkout(JSON.parse(raw) as ActiveWorkout)
      }
    } catch {
      setWorkout(null)
    }
  }, [])

  // Update elapsed time
  useEffect(() => {
    if (!workout?.startedAt) return
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(workout.startedAt).getTime()) / 60000)
      setElapsedMin(elapsed)
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [workout?.startedAt])

  if (!workout) return null

  function handleResume() {
    navigate('/log')
  }

  function handleDiscard() {
    setShowConfirm(true)
  }

  function handleConfirmDiscard() {
    localStorage.removeItem(STORAGE_KEY)
    setWorkout(null)
    setShowConfirm(false)
  }

  function handleCancelDiscard() {
    setShowConfirm(false)
  }

  return (
    <div data-testid="resume-workout-banner" className="card-accent mb-4">
      {!showConfirm ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black tracking-tight text-white">
              {t('resume_banner.title')}
            </p>
            <p className="mt-0.5 text-xs text-cyan-300">
              {elapsedMin} min
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDiscard}
              className="rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-3)] bg-white/[0.04] active:bg-white/[0.08] transition-colors"
            >
              {t('resume_banner.discard')}
            </button>
            <button
              onClick={handleResume}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-white active:bg-cyan-600 transition-colors"
            >
              <Play size={12} fill="white" />
              {t('resume_banner.resume')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-2)]">
            {t('resume_banner.confirm_discard')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancelDiscard}
              className="flex-1 rounded-xl py-2.5 text-xs font-bold text-[var(--text-3)] bg-white/[0.04] active:bg-white/[0.08] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirmDiscard}
              className="flex-1 rounded-xl py-2.5 text-xs font-bold text-red-400 bg-red-500/10 active:bg-red-500/20 transition-colors"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
