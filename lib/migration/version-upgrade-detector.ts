/**
 * Version Upgrade Detector
 * 
 * Detects version-specific violations when upgrading frameworks.
 * Scans codebase for deprecated APIs, breaking changes, and incompatible patterns.
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import type {
  RepositoryFile,
  ViolationReport,
  Violation,
  BreakingChange,
  Deprecation,
  FixSuggestion,
} from '@/types/migration'
import { loadFrameworkRules } from './framework-rules'

export class VersionUpgradeDetector {
  private breakingChanges: BreakingChange[] = []
  private deprecations: Deprecation[] = []

  /**
   * Load breaking changes and deprecations between versions
   */
  async loadBreakingChanges(
    framework: string,
    fromVersion: string,
    toVersion: string
  ): Promise<BreakingChange[]> {
    try {
      const rules = await loadFrameworkRules(framework)
      
      // Find the version rules for the target version
      const versionRules = rules.versions.find(v => v.version === toVersion)
      
      if (!versionRules) {
        console.warn(`No version rules found for ${framework} ${toVersion}`)
        return []
      }
      
      // Filter breaking changes and deprecations relevant to the version range
      this.breakingChanges = versionRules.breakingChanges || []
      this.deprecations = versionRules.deprecations || []

      // Filter deprecations that apply to this version range
      const relevantDeprecations = this.deprecations.filter(dep => {
        return this.isDeprecationRelevant(dep, fromVersion, toVersion)
      })

      // Convert deprecations to breaking changes format
      const deprecationBreakingChanges: BreakingChange[] = relevantDeprecations.map(dep => ({
        id: dep.id,
        description: `Deprecated: ${dep.deprecated}. Use ${dep.replacement} instead.`,
        affectedAPIs: [dep.deprecated],
        migrationPath: `Replace ${dep.deprecated} with ${dep.replacement}`,
        autoFixable: true,
      }))

      const allBreakingChanges = [...this.breakingChanges, ...deprecationBreakingChanges]
      
      return allBreakingChanges
    } catch (error) {
      console.error(`Failed to load breaking changes for ${framework}:`, error)
      return []
    }
  }

  /**
   * Check if a deprecation is relevant to the version range
   */
  private isDeprecationRelevant(
    deprecation: Deprecation,
    fromVersion: string,
    toVersion: string
  ): boolean {
    // Simple version comparison - in production, use semver library
    const deprecatedInVersion = deprecation.version
    const removedInVersion = deprecation.removalVersion

    // If deprecated in or before fromVersion, it's relevant
    if (this.compareVersions(deprecatedInVersion, fromVersion) <= 0) {
      // If removal version exists and is after toVersion, it's still usable
      if (removedInVersion && this.compareVersions(removedInVersion, toVersion) > 0) {
        return false
      }
      return true
    }

    return false
  }

  /**
   * Simple version comparison (returns -1, 0, or 1)
   * In production, use semver library for proper comparison
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0

      if (p1 < p2) return -1
      if (p1 > p2) return 1
    }

    return 0
  }

  /**
   * Scan codebase for violations
   */
  async scanCodebase(
    files: RepositoryFile[],
    breakingChanges: BreakingChange[]
  ): Promise<Map<string, Violation[]>> {
    const violationsByFile = new Map<string, Violation[]>()

    for (const file of files) {
      // Only scan JavaScript/TypeScript files
      if (!this.isScannableFile(file.path)) {
        continue
      }

      try {
        const violations = await this.scanFile(file, breakingChanges)
        if (violations.length > 0) {
          violationsByFile.set(file.path, violations)
        }
      } catch (error) {
        console.error(`Failed to scan file ${file.path}:`, error)
        // Continue with other files
      }
    }

    return violationsByFile
  }

  /**
   * Check if file should be scanned
   */
  private isScannableFile(filePath: string): boolean {
    const scannableExtensions = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']
    return scannableExtensions.some(ext => filePath.endsWith(ext))
  }

  /**
   * Scan a single file for violations
   */
  private async scanFile(
    file: RepositoryFile,
    breakingChanges: BreakingChange[]
  ): Promise<Violation[]> {
    const violations: Violation[] = []

    try {
      // Parse the file
      const ast = parse(file.content, {
        sourceType: 'module',
        plugins: [
          'jsx',
          'typescript',
          'decorators-legacy',
          'classProperties',
          'optionalChaining',
          'nullishCoalescingOperator',
        ],
      })

      // Traverse AST and detect violations
      traverse(ast, {
        // Check import declarations
        ImportDeclaration: (path) => {
          const importSource = path.node.source.value

          for (const breakingChange of breakingChanges) {
            for (const affectedAPI of breakingChange.affectedAPIs) {
              if (importSource.includes(affectedAPI) || affectedAPI.includes(importSource)) {
                violations.push({
                  id: breakingChange.id,
                  type: 'breaking-change',
                  severity: 'error',
                  line: path.node.loc?.start.line || 0,
                  column: path.node.loc?.start.column || 0,
                  message: breakingChange.description,
                  suggestion: breakingChange.migrationPath,
                  autoFixable: breakingChange.autoFixable,
                  filePath: file.path,
                })
              }
            }
          }
        },

        // Check function calls and member expressions
        CallExpression: (path) => {
          const calleeName = this.getCalleeName(path.node.callee)

          for (const breakingChange of breakingChanges) {
            for (const affectedAPI of breakingChange.affectedAPIs) {
              if (calleeName && calleeName.includes(affectedAPI)) {
                violations.push({
                  id: breakingChange.id,
                  type: 'breaking-change',
                  severity: 'error',
                  line: path.node.loc?.start.line || 0,
                  column: path.node.loc?.start.column || 0,
                  message: `Usage of deprecated API: ${affectedAPI}`,
                  suggestion: breakingChange.migrationPath,
                  autoFixable: breakingChange.autoFixable,
                  filePath: file.path,
                })
              }
            }
          }
        },

        // Check JSX elements
        JSXIdentifier: (path) => {
          const elementName = path.node.name

          for (const breakingChange of breakingChanges) {
            for (const affectedAPI of breakingChange.affectedAPIs) {
              if (elementName === affectedAPI || affectedAPI.includes(elementName)) {
                violations.push({
                  id: breakingChange.id,
                  type: 'breaking-change',
                  severity: 'error',
                  line: path.node.loc?.start.line || 0,
                  column: path.node.loc?.start.column || 0,
                  message: `Usage of deprecated component: ${elementName}`,
                  suggestion: breakingChange.migrationPath,
                  autoFixable: breakingChange.autoFixable,
                  filePath: file.path,
                })
              }
            }
          }
        },
      })
    } catch (error) {
      console.error(`Failed to parse file ${file.path}:`, error)
      // Return empty violations array for unparseable files
    }

    return violations
  }

  /**
   * Extract callee name from various node types
   */
  private getCalleeName(callee: any): string | null {
    if (callee.type === 'Identifier') {
      return callee.name
    }
    if (callee.type === 'MemberExpression') {
      const object = this.getCalleeName(callee.object)
      const property = callee.property.name || callee.property.value
      return object ? `${object}.${property}` : property
    }
    return null
  }

  /**
   * Detect violations and generate report
   */
  async detectViolations(
    repository: RepositoryFile[],
    sourceVersion: string,
    targetVersion: string,
    framework: string
  ): Promise<ViolationReport> {
    // Load breaking changes
    const breakingChanges = await this.loadBreakingChanges(
      framework,
      sourceVersion,
      targetVersion
    )

    // Scan codebase
    const violationsByFile = await this.scanCodebase(repository, breakingChanges)

    // Organize violations by type
    const violationsByType = new Map<string, Violation[]>()
    let totalViolations = 0
    let autoFixableCount = 0
    let manualReviewCount = 0

    for (const violations of violationsByFile.values()) {
      for (const violation of violations) {
        totalViolations++

        if (violation.autoFixable) {
          autoFixableCount++
        } else {
          manualReviewCount++
        }

        const typeKey = violation.type
        if (!violationsByType.has(typeKey)) {
          violationsByType.set(typeKey, [])
        }
        violationsByType.get(typeKey)!.push(violation)
      }
    }

    // Generate summary
    const summary = this.generateSummary(
      totalViolations,
      autoFixableCount,
      manualReviewCount,
      violationsByFile.size
    )

    return {
      totalViolations,
      violationsByFile,
      violationsByType,
      autoFixableCount,
      manualReviewCount,
      summary,
    }
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    total: number,
    autoFixable: number,
    manualReview: number,
    filesAffected: number
  ): string {
    if (total === 0) {
      return 'No violations found. Your codebase is compatible with the target version.'
    }

    const parts = [
      `Found ${total} violation${total !== 1 ? 's' : ''} across ${filesAffected} file${filesAffected !== 1 ? 's' : ''}.`,
    ]

    if (autoFixable > 0) {
      parts.push(`${autoFixable} can be automatically fixed.`)
    }

    if (manualReview > 0) {
      parts.push(`${manualReview} require manual review.`)
    }

    return parts.join(' ')
  }

  /**
   * Generate fix suggestions for violations
   */
  async generateFixSuggestions(violations: Violation[]): Promise<FixSuggestion[]> {
    const suggestions: FixSuggestion[] = []

    for (const violation of violations) {
      const suggestion: FixSuggestion = {
        violationId: violation.id,
        description: violation.suggestion,
        autoFixable: violation.autoFixable,
      }

      if (violation.autoFixable) {
        // Generate fix code based on the violation type
        suggestion.fixCode = this.generateFixCode(violation)
      } else {
        // Provide manual steps
        suggestion.manualSteps = this.generateManualSteps(violation)
      }

      suggestions.push(suggestion)
    }

    return suggestions
  }

  /**
   * Generate fix code for auto-fixable violations
   */
  private generateFixCode(violation: Violation): string {
    // Find the corresponding deprecation
    const deprecation = this.deprecations.find(d => d.id === violation.id)

    if (deprecation) {
      return `// Replace: ${deprecation.deprecated}\n// With: ${deprecation.replacement}`
    }

    return `// Apply fix: ${violation.suggestion}`
  }

  /**
   * Generate manual steps for complex violations
   */
  private generateManualSteps(violation: Violation): string[] {
    return [
      `Review the code at line ${violation.line}`,
      violation.suggestion,
      'Test the changes thoroughly',
      'Update any related documentation',
    ]
  }
}

/**
 * Singleton instance
 */
let detectorInstance: VersionUpgradeDetector | null = null

/**
 * Get or create detector instance
 */
export function getVersionUpgradeDetector(): VersionUpgradeDetector {
  if (!detectorInstance) {
    detectorInstance = new VersionUpgradeDetector()
  }
  return detectorInstance
}

/**
 * Reset detector instance (useful for testing)
 */
export function resetVersionUpgradeDetector(): void {
  detectorInstance = null
}
