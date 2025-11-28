/**
 * Migration Start API Endpoint
 * POST /api/migration/start - Initiates a code migration job
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Validates the migration request payload
 * 3. Creates a migration job via MigrationOrchestrator
 * 4. Returns job ID for progress tracking
 * 
 * Requirements: 2.6, 3.1
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getMigrationOrchestrator } from '@/lib/migration/migration-orchestrator'
import type { MigrationRequest } from '@/types/migration'

/**
 * POST handler for migration start requests
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to start a migration.' },
        { status: 401 }
      )
    }

    // Step 2: Parse and validate request body
    let body: MigrationRequest
    
    try {
      body = await request.json()
    } catch (error) {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    console.log(body.repository)

    // Validate required fields
    if (!body.repository?.owner || !body.repository?.name) {
      return Response.json(
        { error: 'Missing required field: repository.owner and repository.name' },
        { status: 400 }
      )
    }

    if (!body.migrationSpec) {
      return Response.json(
        { error: 'Missing required field: migrationSpec' },
        { status: 400 }
      )
    }

    // Validate migration spec structure
    if (!body.migrationSpec.source || !body.migrationSpec.target) {
      return Response.json(
        { error: 'Invalid migration spec: missing source or target configuration' },
        { status: 400 }
      )
    }

    // Step 3: Create migration job
    const orchestrator = getMigrationOrchestrator()
    
    console.log(`[MIGRATION] Starting migration job for ${body.repository.owner}/${body.repository.name}`)
    console.log(`[MIGRATION] Source: ${body.migrationSpec.source.framework} ${body.migrationSpec.source.version}`)
    console.log(`[MIGRATION] Target: ${body.migrationSpec.target.framework} ${body.migrationSpec.target.version}`)
    
    // Pass the GitHub access token from the authenticated session
    const job = await orchestrator.startMigration(body, session.accessToken)

    // Step 4: Return job ID and status
    return Response.json({
      jobId: job.id,
      status: job.status,
      message: `Migration job created. Connect to /api/migration/progress/${job.id} for real-time progress.`,
      repository: {
        owner: job.repository.owner,
        name: job.repository.name,
      },
    }, { status: 202 }) // 202 Accepted

  } catch (error) {
    console.error('Error in migration start API:', error)

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
    endpoint: '/api/migration/start',
    method: 'POST',
    description: 'Initiates a code migration job from source to target framework',
    authentication: 'Required - GitHub OAuth session',
    requestBody: {
      repository: {
        owner: 'string (required)',
        name: 'string (required)',
        branch: 'string (optional, defaults to default branch)',
      },
      migrationSpec: {
        source: 'SourceConfiguration (required)',
        target: 'TargetConfiguration (required)',
        mappings: 'MigrationMappings (required)',
        rules: 'MigrationRules (required)',
        metadata: 'SpecMetadata (optional)',
      },
      options: {
        batchSize: 'number (optional, default: 10)',
        parallelism: 'number (optional, default: 5)',
        skipTests: 'boolean (optional, default: false)',
        dryRun: 'boolean (optional, default: false)',
        createBackups: 'boolean (optional, default: true)',
      },
    },
    response: {
      jobId: 'string - Unique job identifier for tracking',
      status: '"pending" | "running" | "completed" | "failed"',
      message: 'string - Human-readable status message',
      repository: {
        owner: 'string',
        name: 'string',
      },
    },
    progressTracking: 'Connect to /api/migration/progress/{jobId} for real-time updates via Server-Sent Events',
  })
}
