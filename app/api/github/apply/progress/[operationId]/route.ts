/**
 * GitHub Apply Progress Tracking API Endpoint
 * GET /api/github/apply/progress/[operationId] - Streams progress updates via Server-Sent Events
 * 
 * This endpoint:
 * 1. Validates the operation ID
 * 2. Retrieves the orchestrator instance from the registry
 * 3. Subscribes to progress events
 * 4. Streams updates to the client via SSE
 * 5. Handles client disconnect and cleanup
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */

import { NextRequest } from 'next/server'
import { getOrchestrator, getCompletedOperation } from '@/lib/github/orchestrator-registry'
import type { ApplyProgress } from '@/lib/github/types'

/**
 * GET handler for progress tracking via Server-Sent Events
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { operationId: string } }
) {
  const { operationId } = params

  console.log(`[Progress API] Client connecting for operation ${operationId}`)

  // Validate operation ID
  if (!operationId || typeof operationId !== 'string') {
    return Response.json(
      {
        error: 'Invalid operation ID',
        message: 'Operation ID must be a valid string',
      },
      { status: 400 }
    )
  }

  // Get orchestrator instance from registry
  const orchestrator = getOrchestrator(operationId)

  // If orchestrator is not active, check if operation completed
  if (!orchestrator) {
    const completed = getCompletedOperation(operationId)
    
    if (completed) {
      console.log(`[Progress API] Returning completed operation ${operationId}`)
      
      // Return the final state as SSE stream with immediate completion
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        start(controller) {
          const finalMessage = {
            operationId: completed.operationId,
            step: completed.status === 'completed' ? 'complete' : 'error',
            message: completed.status === 'completed' 
              ? 'Migration applied successfully' 
              : completed.error || 'Operation failed',
            percentage: 100,
            currentBatch: 0,
            totalBatches: 0,
            branch: completed.branch,
            prUrl: completed.prUrl,
            prNumber: completed.prNumber,
            timestamp: new Date(completed.completedAt).toISOString(),
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalMessage)}\n\n`))
          controller.close()
        }
      })
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      })
    }
    
    console.warn(`[Progress API] Operation not found ${operationId}`)
    return Response.json(
      {
        error: 'Operation not found',
        message: 'The specified operation does not exist or has expired. Operations expire after 15 minutes.',
      },
      { status: 404 }
    )
  }

  // Create a readable stream for Server-Sent Events
  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    start(controller) {
      console.log(`[Progress API] Starting SSE stream for operation ${operationId}`)

      // Progress callback that sends SSE messages (Requirements 5.1, 5.2, 5.3)
      const progressCallback = (progress: ApplyProgress) => {
        if (isClosed) {
          return
        }

        try {
          // Format progress data for SSE
          const data = JSON.stringify({
            operationId: progress.operationId,
            step: progress.step,
            message: progress.message,
            percentage: progress.percentage,
            currentBatch: progress.currentBatch,
            totalBatches: progress.totalBatches,
            timestamp: progress.timestamp.toISOString(),
          })

          // Send SSE message
          const sseMessage = `data: ${data}\n\n`
          controller.enqueue(encoder.encode(sseMessage))

          console.log(
            `[Progress API] Sent progress update: ${progress.step} (${progress.percentage}%)`
          )

          // Close stream when operation is complete or errored (Requirement 5.5)
          if (progress.step === 'complete' || progress.step === 'error') {
            console.log(`[Progress API] Operation ${operationId} ${progress.step}, closing stream`)
            
            // Send final message and close
            setTimeout(() => {
              if (!isClosed) {
                isClosed = true
                orchestrator.stopTracking(operationId, progressCallback)
                controller.close()
              }
            }, 100) // Small delay to ensure message is sent
          }
        } catch (error) {
          console.error('[Progress API] Error sending progress update:', error)
          
          if (!isClosed) {
            isClosed = true
            orchestrator.stopTracking(operationId, progressCallback)
            controller.error(error)
          }
        }
      }

      // Subscribe to progress updates
      orchestrator.trackProgress(operationId, progressCallback)

      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        operationId,
        step: 'connected',
        message: 'Connected to progress stream',
        percentage: 0,
        timestamp: new Date().toISOString(),
      })}\n\n`
      
      controller.enqueue(encoder.encode(initialMessage))
      console.log(`[Progress API] Sent initial connection message`)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`[Progress API] Client disconnected from operation ${operationId}`)
        
        if (!isClosed) {
          isClosed = true
          orchestrator.stopTracking(operationId, progressCallback)
          controller.close()
        }
      })
    },

    cancel() {
      console.log(`[Progress API] Stream cancelled for operation ${operationId}`)
      isClosed = true
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
