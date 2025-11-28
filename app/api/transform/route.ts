/**
 * Transformation API Endpoint
 * POST /api/transform - Initiates code transformation for selected tasks
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Validates the request payload
 * 3. Generates a unique job ID
 * 4. Starts transformation in background (non-blocking)
 * 5. Returns job ID immediately for progress tracking
 * 
 * Requirements: 3A.1, 12.4
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit, checkRateLimit } from '@/lib/github/octokit'
import { TransformationOrchestrator } from '@/lib/transformers/orchestrator'
import { GitHubAPIError } from '@/lib/github/errors'
import type { TransformationRequest, TransformationResponse } from '@/types/transformer'

// Rate limiting: Track requests per user
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10

/**
 * POST handler for transformation requests
 * 
 * Accepts a transformation request with repository info, selected task IDs,
 * migration plan, and options. Starts the transformation in the background
 * and returns a job ID for tracking progress via SSE.
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to transform code.' },
        { status: 401 }
      )
    }

    const userId = session.user?.id || session.user?.email || 'unknown'

    // Step 2: Rate limiting check
    const now = Date.now()
    const userLimit = requestCounts.get(userId)

    if (userLimit) {
      if (now < userLimit.resetAt) {
        if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
          return Response.json(
            {
              error: 'Rate limit exceeded',
              message: `Maximum ${MAX_REQUESTS_PER_WINDOW} transformation requests per minute. Please try again later.`,
              retryAfter: Math.ceil((userLimit.resetAt - now) / 1000),
            },
            { status: 429 }
          )
        }
        userLimit.count++
      } else {
        // Reset window
        userLimit.count = 1
        userLimit.resetAt = now + RATE_LIMIT_WINDOW_MS
      }
    } else {
      // First request from this user
      requestCounts.set(userId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      })
    }

    // Step 3: Parse and validate request body
    let body: TransformationRequest
    
    try {
      body = await request.json()
    } catch (error) {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.repository?.owner || !body.repository?.name) {
      return Response.json(
        { error: 'Missing required field: repository.owner and repository.name' },
        { status: 400 }
      )
    }

    if (!body.selectedTaskIds || !Array.isArray(body.selectedTaskIds)) {
      return Response.json(
        { error: 'Missing or invalid field: selectedTaskIds must be an array' },
        { status: 400 }
      )
    }

    if (body.selectedTaskIds.length === 0) {
      return Response.json(
        { error: 'No tasks selected. Please select at least one task to transform.' },
        { status: 400 }
      )
    }

    if (!body.migrationPlan) {
      return Response.json(
        { error: 'Missing required field: migrationPlan' },
        { status: 400 }
      )
    }

    // Validate task IDs exist in migration plan
    const allTaskIds = new Set<string>()
    for (const phase of body.migrationPlan.phases) {
      for (const task of phase.tasks) {
        allTaskIds.add(task.id)
      }
    }

    const invalidTaskIds = body.selectedTaskIds.filter(id => !allTaskIds.has(id))
    if (invalidTaskIds.length > 0) {
      return Response.json(
        {
          error: 'Invalid task IDs',
          message: `The following task IDs do not exist in the migration plan: ${invalidTaskIds.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Step 4: Check GitHub API rate limit
    const octokit = createOctokit(session.accessToken)
    
    try {
      const rateLimit = await checkRateLimit(octokit)
      
      if (rateLimit.core.remaining < 50) {
        return Response.json(
          {
            error: 'GitHub API rate limit low',
            message: `Only ${rateLimit.core.remaining} GitHub API requests remaining. Transformation requires at least 50. Resets at ${rateLimit.core.reset.toISOString()}`,
            rateLimit: rateLimit.core,
          },
          { status: 429 }
        )
      }
    } catch (error) {
      console.error('Error checking GitHub rate limit:', error)
      // Continue anyway - rate limit check is not critical
    }

    // Step 5: Generate unique job ID
    const jobId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Step 6: Start transformation in background (non-blocking)
    const orchestrator = new TransformationOrchestrator(octokit)
    
    console.log(`[TRANSFORM] Starting job ${jobId} with ${body.selectedTaskIds.length} tasks`)
    console.log(`[TRANSFORM] Repository: ${body.repository.owner}/${body.repository.name}`)
    console.log(`[TRANSFORM] Selected tasks:`, body.selectedTaskIds)
    
    // Don't await - run in background
    orchestrator
      .executeTransformations(
        jobId,
        {
          owner: body.repository.owner,
          name: body.repository.name,
          branch: body.repository.branch,
        },
        body.migrationPlan,
        new Set(body.selectedTaskIds),
        body.options || {}
      )
      .then(result => {
        console.log(`[TRANSFORM] Job ${jobId} completed successfully`)
        console.log(`[TRANSFORM] Files changed: ${result.summary.filesChanged}`)
      })
      .catch(error => {
        // Log error but don't throw - error will be sent via SSE
        console.error(`[TRANSFORM] Job ${jobId} failed:`, error)
        console.error(`[TRANSFORM] Error stack:`, error.stack)
      })

    // Step 7: Return job ID and status immediately
    const response: TransformationResponse = {
      jobId,
      status: 'processing',
      message: `Transformation started for ${body.selectedTaskIds.length} task(s). Connect to /api/transform/stream/${jobId} for real-time progress.`,
    }

    return Response.json(response, { status: 202 }) // 202 Accepted

  } catch (error) {
    console.error('Error in transformation API:', error)

    if (error instanceof GitHubAPIError) {
      return Response.json(
        {
          error: error.message,
          statusCode: error.statusCode,
          rateLimit: error.rateLimit,
        },
        { status: error.statusCode || 500 }
      )
    }

    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET handler - returns API documentation
 */
export async function GET() {
  return Response.json({
    endpoint: '/api/transform',
    method: 'POST',
    description: 'Initiates code transformation for selected tasks from a migration plan',
    authentication: 'Required - GitHub OAuth session',
    rateLimit: `${MAX_REQUESTS_PER_WINDOW} requests per minute`,
    requestBody: {
      repository: {
        owner: 'string (required)',
        name: 'string (required)',
        branch: 'string (optional, defaults to default branch)',
      },
      selectedTaskIds: 'string[] (required, at least one task ID)',
      migrationPlan: 'MigrationPlan (required)',
      options: {
        aggressive: 'boolean (optional)',
        skipTests: 'boolean (optional)',
        preserveFormatting: 'boolean (optional)',
        dryRun: 'boolean (optional)',
      },
    },
    response: {
      jobId: 'string - Unique job identifier for tracking',
      status: '"processing" | "complete" | "failed"',
      message: 'string - Human-readable status message',
    },
    progressTracking: 'Connect to /api/transform/stream/{jobId} for real-time updates via Server-Sent Events',
  })
}
