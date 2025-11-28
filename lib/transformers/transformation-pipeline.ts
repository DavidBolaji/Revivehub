/**
 * TransformationPipeline - Orchestrates safe code transformation through sequential stages
 * 
 * Implements a multi-stage pipeline for code transformation:
 * 1. Parse - Validate syntax and parse code into AST
 * 2. Validate - Perform pre-transformation validation
 * 3. Transform - Apply the actual code transformation
 * 4. Verify - Validate transformed code
 * 5. Format - Ensure proper formatting
 * 
 * Features:
 * - Automatic backup creation before transformation
 * - Rollback on any stage failure
 * - Confidence score calculation
 * - Comprehensive error handling
 * - Stage-level metadata tracking
 * 
 * @example
 * ```typescript
 * const pipeline = new TransformationPipeline()
 * const result = await pipeline.execute(code, transformer, options)
 * if (result.success) {
 *   console.log('Transformation successful:', result.metadata.confidenceScore)
 * }
 * ```
 */

import type {
  TransformOptions,
  TransformResult,
  TransformMetadata,
  PipelineStage,
  StageResult,
  TransformError,
} from '@/types/transformer'
import type { BaseTransformer } from './base-transformer'
import { Validator } from './validator'

/**
 * Parse Stage - Validates syntax and prepares code for transformation
 */
class ParseStage implements PipelineStage {
  name = 'Parse'

