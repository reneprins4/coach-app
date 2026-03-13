import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { analyzeFormPatterns, getCachedAnalysis, setCachedAnalysis, clearAnalysisCache } from '../lib/formAnalysis'

const SEVERITY_CONFIG = {
  low: {
    icon: CheckCircle,
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    text: 'text-green-400',
    badge: 'bg-green-500/20 text-green-400'
  },
  medium: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    badge: 'bg-yellow-500/20 text-yellow-400'
  },
  high: {
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400'
  }
}

export default function FormDetective({ workouts, userId }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getCachedAnalysis(userId).then(cached => {
      if (cached && cached.length > 0) setInsights(cached)
    })
  }, [userId])

  async function runAnalysis(force = false) {
    if (loading) return

    if (!force) {
      const cached = await getCachedAnalysis(userId)
      if (cached) {
        setInsights(cached)
        return
      }
    }

    if (workouts.length < 3) {
      setError('Minimaal 3 trainingen nodig voor analyse')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await analyzeFormPatterns(workouts)
      setInsights(result)
      await setCachedAnalysis(userId, result)
    } catch (err) {
      setError('Analyse mislukt. Probeer het later opnieuw.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    await clearAnalysisCache(userId)
    runAnalysis(true)
  }

  // Geen data state
  if (!insights && !loading && !error) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 p-6 text-center">
          <AlertCircle size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="mb-1 text-sm font-medium text-gray-300">AI Trainingsanalyse</p>
          <p className="mb-4 text-xs text-gray-500">
            Analyseer je trainingspatronen en krijg inzichten van een virtuele personal trainer
          </p>
          <button
            onClick={() => runAnalysis(false)}
            disabled={loading || workouts.length < 3}
            className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 active:bg-red-600"
          >
            {workouts.length < 3 ? 'Minimaal 3 trainingen nodig' : 'Analyseer mijn training'}
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 size={32} className="mb-3 animate-spin text-red-500" />
        <p className="text-sm text-gray-400">Trainingsdata analyseren...</p>
        <p className="text-xs text-gray-600">Dit kan 10-20 seconden duren</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
        <AlertCircle size={24} className="mx-auto mb-2 text-red-400" />
        <p className="mb-3 text-sm text-red-400">{error}</p>
        <button
          onClick={() => runAnalysis(false)}
          className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white"
        >
          Opnieuw proberen
        </button>
      </div>
    )
  }

  // Geen inzichten gevonden
  if (insights && insights.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-center">
          <CheckCircle size={24} className="mx-auto mb-2 text-green-400" />
          <p className="text-sm font-medium text-green-400">Alles ziet er goed uit</p>
          <p className="text-xs text-gray-500">Geen problemen gedetecteerd in je trainingsdata</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-gray-400"
        >
          <RefreshCw size={14} />
          Opnieuw analyseren
        </button>
      </div>
    )
  }

  // Inzichten weergeven
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {insights.length} inzicht{insights.length !== 1 ? 'en' : ''} gevonden
        </p>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 transition-colors active:text-gray-400"
        >
          <RefreshCw size={12} />
          Vernieuwen
        </button>
      </div>

      {insights.map((insight, idx) => {
        const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium
        const Icon = config.icon

        return (
          <div
            key={idx}
            className={`rounded-xl border ${config.border} ${config.bg} p-4`}
          >
            <div className="mb-2 flex items-start gap-3">
              <Icon size={18} className={`mt-0.5 shrink-0 ${config.text}`} />
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{insight.exercise}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.badge}`}>
                    {insight.severity === 'high' ? 'Urgent' : insight.severity === 'medium' ? 'Let op' : 'Info'}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{insight.insight}</p>
              </div>
            </div>
            <div className="ml-7 rounded-lg bg-gray-800/50 px-3 py-2">
              <p className="text-xs text-gray-400">
                <span className="font-medium text-gray-300">Aanbeveling:</span> {insight.recommendation}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
