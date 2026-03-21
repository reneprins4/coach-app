import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ChevronRight, RotateCcw, Sparkles, Info, Zap, TrendingUp, Target, Battery } from 'lucide-react'
import {
  PHASES, loadBlock, startBlock, clearBlock,
  getCurrentWeekTarget, getBlockProgress
} from '../lib/periodization'
import { getSettings } from '../lib/settings'
import { useAuthContext } from '../App'
import { useWorkouts } from '../hooks/useWorkouts'
import { detectFatigue } from '../lib/fatigueDetector'
import InjuryRadar from '../components/InjuryRadar'
import BlockWizard from '../components/BlockWizard'

const PHASE_COLORS = {
  blue:   { bg: 'bg-blue-500/15',  text: 'text-blue-400',  bar: 'bg-blue-500',  border: 'border-blue-500/40' },
  orange: { bg: 'bg-cyan-500/15',  text: 'text-cyan-400',  bar: 'bg-cyan-500',  border: 'border-cyan-500/40' },
  red:    { bg: 'bg-cyan-500/15',  text: 'text-cyan-400',  bar: 'bg-cyan-500',  border: 'border-cyan-500/40' },
  gray:   { bg: 'bg-gray-500/15',  text: 'text-gray-400',  bar: 'bg-gray-500',  border: 'border-gray-500/40' },
}

const PHASE_ICONS = {
  accumulation: Zap,
  intensification: TrendingUp,
  strength: Target,
  deload: Battery,
}

const SUGGESTED_ORDER = ['accumulation', 'intensification', 'strength', 'deload']

