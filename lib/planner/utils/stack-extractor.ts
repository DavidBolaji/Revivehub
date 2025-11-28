import type { AnalysisReport } from '@/lib/scanner/types'
import type { SourceStack } from '@/lib/planner/types'

/**
 * Extracts SourceStack from AnalysisReport
 * Transforms scan results into the format required by MigrationPlanner
 */
export function extractSourceStack(report: AnalysisReport): SourceStack {
  // Get primary framework (prefer frontend, fallback to backend)
  const primaryFramework = 
    report.frameworks?.frontend?.[0] || 
    report.frameworks?.backend?.[0]
  
  // Get primary language
  const primaryLanguage = report.languages?.primaryLanguage
  
  // Build dependency map from scan results
  const dependencies = extractDependencyMap(report)
  
  // Extract pattern names from issues
  const patterns = extractPatternNames(report)
  
  return {
    framework: primaryFramework?.name || 'Unknown',
    version: primaryFramework?.version || '0.0.0',
    language: primaryLanguage?.name || 'JavaScript',
    dependencies,
    patterns,
  }
}

/**
 * Converts dependency analysis results to a simple name->version map
 */
function extractDependencyMap(report: AnalysisReport): Record<string, string> {
  const map: Record<string, string> = {}
  
  // Check if dependencies exist
  if (!report.dependencies) {
    console.warn('[StackExtractor] No dependencies found in report')
    return map
  }
  
  // Add all dependencies
  if (report.dependencies.dependencies) {
    report.dependencies.dependencies.forEach(dep => {
      map[dep.name] = dep.installedVersion
    })
  }
  
  // Add dev dependencies
  if (report.dependencies.devDependencies) {
    report.dependencies.devDependencies.forEach(dep => {
      map[dep.name] = dep.installedVersion
    })
  }
  
  return map
}

/**
 * Extracts unique pattern names from issues
 */
function extractPatternNames(report: AnalysisReport): string[] {
  const patternSet = new Set<string>()
  
  if (report.issues && Array.isArray(report.issues)) {
    report.issues.forEach(issue => {
      if (issue.category) {
        patternSet.add(issue.category)
      }
    })
  }
  
  return Array.from(patternSet)
}
