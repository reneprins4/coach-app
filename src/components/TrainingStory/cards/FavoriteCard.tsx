import { useTranslation } from 'react-i18next'
import { Dumbbell } from 'lucide-react'
import StoryCard from '../StoryCard'
import type { TrainingStoryData } from '../../../lib/trainingStory'

interface FavoriteCardProps {
  data: TrainingStoryData
  isActive: boolean
}

export default function FavoriteCard({ data, isActive }: FavoriteCardProps) {
  const { t } = useTranslation()

  return (
    <StoryCard isActive={isActive} className="items-center justify-center text-center">
      <h2 className="story-fade-in mb-8 text-lg font-bold text-white">
        {t('story.favorite.title')}
      </h2>

      {/* Dumbbell icon */}
      <div className="story-scale-in mb-6">
        <Dumbbell size={40} className="text-cyan-400" aria-hidden="true" />
      </div>

      {data.favoriteExercise ? (
        <>
          <p className="story-slide-up story-stagger story-delay-1 mb-2 text-2xl font-black tracking-tight text-white">
            {data.favoriteExercise.name}
          </p>
          <p className="story-slide-up story-stagger story-delay-2 mb-8 text-sm text-gray-400">
            {data.favoriteExercise.totalSets} {t('story.favorite.total_sets')}
          </p>
        </>
      ) : (
        <p className="story-slide-up story-stagger story-delay-1 mb-8 text-sm text-gray-500">
          --
        </p>
      )}

      {data.mostTrainedMuscle && (
        <div className="story-slide-up story-stagger story-delay-3">
          <p className="mb-1 text-xs text-gray-500">{t('story.favorite.most_trained_muscle')}</p>
          <p className="text-lg font-bold text-cyan-400">{data.mostTrainedMuscle.name}</p>
        </div>
      )}
    </StoryCard>
  )
}
