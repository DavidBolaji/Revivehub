/**
 * ProgressEmitter for Server-Sent Events
 * 
 * Manages real-time progress updates for transformation jobs using Server-Sent Events.
 * Supports multiple subscribers per job, event buffering for late subscribers,
 * and automatic cleanup.
 */

export interface ProgressEvent {
  type: 'progress' | 'complete' | 'error'
  jobId: string
  message: string
  timestamp: Date
  data?: any
}

export interface ProgressSubscriber {
  (event: ProgressEvent): void
}

interface JobSubscription {
  subscribers: Set<ProgressSubscriber>
  eventBuffer: ProgressEvent[]
  completed: boolean
}

export class ProgressEmitter {
  private subscriptions: Map<string, JobSubscription> = new Map()
  private readonly maxBufferSize = 100
  private readonly bufferRetentionMs = 5 * 60 * 1000 // 5 minutes
  public readonly instanceId = Math.random().toString(36).substring(2, 11)

  /**
   * Subscribe to progress events for a specific job
   * 
   * @param jobId - Unique job identifier
   * @param subscriber - Callback function to receive events
   * @returns Unsubscribe function
   */
  subscribe(jobId: string, subscriber: ProgressSubscriber): () => void {
    console.log(`[EMITTER-${this.instanceId}] subscribe() called for job ${jobId}`)
    
    // Get or create subscription for this job
    let subscription = this.subscriptions.get(jobId)
    
    console.log(`[EMITTER-${this.instanceId}] Existing subscription:`, subscription ? `${subscription.subscribers.size} subscribers, ${subscription.eventBuffer.length} buffered events` : 'none')
    
    if (!subscription) {
      console.log(`[EMITTER] Creating new subscription for job ${jobId}`)
      subscription = {
        subscribers: new Set(),
        eventBuffer: [],
        completed: false
      }
      this.subscriptions.set(jobId, subscription)
    }

    // Add subscriber
    subscription.subscribers.add(subscriber)
    console.log(`[EMITTER] Subscriber added, total subscribers: ${subscription.subscribers.size}`)

    // Send buffered events to late subscriber
    if (subscription.eventBuffer.length > 0) {
      console.log(`[EMITTER] Sending ${subscription.eventBuffer.length} buffered events to new subscriber`)
      subscription.eventBuffer.forEach(event => {
        subscriber(event)
      })
    }

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(jobId)
      if (sub) {
        sub.subscribers.delete(subscriber)
        
        // Clean up if no more subscribers and job is completed
        if (sub.subscribers.size === 0 && sub.completed) {
          this.scheduleCleanup(jobId)
        }
      }
    }
  }

  /**
   * Emit a progress event to all subscribers
   * 
   * @param jobId - Unique job identifier
   * @param message - Progress message
   * @param data - Optional additional data
   */
  emit(jobId: string, message: string, data?: any): void {
    const event: ProgressEvent = {
      type: 'progress',
      jobId,
      message,
      timestamp: new Date(),
      data
    }

    console.log(`[EMITTER-${this.instanceId}] Emitting progress event for job ${jobId}:`, message)
    this.sendEvent(jobId, event)
  }

  /**
   * Emit a completion event
   * 
   * @param jobId - Unique job identifier
   * @param message - Completion message
   * @param data - Optional result data
   */
  complete(jobId: string, message: string, data?: any): void {
    const event: ProgressEvent = {
      type: 'complete',
      jobId,
      message,
      timestamp: new Date(),
      data
    }

    this.sendEvent(jobId, event)
    this.markCompleted(jobId)
  }

  /**
   * Emit an error event
   * 
   * @param jobId - Unique job identifier
   * @param message - Error message
   * @param error - Optional error object
   */
  error(jobId: string, message: string, error?: any): void {
    const event: ProgressEvent = {
      type: 'error',
      jobId,
      message,
      timestamp: new Date(),
      data: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }

    this.sendEvent(jobId, event)
    this.markCompleted(jobId)
  }

  /**
   * Send event to all subscribers and add to buffer
   */
  private sendEvent(jobId: string, event: ProgressEvent): void {
    const subscription = this.subscriptions.get(jobId)
    
    console.log(`[EMITTER-${this.instanceId}] sendEvent for job ${jobId}, subscribers: ${subscription?.subscribers.size || 0}`)
    
    if (!subscription) {
      // Create subscription if it doesn't exist (for buffering)
      console.log(`[EMITTER] No subscription found for job ${jobId}, creating one for buffering`)
      this.subscriptions.set(jobId, {
        subscribers: new Set(),
        eventBuffer: [event],
        completed: event.type === 'complete' || event.type === 'error'
      })
      return
    }

    // Add to buffer (with size limit)
    subscription.eventBuffer.push(event)
    if (subscription.eventBuffer.length > this.maxBufferSize) {
      subscription.eventBuffer.shift() // Remove oldest event
    }

    console.log(`[EMITTER] Sending to ${subscription.subscribers.size} subscribers`)
    
    // Send to all subscribers
    subscription.subscribers.forEach(subscriber => {
      try {
        subscriber(event)
      } catch (error) {
        console.error(`[EMITTER] Error in subscriber for job ${jobId}:`, error)
      }
    })
  }

  /**
   * Mark a job as completed
   */
  private markCompleted(jobId: string): void {
    const subscription = this.subscriptions.get(jobId)
    if (subscription) {
      subscription.completed = true
      
      // Schedule cleanup if no active subscribers
      if (subscription.subscribers.size === 0) {
        this.scheduleCleanup(jobId)
      }
    }
  }

  /**
   * Schedule cleanup of completed job data
   */
  private scheduleCleanup(jobId: string): void {
    setTimeout(() => {
      const subscription = this.subscriptions.get(jobId)
      
      // Only cleanup if still no subscribers and completed
      if (subscription && subscription.subscribers.size === 0 && subscription.completed) {
        this.subscriptions.delete(jobId)
      }
    }, this.bufferRetentionMs)
  }

  /**
   * Get the number of active subscribers for a job
   */
  getSubscriberCount(jobId: string): number {
    const subscription = this.subscriptions.get(jobId)
    return subscription ? subscription.subscribers.size : 0
  }

  /**
   * Check if a job has completed
   */
  isCompleted(jobId: string): boolean {
    const subscription = this.subscriptions.get(jobId)
    return subscription ? subscription.completed : false
  }

  /**
   * Get buffered events for a job
   */
  getBufferedEvents(jobId: string): ProgressEvent[] {
    const subscription = this.subscriptions.get(jobId)
    return subscription ? [...subscription.eventBuffer] : []
  }

  /**
   * Clear all subscriptions and buffers (for testing/cleanup)
   */
  clear(): void {
    this.subscriptions.clear()
  }

  /**
   * Get statistics about active jobs
   */
  getStats(): {
    totalJobs: number
    activeJobs: number
    completedJobs: number
    totalSubscribers: number
  } {
    let activeJobs = 0
    let completedJobs = 0
    let totalSubscribers = 0

    this.subscriptions.forEach(subscription => {
      if (subscription.completed) {
        completedJobs++
      } else {
        activeJobs++
      }
      totalSubscribers += subscription.subscribers.size
    })

    return {
      totalJobs: this.subscriptions.size,
      activeJobs,
      completedJobs,
      totalSubscribers
    }
  }
}

/**
 * Global singleton emitter that works across Next.js module boundaries
 */
function getGlobalProgressEmitter(): ProgressEmitter {
  const globalKey = '__GLOBAL_PROGRESS_EMITTER__'
  
  if (typeof globalThis !== 'undefined') {
    const globalAny = globalThis as any
    if (!globalAny[globalKey]) {
      globalAny[globalKey] = new ProgressEmitter()
      console.log(`[EMITTER] Created new global instance: ${globalAny[globalKey].instanceId}`)
    } else {
      console.log(`[EMITTER] Using existing global instance: ${globalAny[globalKey].instanceId}`)
    }
    return globalAny[globalKey]
  }
  
  // Fallback for environments without globalThis
  const globalAny = global as any
  if (!globalAny[globalKey]) {
    globalAny[globalKey] = new ProgressEmitter()
    console.log(`[EMITTER] Created new global instance (fallback): ${globalAny[globalKey].instanceId}`)
  } else {
    console.log(`[EMITTER] Using existing global instance (fallback): ${globalAny[globalKey].instanceId}`)
  }
  return globalAny[globalKey]
}

// Singleton instance for global use
export const progressEmitter = getGlobalProgressEmitter()
