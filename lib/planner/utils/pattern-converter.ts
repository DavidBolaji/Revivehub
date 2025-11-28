import type { Issue } from '@/lib/scanner/types'
import type { DetectedPattern } from '@/lib/planner/types'

/**
 * Converts Issue[] from scanner to DetectedPattern[] for planner
 * Maps scanner issue format to planner pattern format
 */
export function convertIssuesToPatterns(issues: Issue[]): DetectedPattern[] {
  return issues.map((issue, index) => ({
    id: `pattern-${index}`,
    name: issue.title,
    category: mapCategoryToPatternCategory(issue.category),
    severity: mapSeverityToPatternSeverity(issue.severity),
    occurrences: 1,
    affectedFiles: issue.affectedFiles || [],
    description: issue.description,
    automated: false, // Conservative default - assume manual intervention needed
  }))
}

/**
 * Maps scanner issue categories to planner pattern categories
 */
function mapCategoryToPatternCategory(
  category: string
): 'dependency' | 'structural' | 'component' | 'documentation' {
  const categoryLower = category.toLowerCase()
  
  const categoryMap: Record<string, DetectedPattern['category']> = {
    'dependencies': 'dependency',
    'dependency': 'dependency',
    'architecture': 'structural',
    'structural': 'structural',
    'structure': 'structural',
    'components': 'component',
    'component': 'component',
    'documentation': 'documentation',
    'docs': 'documentation',
  }
  
  return categoryMap[categoryLower] || 'structural'
}

/**
 * Maps scanner severity levels to planner severity levels
 */
function mapSeverityToPatternSeverity(
  severity: 'critical' | 'warning' | 'info'
): 'low' | 'medium' | 'high' {
  const severityMap = {
    'info': 'low' as const,
    'warning': 'medium' as const,
    'critical': 'high' as const,
  }
  
  return severityMap[severity]
}

/**
 * Converts MCP pattern detection results to DetectedPattern format
 */
export function convertMCPPatterns(mcpResult: any): DetectedPattern[] {
  if (!mcpResult || !mcpResult.legacyPatterns) {
    return []
  }

  return mcpResult.legacyPatterns.map((pattern: any, index: number) => ({
    id: `mcp-pattern-${index}-${Date.now()}`, // Add timestamp to ensure uniqueness
    name: pattern.pattern || `MCP Pattern ${index + 1}`,
    category: mapCategoryToPatternCategory(pattern.pattern || 'structural'),
    severity: pattern.severity || 'medium',
    occurrences: pattern.occurrences || 1,
    affectedFiles: Array.isArray(pattern.examples) ? pattern.examples : [],
    description: pattern.description || 'Pattern detected by MCP analyzer',
    automated: false, // MCP patterns require manual review
  }))
}

/**
 * Converts PatternDetector results to DetectedPattern format
 */
export function convertPatternDetectorResults(patterns: any[]): DetectedPattern[] {
  if (!Array.isArray(patterns)) {
    return []
  }

  return patterns.map((pattern, index) => ({
    id: `detector-pattern-${index}-${Date.now()}`, // Add timestamp to ensure uniqueness
    name: pattern.name || `Detected Pattern ${index + 1}`,
    category: mapCategoryToPatternCategory(pattern.category || 'structural'),
    severity: pattern.severity || 'medium',
    occurrences: 1,
    affectedFiles: pattern.locations?.map((loc: any) => loc.file).filter(Boolean) || [],
    description: pattern.description || 'Pattern detected by AI analyzer',
    automated: pattern.autoFixable || false,
  }))
}

/**
 * Deduplicates patterns by name and category
 * Merges occurrences and affected files for duplicates
 */
export function deduplicatePatterns(patterns: DetectedPattern[]): DetectedPattern[] {
  const patternMap = new Map<string, DetectedPattern>()
  
  patterns.forEach(pattern => {
    const key = `${pattern.name}-${pattern.category}`
    
    if (patternMap.has(key)) {
      const existing = patternMap.get(key)!
      existing.occurrences += pattern.occurrences
      existing.affectedFiles = [
        ...new Set([...existing.affectedFiles, ...pattern.affectedFiles])
      ]
    } else {
      patternMap.set(key, { ...pattern })
    }
  })
  
  return Array.from(patternMap.values())
}
