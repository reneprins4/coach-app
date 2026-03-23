import { useTranslation } from 'react-i18next'
import { Trophy, Flame, X, Share2 } from 'lucide-react'
import { motion } from 'motion/react'
import type { ShareCardData } from '../lib/shareCard'

interface ShareCardProps {
  data: ShareCardData
  onClose: () => void
  onShare?: () => void
}

export default function ShareCard({ data, onClose, onShare }: ShareCardProps) {
  const { t } = useTranslation()

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="share-card-title" className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 px-4" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
      <h2 id="share-card-title" className="sr-only">{t('share.title')}</h2>

      {/* Close button */}
      <div className="mb-4 flex w-full max-w-[350px] justify-end">
        <button
          onClick={onClose}
          className="glass flex h-10 w-10 items-center justify-center rounded-full text-gray-400 active:text-white"
          aria-label={t('common.close')}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* The card -- optimized for screenshots */}
      <motion.div
        className="share-card relative w-full max-w-[350px] overflow-hidden rounded-3xl"
        style={{
          background: 'linear-gradient(180deg, #0d1520 0%, #080c14 40%, #030508 100%)',
          border: '1px solid rgba(6,182,212,0.18)',
          boxShadow: '0 0 80px rgba(6,182,212,0.07), 0 25px 60px rgba(0,0,0,0.6)',
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient cyan bleed at top */}
        <div
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2"
          style={{
            width: '280px',
            height: '180px',
            background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative px-7 pb-8 pt-10">
          {/* Branding header */}
          <p className="label-caps mb-1.5 text-center tracking-[0.35em]">
            Kravex
          </p>
          <div className="mx-auto mb-8 h-px w-16 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

          {/* Split + Date */}
          <div className="mb-8 text-center">
            {data.split && (
              <h2 className="text-display text-3xl">{data.split}</h2>
            )}
            <p className="mt-2 text-sm tracking-wide text-gray-500">{data.date}</p>
          </div>

          {/* Stats row */}
          <div className="card-accent mb-8 flex items-center divide-x divide-cyan-500/20 overflow-hidden rounded-xl p-0">
            <div className="flex-1 py-4 text-center">
              <p className="text-2xl font-black tabular tracking-tight text-white">{data.duration}</p>
              <p className="label-caps mt-1">{t('finish_modal.minutes')}</p>
            </div>
            <div className="flex-1 py-4 text-center">
              <p className="text-2xl font-black tabular tracking-tight text-white">{data.volume}</p>
              <p className="label-caps mt-1">{t('finish_modal.volume')}</p>
            </div>
            <div className="flex-1 py-4 text-center">
              <p className="text-2xl font-black tabular tracking-tight text-white">{data.sets}</p>
              <p className="label-caps mt-1">{t('common.sets')}</p>
            </div>
          </div>

          {/* Exercise list */}
          {data.exercises.length > 0 && (
            <div className="mb-7 space-y-2.5">
              {data.exercises.map((ex) => (
                <div key={ex} className="flex items-center gap-3">
                  <div className="h-4 w-0.5 flex-shrink-0 rounded-full bg-cyan-500/50" />
                  <span className="text-sm text-gray-300">{ex}</span>
                </div>
              ))}
              {data.extraExercises > 0 && (
                <p className="pl-4 text-xs text-gray-600">
                  {t('share.more_exercises', { count: data.extraExercises })}
                </p>
              )}
            </div>
          )}

          {/* PRs section */}
          {data.prs.length > 0 && (
            <div className="mb-7">
              <div className="mb-3 flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500/25" />
                <div className="flex items-center gap-1.5">
                  <Trophy size={13} className="text-cyan-400" aria-hidden="true" />
                  <span className="label-caps text-cyan-400">{t('share.new_records')}</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-500/25" />
              </div>
              <div className="space-y-2">
                {data.prs.map((pr) => (
                  <div key={pr.exercise} className="flex items-center justify-between rounded-lg px-1 py-0.5">
                    <span className="text-sm text-gray-300">{pr.exercise}</span>
                    <span className="text-sm font-bold tabular text-cyan-400">{pr.weight}kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streak badge */}
          {data.streak > 1 && (
            <div className="mb-7">
              <div className="flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-orange-500/20" />
                <div
                  className="flex items-center gap-1.5 rounded-full px-3 py-1"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.08) 0%, transparent 80%)',
                  }}
                >
                  <Flame size={13} className="text-orange-400" aria-hidden="true" />
                  <span className="label-caps text-orange-400">
                    <span>{data.streak}</span>{' '}{t('share.streak')}
                  </span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-orange-500/20" />
              </div>
            </div>
          )}

          {/* Bottom branding */}
          <p className="text-center text-xs tracking-wide text-gray-600">{data.branding}</p>
        </div>
      </motion.div>

      {/* Action buttons below card */}
      <div className="mt-5 flex w-full max-w-[350px] gap-3">
        {onShare && (
          <button
            onClick={onShare}
            className="btn-primary flex-1"
            aria-label={t('share.share_button')}
          >
            <Share2 size={16} aria-hidden="true" />
            {t('share.share_button')}
          </button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-gray-600">
        {t('share.screenshot_hint')}
      </p>
    </div>
  )
}
