/**
 * Date utility functions.
 * Uses local time instead of UTC to avoid timezone bugs (DATA-004).
 */

/**
 * Get a date string in YYYY-MM-DD format using LOCAL time, not UTC.
 *
 * The previous pattern `d.toISOString().split('T')[0]` converts to UTC first,
 * causing a workout done Monday at 23:00 CET to appear as Tuesday in UTC.
 */
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
