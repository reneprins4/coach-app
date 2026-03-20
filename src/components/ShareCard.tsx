import { useTranslation } from 'react-i18next'
import { Trophy, Flame, X, Share2 } from 'lucide-react'
import type { ShareCardData } from '../lib/shareCard'

interface ShareCardProps {
  data: ShareCardData
  onClose: () => void
  onShare?: () => void
}

export default function ShareCard({ data, onClose, onShare }: ShareCardProps) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/90 px-4">
      {/* Close button */}
      <div className="mb-4 flex w-full max-w-[350px] justify-end">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800/60 text-gray-400"
          aria-label={t('common.close')}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* The card — optimized for screenshots */}
      <div
        className="share-card w-full max-w-[350px] overflow-hidden rounded-2xl"
        style={{
          background: 'linear-gradient(180deg, #0a0f1a 0%, #020509 100%)',
          border: '1px solid rgba(6,182,212,0.2)',
          boxShadow: '0 0 60px rgba(6,182,212,0.08), 0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        <div className="px-6 pb-6 pt-8">
          {/* Branding header */}
          <p
            className="mb-6 text-center tracking-[0.3em] text-gray-500"
            style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}
          >
            K R A V E X
          </p>

          {/* Split + Date */}
          <div className="mb-6 text-center">
            {data.split && (
              <h2 className="text-2xl font-black tracking-tight text-white">
                {data.split}
              </h2>
            )}
            <p className="mt-1 text-sm text-gray-500">{data.date}</p>
          </div>

          {/* Stats row */}
          <div
            className="mb-6 flex items-center divide-x divide-cyan-500/20 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.10) 0%, rgba(6,182,212,0.03) 100%)',
              border: '1px solid rgba(6,182,212,0.15)',
            }}
          >
            <div className="flex-1 py-3 text-center">
              <p className="text-2xl font-black tabular tracking-tight text-white">{data.duration}</p>
              <p className="label-caps mt-0.5">{t('finish_modal.minutes')}</p>
            </div>
            <div className="flex-1 py-3 text-center">
              <p className="text-2xl font-black tabular tracking-tight text-white">{data.volume}</p>
              <p className="label-caps mt-0.5">{t('finish_modal.volume')}</p>
            </div>
            <div className="flex-1 py-3 text-center">
              <p className="text-2xl font-black tabular tracking-tight text-white">{data.sets}</p>
              <p className="label-caps mt-0.5">{t('common.sets')}</p>
            </div>
          </div>

          {/* Exercise list */}
          {data.exercises.length > 0 && (
            <div className="mb-5 space-y-2">
              {data.exercises.map((ex) => (
                <div key={ex} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{ex}</span>
                </div>
              ))}
              {data.extraExercises > 0 && (
                <p className="text-xs text-gray-600">
                  {t('share.more_exercises', { count: data.extraExercises })}
                </p>
              )}
            </div>
          )}

          {/* PRs section */}
          {data.prs.length > 0 && (
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-cyan-500/20" />
                <div className="flex items-center gap-1.5">
                  <Trophy size={12} className="text-cyan-400" aria-hidden="true" />
                  <span className="label-caps text-cyan-400">{t('share.new_records')}</span>
                </div>
                <div className="h-px flex-1 bg-cyan-500/20" />
              </div>
              <div className="space-y-1.5">
                {data.prs.map((pr) => (
                  <div key={pr.exercise} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{pr.exercise}</span>
                    <span className="text-sm font-bold text-cyan-400">{pr.weight}kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streak badge */}
          {data.streak > 1 && (
            <div className="mb-5">
              <div className="flex items-center justify-center gap-2">
                <div className="h-px flex-1 bg-orange-500/20" />
                <div className="flex items-center gap-1.5">
                  <Flame size={12} className="text-orange-400" aria-hidden="true" />
                  <span className="label-caps text-orange-400">
                    <span>{data.streak}</span>{' '}{t('share.streak')}
                  </span>
                </div>
                <div className="h-px flex-1 bg-orange-500/20" />
              </div>
            </div>
          )}

          {/* Bottom branding */}
          <p className="text-center text-xs text-gray-600">{data.branding}</p>
        </div>
      </div>

      {/* Action buttons below card */}
      <div className="mt-4 flex w-full max-w-[350px] gap-3">
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
