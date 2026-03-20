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

      // Clear session caches on logout to prevent data leakage
      if (event === 'SIGNED_OUT') {
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
