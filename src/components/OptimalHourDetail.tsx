import { Clock, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react'
import type { OptimalHourResult, OptimalHourConfidence, TimeSlotPerformance } from '../types'

export interface OptimalHourDetailProps {
  result: OptimalHourResult
  language: string
}

const CONFIDENCE_LABEL: Record<string, Record<OptimalHourConfidence, string>> = {
  nl: { none: '', low: 'Lage zekerheid', medium: 'Gemiddelde zekerheid', high: 'Hoge zekerheid' },
  en: { none: '', low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' },
}

const CONFIDENCE_CLASS: Record<OptimalHourConfidence, string> = {
  none: 'bg-gray-800 text-gray-500',
  low: 'bg-amber-500/10 text-amber-400',
  medium: 'bg-cyan-500/10 text-cyan-400',
  high: 'bg-emerald-500/10 text-emerald-400',
}

function formatSlotTime(slot: TimeSlotPerformance): string {
  const start = String(slot.hourStart).padStart(2, '0')
  const end = String(slot.hourEnd).padStart(2, '0')
  return `${start}:00 - ${end}:00`
}

function getBarClass(
  slot: TimeSlotPerformance,
  bestSlot: TimeSlotPerformance | null,
  worstSlot: TimeSlotPerformance | null,
): string {
  if (bestSlot && slot.slot === bestSlot.slot) return 'bg-cyan-500 glow-bar'
  if (worstSlot && slot.slot === worstSlot.slot) return 'bg-orange-500'
  return 'bg-white/[0.15]'
}

function getTexts(language: string) {
  const isNl = language === 'nl'
  return {
    heroLabel: isNl ? 'OPTIMALE TRAININGSTIJD' : 'OPTIMAL TRAINING TIME',
    betterLabel: isNl ? 'beter' : 'better',
    basedOn: isNl ? 'Gebaseerd op' : 'Based on',
    workouts: isNl ? 'trainingen' : 'workouts',
    inSlots: isNl ? 'tijdslots' : 'time slots',
    worstTitle: isNl ? 'Minst optimale tijd' : 'Least optimal time',
    worstDesc: isNl
      ? 'Vermijd dit tijdslot als je maximaal wilt presteren.'
      : 'Avoid this time slot for peak performance.',
    coachTitle: isNl ? 'Coach tip' : 'Coach tip',
    coachTip: isNl
      ? 'Probeer je belangrijkste trainingen te plannen in je optimale tijdslot. Consistentie op hetzelfde tijdstip versterkt je circadiaan ritme en prestaties.'
      : 'Try to schedule your most important sessions in your optimal time slot. Consistency at the same time reinforces your circadian rhythm and performance.',
    notEnoughTitle: isNl ? 'Nog niet genoeg data' : 'Not enough data yet',
    notEnoughDesc: isNl
      ? 'We hebben minstens 20 trainingen op verschillende tijdstippen nodig om je optimale trainingstijd te berekenen.'
      : 'We need at least 20 workouts at various times to calculate your optimal training time.',
    score: isNl ? 'Score' : 'Score',
    sessions: isNl ? 'sessies' : 'sessions',
  }
}

export default function OptimalHourDetail({ result, language }: OptimalHourDetailProps) {
  const txt = getTexts(language)
  const labels = CONFIDENCE_LABEL[language] ?? CONFIDENCE_LABEL['en']!

  if (!result.hasEnoughData) {
    return (
      <div className="space-y-4">
        <div className="card flex flex-col items-center py-12 text-center">
          <Clock size={48} className="mb-4 text-gray-700" />
          <h2 className="text-title mb-2">{txt.notEnoughTitle}</h2>
          <p className="max-w-xs text-sm text-gray-500">{txt.notEnoughDesc}</p>
        </div>
      </div>
    )
  }

  const { bestSlot, worstSlot, allSlots, percentageDifference, confidence, totalWorkouts, slotsAnalyzed } = result

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="card-accent text-center">
        <p className="label-caps text-cyan-500 mb-2">{txt.heroLabel}</p>
        <p className="text-display text-cyan-400">
          +{Math.round(percentageDifference)}%
        </p>
        <p className="mt-1 text-lg font-bold text-white">
          {bestSlot ? formatSlotTime(bestSlot) : '—'}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {txt.basedOn} {totalWorkouts} {txt.workouts} in {slotsAnalyzed} {txt.inSlots}
        </p>
        {confidence !== 'none' && labels && (
          <div className="mt-3 flex justify-center">
            <span
              className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${CONFIDENCE_CLASS[confidence]}`}
            >
              {labels[confidence]}
            </span>
          </div>
        )}
      </div>

      {/* Bar chart */}
      <div className="card">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp size={15} className="text-cyan-400" />
          <p className="label-caps">{txt.score} per tijdslot</p>
        </div>
        <div className="space-y-3" data-testid="slot-bars">
          {allSlots.map((slot) => (
            <div key={slot.slot} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs font-bold tabular text-gray-400">
                {slot.slot}
              </span>
              <div className="flex-1">
                <div className="h-6 w-full overflow-hidden rounded-lg bg-white/[0.04]">
                  <div
                    className={`story-bar h-full rounded-lg ${getBarClass(slot, bestSlot, worstSlot)}`}
                    data-testid={`bar-${slot.slot}`}
                    /* Uses existing story-bar animation with --bar-width CSS var from index.css */
                    ref={(el) => { if (el) el.style.setProperty('--bar-width', `${slot.normalizedScore}%`) }}
                  />
                </div>
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-bold tabular text-gray-500">
                {slot.workoutCount}x
              </span>
              <span className="w-10 shrink-0 text-right text-xs font-bold tabular text-white">
                {Math.round(slot.normalizedScore)}
              </span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-cyan-500" />
            <span className="text-[10px] text-gray-500">Best</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-orange-500" />
            <span className="text-[10px] text-gray-500">Worst</span>
          </div>
        </div>
      </div>

      {/* Worst time slot warning */}
      {worstSlot && (
        <div className="card border-orange-500/20" data-testid="worst-slot-warning">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10">
              <AlertTriangle size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{txt.worstTitle}</p>
              <p className="mt-0.5 text-lg font-black text-orange-400">
                {formatSlotTime(worstSlot)}
              </p>
              <p className="mt-1 text-xs text-gray-500">{txt.worstDesc}</p>
            </div>
          </div>
        </div>
      )}

      {/* Coach tip */}
      <div className="card" data-testid="coach-tip">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10">
            <Lightbulb size={18} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{txt.coachTitle}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">{txt.coachTip}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
