/**
 * TDD tests for Calendar Heatmap utilities.
 * Tests volume intensity, split detection, split colors, and heatmap data generation.
 */
import { describe, it, expect } from 'vitest'
import {
  getVolumeIntensity,
  detectSplit,
  getSplitColor,
  buildHeatmapData,
} from '../../lib/calendarUtils'
import { createWorkout } from '../../__tests__/helpers'

// ---------------------------------------------------------------------------
// Volume intensity
// ---------------------------------------------------------------------------
describe('getVolumeIntensity', () => {
  it('returns 0 for days with no workout', () => {
    expect(getVolumeIntensity(0, 5000)).toBe(0)
  })

  it('returns 1 (light) for low volume days', () => {
    // volume < avgVolume * 0.7
    const avg = 10000
    expect(getVolumeIntensity(5000, avg)).toBe(1)
  })

  it('returns 2 (medium) for average volume', () => {
    // volume between avgVolume * 0.7 and avgVolume * 1.3
    const avg = 10000
    expect(getVolumeIntensity(10000, avg)).toBe(2)
  })

  it('returns 3 (heavy) for high volume days', () => {
    // volume >= avgVolume * 1.3
    const avg = 10000
    expect(getVolumeIntensity(15000, avg)).toBe(3)
  })

  it('intensity is relative to users own average, not absolute', () => {
    // A beginner with avg 3000 lifting 4000 should be heavy
    expect(getVolumeIntensity(4000, 3000)).toBe(3)
    // An advanced lifter with avg 20000 lifting 4000 should be light
    expect(getVolumeIntensity(4000, 20000)).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Split detection
// ---------------------------------------------------------------------------
describe('detectSplit', () => {
  it('returns "Push" when mostly chest/shoulders/triceps', () => {
    const exercises = ['Bench Press', 'Incline Press', 'Shoulder Press', 'Pushdown']
    expect(detectSplit(exercises)).toBe('Push')
  })

  it('returns "Pull" when mostly back/biceps', () => {
    const exercises = ['Barbell Row', 'Pull-up', 'Lat Pulldown', 'Hammer Curl']
    expect(detectSplit(exercises)).toBe('Pull')
  })

  it('returns "Legs" when mostly quads/hamstrings/glutes', () => {
    const exercises = ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl']
    expect(detectSplit(exercises)).toBe('Legs')
  })

  it('returns "Upper" for mixed upper body', () => {
    const exercises = ['Bench Press', 'Barbell Row', 'Shoulder Press', 'Curl']
    expect(detectSplit(exercises)).toBe('Upper')
  })

  it('returns "Full Body" for broad muscle coverage', () => {
    const exercises = ['Bench Press', 'Squat', 'Barbell Row', 'Shoulder Press', 'Leg Curl']
    expect(detectSplit(exercises)).toBe('Full Body')
  })

  it('returns null for empty workout', () => {
    expect(detectSplit([])).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Split colors
// ---------------------------------------------------------------------------
describe('getSplitColor', () => {
  it('returns cyan for Push', () => {
    expect(getSplitColor('Push')).toBe('#06b6d4')
  })

  it('returns purple for Pull', () => {
    expect(getSplitColor('Pull')).toBe('#a855f7')
  })

  it('returns green for Legs', () => {
    expect(getSplitColor('Legs')).toBe('#22c55e')
  })

  it('returns blue for Upper', () => {
    expect(getSplitColor('Upper')).toBe('#3b82f6')
  })

  it('returns orange for Lower', () => {
    expect(getSplitColor('Lower')).toBe('#f97316')
  })

  it('returns white for Full Body', () => {
    expect(getSplitColor('Full Body')).toBe('#ffffff')
  })

  it('returns gray fallback for unknown split', () => {
    expect(getSplitColor(null)).toBe('#6b7280')
    expect(getSplitColor('Unknown')).toBe('#6b7280')
  })
})

// ---------------------------------------------------------------------------
// Heatmap data
// ---------------------------------------------------------------------------
describe('buildHeatmapData', () => {
  it('returns 365 days of data', () => {
    const result = buildHeatmapData([])
    expect(result).toHaveLength(365)
  })

  it('workout days have volume > 0', () => {
    const today = new Date()
    const workout = createWorkout({
      created_at: today.toISOString(),
    }, [
      { exercise: 'Bench Press', weight_kg: 100, reps: 8 },
      { exercise: 'Incline Press', weight_kg: 80, reps: 10 },
    ])

    const result = buildHeatmapData([workout])
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const todayEntry = result.find(d => d.date === todayStr)

    expect(todayEntry).toBeDefined()
    expect(todayEntry!.volume).toBeGreaterThan(0)
    expect(todayEntry!.workoutCount).toBeGreaterThanOrEqual(1)
  })

  it('rest days have volume = 0', () => {
    const result = buildHeatmapData([])
    // All days should be rest days
    for (const day of result) {
      expect(day.volume).toBe(0)
      expect(day.intensity).toBe(0)
      expect(day.workoutCount).toBe(0)
    }
  })

  it('dates are formatted as YYYY-MM-DD', () => {
    const result = buildHeatmapData([])
    for (const day of result) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('assigns split and splitColor to workout days', () => {
    const today = new Date()
    const workout = createWorkout({
      created_at: today.toISOString(),
    }, [
      { exercise: 'Bench Press', weight_kg: 100, reps: 8 },
      { exercise: 'Shoulder Press', weight_kg: 60, reps: 10 },
      { exercise: 'Pushdown', weight_kg: 30, reps: 12 },
    ])

    const result = buildHeatmapData([workout])
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const todayEntry = result.find(d => d.date === todayStr)

    expect(todayEntry!.split).toBe('Push')
    expect(todayEntry!.splitColor).toBe('#06b6d4')
  })
})
