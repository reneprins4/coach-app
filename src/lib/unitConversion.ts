// ---------------------------------------------------------------------------
// Weight unit conversion utilities
// All data is stored in kg. Conversion happens ONLY at UI boundaries.
// ---------------------------------------------------------------------------

import type { Units } from '../types'

const KG_TO_LBS = 2.20462
const LBS_TO_KG = 0.453592

/** Convert kg (storage) to display unit */
export function toDisplayWeight(kg: number, unit: Units): number {
  if (unit === 'lbs') return Math.round(kg * KG_TO_LBS * 10) / 10
  return kg
}

/** Convert display unit back to kg for storage */
export function toKg(value: number, unit: Units): number {
  if (unit === 'lbs') return Math.round(value * LBS_TO_KG * 100) / 100
  return value
}

/** Format weight with unit label (e.g. "60kg" or "132.3lbs") */
export function formatWeight(kg: number, unit: Units): string {
  const val = toDisplayWeight(kg, unit)
  return `${val}${unit}`
}

/** Get the increment step for +/- buttons */
export function getWeightStep(unit: Units): number {
  return unit === 'lbs' ? 5 : 2.5
}

/** Get the unit label string */
export function getUnitLabel(unit: Units): string {
  return unit
}

/**
 * Format volume (weight x reps) for display.
 * Volume is stored in kg-based units. If user prefers lbs, convert.
 */
export function formatVolume(kgVolume: number, unit: Units): string {
  const vol = unit === 'lbs' ? Math.round(kgVolume * KG_TO_LBS) : kgVolume
  if (!vol) return `0${unit}`
  if (unit === 'lbs') {
    if (vol >= 2200) return `${(vol / 2200).toFixed(1)}t`
    return `${Math.round(vol)}lbs`
  }
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}t`
  return `${Math.round(vol)}kg`
}

/**
 * Format volume as a short number (no unit suffix).
 * Used where the unit label is shown separately.
 */
export function formatVolumeShort(kgVolume: number, unit: Units): string {
  const vol = unit === 'lbs' ? Math.round(kgVolume * KG_TO_LBS) : kgVolume
  if (!vol) return '0'
  if (unit === 'lbs') {
    if (vol >= 2200) return `${(vol / 2200).toFixed(1)}t`
    return `${Math.round(vol).toLocaleString()}`
  }
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}t`
  return `${Math.round(vol).toLocaleString()}`
}
