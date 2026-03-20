import { useTranslation } from 'react-i18next'
import { Target, Trophy, BarChart3, Shuffle, Mountain, type LucideIcon } from 'lucide-react'
import StoryCard from '../StoryCard'
import type { TrainingStoryData, TrainingPersonality } from '../../../lib/trainingStory'

interface PersonalityCardProps {
  data: TrainingStoryData
  isActive: boolean
}

const PERSONALITY_CONFIG: Record<TrainingPersonality, {
  icon: LucideIcon
  color: string
  glowColor: string
}> = {
  consistent: { icon: Target, color: '#06b6d4', glowColor: 'rgba(6,182,212,0.3)' },
  powerhouse: { icon: Trophy, color: '#f59e0b', glowColor: 'rgba(245,158,11,0.3)' },
  volume:     { icon: BarChart3, color: '#22c55e', glowColor: 'rgba(34,197,94,0.3)' },
  allrounder: { icon: Shuffle, color: '#a855f7', glowColor: 'rgba(168,85,247,0.3)' },
  persistent: { icon: Mountain, color: '#f97316', glowColor: 'rgba(249,115,22,0.3)' },
}

export default function PersonalityCard({ data, isActive }: PersonalityCardProps) {
  const { t } = useTranslation()
  const config = PERSONALITY_CONFIG[data.personality]
  const Icon = config.icon

  return (
    <StoryCard isActive={isActive} className="items-center justify-center text-center">
      <p className="story-fade-in mb-6 text-sm text-gray-500">
        {t('story.personality.subtitle')}
      </p>

      {/* Large icon with glow */}
      <div className="story-scale-in mb-6 flex items-center justify-center">
        <div
          className="story-glow flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
            border: `2px solid ${config.color}`,
            '--tw-shadow-color': config.glowColor,
          } as React.CSSProperties}
        >
          <Icon size={40} style={{ color: config.color }} aria-hidden="true" />
        </div>
      </div>

      <h2
        className="story-slide-up story-stagger story-delay-2 mb-3 text-2xl font-black tracking-tight"
        style={{ color: config.color }}
      >
        {t(`story.personality.${data.personality}.name`)}
      </h2>

      <p className="story-slide-up story-stagger story-delay-3 max-w-[260px] text-sm leading-relaxed text-gray-400">
        {t(`story.personality.${data.personality}.description`)}
      </p>
    </StoryCard>
  )
}
