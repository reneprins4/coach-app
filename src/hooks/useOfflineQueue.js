import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const QUEUE_KEY = 'coach-offline-queue'

function loadQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []
  } catch {
    return []
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('Cannot save offline queue - storage full')
      // Could try to free space here, but offline queue is critical data
    } else {
      console.warn('Failed to save offline queue:', e)
    }
  }
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState(() => loadQueue())
  const [syncing, setSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  
  // Ref-based lock to prevent double-flush race condition
  const isFlushingRef = useRef(false)

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

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
  const syncQueueRef = useRef(null)

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isFlushingRef.current && syncQueueRef.current) {
      syncQueueRef.current()
    }
  }, [isOnline, queue.length])

  const addToQueue = useCallback((action) => {
    const item = {
      id: crypto.randomUUID(),
      action, // { type: 'insert', table: 'workouts', data: {...} }
      createdAt: new Date().toISOString(),
    }
    setQueue(prev => [...prev, item])
    return item.id
  }, [])

  const syncQueue = useCallback(async () => {
    // Use ref-based lock instead of state to prevent race conditions
    if (isFlushingRef.current || queue.length === 0 || !isOnline) return

    isFlushingRef.current = true
    setSyncing(true)
    const processedIds = []
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

  const clearQueue = useCallback(() => {
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
