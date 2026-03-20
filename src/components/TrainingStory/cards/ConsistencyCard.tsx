import { useTranslation } from 'react-i18next'
import { Flame } from 'lucide-react'
import StoryCard from '../StoryCard'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface ConsistencyCardProps {
  data: TrainingStoryData
  isActive: boolean
}

/**
 * Build a mini heatmap of the month: one dot per day.
 * Trained days are cyan, rest days are dark gray.
 */
function MiniHeatmap({ data }: { data: TrainingStoryData }) {
  const daysInMonth = new Date(data.year, data.month + 1, 0).getDate()
  const trainingSet = new Set(data.trainingDays.map(d => Number(d.split('-')[2])))

  const dots: { day: number; trained: boolean }[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    dots.push({ day: d, trained: trainingSet.has(d) })
  }

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {dots.map((dot, i) => (
        <div
          key={dot.day}
          className="story-dot story-stagger h-3 w-3 rounded-sm"
          style={{
            animationDelay: `${i * 30}ms`,
            backgroundColor: dot.trained ? '#06b6d4' : 'rgba(255,255,255,0.06)',
          }}
        />
      ))}
    </div>
  )
}

export default function ConsistencyCard({ data, isActive }: ConsistencyCardProps) {
  const { t } = useTranslation()

  return (
    <StoryCard isActive={isActive} className="justify-center">
      <h2 className="story-slide-up story-stagger story-delay-1 mb-6 text-center text-lg font-bold text-white">
        {t('story.consistency.title')}
      </h2>

      {/* Mini heatmap */}
      <div className="mb-6 px-2">
        <MiniHeatmap data={data} />
      </div>

      {/* Streak */}
      <div className="story-slide-up story-stagger story-delay-3 mb-5 flex items-center justify-center gap-2">
        <Flame size={18} className="text-orange-400" aria-hidden="true" />
        <span className="text-base font-bold text-white">
          {data.longestStreakInMonth} {t('story.consistency.days_streak')}
        </span>
      </div>

      {/* Consistency score bar */}
      <div className="story-slide-up story-stagger story-delay-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-400">{t('story.consistency.score')}</span>
          <span className="text-sm font-bold text-cyan-400">{data.consistencyScore}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="story-bar h-full rounded-full bg-cyan-500"
            style={{ '--bar-width': `${data.consistencyScore}%` } as React.CSSProperties}
          />
        </div>
      </div>
    </StoryCard>
  )
}
