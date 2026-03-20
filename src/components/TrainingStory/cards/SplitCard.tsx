import { useTranslation } from 'react-i18next'
import StoryCard from '../StoryCard'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface SplitCardProps {
  data: TrainingStoryData
  isActive: boolean
}

export default function SplitCard({ data, isActive }: SplitCardProps) {
  const { t } = useTranslation()
  const splits = data.splitDistribution
  const maxCount = splits.length > 0 ? Math.max(...splits.map(s => s.count)) : 1
  const totalCount = splits.reduce((sum, s) => sum + s.count, 0)

  return (
    <StoryCard isActive={isActive} className="justify-center">
      <h2 className="story-slide-up story-stagger story-delay-1 mb-6 text-center text-lg font-bold text-white">
        {t('story.split.title')}
      </h2>

      {/* Stacked horizontal bar */}
      {totalCount > 0 && (
        <div className="story-slide-up story-stagger story-delay-2 mb-8 flex h-4 overflow-hidden rounded-full">
          {splits.map((s) => (
            <div
              key={s.split}
              className="h-full"
              style={{
                width: `${(s.count / totalCount) * 100}%`,
                backgroundColor: s.color,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      {/* Individual bars */}
      <div className="space-y-4">
        {splits.map((s, i) => {
          const pct = maxCount > 0 ? (s.count / maxCount) * 100 : 0
          return (
            <div
              key={s.split}
              className="story-slide-up story-stagger"
              style={{ animationDelay: `${300 + i * 150}ms` }}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm font-medium text-gray-300">{s.split}</span>
                </div>
                <span className="text-sm font-bold tabular text-white">{s.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="story-bar h-full rounded-full"
                  style={{
                    '--bar-width': `${pct}%`,
                    backgroundColor: s.color,
                    opacity: 0.7,
                  } as React.CSSProperties}
                />
              </div>
            </div>
          )
        })}
      </div>
    </StoryCard>
  )
}
