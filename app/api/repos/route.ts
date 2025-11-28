/**
 * API endpoint to fetch user repositories
 * GET /api/repos - List all repositories for authenticated user
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit, checkRateLimit } from '@/lib/github/octokit'
import { getUserRepositories } from '@/lib/github/repositories'
import { GitHubAPIError } from '@/lib/github/errors'
import type { RepositoryListOptions } from '@/types/repository'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const options: RepositoryListOptions = {
      sort: (searchParams.get('sort') as any) || 'updated',
      direction: (searchParams.get('direction') as any) || 'desc',
      perPage: parseInt(searchParams.get('perPage') || '30'),
      page: parseInt(searchParams.get('page') || '1'),
      type: (searchParams.get('type') as any) || 'all',
      affiliation: searchParams.get('affiliation') || undefined,
    }

    // Create Octokit instance
    const octokit = createOctokit(session.accessToken)

    // Check rate limit before making request
    const rateLimit = await checkRateLimit(octokit)
    
    if (rateLimit.core.remaining < 10) {
      return Response.json(
        {
          error: 'Rate limit low',
          message: `Only ${rateLimit.core.remaining} requests remaining. Resets at ${rateLimit.core.reset.toISOString()}`,
          rateLimit: rateLimit.core,
        },
        { status: 429 }
      )
    }

    // Fetch repositories
    const result = await getUserRepositories(octokit, options)

    return Response.json({
      success: true,
      data: result.repositories,
      pagination: result.pagination,
      rateLimit: {
        remaining: rateLimit.core.remaining,
        limit: rateLimit.core.limit,
        reset: rateLimit.core.reset,
      },
    })
  } catch (error) {
    console.error('Error fetching repositories:', error)

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
