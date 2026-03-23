import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { WeeklyVolumeEntry, MonthlyVolumeEntry } from '../types'



/**
 * Custom SVG bar chart for volume tracking
 * No external chart libraries — pure React + SVG
 */
export default function VolumeChart({ data, unit = 'kg' }: { data: (WeeklyVolumeEntry | MonthlyVolumeEntry)[]; unit?: string }) {
  const { t } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  // Chart dimensions
  const chartHeight = 180
  const chartPadding = { top: 20, right: 16, bottom: 30, left: 40 }
  const barGap = 4

  // Calculate chart internals
  const { bars, yTicks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { bars: [], yTicks: [], maxValue: 0 }
    }

    const max = Math.max(...data.map(d => d.totalVolume))
    const roundedMax = max === 0 ? 1000 : Math.ceil(max / 1000) * 1000

    // Y-axis ticks at 25%, 50%, 75%, 100%
    const ticks = [0.25, 0.5, 0.75, 1].map(pct => ({
      value: Math.round(roundedMax * pct),
      pct,
    }))

    // Calculate bar positions
    const chartWidth = 100 // Will be percentage-based via viewBox
    const innerWidth = chartWidth - chartPadding.left - chartPadding.right
    const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom

    const barCount = data.length
    const totalGapWidth = (barCount - 1) * barGap
    const barWidth = Math.max(8, (innerWidth - totalGapWidth) / barCount)

    const barsData = data.map((d, i) => {
      const x = chartPadding.left + i * (barWidth + barGap)
      const height = roundedMax > 0 ? (d.totalVolume / roundedMax) * innerHeight : 0
      const y = chartPadding.top + innerHeight - height

      return {
        x,
        y,
        width: barWidth,
        height,
        label: d.label,
        totalVolume: d.totalVolume,
        workoutCount: d.workoutCount,
        index: i,
      }
    })

    return { bars: barsData, yTicks: ticks, maxValue: roundedMax }
  }, [data])

  // Format volume for display (e.g., 10000 -> "10k")
  const formatVolume = (vol: number): string => {
    if (vol >= 1000) {
      return `${(vol / 1000).toFixed(vol >= 10000 ? 0 : 1)}k`
    }
    return vol.toString()
  }

  // SVG viewBox dimensions
  const svgWidth = chartPadding.left + chartPadding.right + (bars.length * (bars[0]?.width || 20) + (bars.length - 1) * barGap)
  const viewBoxWidth = Math.max(200, svgWidth)

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center">
        <p className="text-sm text-gray-500">{t('volume.no_data')}</p>
      </div>
    )
  }

  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}
        className="w-full"
        style={{ height: chartHeight }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <linearGradient id="barGradientSelected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={chartPadding.left}
            y1={chartPadding.top + innerHeight * (1 - tick.pct)}
            x2={viewBoxWidth - chartPadding.right}
            y2={chartPadding.top + innerHeight * (1 - tick.pct)}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={`y-${i}`}
            x={chartPadding.left - 6}
            y={chartPadding.top + innerHeight * (1 - tick.pct) + 3}
            fill="#4b5563"
            fontSize="8"
            textAnchor="end"
          >
            {formatVolume(tick.value)}
          </text>
        ))}

        {/* Bars */}
        {bars.map((bar, i) => {
          const isSelected = selectedIndex === i
          const isMax = bar.totalVolume === Math.max(...bars.map(b => b.totalVolume)) && bar.totalVolume > 0

          return (
            <g key={i}>
              {/* Clickable area (includes empty space above bar) */}
              <rect
                x={bar.x}
                y={chartPadding.top}
                width={bar.width}
                height={innerHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedIndex(isSelected ? null : i)}
              />
              {/* Actual bar */}
              {bar.height > 0 && (
                <rect
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={isSelected || isMax ? 'url(#barGradientSelected)' : 'url(#barGradient)'}
                  opacity={isSelected || isMax ? 1 : 0.8}
                  rx="3"
                  ry="3"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedIndex(isSelected ? null : i)}
                />
              )}
              {/* X-axis label */}
              <text
                x={bar.x + bar.width / 2}
                y={chartHeight - 8}
                fill="#4b5563"
                fontSize="8"
                textAnchor="middle"
              >
                {bar.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {selectedIndex !== null && bars[selectedIndex] && (
        <div
          className="absolute z-10 glass rounded-lg px-3 py-2 text-xs"
          style={{
            left: `${((bars[selectedIndex].x + bars[selectedIndex].width / 2) / viewBoxWidth) * 100}%`,
            top: `${bars[selectedIndex].y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="font-bold tabular-nums text-white">
            {bars[selectedIndex].totalVolume.toLocaleString()} {unit}
          </p>
          <p className="text-gray-400">
            {bars[selectedIndex].workoutCount} {bars[selectedIndex].workoutCount === 1 ? 'training' : 'trainingen'}
          </p>
        </div>
      )}
    </div>
  )
}
