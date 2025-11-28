/**
 * Migration Rollback API Endpoint
 * POST /api/migration/rollback/[jobId] - Rolls back a migration job
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Retrieves the migration job by ID
 * 3. Executes rollback to restore original files
 * 4. Returns rollback results
 * 
 * Requirements: 12.3, 12.4
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getMigrationOrchestrator } from '@/lib/migration/migration-orchestrator'

/**
 * POST handler for migration rollback
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to rollback a migration.' },
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

    // Step 3: Execute rollback
    console.log(`[ROLLBACK] Rolling back migration job ${jobId}`)

    try {
      const rollbackResult = await orchestrator.rollbackMigration(jobId)

      // Convert errors Map to object for JSON serialization
      const errors: Record<string, string> = {}
      for (const [filePath, error] of rollbackResult.errors) {
        errors[filePath] = error.message
      }

      // Step 4: Return rollback results
      return Response.json({
        jobId,
        success: rollbackResult.success,
        restoredFiles: rollbackResult.restoredFiles,
        restoredCount: rollbackResult.restoredFiles.length,
        errors,
        errorCount: rollbackResult.errors.size,
        message: rollbackResult.success
          ? `Successfully rolled back ${rollbackResult.restoredFiles.length} files`
          : `Rollback completed with ${rollbackResult.errors.size} errors`,
      })

    } catch (error: any) {
      console.error(`[ROLLBACK] Failed to rollback job ${jobId}:`, error)

      // Handle specific error cases
      if (error.message.includes('not found')) {
        return Response.json(
          { error: error.message },
          { status: 404 }
        )
      }

      if (error.message.includes('No backups found')) {
        return Response.json(
          {
            error: 'Rollback not available',
            message: error.message,
            suggestion: 'Backups may not have been created or were already cleaned up',
          },
          { status: 400 }
        )
      }

      return Response.json(
        {
          error: 'Rollback failed',
          message: error.message,
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in migration rollback API:', error)

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
 * GET handler - returns rollback status
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { jobId } = params
    const orchestrator = getMigrationOrchestrator()
    const job = orchestrator.getJob(jobId)

    if (!job) {
      return Response.json(
        { error: `Migration job ${jobId} not found` },
        { status: 404 }
      )
    }

    return Response.json({
      jobId,
      canRollback: job.status === 'completed' || job.status === 'failed',
      status: job.status,
      message: job.status === 'completed' || job.status === 'failed'
        ? 'Rollback is available for this job'
        : 'Rollback is only available for completed or failed jobs',
    })

  } catch (error) {
    console.error('Error checking rollback status:', error)

    return Response.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    )
  }
}
