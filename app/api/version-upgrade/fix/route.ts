/**
 * Version Upgrade Fix API Endpoint
 * POST /api/version-upgrade/fix - Applies auto-fixes for version upgrade violations
 * 
 * This endpoint:
 * 1. Authenticates the user via session
 * 2. Accepts violation report and file contents
 * 3. Applies auto-fixes to violations
 * 4. Returns fixed code with diffs
 * 
 * Requirements: 11.8, 11.9, 11.10
 */

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { VersionUpgradeTransformer } from '@/lib/migration/version-upgrade-transformer'
import type { Violation } from '@/types/migration'

interface FixRequest {
  files: Record<string, string> // filePath -> fileContent
  violations: Record<string, Violation[]> // filePath -> violations
  framework: string
  fromVersion: string
  toVersion: string
  autoFixOnly?: boolean
}

/**
 * POST handler for version upgrade fixes
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await auth()
    
    if (!session?.accessToken) {
      return Response.json(
        { error: 'Unauthorized. Please sign in to apply version upgrade fixes.' },
        { status: 401 }
      )
    }

    // Step 2: Parse and validate request body
    let body: FixRequest
    
    try {
      body = await request.json()
    } catch (error) {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.files || Object.keys(body.files).length === 0) {
      return Response.json(
        { error: 'Missing required field: files (must contain at least one file)' },
        { status: 400 }
      )
    }

    if (!body.violations || Object.keys(body.violations).length === 0) {
      return Response.json(
        { error: 'Missing required field: violations (must contain at least one violation)' },
        { status: 400 }
      )
    }

    if (!body.framework || !body.fromVersion || !body.toVersion) {
      return Response.json(
        { error: 'Missing required fields: framework, fromVersion, toVersion' },
        { status: 400 }
      )
    }

    console.log(`[VERSION-FIX] Applying fixes for ${body.framework} ${body.fromVersion} → ${body.toVersion}`)
    console.log(`[VERSION-FIX] Files to fix: ${Object.keys(body.files).length}`)

    // Count total violations
    let totalViolations = 0
    let autoFixableViolations = 0
    for (const violations of Object.values(body.violations)) {
      totalViolations += violations.length
      autoFixableViolations += violations.filter(v => v.autoFixable).length
    }

    console.log(`[VERSION-FIX] Total violations: ${totalViolations}`)
    console.log(`[VERSION-FIX] Auto-fixable violations: ${autoFixableViolations}`)

    // Step 3: Apply auto-fixes
    const transformer = new VersionUpgradeTransformer()
    
    // Convert files and violations to Maps
    const filesMap = new Map<string, string>(Object.entries(body.files))
    const violationsMap = new Map<string, Violation[]>(Object.entries(body.violations))

    // Apply fixes
    const results = await transformer.autoFixViolations(filesMap, violationsMap)

    console.log(`[VERSION-FIX] Fixed ${results.size} files`)

    // Step 4: Convert results to JSON-serializable format
    const fixedFiles: Record<string, any> = {}
    let successCount = 0
    let failureCount = 0

    for (const [filePath, result] of results) {
      if (result.success) {
        successCount++
        fixedFiles[filePath] = {
          success: true,
          code: result.code,
          diff: result.diff?.unified || '',
          metadata: result.metadata,
          warnings: result.warnings,
        }
      } else {
        failureCount++
        fixedFiles[filePath] = {
          success: false,
          errors: result.errors,
          warnings: result.warnings,
        }
      }
    }

    // Step 5: Update dependencies if needed
    let dependencyUpdates: any = null
    
    if (body.files['package.json']) {
      try {
        const updatedPackageJson = await transformer.updateDependencies(
          body.files['package.json'],
          body.toVersion
        )
        
        // Generate simple diff
        const generateSimpleDiff = (original: string, updated: string): string => {
          const originalLines = original.split('\n')
          const updatedLines = updated.split('\n')
          const diff: string[] = []
          
          for (let i = 0; i < Math.max(originalLines.length, updatedLines.length); i++) {
            if (originalLines[i] !== updatedLines[i]) {
              if (originalLines[i]) diff.push(`- ${originalLines[i]}`)
              if (updatedLines[i]) diff.push(`+ ${updatedLines[i]}`)
            }
          }
          
          return diff.join('\n')
        }
        
        dependencyUpdates = {
          original: body.files['package.json'],
          updated: updatedPackageJson,
          diff: generateSimpleDiff(body.files['package.json'], updatedPackageJson),
        }
      } catch (error) {
        console.error('[VERSION-FIX] Failed to update dependencies:', error)
      }
    }

    // Step 6: Generate migration guide
    const migrationGuide = await transformer.generateMigrationGuide(
      {
        totalViolations,
        autoFixableCount: autoFixableViolations,
        manualReviewCount: totalViolations - autoFixableViolations,
        summary: `Applied ${successCount} auto-fixes for ${body.framework} ${body.fromVersion} → ${body.toVersion}`,
        violationsByFile: violationsMap,
        violationsByType: new Map(),
      },
      results
    )

    // Step 7: Return results
    return Response.json({
      framework: body.framework,
      fromVersion: body.fromVersion,
      toVersion: body.toVersion,
      summary: {
        totalFiles: Object.keys(body.files).length,
        filesFixed: results.size,
        successCount,
        failureCount,
        totalViolations,
        autoFixableViolations,
      },
      fixedFiles,
      dependencyUpdates,
      migrationGuide,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Error in version-upgrade/fix API:', error)

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
    endpoint: '/api/version-upgrade/fix',
    method: 'POST',
    description: 'Applies auto-fixes for version upgrade violations',
    authentication: 'Required - GitHub OAuth session',
    requestBody: {
      files: 'object (required) - Map of file paths to file contents',
      violations: 'object (required) - Map of file paths to violation arrays',
      framework: 'string (required) - Framework identifier',
      fromVersion: 'string (required) - Current version',
      toVersion: 'string (required) - Target version',
      autoFixOnly: 'boolean (optional) - Only apply auto-fixable violations',
    },
    response: {
      framework: 'string - Framework identifier',
      fromVersion: 'string - Current version',
      toVersion: 'string - Target version',
      summary: {
        totalFiles: 'number - Total files processed',
        filesFixed: 'number - Files with fixes applied',
        successCount: 'number - Successful fixes',
        failureCount: 'number - Failed fixes',
        totalViolations: 'number - Total violations',
        autoFixableViolations: 'number - Auto-fixable violations',
      },
      fixedFiles: 'object - Fixed files with code and diffs',
      dependencyUpdates: 'object - Updated package.json if applicable',
      migrationGuide: 'string - Migration guide with all changes',
      timestamp: 'string - ISO timestamp',
    },
  })
}
