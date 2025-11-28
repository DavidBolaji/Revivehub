/**
 * BaseTransformer - Abstract base class for all code transformers
 * 
 * Provides core functionality for safe code transformation including:
 * - Syntax validation using AST parsing
 * - Risk score calculation based on complexity analysis
 * - Diff generation for change visualization
 * - Backup and restore capabilities for rollback
 * - Pattern matching for transformer routing
 * 
 * All concrete transformers must extend this class and implement the abstract transform() method.
 * 
 * @example
 * ```typescript
 * class MyTransformer extends BaseTransformer {
 *   constructor() {
 *     super('MyTransformer', ['code-quality'], ['React'])
 *   }
 *   
 *   async transform(code: string, options: TransformOptions): Promise<TransformResult> {
 *     // Implementation
 *   }
 * }
 * ```
 */

import { parse as babelParse } from '@babel/parser'
import type {
  TransformOptions,
  TransformResult,
  TransformMetadata,
  ValidationResult,
  Diff,
  Task,
  SourceStack,
  ComplexityMetrics,
  Backup,
} from '@/types/transformer'
import { DiffGenerator } from './diff-generator'

/**
 * Abstract base class for all code transformers
 */
export abstract class BaseTransformer {
  protected name: string
  protected supportedPatternCategories: string[]
  protected supportedFrameworks: string[]
  private diffGenerator: DiffGenerator
  private backups: Map<string, Backup>

  /**
   * Creates a new BaseTransformer instance
   * 
   * @param name - Unique name for this transformer
   * @param categories - Pattern categories this transformer handles (e.g., 'dependency', 'structural')
   * @param frameworks - Frameworks this transformer supports (use '*' for all)
   */
  constructor(
    name: string,
    categories: string[],
    frameworks: string[]
  ) {
    this.name = name
    this.supportedPatternCategories = categories
    this.supportedFrameworks = frameworks
    this.diffGenerator = new DiffGenerator()
    this.backups = new Map()
  }

  /**
   * Abstract method that must be implemented by all concrete transformers
   * 
   * Transforms the provided code according to the transformer's logic.
   * Must validate input, apply transformations safely, and return comprehensive results.
   * 
   * @param code - Source code to transform
   * @param options - Transformation options (aggressive mode, skip tests, etc.)
   * @param task - Optional task context with pattern information
   * @returns Promise resolving to transformation result with code, diff, and metadata
   */
  abstract transform(
    code: string,
    options: TransformOptions,
    task?: Task
  ): Promise<TransformResult>

  /**
   * Validates syntax of code using AST parsing
   * 
   * Attempts to parse the code using Babel parser with TypeScript and JSX support.
   * Returns validation result indicating whether code is syntactically valid.
   * 
   * @param code - Code to validate
   * @param language - Programming language (defaults to 'javascript')
   * @returns Promise resolving to validation result with errors and warnings
   */
  async validateSyntax(
    code: string,
    language: string = 'javascript'
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      syntaxValid: true,
      semanticValid: true,
    }

