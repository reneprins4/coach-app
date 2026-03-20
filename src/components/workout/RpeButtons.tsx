import { useTranslation } from 'react-i18next'

interface RpeButtonsProps {
  value: number | null
  onChange: (rpe: number | null) => void
}

type RpeValue = 6 | 7 | 8 | 9 | 10

const RPE_OPTIONS: RpeValue[] = [6, 7, 8, 9, 10]

const RPE_LABELS: Record<RpeValue, string> = {
  6: 'rpe.easy',
  7: 'rpe.ok',
  8: 'rpe.hard',
  9: 'rpe.very_hard',
  10: 'rpe.max',
}

const RPE_COLORS: Record<RpeValue, { bg: string; ring: string; text: string }> = {
  6:  { bg: 'bg-green-500/15', ring: 'ring-green-500', text: 'text-green-400' },
  7:  { bg: 'bg-green-500/15', ring: 'ring-green-500', text: 'text-green-400' },
  8:  { bg: 'bg-yellow-500/15', ring: 'ring-yellow-500', text: 'text-yellow-400' },
  9:  { bg: 'bg-orange-500/15', ring: 'ring-orange-500', text: 'text-orange-400' },
  10: { bg: 'bg-red-500/15', ring: 'ring-red-500', text: 'text-red-400' },
}

export default function RpeButtons({ value, onChange }: RpeButtonsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-1.5">
      {RPE_OPTIONS.map(rpe => {
        const isSelected = value === rpe
        const colors = RPE_COLORS[rpe]
        const label = RPE_LABELS[rpe]
        return (
          <button
            key={rpe}
            type="button"
            onClick={() => onChange(isSelected ? null : rpe)}
            aria-label={`${rpe} ${t(label)}`}
            aria-pressed={isSelected}
            className={`flex flex-1 flex-col items-center justify-center rounded-xl py-2 min-h-[44px] text-center transition-colors ${
              isSelected
                ? `${colors.bg} ring-2 ${colors.ring} ${colors.text}`
                : 'bg-gray-800 text-gray-400 active:bg-gray-700'
            }`}
          >
            <span className="text-sm font-bold">{rpe}</span>
            <span className="text-[9px] leading-tight opacity-70">{t(label)}</span>
          </button>
        )
      })}
    </div>
  )
}
