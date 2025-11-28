import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ProgressEmitter, type ProgressEvent } from '@/lib/sse/progress-emitter'

describe('ProgressEmitter', () => {
  let emitter: ProgressEmitter

  beforeEach(() => {
    emitter = new ProgressEmitter()
  })

  afterEach(() => {
    emitter.clear()
  })

  describe('subscribe', () => {
    it('should allow subscribing to job events', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      const unsubscribe = emitter.subscribe(jobId, subscriber)

      expect(typeof unsubscribe).toBe('function')
      expect(emitter.getSubscriberCount(jobId)).toBe(1)
    })

    it('should support multiple subscribers for the same job', () => {
      const jobId = 'test-job-1'
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      emitter.subscribe(jobId, subscriber1)
      emitter.subscribe(jobId, subscriber2)

      expect(emitter.getSubscriberCount(jobId)).toBe(2)
    })

    it('should send buffered events to late subscribers', () => {
      const jobId = 'test-job-1'
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      // First subscriber receives events
      emitter.subscribe(jobId, subscriber1)
      emitter.emit(jobId, 'Event 1')
      emitter.emit(jobId, 'Event 2')

      expect(subscriber1).toHaveBeenCalledTimes(2)

      // Late subscriber should receive buffered events
      emitter.subscribe(jobId, subscriber2)

      expect(subscriber2).toHaveBeenCalledTimes(2)
      expect(subscriber2).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'progress',
        message: 'Event 1'
      }))
      expect(subscriber2).toHaveBeenNthCalledWith(2, expect.objectContaining({
        type: 'progress',
        message: 'Event 2'
      }))
    })

    it('should return unsubscribe function that removes subscriber', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      const unsubscribe = emitter.subscribe(jobId, subscriber)
      expect(emitter.getSubscriberCount(jobId)).toBe(1)

      unsubscribe()
      expect(emitter.getSubscriberCount(jobId)).toBe(0)
    })
  })

  describe('emit', () => {
    it('should emit progress events to all subscribers', () => {
      const jobId = 'test-job-1'
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      emitter.subscribe(jobId, subscriber1)
      emitter.subscribe(jobId, subscriber2)

      emitter.emit(jobId, 'Processing file 1')

      expect(subscriber1).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress',
          jobId,
          message: 'Processing file 1',
          timestamp: expect.any(Date)
        })
      )
      expect(subscriber2).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress',
          jobId,
          message: 'Processing file 1'
        })
      )
    })

    it('should include optional data in events', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      emitter.subscribe(jobId, subscriber)

      const data = { filesProcessed: 5, totalFiles: 10 }
      emitter.emit(jobId, 'Progress update', data)

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress',
          message: 'Progress update',
          data
        })
      )
    })

    it('should buffer events even without subscribers', () => {
      const jobId = 'test-job-1'

      emitter.emit(jobId, 'Event 1')
      emitter.emit(jobId, 'Event 2')

      const buffered = emitter.getBufferedEvents(jobId)
      expect(buffered).toHaveLength(2)
      expect(buffered[0].message).toBe('Event 1')
      expect(buffered[1].message).toBe('Event 2')
    })

    it('should handle subscriber errors gracefully', () => {
      const jobId = 'test-job-1'
      const errorSubscriber = vi.fn(() => {
        throw new Error('Subscriber error')
      })
      const normalSubscriber = vi.fn()

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      emitter.subscribe(jobId, errorSubscriber)
      emitter.subscribe(jobId, normalSubscriber)

      emitter.emit(jobId, 'Test message')

      expect(errorSubscriber).toHaveBeenCalled()
      expect(normalSubscriber).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('complete', () => {
    it('should emit completion event', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      emitter.subscribe(jobId, subscriber)

      const summary = { filesChanged: 10, linesAdded: 100 }
      emitter.complete(jobId, 'Transformation complete', summary)

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'complete',
          jobId,
          message: 'Transformation complete',
          data: summary
        })
      )
    })

    it('should mark job as completed', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      emitter.subscribe(jobId, subscriber)
      expect(emitter.isCompleted(jobId)).toBe(false)

      emitter.complete(jobId, 'Done')
      expect(emitter.isCompleted(jobId)).toBe(true)
    })
  })

  describe('error', () => {
    it('should emit error event', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      emitter.subscribe(jobId, subscriber)

      emitter.error(jobId, 'Transformation failed')

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          jobId,
          message: 'Transformation failed'
        })
      )
    })

    it('should include error details in event', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      emitter.subscribe(jobId, subscriber)

      const error = new Error('Test error')
      emitter.error(jobId, 'Transformation failed', error)

      expect(subscriber).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: 'Transformation failed',
          data: expect.objectContaining({
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String)
          })
        })
      )
    })

    it('should mark job as completed', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      emitter.subscribe(jobId, subscriber)
      expect(emitter.isCompleted(jobId)).toBe(false)

      emitter.error(jobId, 'Failed')
      expect(emitter.isCompleted(jobId)).toBe(true)
    })
  })

  describe('event buffering', () => {
    it('should buffer events up to max size', () => {
      const jobId = 'test-job-1'

      // Emit more than max buffer size (100)
      for (let i = 0; i < 150; i++) {
        emitter.emit(jobId, `Event ${i}`)
      }

      const buffered = emitter.getBufferedEvents(jobId)
      expect(buffered.length).toBeLessThanOrEqual(100)
      
      // Should have the most recent events
      expect(buffered[buffered.length - 1].message).toBe('Event 149')
    })

    it('should provide buffered events to late subscribers', () => {
      const jobId = 'test-job-1'

      emitter.emit(jobId, 'Event 1')
      emitter.emit(jobId, 'Event 2')
      emitter.emit(jobId, 'Event 3')

      const lateSubscriber = vi.fn()
      emitter.subscribe(jobId, lateSubscriber)

      expect(lateSubscriber).toHaveBeenCalledTimes(3)
    })
  })

  describe('cleanup', () => {
    it('should schedule cleanup after completion with no subscribers', async () => {
      const jobId = 'test-job-1'

      emitter.emit(jobId, 'Event 1')
      emitter.complete(jobId, 'Done')

      expect(emitter.isCompleted(jobId)).toBe(true)

      // Note: Actual cleanup happens after 5 minutes, so we just verify the state
      const stats = emitter.getStats()
      expect(stats.completedJobs).toBe(1)
    })

    it('should not cleanup if subscribers are still active', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      emitter.subscribe(jobId, subscriber)
      emitter.complete(jobId, 'Done')

      expect(emitter.isCompleted(jobId)).toBe(true)
      expect(emitter.getSubscriberCount(jobId)).toBe(1)
    })
  })

  describe('getStats', () => {
    it('should return statistics about active jobs', () => {
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      emitter.subscribe('job-1', subscriber1)
      emitter.subscribe('job-2', subscriber2)
      emitter.subscribe('job-2', vi.fn())

      emitter.emit('job-1', 'Progress')
      emitter.complete('job-2', 'Done')

      const stats = emitter.getStats()

      expect(stats.totalJobs).toBe(2)
      expect(stats.activeJobs).toBe(1)
      expect(stats.completedJobs).toBe(1)
      expect(stats.totalSubscribers).toBe(3)
    })

    it('should return zero stats for empty emitter', () => {
      const stats = emitter.getStats()

      expect(stats.totalJobs).toBe(0)
      expect(stats.activeJobs).toBe(0)
      expect(stats.completedJobs).toBe(0)
      expect(stats.totalSubscribers).toBe(0)
    })
  })

  describe('clear', () => {
    it('should clear all subscriptions and buffers', () => {
      const subscriber = vi.fn()

      emitter.subscribe('job-1', subscriber)
      emitter.subscribe('job-2', subscriber)
      emitter.emit('job-1', 'Event')

      expect(emitter.getStats().totalJobs).toBe(2)

      emitter.clear()

      expect(emitter.getStats().totalJobs).toBe(0)
      expect(emitter.getSubscriberCount('job-1')).toBe(0)
      expect(emitter.getBufferedEvents('job-1')).toHaveLength(0)
    })
  })

  describe('multiple jobs', () => {
    it('should handle multiple independent jobs', () => {
      const subscriber1 = vi.fn()
      const subscriber2 = vi.fn()

      emitter.subscribe('job-1', subscriber1)
      emitter.subscribe('job-2', subscriber2)

      emitter.emit('job-1', 'Job 1 progress')
      emitter.emit('job-2', 'Job 2 progress')

      expect(subscriber1).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-1',
          message: 'Job 1 progress'
        })
      )
      expect(subscriber2).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-2',
          message: 'Job 2 progress'
        })
      )

      // Verify isolation
      expect(subscriber1).toHaveBeenCalledTimes(1)
      expect(subscriber2).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('should handle unsubscribe of non-existent subscriber', () => {
      const jobId = 'test-job-1'
      const subscriber = vi.fn()

      const unsubscribe = emitter.subscribe(jobId, subscriber)
      unsubscribe()
      unsubscribe() // Call again

      expect(emitter.getSubscriberCount(jobId)).toBe(0)
    })

    it('should handle getting stats for non-existent job', () => {
      expect(emitter.getSubscriberCount('non-existent')).toBe(0)
      expect(emitter.isCompleted('non-existent')).toBe(false)
      expect(emitter.getBufferedEvents('non-existent')).toHaveLength(0)
    })

    it('should handle emitting to job with no subscribers', () => {
      const jobId = 'test-job-1'

      expect(() => {
        emitter.emit(jobId, 'Message')
        emitter.complete(jobId, 'Done')
        emitter.error(jobId, 'Error')
      }).not.toThrow()
    })
  })
})
