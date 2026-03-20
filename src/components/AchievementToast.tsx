import { useTranslation } from 'react-i18next'
import type { Achievement } from '../lib/achievements'

interface AchievementToastProps {
  achievements: Achievement[]
}

export default function AchievementToast({ achievements }: AchievementToastProps) {
  const { t } = useTranslation()

  if (achievements.length === 0) return null

  return (
    <div className="mb-3 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #1a1a0a 0%, #0d1421 100%)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
      <h3 className="label-caps mb-3 text-yellow-500">{t('achievements.unlocked')}</h3>
      <div className="space-y-2">
        {achievements.map(a => (
          <div key={a.id} className="flex items-center gap-3">
            <span className="text-2xl" role="img" aria-hidden="true">{a.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{t(a.nameKey)}</p>
              <p className="text-xs text-gray-400">{t(a.descriptionKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
