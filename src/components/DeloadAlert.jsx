import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, TrendingDown, Activity, Calendar, X, ChevronRight } from 'lucide-react'
import { detectFatigue } from '../lib/fatigueDetector'

const DISMISS_KEY = 'deload-alert-dismissed'
const DISMISS_DAYS = 7

function isDismissed() {
  try {
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (!dismissed) return false
    const until = new Date(dismissed)
    return until > new Date()
  } catch {
    return false
  }
}

function dismissAlert() {
  const until = new Date()
  until.setDate(until.getDate() + DISMISS_DAYS)
  localStorage.setItem(DISMISS_KEY, until.toISOString())
}

const SIGNAL_CONFIG = {
  rpe_drift: {
    Icon: TrendingDown,
    label: (s) => `RPE stijgt bij ${s.exercise} (+${s.delta})`,
  },
  volume_drop: {
    Icon: Activity,
    label: (s) => `${s.dropPct}% minder volume per training`,
  },
  frequency_drop: {
    Icon: Calendar,
    label: (s) => `Slechts ${s.perWeek} trainingen per week`,
  },
}

export default function DeloadAlert({ workouts }) {
  const nav = useNavigate()
  const [dismissed, setDismissed] = useState(isDismissed())

  useEffect(() => {
    setDismissed(isDismissed())
  }, [])

  const fatigue = useMemo(() => {
    if (!workouts || workouts.length < 4) return null
    return detectFatigue(workouts)
  }, [workouts])

  if (dismissed || !fatigue || !fatigue.fatigued) return null

  const isUrgent = fatigue.recommendation === 'urgent'

  const handleDismiss = () => {
    dismissAlert()
    setDismissed(true)
  }

  const handleStartDeload = () => {
    nav('/plan')
  }

  return (
    <div
      className={`mb-4 rounded-xl border p-4 ${
        isUrgent
          ? 'border-red-500/40 bg-red-500/10'
          : 'border-orange-500/40 bg-orange-500/10'
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle
            size={20}
            className={`mt-0.5 shrink-0 ${isUrgent ? 'text-red-400' : 'text-orange-400'}`}
          />
          <div>
            <p className={`text-sm font-semibold ${isUrgent ? 'text-red-400' : 'text-orange-400'}`}>
              {isUrgent ? 'Vermoeidheid gedetecteerd' : 'Herstel aanbevolen'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {isUrgent
                ? 'Je lichaam geeft meerdere signalen van vermoeidheid. Een deload week wordt sterk aangeraden.'
                : 'Signalen van opbouwende vermoeidheid gedetecteerd. Overweeg een deload.'}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-gray-600 active:text-gray-400"
          aria-label="Sluit melding"
        >
          <X size={16} />
        </button>
      </div>

      {/* Signalen */}
      {fatigue.signals.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {fatigue.signals.slice(0, 3).map((signal, i) => {
            const config = SIGNAL_CONFIG[signal.type]
            if (!config) return null
            const { Icon, label } = config
            return (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <Icon size={12} className="shrink-0 text-gray-500" />
                <span>{label(signal)}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Acties */}
      <div className="flex gap-2">
        <button
          onClick={handleStartDeload}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white ${
            isUrgent ? 'bg-red-500 active:bg-red-600' : 'bg-orange-500 active:bg-orange-600'
          }`}
        >
          Start deload week
          <ChevronRight size={14} />
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 ring-1 ring-gray-700 active:bg-gray-800"
        >
          Later
        </button>
      </div>
    </div>
  )
}
