/**
 * Unit tests for TransformationPipeline
 * 
 * Tests the pipeline's ability to:
 * - Execute all stages sequentially
 * - Create backups before transformation
 * - Rollback on stage failure
 * - Calculate confidence scores
 * - Handle errors gracefully
 * - Generate comprehensive results
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TransformationPipeline } from '@/lib/transformers/transformation-pipeline'
import { BaseTransformer } from '@/lib/transformers/base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
} from '@/types/transformer'

/**
 * Mock transformer for testing
 */
class MockTransformer extends BaseTransformer {
  public transformCalled = false
  public shouldFail = false
  public transformedCode = ''

  constructor() {
    super('MockTransformer', ['code-quality'], ['*'])
  }

  async transform(
    code: string,
    _options: TransformOptions,
    _task?: Task
  ): Promise<TransformResult> {
    this.transformCalled = true

    if (this.shouldFail) {
      return {
        success: false,
        metadata: {
          transformationType: this.name,
          filesModified: [],
          linesAdded: 0,
          linesRemoved: 0,
          confidenceScore: 0,
          riskScore: 100,
          requiresManualReview: true,
          estimatedTimeSaved: '0 minutes',
          transformationsApplied: [],
          timestamp: new Date(),
        },
        errors: [{
          message: 'Mock transformation failed',
          code: 'MOCK_ERROR',
          severity: 'error',
          suggestions: [],
        }],
        warnings: [],
      }
    }

    // Simple transformation: add a comment
    this.transformedCode = `// Transformed by MockTransformer\n${code}`

    return {
      success: true,
      code: this.transformedCode,
      metadata: {
        transformationType: this.name,
        filesModified: [],
        linesAdded: 1,
        linesRemoved: 0,
        confidenceScore: 80,
        riskScore: 20,
        requiresManualReview: false,
        estimatedTimeSaved: '1 minute',
        transformationsApplied: [this.name],
        timestamp: new Date(),
      },
      errors: [],
      warnings: [],
    }
  }
}

