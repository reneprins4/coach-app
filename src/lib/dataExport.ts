// ---------------------------------------------------------------------------
// Data export utilities — JSON full backup & CSV exports
// ---------------------------------------------------------------------------

import type { Workout, UserSettings } from '../types'
import type { Measurement } from './measurements'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportWorkoutSet {
  exercise: string
  weight_kg: number | null
  reps: number | null
  duration_seconds: number | null
  rpe: number | null
}

export interface ExportWorkout {
  id: string
  date: string
  split: string
  exercises: string[]
  totalVolume: number
  notes: string | null
  sets: ExportWorkoutSet[]
}

export interface ExportMeasurement {
  date: string
  type: string
  value: number
}

export interface ExportData {
  exportedAt: string
  appVersion: string
  settings: UserSettings
  workouts: ExportWorkout[]
  measurements: ExportMeasurement[]
}

// ---------------------------------------------------------------------------
// Build structured export data
// ---------------------------------------------------------------------------

export function buildExportData(
  workouts: Workout[],
  measurements: Measurement[],
  settings: UserSettings,
): ExportData {
  return {
    exportedAt: new Date().toISOString(),
    appVersion: 'kravex',
    settings,
    workouts: workouts.map(w => ({
      id: w.id,
      date: w.created_at,
      split: w.split,
      exercises: w.exerciseNames,
      totalVolume: w.totalVolume,
      notes: w.notes,
      sets: (w.workout_sets || []).map(s => ({
        exercise: s.exercise,
        weight_kg: s.weight_kg ?? 0,
        reps: s.reps ?? 0,
        duration_seconds: s.duration_seconds ?? null,
        rpe: s.rpe,
      })),
    })),
    measurements: measurements.map(m => ({
      date: m.date,
      type: m.type,
      value: m.value,
    })),
  }
}

// ---------------------------------------------------------------------------
// JSON export
// ---------------------------------------------------------------------------

export function exportToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2)
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/** Escape a CSV field: wrap in quotes if it contains comma, quote, or newline */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function csvRow(fields: string[]): string {
  return fields.map(escapeCSV).join(',')
}

/** UTF-8 BOM for Excel compatibility */
const UTF8_BOM = '\uFEFF'

// ---------------------------------------------------------------------------
// Workout CSV export — one row per set
// ---------------------------------------------------------------------------

export function exportWorkoutsToCSV(workouts: Workout[]): string {
  const headers = ['Date', 'Workout ID', 'Split', 'Exercise', 'Weight (kg)', 'Reps', 'Duration (s)', 'RPE', 'Volume (kg)']
  const rows: string[] = [csvRow(headers)]

  for (const w of workouts) {
    const date = w.created_at.split('T')[0] ?? ''
    const shortId = w.id.slice(0, 8)
    for (const s of (w.workout_sets || [])) {
      const weight = s.weight_kg ?? 0
      const reps = s.reps ?? 0
      const duration = s.duration_seconds ?? ''
      const volume = s.duration_seconds ? 'N/A' : (weight * reps).toFixed(1)
      rows.push(csvRow([
        date,
        shortId,
        w.split,
        s.exercise,
        String(weight),
        s.reps != null ? String(reps) : '',
        String(duration),
        s.rpe != null ? String(s.rpe) : '',
        volume,
      ]))
    }
  }

  return rows.join('\n')
}

// ---------------------------------------------------------------------------
// Measurement CSV export — one row per measurement
// ---------------------------------------------------------------------------

function measurementUnit(type: string): string {
  return type === 'weight' ? 'kg' : 'cm'
}

export function exportMeasurementsToCSV(measurements: Measurement[]): string {
  const headers = ['Date', 'Type', 'Value', 'Unit']
  const rows: string[] = [csvRow(headers)]

  for (const m of measurements) {
    rows.push(csvRow([
      m.date,
      m.type,
      String(m.value),
      measurementUnit(m.type),
    ]))
  }

  return rows.join('\n')
}

// ---------------------------------------------------------------------------
// File download trigger
// ---------------------------------------------------------------------------

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([UTF8_BOM + content], { type: `${mimeType};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
