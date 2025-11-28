/**
 * Migration Progress API Endpoint (Server-Sent Events)
 * GET /api/migration/progress/[jobId] - Streams real-time migration progress
 * 
 * This endpoint:
 * 1. Establishes an SSE connection for a specific migration job
 * 2. Subscribes to MigrationOrchestrator progress updates
 * 3. Streams progress, complete, and error events to the client
 * 4. Handles client disconnects and cleanup
 * 5. Implements connection timeout handling
 * 
 * Requirements: 7.2, 7.3
 */

import { NextRequest } from 'next/server'
import { getMigrationOrchestrator } from '@/lib/migration/migration-orchestrator'
import type { Phase3ProgressUpdate } from '@/types/migration'

// Connection timeout: 60 minutes (migrations can take time)
const CONNECTION_TIMEOUT_MS = 60 * 60 * 1000

// Heartbeat interval: Send keepalive every 15 seconds
const HEARTBEAT_INTERVAL_MS = 15 * 1000

/**
 * GET handler for SSE streaming
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  // Validate job ID format
  if (!jobId) {
    return Response.json(
      { error: 'Job ID is required' },
      { status: 400 }
    )
  }

  // Get orchestrator and verify job exists
  const orchestrator = getMigrationOrchestrator()
  const job = orchestrator.getJob(jobId)

  if (!job) {
    console.log(`[SSE] Job ${jobId} not found`)
    return Response.json(
      { error: `Migration job ${jobId} not found` },
      { status: 404 }
    )
  }

  console.log(`[SSE] Job ${jobId} found with status: ${job.status}`)

  // If job is already completed or failed, send immediate completion event
  if (job.status === 'completed' || job.status === 'failed') {
    console.log(`[SSE] Job ${jobId} already ${job.status}, sending immediate event`)
    
    const encoder = new TextEncoder()
    const eventType = job.status === 'completed' ? 'complete' : 'error'
    const eventData = job.status === 'completed' 
      ? {
          jobId,
          message: 'Migration completed successfully',
          timestamp: new Date().toISOString(),
          result: job.result,
        }
      : {
          jobId,
          message: job.error?.message || 'Migration failed',
          timestamp: new Date().toISOString(),
          error: job.error?.message,
        }
    
    const sseMessage = `event: ${eventType}\ndata: ${JSON.stringify(eventData)}\n\n`
    
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseMessage))
        controller.close()
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder()
  let timeoutId: NodeJS.Timeout | null = null
  let heartbeatId: NodeJS.Timeout | null = null

  const stream = new ReadableStream({
    start(controller) {
      // Helper function to send SSE message
      const sendSSE = (eventType: string, data: any) => {
        try {
          console.log(`[SSE] Sending ${eventType} event for job ${jobId}`)
          
          const sseMessage = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(sseMessage))

          // Close connection on complete or error events
          if (eventType === 'complete' || eventType === 'error') {
            console.log(`[SSE] Closing connection for job ${jobId} after ${eventType} event`)
            cleanup()
            controller.close()
          }
        } catch (error) {
          console.error(`[SSE] Error sending SSE for job ${jobId}:`, error)
          cleanup()
          controller.close()
        }
      }

      // Subscribe to progress updates BEFORE sending connected message
      // This ensures we don't miss any events
      console.log(`[SSE] Subscribing to progress updates for job ${jobId}`)
      
      const progressCallback = (update: Phase3ProgressUpdate) => {
        console.log(`[SSE] Received progress update for job ${jobId}:`, update.message)
        
        sendSSE('progress', {
          jobId: update.jobId,
          progress: update.progress,
          currentFile: update.currentFile,
          message: update.message,
          timestamp: update.timestamp.toISOString(),
        })

        // Check if job is complete
        const currentJob = orchestrator.getJob(jobId)
        if (currentJob?.status === 'completed') {
          sendSSE('complete', {
            jobId,
            message: 'Migration completed successfully',
            timestamp: new Date().toISOString(),
            result: currentJob.result,
          })
        } else if (currentJob?.status === 'failed') {
          sendSSE('error', {
            jobId,
            message: currentJob.error?.message || 'Migration failed',
            timestamp: new Date().toISOString(),
            error: currentJob.error?.message,
          })
        }
      }

      orchestrator.trackProgress(jobId, progressCallback)

      // Send initial connection message AFTER subscribing
      sendSSE('connected', {
        jobId,
        message: 'Connected to migration progress stream',
        timestamp: new Date().toISOString(),
        status: job.status,
        progress: job.progress,
      })

      // Set up connection timeout
      timeoutId = setTimeout(() => {
        sendSSE('error', {
          jobId,
          message: 'Connection timeout - migration took too long',
          timestamp: new Date().toISOString(),
          reason: 'timeout',
          duration: CONNECTION_TIMEOUT_MS,
        })
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
        console.log(`[SSE] Client disconnected from job ${jobId}`)
        cleanup()
        controller.close()
      })

      // Cleanup function
      function cleanup() {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }

        if (heartbeatId) {
          clearInterval(heartbeatId)
          heartbeatId = null
        }

        orchestrator.stopTrackingProgress(jobId, progressCallback)
      }
    },

    cancel() {
      console.log(`[SSE] Stream cancelled for job ${jobId}`)
    },
  })

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
