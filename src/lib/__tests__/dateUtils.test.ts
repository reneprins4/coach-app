/**
 * Tests for src/lib/dateUtils.ts (DATA-004: timezone bug fix)
 */
import { describe, it, expect } from 'vitest'
import { getLocalDateString } from '../dateUtils'

describe('getLocalDateString (DATA-004)', () => {
  it('returns local date, not UTC', () => {
    // Create a date that is Monday 23:30 in local time
    const date = new Date(2024, 0, 15, 23, 30, 0) // Jan 15, 2024 23:30 local
    const result = getLocalDateString(date)
    expect(result).toBe('2024-01-15')
  })

  it('workout at 23:00 CET is assigned to correct local date, not UTC date', () => {
    // Simulate a late-night workout: Jan 15 at 23:00 local time
    // In UTC+1 (CET), this would be Jan 16 00:00 UTC
    // The bug was: toISOString() converts to UTC, making it "2024-01-16"
    // The fix should keep it as "2024-01-15" (the local date)
    const lateNightWorkout = new Date(2024, 0, 15, 23, 0, 0)
    const result = getLocalDateString(lateNightWorkout)
    // Should be Jan 15 regardless of timezone offset
    expect(result).toBe('2024-01-15')
  })

  it('pads month and day with zeros', () => {
    const date = new Date(2024, 2, 5, 10, 0, 0) // Mar 5, 2024
    expect(getLocalDateString(date)).toBe('2024-03-05')
  })

  it('handles end of year correctly', () => {
    const date = new Date(2024, 11, 31, 23, 59, 59) // Dec 31, 2024 23:59:59
    expect(getLocalDateString(date)).toBe('2024-12-31')
  })

  it('handles start of year correctly', () => {
    const date = new Date(2025, 0, 1, 0, 0, 0) // Jan 1, 2025 00:00
    expect(getLocalDateString(date)).toBe('2025-01-01')
  })
})
