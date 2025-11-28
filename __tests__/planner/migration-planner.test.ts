import { describe, it, expect, beforeEach } from 'vitest'
import { MigrationPlanner } from '@/lib/planner/migration-planner'
import type { SourceStack, TargetStack, DetectedPattern } from '@/lib/planner/types'

describe('MigrationPlanner', () => {
  let planner: MigrationPlanner
  let mockSource: SourceStack
  let mockTarget: TargetStack
  let mockPatterns: DetectedPattern[]
  let mockCodebaseStats: { totalFiles: number; totalLines: number; testCoverage: number }

  beforeEach(() => {
    planner = new MigrationPlanner()
    
    mockSource = {
      framework: 'React',
      version: '17.0.0',
      language: 'JavaScript',
      dependencies: {
        react: '17.0.0',
        'react-dom': '17.0.0',
      },
      patterns: ['class-components', 'prop-types'],
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
      features: ['hooks', 'concurrent-rendering', 'automatic-batching'],
    }

    mockPatterns = [
      {
        id: 'pattern-1',
        name: 'Class Components',
        category: 'component',
        severity: 'medium',
        occurrences: 15,
        affectedFiles: ['src/App.js', 'src/Header.js'],
        description: 'Legacy class components found',
        automated: true,
      },
      {
        id: 'pattern-2',
        name: 'PropTypes',
        category: 'dependency',
        severity: 'low',
        occurrences: 10,
        affectedFiles: ['src/types.js'],
        description: 'PropTypes usage detected',
        automated: true,
      },
    ]

    mockCodebaseStats = {
      totalFiles: 50,
      totalLines: 5000,
      testCoverage: 75,
    }
  })

  describe('createPlan', () => {
    it('should create a migration plan with all phases', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      expect(plan).toBeDefined()
      expect(plan.id).toMatch(/^plan-\d+$/)
      expect(plan.phases).toBeDefined()
      expect(plan.phases.length).toBeGreaterThan(0)
      expect(plan.summary).toBeDefined()
      expect(plan.summary.totalTasks).toBeGreaterThan(0)
    })

    it('should include summary statistics', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      expect(plan.summary.totalTasks).toBeGreaterThan(0)
      expect(plan.summary.automatedTasks).toBeGreaterThanOrEqual(0)
      expect(plan.summary.manualTasks).toBeGreaterThanOrEqual(0)
      expect(plan.summary.reviewTasks).toBeGreaterThanOrEqual(0)
      expect(plan.summary.totalEstimatedMinutes).toBeGreaterThan(0)
      expect(plan.summary.automationPercentage).toBeGreaterThanOrEqual(0)
      expect(plan.summary.overallComplexity).toBeGreaterThanOrEqual(0)
      expect(plan.summary.requiredSkills).toContain('React experience')
    })

    it('should build dependency graph', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      expect(plan.dependencyGraph).toBeDefined()
      expect(Array.isArray(plan.dependencyGraph)).toBe(true)
    })

    it('should apply customization options', async () => {
      const customization = {
        aggressiveness: 'aggressive' as const,
        skipTests: true,
        skipDocumentation: true,
      }

      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats,
        customization
      )

      expect(plan.customization.aggressiveness).toBe('aggressive')
      expect(plan.customization.skipTests).toBe(true)
      expect(plan.customization.skipDocumentation).toBe(true)
    })

    it('should handle empty patterns array', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        [],
        mockCodebaseStats
      )

      expect(plan.phases).toBeDefined()
      expect(plan.summary.totalTasks).toBeGreaterThanOrEqual(0)
    })
  })

  describe('exportPlanSummary', () => {
    it('should export plan summary as markdown', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const summary = planner.exportPlanSummary(plan)

      expect(summary).toContain('# Migration Plan Summary')
      expect(summary).toContain('## Overview')
      expect(summary).toContain('## Time Estimates')
      expect(summary).toContain('## Required Skills')
      expect(summary).toContain('## Migration Phases')
    })

    it('should include source and target information', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const summary = planner.exportPlanSummary(plan)

      expect(summary).toContain('React 17.0.0')
      expect(summary).toContain('React 18.0.0')
    })

    it('should include all phase details', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const summary = planner.exportPlanSummary(plan)

      plan.phases.forEach(phase => {
        expect(summary).toContain(phase.name)
        expect(summary).toContain(phase.description)
      })
    })
  })

  describe('optimizePlan', () => {
    it('should optimize task order within phases', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const optimized = await planner.optimizePlan(plan)

      expect(optimized.phases).toBeDefined()
      expect(optimized.phases.length).toBe(plan.phases.length)
    })

    it('should prioritize automated tasks', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const optimized = await planner.optimizePlan(plan)

      // Check that automated tasks come before manual tasks in each phase
      optimized.phases.forEach(phase => {
        let seenManual = false
        phase.tasks.forEach(task => {
          if (task.type === 'manual') {
            seenManual = true
          }
          if (seenManual && task.type === 'automated') {
            // This should not happen after optimization
            expect(false).toBe(true)
          }
        })
      })
    })
  })

  describe('validatePlan', () => {
    it('should validate a correct plan', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const validation = await planner.validatePlan(plan)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect empty phases', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      // Add an empty phase
      plan.phases.push({
        id: 'empty-phase',
        name: 'Empty Phase',
        description: 'This phase has no tasks',
        order: 999,
        tasks: [],
        totalEstimatedMinutes: 0,
        totalAutomatedMinutes: 0,
        riskLevel: 'low',
        canRunInParallel: false,
      })

      const validation = await planner.validatePlan(plan)

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some(e => e.includes('no tasks'))).toBe(true)
    })
  })

  describe('generateExecutionTimeline', () => {
    it('should generate execution timeline', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const timeline = planner.generateExecutionTimeline(plan)

      expect(timeline.sequential).toBeGreaterThan(0)
      expect(timeline.parallel).toBeGreaterThan(0)
      expect(timeline.parallel).toBeLessThanOrEqual(timeline.sequential)
      expect(Array.isArray(timeline.batches)).toBe(true)
    })

    it('should show time savings with parallel execution', async () => {
      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCodebaseStats
      )

      const timeline = planner.generateExecutionTimeline(plan)

      // Parallel execution should be faster or equal to sequential
      expect(timeline.parallel).toBeLessThanOrEqual(timeline.sequential)
    })
  })

  describe('edge cases', () => {
    it('should handle very large codebase', async () => {
      const largeStats = {
        totalFiles: 1000,
        totalLines: 100000,
        testCoverage: 50,
      }

      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        mockPatterns,
        largeStats
      )

      expect(plan.summary.totalEstimatedMinutes).toBeGreaterThan(0)
      expect(plan.summary.overallComplexity).toBeGreaterThan(0)
    })

    it('should handle multiple patterns', async () => {
      const manyPatterns: DetectedPattern[] = [
        ...mockPatterns,
        {
          id: 'pattern-3',
          name: 'Legacy Lifecycle Methods',
          category: 'component',
          severity: 'high',
          occurrences: 25,
          affectedFiles: ['src/OldComponent.js'],
          description: 'componentWillMount usage',
          automated: true,
        },
        {
          id: 'pattern-4',
          name: 'Inline Styles',
          category: 'structural',
          severity: 'low',
          occurrences: 50,
          affectedFiles: ['src/styles.js'],
          description: 'Inline style objects',
          automated: false,
        },
      ]

      const plan = await planner.createPlan(
        mockSource,
        mockTarget,
        manyPatterns,
        mockCodebaseStats
      )

      expect(plan.phases.length).toBeGreaterThan(0)
      expect(plan.summary.totalTasks).toBeGreaterThan(0)
    })

    it('should handle framework change', async () => {
      const differentTarget: TargetStack = {
        framework: 'Next.js',
        version: '14.0.0',
        language: 'TypeScript',
        dependencies: {
          next: '14.0.0',
          react: '18.0.0',
        },
        features: ['app-router', 'server-components', 'streaming'],
      }

      const plan = await planner.createPlan(
        mockSource,
        differentTarget,
        mockPatterns,
        mockCodebaseStats
      )

      expect(plan.summary.requiredSkills).toContain('Next.js experience')
      expect(plan.summary.overallComplexity).toBeGreaterThan(0)
    })
  })
})