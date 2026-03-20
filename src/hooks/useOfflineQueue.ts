import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const QUEUE_KEY = 'coach-offline-queue'

interface QueueInsertAction {
  type: 'insert'
  table: string
  data: Record<string, unknown>
}

interface QueueUpdateAction {
  type: 'update'
  table: string
  id: string
  data: Record<string, unknown>
}

interface QueueDeleteAction {
  type: 'delete'
  table: string
  id: string
}

type QueueAction = QueueInsertAction | QueueUpdateAction | QueueDeleteAction

interface QueueItem {
  id: string
  action: QueueAction
  createdAt: string
}

interface UseOfflineQueueReturn {
  queue: QueueItem[]
  queueLength: number
  syncing: boolean
  isOnline: boolean
  addToQueue: (action: QueueAction) => string
  syncQueue: () => Promise<number | undefined>
  clearQueue: () => void
}

function loadQueue(): QueueItem[] {
  try {
    return (JSON.parse(localStorage.getItem(QUEUE_KEY)!) as QueueItem[] | null) || []
  } catch {
    return []
  }
}

function saveQueue(queue: QueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch (e: unknown) {
    const err = e as DOMException
    if (err.name === 'QuotaExceededError') {
      console.error('Cannot save offline queue - storage full')
      // Could try to free space here, but offline queue is critical data
    } else {
      console.warn('Failed to save offline queue:', e)
    }
  }
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [queue, setQueue] = useState<QueueItem[]>(() => loadQueue())
  const [syncing, setSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Ref-based lock to prevent double-flush race condition
  const isFlushingRef = useRef(false)

  // Track online/offline status
  useEffect(() => {
    const handleOnline = (): void => setIsOnline(true)
    const handleOffline = (): void => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Persist queue changes
  useEffect(() => {
    saveQueue(queue)
  }, [queue])

  // Keep a ref to syncQueue to avoid stale closures
  const syncQueueRef = useRef<(() => Promise<number | undefined>) | null>(null)

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isFlushingRef.current && syncQueueRef.current) {
      syncQueueRef.current()
    }
  }, [isOnline, queue.length])

  const addToQueue = useCallback((action: QueueAction): string => {
    const item: QueueItem = {
      id: crypto.randomUUID(),
      action,
      createdAt: new Date().toISOString(),
    }
    setQueue(prev => [...prev, item])
    return item.id
  }, [])

  const syncQueue = useCallback(async (): Promise<number | undefined> => {
    // Use ref-based lock instead of state to prevent race conditions
    if (isFlushingRef.current || queue.length === 0 || !isOnline) return

    isFlushingRef.current = true
    setSyncing(true)
    const processedIds: string[] = []
    // Snapshot the queue to avoid race condition during async iteration
    const currentQueue = [...queue]

    try {
      for (const item of currentQueue) {
        try {
          const { action } = item

          if (action.type === 'insert') {
            const { error } = await supabase
              .from(action.table)
              .insert(action.data)

            if (!error) {
              processedIds.push(item.id)
            }
          } else if (action.type === 'update') {
            const { error } = await supabase
              .from(action.table)
              .update(action.data)
              .eq('id', action.id)

            if (!error) {
              processedIds.push(item.id)
            }
          } else if (action.type === 'delete') {
            const { error } = await supabase
              .from(action.table)
              .delete()
              .eq('id', action.id)

            if (!error) {
              processedIds.push(item.id)
            }
          }
        } catch (err) {
          console.error('Sync error:', err)
        }
      }

      // Remove processed items
      setQueue(prev => prev.filter(item => !processedIds.includes(item.id)))
    } finally {
      isFlushingRef.current = false
      setSyncing(false)
    }

    return processedIds.length
  }, [queue, isOnline])

  // Update ref after syncQueue is defined
  useEffect(() => {
    syncQueueRef.current = syncQueue
  }, [syncQueue])

  const clearQueue = useCallback((): void => {
    setQueue([])
  }, [])

  return {
    queue,
    queueLength: queue.length,
    syncing,
    isOnline,
    addToQueue,
    syncQueue,
    clearQueue,
  }
}
