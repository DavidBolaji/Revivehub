/**
 * Framework Rules API Endpoint
 * GET /api/frameworks/rules - Returns available frameworks, versions, and migration paths
 * 
 * This endpoint:
 * 1. Returns list of available frameworks and their versions
 * 2. Returns supported migration paths between frameworks
 * 3. Caches responses for performance
 * 4. Optionally filters by source framework
 * 
 * Requirements: 2.1, 14.1
 */

import { NextRequest } from 'next/server'
import { getFrameworkRulesLoader, getCompatibleTargets } from '@/lib/migration/framework-rules'

// Cache duration: 10 minutes (framework rules don't change often)
const CACHE_DURATION_SECONDS = 600

/**
 * GET handler for framework rules
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sourceFramework = searchParams.get('source')
    const includeVersions = searchParams.get('includeVersions') !== 'false'
    const includePaths = searchParams.get('includePaths') !== 'false'

    const loader = getFrameworkRulesLoader()

    // Load framework database
    const database = await loader.loadDatabase()

    // Get list of available frameworks
    const frameworks: Record<string, any> = {}

    for (const [frameworkId] of Object.entries(database.frameworks)) {
      try {
        const rules = await loader.loadFrameworkRules(frameworkId)
        
        frameworks[frameworkId] = {
          id: frameworkId,
          name: rules.name,
          displayName: rules.displayName,
          language: rules.language,
          description: rules.description,
          category: rules.category,
          officialWebsite: rules.officialWebsite,
        }

        // Include versions if requested
        if (includeVersions) {
          frameworks[frameworkId].versions = rules.versions.map(v => ({
            version: v.version,
            releaseDate: v.releaseDate,
            status: v.status,
            breakingChangesCount: v.breakingChanges?.length || 0,
            deprecationsCount: v.deprecations?.length || 0,
          }))
        }

      } catch (error) {
        console.error(`Failed to load framework ${frameworkId}:`, error)
        // Skip frameworks that fail to load
        continue
      }
    }

    // Get migration paths
    let migrationPaths: any[] = []

    if (includePaths) {
      for (const [pathId] of Object.entries(database.migrationPaths)) {
        try {
          const path = await loader.loadMigrationPath(pathId)
          
          // Filter by source framework if specified
          if (sourceFramework && path.sourceFramework !== sourceFramework) {
            continue
          }

          migrationPaths.push({
            id: pathId,
            sourceFramework: path.sourceFramework,
            sourceVersionRange: path.sourceVersionRange,
            targetFramework: path.targetFramework,
            targetVersionRange: path.targetVersionRange,
            difficulty: path.difficulty,
            estimatedTime: path.estimatedTime,
            automationLevel: path.automationLevel,
            description: path.description,
            stepsCount: path.steps?.length || 0,
          })

        } catch (error) {
          console.error(`Failed to load migration path ${pathId}:`, error)
          // Skip paths that fail to load
          continue
        }
      }
    }

    // Get compatible targets for source framework if specified
    let compatibleTargets: any[] = []
    
    if (sourceFramework) {
      try {
        const targets = await getCompatibleTargets(sourceFramework)
        compatibleTargets = targets
      } catch (error) {
        console.error(`Failed to get compatible targets for ${sourceFramework}:`, error)
      }
    }

    // Build response
    const response = {
      frameworks,
      frameworkCount: Object.keys(frameworks).length,
      ...(includePaths && { migrationPaths, pathCount: migrationPaths.length }),
      ...(sourceFramework && { compatibleTargets, targetCount: compatibleTargets.length }),
      cached: true,
      timestamp: new Date().toISOString(),
    }

    // Return with cache headers
    return Response.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION_SECONDS}, s-maxage=${CACHE_DURATION_SECONDS}`,
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Error in frameworks/rules API:', error)

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
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': `public, max-age=${CACHE_DURATION_SECONDS}`,
    },
  })
}
