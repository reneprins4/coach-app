import { useTranslation } from 'react-i18next'
import { Check, Share2 } from 'lucide-react'
import StoryCard from '../StoryCard'

interface FinalCardProps {
  isActive: boolean
  onShare?: () => void
}

export default function FinalCard({ isActive, onShare }: FinalCardProps) {
  const { t } = useTranslation()

  return (
    <StoryCard isActive={isActive} className="items-center justify-center text-center">
      <h2 className="story-fade-in mb-8 text-lg font-bold text-white">
        {t('story.final.title')}
      </h2>

      {/* Glowing check circle */}
      <div className="story-scale-in mb-8 flex items-center justify-center">
        <div
          className="story-glow flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)',
            border: '2px solid rgba(6,182,212,0.4)',
          }}
        >
          <Check size={36} className="text-cyan-400" aria-hidden="true" />
        </div>
      </div>

      <p
        className="story-slide-up story-stagger story-delay-2 mb-8 tracking-[0.3em] text-gray-600"
        style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}
      >
        kravex.app
      </p>

      {/* Share button */}
      {onShare && (
        <div className="story-slide-up story-stagger story-delay-3 w-full px-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onShare()
            }}
            className="btn-primary"
          >
            <Share2 size={16} aria-hidden="true" />
            {t('story.final.share')}
          </button>
        </div>
      )}
    </StoryCard>
  )
}
