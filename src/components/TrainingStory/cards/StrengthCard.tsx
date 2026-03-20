import { useTranslation } from 'react-i18next'
import { Trophy } from 'lucide-react'
import StoryCard from '../StoryCard'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface StrengthCardProps {
  data: TrainingStoryData
  isActive: boolean
}

export default function StrengthCard({ data, isActive }: StrengthCardProps) {
  const { t } = useTranslation()
  const hasPRs = data.prsThisMonth.length > 0

  return (
    <StoryCard isActive={isActive} className="justify-center">
      <h2 className="story-slide-up story-stagger story-delay-1 mb-6 text-center text-lg font-bold text-white">
        {t('story.strength.title')}
      </h2>

      {/* Trophy icon */}
      <div className="story-scale-in mb-6 flex justify-center">
        <Trophy size={36} className="text-cyan-400" aria-hidden="true" />
      </div>

      {hasPRs ? (
        <>
          <div className="mb-6 space-y-3">
            {data.prsThisMonth.map((pr, i) => (
              <div
                key={pr.exercise}
                className="story-slide-right story-stagger flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  animationDelay: `${300 + i * 150}ms`,
                  background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(6,182,212,0.02) 100%)',
                  border: '1px solid rgba(6,182,212,0.12)',
                }}
              >
                <span className="text-sm font-medium text-gray-300">{pr.exercise}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {pr.previousBest}kg
                  </span>
                  <span className="text-xs text-gray-600" aria-hidden="true">→</span>
                  <span className="text-sm font-bold text-white">{pr.newBest}kg</span>
                  <span className="text-xs font-bold text-cyan-400">
                    (+{pr.improvement}kg)
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="story-slide-up story-stagger story-delay-5 text-center text-sm text-gray-400">
            {t('story.strength.new_prs', { count: data.prsThisMonth.length })}
          </p>
        </>
      ) : (
        <div className="text-center">
          <p className="text-base text-gray-400">{t('story.strength.no_prs')}</p>
          <p className="mt-1 text-sm text-gray-600">{t('story.strength.no_prs_sub')}</p>
        </div>
      )}
    </StoryCard>
  )
}
