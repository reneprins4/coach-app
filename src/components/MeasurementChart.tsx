import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Measurement, MeasurementType } from '../lib/measurements'

/**
 * Custom SVG line chart for body measurement trends.
 * Uses same visual style as VolumeChart (pure SVG, no external chart libs).
 */
export default function MeasurementChart({ data, type }: { data: Measurement[]; type: MeasurementType }) {
  const { t } = useTranslation()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const unit = type === 'weight' ? 'kg' : 'cm'

  const chartHeight = 180
  const padding = { top: 20, right: 16, bottom: 30, left: 44 }

  const { points, yTicks, viewBoxWidth } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], yTicks: [], viewBoxWidth: 200 }
    }

    // Sort ascending by date
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))

    const values = sorted.map(d => d.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min || 1
    const padded = { min: min - range * 0.1, max: max + range * 0.1 }

    const innerHeight = chartHeight - padding.top - padding.bottom
    const pointGap = 40
    const innerWidth = Math.max(160, (sorted.length - 1) * pointGap)
    const vbWidth = padding.left + innerWidth + padding.right

    const pts = sorted.map((d, i) => {
      const x = padding.left + (sorted.length > 1 ? (i / (sorted.length - 1)) * innerWidth : innerWidth / 2)
      const y = padding.top + innerHeight - ((d.value - padded.min) / (padded.max - padded.min)) * innerHeight
      const label = new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      return { x, y, value: d.value, label, date: d.date, index: i }
    })

    // Y-axis ticks
    const tickCount = 4
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const pct = (i + 1) / tickCount
      const value = padded.min + (padded.max - padded.min) * pct
      const y = padding.top + innerHeight - pct * innerHeight
      return { value: Math.round(value * 10) / 10, y }
    })

    return { points: pts, yTicks: ticks, viewBoxWidth: vbWidth }
  }, [data])

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center">
        <p className="text-sm text-gray-500">{t('measurements.no_data')}</p>
      </div>
    )
  }

  // Build SVG polyline points string
  const linePoints = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${chartHeight}`}
        className="w-full"
        style={{ height: chartHeight }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gradient for area fill */}
        <defs>
          <linearGradient id="measurementGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={tick.y}
            x2={viewBoxWidth - padding.right}
            y2={tick.y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={`y-${i}`}
            x={padding.left - 6}
            y={tick.y + 3}
            fill="#4b5563"
            fontSize="8"
            textAnchor="end"
          >
            {tick.value}
          </text>
        ))}

        {/* Area fill */}
        {points.length > 1 && (
          <polygon
            points={`${points[0]!.x},${padding.top + chartHeight - padding.top - padding.bottom} ${linePoints} ${points[points.length - 1]!.x},${padding.top + chartHeight - padding.top - padding.bottom}`}
            fill="url(#measurementGradient)"
          />
        )}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke="#06b6d4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={selectedIndex === i ? 5 : 3.5}
              fill={selectedIndex === i ? '#67e8f9' : '#06b6d4'}
              stroke="#111827"
              strokeWidth="1.5"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedIndex(selectedIndex === i ? null : i)}
            />
            {/* X-axis label (show every Nth depending on count) */}
            {(points.length <= 8 || i % Math.ceil(points.length / 8) === 0 || i === points.length - 1) && (
              <text
                x={p.x}
                y={chartHeight - 8}
                fill="#4b5563"
                fontSize="8"
                textAnchor="middle"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {selectedIndex !== null && points[selectedIndex] && (
        <div
          className="absolute z-10 glass rounded-lg px-3 py-2 text-xs"
          style={{
            left: `${(points[selectedIndex].x / viewBoxWidth) * 100}%`,
            top: `${points[selectedIndex].y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <p className="font-bold tabular-nums text-white">
            {points[selectedIndex].value} {unit}
          </p>
          <p className="text-gray-400">{points[selectedIndex].label}</p>
        </div>
      )}
    </div>
  )
}
