import { useTranslation } from 'react-i18next'
import type { Achievement } from '../lib/achievements'
import { getIcon } from '../lib/iconMap'

interface AchievementToastProps {
  achievements: Achievement[]
}

export default function AchievementToast({ achievements }: AchievementToastProps) {
  const { t } = useTranslation()

  if (achievements.length === 0) return null

  return (
    <div className="card-gold mb-3">
      <h3 className="label-caps mb-3 text-yellow-500">{t('achievements.unlocked')}</h3>
      <div className="space-y-2">
        {achievements.map(a => {
          const Icon = getIcon(a.icon)
          return (
            <div key={a.id} className="flex items-center gap-3">
              <Icon size={24} className="shrink-0 text-yellow-500" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{t(a.nameKey)}</p>
                <p className="text-xs text-gray-400">{t(a.descriptionKey)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
