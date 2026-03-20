import { useTranslation } from 'react-i18next'
import type { Achievement } from '../lib/achievements'

interface AchievementBadgeProps {
  achievement: Achievement
  unlocked: boolean
}

export default function AchievementBadge({ achievement, unlocked }: AchievementBadgeProps) {
  const { t } = useTranslation()

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all ${
        unlocked
          ? 'bg-gray-900 ring-1 ring-yellow-500/30'
          : 'bg-gray-900/50 opacity-40'
      }`}
    >
      <span className="text-2xl" role="img" aria-hidden="true">
        {unlocked ? achievement.icon : '?'}
      </span>
      <span className={`text-[11px] font-bold leading-tight ${unlocked ? 'text-white' : 'text-gray-600'}`}>
        {unlocked ? t(achievement.nameKey) : '???'}
      </span>
    </div>
  )
}
