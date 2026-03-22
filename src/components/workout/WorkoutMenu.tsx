import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreVertical } from 'lucide-react'

export interface WorkoutMenuProps {
  canSuperset: boolean
  onSuperset: () => void
  onStop: () => void
  onTrimWorkout?: (targetCount: number) => void
}

const TRIM_OPTIONS = [2, 3, 4] as const

export default function WorkoutMenu({ canSuperset, onSuperset, onStop, onTrimWorkout }: WorkoutMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [showTrimPicker, setShowTrimPicker] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowTrimPicker(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 border border-gray-700 active:bg-gray-900"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
          {canSuperset && (
            <button
              onClick={() => { onSuperset(); setOpen(false) }}
              className="flex w-full flex-col px-4 py-3 text-left active:bg-gray-800"
            >
              <span className="text-sm font-semibold text-white">{t('logger.superset_mode')}</span>
              <span className="text-xs text-gray-500">{t('logger.superset_link')}</span>
            </button>
          )}
          {onTrimWorkout && !showTrimPicker && (
            <button
              onClick={() => setShowTrimPicker(true)}
              className="flex w-full flex-col px-4 py-3 text-left active:bg-gray-800"
            >
              <span className="text-sm font-semibold text-white">{t('logger.less_time')}</span>
              <span className="text-xs text-gray-500">{t('logger.how_many_exercises')}</span>
            </button>
          )}
          {showTrimPicker && (
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-gray-400">{t('logger.how_many_exercises')}</p>
              <div className="flex gap-2">
                {TRIM_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => {
                      onTrimWorkout!(n)
                      setOpen(false)
                      setShowTrimPicker(false)
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-sm font-bold text-white active:bg-cyan-500 active:text-black"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => { onStop(); setOpen(false) }}
            className="flex w-full px-4 py-3 text-left text-sm font-medium text-cyan-400 active:bg-gray-800"
          >
            {t('logger.stop_workout')}
          </button>
        </div>
      )}
    </div>
  )
}
