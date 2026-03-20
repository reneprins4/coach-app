import { useTranslation } from 'react-i18next'
import { HelpCircle } from 'lucide-react'
import type { Achievement } from '../lib/achievements'
import { getIcon } from '../lib/iconMap'

interface AchievementBadgeProps {
  achievement: Achievement
  unlocked: boolean
}

export default function AchievementBadge({ achievement, unlocked }: AchievementBadgeProps) {
  const { t } = useTranslation()
  const Icon = unlocked ? getIcon(achievement.icon) : HelpCircle

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all ${
        unlocked
          ? 'bg-gray-900 border border-yellow-500/30'
          : 'bg-gray-900/50 opacity-40'
      }`}
    >
      <Icon
        size={24}
        className={unlocked ? 'text-yellow-500' : 'text-gray-600'}
        aria-hidden="true"
      />
      <span className={`text-[10px] font-bold leading-tight ${unlocked ? 'text-white' : 'text-gray-600'}`}>
        {unlocked ? t(achievement.nameKey) : '???'}
      </span>
    </div>
  )
}