    try {
      // Auto-detect JSON if it looks like JSON
      const trimmedCode = code.trim()
      const looksLikeJSON = (trimmedCode.startsWith('{') || trimmedCode.startsWith('[')) && 
                           (trimmedCode.includes('"name"') || trimmedCode.includes('"version"') || 
                            trimmedCode.includes('"dependencies"'))
      
      // Handle JSON files
      if (language === 'json' || looksLikeJSON) {
        try {
          JSON.parse(code)
          return result // Valid JSON, return early
        } catch (jsonError: any) {
          result.isValid = false
          result.syntaxValid = false
          result.errors.push({
            message: jsonError.message || 'Invalid JSON syntax',
            severity: 'error',
            code: 'JSON_PARSE_ERROR',
          })
          return result
        }
      }
      
      // Use Babel parser for JavaScript/TypeScript
      if (language === 'javascript' || language === 'typescript') {
        babelParse(code, {
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
      }
      // For other languages, assume valid (can be extended)
    } catch (error: any) {
      result.isValid = false
      result.syntaxValid = false
      result.errors.push({
        message: error.message || 'Syntax validation failed',
        line: error.loc?.line,
        column: error.loc?.column,
        severity: 'error',
        code: error.code,
      })
    }

    return result
  }

  /**
   * Calculates risk score for a transformation (0-100)
   * 
   * Analyzes multiple factors to determine transformation risk:
   * - Lines changed (more changes = higher risk)
   * - Complexity metrics (cyclomatic complexity, nesting depth)
   * - Breaking changes present
   * - Confidence score (lower confidence = higher risk)
   * 
   * Risk levels:
   * - 0-30: Low risk (safe to auto-apply)
   * - 31-70: Medium risk (review recommended)
   * - 71-100: High risk (manual review required)
   * 
   * @param transformation - Transformation result to analyze
   * @param complexityMetrics - Optional complexity metrics for more accurate scoring
   * @returns Risk score between 0 and 100
   */
  calculateRiskScore(
    transformation: TransformResult,
    complexityMetrics?: ComplexityMetrics
  ): number {
    let riskScore = 0

    // Factor 1: Lines changed (max 30 points)
    const linesChanged =
      transformation.metadata.linesAdded + transformation.metadata.linesRemoved
    const lineChangeScore = Math.min(30, (linesChanged / 100) * 30)
    riskScore += lineChangeScore

    // Factor 2: Complexity (max 25 points)
    if (complexityMetrics) {
      const complexityScore =
        Math.min(10, complexityMetrics.cyclomaticComplexity) +
        Math.min(10, complexityMetrics.nestingDepth * 2) +
        Math.min(5, complexityMetrics.scopeChanges)
      riskScore += complexityScore
    }

    // Factor 3: Errors and warnings (max 20 points)
    const errorScore = Math.min(20, transformation.errors.length * 10)
    const warningScore = Math.min(10, transformation.warnings.length * 2)
    riskScore += errorScore + warningScore

    // Factor 4: Confidence score inverse (max 25 points)
    const confidenceScore = transformation.metadata.confidenceScore || 50
    const confidencePenalty = ((100 - confidenceScore) / 100) * 25
    riskScore += confidencePenalty

    // Ensure score is within bounds
    return Math.min(100, Math.max(0, Math.round(riskScore)))
  }

  /**
   * Generates comprehensive diff between original and transformed code
   * 
   * Creates multiple diff formats for different use cases:
   * - Unified diff (Git-compatible)
   * - Visual diff (for UI rendering with line numbers)
   * - Character-level diff (for inline highlighting)
   * 
   * @param original - Original source code
   * @param transformed - Transformed source code
   * @returns Diff object with multiple formats
   */
  generateDiff(original: string, transformed: string): Diff {
    return this.diffGenerator.generate(original, transformed)
  }

  /**
   * Creates a backup of original code before transformation
   * 
   * Stores the original code with a unique identifier and timestamp.
   * Backups can be restored using restoreBackup() if transformation fails.
   * 
   * @param code - Original code to backup
   * @param filePath - Optional file path for context
   * @returns Unique backup ID for later restoration
   */
  createBackup(code: string, filePath?: string): string {
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const backup: Backup = {
      id: backupId,
      filePath: filePath || 'unknown',
      content: code,
      timestamp: new Date(),
      metadata: {
        transformer: this.name,
        codeLength: code.length,
      },
    }

    this.backups.set(backupId, backup)

    // Auto-cleanup old backups (keep last 100)
    if (this.backups.size > 100) {
      const oldestKey = this.backups.keys().next().value
      this.backups.delete(oldestKey as any)
    }

    return backupId
  }

  /**
   * Restores code from a backup
   * 
   * Retrieves and returns the original code from a backup created with createBackup().
   * Throws error if backup ID is not found.
   * 
   * @param backupId - Unique backup identifier returned from createBackup()
   * @returns Promise resolving to original code content
   * @throws Error if backup not found
   */
  async restoreBackup(backupId: string): Promise<string> {
    const backup = this.backups.get(backupId)

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`)
    }

    return backup.content
  }

  /**
   * Cleans up a backup after successful transformation
   * 
   * Removes backup from memory to free resources.
   * Should be called after transformation is committed.
   * 
   * @param backupId - Backup identifier to clean up
   */
  cleanupBackup(backupId: string): void {
    this.backups.delete(backupId)
  }

  /**
   * Checks if this transformer can handle a specific task
   * 
   * Determines compatibility based on:
   * - Pattern category match (dependency, structural, code-quality, documentation)
   * - Framework compatibility (checks if task's framework is supported)
   * 
   * @param task - Task to check compatibility for
   * @param sourceStack - Source stack information with framework details
   * @returns true if transformer can handle this task, false otherwise
   */
  canHandle(task: Task, sourceStack: SourceStack): boolean {
    // Check if pattern category is supported
    const categoryMatch = this.supportedPatternCategories.includes(
      task.pattern.category
    )

    if (!categoryMatch) {
      return false
    }

    // Check framework compatibility
    // '*' means supports all frameworks
    if (this.supportedFrameworks.includes('*')) {
      return true
    }

    // Check if source framework is in supported list
    const frameworkMatch = this.supportedFrameworks.some(
      (framework) =>
        framework.toLowerCase() === sourceStack.framework.toLowerCase()
    )

    return frameworkMatch
  }

  /**
   * Gets transformer metadata
   * 
   * @returns Metadata about this transformer
   */
  getMetadata() {
    return {
      name: this.name,
      supportedPatternCategories: this.supportedPatternCategories,
      supportedFrameworks: this.supportedFrameworks,
    }
  }

  /**
   * Creates base metadata structure for transformation results
   * 
   * Helper method for concrete transformers to create consistent metadata.
   * 
   * @param filesModified - Array of file paths that were modified
   * @param confidenceScore - Confidence score (0-100)
   * @returns Base metadata structure
   */
  protected createBaseMetadata(
    filesModified: string[] = [],
    confidenceScore: number = 50
  ): TransformMetadata {
    return {
      transformationType: this.name,
      filesModified,
      linesAdded: 0,
      linesRemoved: 0,
      confidenceScore,
      riskScore: 0,
      requiresManualReview: false,
      estimatedTimeSaved: '0 minutes',
      transformationsApplied: [],
      timestamp: new Date(),
    }
  }
}
