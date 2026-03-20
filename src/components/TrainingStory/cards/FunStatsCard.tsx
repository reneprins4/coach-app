import { useTranslation } from 'react-i18next'
import { Dumbbell, Repeat, Clock, Zap } from 'lucide-react'
import StoryCard from '../StoryCard'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface FunStatsCardProps {
  data: TrainingStoryData
  isActive: boolean
}

export default function FunStatsCard({ data, isActive }: FunStatsCardProps) {
  const { t } = useTranslation()

  const stats = [
    {
      icon: Dumbbell,
      label: t('story.fun_stats.heaviest_set'),
      value: data.heaviestSet
        ? `${data.heaviestSet.exercise} ${data.heaviestSet.weight}kg x ${data.heaviestSet.reps}`
        : null,
    },
    {
      icon: Repeat,
      label: t('story.fun_stats.most_reps'),
      value: data.mostRepsSet
        ? `${data.mostRepsSet.exercise} ${data.mostRepsSet.weight}kg x ${data.mostRepsSet.reps}`
        : null,
    },
    {
      icon: Clock,
      label: t('story.fun_stats.longest_workout'),
      value: data.longestWorkoutMinutes
        ? `${data.longestWorkoutMinutes} ${t('story.fun_stats.minutes')}`
        : null,
    },
    {
      icon: Zap,
      label: t('story.fun_stats.shortest_workout'),
      value: data.shortestWorkoutMinutes
        ? `${data.shortestWorkoutMinutes} ${t('story.fun_stats.minutes')}`
        : null,
    },
  ].filter(s => s.value !== null)

  return (
    <StoryCard isActive={isActive} className="justify-center">
      <h2 className="story-slide-up story-stagger story-delay-1 mb-6 text-center text-lg font-bold text-white">
        {t('story.fun_stats.title')}
      </h2>

      <div className="space-y-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="story-slide-up story-stagger flex items-start gap-3 rounded-xl px-4 py-3"
              style={{
                animationDelay: `${200 + i * 150}ms`,
                background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(6,182,212,0.01) 100%)',
                border: '1px solid rgba(6,182,212,0.10)',
              }}
            >
              <Icon size={18} className="mt-0.5 shrink-0 text-cyan-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-sm font-bold text-white">{stat.value}</p>
              </div>
            </div>
          )
        })}
      </div>
    </StoryCard>
  )
}
