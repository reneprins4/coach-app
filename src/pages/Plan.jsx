import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  blue:   { bg: 'bg-blue-500/15',   text: 'text-blue-400',   bar: 'bg-blue-500',   ring: 'ring-blue-500/50',  activeBg: 'bg-blue-500/25', border: 'border-blue-500/40' },
  orange: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', bar: 'bg-cyan-500', ring: 'ring-cyan-500/50',activeBg: 'bg-cyan-500/25', border: 'border-cyan-500/40' },
  red:    { bg: 'bg-cyan-500/15',    text: 'text-cyan-400',    bar: 'bg-cyan-500',    ring: 'ring-cyan-500/50',   activeBg: 'bg-cyan-500/25', border: 'border-cyan-500/40' },
  gray:   { bg: 'bg-gray-500/15',   text: 'text-gray-400',   bar: 'bg-gray-500',   ring: 'ring-gray-500/50',  activeBg: 'bg-gray-500/25', border: 'border-gray-500/40' },
}

const PHASE_ICONS = {
  accumulation: Zap,
  intensification: TrendingUp,
  strength: Target,
  deload: Battery,
}

const SUGGESTED_ORDER = ['accumulation', 'intensification', 'strength', 'deload']

export default function Plan() {
  const nav = useNavigate()
  const { user } = useAuthContext()
  const settings = getSettings()
  const { workouts } = useWorkouts(user?.id)
  const [block, setBlock] = useState(null)
  const [selecting, setSelecting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  // Detecteer vermoeidheid
  const fatigue = workouts.length >= 4 ? detectFatigue(workouts) : null

  // Laad blok van Supabase (of localStorage als fallback)
  useEffect(() => {
    loadBlock(user?.id).then(b => setBlock(b))
  }, [user?.id])

  const weekTarget = block ? getCurrentWeekTarget(block) : null
  const progress = block ? getBlockProgress(block) : null
  const phase = block ? PHASES[block.phase] : null
  const phaseColor = PHASE_COLORS[phase?.color || 'orange']

  async function handleStart(phaseKey) {
    const b = await startBlock(phaseKey, user?.id)
    setBlock({ ...b, currentWeek: 1, daysElapsed: 0 })
    setSelecting(false)
  }

  async function handleClear() {
    await clearBlock(user?.id)
    setBlock(null)
    setConfirmClear(false)
  }

  const PhaseIcon = block ? PHASE_ICONS[block.phase] : null

  async function handleWizardStart(phaseKey, userId) {
    const b = await startBlock(phaseKey, userId)
    setBlock({ ...b, currentWeek: 1, daysElapsed: 0 })
  }

  return (
    <div className="px-4 py-6 pb-32">
      <h1 className="mb-1 text-2xl font-bold">Trainingsplan</h1>
      <p className="mb-6 text-sm text-gray-500">Gestructureerde periodisering voor consistente voortgang</p>

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
      <div className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-300">Waarom periodisering?</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Willekeurige trainingen stagneren snel. Trainingsblokken wisselen door opbouw (meer volume), intensivering (meer gewicht) en deload (herstel). Elke fase bouwt voort op de vorige — zo boeken serieuze sporters consistente vooruitgang.
            </p>
          </div>
        </div>
      </div>

      {/* Current block */}
      {block && phase && !selecting ? (
        <>
          <div className={`mb-5 rounded-xl border ${phaseColor.border} ${phaseColor.bg} p-5`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${phaseColor.text}`}>Actief blok</span>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-gray-600 active:text-cyan-400"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3">
              {PhaseIcon && <PhaseIcon size={28} className={phaseColor.text} />}
              <div>
                <p className="text-xl font-black text-white">{phase.label}</p>
                <p className="text-sm text-gray-400">{phase.description}</p>
              </div>
            </div>

            {/* Vermoeidheid indicator */}
            {fatigue?.fatigued && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                <span className="text-cyan-400">
                  {fatigue.recommendation === 'urgent'
                    ? 'Vermoeidheid gedetecteerd — deload aanbevolen'
                    : 'Signalen van vermoeidheid gedetecteerd'}
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
                    className={`flex flex-1 flex-col items-center rounded-xl py-3 text-center ring-1 ${
                      isCurrent
                        ? `${phaseColor.activeBg} ${phaseColor.ring}`
                        : isDone
                        ? 'bg-gray-800 ring-gray-700'
                        : 'bg-gray-800/50 ring-gray-800'
                    }`}
                  >
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                      isCurrent ? phaseColor.text : isDone ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Week {weekNum}
                    </span>
                    <span className={`mt-1 text-[10px] ${isCurrent ? 'text-white font-medium' : isDone ? 'text-gray-500' : 'text-gray-700'}`}>
                      {wt.isDeload ? 'Deload' : `RPE ${wt.rpe}`}
                    </span>
                    {isDone && <CheckCircle2 size={12} className="mt-1 text-green-500" />}
                    {isCurrent && <span className="mt-1 text-[8px] uppercase text-cyan-400 font-bold">Nu</span>}
                  </div>
                )
              })}
            </div>

            {/* Current week details */}
            {weekTarget && (
              <div className="rounded-xl bg-black/20 p-3">
                <p className={`mb-2 text-[10px] font-semibold uppercase tracking-widest ${phaseColor.text}`}>
                  {weekTarget.isDeload ? 'Deload week' : `Week ${progress?.currentWeek} focus`}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Herhalingsreeks</span>
                    <p className="font-semibold text-white">{weekTarget.repRange[0]}–{weekTarget.repRange[1]} reps</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Doel RPE</span>
                    <p className="font-semibold text-white">{weekTarget.rpe}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Volumenotitie</span>
                    <p className="font-semibold text-white">{weekTarget.setNote}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start workout CTA */}
          <button
            onClick={() => nav('/coach')}
            className="flex h-14 w-full items-center gap-3 rounded-2xl bg-cyan-500 px-5 font-bold text-white active:scale-[0.97] transition-transform mb-4"
          >
            <Sparkles size={20} />
            Genereer training van vandaag
            <ChevronRight size={18} className="ml-auto" />
          </button>

          {/* Phase sequence suggestion */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">Aanbevolen volgorde</p>
            <div className="flex gap-1.5">
              {SUGGESTED_ORDER.map((key, i) => {
                const p = PHASES[key]
                const isCurrent = key === block.phase
                const c = PHASE_COLORS[p.color]
                const Icon = PHASE_ICONS[key]
                return (
                  <div key={key} className={`flex flex-1 flex-col items-center rounded-xl py-2 text-center ${isCurrent ? c.bg + ' ring-1 ' + c.ring : 'bg-gray-800'}`}>
                    <Icon size={16} className={isCurrent ? c.text : 'text-gray-500'} />
                    <span className={`mt-1 text-[9px] font-medium ${isCurrent ? c.text : 'text-gray-500'}`}>{p.label.split(' ')[0]}</span>
                    <span className={`text-[8px] ${isCurrent ? c.text : 'text-gray-700'}`}>{p.weeks}w</span>
                    {isCurrent && <span className="mt-0.5 text-[7px] uppercase font-bold text-cyan-400">actief</span>}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-gray-600">
              Na dit blok, ga naar de volgende fase voor continue vooruitgang.
            </p>
          </div>
        </>
      ) : (
        /* Phase selector */
        <>
          <p className="mb-4 text-sm text-gray-400">Kies je trainingsfase:</p>
          <div className="space-y-3">
            {Object.entries(PHASES).map(([key, p]) => {
              const c = PHASE_COLORS[p.color]
              const Icon = PHASE_ICONS[key]
              return (
                <button
                  key={key}
                  onClick={() => handleStart(key)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${c.bg} ${c.border} active:scale-[0.98]`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Icon size={24} className={c.text} />
                      <div>
                        <p className="font-bold text-white">{p.label}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{p.description}</p>
                        <div className="mt-2 flex gap-3 text-xs">
                          <span className={c.text}>{p.weeks} weken</span>
                          <span className="text-gray-600">
                            RPE {p.weekTargets[0].rpe}–{p.weekTargets[p.weekTargets.length - 2]?.rpe || p.weekTargets[0].rpe}
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
              className="mt-4 w-full rounded-xl py-3 text-sm text-gray-500 ring-1 ring-gray-800"
            >
              Annuleer
            </button>
          )}

          {!block && (
            <>
              <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
                <p className="text-sm text-gray-500">Nieuw met gestructureerde training?</p>
                <p className="mt-1 text-xs text-gray-600">Begin met Opbouw — het bouwt je werkcapaciteit op en went je aan het bijhouden.</p>
              </div>
              <button
                onClick={() => setWizardOpen(true)}
                className="mt-4 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-cyan-500 px-5 font-bold text-white active:scale-[0.97] transition-transform"
              >
                <Sparkles size={20} />
                Start trainingsblok
                <ChevronRight size={18} className="ml-auto" />
              </button>
            </>
          )}
        </>
      )}

      {/* Confirm clear */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">Huidig blok beëindigen?</h3>
            <p className="mb-6 text-sm text-gray-400">Je kunt daarna direct een nieuw blok starten.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)} className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700">Annuleer</button>
              <button onClick={handleClear} className="h-12 flex-1 rounded-xl bg-cyan-600 font-semibold text-white">Blok beëindigen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
