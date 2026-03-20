import { X, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface TrainingStoryBannerProps {
  monthLabel: string
  onOpen: () => void
  onDismiss: () => void
}

export default function TrainingStoryBanner({ monthLabel, onOpen, onDismiss }: TrainingStoryBannerProps) {
  const { t } = useTranslation()

  return (
    <div
      className="card-accent relative mb-5 overflow-hidden"
    >
      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDismiss()
        }}
        className="absolute right-2 top-2 rounded-full p-1.5 text-gray-500 active:bg-gray-800 active:text-gray-300"
        aria-label={t('common.close')}
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
          <Sparkles size={20} className="text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-tight text-white">
            {t('story.banner.title', { month: monthLabel })}
          </p>
          <p className="text-xs text-gray-400">
            {t('story.banner.subtitle')}
          </p>
        </div>
        <button
          onClick={onOpen}
          className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-black active:bg-cyan-600"
        >
          {t('story.banner.cta')}
        </button>
      </div>
    </div>
  )
}
