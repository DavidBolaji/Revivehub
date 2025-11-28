/**
 * Server-Sent Events (SSE) Streaming Endpoint
 * GET /api/transform/stream/[jobId] - Streams real-time transformation progress
 * 
 * This endpoint:
 * 1. Establishes an SSE connection for a specific job ID
 * 2. Subscribes to ProgressEmitter for real-time updates
 * 3. Streams progress, complete, and error events to the client
 * 4. Handles client disconnects and cleanup
 * 5. Implements connection timeout handling
 * 
 * Requirements: 19.1, 19.6, 19.7
 */

import { NextRequest } from 'next/server'
import { progressEmitter } from '@/lib/sse/progress-emitter'
import type { ProgressEvent } from '@/lib/sse/progress-emitter'

// Connection timeout: 30 minutes (transformations can take time)
const CONNECTION_TIMEOUT_MS = 30 * 60 * 1000

// Heartbeat interval: Send keepalive every 15 seconds
const HEARTBEAT_INTERVAL_MS = 15 * 1000

/**
 * GET handler for SSE streaming
 * 
 * Establishes a Server-Sent Events connection and streams transformation
 * progress updates in real-time. The connection remains open until the
 * transformation completes, fails, or times out.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  // Validate job ID format
  if (!jobId || !jobId.startsWith('tx_')) {
    return Response.json(
      { error: 'Invalid job ID format' },
      { status: 400 }
    )
  }

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder()
  let timeoutId: NodeJS.Timeout | null = null
  let heartbeatId: NodeJS.Timeout | null = null
  let unsubscribe: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Helper function to send SSE message
      const sendSSE = (event: ProgressEvent) => {
        try {
          console.log(`[SSE] Sending event to client for job ${jobId}:`, event.type, event.message)
          
          // Format as SSE: event type, data, and double newline
          const eventType = event.type
          const data = JSON.stringify({
            jobId: event.jobId,
            message: event.message,
            timestamp: event.timestamp,
            data: event.data,
          })

          const sseMessage = `event: ${eventType}\ndata: ${data}\n\n`
          controller.enqueue(encoder.encode(sseMessage))

          // Close connection on complete or error events
          if (event.type === 'complete' || event.type === 'error') {
            console.log(`[SSE] Closing connection for job ${jobId} after ${event.type} event`)
            cleanup()
            controller.close()
          }
        } catch (error) {
          console.error(`[SSE] Error sending SSE for job ${jobId}:`, error)
          cleanup()
          controller.close()
        }
      }

      // Send initial connection message
      const connectionMessage: ProgressEvent = {
        type: 'progress',
        jobId,
        message: 'Connected to transformation stream',
        timestamp: new Date(),
      }
      sendSSE(connectionMessage)

      // Subscribe to progress events
      console.log(`[SSE] Subscribing to progress events for job ${jobId} using progressEmitter instance ID:`, (progressEmitter as any).instanceId)
      unsubscribe = progressEmitter.subscribe(jobId, (event) => {
        console.log(`[SSE] Received event from emitter for job ${jobId}:`, event.type)
        sendSSE(event)
      })
      console.log(`[SSE] Subscription active for job ${jobId}`)

      // Set up connection timeout
      timeoutId = setTimeout(() => {
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
        sendSSE(timeoutEvent)
      }, CONNECTION_TIMEOUT_MS)

      // Set up heartbeat to keep connection alive
      heartbeatId = setInterval(() => {
        try {
          // Send comment as keepalive (comments are ignored by SSE clients)
          const heartbeat = `: heartbeat ${Date.now()}\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        } catch (error) {
          // Connection closed, cleanup
          cleanup()
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Handle client disconnect via AbortSignal
      request.signal.addEventListener('abort', () => {
        console.log(`Client disconnected from job ${jobId}`)
        cleanup()
        controller.close()
      })
    },

    cancel() {
      // Called when the stream is cancelled (client disconnect)
      console.log(`Stream cancelled for job ${jobId}`)
      cleanup()
    },
  })

  // Cleanup function to clear timers and unsubscribe
  function cleanup() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    if (heartbeatId) {
      clearInterval(heartbeatId)
      heartbeatId = null
    }

    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  // Return SSE response with appropriate headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
