import type { DependencyNode, MigrationTask } from './types'

export class DependencyGraphBuilder {
  buildGraph(tasks: MigrationTask[]): DependencyNode[] {
    const nodes: DependencyNode[] = []
    // const taskMap = new Map(tasks.map((t) => [t.id, t]))

    for (const task of tasks) {
      const node: DependencyNode = {
        taskId: task.id,
        dependsOn: task.dependencies,
        blockedBy: [],
        canRunInParallel: false,
        criticalPath: false,
      }

      // Find tasks that depend on this one
      for (const otherTask of tasks) {
        if (otherTask.dependencies.includes(task.id)) {
          node.blockedBy.push(otherTask.id)
        }
      }

      // Check if can run in parallel (no dependencies)
      node.canRunInParallel = task.dependencies.length === 0

      nodes.push(node)
    }

    // Mark critical path
    this.markCriticalPath(nodes, tasks)

    return nodes
  }

  private markCriticalPath(nodes: DependencyNode[], tasks: MigrationTask[]): void {
    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    const pathLengths = new Map<string, number>()

    // Calculate longest path to each node
    const calculatePathLength = (nodeId: string, visited = new Set<string>()): number => {
      if (pathLengths.has(nodeId)) {
        return pathLengths.get(nodeId)!
      }

      if (visited.has(nodeId)) {
        return 0 // Circular dependency
      }

      visited.add(nodeId)
      const node = nodes.find((n) => n.taskId === nodeId)
      const task = taskMap.get(nodeId)

      if (!node || !task) return 0

      let maxDependencyPath = 0
      for (const depId of node.dependsOn) {
        const depPath = calculatePathLength(depId, new Set(visited))
        maxDependencyPath = Math.max(maxDependencyPath, depPath)
      }

      const pathLength = maxDependencyPath + task.estimatedMinutes
      pathLengths.set(nodeId, pathLength)

      return pathLength
    }

    // Calculate all path lengths
    for (const node of nodes) {
      calculatePathLength(node.taskId)
    }

    // Find maximum path length
    const maxPathLength = Math.max(...Array.from(pathLengths.values()))

    // Mark nodes on critical path (within 10% of max length)
    const threshold = maxPathLength * 0.9
    for (const node of nodes) {
      const pathLength = pathLengths.get(node.taskId) || 0
      node.criticalPath = pathLength >= threshold
    }
  }

  detectCircularDependencies(tasks: MigrationTask[]): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const taskIds = new Set(tasks.map(t => t.id))

    const dfs = (taskId: string, path: string[]): void => {
      visited.add(taskId)
      recursionStack.add(taskId)
      path.push(taskId)

      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      for (const depId of task.dependencies) {
        // Skip phase dependencies (they're not actual tasks)
        if (depId.startsWith('phase-')) {
          continue
        }
        
        // Skip dependencies that don't exist as tasks
        if (!taskIds.has(depId)) {
          continue
        }
        
        if (!visited.has(depId)) {
          dfs(depId, [...path])
        } else if (recursionStack.has(depId)) {
          // Found a cycle
          const cycleStart = path.indexOf(depId)
          cycles.push(path.slice(cycleStart))
        }
      }

      recursionStack.delete(taskId)
    }

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id, [])
      }
    }

    return cycles
  }

  getExecutionOrder(nodes: DependencyNode[], _tasks: MigrationTask[]): string[][] {
    // const taskMap = new Map(tasks.map((t) => [t.id, t]))
    const completed = new Set<string>()
    const batches: string[][] = []

    while (completed.size < nodes.length) {
      const batch: string[] = []

      for (const node of nodes) {
        if (completed.has(node.taskId)) continue

        // Check if all dependencies are completed
        const allDepsCompleted = node.dependsOn.every((depId) => completed.has(depId))

        if (allDepsCompleted) {
          batch.push(node.taskId)
        }
      }

      if (batch.length === 0) {
        // No progress - circular dependency or error
        break
      }

      batches.push(batch)
      batch.forEach((taskId) => completed.add(taskId))
    }

    return batches
  }

  visualizeGraph(nodes: DependencyNode[], tasks: MigrationTask[]): string {
    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    let output = 'Migration Dependency Graph:\n\n'

    for (const node of nodes) {
      const task = taskMap.get(node.taskId)
      if (!task) continue

      const marker = node.criticalPath ? '🔴' : node.canRunInParallel ? '🟢' : '🟡'
      output += `${marker} ${task.name} (${task.id})\n`

      if (node.dependsOn.length > 0) {
        output += `  ↳ Depends on: ${node.dependsOn.join(', ')}\n`
      }

      if (node.blockedBy.length > 0) {
        output += `  ↳ Blocks: ${node.blockedBy.join(', ')}\n`
      }

      output += '\n'
    }

    output += '\nLegend:\n'
    output += '🔴 Critical path\n'
    output += '🟢 Can run in parallel\n'
    output += '🟡 Has dependencies\n'

    return output
  }

  calculateParallelismScore(nodes: DependencyNode[]): number {
    const parallelTasks = nodes.filter((n) => n.canRunInParallel).length
    return (parallelTasks / nodes.length) * 100
  }

  estimateTotalTime(
    nodes: DependencyNode[],
    tasks: MigrationTask[],
    useAutomation: boolean
  ): number {
    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    const batches = this.getExecutionOrder(nodes, tasks)

    let totalTime = 0

    for (const batch of batches) {
      // In parallel execution, batch time is the longest task
      const batchTime = Math.max(
        ...batch.map((taskId) => {
          const task = taskMap.get(taskId)
          if (!task) return 0
          return useAutomation ? task.automatedMinutes : task.estimatedMinutes
        })
      )
      totalTime += batchTime
    }

    return totalTime
  }
}
