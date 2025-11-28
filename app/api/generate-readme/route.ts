/**
 * README Generation API Endpoint
 * POST /api/generate-readme - Scans repository and generates/updates README.md
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Fetches repository files using GitHub API
 * 3. Analyzes project structure and dependencies
 * 4. Generates comprehensive README using AI or template
 * 5. Returns the generated README content
 * 
 * Requirements: Documentation transformer with repository scanning
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { createOctokit, checkRateLimit } from '@/lib/github/octokit'
import { GitHubContentService } from '@/lib/github/content-service'
import { DocumentationTransformer } from '@/lib/transformers/documentation/documentation-transformer'
import { GitHubAPIError } from '@/lib/github/errors'

interface GenerateReadmeRequest {
  repository: {
    owner: string
    name: string
    branch?: string
  }
  options?: {
    forceRegenerate?: boolean
    includeExisting?: boolean
  }
}

interface GenerateReadmeResponse {
  success: boolean
  readme: string
  analysis?: {
    projectName: string
    framework: string
    techStack: string[]
    features: string[]
  }
  error?: string
}

// Rate limiting: Track requests per user
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5 // Lower limit for README generation

/**
 * POST handler for README generation requests
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to generate README.' },
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
              message: `Maximum ${MAX_REQUESTS_PER_WINDOW} README generation requests per minute. Please try again later.`,
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
    let body: GenerateReadmeRequest
    
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

    // Step 4: Check GitHub API rate limit
    const octokit = createOctokit(session.accessToken)
    
    try {
      const rateLimit = await checkRateLimit(octokit)
      
      if (rateLimit.core.remaining < 100) {
        return Response.json(
          {
            error: 'GitHub API rate limit low',
            message: `Only ${rateLimit.core.remaining} GitHub API requests remaining. README generation requires at least 100. Resets at ${rateLimit.core.reset.toISOString()}`,
            rateLimit: rateLimit.core,
          },
          { status: 429 }
        )
      }
    } catch (error) {
      console.error('Error checking GitHub rate limit:', error)
      // Continue anyway - rate limit check is not critical
    }

    // Step 5: Fetch repository files
    console.log(`[README-GEN] Scanning repository: ${body.repository.owner}/${body.repository.name}`)
    
    const githubService = new GitHubContentService(octokit)
    
    // Fetch repository files with optimized patterns for README generation
    const filesResult = await githubService.fetchRepositoryFiles(
      body.repository.owner,
      body.repository.name,
      {
        ref: body.repository.branch,
        maxDepth: 3, // Limit depth for performance
        includePatterns: [
          '*.json',      // package.json, tsconfig.json, etc.
          '*.js',        // config files
          '*.ts',        // config files
          '*.md',        // existing documentation
          '*.yml',       // CI/CD files
          '*.yaml',      // CI/CD files
          'src/**/*',    // source code for analysis
          'app/**/*',    // Next.js app directory
          'pages/**/*',  // Next.js pages directory
          'components/**/*', // React components
          'lib/**/*',    // utility libraries
          'utils/**/*',  // utility functions
          '.env*',       // environment files
          'Dockerfile',  // Docker configuration
        ],
        excludePatterns: [
          'node_modules/**',
          '.git/**',
          'dist/**',
          'build/**',
          '.next/**',
          'coverage/**',
          '*.lock',
          'package-lock.json',
          'yarn.lock',
          'pnpm-lock.yaml',
        ],
        maxFileSize: 100 * 1024, // 100KB max per file
        useCache: true,
      }
    )

    console.log(`[README-GEN] Fetched ${filesResult.files.length} files (${filesResult.skippedFiles.length} skipped)`)

    // Step 6: Check for existing README
    let existingReadme: string | undefined
    
    if (body.options?.includeExisting !== false) {
      try {
        const readmeFile = await githubService.fetchFileByPath(
          body.repository.owner,
          body.repository.name,
          'README.md',
          body.repository.branch
        )
        existingReadme = readmeFile.content
        console.log(`[README-GEN] Found existing README (${readmeFile.size} bytes)`)
      } catch (error) {
        console.log(`[README-GEN] No existing README found`)
      }
    }

    // Step 7: Generate README using DocumentationTransformer
    const transformer = new DocumentationTransformer()
    
    const repositoryFiles = filesResult.files.map(file => ({
      path: file.path,
      content: file.content,
    }))

    console.log(`[README-GEN] Generating README with ${repositoryFiles.length} files for analysis`)
    
    const generatedReadme = await transformer.generateReadmeFromRepository(
      repositoryFiles,
      existingReadme
    )

    // Step 8: Return the generated README
    const response: GenerateReadmeResponse = {
      success: true,
      readme: generatedReadme,
    }

    console.log(`[README-GEN] Successfully generated README (${generatedReadme.length} characters)`)

    return Response.json(response, { status: 200 })

  } catch (error) {
    console.error('Error in README generation API:', error)

    if (error instanceof GitHubAPIError) {
      return Response.json(
        {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
          rateLimit: error.rateLimit,
        },
        { status: error.statusCode || 500 }
      )
    }

    return Response.json(
      {
        success: false,
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
    endpoint: '/api/generate-readme',
    method: 'POST',
    description: 'Scans repository and generates/updates README.md using AI analysis',
    authentication: 'Required - GitHub OAuth session',
    rateLimit: `${MAX_REQUESTS_PER_WINDOW} requests per minute`,
    requestBody: {
      repository: {
        owner: 'string (required) - Repository owner',
        name: 'string (required) - Repository name',
        branch: 'string (optional) - Branch to scan, defaults to default branch',
      },
      options: {
        forceRegenerate: 'boolean (optional) - Force complete regeneration even if README exists',
        includeExisting: 'boolean (optional) - Include existing README content for enhancement (default: true)',
      },
    },
    response: {
      success: 'boolean - Whether generation was successful',
      readme: 'string - Generated README.md content',
      analysis: {
        projectName: 'string - Detected project name',
        framework: 'string - Detected framework',
        techStack: 'string[] - Detected technologies',
        features: 'string[] - Detected features',
      },
      error: 'string (optional) - Error message if generation failed',
    },
    features: [
      'Scans repository structure and dependencies',
      'Analyzes package.json and configuration files',
      'Detects framework, tech stack, and features',
      'Generates comprehensive README using AI',
      'Preserves existing content when appropriate',
      'Includes badges, installation instructions, and project structure',
    ],
  })
}