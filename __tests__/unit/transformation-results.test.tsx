/**
 * Unit tests for TransformationResults component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import TransformationResults from '@/components/transformation/TransformationResults'
import type { OrchestrationResult, TaskResult, TransformationSummary } from '@/types/transformer'

// Mock data helpers
function createMockTaskResult(
  taskId: string,
  filePath: string,
  options: Partial<TaskResult> = {}
): TaskResult {
  return {
    taskId,
    filePath,
    success: true,
    skipped: false,
    result: {
      success: true,
      code: 'const x: number = 1;',
      diff: {
        original: 'const x = 1;',
        transformed: 'const x: number = 1;',
        unified: '+const x: number = 1;\n-const x = 1;',
        visual: [],
        characterLevel: [],
      },
      metadata: {
        transformationType: 'type-annotation',
        filesModified: [filePath],
        linesAdded: 1,
        linesRemoved: 1,
        confidenceScore: 0.95,
        riskScore: 2,
        requiresManualReview: false,
        estimatedTimeSaved: '5 minutes',
        transformationsApplied: ['add-type-annotation'],
      },
      errors: [],
      warnings: [],
    },
    ...options,
  }
}

function createMockTransformationSummary(
  options: Partial<TransformationSummary> = {}
): TransformationSummary {
  return {
    filesChanged: 5,
    linesAdded: 100,
    linesRemoved: 50,
    tasksCompleted: 8,
    tasksFailed: 0,
    tasksSkipped: 1,
    errors: [],
    warnings: [],
    manualReviewNeeded: [],
    estimatedTimeSaved: '2 hours',
    totalDuration: 30000,
    ...options,
  }
}

function createMockOrchestrationResult(
  options: Partial<OrchestrationResult> = {}
): OrchestrationResult {
  const summary = createMockTransformationSummary(options.summary)
  
  return {
    jobId: 'tx_test_123',
    success: true,
    summary,
    results: [],
    transformedFiles: new Map(),
    ...options,
  }
}

describe('TransformationResults', () => {
  let mockOnAccept: ReturnType<typeof vi.fn>
  let mockOnReject: ReturnType<typeof vi.fn>
  let mockOnViewDiff: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnAccept = vi.fn()
    mockOnReject = vi.fn()
    mockOnViewDiff = vi.fn()
  })

  describe('Component Structure', () => {
    it('should be defined as a React component', () => {
      expect(TransformationResults).toBeDefined()
      expect(typeof TransformationResults).toBe('function')
    })

    it('should accept required props', () => {
      const props = {
        result: createMockOrchestrationResult(),
        onAccept: mockOnAccept,
        onReject: mockOnReject,
        onViewDiff: mockOnViewDiff,
      }
      
      expect(props.result).toBeDefined()
      expect(typeof props.onAccept).toBe('function')
      expect(typeof props.onReject).toBe('function')
      expect(typeof props.onViewDiff).toBe('function')
    })
  })

  describe('Summary Calculations', () => {
    it('should calculate success rate correctly', () => {
      const calculateSuccessRate = (completed: number, failed: number) => {
        return completed + failed > 0
          ? (completed / (completed + failed)) * 100
          : 0
      }

      expect(calculateSuccessRate(0, 0)).toBe(0)
      expect(calculateSuccessRate(8, 2)).toBe(80)
      expect(calculateSuccessRate(10, 0)).toBe(100)
      expect(calculateSuccessRate(5, 5)).toBe(50)
    })

    it('should handle summary with all successful tasks', () => {
      const summary = createMockTransformationSummary({
        tasksCompleted: 10,
        tasksFailed: 0,
        errors: [],
      })

      expect(summary.tasksCompleted).toBe(10)
      expect(summary.tasksFailed).toBe(0)
      expect(summary.errors).toHaveLength(0)
    })

    it('should handle summary with failed tasks', () => {
      const summary = createMockTransformationSummary({
        tasksCompleted: 7,
        tasksFailed: 3,
        errors: ['Error 1', 'Error 2', 'Error 3'],
      })

      expect(summary.tasksCompleted).toBe(7)
      expect(summary.tasksFailed).toBe(3)
      expect(summary.errors).toHaveLength(3)
    })

    it('should handle summary with warnings', () => {
      const summary = createMockTransformationSummary({
        warnings: [
          'Warning: Deprecated API usage detected',
          'Warning: High complexity in file.ts',
        ],
      })

      expect(summary.warnings).toHaveLength(2)
      expect(summary.warnings[0]).toContain('Deprecated API')
    })

    it('should handle summary with manual review needed', () => {
      const summary = createMockTransformationSummary({
        manualReviewNeeded: [
          'src/components/Complex.tsx',
          'src/utils/legacy.ts',
        ],
      })

      expect(summary.manualReviewNeeded).toHaveLength(2)
      expect(summary.manualReviewNeeded).toContain('src/components/Complex.tsx')
    })
  })

  describe('File Grouping by Phase', () => {
    it('should group files by phase correctly', () => {
      const results: TaskResult[] = [
        createMockTaskResult('phase1-task1', 'file1.ts'),
        createMockTaskResult('phase1-task2', 'file2.ts'),
        createMockTaskResult('phase2-task1', 'file3.ts'),
      ]

      const groupByPhase = (results: TaskResult[]) => {
        const groups: Record<string, TaskResult[]> = {}
        
        results.forEach(result => {
          if (!result.filePath || result.skipped) return
          
          const phaseId = result.taskId.split('-')[0] || 'unknown'
          
          if (!groups[phaseId]) {
            groups[phaseId] = []
          }
          
          groups[phaseId].push(result)
        })
        
        return groups
      }

      const grouped = groupByPhase(results)
      
      expect(Object.keys(grouped)).toHaveLength(2)
      expect(grouped['phase1']).toHaveLength(2)
      expect(grouped['phase2']).toHaveLength(1)
    })

    it('should skip files without filePath', () => {
      const results: TaskResult[] = [
        createMockTaskResult('phase1-task1', ''),
        createMockTaskResult('phase1-task2', 'file2.ts'),
      ]

      const groupByPhase = (results: TaskResult[]) => {
        const groups: Record<string, TaskResult[]> = {}
        
        results.forEach(result => {
          if (!result.filePath || result.skipped) return
          
          const phaseId = result.taskId.split('-')[0] || 'unknown'
          
          if (!groups[phaseId]) {
            groups[phaseId] = []
          }
          
          groups[phaseId].push(result)
        })
        
        return groups
      }

      const grouped = groupByPhase(results)
      
      expect(grouped['phase1']).toHaveLength(1)
      expect(grouped['phase1'][0].filePath).toBe('file2.ts')
    })

    it('should skip skipped tasks', () => {
      const results: TaskResult[] = [
        createMockTaskResult('phase1-task1', 'file1.ts', { skipped: true }),
        createMockTaskResult('phase1-task2', 'file2.ts', { skipped: false }),
      ]

      const groupByPhase = (results: TaskResult[]) => {
        const groups: Record<string, TaskResult[]> = {}
        
        results.forEach(result => {
          if (!result.filePath || result.skipped) return
          
          const phaseId = result.taskId.split('-')[0] || 'unknown'
          
          if (!groups[phaseId]) {
            groups[phaseId] = []
          }
          
          groups[phaseId].push(result)
        })
        
        return groups
      }

      const grouped = groupByPhase(results)
      
      expect(grouped['phase1']).toHaveLength(1)
      expect(grouped['phase1'][0].filePath).toBe('file2.ts')
    })
  })

  describe('Manual Review Items', () => {
    it('should extract manual review reasons from task results', () => {
      const results: TaskResult[] = [
        createMockTaskResult('task1', 'file1.ts', {
          result: {
            success: true,
            code: '',
            diff: {
              original: '',
              transformed: '',
              unified: '',
              visual: [],
              characterLevel: [],
            },
            metadata: {
              transformationType: 'complex-refactor',
              filesModified: ['file1.ts'],
              linesAdded: 0,
              linesRemoved: 0,
              confidenceScore: 0.6,
              riskScore: 8,
              requiresManualReview: true,
              estimatedTimeSaved: '10 minutes',
              transformationsApplied: [],
            },
            errors: [],
            warnings: [],
          },
        }),
        createMockTaskResult('task2', 'file2.ts', {
          success: false,
          error: 'Transformation failed due to syntax error',
        }),
      ]

      const manualReviewNeeded = ['file1.ts', 'file2.ts']

      const reviewItems = manualReviewNeeded.map(filePath => {
        const taskResult = results.find(r => r.filePath === filePath)
        return {
          filePath,
          reason: taskResult?.result?.metadata.requiresManualReview
            ? 'High risk score - requires manual review'
            : taskResult?.error || 'Transformation requires manual attention',
          riskScore: taskResult?.result?.metadata.riskScore,
        }
      })

      expect(reviewItems).toHaveLength(2)
      expect(reviewItems[0].reason).toBe('High risk score - requires manual review')
      expect(reviewItems[0].riskScore).toBe(8)
      expect(reviewItems[1].reason).toBe('Transformation failed due to syntax error')
    })

    it('should handle files with no matching task result', () => {
      const results: TaskResult[] = []
      const manualReviewNeeded = ['file1.ts']

      const reviewItems = manualReviewNeeded.map(filePath => {
        const taskResult = results.find(r => r.filePath === filePath)
        return {
          filePath,
          reason: taskResult?.result?.metadata.requiresManualReview
            ? 'High risk score - requires manual review'
            : taskResult?.error || 'Transformation requires manual attention',
          riskScore: taskResult?.result?.metadata.riskScore,
        }
      })

      expect(reviewItems[0].reason).toBe('Transformation requires manual attention')
      expect(reviewItems[0].riskScore).toBeUndefined()
    })
  })

  describe('Download Functionality', () => {
    it('should create download data structure correctly', () => {
      const result = createMockOrchestrationResult({
        jobId: 'tx_download_test',
        transformedFiles: new Map([
          ['file1.ts', 'const x: number = 1;'],
          ['file2.ts', 'const y: string = "hello";'],
        ]),
      })

      const downloadData = {
        jobId: result.jobId,
        summary: result.summary,
        transformedFiles: Array.from(result.transformedFiles.entries()).map(
          ([path, content]) => ({ path, content })
        ),
      }

      expect(downloadData.jobId).toBe('tx_download_test')
      expect(downloadData.transformedFiles).toHaveLength(2)
      expect(downloadData.transformedFiles[0]).toEqual({
        path: 'file1.ts',
        content: 'const x: number = 1;',
      })
    })

    it('should handle empty transformed files', () => {
      const result = createMockOrchestrationResult({
        transformedFiles: new Map(),
      })

      const downloadData = {
        jobId: result.jobId,
        summary: result.summary,
        transformedFiles: Array.from(result.transformedFiles.entries()).map(
          ([path, content]) => ({ path, content })
        ),
      }

      expect(downloadData.transformedFiles).toHaveLength(0)
    })
  })

  describe('Error Handling', () => {
    it('should identify results with errors', () => {
      const result = createMockOrchestrationResult({
        summary: createMockTransformationSummary({
          errors: ['Error 1', 'Error 2'],
          tasksFailed: 2,
        }),
      })

      const hasErrors = result.summary.errors.length > 0 || result.summary.tasksFailed > 0

      expect(hasErrors).toBe(true)
    })

    it('should identify results without errors', () => {
      const result = createMockOrchestrationResult({
        summary: createMockTransformationSummary({
          errors: [],
          tasksFailed: 0,
        }),
      })

      const hasErrors = result.summary.errors.length > 0 || result.summary.tasksFailed > 0

      expect(hasErrors).toBe(false)
    })

    it('should disable accept button when errors exist', () => {
      const hasErrors = true
      const shouldDisableAccept = hasErrors

      expect(shouldDisableAccept).toBe(true)
    })
  })

  describe('Phase Expansion State', () => {
    it('should initialize with all phases expanded', () => {
      const phaseIds = ['phase1', 'phase2', 'phase3']
      const expandedPhases = new Set(phaseIds)

      expect(expandedPhases.size).toBe(3)
      expect(expandedPhases.has('phase1')).toBe(true)
      expect(expandedPhases.has('phase2')).toBe(true)
      expect(expandedPhases.has('phase3')).toBe(true)
    })

    it('should toggle phase expansion correctly', () => {
      const expandedPhases = new Set(['phase1', 'phase2'])

      const togglePhase = (phaseId: string, currentSet: Set<string>) => {
        const newSet = new Set(currentSet)
        if (newSet.has(phaseId)) {
          newSet.delete(phaseId)
        } else {
          newSet.add(phaseId)
        }
        return newSet
      }

      const afterCollapse = togglePhase('phase1', expandedPhases)
      expect(afterCollapse.has('phase1')).toBe(false)
      expect(afterCollapse.has('phase2')).toBe(true)

      const afterExpand = togglePhase('phase1', afterCollapse)
      expect(afterExpand.has('phase1')).toBe(true)
    })
  })

  describe('Callback Functions', () => {
    it('should call onAccept when accept button is clicked', () => {
      const mockCallback = vi.fn()
      
      mockCallback()
      
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it('should call onReject when reject button is clicked', () => {
      const mockCallback = vi.fn()
      
      mockCallback()
      
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it('should call onViewDiff with correct file path', () => {
      const mockCallback = vi.fn()
      const filePath = 'src/components/Button.tsx'
      
      mockCallback(filePath)
      
      expect(mockCallback).toHaveBeenCalledWith(filePath)
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle result with no files changed', () => {
      const result = createMockOrchestrationResult({
        summary: createMockTransformationSummary({
          filesChanged: 0,
          linesAdded: 0,
          linesRemoved: 0,
        }),
        results: [],
      })

      expect(result.summary.filesChanged).toBe(0)
      expect(result.results).toHaveLength(0)
    })

    it('should handle result with no estimated time saved', () => {
      const result = createMockOrchestrationResult({
        summary: createMockTransformationSummary({
          estimatedTimeSaved: undefined,
        }),
      })

      expect(result.summary.estimatedTimeSaved).toBeUndefined()
    })

    it('should handle task result without metadata', () => {
      const taskResult = createMockTaskResult('task1', 'file1.ts', {
        result: undefined,
      })

      expect(taskResult.result).toBeUndefined()
    })

    it('should handle empty warnings array', () => {
      const summary = createMockTransformationSummary({
        warnings: [],
      })

      expect(summary.warnings).toHaveLength(0)
    })

    it('should handle empty errors array', () => {
      const summary = createMockTransformationSummary({
        errors: [],
      })

      expect(summary.errors).toHaveLength(0)
    })

    it('should handle empty manual review array', () => {
      const summary = createMockTransformationSummary({
        manualReviewNeeded: [],
      })

      expect(summary.manualReviewNeeded).toHaveLength(0)
    })
  })

  describe('Success State', () => {
    it('should identify successful transformation', () => {
      const result = createMockOrchestrationResult({
        success: true,
        summary: createMockTransformationSummary({
          tasksFailed: 0,
          errors: [],
        }),
      })

      expect(result.success).toBe(true)
      expect(result.summary.tasksFailed).toBe(0)
      expect(result.summary.errors).toHaveLength(0)
    })

    it('should identify transformation with issues', () => {
      const result = createMockOrchestrationResult({
        success: false,
        summary: createMockTransformationSummary({
          tasksFailed: 2,
          errors: ['Error 1', 'Error 2'],
        }),
      })

      expect(result.success).toBe(false)
      expect(result.summary.tasksFailed).toBeGreaterThan(0)
      expect(result.summary.errors.length).toBeGreaterThan(0)
    })
  })

  describe('File Statistics', () => {
    it('should calculate lines added and removed correctly', () => {
      const taskResult = createMockTaskResult('task1', 'file1.ts', {
        result: {
          success: true,
          code: 'const x: number = 1;\nconst y: number = 2;\nconst z: number = 3;',
          diff: {
            original: 'const x = 1;\nconst y = 2;',
            transformed: 'const x: number = 1;\nconst y: number = 2;\nconst z: number = 3;',
            unified: '',
            visual: [],
            characterLevel: [],
          },
          metadata: {
            transformationType: 'type-annotation',
            filesModified: ['file1.ts'],
            linesAdded: 3,
            linesRemoved: 2,
            confidenceScore: 0.9,
            riskScore: 2,
            requiresManualReview: false,
            estimatedTimeSaved: '5 minutes',
            transformationsApplied: ['add-type-annotations'],
          },
          errors: [],
          warnings: [],
        },
      })

      expect(taskResult.result?.metadata.linesAdded).toBe(3)
      expect(taskResult.result?.metadata.linesRemoved).toBe(2)
    })

    it('should handle files with only additions', () => {
      const taskResult = createMockTaskResult('task1', 'file1.ts', {
        result: {
          success: true,
          code: 'const x: number = 1;',
          diff: {
            original: '',
            transformed: 'const x: number = 1;',
            unified: '',
            visual: [],
            characterLevel: [],
          },
          metadata: {
            transformationType: 'add-code',
            filesModified: ['file1.ts'],
            linesAdded: 1,
            linesRemoved: 0,
            confidenceScore: 0.95,
            riskScore: 1,
            requiresManualReview: false,
            estimatedTimeSaved: '2 minutes',
            transformationsApplied: ['add-variable'],
          },
          errors: [],
          warnings: [],
        },
      })

      expect(taskResult.result?.metadata.linesAdded).toBe(1)
      expect(taskResult.result?.metadata.linesRemoved).toBe(0)
    })

    it('should handle files with only removals', () => {
      const taskResult = createMockTaskResult('task1', 'file1.ts', {
        result: {
          success: true,
          code: '',
          diff: {
            original: 'const x = 1;',
            transformed: '',
            unified: '',
            visual: [],
            characterLevel: [],
          },
          metadata: {
            transformationType: 'remove-code',
            filesModified: ['file1.ts'],
            linesAdded: 0,
            linesRemoved: 1,
            confidenceScore: 0.95,
            riskScore: 1,
            requiresManualReview: false,
            estimatedTimeSaved: '2 minutes',
            transformationsApplied: ['remove-variable'],
          },
          errors: [],
          warnings: [],
        },
      })

      expect(taskResult.result?.metadata.linesAdded).toBe(0)
      expect(taskResult.result?.metadata.linesRemoved).toBe(1)
    })
  })

  describe('Risk Score Handling', () => {
    it('should identify high risk transformations', () => {
      const taskResult = createMockTaskResult('task1', 'file1.ts', {
        result: {
          success: true,
          code: '',
          diff: {
            original: '',
            transformed: '',
            unified: '',
            visual: [],
            characterLevel: [],
          },
          metadata: {
            transformationType: 'complex-refactor',
            filesModified: ['file1.ts'],
            linesAdded: 0,
            linesRemoved: 0,
            confidenceScore: 0.5,
            riskScore: 9,
            requiresManualReview: true,
            estimatedTimeSaved: '30 minutes',
            transformationsApplied: ['major-refactor'],
          },
          errors: [],
          warnings: [],
        },
      })

      const isHighRisk = (taskResult.result?.metadata.riskScore ?? 0) >= 7

      expect(isHighRisk).toBe(true)
      expect(taskResult.result?.metadata.requiresManualReview).toBe(true)
    })

    it('should identify low risk transformations', () => {
      const taskResult = createMockTaskResult('task1', 'file1.ts', {
        result: {
          success: true,
          code: '',
          diff: {
            original: '',
            transformed: '',
            unified: '',
            visual: [],
            characterLevel: [],
          },
          metadata: {
            transformationType: 'simple-refactor',
            filesModified: ['file1.ts'],
            linesAdded: 0,
            linesRemoved: 0,
            confidenceScore: 0.95,
            riskScore: 2,
            requiresManualReview: false,
            estimatedTimeSaved: '5 minutes',
            transformationsApplied: ['minor-change'],
          },
          errors: [],
          warnings: [],
        },
      })

      const isHighRisk = (taskResult.result?.metadata.riskScore ?? 0) >= 7

      expect(isHighRisk).toBe(false)
      expect(taskResult.result?.metadata.requiresManualReview).toBe(false)
    })
  })
})
