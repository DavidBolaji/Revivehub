/**
 * Pattern Detection System - Main Export
 * 
 * This module provides a comprehensive pattern detection system for identifying
 * legacy code patterns and suggesting modern alternatives across multiple languages
 * and frameworks.
 */

export * from './rules'
export { REACT_PATTERNS } from './react-patterns'
export { NEXTJS_PATTERNS } from './nextjs-patterns'
export { VUE_PATTERNS } from './vue-patterns'
export { PYTHON_PATTERNS } from './python-patterns'

import type { PatternRule } from './rules'
import { getAllPatternRules, detectPatterns } from './rules'

/**
 * Pattern detection result with metadata
 */
export interface PatternDetectionResult {
  patterns: PatternRule[]
  summary: {
    total: number
    byCategory: Record<string, number>
    byComplexity: Record<string, number>
    totalEstimatedTime: string
    autoFixableCount: number
  }
}

/**
 * Detect patterns in code and return detailed results
 */
export function analyzeCode(
  code: string,
  language: string
): PatternDetectionResult {
  const patterns = detectPatterns(code, language)
  
  // Calculate summary statistics
  const byCategory: Record<string, number> = {}
  const byComplexity: Record<string, number> = {}
  let autoFixableCount = 0
  
  patterns.forEach((pattern) => {
    byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1
    byComplexity[pattern.complexity] = (byComplexity[pattern.complexity] || 0) + 1
    if (pattern.autoFixable) autoFixableCount++
  })
  
  // Estimate total time (rough calculation)
  const totalMinutes = patterns.reduce((sum, pattern) => {
    const timeStr = pattern.estimatedTime
    const match = timeStr.match(/(\d+)/)
    return sum + (match ? parseInt(match[1]) : 30)
  }, 0)
  
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const totalEstimatedTime = hours > 0 
    ? `${hours}h ${minutes}m` 
    : `${minutes}m`
  
  return {
    patterns,
    summary: {
      total: patterns.length,
      byCategory,
      byComplexity,
      totalEstimatedTime,
      autoFixableCount,
    },
  }
}

/**
 * Get pattern recommendations sorted by priority
 */
export function getPrioritizedPatterns(
  patterns: PatternRule[]
): PatternRule[] {
  // Priority order: security > performance > modernization > style
  const priorityOrder = {
    security: 4,
    performance: 3,
    modernization: 2,
    style: 1,
  }
  
  // Complexity weight: low = 3, medium = 2, high = 1
  const complexityWeight = {
    low: 3,
    medium: 2,
    high: 1,
  }
  
  return [...patterns].sort((a, b) => {
    // First sort by category priority
    const priorityDiff = priorityOrder[b.category] - priorityOrder[a.category]
    if (priorityDiff !== 0) return priorityDiff
    
    // Then by auto-fixable (auto-fixable first)
    if (a.autoFixable !== b.autoFixable) {
      return a.autoFixable ? -1 : 1
    }
    
    // Then by complexity (easier first)
    return complexityWeight[b.complexity] - complexityWeight[a.complexity]
  })
}

/**
 * Filter patterns by criteria
 */
export function filterPatterns(
  patterns: PatternRule[],
  criteria: {
    category?: string
    complexity?: string
    autoFixable?: boolean
    framework?: string
    tags?: string[]
  }
): PatternRule[] {
  return patterns.filter((pattern) => {
    if (criteria.category && pattern.category !== criteria.category) {
      return false
    }
    if (criteria.complexity && pattern.complexity !== criteria.complexity) {
      return false
    }
    if (criteria.autoFixable !== undefined && pattern.autoFixable !== criteria.autoFixable) {
      return false
    }
    if (criteria.framework && pattern.framework !== criteria.framework) {
      return false
    }
    if (criteria.tags && !criteria.tags.some(tag => pattern.tags.includes(tag))) {
      return false
    }
    return true
  })
}

/**
 * Get pattern by ID
 */
export function getPatternById(id: string): PatternRule | undefined {
  return getAllPatternRules().find((pattern) => pattern.id === id)
}

/**
 * Get all available languages
 */
export function getAvailableLanguages(): string[] {
  const languages = new Set<string>()
  getAllPatternRules().forEach((pattern) => {
    languages.add(pattern.language)
  })
  return Array.from(languages).sort()
}

/**
 * Get all available frameworks
 */
export function getAvailableFrameworks(): string[] {
  const frameworks = new Set<string>()
  getAllPatternRules().forEach((pattern) => {
    if (pattern.framework) {
      frameworks.add(pattern.framework)
    }
  })
  return Array.from(frameworks).sort()
}

/**
 * Get all available tags
 */
export function getAvailableTags(): string[] {
  const tags = new Set<string>()
  getAllPatternRules().forEach((pattern) => {
    pattern.tags.forEach(tag => tags.add(tag))
  })
  return Array.from(tags).sort()
}