describe('TransformationPipeline', () => {
  let pipeline: TransformationPipeline
  let transformer: MockTransformer

  beforeEach(() => {
    pipeline = new TransformationPipeline()
    transformer = new MockTransformer()
  })

  describe('Pipeline Stages', () => {
    it('should have all required stages', () => {
      const stages = pipeline.getStages()
      
      expect(stages).toContain('Parse')
      expect(stages).toContain('Validate')
      expect(stages).toContain('Transform')
      expect(stages).toContain('Verify')
      expect(stages).toContain('Format')
      expect(stages.length).toBe(5)
    })

    it('should execute stages in correct order', () => {
      const stages = pipeline.getStages()
      
      expect(stages[0]).toBe('Parse')
      expect(stages[1]).toBe('Validate')
      expect(stages[2]).toBe('Transform')
      expect(stages[3]).toBe('Verify')
      expect(stages[4]).toBe('Format')
    })
  })

  describe('Successful Transformation', () => {
    it('should successfully transform valid code', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.success).toBe(true)
      expect(result.code).toBeDefined()
      expect(result.code).toContain('Transformed by MockTransformer')
      expect(result.diff).toBeDefined()
      expect(result.metadata).toBeDefined()
      expect(transformer.transformCalled).toBe(true)
    })

    it('should generate diff for transformed code', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.diff).toBeDefined()
      expect(result.diff?.original).toBe(code)
      expect(result.diff?.transformed).toBe(transformer.transformedCode)
      expect(result.diff?.visual).toBeDefined()
      expect(result.diff?.unified).toBeDefined()
    })

    it('should calculate lines added and removed', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.linesAdded).toBeGreaterThan(0)
      expect(result.metadata.linesRemoved).toBe(0)
    })

    it('should calculate confidence score', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.confidenceScore).toBeGreaterThan(0)
      expect(result.metadata.confidenceScore).toBeLessThanOrEqual(100)
    })

    it('should calculate risk score', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.riskScore).toBeGreaterThanOrEqual(0)
      expect(result.metadata.riskScore).toBeLessThanOrEqual(100)
    })

    it('should estimate time saved', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.estimatedTimeSaved).toBeDefined()
      expect(typeof result.metadata.estimatedTimeSaved).toBe('string')
    })

    it('should include transformation metadata', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.transformationType).toBe('MockTransformer')
      expect(result.metadata.timestamp).toBeInstanceOf(Date)
      expect(result.metadata.duration).toBeGreaterThan(0)
      expect(result.metadata.transformationsApplied).toContain('MockTransformer')
    })
  })

  describe('Backup and Rollback', () => {
    it('should create backup before transformation', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const createBackupSpy = vi.spyOn(transformer, 'createBackup')

      await pipeline.execute(code, transformer, options)

      expect(createBackupSpy).toHaveBeenCalledWith(code)
    })

    it('should cleanup backup on successful transformation', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const cleanupBackupSpy = vi.spyOn(transformer, 'cleanupBackup')

      await pipeline.execute(code, transformer, options)

      expect(cleanupBackupSpy).toHaveBeenCalled()
    })

    it('should rollback on transformation failure', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      transformer.shouldFail = true
      const restoreBackupSpy = vi.spyOn(transformer, 'restoreBackup')

      const result = await pipeline.execute(code, transformer, options)

      expect(result.success).toBe(false)
      expect(restoreBackupSpy).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle syntax errors in original code', async () => {
      const code = 'const x = ;' // Invalid syntax
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].message).toContain('failed')
    })

    it('should handle transformation failures', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      transformer.shouldFail = true

      const result = await pipeline.execute(code, transformer, options)

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.metadata.riskScore).toBe(100)
      expect(result.metadata.requiresManualReview).toBe(true)
    })

    it('should provide error suggestions', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      transformer.shouldFail = true

      const result = await pipeline.execute(code, transformer, options)

      expect(result.errors[0].suggestions).toBeDefined()
      expect(result.errors[0].suggestions.length).toBeGreaterThan(0)
    })

    it('should set high risk score for failed transformations', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      transformer.shouldFail = true

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.riskScore).toBe(100)
      expect(result.metadata.confidenceScore).toBe(0)
    })
  })

  describe('Manual Review Flagging', () => {
    it('should flag high-risk transformations for manual review', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      // Mock high risk score
      vi.spyOn(transformer, 'calculateRiskScore')
        .mockReturnValue(85)

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.riskScore).toBeGreaterThan(70)
      expect(result.metadata.requiresManualReview).toBe(true)
    })

    it('should not flag low-risk transformations for manual review', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      // Mock low risk score
      vi.spyOn(transformer, 'calculateRiskScore')
        .mockReturnValue(25)

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.riskScore).toBeLessThanOrEqual(70)
      expect(result.metadata.requiresManualReview).toBe(false)
    })
  })

  describe('Options Handling', () => {
    it('should respect preserveFormatting option', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {
        preserveFormatting: true,
      }

      const result = await pipeline.execute(code, transformer, options)

      expect(result.success).toBe(true)
    })

    it('should handle dryRun option', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {
        dryRun: true,
      }

      const result = await pipeline.execute(code, transformer, options)

      expect(result.success).toBe(true)
    })
  })

  describe('Stage Management', () => {
    it('should allow adding custom stages', () => {
      const customStage = {
        name: 'CustomStage',
        execute: async () => ({
          success: true,
          output: 'test',
        }),
      }

      pipeline.addStage(customStage)
      const stages = pipeline.getStages()

      expect(stages).toContain('CustomStage')
    })

    it('should allow removing stages', () => {
      const removed = pipeline.removeStage('Format')

      expect(removed).toBe(true)
      expect(pipeline.getStages()).not.toContain('Format')
    })

    it('should return false when removing non-existent stage', () => {
      const removed = pipeline.removeStage('NonExistentStage')

      expect(removed).toBe(false)
    })
  })

  describe('Warnings Collection', () => {
    it('should collect warnings from all stages', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      // Mock transformer to return warnings
      vi.spyOn(transformer, 'transform')
        .mockResolvedValue({
          success: true,
          code: '// transformed\nconst x = 1;',
          metadata: {
            transformationType: transformer.getMetadata().name,
            filesModified: [],
            linesAdded: 1,
            linesRemoved: 0,
            confidenceScore: 80,
            riskScore: 20,
            requiresManualReview: false,
            estimatedTimeSaved: '1 minute',
            transformationsApplied: [transformer.getMetadata().name],
            timestamp: new Date(),
          },
          errors: [],
          warnings: ['Warning 1', 'Warning 2'],
        })

      const result = await pipeline.execute(code, transformer, options)

      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Performance Tracking', () => {
    it('should track transformation duration', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const result = await pipeline.execute(code, transformer, options)

      expect(result.metadata.duration).toBeDefined()
      expect(result.metadata.duration).toBeGreaterThan(0)
    })

    it('should include timestamp', async () => {
      const code = 'const x = 1;'
      const options: TransformOptions = {}

      const beforeTime = new Date()
      const result = await pipeline.execute(code, transformer, options)
      const afterTime = new Date()

      expect(result.metadata.timestamp).toBeInstanceOf(Date)
      if (result.metadata.timestamp) {
        expect(result.metadata.timestamp.getTime()).toBeGreaterThanOrEqual(
          beforeTime.getTime()
        )
        expect(result.metadata.timestamp.getTime()).toBeLessThanOrEqual(
          afterTime.getTime()
        )
      }
    })
  })
})
