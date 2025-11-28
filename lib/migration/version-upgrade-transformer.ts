/**
 * Version Upgrade Transformer
 * 
 * Applies version upgrade fixes to code using AST transformations.
 * Handles auto-fixing of violations and dependency updates.
 */

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import type {
  Violation,
  FixSuggestion,
  ViolationReport,
} from '@/types/migration'
import type { TransformResult } from '@/types/transformer'

export class VersionUpgradeTransformer {
  /**
   * Auto-fix violations in files
   */
  async autoFixViolations(
    files: Map<string, string>,
    violations: Map<string, Violation[]>
  ): Promise<Map<string, TransformResult>> {
    const results = new Map<string, TransformResult>()

    for (const [filePath, fileContent] of files.entries()) {
      const fileViolations = violations.get(filePath)
      
      if (!fileViolations || fileViolations.length === 0) {
        continue
      }

      // Only process auto-fixable violations
      const autoFixableViolations = fileViolations.filter(v => v.autoFixable)
      
      if (autoFixableViolations.length === 0) {
        continue
      }

      try {
        const transformedCode = await this.applyFixes(fileContent, autoFixableViolations)
        const diff = this.generateDiff(fileContent, transformedCode)
        
        results.set(filePath, {
          success: true,
          code: transformedCode,
          diff: {
            original: fileContent,
            transformed: transformedCode,
            unified: diff,
            visual: [],
            characterLevel: [],
          },
          metadata: {
            transformationType: 'version-upgrade',
            filesModified: [filePath],
            linesAdded: transformedCode.split('\n').length - fileContent.split('\n').length,
            linesRemoved: 0,
            confidenceScore: 0.9,
            riskScore: 0.1,
            requiresManualReview: false,
            estimatedTimeSaved: '5 minutes',
            transformationsApplied: [`Fixed ${autoFixableViolations.length} violations`],
          },
          errors: [],
          warnings: [],
        })
      } catch (error) {
        console.error(`Failed to fix violations in ${filePath}:`, error)
        results.set(filePath, {
          success: false,
          metadata: {
            transformationType: 'version-upgrade',
            filesModified: [],
            linesAdded: 0,
            linesRemoved: 0,
            confidenceScore: 0,
            riskScore: 1.0,
            requiresManualReview: true,
            estimatedTimeSaved: '0 minutes',
            transformationsApplied: [],
          },
          errors: [{
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'TRANSFORM_ERROR',
            suggestions: ['Review the code manually', 'Check for syntax errors'],
            severity: 'error',
          }],
          warnings: [`Failed to apply fixes: ${error instanceof Error ? error.message : 'Unknown error'}`],
        })
      }
    }

    return results
  }

