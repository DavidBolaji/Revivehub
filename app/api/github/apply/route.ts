/**
 * GitHub Apply Changes API Endpoint
 * POST /api/github/apply - Applies transformation changes to GitHub
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Validates the apply changes request payload
 * 3. Creates an apply operation via GitHubApplyOrchestrator
 * 4. Returns operation ID for progress tracking
 * 
 * Requirements: 1.1, 4.4, 7.2
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit } from '@/lib/github/client'
import { GitHubIntegrationService } from '@/lib/github/services/integration'
import { BranchNameGenerator } from '@/lib/github/branch-name-generator'
import { getLockManager } from '@/lib/github/lock-manager'
import { createGitHubApplyOrchestrator } from '@/lib/github/apply-orchestrator'
// Registry not needed for synchronous execution
// import { registerOrchestrator, unregisterOrchestrator } from '@/lib/github/orchestrator-registry'
import type { ApplyChangesRequest } from '@/lib/github/types'

/**
 * POST handler for apply changes requests
 * 
 * Requirements: 1.1, 4.4, 7.2
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check (Requirement 7.2)
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { 
          error: 'Unauthorized',
          message: 'Please sign in to apply changes to GitHub. You need to authenticate with GitHub to create branches and pull requests.',
          requiresReauth: true
        },
        { status: 401 }
      )
    }

    // Step 2: Parse and validate request body
    let body: ApplyChangesRequest
    
    try {
      body = await request.json()
    } catch (error) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Request body must be valid JSON'
        },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.repository?.owner || !body.repository?.name) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Missing required fields: repository.owner and repository.name'
        },
        { status: 400 }
      )
    }

    if (!body.migrationJobId) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Missing required field: migrationJobId'
        },
        { status: 400 }
      )
    }

    if (!body.acceptedFiles || !Array.isArray(body.acceptedFiles) || body.acceptedFiles.length === 0) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Missing or empty acceptedFiles array. At least one file must be accepted.'
        },
        { status: 400 }
      )
    }

    if (!body.transformations || typeof body.transformations !== 'object') {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Missing or invalid transformations object'
        },
        { status: 400 }
      )
    }

    if (!body.migrationSpec) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Missing required field: migrationSpec'
        },
        { status: 400 }
      )
    }

    // Validate migration spec structure
    if (!body.migrationSpec.sourceFramework || !body.migrationSpec.targetFramework) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Invalid migration spec: missing sourceFramework or targetFramework'
        },
        { status: 400 }
      )
    }

    if (!body.migrationSpec.sourceFramework.name || !body.migrationSpec.targetFramework.name) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Invalid migration spec: framework name is required'
        },
        { status: 400 }
      )
    }

    // Validate that all accepted files have transformations
    const missingTransformations = body.acceptedFiles.filter(
      filePath => !body.transformations[filePath]
    )

    if (missingTransformations.length > 0) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: `Missing transformations for files: ${missingTransformations.join(', ')}`
        },
        { status: 400 }
      )
    }

    // Step 3: Create GitHub services and orchestrator (Requirement 7.2)
    console.log(`[GitHub Apply API] Starting apply operation for ${body.repository.owner}/${body.repository.name}`)
    console.log(`[GitHub Apply API] Migration: ${body.migrationSpec.sourceFramework.name} → ${body.migrationSpec.targetFramework.name}`)
    console.log(`[GitHub Apply API] Files to apply: ${body.acceptedFiles.length}`)

    // Create Octokit instance with user's access token (Requirement 7.2)
    const octokit = createOctokit(session.accessToken)
    
    // Create service instances
    const githubService = new GitHubIntegrationService(octokit)
    const branchNameGenerator = new BranchNameGenerator()
    const lockManager = getLockManager()
    
    // Create orchestrator
    const orchestrator = createGitHubApplyOrchestrator(
      githubService,
      branchNameGenerator,
      lockManager
    )

    // Step 4: Execute the apply operation synchronously
    // Note: SSE progress tracking doesn't work in Next.js serverless functions
    // because each API route runs in a separate execution context.
    // For now, we execute synchronously and return the complete result.
    
    // Generate operation ID for tracking
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    console.log(`[GitHub Apply API] Starting synchronous apply operation ${operationId}`)
    
    // Execute the operation
    const result = await orchestrator.applyChanges(body, operationId)

    // Log completion
    console.log(`[GitHub Apply API] Apply operation completed`)
    console.log(`[GitHub Apply API] Operation ID: ${result.operationId}`)
    console.log(`[GitHub Apply API] Status: ${result.status}`)
    
    if (result.status === 'success') {
      console.log(`[GitHub Apply API] Branch: ${result.branchName}`)
      console.log(`[GitHub Apply API] PR: ${result.pullRequest.htmlUrl}`)
    }

    // Store migration details for later retrieval
    if (result.status === 'success' || result.status === 'partial') {
      try {
        console.log(`[GitHub Apply API] Preparing to store migration data for ${body.migrationJobId}`)
        
        const migrationData = {
          id: body.migrationJobId,
          status: 'completed' as const,
          repository: {
            owner: body.repository.owner,
            name: body.repository.name,
          },
          sourceFramework: {
            name: body.migrationSpec.sourceFramework.name,
            version: body.migrationSpec.sourceFramework.version,
          },
          targetFramework: {
            name: body.migrationSpec.targetFramework.name,
            version: body.migrationSpec.targetFramework.version,
          },
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          pullRequest: result.pullRequest ? {
            number: result.pullRequest.number,
            url: result.pullRequest.url,
            htmlUrl: result.pullRequest.htmlUrl,
          } : undefined,
          summary: {
            filesChanged: body.acceptedFiles.length,
            linesAdded: Object.values(body.transformations).reduce((sum: number, t: any) => 
              sum + (t.code?.split('\n').length || t.transformedCode?.split('\n').length || 0), 0),
            linesRemoved: Object.values(body.transformations).reduce((sum: number, t: any) => 
              sum + (t.originalCode?.split('\n').length || 0), 0),
            errors: result.errors?.filter(e => e.step === 'fatal').map(e => e.message) || [],
            warnings: result.errors?.filter(e => e.step !== 'fatal').map(e => e.message) || [],
          },
        }

        console.log(`[GitHub Apply API] Migration data prepared:`, {
          id: migrationData.id,
          status: migrationData.status,
          filesChanged: migrationData.summary.filesChanged,
          prNumber: migrationData.pullRequest?.number
        })

        // Store migration data using internal API
        const storeResponse = await fetch(`${request.nextUrl.origin}/api/migration/details/${body.migrationJobId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || '',
          },
          body: JSON.stringify(migrationData),
        })

        if (storeResponse.ok) {
          const storeResult = await storeResponse.json()
          console.log(`[GitHub Apply API] Migration data stored successfully:`, storeResult)
        } else {
          const errorText = await storeResponse.text()
          console.error(`[GitHub Apply API] Failed to store migration data (${storeResponse.status}):`, errorText)
        }
      } catch (storageError) {
        console.error('[GitHub Apply API] Failed to store migration data:', storageError)
        // Don't fail the request if storage fails
      }
    }

    // Return the complete result with migration link
    return Response.json({
      operationId: result.operationId,
      status: result.status,
      message: result.status === 'success' 
        ? 'Changes applied successfully. Pull request created.'
        : result.status === 'partial'
        ? 'Changes applied with some warnings.'
        : 'Apply operation failed',
      branchName: result.branchName,
      pullRequest: result.pullRequest ? {
        number: result.pullRequest.number,
        url: result.pullRequest.htmlUrl,
        htmlUrl: result.pullRequest.htmlUrl, // For UI compatibility
      } : undefined,
      migrationUrl: `${request.nextUrl.origin}/migrations/${body.migrationJobId}`,
      commits: result.commits?.map(c => ({
        sha: c.sha.substring(0, 7),
        message: c.message,
        filesCount: c.filesCount,
      })),
      warnings: result.errors?.map(e => e.message),
      errors: result.errors?.map(e => ({
        step: e.step,
        message: e.message,
      })),
    }, { 
      status: result.status === 'success' || result.status === 'partial' ? 200 : 500 
    })

  } catch (error) {
    console.error('[GitHub Apply API] Error:', error)

    // Step 6: Error handling with user-friendly messages (Requirement 4.4)
    
    // Handle specific error types
    if (error instanceof Error) {
      // Rate limit errors
      if (error.message.includes('rate limit')) {
        return Response.json(
          {
            error: 'Rate limit exceeded',
            message: 'GitHub API rate limit exceeded. Please wait a few minutes and try again.',
            details: error.message,
          },
          { status: 429 }
        )
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('Insufficient')) {
        return Response.json(
          {
            error: 'Insufficient permissions',
            message: 'Your GitHub token does not have write access to this repository. Please sign out and sign back in to grant the necessary permissions, or check that you have write access to the repository.',
            details: error.message,
            requiresReauth: true,
            helpUrl: 'https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes'
          },
          { status: 403 }
        )
      }

      // Repository not found
      if (error.message.includes('not exist') || error.message.includes('not accessible')) {
        return Response.json(
          {
            error: 'Repository not found',
            message: 'The repository does not exist or is not accessible. Please verify the repository name and your access.',
            details: error.message,
          },
          { status: 404 }
        )
      }

      // Archived repository
      if (error.message.includes('archived')) {
        return Response.json(
          {
            error: 'Repository archived',
            message: 'This repository is archived and cannot be modified. Please unarchive it first.',
            details: error.message,
          },
          { status: 403 }
        )
      }

      // Operation in progress
      if (error.message.includes('already in progress')) {
        return Response.json(
          {
            error: 'Operation in progress',
            message: 'Another apply operation is already in progress for this repository. Please wait for it to complete.',
            details: error.message,
          },
          { status: 409 }
        )
      }

      // Validation errors
      if (error.message.includes('Validation failed') || error.message.includes('Missing')) {
        return Response.json(
          {
            error: 'Validation failed',
            message: error.message,
          },
          { status: 400 }
        )
      }

      // Network errors
      if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        return Response.json(
          {
            error: 'Network error',
            message: 'Unable to connect to GitHub. Please check your internet connection and try again.',
            details: error.message,
          },
          { status: 503 }
        )
      }

      // Generic error with message
      return Response.json(
        {
          error: 'Apply failed',
          message: error.message || 'An unexpected error occurred while applying changes.',
        },
        { status: 500 }
      )
    }

    // Unknown error type
    return Response.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again or contact support.',
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
    endpoint: '/api/github/apply',
    method: 'POST',
    description: 'Applies transformation changes to GitHub by creating a branch and pull request',
    authentication: 'Required - GitHub OAuth session with repo scope',
    requestBody: {
      repository: {
        owner: 'string (required) - Repository owner username',
        name: 'string (required) - Repository name',
      },
      migrationJobId: 'string (required) - Migration job ID for reference',
      acceptedFiles: 'string[] (required) - Array of file paths to apply',
      transformations: 'Record<string, Phase3TransformResult> (required) - Transformation results by file path',
      migrationSpec: {
        sourceFramework: {
          name: 'string (required)',
          version: 'string (required)',
        },
        targetFramework: {
          name: 'string (required)',
          version: 'string (required)',
        },
        options: 'Record<string, any> (optional)',
      },
      baseBranch: 'string (optional) - Base branch name, defaults to repository default branch',
    },
    response: {
      success: {
        operationId: 'string - Unique operation identifier',
        status: '"success" | "partial" | "failed"',
        message: 'string - Human-readable status message',
        branchName: 'string - Created branch name',
        pullRequest: {
          number: 'number - PR number',
          url: 'string - PR URL',
        },
        commits: 'Array<{ sha: string, message: string, filesCount: number }>',
      },
      error: {
        error: 'string - Error type',
        message: 'string - User-friendly error message',
        details: 'string (optional) - Additional error details',
      },
    },
    progressTracking: 'Connect to /api/github/apply/progress/{operationId} for real-time updates via Server-Sent Events',
    rollback: 'POST to /api/github/rollback with operationId to rollback changes',
  })
}
