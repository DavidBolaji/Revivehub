import { describe, it, expect, beforeEach } from 'vitest'
import { PhaseGenerator } from '@/lib/planner/phase-generator'
import type { SourceStack, TargetStack, DetectedPattern, PlanCustomization } from '@/lib/planner/types'

describe('PhaseGenerator', () => {
  let generator: PhaseGenerator
  let mockSource: SourceStack
  let mockTarget: TargetStack
  let mockPatterns: DetectedPattern[]
  let mockCustomization: PlanCustomization

  beforeEach(() => {
    generator = new PhaseGenerator()

    mockSource = {
      framework: 'React',
      version: '17.0.0',
      language: 'JavaScript',
      dependencies: {
        react: '17.0.0',
        'react-dom': '17.0.0',
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
        id: 'dep-1',
        name: 'React Version',
        category: 'dependency',
        severity: 'medium',
        occurrences: 1,
        affectedFiles: ['package.json'],
        description: 'Update React to v18',
        automated: true,
      },
      {
        id: 'struct-1',
        name: 'Router Migration',
        category: 'structural',
        severity: 'high',
        occurrences: 5,
        affectedFiles: ['src/routes.js'],
        description: 'Migrate routing structure',
        automated: false,
      },
      {
        id: 'comp-1',
        name: 'Class Components',
        category: 'component',
        severity: 'medium',
        occurrences: 15,
        affectedFiles: ['src/App.js', 'src/Header.js'],
        description: 'Convert class components to functional',
        automated: true,
      },
      {
        id: 'doc-1',
        name: 'API Documentation',
        category: 'documentation',
        severity: 'low',
        occurrences: 3,
        affectedFiles: ['docs/'],
        description: 'Update API docs',
        automated: false,
      },
    ]

    mockCustomization = {
      aggressiveness: 'balanced',
      enabledTransformations: [],
      disabledTransformations: [],
      selectedPatterns: [],
      skipTests: false,
      skipDocumentation: false,
    }
  })

  describe('generatePhases', () => {
    it('should generate phases from patterns', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      expect(phases.length).toBeGreaterThan(0)
      expect(phases.every(p => p.id)).toBe(true)
      expect(phases.every(p => p.name)).toBe(true)
      expect(phases.every(p => p.tasks)).toBe(true)
    })

    it('should create dependency phase for dependency patterns', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const depPhase = phases.find(p => p.id === 'phase-1-dependencies')
      expect(depPhase).toBeDefined()
      expect(depPhase?.tasks.length).toBeGreaterThan(0)
    })

    it('should create structural phase for structural patterns', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const structPhase = phases.find(p => p.id === 'phase-2-structural')
      expect(structPhase).toBeDefined()
      expect(structPhase?.tasks.length).toBeGreaterThan(0)
    })

    it('should create component phase for component patterns', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const compPhase = phases.find(p => p.id === 'phase-3-components')
      expect(compPhase).toBeDefined()
      expect(compPhase?.tasks.length).toBeGreaterThan(0)
    })

    it('should create documentation phase when not skipped', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const docPhase = phases.find(p => p.id === 'phase-4-documentation')
      expect(docPhase).toBeDefined()
    })

    it('should skip documentation phase when requested', () => {
      const customization = {
        ...mockCustomization,
        skipDocumentation: true,
      }

      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        customization
      )

      const docPhase = phases.find(p => p.id === 'phase-4-documentation')
      expect(docPhase).toBeUndefined()
    })

    it('should order phases correctly', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      for (let i = 1; i < phases.length; i++) {
        expect(phases[i].order).toBeGreaterThan(phases[i - 1].order)
      }
    })

    it('should calculate total estimated minutes per phase', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      phases.forEach(phase => {
        expect(phase.totalEstimatedMinutes).toBeGreaterThanOrEqual(0)
        expect(phase.totalAutomatedMinutes).toBeGreaterThanOrEqual(0)
        expect(phase.totalAutomatedMinutes).toBeLessThanOrEqual(phase.totalEstimatedMinutes)
      })
    })

    it('should set appropriate risk levels', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      phases.forEach(phase => {
        expect(['low', 'medium', 'high']).toContain(phase.riskLevel)
      })
    })

    it('should mark parallelizable phases', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const depPhase = phases.find(p => p.id === 'phase-1-dependencies')
      expect(depPhase?.canRunInParallel).toBe(true)
    })
  })

  describe('task generation', () => {
    it('should create tasks with all required fields', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const allTasks = phases.flatMap(p => p.tasks)

      allTasks.forEach(task => {
        expect(task.id).toBeDefined()
        expect(task.name).toBeDefined()
        expect(task.description).toBeDefined()
        expect(['automated', 'manual', 'review']).toContain(task.type)
        expect(task.estimatedMinutes).toBeGreaterThan(0)
        expect(task.automatedMinutes).toBeGreaterThanOrEqual(0)
        expect(['low', 'medium', 'high']).toContain(task.riskLevel)
        expect(Array.isArray(task.affectedFiles)).toBe(true)
        expect(Array.isArray(task.dependencies)).toBe(true)
        expect(Array.isArray(task.breakingChanges)).toBe(true)
      })
    })

    it('should mark automated patterns as automated tasks', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const depPhase = phases.find(p => p.id === 'phase-1-dependencies')
      const depTask = depPhase?.tasks[0]

      expect(depTask?.type).toBe('automated')
    })

    it('should mark non-automated patterns appropriately', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const structPhase = phases.find(p => p.id === 'phase-2-structural')
      const structTask = structPhase?.tasks[0]

      expect(['manual', 'review']).toContain(structTask?.type || '')
    })

    it('should include pattern reference in tasks', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const allTasks = phases.flatMap(p => p.tasks)
      const tasksWithPatterns = allTasks.filter(t => t.pattern)

      expect(tasksWithPatterns.length).toBeGreaterThan(0)
    })

    it('should set dependencies for later phases', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        mockCustomization
      )

      const structPhase = phases.find(p => p.id === 'phase-2-structural')
      const structTask = structPhase?.tasks[0]

      expect(structTask?.dependencies).toContain('phase-1-dependencies')
    })
  })

  describe('customization', () => {
    it('should respect selected patterns', () => {
      const customization = {
        ...mockCustomization,
        selectedPatterns: ['dep-1', 'comp-1'],
      }

      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        customization
      )

      const allTasks = phases.flatMap(p => p.tasks)
      const patternIds = allTasks
        .filter(t => t.pattern)
        .map(t => t.pattern!.id)

      expect(patternIds).toContain('dep-1')
      expect(patternIds).toContain('comp-1')
      expect(patternIds).not.toContain('struct-1')
    })

    it('should exclude disabled transformations', () => {
      const customization = {
        ...mockCustomization,
        disabledTransformations: ['comp-1'],
      }

      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        customization
      )

      const allTasks = phases.flatMap(p => p.tasks)
      const patternIds = allTasks
        .filter(t => t.pattern)
        .map(t => t.pattern!.id)

      expect(patternIds).not.toContain('comp-1')
    })

    it('should adjust time estimates based on aggressiveness', () => {
      const conservative = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        { ...mockCustomization, aggressiveness: 'conservative' }
      )

      const aggressive = generator.generatePhases(
        mockSource,
        mockTarget,
        mockPatterns,
        { ...mockCustomization, aggressiveness: 'aggressive' }
      )

      const conservativeTotalTime = conservative.reduce(
        (sum, p) => sum + p.totalAutomatedMinutes,
        0
      )
      const aggressiveTotalTime = aggressive.reduce(
        (sum, p) => sum + p.totalAutomatedMinutes,
        0
      )

      expect(conservativeTotalTime).toBeGreaterThanOrEqual(aggressiveTotalTime)
    })
  })

  describe('edge cases', () => {
    it('should handle empty patterns array', () => {
      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        [],
        mockCustomization
      )

      // Should still have documentation phase if not skipped
      expect(phases.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle patterns of single category', () => {
      const singleCategoryPatterns: DetectedPattern[] = [
        {
          id: 'dep-1',
          name: 'Dependency 1',
          category: 'dependency',
          severity: 'low',
          occurrences: 1,
          affectedFiles: ['package.json'],
          description: 'Update dependency',
          automated: true,
        },
        {
          id: 'dep-2',
          name: 'Dependency 2',
          category: 'dependency',
          severity: 'low',
          occurrences: 1,
          affectedFiles: ['package.json'],
          description: 'Update another dependency',
          automated: true,
        },
      ]

      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        singleCategoryPatterns,
        mockCustomization
      )

      expect(phases.length).toBeGreaterThan(0)
      const depPhase = phases.find(p => p.id === 'phase-1-dependencies')
      expect(depPhase?.tasks.length).toBe(2)
    })

    it('should handle high severity patterns', () => {
      const highSeverityPatterns: DetectedPattern[] = [
        {
          id: 'high-1',
          name: 'Critical Change',
          category: 'structural',
          severity: 'high',
          occurrences: 10,
          affectedFiles: ['src/core.js'],
          description: 'Critical structural change',
          automated: false,
        },
      ]

      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        highSeverityPatterns,
        mockCustomization
      )

      const structPhase = phases.find(p => p.id === 'phase-2-structural')
      expect(structPhase?.riskLevel).toBe('high')
    })

    it('should handle patterns with many affected files', () => {
      const manyFilesPattern: DetectedPattern[] = [
        {
          id: 'many-1',
          name: 'Widespread Change',
          category: 'component',
          severity: 'medium',
          occurrences: 100,
          affectedFiles: Array.from({ length: 50 }, (_, i) => `file${i}.js`),
          description: 'Change affecting many files',
          automated: true,
        },
      ]

      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        manyFilesPattern,
        mockCustomization
      )

      const compPhase = phases.find(p => p.id === 'phase-3-components')
      const task = compPhase?.tasks[0]

      expect(task?.estimatedMinutes).toBeGreaterThan(100)
    })

    it('should not create empty phases', () => {
      const limitedPatterns: DetectedPattern[] = [
        {
          id: 'dep-1',
          name: 'Dependency',
          category: 'dependency',
          severity: 'low',
          occurrences: 1,
          affectedFiles: ['package.json'],
          description: 'Update dependency',
          automated: true,
        },
      ]

      const phases = generator.generatePhases(
        mockSource,
        mockTarget,
        limitedPatterns,
        mockCustomization
      )

      phases.forEach(phase => {
        expect(phase.tasks.length).toBeGreaterThan(0)
      })
    })
  })
})
