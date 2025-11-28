import { describe, it, expect, beforeEach } from 'vitest'
import { ComplexityEstimator } from '@/lib/planner/complexity-estimator'
import type { SourceStack, TargetStack, DetectedPattern } from '@/lib/planner/types'

describe('ComplexityEstimator', () => {
  let estimator: ComplexityEstimator
  let mockSource: SourceStack
  let mockTarget: TargetStack
  let mockPatterns: DetectedPattern[]
  let mockStats: { totalFiles: number; totalLines: number; testCoverage: number }

  beforeEach(() => {
    estimator = new ComplexityEstimator()

    mockSource = {
      framework: 'React',
      version: '17.0.0',
      language: 'JavaScript',
      dependencies: {
        react: '17.0.0',
        'react-dom': '17.0.0',
        lodash: '4.17.21',
      },
      patterns: ['class-components'],
    }

    mockTarget = {
      framework: 'React',
      version: '18.0.0',
      language: 'TypeScript',
      dependencies: {
        react: '18.0.0',
        'react-dom': '18.0.0',
        typescript: '5.0.0',
      },
      features: ['hooks', 'concurrent-rendering'],
    }

    mockPatterns = [
      {
        id: 'pattern-1',
        name: 'Class Components',
        category: 'component',
        severity: 'medium',
        occurrences: 10,
        affectedFiles: ['src/App.js', 'src/Header.js'],
        description: 'Legacy class components',
        automated: true,
      },
    ]

    mockStats = {
      totalFiles: 50,
      totalLines: 5000,
      testCoverage: 75,
    }
  })

  describe('estimateComplexity', () => {
    it('should return complexity estimate with all fields', () => {
      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        mockPatterns,
        mockStats
      )

      expect(estimate).toBeDefined()
      expect(estimate.score).toBeGreaterThanOrEqual(0)
      expect(estimate.score).toBeLessThanOrEqual(100)
      expect(estimate.level).toBeDefined()
      expect(estimate.factors).toBeDefined()
      expect(Array.isArray(estimate.recommendations)).toBe(true)
    })

    it('should classify small codebase as simple', () => {
      const smallStats = {
        totalFiles: 10,
        totalLines: 500,
        testCoverage: 80,
      }

      const simplePatterns: DetectedPattern[] = [
        {
          id: 'pattern-1',
          name: 'Simple Pattern',
          category: 'component',
          severity: 'low',
          occurrences: 2,
          affectedFiles: ['file1.js'],
          description: 'Simple pattern',
          automated: true,
        },
      ]

      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        simplePatterns,
        smallStats
      )

      expect(['trivial', 'simple', 'moderate']).toContain(estimate.level)
    })

    it('should classify large codebase as more complex', () => {
      const largeStats = {
        totalFiles: 500,
        totalLines: 100000,
        testCoverage: 40,
      }

      const manyPatterns: DetectedPattern[] = Array.from({ length: 20 }, (_, i) => ({
        id: `pattern-${i}`,
        name: `Pattern ${i}`,
        category: 'component',
        severity: 'high',
        occurrences: 50,
        affectedFiles: [`file${i}.js`],
        description: 'Complex pattern',
        automated: false,
      }))

      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        manyPatterns,
        largeStats
      )

      // Large codebase should have higher complexity score
      expect(estimate.score).toBeGreaterThan(30)
      expect(estimate.level).toBeDefined()
    })

    it('should consider test coverage in complexity', () => {
      const lowCoverage = {
        ...mockStats,
        testCoverage: 20,
      }

      const highCoverage = {
        ...mockStats,
        testCoverage: 90,
      }

      const lowEstimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        mockPatterns,
        lowCoverage
      )

      const highEstimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        mockPatterns,
        highCoverage
      )

      // Higher test coverage should result in lower complexity
      expect(highEstimate.score).toBeLessThan(lowEstimate.score)
    })

    it('should factor in framework distance', () => {
      const sameFramework = {
        ...mockTarget,
        framework: 'React',
        version: '18.0.0',
      }

      const differentFramework = {
        ...mockTarget,
        framework: 'Vue',
        version: '3.0.0',
      }

      const sameEstimate = estimator.estimateComplexity(
        mockSource,
        sameFramework,
        mockPatterns,
        mockStats
      )

      const diffEstimate = estimator.estimateComplexity(
        mockSource,
        differentFramework,
        mockPatterns,
        mockStats
      )

      expect(diffEstimate.factors.frameworkDistance).toBeGreaterThan(
        sameEstimate.factors.frameworkDistance
      )
    })
  })

  describe('estimateTaskTime', () => {
    it('should estimate time for automated task', () => {
      const task = {
        type: 'automated' as const,
        affectedFiles: ['file1.js', 'file2.js', 'file3.js'],
        complexity: 'medium' as const,
      }

      const estimate = estimator.estimateTaskTime(task, 'balanced')

      expect(estimate.manual).toBeGreaterThan(0)
      expect(estimate.automated).toBeGreaterThan(0)
      expect(estimate.automated).toBeLessThan(estimate.manual)
    })

    it('should estimate time for manual task', () => {
      const task = {
        type: 'manual' as const,
        affectedFiles: ['file1.js', 'file2.js'],
        complexity: 'high' as const,
      }

      const estimate = estimator.estimateTaskTime(task, 'balanced')

      expect(estimate.manual).toBeGreaterThan(0)
      expect(estimate.automated).toBe(estimate.manual)
    })

    it('should scale with number of affected files', () => {
      const smallTask = {
        type: 'automated' as const,
        affectedFiles: ['file1.js'],
        complexity: 'medium' as const,
      }

      const largeTask = {
        type: 'automated' as const,
        affectedFiles: ['file1.js', 'file2.js', 'file3.js', 'file4.js', 'file5.js'],
        complexity: 'medium' as const,
      }

      const smallEstimate = estimator.estimateTaskTime(smallTask, 'balanced')
      const largeEstimate = estimator.estimateTaskTime(largeTask, 'balanced')

      expect(largeEstimate.manual).toBeGreaterThan(smallEstimate.manual)
      expect(largeEstimate.automated).toBeGreaterThan(smallEstimate.automated)
    })

    it('should adjust for aggressiveness level', () => {
      const task = {
        type: 'automated' as const,
        affectedFiles: ['file1.js', 'file2.js', 'file3.js', 'file4.js', 'file5.js'],
        complexity: 'high' as const,
      }

      const conservative = estimator.estimateTaskTime(task, 'conservative')
      const balanced = estimator.estimateTaskTime(task, 'balanced')
      const aggressive = estimator.estimateTaskTime(task, 'aggressive')

      expect(conservative.automated).toBeGreaterThan(balanced.automated)
      expect(balanced.automated).toBeGreaterThanOrEqual(aggressive.automated)
    })

    it('should handle different complexity levels', () => {
      const lowTask = {
        type: 'automated' as const,
        affectedFiles: ['file1.js'],
        complexity: 'low' as const,
      }

      const mediumTask = {
        type: 'automated' as const,
        affectedFiles: ['file1.js'],
        complexity: 'medium' as const,
      }

      const highTask = {
        type: 'automated' as const,
        affectedFiles: ['file1.js'],
        complexity: 'high' as const,
      }

      const lowEstimate = estimator.estimateTaskTime(lowTask, 'balanced')
      const mediumEstimate = estimator.estimateTaskTime(mediumTask, 'balanced')
      const highEstimate = estimator.estimateTaskTime(highTask, 'balanced')

      expect(lowEstimate.manual).toBeLessThan(mediumEstimate.manual)
      expect(mediumEstimate.manual).toBeLessThan(highEstimate.manual)
    })

    it('should handle review tasks with partial automation', () => {
      const reviewTask = {
        type: 'review' as const,
        affectedFiles: ['file1.js', 'file2.js'],
        complexity: 'medium' as const,
      }

      const estimate = estimator.estimateTaskTime(reviewTask, 'balanced')

      expect(estimate.automated).toBeGreaterThan(0)
      expect(estimate.automated).toBeLessThan(estimate.manual)
      // Review should save less time than fully automated
      expect(estimate.automated / estimate.manual).toBeGreaterThan(0.2)
      expect(estimate.automated / estimate.manual).toBeLessThan(0.5)
    })
  })

  describe('recommendations', () => {
    it('should recommend testing for low coverage', () => {
      const lowCoverageStats = {
        ...mockStats,
        testCoverage: 30,
      }

      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        mockPatterns,
        lowCoverageStats
      )

      expect(
        estimate.recommendations.some(r => r.toLowerCase().includes('test'))
      ).toBe(true)
    })

    it('should recommend incremental migration for complex projects', () => {
      const complexStats = {
        totalFiles: 500,
        totalLines: 100000,
        testCoverage: 50,
      }

      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        mockPatterns,
        complexStats
      )

      expect(
        estimate.recommendations.some(r => r.toLowerCase().includes('incremental'))
      ).toBe(true)
    })

    it('should recommend dependency audit for many dependencies', () => {
      const manyDeps = {
        ...mockSource,
        dependencies: Object.fromEntries(
          Array.from({ length: 60 }, (_, i) => [`dep${i}`, '1.0.0'])
        ),
      }

      const estimate = estimator.estimateComplexity(
        manyDeps,
        mockTarget,
        mockPatterns,
        mockStats
      )

      expect(
        estimate.recommendations.some(r => r.toLowerCase().includes('dependenc'))
      ).toBe(true)
    })

    it('should recommend learning time for framework changes', () => {
      const differentFramework = {
        ...mockTarget,
        framework: 'Vue',
        version: '3.0.0',
      }

      const estimate = estimator.estimateComplexity(
        mockSource,
        differentFramework,
        mockPatterns,
        mockStats
      )

      expect(
        estimate.recommendations.some(r => r.toLowerCase().includes('learning'))
      ).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty patterns array', () => {
      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        [],
        mockStats
      )

      // With empty patterns, score should still be valid (based on other factors)
      expect(estimate.score).toBeDefined()
      expect(estimate.level).toBeDefined()
      expect(['trivial', 'simple', 'moderate', 'complex', 'very-complex']).toContain(estimate.level)
    })

    it('should handle zero test coverage', () => {
      const noTests = {
        ...mockStats,
        testCoverage: 0,
      }

      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        mockPatterns,
        noTests
      )

      expect(estimate.score).toBeGreaterThanOrEqual(0)
      expect(estimate.recommendations.length).toBeGreaterThan(0)
    })

    it('should handle very small codebase', () => {
      const tinyStats = {
        totalFiles: 1,
        totalLines: 100,
        testCoverage: 100,
      }

      const simplePattern: DetectedPattern[] = [
        {
          id: 'pattern-1',
          name: 'Simple',
          category: 'component',
          severity: 'low',
          occurrences: 1,
          affectedFiles: ['file1.js'],
          description: 'Simple',
          automated: true,
        },
      ]

      const estimate = estimator.estimateComplexity(
        mockSource,
        mockTarget,
        simplePattern,
        tinyStats
      )

      expect(['trivial', 'simple']).toContain(estimate.level)
      expect(estimate.score).toBeLessThan(50)
    })

    it('should handle task with no affected files', () => {
      const task = {
        type: 'automated' as const,
        affectedFiles: [],
        complexity: 'medium' as const,
      }

      const estimate = estimator.estimateTaskTime(task, 'balanced')

      expect(estimate.manual).toBe(0)
      expect(estimate.automated).toBe(0)
    })
  })
})
