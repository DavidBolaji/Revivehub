/**
 * Version Upgrade Detection API Endpoint
 * POST /api/version-upgrade/detect - Detects violations when upgrading framework versions
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Accepts repository info and version range
 * 3. Fetches repository code
 * 4. Scans for breaking changes and deprecations
 * 5. Returns violation report
 * 
 * Requirements: 11.4, 11.5, 11.6
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { GitHubRepositoryFetcher } from '@/lib/migration/github-fetcher'
import { VersionUpgradeDetector } from '@/lib/migration/version-upgrade-detector'
import type { RepositoryInfo } from '@/types/migration'

interface DetectRequest {
  repository: RepositoryInfo
  framework: string
  fromVersion: string
  toVersion: string
}

/**
 * POST handler for version upgrade detection
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to detect version violations.' },
        { status: 401 }
      )
    }

    // Step 2: Parse and validate request body
    let body: DetectRequest
    
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

    if (!body.framework) {
      return Response.json(
        { error: 'Missing required field: framework' },
        { status: 400 }
      )
    }

    if (!body.fromVersion || !body.toVersion) {
      return Response.json(
        { error: 'Missing required fields: fromVersion and toVersion' },
        { status: 400 }
      )
    }

    console.log(`[VERSION-DETECT] Detecting violations for ${body.framework} ${body.fromVersion} → ${body.toVersion}`)
    console.log(`[VERSION-DETECT] Repository: ${body.repository.owner}/${body.repository.name}`)

    // Step 3: Fetch repository code
    const fetcher = new GitHubRepositoryFetcher(session.accessToken)
    
    const files = await fetcher.fetchAllSourceFiles(
      body.repository.owner,
      body.repository.name,
      body.repository.branch
    )

    console.log(`[VERSION-DETECT] Fetched ${files.length} files from repository`)

    // Step 4: Detect violations
    const detector = new VersionUpgradeDetector()
    
    // Load breaking changes for version range
    const breakingChanges = await detector.loadBreakingChanges(
      body.framework,
      body.fromVersion,
      body.toVersion
    )

    console.log(`[VERSION-DETECT] Found ${breakingChanges.length} breaking changes`)

    // Scan codebase for violations
    const violationReport = await detector.detectViolations(
      files,
      body.fromVersion,
      body.toVersion,
      body.framework
    )

    console.log(`[VERSION-DETECT] Found ${violationReport.totalViolations} violations`)

    // Step 5: Generate fix suggestions
    const allViolations: any[] = []
    for (const violations of violationReport.violationsByFile.values()) {
      allViolations.push(...violations)
    }

    const fixSuggestions = await detector.generateFixSuggestions(allViolations)

    console.log(`[VERSION-DETECT] Generated ${fixSuggestions.length} fix suggestions`)

    // Convert Maps to objects for JSON serialization
    const violationsByFile: Record<string, any[]> = {}
    for (const [filePath, violations] of violationReport.violationsByFile) {
      violationsByFile[filePath] = violations.map(v => ({
        id: v.id,
        type: v.type,
        severity: v.severity,
        line: v.line,
        column: v.column,
        message: v.message,
        suggestion: v.suggestion,
        autoFixable: v.autoFixable,
      }))
    }

    const violationsByType: Record<string, any[]> = {}
    for (const [type, violations] of violationReport.violationsByType) {
      violationsByType[type] = violations.map(v => ({
        id: v.id,
        filePath: v.filePath,
        line: v.line,
        message: v.message,
        autoFixable: v.autoFixable,
      }))
    }

    // Step 6: Return violation report
    return Response.json({
      repository: {
        owner: body.repository.owner,
        name: body.repository.name,
      },
      framework: body.framework,
      fromVersion: body.fromVersion,
      toVersion: body.toVersion,
      report: {
        totalViolations: violationReport.totalViolations,
        autoFixableCount: violationReport.autoFixableCount,
        manualReviewCount: violationReport.manualReviewCount,
        summary: violationReport.summary,
        violationsByFile,
        violationsByType,
      },
      fixSuggestions: fixSuggestions.map(f => ({
        violationId: f.violationId,
        description: f.description,
        autoFixable: f.autoFixable,
        fixCode: f.fixCode,
        manualSteps: f.manualSteps,
      })),
      filesScanned: files.length,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error in version-upgrade/detect API:', error)

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
    endpoint: '/api/version-upgrade/detect',
    method: 'POST',
    description: 'Detects breaking changes and deprecations when upgrading framework versions',
    authentication: 'Required - GitHub OAuth session',
    requestBody: {
      repository: {
        owner: 'string (required)',
        name: 'string (required)',
        branch: 'string (optional, defaults to default branch)',
      },
      framework: 'string (required) - Framework identifier (e.g., "nextjs", "react")',
      fromVersion: 'string (required) - Current version',
      toVersion: 'string (required) - Target version',
    },
    response: {
      repository: 'object - Repository info',
      framework: 'string - Framework identifier',
      fromVersion: 'string - Current version',
      toVersion: 'string - Target version',
      report: {
        totalViolations: 'number - Total violations found',
        autoFixableCount: 'number - Number of auto-fixable violations',
        manualReviewCount: 'number - Number of violations requiring manual review',
        summary: 'string - Summary of violations',
        violationsByFile: 'object - Violations grouped by file',
        violationsByType: 'object - Violations grouped by type',
      },
      fixSuggestions: 'array - Suggested fixes for violations',
      filesScanned: 'number - Number of files scanned',
      timestamp: 'string - ISO timestamp',
    },
  })
}
