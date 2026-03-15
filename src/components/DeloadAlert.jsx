import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, TrendingDown, Activity, Calendar, X, ChevronRight } from 'lucide-react'
import { detectFatigue } from '../lib/fatigueDetector'

const DISMISS_DAYS = 7

export default function DeloadAlert({ workouts, settings, updateSettings }) {
  const { t } = useTranslation()
  const nav = useNavigate()

  // Dismiss staat in settings (Supabase), fallback naar localStorage
  const dismissed = useMemo(() => {
    const until = settings?.deload_dismissed_until
    if (!until) return false
    return new Date(until) > new Date()
  }, [settings?.deload_dismissed_until])

  function handleDismiss() {
    const until = new Date()
    until.setDate(until.getDate() + DISMISS_DAYS)
    if (updateSettings) {
      updateSettings({ deload_dismissed_until: until.toISOString() })
    }
  }

  const fatigue = useMemo(() => {
    if (!workouts || workouts.length < 4) return null
    return detectFatigue(workouts)
  }, [workouts])

  if (dismissed || !fatigue || !fatigue.fatigued) return null

  const isUrgent = fatigue.recommendation === 'urgent'

  const handleStartDeload = () => {
    nav('/plan')
  }

  const getSignalLabel = (signal) => {
    switch (signal.type) {
      case 'rpe_drift':
        return t('deload.signal_rpe', { exercise: signal.exercise, delta: signal.delta })
      case 'volume_drop':
        return t('deload.signal_volume', { pct: signal.dropPct })
      case 'frequency_drop':
        return t('deload.signal_frequency', { count: signal.perWeek })
      default:
        return null
    }
  }

  const getSignalIcon = (type) => {
    switch (type) {
      case 'rpe_drift': return TrendingDown
      case 'volume_drop': return Activity
      case 'frequency_drop': return Calendar
      default: return null
    }
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
              {isUrgent ? t('deload.urgent_title') : t('deload.recovery_title')}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {isUrgent ? t('deload.urgent_desc') : t('deload.recovery_desc')}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-gray-600 active:text-gray-400"
          aria-label={t('common.close')}
        >
          <X size={16} />
        </button>
      </div>

      {/* Signalen */}
      {fatigue.signals.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {fatigue.signals.slice(0, 3).map((signal, i) => {
            const Icon = getSignalIcon(signal.type)
            const label = getSignalLabel(signal)
            if (!Icon || !label) return null
            return (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                <Icon size={12} className="shrink-0 text-gray-500" />
                <span>{label}</span>
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
          {t('deload.action')}
          <ChevronRight size={14} />
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 ring-1 ring-gray-700 active:bg-gray-800"
        >
          {t('deload.later')}
        </button>
      </div>
      <p className="text-center text-xs text-gray-600 mt-2">{t('deload.deload_hint')}</p>
    </div>
  )
}
