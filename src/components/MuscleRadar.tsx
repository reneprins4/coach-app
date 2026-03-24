import { useMemo } from 'react'
import { motion } from 'motion/react'

interface MuscleData {
  key: string
  label: string
  recoveryPct: number
}

interface MuscleRadarProps {
  muscles: MuscleData[]
}

// Recovery color thresholds
function getColor(pct: number): string {
  if (pct >= 90) return '#22c55e'
  if (pct >= 70) return '#eab308'
  if (pct >= 40) return '#f97316'
  return '#ef4444'
}

function getGlowColor(pct: number): string {
  if (pct >= 90) return 'rgba(34,197,94,0.35)'
  if (pct >= 70) return 'rgba(234,179,8,0.30)'
  if (pct >= 40) return 'rgba(249,115,22,0.30)'
  return 'rgba(239,68,68,0.35)'
}

// SVG geometry
const CX = 160
const CY = 160
const RADIUS = 95
const LABEL_RADIUS = 120
const VIEW_SIZE = 320

function polarToCartesian(angle: number, radius: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  }
}

export default function MuscleRadar({ muscles }: MuscleRadarProps) {
  const n = muscles.length
  if (n === 0) return null

  const angleStep = 360 / n

  // Compute points for the web shape (connecting all endpoints)
  const webPoints = useMemo(() => {
    return muscles.map((m, i) => {
      const angle = i * angleStep
      const r = RADIUS * (m.recoveryPct / 100)
      return polarToCartesian(angle, Math.max(r, 4))
    })
  }, [muscles, angleStep])

  const webPath = webPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'

  // Guide circles
  const guides = [0.25, 0.5, 0.75, 1.0]

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="w-full max-w-[280px]"
        role="img"
        aria-label="Muscle recovery radar"
      >
        <defs>
          {/* Center glow */}
          <radialGradient id="radar-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(6,182,212,0.12)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0)" />
          </radialGradient>

          {/* Per-segment gradients */}
          {muscles.map((m, i) => {
            const color = getColor(m.recoveryPct)
            return (
              <radialGradient key={m.key} id={`spoke-grad-${i}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.05" />
                <stop offset="80%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0.4" />
              </radialGradient>
            )
          })}

          {/* Web fill gradient */}
          <radialGradient id="radar-web-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(6,182,212,0)" />
            <stop offset="100%" stopColor="rgba(6,182,212,0.06)" />
          </radialGradient>
        </defs>

        {/* Center ambient glow */}
        <circle cx={CX} cy={CY} r={RADIUS * 0.6} fill="url(#radar-center-glow)" />

        {/* Concentric guide circles */}
        {guides.map((g) => (
          <circle
            key={g}
            cx={CX}
            cy={CY}
            r={RADIUS * g}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={g === 1 ? 1 : 0.5}
          />
        ))}

        {/* Spoke guide lines */}
        {muscles.map((_, i) => {
          const angle = i * angleStep
          const end = polarToCartesian(angle, RADIUS)
          return (
            <line
              key={`spoke-${i}`}
              x1={CX}
              y1={CY}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.03)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Filled web shape (connecting all data points) */}
        <motion.path
          d={webPath}
          fill="url(#radar-web-fill)"
          stroke="rgba(6,182,212,0.20)"
          strokeWidth={1}
          strokeLinejoin="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />

        {/* Individual spoke segments — colored bars from center to data point */}
        {muscles.map((m, i) => {
          const angle = i * angleStep
          const targetR = RADIUS * (m.recoveryPct / 100)
          const end = polarToCartesian(angle, Math.max(targetR, 4))
          const color = getColor(m.recoveryPct)
          const halfWidth = 3.5

          // Calculate perpendicular offset for wedge width
          const perpRad = ((angle - 90 + 90) * Math.PI) / 180
          const dx = halfWidth * Math.cos(perpRad)
          const dy = halfWidth * Math.sin(perpRad)

          // Wedge from center (narrow) to endpoint (wider)
          const centerNarrow = 1.5
          const cdx = centerNarrow * Math.cos(perpRad)
          const cdy = centerNarrow * Math.sin(perpRad)

          const wedgePath = `M${CX - cdx},${CY - cdy} L${end.x - dx},${end.y - dy} L${end.x + dx},${end.y + dy} L${CX + cdx},${CY + cdy} Z`

          return (
            <g key={m.key}>
              {/* Spoke wedge */}
              <motion.path
                d={wedgePath}
                fill={color}
                opacity={0.6}
                initial={{ scale: 0, originX: `${CX}px`, originY: `${CY}px` }}
                animate={{ scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: 0.1 + i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />

              {/* Glowing dot at endpoint */}
              <motion.circle
                cx={end.x}
                cy={end.y}
                r={3.5}
                fill={color}
                filter={`drop-shadow(0 0 4px ${getGlowColor(m.recoveryPct)})`}
                initial={{ opacity: 0, r: 0 }}
                animate={{ opacity: 1, r: 3.5 }}
                transition={{
                  duration: 0.4,
                  delay: 0.3 + i * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </g>
          )
        })}

        {/* Labels around the outside */}
        {muscles.map((m, i) => {
          const angle = i * angleStep
          const pos = polarToCartesian(angle, LABEL_RADIUS)
          const color = getColor(m.recoveryPct)

          // Determine text anchor based on position
          const normalizedAngle = ((angle % 360) + 360) % 360
          let textAnchor: 'start' | 'middle' | 'end' = 'middle'
          if (normalizedAngle > 20 && normalizedAngle < 160) textAnchor = 'start'
          else if (normalizedAngle > 200 && normalizedAngle < 340) textAnchor = 'end'

          // Slight vertical offset for top/bottom labels
          const dy = normalizedAngle > 120 && normalizedAngle < 240 ? 4 : normalizedAngle < 60 || normalizedAngle > 300 ? -2 : 1

          return (
            <g key={`label-${m.key}`}>
              <motion.text
                x={pos.x}
                y={pos.y + dy}
                textAnchor={textAnchor}
                className="fill-white/50"
                style={{
                  fontSize: '8.5px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase' as const,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.5 + i * 0.03 }}
              >
                {m.label}
              </motion.text>
              <motion.text
                x={pos.x}
                y={pos.y + dy + 11}
                textAnchor={textAnchor}
                fill={color}
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.55 + i * 0.03 }}
              >
                {Math.round(m.recoveryPct)}%
              </motion.text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
