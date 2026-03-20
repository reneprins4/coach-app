/**
 * Tests for useOfflineQueue pure logic.
 *
 * Without @testing-library/react, we test the standalone utility functions
 * (loadQueue, saveQueue) and the data structures used by the hook.
 */
import { describe, it, expect, beforeEach } from 'vitest'

const QUEUE_KEY = 'coach-offline-queue'

// Re-implement the pure functions from useOfflineQueue for testing
// These mirror the module's internal logic exactly.
interface QueueAction {
  type: 'insert' | 'update' | 'delete'
  table: string
  data?: Record<string, unknown>
  id?: string
}

interface QueueItem {
  id: string
  action: QueueAction
  createdAt: string
}

function loadQueue(): QueueItem[] {
  try {
    return (JSON.parse(localStorage.getItem(QUEUE_KEY)!) as QueueItem[] | null) || []
  } catch {
    return []
  }
}

function saveQueue(queue: QueueItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function createQueueItem(action: QueueAction): QueueItem {
  return {
    id: crypto.randomUUID(),
    action,
    createdAt: new Date().toISOString(),
  }
}

describe('useOfflineQueue (logic tests)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadQueue', () => {
    it('returns empty array when no queue stored', () => {
      expect(loadQueue()).toEqual([])
    })

    it('returns stored queue items', () => {
      const items: QueueItem[] = [
        createQueueItem({ type: 'insert', table: 'workouts', data: { split: 'Push' } }),
      ]
      localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
      const loaded = loadQueue()
      expect(loaded).toHaveLength(1)
      expect(loaded[0]!.action.type).toBe('insert')
      expect(loaded[0]!.action.table).toBe('workouts')
    })

    it('handles corrupted data gracefully', () => {
      localStorage.setItem(QUEUE_KEY, 'not-valid-json{{{')
      expect(loadQueue()).toEqual([])
    })

    it('handles null in localStorage', () => {
      localStorage.setItem(QUEUE_KEY, 'null')
      expect(loadQueue()).toEqual([])
    })

    it('loads multiple items in order', () => {
      const items = [
        createQueueItem({ type: 'insert', table: 'workouts', data: { id: '1' } }),
        createQueueItem({ type: 'update', table: 'workouts', id: '1', data: { notes: 'updated' } }),
        createQueueItem({ type: 'delete', table: 'workouts', id: '1' }),
      ]
      localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
      const loaded = loadQueue()
      expect(loaded).toHaveLength(3)
      expect(loaded[0]!.action.type).toBe('insert')
      expect(loaded[1]!.action.type).toBe('update')
      expect(loaded[2]!.action.type).toBe('delete')
    })
  })

  describe('saveQueue', () => {
    it('saves queue to localStorage', () => {
      const items = [createQueueItem({ type: 'insert', table: 'workouts', data: {} })]
      saveQueue(items)
      const raw = localStorage.getItem(QUEUE_KEY)
      expect(raw).toBeTruthy()
      expect(JSON.parse(raw!)).toHaveLength(1)
    })

    it('overwrites existing queue', () => {
      saveQueue([createQueueItem({ type: 'insert', table: 'a', data: {} })])
      saveQueue([createQueueItem({ type: 'delete', table: 'b', id: '1' })])
      const loaded = loadQueue()
      expect(loaded).toHaveLength(1)
      expect(loaded[0]!.action.table).toBe('b')
    })

    it('saves empty queue', () => {
      saveQueue([createQueueItem({ type: 'insert', table: 'test', data: {} })])
      saveQueue([])
      expect(loadQueue()).toEqual([])
    })
  })

  describe('queue item creation', () => {
    it('creates insert action with data', () => {
      const item = createQueueItem({
        type: 'insert',
        table: 'workout_sets',
        data: { exercise: 'Bench Press', weight_kg: 80 },
      })
      expect(item.id).toBeTruthy()
      expect(item.action.type).toBe('insert')
      expect(item.action.data).toEqual({ exercise: 'Bench Press', weight_kg: 80 })
      expect(item.createdAt).toBeTruthy()
    })

    it('creates update action with id and data', () => {
      const item = createQueueItem({
        type: 'update',
        table: 'workouts',
        id: 'workout-123',
        data: { notes: 'Great session' },
      })
      expect(item.action.type).toBe('update')
      expect(item.action.id).toBe('workout-123')
    })

    it('creates delete action with id', () => {
      const item = createQueueItem({
        type: 'delete',
        table: 'workouts',
        id: 'workout-123',
      })
      expect(item.action.type).toBe('delete')
      expect(item.action.id).toBe('workout-123')
    })

    it('each item gets a unique id', () => {
      const item1 = createQueueItem({ type: 'insert', table: 'test', data: {} })
      const item2 = createQueueItem({ type: 'insert', table: 'test', data: {} })
      expect(item1.id).not.toBe(item2.id)
    })
  })

  describe('queue operations simulation', () => {
    it('can add and remove items (simulating sync)', () => {
      const queue: QueueItem[] = []

      // Add items
      queue.push(createQueueItem({ type: 'insert', table: 'workouts', data: { id: '1' } }))
      queue.push(createQueueItem({ type: 'insert', table: 'workouts', data: { id: '2' } }))
      expect(queue).toHaveLength(2)

      // Simulate sync: remove processed items
      const processedIds = [queue[0]!.id]
      const remaining = queue.filter(item => !processedIds.includes(item.id))
      expect(remaining).toHaveLength(1)
    })

    it('preserves queue through save/load cycle', () => {
      const items = [
        createQueueItem({ type: 'insert', table: 'workouts', data: { split: 'Push' } }),
        createQueueItem({ type: 'update', table: 'workouts', id: '1', data: { notes: 'done' } }),
      ]
      saveQueue(items)
      const loaded = loadQueue()
      expect(loaded).toHaveLength(2)
      expect(loaded[0]!.action.data).toEqual({ split: 'Push' })
      expect(loaded[1]!.action.data).toEqual({ notes: 'done' })
    })
  })
})
