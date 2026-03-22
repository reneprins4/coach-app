import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Check, RefreshCw, Dumbbell, BookOpen, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { getCurrentBlock, PHASES } from '../../lib/periodization'
import { generateFirstWorkout, isFirstWorkoutEligible } from '../../lib/firstWorkout'
import { getSettings } from '../../lib/settings'
import type { StartFlowState, LastWorkoutPreview, PeriodizationPhase } from '../../types'
import TemplateLibrary from '../TemplateLibrary'
import Toast from '../Toast'

const LOCALE_MAP: Record<string, string> = { nl: 'nl-NL', en: 'en-GB' }
const SPLIT_OPTIONS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Lower Body', 'Full Body'] as const

interface StartFlowViewProps {
  state: StartFlowState
  user: { id: string } | null | undefined
  formattedDate: string
  lastWorkout: LastWorkoutPreview | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: { templates: any[]; loadTemplate: (t: any) => any[]; deleteTemplate: (id: string) => Promise<void>; saveTemplate: (...args: any[]) => Promise<any> }
  showTemplates: boolean
  toast: { message: string; action?: string; onAction?: () => void } | null
  onStartWorkout: () => void
  onStartEmpty: () => void
  onStartAIWorkout: () => void
  onRepeatLastWorkout: () => void
  onLoadTemplate: (template: { id: string; name: string }) => void
  onDeleteTemplate: (id: string) => Promise<void>
  onSetShowTemplates: (show: boolean) => void
  onSetToast: (toast: { message: string; action?: string; onAction?: () => void } | null) => void
  onTimeChange: (time: number) => void
  onGenerateForSplit: (split: string) => void
  onToggleSplitPicker: (show: boolean) => void
  onNavigateToCoach: () => void
  onShowReview?: () => void
  workoutCount?: number
  onStartFirstWorkout?: () => void
}

