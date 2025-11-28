/**
 * Pattern conversion utilities for migration planning
 * These functions are code-split to reduce initial bundle size
 */

import type { DetectedPattern } from '@/lib/planner/types'

/**
 * Converts MCP pattern detection results to DetectedPattern format
 */
export function convertMCPPatterns(detection: {
  legacyPatterns?: Array<{
    pattern: string
    description: string
    severity: string
    occurrences?: number
  }>
}): DetectedPattern[] {
  if (!detection.legacyPatterns) return []
  
  return detection.legacyPatterns.map((pattern, index: number) => ({
    id: `mcp-pattern-${index}`,
    name: pattern.pattern,
    category: 'structural' as const,
    severity: pattern.severity === 'high' ? 'high' as const : 
              pattern.severity === 'low' ? 'low' as const : 'medium' as const,
    occurrences: pattern.occurrences || 1,
    affectedFiles: [],
    description: pattern.description,
    automated: false,
  }))
}

/**
 * Converts PatternDetector results to planner DetectedPattern format
 */
export function convertPatternDetectorResults(patterns: Array<{
  name?: string
  category: string
  severity: 'low' | 'medium' | 'high'
  locations?: Array<{ file: string }>
  description: string
  autoFixable?: boolean
}>): DetectedPattern[] {
  return patterns.map((pattern, index) => ({
    id: `detector-pattern-${index}`,
    name: pattern.name || pattern.category,
    category: mapPatternCategory(pattern.category),
    severity: pattern.severity,
    occurrences: pattern.locations?.length || 1,
    affectedFiles: pattern.locations?.map((loc) => loc.file) || [],
    description: pattern.description,
    automated: pattern.autoFixable || false,
  }))
}

/**
 * Maps pattern detector categories to planner categories
 */
export function mapPatternCategory(category: string): 'dependency' | 'structural' | 'component' | 'documentation' {
  const categoryMap: Record<string, DetectedPattern['category']> = {
    'dependencies': 'dependency',
    'react': 'component',
    'nextjs': 'structural',
    'vue': 'component',
    'typescript': 'structural',
    'async': 'structural',
    'modules': 'structural',
  }
  
  return categoryMap[category] || 'structural'
}
