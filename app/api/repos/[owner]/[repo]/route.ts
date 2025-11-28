/**
 * API endpoint to fetch single repository details
 * GET /api/repos/[owner]/[repo] - Get repository details
 */

import { auth } from '@/auth'
import { createOctokit } from '@/lib/github/octokit'
import { getRepositoryDetails } from '@/lib/github/repositories'
import { GitHubAPIError } from '@/lib/github/errors'

export async function GET(
  _request: Request,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // Create Octokit instance
    const octokit = createOctokit(session.accessToken)

    // Fetch repository details
    const repository = await getRepositoryDetails(
      octokit,
      params.owner,
      params.repo
    )

    return Response.json({
      success: true,
      data: repository,
    })
  } catch (error) {
    console.error('Error fetching repository:', error)

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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
