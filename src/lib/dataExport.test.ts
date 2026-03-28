import { describe, it, expect, vi } from 'vitest'
import {
  buildExportData,
  exportToJSON,
  exportWorkoutsToCSV,
  exportMeasurementsToCSV,
  downloadFile,
} from './dataExport'
import type { Workout, UserSettings } from '../types'
import type { Measurement } from './measurements'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockSettings: UserSettings = {
  name: 'Test User',
  gender: 'male',
  goal: 'hypertrophy',
  frequency: '4x',
  restTime: 90,
  units: 'kg',
  memberSince: '2024-01-01T00:00:00.000Z',
  bodyweight: '80',
  experienceLevel: 'intermediate',
  equipment: 'full_gym',
  benchMax: '100',
  squatMax: '140',
  deadliftMax: '180',
  ohpMax: '60',
  onboardingCompleted: true,
  language: 'nl',
  time: 60,
  trainingGoal: 'hypertrophy',
  trainingPhase: 'build',
  mainLift: 'bench',
  mainLiftGoalKg: 120,
  mainLiftGoalDate: '2025-06-01T00:00:00.000Z',
  priorityMuscles: ['chest', 'back'],
  priorityMusclesUntil: null,
}

const mockWorkouts: Workout[] = [
  {
    id: 'w1-uuid-1234',
    user_id: 'user-1',
    split: 'Push',
    created_at: '2025-03-01T10:00:00.000Z',
    completed_at: '2025-03-01T11:00:00.000Z',
    notes: 'Great session',
    workout_sets: [
      { id: 's1', workout_id: 'w1-uuid-1234', user_id: 'user-1', exercise: 'Bench Press', weight_kg: 80, reps: 8, duration_seconds: null, rpe: 7, created_at: '2025-03-01T10:05:00.000Z' },
      { id: 's2', workout_id: 'w1-uuid-1234', user_id: 'user-1', exercise: 'Bench Press', weight_kg: 85, reps: 6, duration_seconds: null, rpe: 8, created_at: '2025-03-01T10:10:00.000Z' },
      { id: 's3', workout_id: 'w1-uuid-1234', user_id: 'user-1', exercise: 'Overhead Press', weight_kg: 40, reps: 10, duration_seconds: null, rpe: null, created_at: '2025-03-01T10:20:00.000Z' },
    ],
    totalVolume: 80 * 8 + 85 * 6 + 40 * 10,
    exerciseNames: ['Bench Press', 'Overhead Press'],
  },
  {
    id: 'w2-uuid-5678',
    user_id: 'user-1',
    split: 'Pull',
    created_at: '2025-03-03T09:00:00.000Z',
    completed_at: '2025-03-03T10:00:00.000Z',
    notes: null,
    workout_sets: [
      { id: 's4', workout_id: 'w2-uuid-5678', user_id: 'user-1', exercise: 'Deadlift', weight_kg: 140, reps: 5, duration_seconds: null, rpe: 9, created_at: '2025-03-03T09:10:00.000Z' },
    ],
    totalVolume: 140 * 5,
    exerciseNames: ['Deadlift'],
  },
]

const mockMeasurements: Measurement[] = [
  { id: 'm1', user_id: 'user-1', type: 'weight', value: 80.5, date: '2025-03-01', created_at: '2025-03-01T08:00:00.000Z' },
  { id: 'm2', user_id: 'user-1', type: 'waist', value: 82, date: '2025-03-01', created_at: '2025-03-01T08:05:00.000Z' },
  { id: 'm3', user_id: 'user-1', type: 'weight', value: 80.2, date: '2025-03-08', created_at: '2025-03-08T08:00:00.000Z' },
]

// ---------------------------------------------------------------------------
// buildExportData
// ---------------------------------------------------------------------------

