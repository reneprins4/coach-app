import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { calculateForecast } from '../lib/performanceForecast'
import type { ForecastSession } from '../types'

export default function PerformanceForecast({ sessions }: { sessions: ForecastSession[]; exerciseName?: string }) {
  const { t } = useTranslation()
  
  const forecast = useMemo(() => {
    if (!sessions || sessions.length === 0) return null
    return calculateForecast(sessions)
  }, [sessions])

  if (!forecast) return null

  // Onvoldoende data
  if (forecast.status === 'insufficient') {
    return (
      <div className="card mt-4">
        <div className="flex items-center gap-2 text-gray-400">
          <TrendingUp size={16} />
          <span className="text-sm">{t('forecast.insufficient')}</span>
        </div>
      </div>
    )
  }

  // Dalende of platte trend
  if (forecast.status === 'plateau') {
    return (
      <div className="card mt-4">
        <div className="flex items-center gap-2 text-gray-400">
          <TrendingUp size={16} />
          <span className="text-sm">{t('forecast.plateau')}</span>
        </div>
      </div>
    )
  }

  // Positieve trend met voorspelling
  return (
    <div className="card-accent mt-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={16} className="text-cyan-500" />
        <span className="text-sm font-medium text-cyan-400">{t('forecast.title')}</span>
      </div>
      
      {forecast.stale && (
        <p className="mb-2 text-xs text-yellow-500">{t('forecast.stale')}</p>
      )}
      
      <p className="mb-2 text-sm text-white">
        {t('forecast.expected_pr')}: <span className="font-semibold text-cyan-400">{forecast.forecastDate}</span>
      </p>
      
      <div className="mb-3 flex gap-6 text-xs text-gray-400">
        <div>
          <span className="label-caps">{t('forecast.current')}:</span>{' '}
          <span className="text-white">{forecast.currentPR!.toFixed(1)} kg</span>
        </div>
        <div>
          <span className="label-caps">{t('forecast.target')}:</span>{' '}
          <span className="text-cyan-400">{forecast.targetPR!.toFixed(1)} kg</span>
        </div>
      </div>

      {/* Mini trendlijn */}
      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={forecast.chartData}>
            <Line
              type="monotone"
              dataKey="e1rm"
              stroke="#06B6D4"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#06B6D4"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
