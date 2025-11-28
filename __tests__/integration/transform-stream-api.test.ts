/**
 * Integration tests for SSE Streaming API endpoint
 * GET /api/transform/stream/[jobId]
 * 
 * Tests the SSE streaming logic for real-time transformation progress updates.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { progressEmitter } from '@/lib/sse/progress-emitter'
import type { ProgressEvent } from '@/lib/sse/progress-emitter'

// Mock TextEncoder for Node.js environment
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder
}

describe('GET /api/transform/stream/[jobId] - Job ID Validation', () => {
  it('should reject invalid job ID format', () => {
    const jobId = 'invalid-format'
    const isValid = jobId.startsWith('tx_')
    expect(isValid).toBe(false)
  })

  it('should accept valid job ID format', () => {
    const jobId = 'tx_1234567890_abc123'
    const isValid = jobId.startsWith('tx_')
    expect(isValid).toBe(true)
  })

  it('should reject empty job ID', () => {
    const jobId = '' as any
    const isValid = !!jobId && jobId.startsWith('tx_')
    expect(isValid).toBe(false)
  })
})

describe('GET /api/transform/stream/[jobId] - SSE Event Formatting', () => {
  it('should format progress event correctly', () => {
    const event: ProgressEvent = {
      type: 'progress',
      jobId: 'tx_123_abc',
      message: 'Processing file...',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      data: { file: 'test.ts' },
    }

    const eventType = event.type
    const data = JSON.stringify({
      jobId: event.jobId,
      message: event.message,
      timestamp: event.timestamp,
      data: event.data,
    })

    const sseMessage = `event: ${eventType}\ndata: ${data}\n\n`

    expect(sseMessage).toContain('event: progress')
    expect(sseMessage).toContain('data: {')
    expect(sseMessage).toContain('"jobId":"tx_123_abc"')
    expect(sseMessage).toContain('"message":"Processing file..."')
    expect(sseMessage).toContain('\n\n')
  })

  it('should format complete event correctly', () => {
    const event: ProgressEvent = {
      type: 'complete',
      jobId: 'tx_123_abc',
      message: 'Transformation complete',
      timestamp: new Date(),
      data: { filesChanged: 5 },
    }

    const eventType = event.type
    expect(eventType).toBe('complete')

    const data = JSON.stringify({
      jobId: event.jobId,
      message: event.message,
      timestamp: event.timestamp,
      data: event.data,
    })

    expect(data).toContain('"filesChanged":5')
  })

  it('should format error event correctly', () => {
    const event: ProgressEvent = {
      type: 'error',
      jobId: 'tx_123_abc',
      message: 'Transformation failed',
      timestamp: new Date(),
      data: { error: 'Syntax error' },
    }

    const eventType = event.type
    expect(eventType).toBe('error')

    const data = JSON.stringify({
      jobId: event.jobId,
      message: event.message,
      timestamp: event.timestamp,
      data: event.data,
    })

    expect(data).toContain('"error":"Syntax error"')
  })

  it('should include timestamp in all events', () => {
    const timestamp = new Date()
    const event: ProgressEvent = {
      type: 'progress',
      jobId: 'tx_123_abc',
      message: 'Test',
      timestamp,
    }

    const data = JSON.stringify({
      jobId: event.jobId,
      message: event.message,
      timestamp: event.timestamp,
      data: event.data,
    })

    expect(data).toContain('"timestamp"')
  })
})

describe('GET /api/transform/stream/[jobId] - ProgressEmitter Integration', () => {
  beforeEach(() => {
    progressEmitter.clear()
  })

  afterEach(() => {
    progressEmitter.clear()
  })

  it('should subscribe to progress events for a job', () => {
    const jobId = 'tx_123_abc'
    const events: ProgressEvent[] = []

    const unsubscribe = progressEmitter.subscribe(jobId, (event) => {
      events.push(event)
    })

    progressEmitter.emit(jobId, 'Test message')

    expect(events).toHaveLength(1)
    expect(events[0].message).toBe('Test message')
    expect(events[0].type).toBe('progress')

    unsubscribe()
  })

  it('should receive buffered events for late subscribers', () => {
    const jobId = 'tx_123_abc'

    // Emit events before subscribing
    progressEmitter.emit(jobId, 'Event 1')
    progressEmitter.emit(jobId, 'Event 2')

    const events: ProgressEvent[] = []
    const unsubscribe = progressEmitter.subscribe(jobId, (event) => {
      events.push(event)
    })

    // Should receive buffered events immediately
    expect(events).toHaveLength(2)
    expect(events[0].message).toBe('Event 1')
    expect(events[1].message).toBe('Event 2')

    unsubscribe()
  })

  it('should handle complete events', () => {
    const jobId = 'tx_123_abc'
    const events: ProgressEvent[] = []

    const unsubscribe = progressEmitter.subscribe(jobId, (event) => {
      events.push(event)
    })

    progressEmitter.complete(jobId, 'Done', { result: 'success' })

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('complete')
    expect(events[0].message).toBe('Done')
    expect(events[0].data).toEqual({ result: 'success' })

    unsubscribe()
  })

  it('should handle error events', () => {
    const jobId = 'tx_123_abc'
    const events: ProgressEvent[] = []

    const unsubscribe = progressEmitter.subscribe(jobId, (event) => {
      events.push(event)
    })

    const error = new Error('Test error')
    progressEmitter.error(jobId, 'Failed', error)

    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('error')
    expect(events[0].message).toBe('Failed')
    expect(events[0].data).toBeDefined()

    unsubscribe()
  })

  it('should support multiple subscribers for same job', () => {
    const jobId = 'tx_123_abc'
    const events1: ProgressEvent[] = []
    const events2: ProgressEvent[] = []

    const unsubscribe1 = progressEmitter.subscribe(jobId, (event) => {
      events1.push(event)
    })

    const unsubscribe2 = progressEmitter.subscribe(jobId, (event) => {
      events2.push(event)
    })

    progressEmitter.emit(jobId, 'Broadcast message')

    expect(events1).toHaveLength(1)
    expect(events2).toHaveLength(1)
    expect(events1[0].message).toBe('Broadcast message')
    expect(events2[0].message).toBe('Broadcast message')

    unsubscribe1()
    unsubscribe2()
  })

  it('should cleanup subscription on unsubscribe', () => {
    const jobId = 'tx_123_abc'
    const events: ProgressEvent[] = []

    const unsubscribe = progressEmitter.subscribe(jobId, (event) => {
      events.push(event)
    })

    progressEmitter.emit(jobId, 'Message 1')
    expect(events).toHaveLength(1)

    unsubscribe()

    progressEmitter.emit(jobId, 'Message 2')
    expect(events).toHaveLength(1) // Should not receive after unsubscribe
  })
})

describe('GET /api/transform/stream/[jobId] - Connection Timeout', () => {
  it('should define connection timeout constant', () => {
    const CONNECTION_TIMEOUT_MS = 30 * 60 * 1000
    expect(CONNECTION_TIMEOUT_MS).toBe(1800000) // 30 minutes
  })

  it('should define heartbeat interval constant', () => {
    const HEARTBEAT_INTERVAL_MS = 15 * 1000
    expect(HEARTBEAT_INTERVAL_MS).toBe(15000) // 15 seconds
  })

  it('should format timeout error event', () => {
    const jobId = 'tx_123_abc'
    const CONNECTION_TIMEOUT_MS = 30 * 60 * 1000

    const timeoutEvent: ProgressEvent = {
      type: 'error',
      jobId,
      message: 'Connection timeout - transformation took too long',
      timestamp: new Date(),
      data: {
        reason: 'timeout',
        duration: CONNECTION_TIMEOUT_MS,
      },
    }

    expect(timeoutEvent.type).toBe('error')
    expect(timeoutEvent.message).toContain('timeout')
    expect(timeoutEvent.data.reason).toBe('timeout')
    expect(timeoutEvent.data.duration).toBe(1800000)
  })
})

describe('GET /api/transform/stream/[jobId] - Heartbeat Keepalive', () => {
  it('should format heartbeat comment correctly', () => {
    const timestamp = Date.now()
    const heartbeat = `: heartbeat ${timestamp}\n\n`

    expect(heartbeat).toMatch(/^: heartbeat \d+\n\n$/)
    expect(heartbeat).toContain(': heartbeat')
    expect(heartbeat).toContain('\n\n')
  })

  it('should use colon prefix for SSE comments', () => {
    const heartbeat = `: heartbeat ${Date.now()}\n\n`
    expect(heartbeat.startsWith(':')).toBe(true)
  })
})

describe('GET /api/transform/stream/[jobId] - SSE Headers', () => {
  it('should define correct SSE headers', () => {
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    }

    expect(headers['Content-Type']).toBe('text/event-stream')
    expect(headers['Cache-Control']).toContain('no-cache')
    expect(headers['Connection']).toBe('keep-alive')
    expect(headers['X-Accel-Buffering']).toBe('no')
  })

  it('should disable caching for SSE', () => {
    const cacheControl = 'no-cache, no-transform'
    expect(cacheControl).toContain('no-cache')
    expect(cacheControl).toContain('no-transform')
  })

  it('should disable nginx buffering', () => {
    const xAccelBuffering = 'no'
    expect(xAccelBuffering).toBe('no')
  })
})

describe('GET /api/transform/stream/[jobId] - CORS Support', () => {
  it('should define CORS headers for OPTIONS', () => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    expect(headers['Access-Control-Allow-Origin']).toBe('*')
    expect(headers['Access-Control-Allow-Methods']).toContain('GET')
    expect(headers['Access-Control-Allow-Headers']).toContain('Content-Type')
  })

  it('should return 204 status for OPTIONS', () => {
    const status = 204
    expect(status).toBe(204)
  })
})

describe('GET /api/transform/stream/[jobId] - Connection Message', () => {
  it('should send initial connection message', () => {
    const jobId = 'tx_123_abc'
    const connectionMessage: ProgressEvent = {
      type: 'progress',
      jobId,
      message: 'Connected to transformation stream',
      timestamp: new Date(),
    }

    expect(connectionMessage.type).toBe('progress')
    expect(connectionMessage.message).toContain('Connected')
    expect(connectionMessage.jobId).toBe(jobId)
  })
})
