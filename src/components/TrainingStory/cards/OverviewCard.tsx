import { useTranslation } from 'react-i18next'
import StoryCard from '../StoryCard'
import { useCountUp } from '../../../hooks/useCountUp'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface OverviewCardProps {
  data: TrainingStoryData
  isActive: boolean
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}t`
  return String(Math.round(v))
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}u`
  return `${minutes}m`
}

export default function OverviewCard({ data, isActive }: OverviewCardProps) {
  const { t } = useTranslation()

  const workouts = useCountUp(data.totalWorkouts, isActive, 1200)
  const volume = useCountUp(data.totalVolume, isActive, 1200)
  const sets = useCountUp(data.totalSets, isActive, 1200)
  const time = useCountUp(data.totalTimeMinutes, isActive, 1200)

  return (
    <StoryCard isActive={isActive} className="justify-center">
      <h2 className="story-slide-up story-stagger story-delay-1 mb-8 text-center text-lg font-bold text-white">
        {t('story.overview.title')}
      </h2>

      <div className="grid grid-cols-2 gap-5">
        {/* Workouts */}
        <div className="story-slide-up story-stagger story-delay-1 card-accent text-center">
          <p className="text-4xl font-black tabular tracking-tight text-white">
            {Math.round(workouts)}
          </p>
          <p className="label-caps mt-1">{t('story.overview.workouts')}</p>
        </div>

        {/* Volume */}
        <div className="story-slide-up story-stagger story-delay-2 card-accent text-center">
          <p className="text-4xl font-black tabular tracking-tight text-white">
            {formatVolume(volume)}
          </p>
          <p className="label-caps mt-1">{t('story.overview.volume')}</p>
        </div>

        {/* Sets */}
        <div className="story-slide-up story-stagger story-delay-3 card-accent text-center">
          <p className="text-4xl font-black tabular tracking-tight text-white">
            {Math.round(sets)}
          </p>
          <p className="label-caps mt-1">{t('story.overview.sets')}</p>
        </div>

        {/* Time */}
        <div className="story-slide-up story-stagger story-delay-4 card-accent text-center">
          <p className="text-4xl font-black tabular tracking-tight text-white">
            {formatTime(Math.round(time))}
          </p>
          <p className="label-caps mt-1">{t('story.overview.time')}</p>
        </div>
      </div>
    </StoryCard>
  )
}
