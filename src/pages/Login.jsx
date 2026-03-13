import { useState } from 'react'
import { Mail, Loader2, CheckCircle, Dumbbell } from 'lucide-react'

export default function Login({ onSignIn }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || loading) return

    setLoading(true)
    setError(null)

    const { error: signInError } = await onSignIn(email.trim())
    
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle size={40} className="text-green-500" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Check je email</h1>
          <p className="mb-6 text-gray-400">
            We hebben een magic link gestuurd naar <span className="font-medium text-white">{email}</span>
          </p>
          <p className="text-sm text-gray-500">
            Klik op de link in de email om in te loggen. Geen wachtwoord nodig.
          </p>
          <button
            onClick={() => { setSent(false); setEmail('') }}
            className="mt-8 text-sm text-red-500 hover:text-red-400"
          >
            Andere email gebruiken
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gray-950 px-6">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">Coach App</h1>
          <p className="mt-1 text-gray-500">Jouw persoonlijke training coach</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-400">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.nl"
                className="h-14 w-full rounded-xl bg-gray-900 pl-12 pr-4 text-white placeholder-gray-600 outline-none ring-1 ring-gray-800 focus:ring-red-500 transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-500 font-bold text-white disabled:opacity-50 active:scale-[0.97] transition-transform"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Versturen...
              </>
            ) : (
              'Stuur magic link'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-600">
          Je ontvangt een inloglink per email. Geen wachtwoord nodig.
        </p>
      </div>
    </div>
  )
}
