import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { calculateForecast } from '../lib/performanceForecast'

export default function PerformanceForecast({ sessions, exerciseName }) {
  const forecast = useMemo(() => {
    if (!sessions || sessions.length === 0) return null
    return calculateForecast(sessions)
  }, [sessions])

  if (!forecast) return null

  // Onvoldoende data
  if (forecast.status === 'insufficient') {
    return (
      <div className="mt-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <TrendingUp size={16} />
          <span className="text-sm">Meer trainingen nodig voor een voorspelling</span>
        </div>
      </div>
    )
  }

  // Dalende of platte trend
  if (forecast.status === 'plateau') {
    return (
      <div className="mt-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <div className="flex items-center gap-2 text-gray-400">
          <TrendingUp size={16} />
          <span className="text-sm">Houdt het niveau, focus op consistentie</span>
        </div>
      </div>
    )
  }

  // Positieve trend met voorspelling
  return (
    <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp size={16} className="text-cyan-500" />
        <span className="text-sm font-medium text-cyan-400">Performance Forecast</span>
      </div>
      
      <p className="mb-2 text-sm text-white">
        Verwacht nieuw PR: <span className="font-semibold text-cyan-400">{forecast.forecastDate}</span>
      </p>
      
      <div className="mb-3 flex gap-6 text-xs text-gray-400">
        <div>
          <span className="text-gray-500">Huidig e1RM:</span>{' '}
          <span className="text-white">{forecast.currentPR.toFixed(1)} kg</span>
        </div>
        <div>
          <span className="text-gray-500">Target:</span>{' '}
          <span className="text-cyan-400">{forecast.targetPR.toFixed(1)} kg</span>
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