describe('buildExportData', () => {
  it('includes all workouts with sets', () => {
    const data = buildExportData(mockWorkouts, mockMeasurements, mockSettings)
    expect(data.workouts).toHaveLength(2)
    expect(data.workouts[0]!.sets).toHaveLength(3)
    expect(data.workouts[1]!.sets).toHaveLength(1)
  })

  it('includes user settings', () => {
    const data = buildExportData(mockWorkouts, mockMeasurements, mockSettings)
    expect(data.settings).toEqual(mockSettings)
  })

  it('includes measurements', () => {
    const data = buildExportData(mockWorkouts, mockMeasurements, mockSettings)
    expect(data.measurements).toHaveLength(3)
    expect(data.measurements[0]!.type).toBe('weight')
    expect(data.measurements[0]!.value).toBe(80.5)
  })

  it('includes metadata fields', () => {
    const data = buildExportData(mockWorkouts, mockMeasurements, mockSettings)
    expect(data.exportedAt).toBeDefined()
    expect(data.appVersion).toBe('kravex')
  })

  it('computes totalVolume per workout', () => {
    const data = buildExportData(mockWorkouts, mockMeasurements, mockSettings)
    expect(data.workouts[0]!.totalVolume).toBe(80 * 8 + 85 * 6 + 40 * 10)
    expect(data.workouts[1]!.totalVolume).toBe(140 * 5)
  })

  it('handles empty data gracefully', () => {
    const data = buildExportData([], [], mockSettings)
    expect(data.workouts).toEqual([])
    expect(data.measurements).toEqual([])
    expect(data.settings).toEqual(mockSettings)
    expect(data.exportedAt).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// exportToJSON
// ---------------------------------------------------------------------------

describe('exportToJSON', () => {
  it('produces valid JSON string', () => {
    const data = buildExportData(mockWorkouts, mockMeasurements, mockSettings)
    const json = exportToJSON(data)
    const parsed = JSON.parse(json)
    expect(parsed.workouts).toHaveLength(2)
    expect(parsed.settings.name).toBe('Test User')
  })

  it('handles empty data gracefully', () => {
    const data = buildExportData([], [], mockSettings)
    const json = exportToJSON(data)
    const parsed = JSON.parse(json)
    expect(parsed.workouts).toEqual([])
    expect(parsed.measurements).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// exportWorkoutsToCSV
// ---------------------------------------------------------------------------

describe('exportWorkoutsToCSV', () => {
  it('includes header row', () => {
    const csv = exportWorkoutsToCSV(mockWorkouts)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Date')
    expect(lines[0]).toContain('Exercise')
    expect(lines[0]).toContain('Weight (kg)')
    expect(lines[0]).toContain('Reps')
    expect(lines[0]).toContain('Duration (s)')
    expect(lines[0]).toContain('RPE')
    expect(lines[0]).toContain('Volume (kg)')
  })

  it('includes all sets with date, exercise, weight, reps, rpe', () => {
    const csv = exportWorkoutsToCSV(mockWorkouts)
    const lines = csv.split('\n').filter(l => l.trim())
    // header + 3 sets from w1 + 1 set from w2 = 5 lines
    expect(lines).toHaveLength(5)
    // Check a specific set
    expect(lines[1]).toContain('Bench Press')
    expect(lines[1]).toContain('80')
    expect(lines[1]).toContain('8')
  })

  it('handles special characters (commas in exercise names)', () => {
    const workoutWithComma: Workout[] = [{
      id: 'w3',
      user_id: 'user-1',
      split: 'Push',
      created_at: '2025-03-05T10:00:00.000Z',
      completed_at: null,
      notes: null,
      workout_sets: [
        { id: 's5', workout_id: 'w3', user_id: 'user-1', exercise: 'Incline Press, Dumbbell', weight_kg: 30, reps: 12, duration_seconds: null, rpe: 7, created_at: '2025-03-05T10:05:00.000Z' },
      ],
      totalVolume: 360,
      exerciseNames: ['Incline Press, Dumbbell'],
    }]
    const csv = exportWorkoutsToCSV(workoutWithComma)
    const dataLine = csv.split('\n')[1]
    // The exercise name with a comma should be wrapped in quotes
    expect(dataLine).toContain('"Incline Press, Dumbbell"')
  })

  it('handles null RPE', () => {
    const csv = exportWorkoutsToCSV(mockWorkouts)
    const lines = csv.split('\n')
    // The third set (Overhead Press) has null RPE
    const ohpLine = lines.find(l => l.includes('Overhead Press'))
    expect(ohpLine).toBeDefined()
    // Should have empty field for RPE, not "null"
    expect(ohpLine).not.toContain('null')
  })

  it('returns only header for empty workouts', () => {
    const csv = exportWorkoutsToCSV([])
    const lines = csv.split('\n').filter(l => l.trim())
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('Date')
  })
})

// ---------------------------------------------------------------------------
// exportMeasurementsToCSV
// ---------------------------------------------------------------------------

describe('exportMeasurementsToCSV', () => {
  it('includes header row', () => {
    const csv = exportMeasurementsToCSV(mockMeasurements)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('Date')
    expect(lines[0]).toContain('Type')
    expect(lines[0]).toContain('Value')
    expect(lines[0]).toContain('Unit')
  })

  it('includes all measurement types', () => {
    const csv = exportMeasurementsToCSV(mockMeasurements)
    const lines = csv.split('\n').filter(l => l.trim())
    // header + 3 measurements = 4 lines
    expect(lines).toHaveLength(4)
    expect(csv).toContain('weight')
    expect(csv).toContain('waist')
  })

  it('shows correct units per type', () => {
    const csv = exportMeasurementsToCSV(mockMeasurements)
    const lines = csv.split('\n')
    const weightLine = lines.find(l => l.includes('80.5'))
    expect(weightLine).toContain('kg')
    const waistLine = lines.find(l => l.includes('waist'))
    expect(waistLine).toContain('cm')
  })

  it('returns only header for empty measurements', () => {
    const csv = exportMeasurementsToCSV([])
    const lines = csv.split('\n').filter(l => l.trim())
    expect(lines).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// downloadFile
// ---------------------------------------------------------------------------

describe('downloadFile', () => {
  it('creates a download link with correct filename', () => {
    const createObjectURL = vi.fn(() => 'blob:test-url')
    const revokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = createObjectURL
    globalThis.URL.revokeObjectURL = revokeObjectURL

    const clickSpy = vi.fn()
    const mockAnchor = { href: '', download: '', click: clickSpy } as unknown as HTMLAnchorElement
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLElement)

    downloadFile('test content', 'test-export.json', 'application/json')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(mockAnchor.download).toBe('test-export.json')
    expect(mockAnchor.href).toBe('blob:test-url')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url')

    vi.restoreAllMocks()
  })
})
