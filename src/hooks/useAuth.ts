import { useState, useEffect, useCallback } from 'react'
import type { User, AuthError, Session } from '@supabase/auth-js'
import { supabase } from '../lib/supabase'

interface OtpResult {
  error: AuthError | null
}

interface VerifyOtpResult {
  data: { user: User | null; session: Session | null }
  error: AuthError | null
}

interface UseAuthReturn {
  user: User | null
  loading: boolean
  sendOtp: (email: string) => Promise<OtpResult>
  verifyOtp: (email: string, token: string) => Promise<VerifyOtpResult>
  signIn: (email: string) => Promise<OtpResult>
  signOut: () => Promise<OtpResult>
}

/**
 * localStorage keys that contain user-specific data and MUST be cleared
 * when switching users or signing out to prevent data leakage.
 *
 * Intentionally excluded (device-level, not user-level):
 *   - coach-lang (language preference)
 *   - kravex-exercises-cache (shared exercise library)
 */
export const USER_LOCAL_STORAGE_KEYS = [
  'coach-training-block',
  'coach-app-settings',
  'coach-active-workout',
  'coach-workout-backup',
  'coach-last-used',
  'coach-pending-workout',
  'coach-offline-queue',
  'coach-measurements',
  'kravex_injuries',
  'kravex-achievements',
  'kravex-training-story',
  'kravex-workout-cache',
  'kravex-pr-goals',
  'ragnarok_form_analysis',
  'e2e-bypass',
] as const

const CURRENT_USER_KEY = 'coach-current-user'

/** Remove all user-specific data from localStorage. */
export function clearUserLocalStorage(): void {
  for (const key of USER_LOCAL_STORAGE_KEYS) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }
}

/**
 * Detect whether a different user is logging in and clear stale data
 * left behind by the previous session.
 * Returns true when the incoming user differs from the stored user.
 */
export function handleUserSwitch(newUserId: string): boolean {
  const previousUser = localStorage.getItem(CURRENT_USER_KEY)
  const isDifferentUser = !!previousUser && previousUser !== newUserId

  if (isDifferentUser) {
    clearUserLocalStorage()
  }

  localStorage.setItem(CURRENT_USER_KEY, newUserId)
  return isDifferentUser
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      // On login: detect user switch and clear stale data
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user?.id) {
        handleUserSwitch(session.user.id)
      }

      // On logout: clear ALL user-specific localStorage + sessionStorage
      if (event === 'SIGNED_OUT') {
        clearUserLocalStorage()
        try { localStorage.removeItem(CURRENT_USER_KEY) } catch { /* ignore */ }

        try {
          for (const key of Object.keys(sessionStorage)) {
            if (key.startsWith('__kravex_')) {
              sessionStorage.removeItem(key)
            }
          }
        } catch { /* ignore */ }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Stap 1: verstuur OTP code naar email
  const sendOtp = useCallback(async (email: string): Promise<OtpResult> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      }
    })
    return { error }
  }, [])

  // Stap 2: verifieer de ingevoerde code
  const verifyOtp = useCallback(async (email: string, token: string): Promise<VerifyOtpResult> => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })
    return { data: { user: data.user, session: data.session }, error }
  }, [])

  // Legacy alias voor backward compatibility
  const signIn = sendOtp

  const signOut = useCallback(async (): Promise<OtpResult> => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  return { user, loading, sendOtp, verifyOtp, signIn, signOut }
}
