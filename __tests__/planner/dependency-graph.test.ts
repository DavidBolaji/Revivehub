import { describe, it, expect, beforeEach } from 'vitest'
import { DependencyGraphBuilder } from '@/lib/planner/dependency-graph'
import type { MigrationTask } from '@/lib/planner/types'

describe('DependencyGraphBuilder', () => {
  let builder: DependencyGraphBuilder
  let mockTasks: MigrationTask[]

  beforeEach(() => {
    builder = new DependencyGraphBuilder()

    mockTasks = [
      {
        id: 'task-1',
        name: 'Update Dependencies',
        description: 'Update package.json',
        type: 'automated',
        estimatedMinutes: 30,
        automatedMinutes: 5,
        riskLevel: 'low',
        affectedFiles: ['package.json'],
        dependencies: [],
        breakingChanges: [],
      },
      {
        id: 'task-2',
        name: 'Migrate Components',
        description: 'Convert class components',
        type: 'automated',
        estimatedMinutes: 120,
        automatedMinutes: 20,
        riskLevel: 'medium',
        affectedFiles: ['src/App.js'],
        dependencies: ['task-1'],
        breakingChanges: [],
      },
      {
        id: 'task-3',
        name: 'Update Tests',
        description: 'Fix test files',
        type: 'manual',
        estimatedMinutes: 60,
        automatedMinutes: 60,
        riskLevel: 'low',
        affectedFiles: ['tests/'],
        dependencies: ['task-2'],
        breakingChanges: [],
      },
    ]
  })

  describe('buildGraph', () => {
    it('should build dependency graph from tasks', () => {
      const graph = builder.buildGraph(mockTasks)

      expect(graph).toHaveLength(3)
      expect(graph[0].taskId).toBe('task-1')
      expect(graph[1].taskId).toBe('task-2')
      expect(graph[2].taskId).toBe('task-3')
    })

    it('should identify dependencies correctly', () => {
      const graph = builder.buildGraph(mockTasks)

      const task1Node = graph.find(n => n.taskId === 'task-1')
      const task2Node = graph.find(n => n.taskId === 'task-2')
      const task3Node = graph.find(n => n.taskId === 'task-3')

      expect(task1Node?.dependsOn).toHaveLength(0)
      expect(task2Node?.dependsOn).toContain('task-1')
      expect(task3Node?.dependsOn).toContain('task-2')
    })

    it('should identify blocked tasks', () => {
      const graph = builder.buildGraph(mockTasks)

      const task1Node = graph.find(n => n.taskId === 'task-1')
      const task2Node = graph.find(n => n.taskId === 'task-2')

      expect(task1Node?.blockedBy).toContain('task-2')
      expect(task2Node?.blockedBy).toContain('task-3')
    })

    it('should mark tasks that can run in parallel', () => {
      const graph = builder.buildGraph(mockTasks)

      const task1Node = graph.find(n => n.taskId === 'task-1')
      const task2Node = graph.find(n => n.taskId === 'task-2')

      expect(task1Node?.canRunInParallel).toBe(true)
      expect(task2Node?.canRunInParallel).toBe(false)
    })

    it('should mark critical path', () => {
      const graph = builder.buildGraph(mockTasks)

      // At least one task should be on critical path
      const criticalTasks = graph.filter(n => n.criticalPath)
      expect(criticalTasks.length).toBeGreaterThan(0)
    })

    it('should handle tasks with no dependencies', () => {
      const independentTasks: MigrationTask[] = [
        {
          id: 'task-a',
          name: 'Task A',
          description: 'Independent task',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: [],
          breakingChanges: [],
        },
        {
          id: 'task-b',
          name: 'Task B',
          description: 'Another independent task',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: [],
          breakingChanges: [],
        },
      ]

      const graph = builder.buildGraph(independentTasks)

      expect(graph.every(n => n.canRunInParallel)).toBe(true)
    })
  })

  describe('detectCircularDependencies', () => {
    it('should detect no cycles in valid graph', () => {
      const cycles = builder.detectCircularDependencies(mockTasks)

      expect(cycles).toHaveLength(0)
    })

    it('should detect simple circular dependency', () => {
      const circularTasks: MigrationTask[] = [
        {
          id: 'task-a',
          name: 'Task A',
          description: 'Depends on B',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: ['task-b'],
          breakingChanges: [],
        },
        {
          id: 'task-b',
          name: 'Task B',
          description: 'Depends on A',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: ['task-a'],
          breakingChanges: [],
        },
      ]

      const cycles = builder.detectCircularDependencies(circularTasks)

      expect(cycles.length).toBeGreaterThan(0)
    })

    it('should detect self-referencing task', () => {
      const selfRefTasks: MigrationTask[] = [
        {
          id: 'task-self',
          name: 'Self Reference',
          description: 'Depends on itself',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: ['task-self'],
          breakingChanges: [],
        },
      ]

      const cycles = builder.detectCircularDependencies(selfRefTasks)

      expect(cycles.length).toBeGreaterThan(0)
    })
  })

  describe('getExecutionOrder', () => {
    it('should return execution batches in correct order', () => {
      const graph = builder.buildGraph(mockTasks)
      const batches = builder.getExecutionOrder(graph, mockTasks)

      expect(batches.length).toBeGreaterThan(0)
      expect(batches[0]).toContain('task-1')
      expect(batches[1]).toContain('task-2')
      expect(batches[2]).toContain('task-3')
    })

    it('should group independent tasks in same batch', () => {
      const parallelTasks: MigrationTask[] = [
        {
          id: 'task-a',
          name: 'Task A',
          description: 'Independent',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: [],
          breakingChanges: [],
        },
        {
          id: 'task-b',
          name: 'Task B',
          description: 'Independent',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: [],
          breakingChanges: [],
        },
        {
          id: 'task-c',
          name: 'Task C',
          description: 'Depends on A and B',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: ['task-a', 'task-b'],
          breakingChanges: [],
        },
      ]

      const graph = builder.buildGraph(parallelTasks)
      const batches = builder.getExecutionOrder(graph, parallelTasks)

      expect(batches[0]).toContain('task-a')
      expect(batches[0]).toContain('task-b')
      expect(batches[1]).toContain('task-c')
    })

    it('should handle complex dependency chains', () => {
      const complexTasks: MigrationTask[] = [
        { id: 't1', name: 'T1', description: '', type: 'automated', estimatedMinutes: 10, automatedMinutes: 2, riskLevel: 'low', affectedFiles: [], dependencies: [], breakingChanges: [] },
        { id: 't2', name: 'T2', description: '', type: 'automated', estimatedMinutes: 10, automatedMinutes: 2, riskLevel: 'low', affectedFiles: [], dependencies: ['t1'], breakingChanges: [] },
        { id: 't3', name: 'T3', description: '', type: 'automated', estimatedMinutes: 10, automatedMinutes: 2, riskLevel: 'low', affectedFiles: [], dependencies: ['t1'], breakingChanges: [] },
        { id: 't4', name: 'T4', description: '', type: 'automated', estimatedMinutes: 10, automatedMinutes: 2, riskLevel: 'low', affectedFiles: [], dependencies: ['t2', 't3'], breakingChanges: [] },
      ]

      const graph = builder.buildGraph(complexTasks)
      const batches = builder.getExecutionOrder(graph, complexTasks)

      expect(batches[0]).toContain('t1')
      expect(batches[1]).toContain('t2')
      expect(batches[1]).toContain('t3')
      expect(batches[2]).toContain('t4')
    })
  })

  describe('visualizeGraph', () => {
    it('should generate text visualization', () => {
      const graph = builder.buildGraph(mockTasks)
      const visualization = builder.visualizeGraph(graph, mockTasks)

      expect(visualization).toContain('Migration Dependency Graph')
      expect(visualization).toContain('Update Dependencies')
      expect(visualization).toContain('Migrate Components')
      expect(visualization).toContain('Legend')
    })

    it('should include dependency information', () => {
      const graph = builder.buildGraph(mockTasks)
      const visualization = builder.visualizeGraph(graph, mockTasks)

      expect(visualization).toContain('Depends on')
      expect(visualization).toContain('Blocks')
    })

    it('should use emoji markers', () => {
      const graph = builder.buildGraph(mockTasks)
      const visualization = builder.visualizeGraph(graph, mockTasks)

      // Should contain at least one emoji marker
      expect(/[🔴🟢🟡]/.test(visualization)).toBe(true)
    })
  })

  describe('calculateParallelismScore', () => {
    it('should calculate parallelism percentage', () => {
      const graph = builder.buildGraph(mockTasks)
      const score = builder.calculateParallelismScore(graph)

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should return 100% for all independent tasks', () => {
      const independentTasks: MigrationTask[] = [
        { id: 't1', name: 'T1', description: '', type: 'automated', estimatedMinutes: 10, automatedMinutes: 2, riskLevel: 'low', affectedFiles: [], dependencies: [], breakingChanges: [] },
        { id: 't2', name: 'T2', description: '', type: 'automated', estimatedMinutes: 10, automatedMinutes: 2, riskLevel: 'low', affectedFiles: [], dependencies: [], breakingChanges: [] },
      ]

      const graph = builder.buildGraph(independentTasks)
      const score = builder.calculateParallelismScore(graph)

      expect(score).toBe(100)
    })

    it('should return lower score for sequential tasks', () => {
      const score = builder.calculateParallelismScore(builder.buildGraph(mockTasks))

      expect(score).toBeLessThan(100)
    })
  })

  describe('estimateTotalTime', () => {
    it('should estimate time with automation', () => {
      const graph = builder.buildGraph(mockTasks)
      const time = builder.estimateTotalTime(graph, mockTasks, true)

      expect(time).toBeGreaterThan(0)
      expect(time).toBeLessThan(mockTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0))
    })

    it('should estimate time without automation', () => {
      const graph = builder.buildGraph(mockTasks)
      const time = builder.estimateTotalTime(graph, mockTasks, false)

      expect(time).toBeGreaterThan(0)
    })

    it('should show automation saves time', () => {
      const graph = builder.buildGraph(mockTasks)
      const manualTime = builder.estimateTotalTime(graph, mockTasks, false)
      const automatedTime = builder.estimateTotalTime(graph, mockTasks, true)

      expect(automatedTime).toBeLessThan(manualTime)
    })

    it('should account for parallel execution', () => {
      const parallelTasks: MigrationTask[] = [
        { id: 't1', name: 'T1', description: '', type: 'automated', estimatedMinutes: 60, automatedMinutes: 10, riskLevel: 'low', affectedFiles: [], dependencies: [], breakingChanges: [] },
        { id: 't2', name: 'T2', description: '', type: 'automated', estimatedMinutes: 60, automatedMinutes: 10, riskLevel: 'low', affectedFiles: [], dependencies: [], breakingChanges: [] },
      ]

      const graph = builder.buildGraph(parallelTasks)
      const time = builder.estimateTotalTime(graph, parallelTasks, false)

      // Two 60-minute tasks in parallel should take 60 minutes, not 120
      expect(time).toBe(60)
    })
  })

  describe('edge cases', () => {
    it('should handle empty task list', () => {
      const graph = builder.buildGraph([])

      expect(graph).toHaveLength(0)
    })

    it('should handle single task', () => {
      const singleTask: MigrationTask[] = [mockTasks[0]]
      const graph = builder.buildGraph(singleTask)

      expect(graph).toHaveLength(1)
      expect(graph[0].canRunInParallel).toBe(true)
    })

    it('should handle missing dependency references', () => {
      const tasksWithMissingDep: MigrationTask[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          description: 'Depends on non-existent task',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 5,
          riskLevel: 'low',
          affectedFiles: [],
          dependencies: ['non-existent-task'],
          breakingChanges: [],
        },
      ]

      const graph = builder.buildGraph(tasksWithMissingDep)

      expect(graph).toHaveLength(1)
      expect(graph[0].dependsOn).toContain('non-existent-task')
    })
  })
})
