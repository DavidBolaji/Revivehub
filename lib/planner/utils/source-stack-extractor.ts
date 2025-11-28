/**
 * Source stack extraction utilities for migration planning
 * These functions are code-split to reduce initial bundle size
 */

import type { AnalysisReport } from '@/lib/scanner/types'
import type { SourceStack } from '@/lib/planner/types'

/**
 * Extracts source stack information from an analysis report
 */
export function extractSourceStack(report: AnalysisReport): SourceStack {
  const primaryFramework = report.frameworks.frontend[0] || report.frameworks.backend[0]
  const primaryLanguage = report.languages.primaryLanguage
  
  return {
    framework: primaryFramework?.name || 'Unknown',
    version: primaryFramework?.version || '0.0.0',
    language: primaryLanguage?.name || 'JavaScript',
    dependencies: extractDependencyMap(report.dependencies),
    patterns: extractPatternNames(report.issues)
  }
}

/**
 * Extracts dependency map from analysis results
 */
export function extractDependencyMap(deps: AnalysisReport['dependencies']): Record<string, string> {
  const map: Record<string, string> = {}
  deps.dependencies.forEach(dep => {
    map[dep.name] = dep.installedVersion
  })
  return map
}

/**
 * Extracts pattern names from issues
 */
export function extractPatternNames(issues: AnalysisReport['issues']): string[] {
  return issues.map(issue => issue.category)
}
