/**
 * Migration Result API Endpoint
 * GET /api/migration/result/[jobId] - Returns transformation results for a migration job
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Retrieves the migration job by ID
 * 3. Returns transformation results with diffs and metadata
 * 4. Includes summary statistics
 * 
 * Requirements: 8.1, 8.2, 9.1
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getMigrationOrchestrator } from '@/lib/migration/migration-orchestrator'

/**
 * GET handler for migration results
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to view migration results.' },
        { status: 401 }
      )
    }

    const { jobId } = params

    // Validate job ID
    if (!jobId) {
      return Response.json(
        { error: 'Job ID is required' },
        { status: 400 }
      )
    }

    // Step 2: Retrieve migration job
    const orchestrator = getMigrationOrchestrator()
    const job = orchestrator.getJob(jobId)

    if (!job) {
      return Response.json(
        { error: `Migration job ${jobId} not found` },
        { status: 404 }
      )
    }

    // Step 3: Check if job is complete
    if (job.status === 'pending' || job.status === 'running' || job.status === 'paused') {
      return Response.json(
        {
          error: 'Migration job is not complete',
          status: job.status,
          progress: job.progress,
          message: 'Job is still in progress. Use /api/migration/progress/{jobId} to track progress.',
        },
        { status: 202 } // 202 Accepted - still processing
      )
    }

    // Step 4: Return results
    if (job.status === 'failed') {
      return Response.json(
        {
          jobId: job.id,
          status: job.status,
          error: job.error?.message || 'Migration failed',
          repository: {
            owner: job.repository.owner,
            name: job.repository.name,
          },
          startedAt: job.startedAt.toISOString(),
          completedAt: job.completedAt?.toISOString(),
        },
        { status: 200 }
      )
    }

    // Job completed successfully
    if (!job.result) {
      return Response.json(
        { error: 'Migration result not available' },
        { status: 500 }
      )
    }

    // Convert Map to object for JSON serialization
    const transformations: Record<string, any> = {}
    for (const [filePath, result] of job.result.transformations) {
      transformations[filePath] = {
        code: result.code,
        filePath: result.filePath,
        newFilePath: result.newFilePath,
        metadata: result.metadata,
        diff: result.diff,
        confidence: result.confidence,
        requiresReview: result.requiresReview,
        warnings: result.warnings,
      }
    }

    const errors: Record<string, string> = {}
    for (const [filePath, error] of job.result.errors) {
      errors[filePath] = error.message
    }

    return Response.json({
      jobId: job.id,
      status: job.status,
      repository: {
        owner: job.repository.owner,
        name: job.repository.name,
      },
      result: {
        status: job.result.status,
        transformations,
        errors,
        summary: job.result.summary,
      },
      startedAt: job.startedAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    })

  } catch (error) {
    console.error('Error in migration result API:', error)

    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
