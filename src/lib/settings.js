import { supabase } from './supabase'

const SETTINGS_KEY = 'coach-app-settings'

const DEFAULTS = {
  name: '',
  gender: 'male', // 'male' | 'female' | 'other'
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
  onboardingCompleted: false,
  language: 'auto',
  // Feature 1: Training Goal + Phase
  trainingGoal: 'hypertrophy', // 'hypertrophy' | 'strength' | 'powerbuilding' | 'conditioning'
  trainingPhase: 'build', // 'build' | 'strength' | 'peak' | 'deload'
  // Feature 2: Main Lift PR Target
  mainLift: null, // 'squat' | 'bench' | 'deadlift' | 'ohp' | null
  mainLiftGoalKg: null,
  mainLiftGoalDate: null, // ISO date string
  // Feature 3: Priority Muscles
  priorityMuscles: [], // max 2 items
  priorityMusclesUntil: null, // ISO date string
}

// Get settings from localStorage (fallback/cache)
export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

// Save settings to localStorage and optionally to Supabase
export function saveSettings(settings, userId = null) {
  const merged = { ...getSettings(), ...settings }
  // Set memberSince on first save if not already set
  if (!merged.memberSince) {
    merged.memberSince = new Date().toISOString()
  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  
  // If user is logged in, also sync to cloud
  if (userId) {
    syncSettingsToCloud(userId, merged).catch(console.error)
  }
  
  return merged
}

// Sync settings to Supabase
export async function syncSettingsToCloud(userId, settings = null) {
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
export async function loadSettingsFromCloud(userId) {
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
  
  return data?.settings || null
}

// Merge and sync settings on login
export async function mergeSettingsOnLogin(userId) {
  if (!userId) return getSettings()
  
  // Load from cloud
  const cloudSettings = await loadSettingsFromCloud(userId)
  const localSettings = getSettings()
  
  if (cloudSettings) {
    // Cloud settings exist - merge with cloud taking precedence
    // But keep local memberSince if it's older
    const merged = { ...localSettings, ...cloudSettings }
    if (localSettings.memberSince && cloudSettings.memberSince) {
      const localDate = new Date(localSettings.memberSince)
      const cloudDate = new Date(cloudSettings.memberSince)
      merged.memberSince = localDate < cloudDate ? localSettings.memberSince : cloudSettings.memberSince
    }
    
    // Save merged to localStorage
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged))
    return merged
  } else {
    // No cloud settings - upload local settings to cloud
    await syncSettingsToCloud(userId, localSettings)
    return localSettings
  }
}
