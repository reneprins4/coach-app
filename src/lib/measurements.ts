// ---------------------------------------------------------------------------
// Body measurement tracking utilities
// ---------------------------------------------------------------------------

export type MeasurementType = 'weight' | 'waist' | 'chest' | 'arms' | 'hips' | 'thighs'

export interface Measurement {
  id: string
  user_id: string
  type: MeasurementType
  value: number
  date: string  // ISO date string (YYYY-MM-DD)
  created_at: string
}

export const MEASUREMENT_TYPES: { type: MeasurementType; labelKey: string; unit: string }[] = [
  { type: 'weight', labelKey: 'measurements.weight', unit: 'kg' },
  { type: 'waist',  labelKey: 'measurements.waist',  unit: 'cm' },
  { type: 'chest',  labelKey: 'measurements.chest',  unit: 'cm' },
  { type: 'arms',   labelKey: 'measurements.arms',   unit: 'cm' },
  { type: 'hips',   labelKey: 'measurements.hips',   unit: 'cm' },
  { type: 'thighs', labelKey: 'measurements.thighs', unit: 'cm' },
]

/**
 * Validate a measurement value. Returns an error string or null if valid.
 */
export function validateMeasurement(type: MeasurementType, value: number): string | null {
  if (value <= 0) return 'Value must be greater than zero'
  if (value > 500) return 'Value seems unreasonable'

  if (type === 'weight') {
    if (value < 20 || value > 300) return 'Weight should be between 20 and 300 kg'
  } else {
    if (value < 10 || value > 300) return 'Measurement should be between 10 and 300 cm'
  }

  return null
}

/**
 * Calculate trend direction from a series of values.
 * Returns 'up', 'down', 'stable', or null (insufficient data).
 */
export function calculateTrend(values: number[]): 'up' | 'down' | 'stable' | null {
  if (values.length < 2) return null

  const first = values[0]!
  const last = values[values.length - 1]!

  if (first === 0) return last > 0 ? 'up' : 'stable'

  const changePct = ((last - first) / first) * 100

  if (changePct > 1) return 'up'
  if (changePct < -1) return 'down'
  return 'stable'
}

/**
 * Group measurements by type, sorted by date ascending within each group.
 */
export function groupByType(measurements: Measurement[]): Record<MeasurementType, Measurement[]> {
  const groups: Record<MeasurementType, Measurement[]> = {
    weight: [],
    waist: [],
    chest: [],
    arms: [],
    hips: [],
    thighs: [],
  }

  for (const m of measurements) {
    groups[m.type].push(m)
  }

  // Sort each group by date ascending
  for (const type of Object.keys(groups) as MeasurementType[]) {
    groups[type].sort((a, b) => a.date.localeCompare(b.date))
  }

  return groups
}

/**
 * Format a measurement value with its unit.
 */
export function formatMeasurement(type: MeasurementType, value: number): string {
  const unit = type === 'weight' ? 'kg' : 'cm'
  return `${value} ${unit}`
}
