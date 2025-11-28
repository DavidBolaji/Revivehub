/**
 * API endpoint for repository scanning and analysis
 * GET /api/scan/[owner]/[repo] - Analyze a repository and return comprehensive health report
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit, checkRateLimit } from '@/lib/github/octokit'
import { GitHubAPIError } from '@/lib/github/errors'
import {
  CachedScannerOrchestrator,
  LanguageDetector,
  FrameworkRecognizer,
  BuildToolDetector,
  DependencyAnalyzer,
  RepositoryFetcher,
  createCacheService,
} from '@/lib/scanner'

export async function GET(
  request: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    // Check authentication
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to analyze repositories.' },
        { status: 401 }
      )
    }

    const { owner, repo } = params

    // Validate parameters
    if (!owner || !repo) {
      return Response.json(
        { error: 'Missing required parameters: owner and repo' },
        { status: 400 }
      )
    }

    // Check for force refresh parameter to bypass cache
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Create Octokit instance with user's access token
    const octokit = createOctokit(session.accessToken)

    // Check rate limit before expensive operation
    const rateLimit = await checkRateLimit(octokit)
    
    if (rateLimit.core.remaining < 20) {
      return Response.json(
        {
          error: 'Rate limit too low for analysis',
          message: `Analysis requires at least 20 API calls. Only ${rateLimit.core.remaining} requests remaining. Resets at ${rateLimit.core.reset.toISOString()}`,
          rateLimit: rateLimit.core,
        },
        { status: 429 }
      )
    }

    // Create cache service
    const cacheService = createCacheService()

    // Initialize all detectors
    const detectors = [
      new LanguageDetector(),
      new FrameworkRecognizer(),
      new BuildToolDetector(),
      new DependencyAnalyzer(),
    ]

    // Create cached scanner orchestrator
    const scanner = new CachedScannerOrchestrator(
      cacheService,
      octokit,
      detectors,
      30000, // 30 second overall timeout
      10000  // 10 second per-detector timeout
    )

    // Fetch repository context
    const fetcher = new RepositoryFetcher(octokit)
    const context = await fetcher.fetchRepositoryContext(owner, repo)

    // If force refresh, invalidate cache first
    if (forceRefresh) {
      const cacheKey = `scanner:${owner}:${repo}:*`
      await cacheService.invalidate(cacheKey)
      console.log(`[ScanAPI] Cache invalidated for ${owner}/${repo}`)
    }

    // Execute repository analysis
    const report = await scanner.analyzeRepository(context)

    // Get updated rate limit info
    const finalRateLimit = await checkRateLimit(octokit)

    return Response.json({
      success: true,
      data: report,
      rateLimit: {
        remaining: finalRateLimit.core.remaining,
        limit: finalRateLimit.core.limit,
        reset: finalRateLimit.core.reset,
      },
    })

  } catch (error) {
    console.error('Error analyzing repository:', error)

    // Handle GitHub API errors
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

    // Handle scanner-specific errors
    if (error instanceof Error) {
      // Check for timeout errors
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return Response.json(
          {
            error: 'Analysis timeout',
            message: 'Repository analysis took too long. Please try again or contact support for large repositories.',
            details: error.message,
          },
          { status: 504 }
        )
      }

      // Check for repository not found
      if (error.message.includes('not found') || error.message.includes('404')) {
        return Response.json(
          {
            error: 'Repository not found',
            message: `Repository ${params.owner}/${params.repo} not found or you don't have access to it.`,
          },
          { status: 404 }
        )
      }

      // Generic error with details
      return Response.json(
        {
          error: 'Analysis failed',
          message: error.message,
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        { status: 500 }
      )
    }

    // Unknown error
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