export default function Plan() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { user } = useAuthContext()
  getSettings()  // loaded for side effects
  const { workouts } = useWorkouts(user?.id)
  const [block, setBlock] = useState<import('../types').TrainingBlock | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  // Detecteer vermoeidheid
  const fatigue = workouts.length >= 4 ? detectFatigue(workouts) : null

  // Laad blok van Supabase (of localStorage als fallback)
  useEffect(() => {
    let cancelled = false
    loadBlock(user?.id ?? null).then(b => {
      if (!cancelled) setBlock(b)
    })
    return () => { cancelled = true }
  }, [user?.id])

  const weekTarget = block ? getCurrentWeekTarget(block) : null
  const progress = block ? getBlockProgress(block) : null
  const phase = block ? PHASES[block.phase] : null
  const phaseColor = PHASE_COLORS[(phase?.color || 'orange') as keyof typeof PHASE_COLORS]

  async function handleStart(phaseKey: import('../types').PeriodizationPhase) {
    const b = await startBlock(phaseKey, user?.id ?? null)
    setBlock({ ...b, currentWeek: 1, daysElapsed: 0 })
    setSelecting(false)
  }

  async function handleClear() {
    await clearBlock(user?.id ?? null)
    setBlock(null)
    setConfirmClear(false)
  }

  const PhaseIcon = block ? PHASE_ICONS[block.phase] : null

  async function handleWizardStart(phaseKey: string, userId: string | undefined, fullPlan: string[] | null = null) {
    const b = await startBlock(phaseKey as import('../types').PeriodizationPhase, userId ?? null, fullPlan)
    setBlock({ ...b, currentWeek: 1, daysElapsed: 0 })
  }

  return (
    <div className="px-4 py-6 pb-32">
      <div className="mb-6">
        <p className="label-caps mb-1">{t('plan.periodization')}</p>
        <h1 className="text-display">{t('plan.title')}</h1>
      </div>

      {/* Injury Prevention Radar */}
      <InjuryRadar workouts={workouts} />

      {/* Block Wizard Modal */}
      <BlockWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onStart={handleWizardStart}
        userId={user?.id}
      />

      {/* What is periodization — info banner */}
      <div className="card mb-5">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 shrink-0 text-[var(--text-3)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text-2)]">{t('plan.why_periodization')}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-3)]">
              {t('plan.why_periodization_desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Current block */}
      {block && phase && !selecting ? (
        <>
          <div className={`card-accent mb-5 ${phaseColor.border}`}>
            <div className="mb-1 flex items-center justify-between">
              <span className="label-caps">{t('plan.active_block')}</span>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-[var(--text-3)] active:text-cyan-400"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3">
              {PhaseIcon && <PhaseIcon size={28} className={phaseColor.text} />}
              <div>
                <p className="text-title">{phase.label}</p>
                <p className="text-sm text-[var(--text-2)]">{phase.description}</p>
              </div>
            </div>

            {/* Vermoeidheid indicator */}
            {fatigue?.fatigued && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
                <span className="text-cyan-400">
                  {fatigue.recommendation === 'urgent'
                    ? t('plan.fatigue_urgent')
                    : t('plan.fatigue_signals')}
                </span>
              </div>
            )}

            {/* Week timeline */}
            <div className="mb-4 flex gap-2">
              {phase.weekTargets.map((wt, i) => {
                const weekNum = i + 1
                const isDone = weekNum < (progress?.currentWeek || 1)
                const isCurrent = weekNum === (progress?.currentWeek || 1)
                return (
                  <div
                    key={i}
                    className={`flex flex-1 flex-col items-center rounded-xl py-3 text-center border ${
                      isCurrent
                        ? `${phaseColor.bg} ${phaseColor.border}`
                        : isDone
                        ? 'bg-white/[0.04] border-[var(--border-subtle)]'
                        : 'bg-white/[0.02] border-[var(--border-subtle)]'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                      isCurrent ? phaseColor.text : isDone ? 'text-[var(--text-2)]' : 'text-[var(--text-3)]'
                    }`}>
                      {t('plan.week')} {weekNum}
                    </span>
                    <span className={`mt-1 text-[10px] ${isCurrent ? 'text-white font-medium' : isDone ? 'text-[var(--text-3)]' : 'text-[var(--text-3)]'}`}>
                      {wt.isDeload ? 'Deload' : `RPE ${wt.rpe}`}
                    </span>
                    {isDone && <CheckCircle2 size={12} className="mt-1 text-green-500" />}
                    {isCurrent && <span className="mt-1 text-[8px] uppercase text-cyan-400 font-bold">{t('plan.now')}</span>}
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-[var(--text-3)] text-center">{t('plan.week_based_on_start')}</p>

            {/* Current week details */}
            {weekTarget && (
              <div className="mt-3 rounded-xl bg-black/20 p-3 border border-[var(--border-subtle)]">
                <p className={`mb-2 label-caps ${phaseColor.text}`}>
                  {weekTarget.isDeload ? t('plan.deload_week') : `${t('plan.week')} ${progress?.currentWeek} ${t('plan.week_focus')}`}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[var(--text-3)]">{t('plan.rep_range')}</span>
                    <p className="font-semibold text-white">{weekTarget.repRange[0]}–{weekTarget.repRange[1]} reps</p>
                  </div>
                  <div>
                    <span className="text-[var(--text-3)]">{t('plan.target_rpe')}</span>
                    <p className="font-semibold text-white">{weekTarget.rpe}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[var(--text-3)]">{t('plan.volume_note')}</span>
                    <p className="font-semibold text-white">{weekTarget.setNote}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start workout CTA */}
          <button
            onClick={() => nav('/coach')}
            className="btn-primary mb-4"
          >
            <Sparkles size={20} />
            {t('plan.generate_today')}
            <ChevronRight size={18} className="ml-auto" />
          </button>

          {/* Phase sequence suggestion */}
          <div className="card">
            <p className="label-caps mb-3">{t('plan.recommended_order')}</p>
            <div className="flex gap-1.5">
              {SUGGESTED_ORDER.map((key) => {
                const p = PHASES[key as import('../types').PeriodizationPhase]
                const isCurrent = key === block.phase
                const c = PHASE_COLORS[p.color as keyof typeof PHASE_COLORS]
                const Icon = PHASE_ICONS[key as keyof typeof PHASE_ICONS]
                return (
                  <div key={key} className={`flex flex-1 flex-col items-center rounded-xl py-2 text-center border ${isCurrent ? c.bg + ' ' + c.border : 'bg-white/[0.03] border-[var(--border-subtle)]'}`}>
                    <Icon size={16} className={isCurrent ? c.text : 'text-[var(--text-3)]'} />
                    <span className={`mt-1 text-[9px] font-medium ${isCurrent ? c.text : 'text-[var(--text-3)]'}`}>{p.label.split(' ')[0]}</span>
                    <span className={`text-[8px] ${isCurrent ? c.text : 'text-[var(--text-3)]'}`}>{p.weeks}w</span>
                    {isCurrent && <span className="mt-0.5 text-[7px] uppercase font-bold text-cyan-400">{t('plan.active_block').toLowerCase()}</span>}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-[var(--text-3)]">
              {t('plan.after_block_hint')}
            </p>
            {Array.isArray(block.fullPlan) && (block.fullPlan as string[]).length > 1 && (
              <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 border border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-3)]">
                  {String(t('plan.program'))}: {String((block.fullPlan as string[]).map(p => PHASES[p as import('../types').PeriodizationPhase]?.label || p).join(' \u2192 '))}
                </p>
                <p className="text-[10px] text-[var(--text-3)] mt-0.5">
                  {t('plan.next_phase_auto')}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Phase selector */
        <>
          <p className="mb-4 text-sm text-[var(--text-2)]">{t('plan.choose_phase')}</p>
          <div className="space-y-3">
            {Object.entries(PHASES).map(([key, p]) => {
              const c = PHASE_COLORS[p.color as keyof typeof PHASE_COLORS]
              const Icon = PHASE_ICONS[key as keyof typeof PHASE_ICONS]
              return (
                <button
                  key={key}
                  onClick={() => handleStart(key as import('../types').PeriodizationPhase)}
                  className={`card w-full text-left transition-all active:scale-[0.98] ${c.bg} border-[var(--border-accent)]`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon size={24} className={c.text} />
                      <div>
                        <p className="font-bold text-white">{p.label}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-2)]">{p.description}</p>
                        <div className="mt-2 flex gap-3 text-xs">
                          <span className={c.text}>{p.weeks} {t('plan.weeks')}</span>
                          <span className="text-[var(--text-3)]">
                            RPE {p.weekTargets[0]!.rpe}–{p.weekTargets[p.weekTargets.length - 2]?.rpe ?? p.weekTargets[0]!.rpe}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={18} className={c.text} />
                  </div>
                </button>
              )
            })}
          </div>

          {block && (
            <button
              onClick={() => setSelecting(false)}
              className="btn-secondary mt-4"
            >
              {t('common.cancel')}
            </button>
          )}

          {!block && (
            <>
              <div className="card mt-6 text-center">
                <p className="text-sm text-[var(--text-3)]">{t('plan.new_hint')}</p>
                <p className="mt-1 text-xs text-[var(--text-3)]">{t('plan.new_hint_sub')}</p>
              </div>
              <button
                onClick={() => setWizardOpen(true)}
                className="btn-primary mt-4"
              >
                <Sparkles size={20} />
                {t('plan.start_block')}
                <ChevronRight size={18} className="ml-auto" />
              </button>
            </>
          )}
        </>
      )}

      {/* Confirm clear */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4">
          <div className="card w-full max-w-sm p-6">
            <h3 className="text-title mb-2">{t('plan.end_block_confirm')}</h3>
            <p className="mb-6 text-sm text-[var(--text-2)]">{t('plan.end_block_hint')}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button onClick={handleClear} className="btn-primary flex-1">{t('plan.end_block')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
