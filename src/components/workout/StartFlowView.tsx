import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Check, RefreshCw, Dumbbell, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { getCurrentBlock, PHASES } from '../../lib/periodization'
import type { StartFlowState, LastWorkoutPreview, PeriodizationPhase } from '../../types'
import TemplateLibrary from '../TemplateLibrary'
import Toast from '../Toast'

// Locale map for date formatting
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
}

export default function StartFlowView({
  state,
  user,
  formattedDate,
  lastWorkout,
  templates,
  showTemplates,
  toast,
  onStartEmpty,
  onStartAIWorkout,
  onRepeatLastWorkout,
  onLoadTemplate,
  onDeleteTemplate,
  onSetShowTemplates,
  onSetToast,
  onTimeChange,
  onGenerateForSplit,
  onToggleSplitPicker,
  onNavigateToCoach,
}: StartFlowViewProps) {
  const { t } = useTranslation()
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false)

  const block = getCurrentBlock()
  const phase = block ? PHASES[block.phase as PeriodizationPhase] : null

  const {
    loading,
    generating,
    error,
    selectedSplit,
    generatedWorkout,
    recoveredMuscles,
    showSplitPicker,
    estimatedDuration,
    exerciseCount,
    availableTime,
    retryCount,
  } = state

  const timeSelected = availableTime !== null
  const isReady = timeSelected && !loading && !generating && generatedWorkout && !error

  const getMuscleLabel = useCallback((muscle: string) => t(`muscles.${muscle}`), [t])

  // If user is not logged in, show simple start screen
  if (!user) {
    return (
      <div className="min-h-[80vh] px-5 py-10">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-500">{formattedDate}</p>
        <h1 className="mb-10 text-4xl font-black tracking-tight text-white">{t('logger.train')}</h1>

        <button
          onClick={onStartEmpty}
          className="w-full rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 text-left active:scale-[0.97] transition-transform"
        >
          <p className="text-2xl font-black text-white">{t('logger.start_empty')}</p>
          <p className="mt-1 text-sm font-medium text-white/70">{t('logger.free_training_sub')}</p>
        </button>

        {templates.templates.length > 0 && (
          <button
            onClick={() => onSetShowTemplates(true)}
            className="mt-4 w-full rounded-2xl bg-gray-900 p-4 text-center text-sm font-medium text-gray-400 border border-gray-800 active:bg-gray-800"
          >
            {t('logger.choose_template')}
          </button>
        )}

        {showTemplates && (
          <TemplateLibrary
            templates={templates.templates}
            onLoad={onLoadTemplate}
            onDelete={onDeleteTemplate}
            onClose={() => onSetShowTemplates(false)}
          />
        )}

        {toast && (
          <Toast
            message={toast.message}
            action={toast.action}
            onAction={toast.onAction}
            onDismiss={() => onSetToast(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] px-5 py-10">
      {/* Header */}
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-500">{formattedDate}</p>
      <h1 className="mb-8 text-4xl font-black tracking-tight text-white">
        {loading ? t('dashboard.title') : (selectedSplit || t('dashboard.title'))}
      </h1>

      {/* ---- PRIMARY CTA: AI Workout Hero Card ---- */}
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-6">
        {/* Status badge */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-lg font-black text-white">{t('logger.generate_workout')}</p>
          <div>
            {loading && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                <Loader2 size={12} className="animate-spin" />
                {t('logger.analyzing')}
              </span>
            )}
            {generating && !loading && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                <Loader2 size={12} className="animate-spin" />
                {t('logger.ai_generating')}
              </span>
            )}
            {isReady && (
              <span className="flex items-center gap-1.5 rounded-lg bg-white/30 px-2.5 py-1 text-xs font-bold text-white">
                <Check size={12} />
                {t('logger.ready')}
              </span>
            )}
            {error && (
              <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                {t('common.retry')}
              </span>
            )}
          </div>
        </div>

        {/* Inline time picker */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/60">{t('logger.available_time')}</p>
          <div className="flex gap-2">
            {[45, 60, 75, 90].map(min => (
              <button
                key={min}
                onClick={() => onTimeChange(min)}
                disabled={loading || generating}
                className={`rounded-xl px-3 py-1.5 text-sm font-bold transition-all active:scale-[0.97] ${
                  availableTime === min
                    ? 'bg-white text-cyan-600'
                    : 'bg-white/20 text-white'
                } ${loading || generating ? 'opacity-50 cursor-not-allowed' : ''}`}
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
              <span
                key={muscle}
                className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-medium text-white"
              >
                {getMuscleLabel(muscle)} {t('logger.recovered')}
              </span>
            ))}
          </div>
        )}

        {/* Block context if active */}
        {block && phase && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">
            {phase.label} {'\u00B7'} Week {block.currentWeek}/{phase.weeks}
          </p>
        )}

        {/* Main action button */}
        <button
          onClick={onStartAIWorkout}
          disabled={!isReady}
          className={`w-full rounded-xl py-4 text-base font-black transition-all active:scale-[0.97] ${
            isReady
              ? 'bg-white text-cyan-600'
              : 'bg-white/30 text-white/70 cursor-not-allowed'
          }`}
        >
          {!timeSelected ? (
            t('logger.select_time_first')
          ) : loading || generating ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={18} className="animate-spin" />
              {t('logger.loading_workout')}
            </span>
          ) : error ? (
            t('logger.generation_failed')
          ) : (
            `Start ${selectedSplit}`
          )}
        </button>

        {/* Exercise count + duration when ready */}
        {isReady && (
          <p className="mt-2 text-center text-sm font-medium text-white/70">
            {exerciseCount} {t('common.exercises')} {'\u00B7'} ~{estimatedDuration} min
          </p>
        )}

        {/* Error state with fallback */}
        {error && (
          <div className="mt-3">
            {retryCount >= 2 && (
              <p className="mb-2 text-center text-sm font-medium text-white/70">
                {t('logger.try_later')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => onGenerateForSplit(selectedSplit || 'Full Body')}
                className="flex-1 rounded-xl bg-white/20 py-2.5 text-sm font-semibold text-white active:bg-white/30"
              >
                <RefreshCw size={14} className="inline mr-1.5" />
                {t('common.retry')}
              </button>
              <button
                onClick={onNavigateToCoach}
                className="flex-1 rounded-xl bg-white/20 py-2.5 text-sm font-semibold text-white active:bg-white/30"
              >
                {t('logger.choose_exercises')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- SECONDARY CTA: Repeat Last Workout ---- */}
      {lastWorkout && (
        <button
          onClick={onRepeatLastWorkout}
          className="w-full rounded-2xl bg-gray-900 p-4 text-left border border-white/10 active:bg-gray-800 active:scale-[0.97] transition-transform mt-3"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">{t('logger.repeat_last')}</p>
          <p className="text-sm font-bold text-white truncate">{lastWorkout.preview}</p>
        </button>
      )}

      {/* ---- COLLAPSED: More Options ---- */}
      <div className="mt-6">
        <button
          onClick={() => setMoreOptionsOpen(prev => !prev)}
          className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-500 active:text-gray-400"
        >
          {t('logger.more_options')}
          {moreOptionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {moreOptionsOpen && (
          <div className="mt-3 space-y-3">
            {/* Templates */}
            <button
              onClick={() => onSetShowTemplates(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-gray-900 p-4 text-left border border-gray-800 active:scale-[0.97] transition-transform"
            >
              <BookOpen size={20} className="shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-bold text-white">{t('logger.template')}</p>
                <p className="text-xs text-gray-500">{t('logger.templates_saved', { count: templates.templates.length })}</p>
              </div>
            </button>

            {/* Empty training */}
            <button
              onClick={onStartEmpty}
              className="flex w-full items-center gap-3 rounded-2xl bg-gray-900 p-4 text-left border border-gray-800 active:scale-[0.97] transition-transform"
            >
              <Dumbbell size={20} className="shrink-0 text-gray-500" />
              <div>
                <p className="text-sm font-bold text-white">{t('logger.empty_training')}</p>
                <p className="text-xs text-gray-500">{t('logger.choose_exercises')}</p>
              </div>
            </button>

            {/* Split switcher */}
            <div>
              {!showSplitPicker ? (
                <button
                  onClick={() => onToggleSplitPicker(true)}
                  className="w-full text-center text-sm text-gray-500 active:text-gray-400"
                >
                  {t('logger.change_split')}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-center label-caps">{t('logger.choose_split')}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SPLIT_OPTIONS.map(split => (
                      <button
                        key={split}
                        onClick={() => onGenerateForSplit(split)}
                        disabled={generating}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                          selectedSplit === split
                            ? 'bg-cyan-500 text-white'
                            : 'bg-gray-900 text-gray-400 border border-gray-700 active:bg-gray-800'
                        } ${generating ? 'opacity-50' : ''}`}
                      >
                        {split}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onToggleSplitPicker(false)}
                    className="w-full text-center text-xs text-gray-600 active:text-gray-500"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>

            {/* Advanced options link */}
            <button
              onClick={onNavigateToCoach}
              className="w-full text-center text-xs text-gray-600 active:text-gray-500"
            >
              {t('logger.advanced_options')}
            </button>
          </div>
        )}
      </div>

      {showTemplates && (
        <TemplateLibrary
          templates={templates.templates}
          onLoad={onLoadTemplate}
          onDelete={onDeleteTemplate}
          onClose={() => onSetShowTemplates(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          onAction={toast.onAction}
          onDismiss={() => onSetToast(null)}
        />
      )}
    </div>
  )
}

/**
 * Format the current date string for the start flow header.
 */
export function formatDateForStartFlow(language: string): string {
  const today = new Date()
  const locale = LOCALE_MAP[language] || 'en-GB'
  const dateStr = today.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
}
