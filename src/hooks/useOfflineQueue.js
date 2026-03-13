import { useState, useEffect, useCallback } from 'react'
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
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState(() => loadQueue())
  const [syncing, setSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncing) {
      syncQueue()
    }
  }, [isOnline]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (syncing || queue.length === 0 || !isOnline) return

    setSyncing(true)
    const processedIds = []

    for (const item of queue) {
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
    setSyncing(false)

    return processedIds.length
  }, [queue, syncing, isOnline])

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