export default function StartFlowView({
  state, user, formattedDate, lastWorkout, templates, showTemplates, toast,
  onStartEmpty, onStartAIWorkout, onRepeatLastWorkout, onLoadTemplate, onDeleteTemplate,
  onSetShowTemplates, onSetToast, onTimeChange, onGenerateForSplit, onToggleSplitPicker, onNavigateToCoach, onShowReview,
  workoutCount, onStartFirstWorkout,
}: StartFlowViewProps) {
  const { t } = useTranslation()
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false)

  // First workout detection
  const settings = useMemo(() => getSettings(), [])
  const showFirstWorkout = user && isFirstWorkoutEligible(workoutCount ?? 0, settings.experienceLevel)
  const firstWorkout = useMemo(
    () => showFirstWorkout ? generateFirstWorkout(settings) : null,
    [showFirstWorkout, settings],
  )

  const block = getCurrentBlock()
  const phase = block ? PHASES[block.phase as PeriodizationPhase] : null

  const {
    loading, generating, error, selectedSplit, generatedWorkout,
    recoveredMuscles, showSplitPicker, estimatedDuration, exerciseCount,
    availableTime, retryCount,
  } = state

  const timeSelected = availableTime !== null
  const isReady = timeSelected && !loading && !generating && generatedWorkout && !error

  const getMuscleLabel = useCallback((muscle: string) => t(`muscles.${muscle}`), [t])

  // Not logged in — simple start
  if (!user) {
    return (
      <div className="min-h-[80vh] px-5 pt-8 pb-28">
        <p className="label-caps mb-1">{formattedDate}</p>
        <h1 className="text-display mb-10">{t('logger.train')}</h1>

        <button onClick={onStartEmpty} className="card-accent w-full text-left active:scale-[0.98] transition-transform mb-3">
          <p className="text-title">{t('logger.start_empty')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('logger.free_training_sub')}</p>
        </button>

        {templates.templates.length > 0 && (
          <button onClick={() => onSetShowTemplates(true)} className="btn-secondary text-sm">
            {t('logger.choose_template')}
          </button>
        )}

        {showTemplates && (
          <TemplateLibrary templates={templates.templates} onLoad={onLoadTemplate} onDelete={onDeleteTemplate} onClose={() => onSetShowTemplates(false)} />
        )}
        {toast && <Toast message={toast.message} action={toast.action} onAction={toast.onAction} onDismiss={() => onSetToast(null)} />}
      </div>
    )
  }

  // ━━ First Workout guided flow ━━
  if (showFirstWorkout && firstWorkout && onStartFirstWorkout) {
    return (
      <div className="min-h-[80vh] px-5 pt-8 pb-28">
        <p className="label-caps mb-1">{formattedDate}</p>
        <h1 className="text-display mb-2">{t('first_workout.title')}</h1>
        <p className="text-sm text-gray-400 mb-8">{t('first_workout.subtitle')}</p>

        {/* Exercise preview */}
        <div className="card mb-6">
          <p className="label-caps text-cyan-600 mb-3">Full Body · ~{firstWorkout.estimated_duration_min} min</p>
          <div className="space-y-2">
            {firstWorkout.exercises.map((ex, i) => (
              <div key={ex.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-bold text-gray-400">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ex.name}</p>
                  <p className="text-xs text-gray-500">{ex.sets} sets &middot; {ex.reps_min}-{ex.reps_max} reps</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tip */}
        <p className="text-center text-xs text-gray-500 mb-6">{t('first_workout.tip')}</p>

        {/* Start button */}
        <button
          onClick={onStartFirstWorkout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 py-4 text-base font-black text-white shadow-[0_4px_24px_rgba(6,182,212,0.35)] transition-all active:scale-[0.97]"
        >
          <Play size={18} fill="white" />
          {t('first_workout.start')}
        </button>

        {toast && <Toast message={toast.message} action={toast.action} onAction={toast.onAction} onDismiss={() => onSetToast(null)} />}
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] px-5 pt-8 pb-28">
      {/* ━━ Header ━━ */}
      <p className="label-caps mb-1">{formattedDate}</p>
      <h1 className="text-display mb-8">
        {loading ? t('dashboard.title') : (selectedSplit || t('dashboard.title'))}
      </h1>

      {/* ━━ Hero: Generate Workout ━━ */}
      <div className="card-accent mb-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-title">{t('logger.generate_workout')}</p>
          {loading && (
            <span className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-400">
              <Loader2 size={12} className="animate-spin" /> {t('logger.analyzing')}
            </span>
          )}
          {generating && !loading && (
            <span className="flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1 text-xs font-semibold text-cyan-400">
              <Loader2 size={12} className="animate-spin" /> {t('logger.ai_generating')}
            </span>
          )}
          {isReady && (
            <span className="flex items-center gap-1.5 rounded-lg bg-green-500/15 px-2.5 py-1 text-xs font-bold text-green-400">
              <Check size={12} /> {t('logger.ready')}
            </span>
          )}
          {error && (
            <span className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-400">{t('common.retry')}</span>
          )}
        </div>

        {/* Time picker */}
        <div className="mb-4">
          <p className="label-caps text-cyan-600 mb-2">{t('logger.available_time')}</p>
          <div className="flex gap-2">
            {[45, 60, 75, 90].map(min => (
              <button
                key={min}
                onClick={() => onTimeChange(min)}
                disabled={loading || generating}
                className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all active:scale-[0.97] ${
                  availableTime === min
                    ? 'bg-cyan-500 text-white shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                    : 'bg-white/[0.04] text-gray-400 border border-white/[0.06]'
                } ${loading || generating ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {min}m
              </button>
            ))}
          </div>
        </div>

        {/* Recovery context */}
        {recoveredMuscles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {recoveredMuscles.map(muscle => (
              <span key={muscle} className="rounded-lg bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                {getMuscleLabel(muscle)}
              </span>
            ))}
          </div>
        )}

        {/* Block context */}
        {block && phase && (
          <p className="label-caps text-gray-600 mb-3">
            {phase.label} · Week {block.currentWeek}/{phase.weeks}
          </p>
        )}

        {/* Start button */}
        <button
          onClick={onStartAIWorkout}
          disabled={!isReady}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-black transition-all active:scale-[0.97] ${
            isReady
              ? 'bg-cyan-500 text-white shadow-[0_4px_24px_rgba(6,182,212,0.35)]'
              : 'bg-white/[0.06] text-gray-600 cursor-not-allowed'
          }`}
        >
          {!timeSelected ? (
            t('logger.select_time_first')
          ) : loading || generating ? (
            <><Loader2 size={18} className="animate-spin" /> {t('logger.loading_workout')}</>
          ) : error ? (
            t('logger.generation_failed')
          ) : (
            <><Play size={18} fill="white" /> {`Start ${selectedSplit}`}</>
          )}
        </button>

        {isReady && (
          <div className="mt-2 text-center">
            <p className="text-sm text-gray-500">
              {exerciseCount} {t('common.exercises')} · ~{estimatedDuration} min
            </p>
            {onShowReview && (
              <button onClick={onShowReview} className="mt-1 text-xs font-medium text-cyan-500/70 active:text-cyan-400">
                {t('logger.view_details')}
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 flex gap-2">
            {retryCount >= 2 && (
              <p className="mb-2 w-full text-center text-sm text-gray-500">{t('logger.try_later')}</p>
            )}
            <button onClick={() => onGenerateForSplit(selectedSplit || 'Full Body')} className="btn-secondary h-11 flex-1 text-sm">
              <RefreshCw size={14} /> {t('common.retry')}
            </button>
            <button onClick={onNavigateToCoach} className="btn-secondary h-11 flex-1 text-sm">
              {t('logger.choose_exercises')}
            </button>
          </div>
        )}
      </div>

      {/* ━━ Repeat Last ━━ */}
      {lastWorkout && (
        <button onClick={onRepeatLastWorkout} className="card w-full text-left active:scale-[0.98] transition-transform mb-4">
          <p className="label-caps mb-1">{t('logger.repeat_last')}</p>
          <p className="text-sm font-semibold text-white truncate">{lastWorkout.preview}</p>
        </button>
      )}

      {/* ━━ More Options ━━ */}
      <div className="mt-2">
        <button onClick={() => setMoreOptionsOpen(prev => !prev)} className="flex w-full items-center justify-center gap-1.5 py-3 text-sm text-gray-600 active:text-gray-400">
          {t('logger.more_options')}
          {moreOptionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {moreOptionsOpen && (
          <div className="mt-1 space-y-2">
            <button onClick={() => onSetShowTemplates(true)} className="card flex w-full items-center gap-3 text-left active:scale-[0.98] transition-transform">
              <BookOpen size={18} className="shrink-0 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-white">{t('logger.template')}</p>
                <p className="text-xs text-gray-600">{t('logger.templates_saved', { count: templates.templates.length })}</p>
              </div>
            </button>

            <button onClick={onStartEmpty} className="card flex w-full items-center gap-3 text-left active:scale-[0.98] transition-transform">
              <Dumbbell size={18} className="shrink-0 text-gray-600" />
              <div>
                <p className="text-sm font-semibold text-white">{t('logger.empty_training')}</p>
                <p className="text-xs text-gray-600">{t('logger.choose_exercises')}</p>
              </div>
            </button>

            {/* Split switcher */}
            {!showSplitPicker ? (
              <button onClick={() => onToggleSplitPicker(true)} className="w-full py-2 text-center text-xs text-gray-700 active:text-gray-500">
                {t('logger.change_split')}
              </button>
            ) : (
              <div className="card">
                <p className="label-caps text-center mb-3">{t('logger.choose_split')}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SPLIT_OPTIONS.map(split => (
                    <button
                      key={split}
                      onClick={() => onGenerateForSplit(split)}
                      disabled={generating}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-[0.97] ${
                        selectedSplit === split
                          ? 'bg-cyan-500 text-white'
                          : 'bg-white/[0.04] text-gray-400 border border-white/[0.06] active:bg-white/[0.08]'
                      } ${generating ? 'opacity-40' : ''}`}
                    >
                      {split}
                    </button>
                  ))}
                </div>
                <button onClick={() => onToggleSplitPicker(false)} className="mt-3 w-full text-center text-xs text-gray-700 active:text-gray-500">
                  {t('common.cancel')}
                </button>
              </div>
            )}

            <button onClick={onNavigateToCoach} className="w-full py-2 text-center text-xs text-gray-700 active:text-gray-500">
              {t('logger.advanced_options')}
            </button>
          </div>
        )}
      </div>

      {showTemplates && (
        <TemplateLibrary templates={templates.templates} onLoad={onLoadTemplate} onDelete={onDeleteTemplate} onClose={() => onSetShowTemplates(false)} />
      )}
      {toast && <Toast message={toast.message} action={toast.action} onAction={toast.onAction} onDismiss={() => onSetToast(null)} />}
    </div>
  )
}

export function formatDateForStartFlow(language: string): string {
  const today = new Date()
  const locale = LOCALE_MAP[language] || 'en-GB'
  const dateStr = today.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
}
