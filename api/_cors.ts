// Shared CORS configuration for all API endpoints

import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED_ORIGINS: readonly string[] = [
  'https://kravex.app',
  'https://coach-app.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
]

export function getAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null
  if (ALLOWED_ORIGINS.includes(origin)) return origin
  // Allow Vercel preview URLs for the project (strict regex to prevent subdomain spoofing)
  if (/^https:\/\/coach-app(-[a-z0-9]+)*\.vercel\.app$/.test(origin)) return origin
  return null
}

/**
 * Handle CORS headers and preflight requests.
 * Returns true if the request was an OPTIONS preflight (already handled),
 * false if the caller should continue processing.
 */
export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin as string | undefined
  const allowedOrigin = getAllowedOrigin(origin)

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  }
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.status(204).end()
    return true // signals preflight was handled
  }

  return false // not a preflight, continue handling
}