  async execute(
    code: string,
    transformer: BaseTransformer,
    _options: TransformOptions
  ): Promise<StageResult> {
    try {
      // Validate syntax before proceeding
      const validation = await transformer.validateSyntax(code)

      if (!validation.syntaxValid) {
        return {
          success: false,
          output: code,
          error: `Syntax validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          metadata: { validation },
        }
      }

      return {
        success: true,
        output: code,
        metadata: { validation },
      }
    } catch (error: any) {
      return {
        success: false,
        output: code,
        error: `Parse stage failed: ${error.message}`,
      }
    }
  }
}

/**
 * Validate Stage - Performs comprehensive pre-transformation validation
 */
class ValidateStage implements PipelineStage {
  name = 'Validate'
  private validator: Validator

  constructor() {
    this.validator = new Validator()
  }

  async execute(
    code: string,
    _transformer: BaseTransformer,
    _options: TransformOptions
  ): Promise<StageResult> {
    try {
      // Perform syntax validation
      const validation = await this.validator.validateSyntax(code, 'javascript')

      if (!validation.isValid) {
        return {
          success: false,
          output: code,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          metadata: { validation },
        }
      }

      // Collect warnings for later
      const warnings = validation.warnings

      return {
        success: true,
        output: code,
        metadata: { validation, warnings },
      }
    } catch (error: any) {
      return {
        success: false,
        output: code,
        error: `Validate stage failed: ${error.message}`,
      }
    }
  }
}

/**
 * Transform Stage - Applies the actual code transformation
 */
class TransformStage implements PipelineStage {
  name = 'Transform'

  async execute(
    code: string,
    transformer: BaseTransformer,
    options: TransformOptions
  ): Promise<StageResult> {
    try {
      // Apply transformation using the provided transformer
      const result = await transformer.transform(code, options)

      if (!result.success || !result.code) {
        return {
          success: false,
          output: code,
          error: result.errors[0]?.message || 'Transformation failed',
          metadata: { transformResult: result },
        }
      }

      return {
        success: true,
        output: result.code,
        metadata: { transformResult: result },
      }
    } catch (error: any) {
      return {
        success: false,
        output: code,
        error: `Transform stage failed: ${error.message}`,
      }
    }
  }
}

/**
 * Verify Stage - Validates transformed code
 */
class VerifyStage implements PipelineStage {
  name = 'Verify'
  private validator: Validator

  constructor() {
    this.validator = new Validator()
  }

  async execute(
    code: string,
    _transformer: BaseTransformer,
    _options: TransformOptions
  ): Promise<StageResult> {
    try {
      // Validate transformed code syntax
      const validation = await this.validator.validateSyntax(code, 'javascript')

      if (!validation.syntaxValid) {
        return {
          success: false,
          output: code,
          error: `Transformed code has syntax errors: ${validation.errors.map(e => e.message).join(', ')}`,
          metadata: { validation },
        }
      }

      return {
        success: true,
        output: code,
        metadata: { validation },
      }
    } catch (error: any) {
      return {
        success: false,
        output: code,
        error: `Verify stage failed: ${error.message}`,
      }
    }
  }
}

/**
 * Format Stage - Ensures proper code formatting (placeholder for future formatting)
 */
class FormatStage implements PipelineStage {
  name = 'Format'

  async execute(
    code: string,
    _transformer: BaseTransformer,
    options: TransformOptions
  ): Promise<StageResult> {
    try {
      // For now, preserve formatting as-is
      // Future: integrate with Prettier or other formatters
      if (options.preserveFormatting !== false) {
        return {
          success: true,
          output: code,
          metadata: { formatted: false, reason: 'preserveFormatting enabled' },
        }
      }

      // Placeholder for future formatting logic
      return {
        success: true,
        output: code,
        metadata: { formatted: false },
      }
    } catch (error: any) {
      return {
        success: false,
        output: code,
        error: `Format stage failed: ${error.message}`,
      }
    }
  }
}

/**
 * TransformationPipeline - Main pipeline orchestrator
 */
export class TransformationPipeline {
  private stages: PipelineStage[]

  constructor() {
    // Initialize pipeline stages in order
    this.stages = [
      new ParseStage(),
      new ValidateStage(),
      new TransformStage(),
      new VerifyStage(),
      new FormatStage(),
    ]
  }

  /**
   * Executes the transformation pipeline
   * 
   * Processes code through all pipeline stages sequentially:
   * 1. Creates backup of original code
   * 2. Executes each stage in order
   * 3. Rolls back on any failure
   * 4. Generates diff and calculates metrics
   * 5. Returns comprehensive result
   * 
   * @param code - Source code to transform
   * @param transformer - Transformer instance to use
   * @param options - Transformation options
   * @returns Promise resolving to transformation result
   */
  async execute(
    code: string,
    transformer: BaseTransformer,
    options: TransformOptions
  ): Promise<TransformResult> {
    const startTime = Date.now()
    let currentCode = code
    const stageMetadata: Record<string, any> = {}
    const allWarnings: string[] = []

    // Create backup before transformation
    const backupId = transformer.createBackup(code)

    try {
      // Execute each stage sequentially
      for (const stage of this.stages) {
        const stageStartTime = Date.now()
        const result = await stage.execute(currentCode, transformer, options)
        const stageDuration = Date.now() - stageStartTime

        // Store stage metadata
        stageMetadata[stage.name] = {
          duration: stageDuration,
          success: result.success,
          metadata: result.metadata,
        }

        // Collect warnings
        if (result.metadata?.warnings) {
          allWarnings.push(...result.metadata.warnings)
        }

        if (!result.success) {
          // Stage failed - rollback and return error
          await transformer.restoreBackup(backupId)
          
          const error: TransformError = {
            message: result.error || `Stage ${stage.name} failed`,
            code: 'PIPELINE_STAGE_FAILED',
            severity: 'error',
            suggestions: [
              'Review the error message for details',
              'Check if the code has syntax errors',
              'Try with different transformation options',
            ],
          }

          return {
            success: false,
            metadata: this.createFailureMetadata(
              transformer,
              stage.name,
              Date.now() - startTime
            ),
            errors: [error],
            warnings: allWarnings,
          }
        }

        currentCode = result.output
      }

      // All stages succeeded - generate diff
      const diff = transformer.generateDiff(code, currentCode)

      // Calculate metrics from diff
      const linesAdded = diff.visual.filter(l => l.type === 'added').length
      const linesRemoved = diff.visual.filter(l => l.type === 'removed').length

      // Create metadata
      const metadata: TransformMetadata = {
        transformationType: transformer.getMetadata().name,
        filesModified: [],
        linesAdded,
        linesRemoved,
        confidenceScore: 0, // Will be calculated
        riskScore: 0, // Will be calculated
        requiresManualReview: false,
        estimatedTimeSaved: this.estimateTimeSaved(linesAdded + linesRemoved),
        transformationsApplied: [transformer.getMetadata().name],
        timestamp: new Date(),
        duration: Date.now() - startTime,
      }

      // Create result for risk and confidence calculation
      const transformResult: TransformResult = {
        success: true,
        code: currentCode,
        diff,
        metadata,
        errors: [],
        warnings: allWarnings,
      }

      // Calculate confidence score
      metadata.confidenceScore = this.calculateConfidence(
        transformResult,
        stageMetadata
      )

      // Calculate risk score
      metadata.riskScore = transformer.calculateRiskScore(transformResult)

      // Determine if manual review is needed
      metadata.requiresManualReview = metadata.riskScore > 70

      // Clean up backup on success
      transformer.cleanupBackup(backupId)

      return transformResult

    } catch (error: any) {
      // Unexpected error - rollback
      try {
        await transformer.restoreBackup(backupId)
      } catch (rollbackError) {
        // Log rollback failure but continue with error reporting
        console.error('Rollback failed:', rollbackError)
      }

      const transformError: TransformError = {
        message: error.message || 'Unexpected pipeline error',
        code: 'PIPELINE_ERROR',
        severity: 'error',
        suggestions: [
          'Check the error stack trace',
          'Verify the transformer implementation',
          'Report this issue if it persists',
        ],
        stack: error.stack,
      }

      return {
        success: false,
        metadata: this.createFailureMetadata(
          transformer,
          'Unknown',
          Date.now() - startTime
        ),
        errors: [transformError],
        warnings: allWarnings,
      }
    }
  }

  /**
   * Calculates confidence score based on validation results and stage success
   * 
   * Factors considered:
   * - All stages completed successfully (40%)
   * - No syntax errors (30%)
   * - No semantic errors (20%)
   * - Minimal warnings (10%)
   * 
   * @param result - Transformation result
   * @param stageMetadata - Metadata from all stages
   * @returns Confidence score (0-100)
   */
  private calculateConfidence(
    result: TransformResult,
    stageMetadata: Record<string, any>
  ): number {
    let confidence = 0

    // Factor 1: All stages succeeded (40%)
    const allStagesSucceeded = Object.values(stageMetadata).every(
      (stage: any) => stage.success
    )
    if (allStagesSucceeded) {
      confidence += 40
    }

    // Factor 2: No syntax errors (30%)
    const hasSyntaxErrors = result.errors.some(
      e => e.code === 'SYNTAX_ERROR' || e.message.includes('syntax')
    )
    if (!hasSyntaxErrors) {
      confidence += 30
    }

    // Factor 3: Validation passed (20%)
    const validateStage = stageMetadata['Validate']
    const verifyStage = stageMetadata['Verify']
    if (
      validateStage?.metadata?.validation?.isValid &&
      verifyStage?.metadata?.validation?.syntaxValid
    ) {
      confidence += 20
    }

    // Factor 4: Minimal warnings (10%)
    const warningPenalty = Math.min(10, result.warnings.length * 2)
    confidence += Math.max(0, 10 - warningPenalty)

    return Math.min(100, Math.max(0, Math.round(confidence)))
  }

  /**
   * Estimates time saved by automation
   * 
   * @param linesChanged - Total lines added and removed
   * @returns Estimated time saved as string
   */
  private estimateTimeSaved(linesChanged: number): string {
    // Rough estimate: 1 minute per 10 lines changed manually
    const minutes = Math.round(linesChanged / 10)
    
    if (minutes < 1) {
      return '< 1 minute'
    } else if (minutes < 60) {
      return `${minutes} minutes`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours} hours`
    }
  }

  /**
   * Creates metadata for failed transformations
   * 
   * @param transformer - Transformer instance
   * @param failedStage - Name of stage that failed
   * @param duration - Total duration in milliseconds
   * @returns Failure metadata
   */
  private createFailureMetadata(
    transformer: BaseTransformer,
    _failedStage: string,
    duration: number
  ): TransformMetadata {
    return {
      transformationType: transformer.getMetadata().name,
      filesModified: [],
      linesAdded: 0,
      linesRemoved: 0,
      confidenceScore: 0,
      riskScore: 100, // Maximum risk for failed transformation
      requiresManualReview: true,
      estimatedTimeSaved: '0 minutes',
      transformationsApplied: [],
      timestamp: new Date(),
      duration,
    }
  }

  /**
   * Gets the list of pipeline stages
   * 
   * @returns Array of stage names
   */
  getStages(): string[] {
    return this.stages.map(stage => stage.name)
  }

  /**
   * Adds a custom stage to the pipeline
   * 
   * @param stage - Custom pipeline stage
   * @param position - Position to insert (default: before Format stage)
   */
  addStage(stage: PipelineStage, position?: number): void {
    if (position !== undefined) {
      this.stages.splice(position, 0, stage)
    } else {
      // Insert before Format stage by default
      this.stages.splice(this.stages.length - 1, 0, stage)
    }
  }

  /**
   * Removes a stage from the pipeline
   * 
   * @param stageName - Name of stage to remove
   * @returns true if stage was removed, false if not found
   */
  removeStage(stageName: string): boolean {
    const index = this.stages.findIndex(stage => stage.name === stageName)
    if (index !== -1) {
      this.stages.splice(index, 1)
      return true
    }
    return false
  }
}
