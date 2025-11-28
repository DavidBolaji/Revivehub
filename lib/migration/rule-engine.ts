/**
 * Rule Engine for Phase 3 Code Migration
 * Loads and applies migration rules, validates transformations, and detects violations
 * Requirements: 5.2, 5.5, 11.5, 11.6
 */

import { parse as babelParse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import type {
  MigrationSpecification,
  MigrationRules,
  RuleValidationResult,
  Violation,
  BreakingChange,
  Deprecation,
} from '@/types/migration'

/**
 * Rule Engine
 * Handles loading and applying migration rules, validation, and violation detection
 */
export class RuleEngine {
  private rules: MigrationRules | null = null
  private parserConfig: any = {
    sourceType: 'module' as const,
    plugins: [
      'jsx',
      'typescript',
      'decorators-legacy',
      'classProperties',
      'optionalChaining',
      'nullishCoalescingOperator',
    ],
  }

  /**
   * Load rules from migration specification
   * Requirements: 5.2
   */
  loadRules(spec: MigrationSpecification): void {
    this.rules = spec.rules

    // Validate rules structure
    this.validateRulesStructure(spec.rules)
  }

  /**
   * Validate rules structure
   */
  private validateRulesStructure(rules: MigrationRules): void {
    if (!Array.isArray(rules.mustPreserve)) {
      throw new Error('Invalid rules: mustPreserve must be an array')
    }
    if (!Array.isArray(rules.mustTransform)) {
      throw new Error('Invalid rules: mustTransform must be an array')
    }
    if (!Array.isArray(rules.mustRemove)) {
      throw new Error('Invalid rules: mustRemove must be an array')
    }
    if (!Array.isArray(rules.mustRefactor)) {
      throw new Error('Invalid rules: mustRefactor must be an array')
    }
    if (!Array.isArray(rules.breakingChanges)) {
      throw new Error('Invalid rules: breakingChanges must be an array')
    }
    if (!Array.isArray(rules.deprecations)) {
      throw new Error('Invalid rules: deprecations must be an array')
    }
  }

  /**
   * Get loaded rules
   */
  getRules(): MigrationRules | null {
    return this.rules
  }

  /**
   * Validate code against migration rules
   * Requirements: 5.5
   */
  validateAgainstRules(
    code: string,
    filePath: string = 'unknown'
  ): RuleValidationResult {
    if (!this.rules) {
      throw new Error('Rules not loaded. Call loadRules() first.')
    }

    const violations: Violation[] = []
    const warnings: string[] = []

    try {
      // Parse code to AST
      const ast = babelParse(code, this.parserConfig)

      // Check mustPreserve rules
      this.checkMustPreserveRules(ast, code, violations, warnings)

      // Check mustTransform rules
      this.checkMustTransformRules(ast, code, violations, warnings)

      // Check mustRemove rules
      this.checkMustRemoveRules(ast, code, violations, warnings, filePath)

      // Check for breaking changes
      this.checkBreakingChanges(ast, code, violations, filePath)

      // Check for deprecations
      this.checkDeprecations(ast, code, violations, filePath)

      return {
        valid: violations.filter(v => v.severity === 'error').length === 0,
        violations,
        warnings,
      }
    } catch (error: any) {
      // If parsing fails, return syntax error
      return {
        valid: false,
        violations: [
          {
            id: 'syntax-error',
            type: 'incompatibility',
            severity: 'error',
            line: 1,
            column: 1,
            message: `Syntax error: ${error.message}`,
            suggestion: 'Fix syntax errors before migration',
            autoFixable: false,
            filePath,
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * Check mustPreserve rules (business logic, behavior)
   * Requirements: 5.5
   */
  private checkMustPreserveRules(
    ast: t.File,
    _code: string,
    _violations: Violation[],
    warnings: string[]
  ): void {
    if (!this.rules) return

    // Track if critical patterns are preserved
    let hasBusinessLogic = false
    let hasErrorHandling = false

    traverse(ast, {
      // Check for business logic patterns
      FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
        if (path.node.body.body.length > 0) {
          hasBusinessLogic = true
        }
      },

      ArrowFunctionExpression: (path: NodePath<t.ArrowFunctionExpression>) => {
        if (t.isBlockStatement(path.node.body) && path.node.body.body.length > 0) {
          hasBusinessLogic = true
        }
      },

      // Check for error handling
      TryStatement: () => {
        hasErrorHandling = true
      },

      CatchClause: () => {
        hasErrorHandling = true
      },
    })

    // Add warnings if critical patterns might be affected
    if (hasBusinessLogic) {
      warnings.push('Business logic detected - ensure behavior is preserved after transformation')
    }

    if (hasErrorHandling) {
      warnings.push('Error handling detected - verify error handling logic is preserved')
    }
  }

  /**
   * Check mustTransform rules are applied
   * Requirements: 5.5
   */
  private checkMustTransformRules(
    ast: t.File,
    _code: string,
    violations: Violation[],
    _warnings: string[]
  ): void {
    if (!this.rules) return

    // Check if imports need transformation
    if (this.rules.mustTransform.includes('Import statements')) {
      this.checkImportTransformations(ast, violations)
    }

    // Check if routing needs transformation
    if (this.rules.mustTransform.includes('Routing configuration')) {
      this.checkRoutingTransformations(ast, violations)
    }

    // Check if build configuration needs transformation
    if (this.rules.mustTransform.includes('Build configuration')) {
      // This would be checked at file level, not AST level
      // Add warning for manual check
    }
  }

  /**
   * Check if imports have been properly transformed
   */
  private checkImportTransformations(
    ast: t.File,
    violations: Violation[]
  ): void {
    traverse(ast, {
      ImportDeclaration: (path: NodePath<t.ImportDeclaration>) => {
        const source = path.node.source.value

        // Check for old framework imports that should be transformed
        const oldImports = [
          'react-router-dom',
          'react-router',
          '@reach/router',
          'react-helmet',
          'react-helmet-async',
        ]

        if (oldImports.includes(source)) {
          violations.push({
            id: `untransformed-import-${source}`,
            type: 'incompatibility',
            severity: 'error',
            line: path.node.loc?.start.line || 0,
            column: path.node.loc?.start.column || 0,
            message: `Import from '${source}' should be transformed to target framework equivalent`,
            suggestion: `Transform import to use target framework's routing/navigation`,
            autoFixable: true,
          })
        }
      },
    })
  }

  /**
   * Check if routing has been properly transformed
   */
  private checkRoutingTransformations(
    ast: t.File,
    violations: Violation[]
  ): void {
    traverse(ast, {
      JSXElement: (path: NodePath<t.JSXElement>) => {
        const openingElement = path.node.openingElement

        if (t.isJSXIdentifier(openingElement.name)) {
          const name = openingElement.name.name

          // Check for old routing components
          const oldComponents = ['Route', 'Routes', 'BrowserRouter', 'Navigate']

          if (oldComponents.includes(name)) {
            violations.push({
              id: `untransformed-routing-${name}`,
              type: 'incompatibility',
              severity: 'error',
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0,
              message: `Component <${name}> should be transformed to target framework routing`,
              suggestion: `Replace with target framework's routing components`,
              autoFixable: false,
            })
          }
        }
      },
    })
  }

  /**
   * Check mustRemove rules are followed
   * Requirements: 5.5
   */
  private checkMustRemoveRules(
    ast: t.File,
    _code: string,
    violations: Violation[],
    _warnings: string[],
    filePath: string
  ): void {
    if (!this.rules) return

    // Check for dependencies that should be removed
    traverse(ast, {
      ImportDeclaration: (path: NodePath<t.ImportDeclaration>) => {
        const source = path.node.source.value

        // Check against mustRemove rules
        for (const rule of this.rules!.mustRemove) {
          if (rule.toLowerCase().includes('dependencies') && this.shouldRemoveImport(source, rule)) {
            violations.push({
              id: `should-remove-${source}`,
              type: 'incompatibility',
              severity: 'warning',
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0,
              message: `Import '${source}' should be removed according to migration rules`,
              suggestion: `Remove this import and replace with target framework equivalent`,
              autoFixable: true,
              filePath,
            })
          }
        }
      },
    })
  }

  /**
   * Check if import should be removed based on rule
   */
  private shouldRemoveImport(source: string, rule: string): boolean {
    const ruleLower = rule.toLowerCase()

    // Check for react-router
    if (ruleLower.includes('react-router') && source.includes('react-router')) {
      return true
    }

    // Check for Redux
    if (ruleLower.includes('redux') && (source.includes('redux') || source.includes('react-redux'))) {
      return true
    }

    // Check for Webpack
    if (ruleLower.includes('webpack') && source.includes('webpack')) {
      return true
    }

    return false
  }

  /**
   * Detect violations for breaking changes
   * Requirements: 11.5, 11.6
   */
  detectViolations(
    code: string,
    filePath: string = 'unknown'
  ): Violation[] {
    if (!this.rules) {
      throw new Error('Rules not loaded. Call loadRules() first.')
    }

    const violations: Violation[] = []

    try {
      const ast = babelParse(code, this.parserConfig)

      // Check for breaking changes
      this.checkBreakingChanges(ast, code, violations, filePath)

      // Check for deprecations
      this.checkDeprecations(ast, code, violations, filePath)

      return violations
    } catch (error: any) {
      // Return syntax error as violation
      return [
        {
          id: 'syntax-error',
          type: 'incompatibility',
          severity: 'error',
          line: 1,
          column: 1,
          message: `Syntax error: ${error.message}`,
          suggestion: 'Fix syntax errors before migration',
          autoFixable: false,
          filePath,
        },
      ]
    }
  }

  /**
   * Check for breaking changes in code
   * Requirements: 11.5, 11.6
   */
  private checkBreakingChanges(
    ast: t.File,
    code: string,
    violations: Violation[],
    filePath: string
  ): void {
    if (!this.rules || !this.rules.breakingChanges) return

    for (const breakingChange of this.rules.breakingChanges) {
      // Scan for affected APIs
      this.scanForAffectedAPIs(ast, code, breakingChange, violations, filePath)
    }
  }

  /**
   * Scan code for affected APIs from breaking changes
   */
  private scanForAffectedAPIs(
    ast: t.File,
    code: string,
    breakingChange: BreakingChange,
    violations: Violation[],
    filePath: string
  ): void {
    const affectedAPIs = breakingChange.affectedAPIs

    traverse(ast, {
      // Check for affected function calls
      CallExpression: (path: NodePath<t.CallExpression>) => {
        const calleeName = this.getCalleeName(path.node.callee)

        if (calleeName && affectedAPIs.some(api => calleeName.includes(api))) {
          violations.push({
            id: breakingChange.id,
            type: 'breaking-change',
            severity: 'error',
            line: path.node.loc?.start.line || 0,
            column: path.node.loc?.start.column || 0,
            message: `Breaking change: ${breakingChange.description}`,
            suggestion: breakingChange.migrationPath,
            autoFixable: breakingChange.autoFixable,
            filePath,
          })
        }
      },

      // Check for affected identifiers
      Identifier: (path: NodePath<t.Identifier>) => {
        const name = path.node.name

        if (affectedAPIs.some(api => name.includes(api))) {
          // Only report if it's not part of a declaration
          const parent = path.parent
          const isDeclaration = t.isVariableDeclarator(parent) || 
                                t.isFunctionDeclaration(parent) ||
                                t.isClassDeclaration(parent)
          
          if (!isDeclaration) {
            violations.push({
              id: breakingChange.id,
              type: 'breaking-change',
              severity: 'error',
              line: path.node.loc?.start.line || 0,
              column: path.node.loc?.start.column || 0,
              message: `Breaking change: ${breakingChange.description}`,
              suggestion: breakingChange.migrationPath,
              autoFixable: breakingChange.autoFixable,
              filePath,
            })
          }
        }
      },

      // Check for affected imports
      ImportDeclaration: (path: NodePath<t.ImportDeclaration>) => {
        const source = path.node.source.value

        if (affectedAPIs.some(api => source.includes(api))) {
          violations.push({
            id: breakingChange.id,
            type: 'breaking-change',
            severity: 'error',
            line: path.node.loc?.start.line || 0,
            column: path.node.loc?.start.column || 0,
            message: `Breaking change: ${breakingChange.description}`,
            suggestion: breakingChange.migrationPath,
            autoFixable: breakingChange.autoFixable,
            filePath,
          })
        }
      },
    })

    // Also do text-based search for patterns that might not be in AST
    for (const api of affectedAPIs) {
      const regex = new RegExp(`\\b${this.escapeRegex(api)}\\b`, 'g')
      let match

      while ((match = regex.exec(code)) !== null) {
        const line = code.substring(0, match.index).split('\n').length
        const column = match.index - code.lastIndexOf('\n', match.index) - 1

        // Check if we already have a violation at this location
        const existingViolation = violations.find(
          v => v.line === line && v.column === column && v.id === breakingChange.id
        )

        if (!existingViolation) {
          violations.push({
            id: breakingChange.id,
            type: 'breaking-change',
            severity: 'error',
            line,
            column,
            message: `Breaking change: ${breakingChange.description}`,
            suggestion: breakingChange.migrationPath,
            autoFixable: breakingChange.autoFixable,
            filePath,
          })
        }
      }
    }
  }

  /**
   * Check for deprecations in code
   * Requirements: 11.5, 11.6
   */
  private checkDeprecations(
    ast: t.File,
    code: string,
    violations: Violation[],
    filePath: string
  ): void {
    if (!this.rules || !this.rules.deprecations) return

    for (const deprecation of this.rules.deprecations) {
      this.scanForDeprecatedAPI(ast, code, deprecation, violations, filePath)
    }
  }

  /**
   * Scan code for deprecated APIs
   */
  private scanForDeprecatedAPI(
    ast: t.File,
    code: string,
    deprecation: Deprecation,
    violations: Violation[],
    filePath: string
  ): void {
    const deprecated = deprecation.deprecated

    // Text-based search for deprecated patterns
    const regex = new RegExp(`\\b${this.escapeRegex(deprecated)}\\b`, 'g')
    let match

    while ((match = regex.exec(code)) !== null) {
      const line = code.substring(0, match.index).split('\n').length
      const column = match.index - code.lastIndexOf('\n', match.index) - 1

      violations.push({
        id: deprecation.id,
        type: 'deprecation',
        severity: 'warning',
        line,
        column,
        message: `Deprecated: '${deprecated}' is deprecated in version ${deprecation.version}`,
        suggestion: `Replace with '${deprecation.replacement}'${
          deprecation.removalVersion ? ` (will be removed in ${deprecation.removalVersion})` : ''
        }`,
        autoFixable: true,
        filePath,
      })
    }

    // AST-based search for specific patterns
    traverse(ast, {
      // Check for deprecated imports
      ImportDeclaration: (path: NodePath<t.ImportDeclaration>) => {
        const source = path.node.source.value

        if (source.includes(deprecated)) {
          violations.push({
            id: deprecation.id,
            type: 'deprecation',
            severity: 'warning',
            line: path.node.loc?.start.line || 0,
            column: path.node.loc?.start.column || 0,
            message: `Deprecated: '${deprecated}' is deprecated in version ${deprecation.version}`,
            suggestion: `Replace with '${deprecation.replacement}'${
              deprecation.removalVersion ? ` (will be removed in ${deprecation.removalVersion})` : ''
            }`,
            autoFixable: true,
            filePath,
          })
        }
      },

      // Check for deprecated function calls
      CallExpression: (path: NodePath<t.CallExpression>) => {
        const calleeName = this.getCalleeName(path.node.callee)

        if (calleeName && calleeName.includes(deprecated)) {
          violations.push({
            id: deprecation.id,
            type: 'deprecation',
            severity: 'warning',
            line: path.node.loc?.start.line || 0,
            column: path.node.loc?.start.column || 0,
            message: `Deprecated: '${deprecated}' is deprecated in version ${deprecation.version}`,
            suggestion: `Replace with '${deprecation.replacement}'${
              deprecation.removalVersion ? ` (will be removed in ${deprecation.removalVersion})` : ''
            }`,
            autoFixable: true,
            filePath,
          })
        }
      },
    })
  }

  /**
   * Get callee name from expression
   */
  private getCalleeName(callee: any): string | null {
    if (t.isIdentifier(callee)) {
      return callee.name
    }

    if (t.isMemberExpression(callee)) {
      const object = t.isIdentifier(callee.object) ? callee.object.name : ''
      const property = t.isIdentifier(callee.property) ? callee.property.name : ''
      return `${object}.${property}`
    }

    return null
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Generate violation report with file grouping
   * Requirements: 11.6
   */
  generateViolationReport(
    violations: Violation[]
  ): {
    totalViolations: number
    violationsByFile: Map<string, Violation[]>
    violationsByType: Map<string, Violation[]>
    autoFixableCount: number
    manualReviewCount: number
  } {
    const violationsByFile = new Map<string, Violation[]>()
    const violationsByType = new Map<string, Violation[]>()
    let autoFixableCount = 0
    let manualReviewCount = 0

    for (const violation of violations) {
      // Group by file
      const filePath = violation.filePath || 'unknown'
      if (!violationsByFile.has(filePath)) {
        violationsByFile.set(filePath, [])
      }
      violationsByFile.get(filePath)!.push(violation)

      // Group by type
      if (!violationsByType.has(violation.type)) {
        violationsByType.set(violation.type, [])
      }
      violationsByType.get(violation.type)!.push(violation)

      // Count fixable vs manual
      if (violation.autoFixable) {
        autoFixableCount++
      } else {
        manualReviewCount++
      }
    }

    return {
      totalViolations: violations.length,
      violationsByFile,
      violationsByType,
      autoFixableCount,
      manualReviewCount,
    }
  }
}

/**
 * Singleton instance
 */
let ruleEngineInstance: RuleEngine | null = null

/**
 * Get singleton instance of RuleEngine
 */
export function getRuleEngine(): RuleEngine {
  if (!ruleEngineInstance) {
    ruleEngineInstance = new RuleEngine()
  }
  return ruleEngineInstance
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetRuleEngine(): void {
  ruleEngineInstance = null
}
