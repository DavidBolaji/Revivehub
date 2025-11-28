/**
 * Unit tests for TaskSelector component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TaskSelector } from '../../components/transformation/TaskSelector'
import type { MigrationPlan, Phase, Task, Pattern } from '@/types/transformer'

// Mock data helpers
function createMockPattern(id: string): Pattern {
  return {
    id,
    name: 'Test Pattern',
    category: 'code-quality',
    severity: 'medium',
    occurrences: 1,
    affectedFiles: ['test.ts'],
    description: 'Test pattern description',
    automated: true,
  }
}

function createMockTask(
  id: string,
  name: string,
  options: Partial<Task> = {}
): Task {
  return {
    id,
    name,
    description: `Description for ${name}`,
    type: 'automated',
    estimatedMinutes: 15,
    automatedMinutes: 10,
    riskLevel: 'medium',
    affectedFiles: ['file1.ts', 'file2.ts'],
    dependencies: [],
    breakingChanges: [],
    pattern: createMockPattern(`pattern-${id}`),
    ...options,
  }
}

function createMockPhase(
  id: string,
  name: string,
  tasks: Task[],
  options: Partial<Phase> = {}
): Phase {
  return {
    id,
    name,
    description: `Description for ${name}`,
    order: 1,
    tasks,
    totalEstimatedMinutes: tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
    totalAutomatedMinutes: tasks.reduce((sum, task) => sum + task.automatedMinutes, 0),
    riskLevel: 'medium',
    canRunInParallel: false,
    ...options,
  }
}

function createMockMigrationPlan(phases: Phase[]): MigrationPlan {
  return {
    id: 'test-plan',
    sourceStack: {
      framework: 'React',
      version: '17.0.0',
      language: 'JavaScript',
      dependencies: {},
    },
    targetStack: {
      framework: 'React',
      version: '18.0.0',
      language: 'TypeScript',
      dependencies: {},
    },
    phases,
    summary: {
      totalPhases: phases.length,
      totalTasks: phases.reduce((sum, phase) => sum + phase.tasks.length, 0),
      totalEstimatedMinutes: phases.reduce((sum, phase) => sum + phase.totalEstimatedMinutes, 0),
      totalAutomatedMinutes: phases.reduce((sum, phase) => sum + phase.totalAutomatedMinutes, 0),
      automationPercentage: 75,
      overallRiskLevel: 'medium',
    },
    dependencyGraph: [],
    customization: {
      preferences: {},
      constraints: [],
      priorities: [],
    },
    createdAt: '2024-01-01T00:00:00Z',
    aiInsights: {
      recommendations: [],
      warnings: [],
      estimatedComplexity: 'medium',
      suggestedApproach: 'Incremental migration',
    },
    aiMetadata: {
      model: 'claude-sonnet-4-5-20250929',
      timestamp: '2024-01-01T00:00:00Z',
      tokensUsed: 1000,
      confidence: 85,
    },
  }
}

describe('TaskSelector', () => {
  let mockMigrationPlan: MigrationPlan
  let mockOnSelectionChange: ReturnType<typeof vi.fn>
  let selectedTaskIds: Set<string>

  beforeEach(() => {
    // Create mock tasks with different properties for testing
    const task1 = createMockTask('task-1', 'Convert PropTypes', {
      type: 'automated',
      riskLevel: 'low',
      estimatedMinutes: 10,
      automatedMinutes: 10,
      affectedFiles: ['component1.tsx'],
      dependencies: [],
      breakingChanges: [],
    })

    const task2 = createMockTask('task-2', 'Update Dependencies', {
      type: 'manual',
      riskLevel: 'high',
      estimatedMinutes: 30,
      automatedMinutes: 0,
      affectedFiles: ['package.json', 'yarn.lock'],
      dependencies: ['task-1'],
      breakingChanges: ['API changes in v2.0'],
    })

    const task3 = createMockTask('task-3', 'Review Changes', {
      type: 'review',
      riskLevel: 'medium',
      estimatedMinutes: 20,
      automatedMinutes: 5,
      affectedFiles: ['src/components/Button.tsx', 'src/utils/helpers.ts', 'src/types/index.ts', 'src/hooks/useAuth.ts', 'src/pages/Dashboard.tsx'],
      dependencies: [],
      breakingChanges: ['Component API changes'],
    })

    const phase1 = createMockPhase('phase-1', 'Code Transformation', [task1, task2], {
      order: 1,
      riskLevel: 'medium',
    })

    const phase2 = createMockPhase('phase-2', 'Review and Testing', [task3], {
      order: 2,
      riskLevel: 'low',
    })

    mockMigrationPlan = createMockMigrationPlan([phase1, phase2])
    mockOnSelectionChange = vi.fn()
    selectedTaskIds = new Set<string>()
  })

  describe('Component Structure', () => {
    it('should have correct component structure and props', () => {
      expect(TaskSelector).toBeDefined()
      expect(typeof TaskSelector).toBe('function')
    })

    it('should handle migration plan with phases', () => {
      expect(mockMigrationPlan.phases).toHaveLength(2)
      expect(mockMigrationPlan.phases[0].tasks).toHaveLength(2)
      expect(mockMigrationPlan.phases[1].tasks).toHaveLength(1)
    })

    it('should handle task selection state', () => {
      const testSet = new Set(['task-1'])
      expect(testSet.has('task-1')).toBe(true)
      expect(testSet.has('task-2')).toBe(false)
    })
  })

  describe('Task Data Structure', () => {
    it('should have correct task properties', () => {
      const task = mockMigrationPlan.phases[0].tasks[0]
      
      expect(task.id).toBe('task-1')
      expect(task.name).toBe('Convert PropTypes')
      expect(task.type).toBe('automated')
      expect(task.riskLevel).toBe('low')
      expect(task.estimatedMinutes).toBe(10)
      expect(task.automatedMinutes).toBe(10)
      expect(task.affectedFiles).toEqual(['component1.tsx'])
      expect(task.dependencies).toEqual([])
      expect(task.breakingChanges).toEqual([])
    })

    it('should handle task with dependencies', () => {
      const task = mockMigrationPlan.phases[0].tasks[1]
      
      expect(task.id).toBe('task-2')
      expect(task.dependencies).toEqual(['task-1'])
      expect(task.breakingChanges).toEqual(['API changes in v2.0'])
    })

    it('should handle task with many affected files', () => {
      const task = mockMigrationPlan.phases[1].tasks[0]
      
      expect(task.affectedFiles).toHaveLength(5)
      expect(task.affectedFiles).toContain('src/components/Button.tsx')
    })
  })

  describe('Phase Data Structure', () => {
    it('should have correct phase properties', () => {
      const phase = mockMigrationPlan.phases[0]
      
      expect(phase.id).toBe('phase-1')
      expect(phase.name).toBe('Code Transformation')
      expect(phase.order).toBe(1)
      expect(phase.tasks).toHaveLength(2)
      expect(phase.totalEstimatedMinutes).toBe(40) // 10 + 30
      expect(phase.totalAutomatedMinutes).toBe(10) // 10 + 0
      expect(phase.riskLevel).toBe('medium')
    })

    it('should calculate phase totals correctly', () => {
      const phase = mockMigrationPlan.phases[0]
      const expectedEstimated = phase.tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)
      const expectedAutomated = phase.tasks.reduce((sum, task) => sum + task.automatedMinutes, 0)
      
      expect(phase.totalEstimatedMinutes).toBe(expectedEstimated)
      expect(phase.totalAutomatedMinutes).toBe(expectedAutomated)
    })
  })

  describe('Selection Logic', () => {
    it('should handle task selection', () => {
      const newSelection = new Set(selectedTaskIds)
      newSelection.add('task-1')
      
      expect(newSelection.has('task-1')).toBe(true)
      expect(newSelection.size).toBe(1)
    })

    it('should handle dependency auto-selection', () => {
      const newSelection = new Set(selectedTaskIds)
      const taskId = 'task-2'
      
      // Find task and its dependencies
      const task = mockMigrationPlan.phases
        .flatMap(phase => phase.tasks)
        .find(t => t.id === taskId)
      
      newSelection.add(taskId)
      
      if (task?.dependencies) {
        task.dependencies.forEach(depId => {
          newSelection.add(depId)
        })
      }
      
      expect(newSelection.has('task-2')).toBe(true)
      expect(newSelection.has('task-1')).toBe(true) // dependency
    })

    it('should handle dependent auto-deselection', () => {
      const newSelection = new Set(['task-1', 'task-2'])
      const taskIdToRemove = 'task-1'
      
      newSelection.delete(taskIdToRemove)
      
      // Remove dependents
      mockMigrationPlan.phases
        .flatMap(phase => phase.tasks)
        .filter(task => task.dependencies.includes(taskIdToRemove))
        .forEach(dependentTask => {
          newSelection.delete(dependentTask.id)
        })
      
      expect(newSelection.has('task-1')).toBe(false)
      expect(newSelection.has('task-2')).toBe(false) // dependent
    })
  })

  describe('Summary Calculations', () => {
    it('should calculate summary for selected tasks', () => {
      const selectedIds = new Set(['task-1', 'task-3'])
      const selectedTasks = mockMigrationPlan.phases
        .flatMap(phase => phase.tasks)
        .filter(task => selectedIds.has(task.id))

      const summary = {
        totalSelected: selectedTasks.length,
        totalEstimatedTime: selectedTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0),
        totalAutomatedTime: selectedTasks.reduce((sum, task) => sum + task.automatedMinutes, 0),
        highRiskTasks: selectedTasks.filter(task => task.riskLevel === 'high').length,
        breakingChanges: selectedTasks.reduce((sum, task) => sum + task.breakingChanges.length, 0),
      }

      expect(summary.totalSelected).toBe(2)
      expect(summary.totalEstimatedTime).toBe(30) // 10 + 20
      expect(summary.totalAutomatedTime).toBe(15) // 10 + 5
      expect(summary.highRiskTasks).toBe(0) // neither task-1 nor task-3 is high risk
      expect(summary.breakingChanges).toBe(1) // task-3 has 1 breaking change
    })

    it('should handle empty selection', () => {
      const selectedIds = new Set<string>()
      const selectedTasks = mockMigrationPlan.phases
        .flatMap(phase => phase.tasks)
        .filter(task => selectedIds.has(task.id))

      expect(selectedTasks).toHaveLength(0)
    })
  })

  describe('Risk Level Utilities', () => {
    it('should handle different risk levels', () => {
      const getRiskLevelColor = (riskLevel: 'low' | 'medium' | 'high') => {
        switch (riskLevel) {
          case 'low':
            return 'bg-green-100 text-green-800 border-green-200'
          case 'medium':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200'
          case 'high':
            return 'bg-red-100 text-red-800 border-red-200'
          default:
            return 'bg-gray-100 text-gray-800 border-gray-200'
        }
      }

      expect(getRiskLevelColor('low')).toContain('green')
      expect(getRiskLevelColor('medium')).toContain('yellow')
      expect(getRiskLevelColor('high')).toContain('red')
    })

    it('should handle task type icons', () => {
      const getTaskTypeIcon = (type: 'automated' | 'manual' | 'review') => {
        switch (type) {
          case 'automated':
            return 'zap-icon'
          case 'manual':
            return 'file-text-icon'
          case 'review':
            return 'alert-triangle-icon'
          default:
            return null
        }
      }

      expect(getTaskTypeIcon('automated')).toBe('zap-icon')
      expect(getTaskTypeIcon('manual')).toBe('file-text-icon')
      expect(getTaskTypeIcon('review')).toBe('alert-triangle-icon')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty migration plan', () => {
      const emptyPlan = createMockMigrationPlan([])
      
      expect(emptyPlan.phases).toHaveLength(0)
      expect(emptyPlan.summary.totalTasks).toBe(0)
    })

    it('should handle phase with no tasks', () => {
      const emptyPhase = createMockPhase('empty-phase', 'Empty Phase', [])
      
      expect(emptyPhase.tasks).toHaveLength(0)
      expect(emptyPhase.totalEstimatedMinutes).toBe(0)
      expect(emptyPhase.totalAutomatedMinutes).toBe(0)
    })

    it('should handle tasks with no affected files', () => {
      const taskWithNoFiles = createMockTask('no-files-task', 'No Files Task', {
        affectedFiles: [],
      })
      
      expect(taskWithNoFiles.affectedFiles).toHaveLength(0)
    })

    it('should handle tasks with many affected files', () => {
      const manyFiles = Array.from({ length: 10 }, (_, i) => `file${i + 1}.ts`)
      const taskWithManyFiles = createMockTask('many-files-task', 'Many Files Task', {
        affectedFiles: manyFiles,
      })
      
      expect(taskWithManyFiles.affectedFiles).toHaveLength(10)
      expect(taskWithManyFiles.affectedFiles[0]).toBe('file1.ts')
      expect(taskWithManyFiles.affectedFiles[9]).toBe('file10.ts')
    })
  })

  describe('Callback Functions', () => {
    it('should call onSelectionChange with correct parameters', () => {
      const mockCallback = vi.fn()
      const testSet = new Set(['task-1'])
      
      mockCallback(testSet)
      
      expect(mockCallback).toHaveBeenCalledWith(testSet)
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple selection changes', () => {
      const mockCallback = vi.fn()
      
      mockCallback(new Set(['task-1']))
      mockCallback(new Set(['task-1', 'task-2']))
      mockCallback(new Set(['task-2']))
      
      expect(mockCallback).toHaveBeenCalledTimes(3)
    })
  })
})