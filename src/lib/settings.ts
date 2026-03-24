import { supabase } from './supabase'
import type { UserSettings } from '../types'

const SETTINGS_KEY = 'coach-app-settings'

const DEFAULTS: UserSettings = {
  name: '',
  gender: 'male',
  goal: 'hypertrophy',
  frequency: '4x',
  restTime: 90,
  units: 'kg',
  memberSince: null,
  bodyweight: '',
  experienceLevel: 'intermediate',
  equipment: 'full_gym',
  benchMax: '',
  squatMax: '',
  deadliftMax: '',
  ohpMax: '',
  onboardingCompleted: false,
  language: 'auto',
  time: 60, // beschikbare workout tijd in minuten
  // Feature 1: Training Goal + Phase
  trainingGoal: 'hypertrophy',
  trainingPhase: 'build',
  // Feature 2: Main Lift PR Target
  mainLift: null,
  mainLiftGoalKg: null,
  mainLiftGoalDate: null,
  // Feature 3: Priority Muscles
  priorityMuscles: [],
  priorityMusclesUntil: null,
}

/**
 * Safely parse frequency from string (e.g. "4x", "3") or number to a number.
 * Returns the default (4) if the input is undefined, empty, or not parseable.
 */
export function parseFrequency(freq: string | number | undefined): number {
  if (typeof freq === 'number') return freq
  if (!freq) return 4
  const parsed = parseInt(String(freq))
  return isNaN(parsed) ? 4 : parsed
}

// Get settings from localStorage (fallback/cache)
export function getSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) as Partial<UserSettings> } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

// Save settings to localStorage and optionally to Supabase
export function saveSettings(settings: Partial<UserSettings>, userId: string | null = null): UserSettings {
  const merged: UserSettings = { ...getSettings(), ...settings }
  // Set memberSince on first save if not already set
  if (!merged.memberSince) {
    merged.memberSince = new Date().toISOString()
  }

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  } catch (e) {
    console.error('Failed to save settings locally:', e)
  }

  // If user is logged in, also sync to cloud
  if (userId) {
    syncSettingsToCloud(userId, merged).catch(console.error)
  }

  return merged
}

// Sync settings to Supabase
export async function syncSettingsToCloud(userId: string, settings: UserSettings | null = null): Promise<UserSettings | null> {
  if (!userId) return null

  const data = settings || getSettings()

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      settings: data,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('Failed to sync settings to cloud:', error)
    throw error
  }

  return data
}

// Load settings from Supabase
export async function loadSettingsFromCloud(userId: string): Promise<UserSettings | null> {
  if (!userId) return null

  const { data, error } = await supabase
    .from('user_settings')
    .select('settings')
    .eq('user_id', userId)
    .single()

  if (error) {
    // No settings in cloud yet - that's OK
    if (error.code === 'PGRST116') return null
    console.error('Failed to load settings from cloud:', error)
    return null
  }

  return (data?.settings as UserSettings) || null
}

// Merge and sync settings on login
export async function mergeSettingsOnLogin(userId: string): Promise<UserSettings> {
  if (!userId) return getSettings()

  // Load from cloud
  const cloudSettings = await loadSettingsFromCloud(userId)
  const localSettings = getSettings()

  if (cloudSettings) {
    // Cloud settings exist - merge with cloud taking precedence
    // But keep local memberSince if it's older
    const merged: UserSettings = { ...localSettings, ...cloudSettings }
    if (localSettings.memberSince && cloudSettings.memberSince) {
      const localDate = new Date(localSettings.memberSince)
      const cloudDate = new Date(cloudSettings.memberSince)
      merged.memberSince = localDate < cloudDate ? localSettings.memberSince : cloudSettings.memberSince
    }

    // Save merged to localStorage
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
    } catch (e) {
      console.error('Failed to save merged settings locally:', e)
    }
    return merged
  } else {
    // No cloud settings - upload local settings to cloud
    await syncSettingsToCloud(userId, localSettings)
    return localSettings
  }
}
