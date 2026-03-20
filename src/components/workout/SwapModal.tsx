import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles, Loader2, X } from 'lucide-react'
import { getExerciseSubstitute } from '../../lib/ai'
import { getSubstituteOptions } from '../../lib/exerciseSubstitutes'
import { useModalA11y } from '../../hooks/useModalA11y'
import type { ActiveExercise, UserSettings, SubstituteExercise } from '../../types'

export interface SwapModalProps {
  exercise: ActiveExercise
  settings: UserSettings
  currentExerciseNames: string[]
  onAccept: (substitute: SubstituteExercise) => void
  onClose: () => void
}

export default function SwapModal({
  exercise,
  settings,
  currentExerciseNames = [],
  onAccept,
  onClose,
}: SwapModalProps) {
  const { t } = useTranslation()
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Instant suggestions from static DB — no API call, filtered for duplicates
  const options = useMemo(() =>
    getSubstituteOptions({
      exercise: { ...exercise, plan: exercise.plan ?? undefined },
      equipment: settings.equipment || 'full_gym',
      excludeNames: currentExerciseNames,
      max: 4,
    }) as unknown as SubstituteExercise[],
    [exercise, settings.equipment, currentExerciseNames]
  )

  async function handleAiSuggest() {
    setAiLoading(true)
    setAiError(null)
    try {
      const sub = await getExerciseSubstitute({
        exercise: { ...exercise, plan: exercise.plan ?? undefined },
        reason: 'want_variety',
        equipment: settings.equipment,
        experienceLevel: settings.experienceLevel,
        bodyweight: settings.bodyweight,
      }) as unknown as SubstituteExercise
      // Check if AI returned something already in the workout
      if (currentExerciseNames.map(n => n.toLowerCase()).includes(sub.name.toLowerCase())) {
        setAiError(t('logger.swap_already_in_workout'))
      } else {
        onAccept(sub)
      }
    } catch {
      setAiError(t('logger.swap_ai_failed'))
    } finally {
      setAiLoading(false)
    }
  }

  useModalA11y(true, onClose)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="swap-modal-title" className="w-full max-w-sm rounded-2xl bg-gray-900 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="label-caps mb-0.5">{t('logger.replacing')}</p>
            <h3 id="swap-modal-title" className="text-lg font-black tracking-tight text-white">{exercise.name}</h3>
          </div>
          <button onClick={onClose} aria-label={t('common.close') || 'Close'} className="rounded-xl p-2 text-gray-500 active:bg-gray-800 min-h-[44px] min-w-[44px]"><X size={20} aria-hidden="true" /></button>
        </div>

        {options.length > 0 ? (
          <div className="mb-4 space-y-2">
            {options.map((opt: SubstituteExercise, idx: number) => (
              <button
                key={idx}
                onClick={() => onAccept(opt)}
                className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg, #111827 0%, #0d1421 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div>
                  <p className="font-black tracking-tight text-white">{opt.name}</p>
                  <p className="text-xs capitalize text-gray-500">{opt.equipment} {'\u00B7'} {opt.muscle_group}</p>
                </div>
                {(opt.weight_kg ?? 0) > 0 && (
                  <span className="ml-2 shrink-0 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-sm font-bold tabular-nums text-cyan-400">
                    {opt.weight_kg}kg
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-gray-500">{t('logger.swap_no_options')}</p>
        )}

        <button
          onClick={handleAiSuggest}
          disabled={aiLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-gray-400 ring-1 ring-gray-700 disabled:opacity-50 active:bg-gray-800"
        >
          {aiLoading
            ? <><Loader2 size={15} className="animate-spin" /> {t('logger.finding_alternative')}</>
            : <><Sparkles size={15} /> {t('logger.ai_suggest')}</>}
        </button>
        {aiError && <p className="mt-2 text-center text-xs text-red-400">{aiError}</p>}
      </div>
    </div>
  )
}
