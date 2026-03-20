/**
 * Tests for src/lib/settings.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock supabase before importing settings
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}))

import { getSettings, saveSettings, mergeSettingsOnLogin, loadSettingsFromCloud } from '../settings'

const SETTINGS_KEY = 'coach-app-settings'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('getSettings', () => {
    it('returns defaults when localStorage is empty', () => {
      const settings = getSettings()
      expect(settings.name).toBe('')
      expect(settings.goal).toBe('hypertrophy')
      expect(settings.frequency).toBe('4x')
      expect(settings.restTime).toBe(90)
      expect(settings.experienceLevel).toBe('intermediate')
      expect(settings.equipment).toBe('full_gym')
    })

    it('merges stored settings with defaults', () => {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ name: 'Alice', bodyweight: '70' }))
      const settings = getSettings()
      expect(settings.name).toBe('Alice')
      expect(settings.bodyweight).toBe('70')
      // Defaults should still be present
      expect(settings.goal).toBe('hypertrophy')
      expect(settings.equipment).toBe('full_gym')
    })

    it('handles corrupted localStorage data gracefully', () => {
      localStorage.setItem(SETTINGS_KEY, 'not-json{{{')
      const settings = getSettings()
      // Should return defaults without throwing
      expect(settings.goal).toBe('hypertrophy')
    })

    it('returns a new object each call (no shared reference)', () => {
      const a = getSettings()
      const b = getSettings()
      expect(a).not.toBe(b)
      expect(a).toEqual(b)
    })
  })

  describe('saveSettings', () => {
    it('saves settings to localStorage', () => {
      saveSettings({ name: 'Bob' })
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
      expect(stored.name).toBe('Bob')
    })

    it('merges with existing settings', () => {
      saveSettings({ name: 'Alice' })
      saveSettings({ bodyweight: '85' })
      const settings = getSettings()
      expect(settings.name).toBe('Alice')
      expect(settings.bodyweight).toBe('85')
    })

    it('sets memberSince on first save if not already set', () => {
      const result = saveSettings({ name: 'New User' })
      expect(result.memberSince).toBeTruthy()
      expect(new Date(result.memberSince!).getTime()).not.toBeNaN()
    })

    it('preserves existing memberSince', () => {
      const original = '2023-06-15T00:00:00.000Z'
      saveSettings({ memberSince: original })
      const result = saveSettings({ name: 'Updated' })
      expect(result.memberSince).toBe(original)
    })

    it('returns the full merged settings object', () => {
      const result = saveSettings({ name: 'Charlie', bodyweight: '90' })
      expect(result.name).toBe('Charlie')
      expect(result.bodyweight).toBe('90')
      expect(result.goal).toBe('hypertrophy') // default
    })

    it('does not sync to cloud when userId is null', async () => {
      const { supabase } = vi.mocked(await import('../supabase'))
      saveSettings({ name: 'Local' }, null)
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })

  describe('loadSettingsFromCloud', () => {
    it('returns null for empty userId', async () => {
      const result = await loadSettingsFromCloud('')
      expect(result).toBeNull()
    })
  })

  describe('mergeSettingsOnLogin', () => {
    it('returns local settings when userId is empty', async () => {
      saveSettings({ name: 'LocalUser' })
      const result = await mergeSettingsOnLogin('')
      expect(result.name).toBe('LocalUser')
    })

    it('returns local settings when no cloud settings exist', async () => {
      saveSettings({ name: 'Offline' })
      const result = await mergeSettingsOnLogin('user-123')
      expect(result.name).toBe('Offline')
    })
  })
})
