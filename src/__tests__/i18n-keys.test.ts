/**
 * BUG-001: Verify all i18n keys used by PlateauAlert exist in both locale files.
 */
import { describe, it, expect } from 'vitest'
import nl from '../locales/nl.json'
import en from '../locales/en.json'

/** Resolve a dot-separated key path against a nested JSON object. */
function resolve(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

const REQUIRED_KEYS = [
  'plateau_alert.title',
  'plateau_alert.plateau',
  'plateau_alert.slowing',
  'plateau_alert.exercise_count',
  'common.show_less',
  'common.show_more',
]

describe('BUG-001: PlateauAlert i18n keys', () => {
  for (const key of REQUIRED_KEYS) {
    it(`nl.json contains "${key}"`, () => {
      expect(resolve(nl, key)).toBeDefined()
      expect(typeof resolve(nl, key)).toBe('string')
    })

    it(`en.json contains "${key}"`, () => {
      expect(resolve(en, key)).toBeDefined()
      expect(typeof resolve(en, key)).toBe('string')
    })
  }
})
