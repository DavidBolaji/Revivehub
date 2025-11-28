/**
 * API endpoint to fetch repository contents
 * GET /api/repos/[owner]/[repo]/contents?path=... - Get file or directory contents
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit } from '@/lib/github/octokit'
import { getRepositoryContents } from '@/lib/github/repositories'
import { GitHubAPIError } from '@/lib/github/errors'

export async function GET(
  request: NextRequest,
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

    // Get path from query parameters
    const searchParams = request.nextUrl.searchParams
    const path = searchParams.get('path') || ''

    // Create Octokit instance
    const octokit = createOctokit(session.accessToken)

    // Fetch repository contents
    const contents = await getRepositoryContents(
      octokit,
      params.owner,
      params.repo,
      path
    )

    return Response.json({
      success: true,
      data: contents,
    })
  } catch (error) {
    console.error('Error fetching repository contents:', error)

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
