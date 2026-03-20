/**
 * Global test setup for vitest
 * Provides mocks for browser APIs used throughout the app.
 */
import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Ensure @testing-library/react cleanup runs after each test
// Required because globals: false prevents auto-cleanup registration
afterEach(() => {
  cleanup()
})

// --- localStorage mock ---
const localStorageStore: Record<string, string> = {}
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete localStorageStore[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(localStorageStore)) delete localStorageStore[k] }),
  get length() { return Object.keys(localStorageStore).length },
  key: vi.fn((i: number) => Object.keys(localStorageStore)[i] ?? null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// --- sessionStorage mock ---
const sessionStorageStore: Record<string, string> = {}
const sessionStorageMock: Storage = {
  getItem: vi.fn((key: string) => sessionStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStorageStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete sessionStorageStore[key] }),
  clear: vi.fn(() => { for (const k of Object.keys(sessionStorageStore)) delete sessionStorageStore[k] }),
  get length() { return Object.keys(sessionStorageStore).length },
  key: vi.fn((i: number) => Object.keys(sessionStorageStore)[i] ?? null),
}
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true })

// --- import.meta.env mock ---
// Vitest already provides import.meta.env — ensure DEV is set and Supabase vars exist
if (typeof import.meta.env === 'undefined') {
  Object.defineProperty(import.meta, 'env', { value: { DEV: false, PROD: true } })
}
// Provide dummy Supabase env vars so supabase.ts doesn't throw during tests
import.meta.env.VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://test.supabase.co'
import.meta.env.VITE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key'

// --- matchMedia mock (needed for responsive components) ---
Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// --- crypto.randomUUID mock ---
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10) },
  })
} else if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10),
  })
}

// --- navigator.vibrate mock ---
if (globalThis.navigator) {
  Object.defineProperty(globalThis.navigator, 'vibrate', {
    value: vi.fn(() => true),
    writable: true,
    configurable: true,
  })
  if (!('onLine' in globalThis.navigator)) {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    })
  }
} else {
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      vibrate: vi.fn(() => true),
      onLine: true,
      userAgent: 'node',
    },
    writable: true,
  })
}
