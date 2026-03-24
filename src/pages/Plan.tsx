import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ChevronRight, RotateCcw, Sparkles, Info, Zap, TrendingUp, Target, Battery } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import {
  PHASES, loadBlock, startBlock, clearBlock,
  getCurrentWeekTarget, getBlockProgress
} from '../lib/periodization'
import { getSettings, parseFrequency } from '../lib/settings'
import { useAuthContext } from '../App'
import { useWorkouts } from '../hooks/useWorkouts'
import { detectFatigue } from '../lib/fatigueDetector'
import InjuryRadar from '../components/InjuryRadar'
import BlockWizard from '../components/BlockWizard'
import PageTransition from '../components/PageTransition'

const PHASE_COLORS = {
  blue:   { bg: 'bg-blue-500/12',   text: 'text-blue-400',    bar: 'bg-blue-500',    border: 'border-blue-500/30',    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]' },
  orange: { bg: 'bg-orange-500/12',  text: 'text-orange-400',  bar: 'bg-orange-500',  border: 'border-orange-500/30',  glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]' },
  red:    { bg: 'bg-red-500/12',     text: 'text-red-400',     bar: 'bg-red-500',     border: 'border-red-500/30',     glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]' },
  gray:   { bg: 'bg-emerald-500/12', text: 'text-emerald-400', bar: 'bg-emerald-500', border: 'border-emerald-500/30', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]' },
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
  const settings = getSettings()
  const { workouts } = useWorkouts(user?.id)
  const [block, setBlock] = useState<import('../types').TrainingBlock | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  const targetFrequency = parseFrequency(settings.frequency)
  const fatigue = workouts.length >= 4 ? detectFatigue(workouts, 3, targetFrequency) : null

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
    <PageTransition>
    <div className="relative overflow-hidden px-5 pt-6 pb-32">
      {/* Atmospheric glow */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 h-[500px] w-[600px] bg-[radial-gradient(ellipse,rgba(6,182,212,0.10)_0%,transparent_70%)] blur-[100px] z-0" />

      {/* Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="label-caps mb-1">{t('plan.periodization')}</p>
        <h1 className="text-display">{t('plan.title')}</h1>
      </motion.div>

      {/* Injury Prevention Radar */}
      <InjuryRadar workouts={workouts} />

      {/* Block Wizard Modal */}
      <BlockWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onStart={handleWizardStart}
        userId={user?.id}
      />

      {/* ━━ ACTIVE BLOCK VIEW ━━ */}
      {block && phase && !selecting ? (
        <>
          {/* Phase Hero */}
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={`rounded-2xl border p-6 ${phaseColor.bg} ${phaseColor.border} ${phaseColor.glow}`}>
              <div className="flex items-center justify-between mb-5">
                <span className={`label-caps ${phaseColor.text}`}>{t('plan.active_block')}</span>
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-[var(--text-3)] active:text-white active:bg-white/[0.08]"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Phase identity */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${phaseColor.bg} border ${phaseColor.border}`}>
                  {PhaseIcon && <PhaseIcon size={28} className={phaseColor.text} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-display text-2xl">{t(phase.labelKey)}</h2>
                  <p className="mt-1 text-sm text-[var(--text-2)] leading-snug">{t(phase.descriptionKey)}</p>
                </div>
              </div>

              {/* Overall progress bar */}
              {progress && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[var(--text-2)]">
                      {t('phases.week_of', { current: progress.currentWeek, total: progress.totalWeeks })}
                    </span>
                    <span className={`text-xs font-bold tabular ${phaseColor.text}`}>{progress.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/30">
                    <motion.div
                      className={`h-full rounded-full ${phaseColor.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(progress.pct, 4)}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Fatigue warning */}
          {fatigue?.fatigued && (
            <motion.div
              className="card-accent mb-5 flex items-center gap-3"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15">
                <Info size={14} className="text-cyan-400" />
              </div>
              <p className="text-sm font-medium text-cyan-400">
                {fatigue.recommendation === 'urgent'
                  ? t('plan.fatigue_urgent')
                  : t('plan.fatigue_signals')}
              </p>
            </motion.div>
          )}

          {/* Week Timeline */}
          <motion.div
            className="mb-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          >
            <p className="label-caps mb-3">{t('plan.week_timeline') || t('plan.week')}</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${phase.weekTargets.length}, 1fr)` }}>
              {phase.weekTargets.map((wt, i) => {
                const weekNum = i + 1
                const isDone = weekNum < (progress?.currentWeek || 1)
                const isCurrent = weekNum === (progress?.currentWeek || 1)
                return (
                  <motion.div
                    key={i}
                    className={`flex flex-col items-center rounded-xl px-1 py-3.5 text-center border transition-all ${
                      isCurrent
                        ? `${phaseColor.bg} ${phaseColor.border} ${phaseColor.glow}`
                        : isDone
                        ? 'bg-white/[0.04] border-white/[0.08]'
                        : 'bg-white/[0.02] border-white/[0.04]'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.15 + i * 0.06 }}
                  >
                    <span className={`text-xs font-bold ${
                      isCurrent ? phaseColor.text : isDone ? 'text-white' : 'text-[var(--text-3)]'
                    }`}>
                      W{weekNum}
                    </span>
                    <span className={`mt-1 text-[11px] tabular ${isCurrent ? 'text-white font-semibold' : 'text-[var(--text-3)]'}`}>
                      {wt.isDeload ? t('phases.deload') : `RPE ${wt.rpe}`}
                    </span>
                    {isDone && <CheckCircle2 size={13} className="mt-1.5 text-emerald-500" />}
                    {isCurrent && (
                      <span className={`mt-1.5 text-[9px] font-black uppercase tracking-wider ${phaseColor.text}`}>{t('plan.now')}</span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Current Week Focus */}
          {weekTarget && (
            <motion.div
              className="card mb-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <p className={`label-caps mb-4 ${phaseColor.text}`}>
                {weekTarget.isDeload ? t('plan.deload_week') : `${t('plan.week')} ${progress?.currentWeek} — ${t('plan.week_focus')}`}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="label-caps mb-1">{t('plan.rep_range')}</p>
                  <p className="text-xl font-black tabular text-white">{weekTarget.repRange[0]}-{weekTarget.repRange[1]}</p>
                  <p className="text-xs text-[var(--text-3)]">reps</p>
                </div>
                <div>
                  <p className="label-caps mb-1">{t('plan.target_rpe')}</p>
                  <p className="text-xl font-black tabular text-white">{weekTarget.rpe}</p>
                  <p className="text-xs text-[var(--text-3)]">RPE</p>
                </div>
                <div className="col-span-2 rounded-xl bg-white/[0.03] border border-white/[0.04] px-4 py-3">
                  <p className="text-sm font-semibold text-white">{weekTarget.setNote}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Start Workout CTA */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <motion.button
              onClick={() => nav('/log')}
              className="btn-primary"
              whileTap={{ scale: 0.97 }}
            >
              {t('plan.generate_today')}
            </motion.button>
          </motion.div>

          {/* Phase Roadmap */}
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <p className="label-caps mb-4">{t('plan.recommended_order')}</p>
            <div className="flex gap-2">
              {SUGGESTED_ORDER.map((key, i) => {
                const p = PHASES[key as import('../types').PeriodizationPhase]
                const isCurrent = key === block.phase
                const c = PHASE_COLORS[p.color as keyof typeof PHASE_COLORS]
                const Icon = PHASE_ICONS[key as keyof typeof PHASE_ICONS]
                return (
                  <div key={key} className="flex flex-1 flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                      isCurrent ? `${c.bg} ${c.border}` : 'bg-white/[0.03] border-white/[0.06]'
                    }`}>
                      <Icon size={18} className={isCurrent ? c.text : 'text-[var(--text-3)]'} />
                    </div>
                    <span className={`mt-2 text-[11px] font-bold leading-tight text-center ${isCurrent ? c.text : 'text-[var(--text-3)]'}`}>
                      {t(p.labelKey).split(' ')[0]}
                    </span>
                    <span className={`text-[10px] tabular ${isCurrent ? c.text : 'text-[var(--text-3)]'}`}>{p.weeks}w</span>
                    {isCurrent && (
                      <div className={`mt-1 h-1 w-1 rounded-full ${c.bar}`} />
                    )}
                    {i < SUGGESTED_ORDER.length - 1 && (
                      <div className="absolute" />
                    )}
                  </div>
                )
              })}
            </div>
            {Array.isArray(block.fullPlan) && (block.fullPlan as string[]).length > 1 && (
              <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/[0.04] px-4 py-3">
                <p className="text-xs font-medium text-[var(--text-2)]">
                  {String(t('plan.program'))}: {String((block.fullPlan as string[]).map(p => { const ph = PHASES[p as import('../types').PeriodizationPhase]; return ph ? t(ph.labelKey) : p; }).join(' \u2192 '))}
                </p>
                <p className="text-[11px] text-[var(--text-3)] mt-1">
                  {t('plan.next_phase_auto')}
                </p>
              </div>
            )}
            <p className="mt-4 text-xs text-[var(--text-3)]">
              {t('plan.after_block_hint')}
            </p>
          </motion.div>
        </>
      ) : (
        /* ━━ PHASE SELECTOR VIEW ━━ */
        <>
          {/* Info banner */}
          <motion.div
            className="glass mb-6 p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
                <Info size={16} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t('plan.why_periodization')}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-2)]">
                  {t('plan.why_periodization_desc')}
                </p>
              </div>
            </div>
          </motion.div>

          <p className="label-caps mb-4">{t('plan.choose_phase')}</p>

          <div className="space-y-3">
            {Object.entries(PHASES).map(([key, p], index) => {
              const c = PHASE_COLORS[p.color as keyof typeof PHASE_COLORS]
              const Icon = PHASE_ICONS[key as keyof typeof PHASE_ICONS]
              return (
                <motion.button
                  key={key}
                  onClick={() => handleStart(key as import('../types').PeriodizationPhase)}
                  className={`w-full rounded-2xl border p-5 text-left transition-all ${c.bg} ${c.border} active:scale-[0.98]`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.05 + index * 0.07 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.bg} border ${c.border}`}>
                      <Icon size={24} className={c.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-title text-base">{t(p.labelKey)}</p>
                        <ChevronRight size={16} className={c.text} />
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">{t(p.descriptionKey)}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${c.bg} ${c.text}`}>
                          {p.weeks} {t('plan.weeks')}
                        </span>
                        <span className="text-[11px] font-medium tabular text-[var(--text-3)]">
                          RPE {p.weekTargets[0]!.rpe} - {p.weekTargets[p.weekTargets.length - 2]?.rpe ?? p.weekTargets[0]!.rpe}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {block && (
            <button
              onClick={() => setSelecting(false)}
              className="btn-secondary mt-5"
            >
              {t('common.cancel')}
            </button>
          )}

          {!block && (
            <>
              <div className="card mt-7 text-center">
                <p className="text-sm font-medium text-[var(--text-2)]">{t('plan.new_hint')}</p>
                <p className="mt-1 text-xs text-[var(--text-3)]">{t('plan.new_hint_sub')}</p>
              </div>
              <button
                onClick={() => setWizardOpen(true)}
                className="btn-primary mt-4"
              >
                <Sparkles size={18} />
                {t('plan.start_block')}
                <ChevronRight size={16} className="ml-auto" />
              </button>
            </>
          )}
        </>
      )}

      {/* Confirm clear dialog */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onKeyDown={(e) => { if (e.key === 'Escape') setConfirmClear(false) }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="plan-confirm-title"
              className="card w-full max-w-sm p-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <h3 id="plan-confirm-title" className="text-title mb-2">{t('plan.end_block_confirm')}</h3>
              <p className="mb-6 text-sm text-[var(--text-2)]">{t('plan.end_block_hint')}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmClear(false)} className="btn-secondary flex-1">{t('common.cancel')}</button>
                <button onClick={handleClear} className="btn-primary flex-1">{t('plan.end_block')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </PageTransition>
  )
}
