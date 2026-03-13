const SETTINGS_KEY = 'coach-app-settings'

const DEFAULTS = {
  name: '',
  goal: 'hypertrophy',
  frequency: '4x',
  restTime: 90,
  units: 'kg',
  memberSince: new Date().toISOString(),
  bodyweight: '',
  experienceLevel: 'intermediate',
  equipment: 'full_gym',
  benchMax: '',
  squatMax: '',
  deadliftMax: '',
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...getSettings(), ...settings }))
}