  /**
   * Apply fixes to code
   */
  private async applyFixes(
    code: string,
    violations: Violation[]
  ): Promise<string> {
    try {
      // Parse the code
      const ast = parse(code, {
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

      // Group violations by line for efficient processing
      const violationsByLine = new Map<number, Violation[]>()
      for (const violation of violations) {
        if (!violationsByLine.has(violation.line)) {
          violationsByLine.set(violation.line, [])
        }
        violationsByLine.get(violation.line)!.push(violation)
      }

      // Apply transformations
      traverse(ast, {
        // Fix import declarations
        ImportDeclaration: (path) => {
          const line = path.node.loc?.start.line
          if (!line || !violationsByLine.has(line)) return

          const lineViolations = violationsByLine.get(line)!
          for (const violation of lineViolations) {
            this.fixImportDeclaration(path, violation)
          }
        },

        // Fix function calls
        CallExpression: (path) => {
          const line = path.node.loc?.start.line
          if (!line || !violationsByLine.has(line)) return

          const lineViolations = violationsByLine.get(line)!
          for (const violation of lineViolations) {
            this.fixCallExpression(path, violation)
          }
        },

        // Fix JSX elements
        JSXElement: (path) => {
          const line = path.node.loc?.start.line
          if (!line || !violationsByLine.has(line)) return

          const lineViolations = violationsByLine.get(line)!
          for (const violation of lineViolations) {
            this.fixJSXElement(path, violation)
          }
        },
      })

      // Generate code
      const output = generate(ast, {
        retainLines: true,
        comments: true,
      })

      return output.code
    } catch (error) {
      console.error('Failed to apply fixes:', error)
      throw error
    }
  }

  /**
   * Fix import declaration
   */
  private fixImportDeclaration(path: any, violation: Violation): void {
    // Extract old and new import from suggestion
    const suggestion = violation.suggestion
    const replaceMatch = suggestion.match(/Replace (.+) with (.+)/)
    
    if (replaceMatch) {
      const oldImport = replaceMatch[1].trim()
      const newImport = replaceMatch[2].trim()
      
      if (path.node.source.value.includes(oldImport)) {
        path.node.source.value = path.node.source.value.replace(oldImport, newImport)
      }
    }
  }

  /**
   * Fix call expression
   */
  private fixCallExpression(path: any, violation: Violation): void {
    // This is a simplified fix - in production, would need more sophisticated logic
    const suggestion = violation.suggestion
    
    // Example: Replace getServerSideProps with server components
    if (suggestion.includes('getServerSideProps')) {
      // Add comment suggesting manual migration
      path.addComment('leading', ' TODO: Migrate to server components')
    }
  }

  /**
   * Fix JSX element
   */
  private fixJSXElement(path: any, violation: Violation): void {
    const suggestion = violation.suggestion
    const replaceMatch = suggestion.match(/Replace (.+) with (.+)/)
    
    if (replaceMatch && path.node.openingElement) {
      const oldName = replaceMatch[1].trim()
      const newName = replaceMatch[2].trim()
      
      const elementName = path.node.openingElement.name
      if (elementName.type === 'JSXIdentifier' && elementName.name === oldName) {
        elementName.name = newName
        
        // Also update closing element if it exists
        if (path.node.closingElement) {
          path.node.closingElement.name.name = newName
        }
      }
    }
  }

  /**
   * Apply a single fix to code
   */
  async applyFix(
    code: string,
    violation: Violation,
    fix: FixSuggestion
  ): Promise<string> {
    if (!fix.autoFixable || !fix.fixCode) {
      return code
    }

    return this.applyFixes(code, [violation])
  }

  /**
   * Update dependencies in package.json
   */
  async updateDependencies(
    packageJson: string,
    targetVersion: string
  ): Promise<string> {
    try {
      const pkg = JSON.parse(packageJson)
      
      // Update main framework dependency
      // This is a simplified version - in production, would need to handle
      // multiple dependencies and their version constraints
      
      if (pkg.dependencies) {
        for (const dep of Object.keys(pkg.dependencies)) {
          if (this.isFrameworkDependency(dep)) {
            pkg.dependencies[dep] = targetVersion
          }
        }
      }

      if (pkg.devDependencies) {
        for (const dep of Object.keys(pkg.devDependencies)) {
          if (this.isFrameworkDependency(dep)) {
            pkg.devDependencies[dep] = targetVersion
          }
        }
      }

      return JSON.stringify(pkg, null, 2)
    } catch (error) {
      console.error('Failed to update dependencies:', error)
      throw error
    }
  }

  /**
   * Check if dependency is a framework dependency
   */
  private isFrameworkDependency(dep: string): boolean {
    const frameworkDeps = [
      'next',
      'react',
      'vue',
      'nuxt',
      '@angular/core',
      'express',
      'fastapi',
      'django',
      'flask',
    ]
    
    return frameworkDeps.some(framework => dep.includes(framework))
  }

  /**
   * Helper to get violations fixed count from metadata
   */
  private getViolationsFixed(metadata: any): number {
    // Extract from transformationsApplied
    const applied = metadata.transformationsApplied || []
    for (const item of applied) {
      const match = item.match(/Fixed (\d+) violations/)
      if (match) {
        return parseInt(match[1], 10)
      }
    }
    return 0
  }

  /**
   * Generate migration guide
   */
  async generateMigrationGuide(
    violations: ViolationReport,
    fixes: Map<string, TransformResult>
  ): Promise<string> {
    const lines: string[] = []
    
    lines.push('# Version Upgrade Migration Guide')
    lines.push('')
    lines.push('## Summary')
    lines.push('')
    lines.push(violations.summary)
    lines.push('')
    
    // Auto-fixed violations
    if (violations.autoFixableCount > 0) {
      lines.push('## Automatically Fixed')
      lines.push('')
      lines.push(`${violations.autoFixableCount} violations were automatically fixed:`)
      lines.push('')
      
      for (const [filePath, result] of fixes.entries()) {
        const violationsFixed = this.getViolationsFixed(result.metadata)
        if (violationsFixed > 0) {
          lines.push(`- **${filePath}**: ${violationsFixed} fix(es) applied`)
        }
      }
      lines.push('')
    }
    
    // Manual review required
    if (violations.manualReviewCount > 0) {
      lines.push('## Manual Review Required')
      lines.push('')
      lines.push(`${violations.manualReviewCount} violations require manual review:`)
      lines.push('')
      
      for (const [filePath, fileViolations] of violations.violationsByFile.entries()) {
        const manualViolations = fileViolations.filter(v => !v.autoFixable)
        
        if (manualViolations.length > 0) {
          lines.push(`### ${filePath}`)
          lines.push('')
          
          for (const violation of manualViolations) {
            lines.push(`- **Line ${violation.line}**: ${violation.message}`)
            lines.push(`  - Suggestion: ${violation.suggestion}`)
          }
          lines.push('')
        }
      }
    }
    
    // Before/After Examples
    if (fixes.size > 0) {
      lines.push('## Before/After Examples')
      lines.push('')
      
      let exampleCount = 0
      for (const [filePath, result] of fixes.entries()) {
        if (exampleCount >= 3) break // Limit to 3 examples
        
        if (result.diff && result.diff.unified) {
          lines.push(`### ${filePath}`)
          lines.push('')
          lines.push('```diff')
          lines.push(result.diff.unified)
          lines.push('```')
          lines.push('')
          exampleCount++
        }
      }
    }
    
    // Next Steps
    lines.push('## Next Steps')
    lines.push('')
    lines.push('1. Review all automatically applied fixes')
    lines.push('2. Address violations requiring manual review')
    lines.push('3. Run tests to ensure functionality is preserved')
    lines.push('4. Update documentation if needed')
    lines.push('5. Commit changes with descriptive message')
    lines.push('')
    
    return lines.join('\n')
  }

  /**
   * Generate diff between original and transformed code
   */
  private generateDiff(original: string, transformed: string): string {
    const originalLines = original.split('\n')
    const transformedLines = transformed.split('\n')
    
    const diff: string[] = []
    const maxLines = Math.max(originalLines.length, transformedLines.length)
    
    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i]
      const transLine = transformedLines[i]
      
      if (origLine !== transLine) {
        if (origLine !== undefined) {
          diff.push(`- ${origLine}`)
        }
        if (transLine !== undefined) {
          diff.push(`+ ${transLine}`)
        }
      }
    }
    
    return diff.join('\n')
  }
}

/**
 * Singleton instance
 */
let transformerInstance: VersionUpgradeTransformer | null = null

/**
 * Get or create transformer instance
 */
export function getVersionUpgradeTransformer(): VersionUpgradeTransformer {
  if (!transformerInstance) {
    transformerInstance = new VersionUpgradeTransformer()
  }
  return transformerInstance
}

/**
 * Reset transformer instance (useful for testing)
 */
export function resetVersionUpgradeTransformer(): void {
  transformerInstance = null
}
