import { useTranslation } from 'react-i18next'
import type { MuscleGroup, MuscleStatus } from '../types'

/**
 * MuscleMap - Fitbod-style muscle recovery visualization
 * Shows front/back body silhouette with color-coded muscle groups
 */

function getMuscleColor(recoveryPct: number | undefined | null): string {
  if (recoveryPct === undefined || recoveryPct === null) return 'rgba(255,255,255,0.06)'
  if (recoveryPct < 40) return '#ef4444'   // rood - vermoeid
  if (recoveryPct < 75) return '#f97316'   // oranje - herstellend
  return '#22c55e'                          // groen - klaar
}

function shouldGlow(recoveryPct: number | undefined | null): boolean {
  return recoveryPct !== undefined && recoveryPct !== null && recoveryPct < 40
}

function getRecoveryPct(muscleStatus: Partial<Record<MuscleGroup, MuscleStatus>> | undefined, muscle: MuscleGroup): number | undefined {
  return muscleStatus?.[muscle]?.recoveryPct
}

export default function MuscleMap({ muscleStatus = {} }: { muscleStatus?: Partial<Record<MuscleGroup, MuscleStatus>> }) {
  const { t } = useTranslation()
  
  return (
    <div>
      <div className="flex gap-4 justify-center items-start">
        {/* Front view */}
        <div className="flex-1 max-w-[140px]">
          <p className="text-center label-caps mb-2">{t('muscle_map.front', 'Front')}</p>
          <svg viewBox="0 0 140 300" className="w-full" style={{ height: 'auto' }}>
            <defs>
              <filter id="glow-front">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Body outline - front */}
            <g stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="rgba(255,255,255,0.03)">
              {/* Head */}
              <ellipse cx="70" cy="22" rx="18" ry="20" />
              {/* Neck */}
              <rect x="62" y="40" width="16" height="12" rx="3" />
              {/* Torso */}
              <path d="M 40 52 Q 35 90 38 130 Q 42 155 50 160 L 50 165 Q 55 170 70 170 Q 85 170 90 165 L 90 160 Q 98 155 102 130 Q 105 90 100 52 Q 90 48 70 48 Q 50 48 40 52 Z" />
              {/* Left arm */}
              <path d="M 40 55 Q 25 60 18 80 Q 12 105 15 140 Q 18 150 22 150 Q 28 150 30 145 Q 35 115 38 90 Q 40 75 40 55" />
              {/* Right arm */}
              <path d="M 100 55 Q 115 60 122 80 Q 128 105 125 140 Q 122 150 118 150 Q 112 150 110 145 Q 105 115 102 90 Q 100 75 100 55" />
              {/* Left leg */}
              <path d="M 50 165 Q 45 200 42 240 Q 40 270 45 295 Q 52 298 58 295 Q 62 270 60 240 Q 62 200 60 170" />
              {/* Right leg */}
              <path d="M 90 165 Q 95 200 98 240 Q 100 270 95 295 Q 88 298 82 295 Q 78 270 80 240 Q 78 200 80 170" />
            </g>

            {/* Shoulders - front (deltoids) */}
            <ellipse
              cx="32"
              cy="62"
              rx="10"
              ry="14"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'shoulders'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'shoulders')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="108"
              cy="62"
              rx="10"
              ry="14"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'shoulders'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'shoulders')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />

            {/* Chest (pectorals) */}
            <ellipse
              cx="55"
              cy="75"
              rx="13"
              ry="16"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'chest'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'chest')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="85"
              cy="75"
              rx="13"
              ry="16"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'chest'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'chest')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />

            {/* Biceps */}
            <ellipse
              cx="26"
              cy="100"
              rx="7"
              ry="18"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'biceps'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'biceps')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="114"
              cy="100"
              rx="7"
              ry="18"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'biceps'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'biceps')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />

            {/* Core (abs) */}
            <rect
              x="58"
              y="100"
              width="24"
              height="55"
              rx="5"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'core'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'core')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />

            {/* Quads */}
            <ellipse
              cx="53"
              cy="210"
              rx="11"
              ry="35"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'quads'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'quads')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="87"
              cy="210"
              rx="11"
              ry="35"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'quads'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'quads')) ? 'url(#glow-front)' : undefined}
              opacity="0.85"
            />
          </svg>
        </div>

        {/* Back view */}
        <div className="flex-1 max-w-[140px]">
          <p className="text-center label-caps mb-2">{t('muscle_map.back', 'Back')}</p>
          <svg viewBox="0 0 140 300" className="w-full" style={{ height: 'auto' }}>
            <defs>
              <filter id="glow-back">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Body outline - back */}
            <g stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="rgba(255,255,255,0.03)">
              {/* Head */}
              <ellipse cx="70" cy="22" rx="18" ry="20" />
              {/* Neck */}
              <rect x="62" y="40" width="16" height="12" rx="3" />
              {/* Torso */}
              <path d="M 40 52 Q 35 90 38 130 Q 42 155 50 160 L 50 165 Q 55 170 70 170 Q 85 170 90 165 L 90 160 Q 98 155 102 130 Q 105 90 100 52 Q 90 48 70 48 Q 50 48 40 52 Z" />
              {/* Left arm */}
              <path d="M 40 55 Q 25 60 18 80 Q 12 105 15 140 Q 18 150 22 150 Q 28 150 30 145 Q 35 115 38 90 Q 40 75 40 55" />
              {/* Right arm */}
              <path d="M 100 55 Q 115 60 122 80 Q 128 105 125 140 Q 122 150 118 150 Q 112 150 110 145 Q 105 115 102 90 Q 100 75 100 55" />
              {/* Left leg */}
              <path d="M 50 165 Q 45 200 42 240 Q 40 270 45 295 Q 52 298 58 295 Q 62 270 60 240 Q 62 200 60 170" />
              {/* Right leg */}
              <path d="M 90 165 Q 95 200 98 240 Q 100 270 95 295 Q 88 298 82 295 Q 78 270 80 240 Q 78 200 80 170" />
            </g>

            {/* Shoulders - back (rear delts) */}
            <ellipse
              cx="32"
              cy="62"
              rx="10"
              ry="14"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'shoulders'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'shoulders')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="108"
              cy="62"
              rx="10"
              ry="14"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'shoulders'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'shoulders')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />

            {/* Back (lats + traps) */}
            <path
              d="M 45 60 Q 42 85 45 120 L 55 135 Q 70 140 85 135 L 95 120 Q 98 85 95 60 Q 85 55 70 55 Q 55 55 45 60 Z"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'back'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'back')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />

            {/* Triceps */}
            <ellipse
              cx="26"
              cy="100"
              rx="7"
              ry="18"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'triceps'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'triceps')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="114"
              cy="100"
              rx="7"
              ry="18"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'triceps'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'triceps')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />

            {/* Glutes */}
            <ellipse
              cx="55"
              cy="160"
              rx="14"
              ry="12"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'glutes'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'glutes')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="85"
              cy="160"
              rx="14"
              ry="12"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'glutes'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'glutes')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />

            {/* Hamstrings */}
            <ellipse
              cx="53"
              cy="210"
              rx="10"
              ry="32"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'hamstrings'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'hamstrings')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />
            <ellipse
              cx="87"
              cy="210"
              rx="10"
              ry="32"
              fill={getMuscleColor(getRecoveryPct(muscleStatus, 'hamstrings'))}
              filter={shouldGlow(getRecoveryPct(muscleStatus, 'hamstrings')) ? 'url(#glow-back)' : undefined}
              opacity="0.85"
            />
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {[
          { color: '#22c55e', labelKey: 'muscle_map.ready', fallback: 'Ready' },
          { color: '#f97316', labelKey: 'muscle_map.recovering', fallback: 'Recovering' },
          { color: '#ef4444', labelKey: 'muscle_map.fatigued', fallback: 'Fatigued' },
        ].map(({ color, labelKey, fallback }) => (
          <div key={labelKey} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-slate-500">{t(labelKey, fallback)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
