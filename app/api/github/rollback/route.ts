/**
 * GitHub Rollback API Endpoint
 * POST /api/github/rollback - Rolls back GitHub changes by closing PR and deleting branch
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Validates the rollback request payload
 * 3. Retrieves the orchestrator for the operation
 * 4. Calls rollbackChanges() to close PR and delete branch
 * 5. Returns rollback result
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { getOrchestrator } from '@/lib/github/orchestrator-registry'

/**
 * Request body interface for rollback
 */
interface RollbackRequest {
  operationId: string
  confirmed?: boolean // User confirmation (Requirement 9.4)
}

/**
 * POST handler for rollback requests
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { 
          error: 'Unauthorized',
          message: 'Please sign in to perform rollback operations. You need to authenticate with GitHub.'
        },
        { status: 401 }
      )
    }

    // Step 2: Parse and validate request body
    let body: RollbackRequest
    
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
    if (!body.operationId) {
      return Response.json(
        { 
          error: 'Invalid request',
          message: 'Missing required field: operationId'
        },
        { status: 400 }
      )
    }

    // Check for user confirmation (Requirement 9.4)
    if (!body.confirmed) {
      return Response.json(
        { 
          error: 'Confirmation required',
          message: 'Rollback requires user confirmation. Set confirmed: true to proceed.',
          requiresConfirmation: true,
        },
        { status: 400 }
      )
    }

    console.log(`[GitHub Rollback API] Starting rollback for operation ${body.operationId}`)

    // Step 3: Retrieve orchestrator for the operation
    const orchestrator = getOrchestrator(body.operationId)
    
    if (!orchestrator) {
      return Response.json(
        { 
          error: 'Operation not found',
          message: 'The specified operation was not found. It may have expired or already been rolled back.',
        },
        { status: 404 }
      )
    }

    // Step 4: Call rollbackChanges (Requirements 9.1, 9.2, 9.3, 9.5)
    const result = await orchestrator.rollbackChanges(body.operationId)

    // Step 5: Return rollback result
    if (result.success) {
      console.log(`[GitHub Rollback API] Rollback completed successfully`)
      console.log(`[GitHub Rollback API] Branch deleted: ${result.branchDeleted}`)
      console.log(`[GitHub Rollback API] PR closed: ${result.prClosed}`)

      return Response.json({
        success: true,
        message: result.message, // Requirement 9.5: Success message
        branchDeleted: result.branchDeleted,
        prClosed: result.prClosed,
      }, { status: 200 })
    } else {
      console.warn(`[GitHub Rollback API] Rollback completed with errors`)
      console.warn(`[GitHub Rollback API] Errors: ${result.errors?.join(', ')}`)

      // Check if it's because PR was already merged (Requirement 9.3)
      const mergedError = result.errors?.some(e => e.includes('merged'))
      
      if (mergedError) {
        return Response.json({
          success: false,
          error: 'Cannot rollback merged PR',
          message: result.message,
          branchDeleted: result.branchDeleted,
          prClosed: result.prClosed,
          errors: result.errors,
        }, { status: 409 }) // Conflict status for merged PR
      }

      return Response.json({
        success: false,
        error: 'Rollback failed',
        message: result.message,
        branchDeleted: result.branchDeleted,
        prClosed: result.prClosed,
        errors: result.errors,
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[GitHub Rollback API] Error:', error)

    // Error handling with user-friendly messages
    if (error instanceof Error) {
      // Permission errors
      if (error.message.includes('permission') || error.message.includes('Insufficient')) {
        return Response.json(
          {
            error: 'Insufficient permissions',
            message: 'You do not have permission to delete branches or close pull requests in this repository.',
            details: error.message,
          },
          { status: 403 }
        )
      }

      // Repository not found
      if (error.message.includes('not found') || error.message.includes('not exist')) {
        return Response.json(
          {
            error: 'Resource not found',
            message: 'The repository, branch, or pull request could not be found.',
            details: error.message,
          },
          { status: 404 }
        )
      }

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
          error: 'Rollback failed',
          message: error.message || 'An unexpected error occurred during rollback.',
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
    endpoint: '/api/github/rollback',
    method: 'POST',
    description: 'Rolls back GitHub changes by closing the pull request and deleting the feature branch',
    authentication: 'Required - GitHub OAuth session with repo scope',
    requestBody: {
      operationId: 'string (required) - The operation ID from the apply changes response',
      confirmed: 'boolean (required) - Must be true to confirm rollback action',
    },
    response: {
      success: {
        success: 'boolean - true if rollback succeeded',
        message: 'string - Success message confirming branch deletion',
        branchDeleted: 'boolean - Whether the branch was deleted',
        prClosed: 'boolean - Whether the PR was closed',
      },
      error: {
        success: 'boolean - false if rollback failed',
        error: 'string - Error type',
        message: 'string - User-friendly error message',
        branchDeleted: 'boolean - Whether the branch was deleted',
        prClosed: 'boolean - Whether the PR was closed',
        errors: 'string[] (optional) - List of error messages',
      },
    },
    notes: [
      'Rollback requires user confirmation (confirmed: true)',
      'Cannot rollback if the pull request has already been merged',
      'Operation data expires after 15 minutes',
      'Both PR closure and branch deletion are attempted even if one fails',
    ],
    requirements: {
      '9.1': 'Closes the pull request when rollback is requested',
      '9.2': 'Deletes the feature branch after closing the PR',
      '9.3': 'Prevents rollback if PR has already been merged',
      '9.4': 'Requires user confirmation before proceeding',
      '9.5': 'Displays success message confirming branch deletion',
    },
  })
}
