import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import StoryCard from '../StoryCard'
import { useCountUp } from '../../../hooks/useCountUp'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface VolumeCardProps {
  data: TrainingStoryData
  isActive: boolean
}

function formatVolumeKg(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}t`
  return `${Math.round(v)}kg`
}

export default function VolumeCard({ data, isActive }: VolumeCardProps) {
  const { t } = useTranslation()
  const direction = data.volumeTrend.direction
  const pct = Math.abs(data.volumeTrend.volumeChange)

  const animatedPct = useCountUp(pct, isActive, 1200)

  const ArrowIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const arrowColor = direction === 'up' ? 'text-cyan-400' : direction === 'down' ? 'text-red-400' : 'text-gray-400'
  const pctPrefix = direction === 'up' ? '+' : direction === 'down' ? '-' : ''

  const directionKey = direction === 'up' ? 'volume_up' : direction === 'down' ? 'volume_down' : 'volume_stable'

  return (
    <StoryCard isActive={isActive} className="items-center justify-center text-center">
      <h2 className="story-slide-up story-stagger story-delay-1 mb-6 text-lg font-bold text-white">
        {t('story.volume_trend.title')}
      </h2>

      {/* Giant arrow */}
      <div className="story-scale-in mb-4">
        <ArrowIcon size={72} className={arrowColor} aria-hidden="true" />
      </div>

      {/* Percentage */}
      <p className={`mb-2 text-5xl font-black tabular tracking-tight ${arrowColor}`}>
        {pctPrefix}{Math.round(animatedPct)}%
      </p>

      <p className="story-slide-up story-stagger story-delay-2 mb-4 text-sm text-gray-400">
        {t(`story.volume_trend.${directionKey}`)}
      </p>

      {/* Previous vs current */}
      <p className="story-slide-up story-stagger story-delay-3 text-xs text-gray-600">
        {t('story.volume_trend.vs_last_month')}
      </p>
      <p className="story-slide-up story-stagger story-delay-3 text-sm text-gray-500">
        {formatVolumeKg(data.previousMonthVolume)} → {formatVolumeKg(data.totalVolume)}
      </p>
    </StoryCard>
  )
}
