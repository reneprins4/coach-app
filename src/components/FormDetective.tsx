import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { analyzeFormPatterns, getCachedAnalysis, setCachedAnalysis, clearAnalysisCache } from '../lib/formAnalysis'
import { logError } from '../lib/logger'
import type { FormDetectiveProps, FormInsight } from '../types'

const SEVERITY_CONFIG = {
  low: {
    icon: CheckCircle,
    color: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    text: 'text-emerald-400',
    badge: { background: 'rgba(16,185,129,0.15)', color: '#34d399' },
    label: 'Info',
  },
  medium: {
    icon: AlertTriangle,
    color: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    text: 'text-amber-400',
    badge: { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
    label: 'Let op',
  },
  high: {
    icon: AlertCircle,
    color: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    text: 'text-red-400',
    badge: { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
    label: 'Urgent',
  },
}

export default function FormDetective({ workouts, userId }: FormDetectiveProps) {
  const { t } = useTranslation()
  const [insights, setInsights] = useState<FormInsight[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCachedAnalysis(userId ?? null)
      .then(cached => {
        if (!cancelled && cached && cached.length > 0) setInsights(cached)
      })
      .catch((err) => { logError('FormDetective.getCachedAnalysis', err) })
    return () => { cancelled = true }
  }, [userId])

  async function runAnalysis(force = false) {
    if (loading) return
    if (!force) {
      const cached = await getCachedAnalysis(userId ?? null)
      if (cached) { setInsights(cached); return }
    }
    if (workouts.length < 3) { setError(t('analyse.need_min_workouts')); return }
    setLoading(true)
    setError(null)
    try {
      const result = await analyzeFormPatterns(workouts)
      setInsights(result)
      await setCachedAnalysis(userId ?? null, result)
    } catch (err) {
      setError(t('analyse.failed'))
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    await clearAnalysisCache(userId ?? null)
    runAnalysis(true)
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (!insights && !loading && !error) {
    return (
      <div className="space-y-5">
        <div>
          <p className="label-caps mb-1">{t('analyse.title')}</p>
          <p className="text-2xl font-black tracking-tight text-white">{t('analyse.subtitle')}</p>
        </div>
        <div className="card p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
            <AlertCircle size={24} className="text-gray-500" />
          </div>
          <p className="mb-1 text-sm font-black tracking-tight text-white">{t('analyse.cta_title')}</p>
          <p className="mb-5 text-xs text-gray-500">{t('analyse.cta_sub')}</p>
          <button
            onClick={() => runAnalysis(false)}
            disabled={loading || workouts.length < 3}
            className="btn-primary h-auto px-5 py-2.5 text-sm w-auto disabled:opacity-40"
          >
            {workouts.length < 3 ? t('analyse.need_more') : t('analyse.run_btn')}
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={28} className="mb-3 animate-spin text-cyan-500" />
        <p className="text-sm font-bold text-gray-300">{t('analyse.loading')}</p>
        <p className="text-xs text-gray-600">{t('analyse.loading_sub')}</p>
      </div>
    )
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl p-5 text-center bg-red-500/8 border border-red-500/20"
        >
          <AlertCircle size={22} className="mx-auto mb-2 text-red-400" />
          <p className="mb-4 text-sm text-red-400">{error}</p>
          <button
            onClick={() => runAnalysis(false)}
            className="btn-secondary h-auto px-4 py-2 text-sm w-auto"
          >
            {t('analyse.retry')}
          </button>
        </div>
      </div>
    )
  }

  // ── All clear ──────────────────────────────────────────────────────────
  if (insights !== null && insights.length === 0) {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl p-5 bg-emerald-500/8 border border-emerald-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <CheckCircle size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-white">{t('analyse.all_clear')}</p>
              <p className="text-xs text-gray-500">{t('analyse.all_clear_sub')}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary h-auto px-4 py-3 text-sm"
        >
          <RefreshCw size={13} />
          {t('analyse.reanalyse')}
        </button>
      </div>
    )
  }

  // ── Results ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps mb-0.5">{t('analyse.title')}</p>
          <p className="text-xl font-black tracking-tight text-white">
            {insights!.length} {insights!.length === 1 ? t('analyse.insight_one') : t('analyse.insight_other')}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="btn-secondary h-auto px-3 py-2 text-xs w-auto"
        >
          <RefreshCw size={12} />
          {t('analyse.refresh')}
        </button>
      </div>

      {insights!.map((insight, idx) => {
        const config = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.medium
        const Icon = config.icon

        return (
          <div
            key={idx}
            className="rounded-2xl p-4"
            style={{ background: config.color, border: `1px solid ${config.border}` }}
          >
            <div className="mb-3 flex items-start gap-3">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ background: config.badge.background }}
              >
                <Icon size={16} style={{ color: config.badge.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black tracking-tight text-white">{insight.exercise}</span>
                  <span
                    className="label-caps rounded-lg px-2 py-0.5"
                    style={config.badge}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="text-sm text-gray-300">{insight.insight}</p>
              </div>
            </div>
            <div
              className="ml-11 rounded-xl px-3 py-2.5 bg-white/[0.04] border border-white/[0.06]"
            >
              <p className="text-xs text-gray-400">
                <span className="font-bold text-gray-300">{t('analyse.rec_label')}</span> {insight.recommendation}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
