import { useTranslation } from 'react-i18next'
import StoryCard from '../StoryCard'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface TitleCardProps {
  data: TrainingStoryData
  isActive: boolean
}

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const

export default function TitleCard({ data, isActive }: TitleCardProps) {
  const { t } = useTranslation()
  const monthName = t(`story.months.${MONTH_KEYS[data.month]}`)

  return (
    <StoryCard isActive={isActive} className="items-center justify-center text-center">
      <p
        className="mb-10 tracking-[0.3em] text-gray-500"
        style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}
      >
        K R A V E X
      </p>

      {/* Glowing cyan circle */}
      <div className="story-scale-in mb-10 flex items-center justify-center">
        <div
          className="story-glow h-28 w-28 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0.05) 70%, transparent 100%)',
            border: '2px solid rgba(6,182,212,0.3)',
          }}
        />
      </div>

      <h1 className="story-slide-up story-stagger story-delay-1 text-3xl font-black tracking-tight text-white">
        {t('story.title_card.your_month', { month: monthName })}
      </h1>
      <p className="story-slide-up story-stagger story-delay-2 mt-1 text-lg text-gray-400">
        {t('story.title_card.in_review')}
      </p>
      <p className="story-slide-up story-stagger story-delay-3 mt-4 text-sm text-gray-600">
        {data.year}
      </p>
    </StoryCard>
  )
}
