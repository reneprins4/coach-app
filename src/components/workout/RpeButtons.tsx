import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { SimpleRpe } from '../../lib/beginnerMode'
import { mapSimpleRpeToNumeric, getSimpleRpeLabel } from '../../lib/beginnerMode'

interface RpeButtonsProps {
  value: number | null
  onChange: (rpe: number | null) => void
  beginnerMode?: boolean
}

type RpeValue = 6 | 7 | 8 | 9 | 10

const RPE_OPTIONS: RpeValue[] = [6, 7, 8, 9, 10]

const RPE_LABELS: Record<RpeValue, string> = {
  6: 'rpe.easy',
  7: 'rpe.ok',
  8: 'rpe.hard',
  9: 'rpe.very_hard',
  10: 'rpe.max',
}

const RPE_COLORS: Record<RpeValue, { bg: string; ring: string; text: string }> = {
  6:  { bg: 'bg-green-500/15', ring: 'border-green-500', text: 'text-green-400' },
  7:  { bg: 'bg-green-500/15', ring: 'border-green-500', text: 'text-green-400' },
  8:  { bg: 'bg-yellow-500/15', ring: 'border-yellow-500', text: 'text-yellow-400' },
  9:  { bg: 'bg-orange-500/15', ring: 'border-orange-500', text: 'text-orange-400' },
  10: { bg: 'bg-red-500/15', ring: 'border-red-500', text: 'text-red-400' },
}

const SIMPLE_RPE_OPTIONS: { key: SimpleRpe; numericValue: number; color: { bg: string; ring: string; text: string } }[] = [
  { key: 'easy',   numericValue: 6,   color: { bg: 'bg-green-500/15', ring: 'border-green-500', text: 'text-green-400' } },
  { key: 'medium', numericValue: 7.5, color: { bg: 'bg-yellow-500/15', ring: 'border-yellow-500', text: 'text-yellow-400' } },
  { key: 'hard',   numericValue: 9,   color: { bg: 'bg-red-500/15', ring: 'border-red-500', text: 'text-red-400' } },
]

export default function RpeButtons({ value, onChange, beginnerMode = false }: RpeButtonsProps) {
  const { t } = useTranslation()
  const [showInfo, setShowInfo] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const infoBtnRef = useRef<HTMLButtonElement>(null)

  // Close on Escape key
  useEffect(() => {
    if (!showInfo) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowInfo(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showInfo])

  // Close on click outside
  useEffect(() => {
    if (!showInfo) return
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        infoBtnRef.current &&
        !infoBtnRef.current.contains(e.target as Node)
      ) {
        setShowInfo(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showInfo])

  // Determine which simple RPE label is currently selected
  const activeSimpleRpe = value !== null ? getSimpleRpeLabel(value) : null

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="label-caps">RPE</span>
        <button
          ref={infoBtnRef}
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          aria-label={t('rpe.info')}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-[10px] font-bold text-gray-400 active:bg-gray-600"
        >
          ?
        </button>
      </div>

      {showInfo && (
        <div
          ref={popoverRef}
          role="tooltip"
          className="mb-3 rounded-xl bg-gray-800 border border-gray-700 p-3 text-xs text-gray-300 space-y-1.5"
        >
          {beginnerMode ? (
            <>
              <p className="font-semibold text-white text-sm">{t('rpe.beginner_explanation_title')}</p>
              <div className="space-y-1">
                <p><span className="font-bold text-green-400">{t('rpe_simple_easy')}</span> — {t('rpe.beginner_explanation_easy')}</p>
                <p><span className="font-bold text-yellow-400">{t('rpe_simple_medium')}</span> — {t('rpe.beginner_explanation_medium')}</p>
                <p><span className="font-bold text-red-400">{t('rpe_simple_hard')}</span> — {t('rpe.beginner_explanation_hard')}</p>
              </div>
              <p className="text-gray-500 italic">{t('rpe.beginner_explanation_summary')}</p>
            </>
          ) : (
            <>
              <p className="font-semibold text-white text-sm">{t('rpe.explanation_title')}</p>
              <div className="space-y-1">
                <p><span className="font-bold text-green-400">6</span> — {t('rpe.explanation_6')}</p>
                <p><span className="font-bold text-green-400">7</span> — {t('rpe.explanation_7')}</p>
                <p><span className="font-bold text-yellow-400">8</span> — {t('rpe.explanation_8')}</p>
                <p><span className="font-bold text-orange-400">9</span> — {t('rpe.explanation_9')}</p>
                <p><span className="font-bold text-red-400">10</span> — {t('rpe.explanation_10')}</p>
              </div>
              <p className="text-gray-500 italic">{t('rpe.explanation_summary')}</p>
            </>
          )}
        </div>
      )}

      {beginnerMode ? (
        /* ── Beginner: 3 large Easy / Medium / Hard buttons ── */
        <div className="flex gap-2">
          {SIMPLE_RPE_OPTIONS.map(opt => {
            const numericValue = mapSimpleRpeToNumeric(opt.key)
            const isSelected = activeSimpleRpe === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onChange(isSelected ? null : numericValue)}
                aria-label={t(`rpe_simple_${opt.key}`)}
                aria-pressed={isSelected}
                className={`flex flex-1 flex-col items-center justify-center rounded-xl py-3 min-h-[44px] text-center transition-colors ${
                  isSelected
                    ? `${opt.color.bg} border-2 ${opt.color.ring} ${opt.color.text}`
                    : 'bg-gray-800 text-gray-400 active:bg-gray-700'
                }`}
              >
                <span className="text-sm font-bold">{t(`rpe_simple_${opt.key}`)}</span>
              </button>
            )
          })}
        </div>
      ) : (
        /* ── Standard: 5 numeric RPE buttons (6-10) ── */
        <div className="flex gap-1.5">
          {RPE_OPTIONS.map(rpe => {
            const isSelected = value === rpe
            const colors = RPE_COLORS[rpe]
            const label = RPE_LABELS[rpe]
            return (
              <button
                key={rpe}
                type="button"
                onClick={() => onChange(isSelected ? null : rpe)}
                aria-label={`${rpe} ${t(label)}`}
                aria-pressed={isSelected}
                className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 min-h-[44px] text-center transition-colors ${
                  isSelected
                    ? `${colors.bg} border-2 ${colors.ring} ${colors.text}`
                    : 'bg-gray-800 text-gray-400 active:bg-gray-700'
                }`}
              >
                <span className="text-sm font-bold">{rpe}</span>
                <span className="text-[9px] leading-tight opacity-70">{t(label)}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
