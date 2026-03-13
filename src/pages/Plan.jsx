import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight, RotateCcw, Sparkles, Info } from 'lucide-react'
import {
  PHASES, getCurrentBlock, startBlock, clearBlock,
  getCurrentWeekTarget, getBlockProgress
} from '../lib/periodization'
import { getSettings } from '../lib/settings'

const PHASE_COLORS = {
  blue:   { bg: 'bg-blue-500/15',   text: 'text-blue-400',   bar: 'bg-blue-500',   ring: 'ring-blue-500/50',  activeBg: 'bg-blue-500/25' },
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', bar: 'bg-orange-500', ring: 'ring-orange-500/50',activeBg: 'bg-orange-500/25' },
  red:    { bg: 'bg-red-500/15',    text: 'text-red-400',    bar: 'bg-red-500',    ring: 'ring-red-500/50',   activeBg: 'bg-red-500/25' },
  gray:   { bg: 'bg-gray-500/15',   text: 'text-gray-400',   bar: 'bg-gray-500',   ring: 'ring-gray-500/50',  activeBg: 'bg-gray-500/25' },
}

const SUGGESTED_ORDER = ['accumulation', 'intensification', 'strength', 'deload']

export default function Plan() {
  const nav = useNavigate()
  const settings = getSettings()
  const [block, setBlock] = useState(() => getCurrentBlock())
  const [selecting, setSelecting] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const weekTarget = block ? getCurrentWeekTarget(block) : null
  const progress = block ? getBlockProgress(block) : null
  const phase = block ? PHASES[block.phase] : null
  const phaseColor = PHASE_COLORS[phase?.color || 'orange']

  function handleStart(phaseKey) {
    const b = startBlock(phaseKey)
    setBlock({ ...b, currentWeek: 1, daysElapsed: 0 })
    setSelecting(false)
  }

  function handleClear() {
    clearBlock()
    setBlock(null)
    setConfirmClear(false)
  }

  return (
    <div className="px-4 py-6 pb-32">
      <h1 className="mb-1 text-2xl font-bold">Training Plan</h1>
      <p className="mb-6 text-sm text-gray-500">Structured periodization for consistent progress</p>

      {/* What is periodization — info banner */}
      <div className="mb-5 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5 shrink-0 text-gray-500" />
          <div>
            <p className="text-sm font-medium text-gray-300">Why periodization?</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Random workouts plateau fast. Training blocks cycle through accumulation (more volume), intensification (more weight), and deload (recovery). Each phase builds on the last — this is how serious lifters make consistent progress.
            </p>
          </div>
        </div>
      </div>

      {/* Current block */}
      {block && phase && !selecting ? (
        <>
          <div className={`mb-5 rounded-xl border ${
            PHASE_COLORS[phase.color].ring.replace('ring-', 'border-').replace('/50', '/40')
          } ${phaseColor.bg} p-5`}>
            <div className="mb-1 flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${phaseColor.text}`}>Active Block</span>
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs text-gray-600 active:text-red-400"
              >
                <RotateCcw size={14} />
              </button>
            </div>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl">{phase.emoji}</span>
              <div>
                <p className="text-xl font-black text-white">{phase.label}</p>
                <p className="text-sm text-gray-400">{phase.description}</p>
              </div>
            </div>

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
                    <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isCurrent ? phaseColor.text : isDone ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Week {weekNum}
                    </span>
                    <span className={`mt-1 text-[10px] ${isCurrent ? 'text-white font-medium' : isDone ? 'text-gray-500' : 'text-gray-700'}`}>
                      {wt.isDeload ? 'Deload' : `RPE ${wt.rpe}`}
                    </span>
                    {isDone && <CheckCircle2 size={12} className="mt-1 text-green-500" />}
                    {isCurrent && <span className="mt-1 text-[8px] uppercase text-orange-400 font-bold">Now</span>}
                  </div>
                )
              })}
            </div>

            {/* Current week details */}
            {weekTarget && (
              <div className="rounded-xl bg-black/20 p-3">
                <p className={`mb-2 text-xs font-semibold ${phaseColor.text}`}>
                  {weekTarget.isDeload ? '🔄 Deload Week' : `Week ${progress?.currentWeek} Focus`}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Rep range</span>
                    <p className="font-semibold text-white">{weekTarget.repRange[0]}–{weekTarget.repRange[1]} reps</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Target RPE</span>
                    <p className="font-semibold text-white">{weekTarget.rpe}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Volume note</span>
                    <p className="font-semibold text-white">{weekTarget.setNote}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Start workout CTA */}
          <button
            onClick={() => nav('/coach')}
            className="flex h-14 w-full items-center gap-3 rounded-2xl bg-orange-500 px-5 font-bold text-white active:scale-[0.97] transition-transform mb-4"
          >
            <Sparkles size={20} />
            Generate today's workout
            <ChevronRight size={18} className="ml-auto" />
          </button>

          {/* Phase sequence suggestion */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="mb-3 text-sm font-semibold text-gray-300">Recommended sequence</p>
            <div className="flex gap-1.5">
              {SUGGESTED_ORDER.map((key, i) => {
                const p = PHASES[key]
                const isCurrent = key === block.phase
                const c = PHASE_COLORS[p.color]
                return (
                  <div key={key} className={`flex flex-1 flex-col items-center rounded-xl py-2 text-center ${isCurrent ? c.bg + ' ring-1 ' + c.ring : 'bg-gray-800'}`}>
                    <span className="text-base">{p.emoji}</span>
                    <span className={`mt-1 text-[9px] font-medium ${isCurrent ? c.text : 'text-gray-500'}`}>{p.label.split(' ')[0]}</span>
                    <span className={`text-[8px] ${isCurrent ? c.text : 'text-gray-700'}`}>{p.weeks}w</span>
                    {isCurrent && <span className="mt-0.5 text-[7px] uppercase font-bold text-orange-400">active</span>}
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] text-gray-600">
              After completing this block, move to the next phase for continuous progress.
            </p>
          </div>
        </>
      ) : (
        /* Phase selector */
        <>
          <p className="mb-4 text-sm text-gray-400">Choose your training phase:</p>
          <div className="space-y-3">
            {Object.entries(PHASES).map(([key, p]) => {
              const c = PHASE_COLORS[p.color]
              return (
                <button
                  key={key}
                  onClick={() => handleStart(key)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    c.bg
                  } border-${p.color === 'gray' ? 'gray' : p.color}-500/30 active:scale-[0.98]`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{p.emoji}</span>
                      <div>
                        <p className="font-bold text-white">{p.label}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{p.description}</p>
                        <div className="mt-2 flex gap-3 text-xs">
                          <span className={c.text}>{p.weeks} weeks</span>
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
              Cancel
            </button>
          )}

          {!block && (
            <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900 p-4 text-center">
              <p className="text-sm text-gray-500">New to structured training?</p>
              <p className="mt-1 text-xs text-gray-600">Start with Accumulation — it builds your work capacity and gets you used to tracking.</p>
            </div>
          )}
        </>
      )}

      {/* Confirm clear */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h3 className="mb-2 text-lg font-bold text-white">End current block?</h3>
            <p className="mb-6 text-sm text-gray-400">You can start a new one right after.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmClear(false)} className="h-12 flex-1 rounded-xl font-medium text-white ring-1 ring-gray-700">Cancel</button>
              <button onClick={handleClear} className="h-12 flex-1 rounded-xl bg-red-600 font-semibold text-white">End Block</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
