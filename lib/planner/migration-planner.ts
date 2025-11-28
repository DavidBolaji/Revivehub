import type {
  DetectedPattern,
  MigrationPlan,
  PlanCustomization,
  SourceStack,
  TargetStack,
} from './types'
import { AIEnhancer, type EnhancedMigrationPlan } from './ai-enhancer'
import { ComplexityEstimator } from './complexity-estimator'
import { DependencyGraphBuilder } from './dependency-graph'
import { PhaseGenerator } from './phase-generator'

export class MigrationPlanner {
  private phaseGenerator = new PhaseGenerator()
  private complexityEstimator = new ComplexityEstimator()
  private graphBuilder = new DependencyGraphBuilder()
  private aiEnhancer = new AIEnhancer()

  async createPlan(
    source: SourceStack,
    target: TargetStack,
    patterns: DetectedPattern[],
    codebaseStats: {
      totalFiles: number
      totalLines: number
      testCoverage: number
    },
    customization: Partial<PlanCustomization> = {},
    enableAI: boolean = true,
    healthScore?: { buildHealth?: number; total?: number }
  ): Promise<MigrationPlan | EnhancedMigrationPlan> {
    // Apply defaults to customization
    const fullCustomization: PlanCustomization = {
      aggressiveness: customization.aggressiveness || 'balanced',
      enabledTransformations: customization.enabledTransformations || [],
      disabledTransformations: customization.disabledTransformations || [],
      selectedPatterns: customization.selectedPatterns || [],
      skipTests: customization.skipTests || false,
      skipDocumentation: customization.skipDocumentation || false,
    }

    // Generate migration phases
    const phases = this.phaseGenerator.generatePhases(
      source,
      target,
      patterns,
      fullCustomization,
      healthScore
    )

    // Collect all tasks
    const allTasks = phases.flatMap((phase) => phase.tasks)

    // Build dependency graph
    const dependencyGraph = this.graphBuilder.buildGraph(allTasks)

    // Check for circular dependencies
    const cycles = this.graphBuilder.detectCircularDependencies(allTasks)
    if (cycles.length > 0) {
      console.warn('Circular dependencies detected:', cycles)
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(
      allTasks,
      source,
      target,
      patterns,
      codebaseStats
    )

    const basePlan: MigrationPlan = {
      id: `plan-${Date.now()}`,
      sourceStack: source,
      targetStack: target,
      phases,
      summary,
      dependencyGraph,
      customization: fullCustomization,
      createdAt: new Date(),
    }

    // Enhance with AI insights if enabled
    if (enableAI) {
      return await this.aiEnhancer.enhancePlan(basePlan)
    }

    return basePlan
  }

  private calculateSummary(
    tasks: any[],
    source: SourceStack,
    target: TargetStack,
    patterns: DetectedPattern[],
    codebaseStats: any
  ) {
    const automatedTasks = tasks.filter((t) => t.type === 'automated').length
    const manualTasks = tasks.filter((t) => t.type === 'manual').length
    const reviewTasks = tasks.filter((t) => t.type === 'review').length

    const totalEstimatedMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
    const totalAutomatedMinutes = tasks.reduce((sum, t) => sum + t.automatedMinutes, 0)

    const automationPercentage =
      totalEstimatedMinutes > 0
        ? ((totalEstimatedMinutes - totalAutomatedMinutes) / totalEstimatedMinutes) * 100
        : 0

    const complexityEstimate = this.complexityEstimator.estimateComplexity(
      source,
      target,
      patterns,
      codebaseStats
    )

    const requiredSkills = this.identifyRequiredSkills(source, target, patterns)

    return {
      totalTasks: tasks.length,
      automatedTasks,
      manualTasks,
      reviewTasks,
      totalEstimatedMinutes,
      totalAutomatedMinutes,
      automationPercentage: Math.round(automationPercentage),
      overallComplexity: complexityEstimate.score,
      requiredSkills,
    }
  }

  private identifyRequiredSkills(
    source: SourceStack,
    target: TargetStack,
    patterns: DetectedPattern[]
  ): string[] {
    const skills = new Set<string>()

    // Framework knowledge
    skills.add(`${source.framework} experience`)
    skills.add(`${target.framework} experience`)

    // Language skills
    if (source.language !== target.language) {
      skills.add(`${target.language} proficiency`)
    }

    // Pattern-specific skills
    for (const pattern of patterns) {
      if (pattern.name.includes('TypeScript')) {
        skills.add('TypeScript')
      }
      if (pattern.name.includes('API') || pattern.name.includes('REST')) {
        skills.add('API design')
      }
      if (pattern.name.includes('State') || pattern.name.includes('Redux')) {
        skills.add('State management')
      }
      if (pattern.name.includes('Test')) {
        skills.add('Testing frameworks')
      }
      if (pattern.name.includes('CSS') || pattern.name.includes('Style')) {
        skills.add('CSS/Styling')
      }
    }

    // General skills
    skills.add('Git version control')
    skills.add('Code review')

    return Array.from(skills)
  }

  async optimizePlan(plan: MigrationPlan): Promise<MigrationPlan> {
    // Reorder tasks within phases for optimal execution
    for (const phase of plan.phases) {
      phase.tasks.sort((a, b) => {
        // Prioritize automated tasks
        if (a.type === 'automated' && b.type !== 'automated') return -1
        if (a.type !== 'automated' && b.type === 'automated') return 1

        // Then by risk level (low risk first)
        const riskOrder = { low: 0, medium: 1, high: 2 }
        const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel]
        if (riskDiff !== 0) return riskDiff

        // Then by number of affected files (fewer first)
        return a.affectedFiles.length - b.affectedFiles.length
      })
    }

    return plan
  }

  async validatePlan(plan: MigrationPlan): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = []

    // Check for circular dependencies and fix them
    const allTasks = plan.phases.flatMap((p) => p.tasks)
    const cycles = this.graphBuilder.detectCircularDependencies(allTasks)
    if (cycles.length > 0) {
      console.log(`Circular dependencies detected: ${JSON.stringify(cycles)}`)
      
      // Auto-fix circular dependencies by removing problematic dependencies
      this.fixCircularDependencies(plan, cycles)
      
      // Re-check after fixing
      const remainingCycles = this.graphBuilder.detectCircularDependencies(plan.phases.flatMap((p) => p.tasks))
      if (remainingCycles.length > 0) {
        errors.push(`Circular dependencies could not be resolved: ${remainingCycles.map((c) => c.join(' -> ')).join('; ')}`)
      } else {
        console.log('Circular dependencies successfully resolved')
      }
    }

    // Check for missing dependencies
    const taskIds = new Set(allTasks.map((t) => t.id))
    for (const task of allTasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId) && !depId.startsWith('phase-')) {
          errors.push(`Task ${task.id} depends on non-existent task ${depId}`)
        }
      }
    }

    // Check for empty phases
    for (const phase of plan.phases) {
      if (phase.tasks.length === 0) {
        errors.push(`Phase ${phase.id} has no tasks`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private fixCircularDependencies(plan: MigrationPlan, cycles: string[][]): void {
    console.log(`[PLANNER] Fixing ${cycles.length} circular dependencies`)
    
    // For each cycle, remove all inter-task dependencies within the cycle
    for (const cycle of cycles) {
      if (cycle.length < 1) continue
      
      console.log(`[PLANNER] Fixing cycle: ${cycle.join(' -> ')}`)
      
      // For single-task cycles (self-referencing), just clear self-references
      if (cycle.length === 1) {
        const taskId = cycle[0]
        let found = false
        
        for (const phase of plan.phases) {
          for (const task of phase.tasks) {
            if (task.id === taskId) {
              const originalDeps = [...task.dependencies]
              // Remove self-reference
              task.dependencies = task.dependencies.filter(dep => dep !== taskId)
              
              if (originalDeps.length !== task.dependencies.length) {
                console.log(`[PLANNER] Removed self-reference from task ${taskId}: ${originalDeps} -> ${task.dependencies}`)
              } else {
                console.warn(`[PLANNER] Task ${taskId} in cycle but no self-reference found. Dependencies: ${JSON.stringify(task.dependencies)}`)
              }
              
              found = true
              break
            }
          }
          if (found) break
        }
        
        if (!found) {
          console.error(`[PLANNER] Task ${taskId} not found in any phase!`)
        }
        continue
      }
      
      // For multi-task cycles, remove all dependencies between tasks in the cycle
      const cycleSet = new Set(cycle)
      
      for (const taskId of cycle) {
        for (const phase of plan.phases) {
          for (const task of phase.tasks) {
            if (task.id === taskId) {
              const originalDeps = [...task.dependencies]
              // Remove dependencies to other tasks in the cycle
              task.dependencies = task.dependencies.filter(dep => !cycleSet.has(dep))
              
              if (originalDeps.length !== task.dependencies.length) {
                console.log(`[PLANNER] Removed circular dependencies from ${taskId}: ${originalDeps.filter(dep => cycleSet.has(dep)).join(', ')}`)
              }
              break
            }
          }
        }
      }
    }
  }

  generateExecutionTimeline(plan: MigrationPlan): {
    sequential: number
    parallel: number
    batches: string[][]
  } {
    const allTasks = plan.phases.flatMap((p) => p.tasks)

    const sequentialTime = this.graphBuilder.estimateTotalTime(
      plan.dependencyGraph,
      allTasks,
      true
    )

    const batches = this.graphBuilder.getExecutionOrder(plan.dependencyGraph, allTasks)

    const parallelTime = batches.reduce((total, batch) => {
      const batchTime = Math.max(
        ...batch.map((taskId) => {
          const task = allTasks.find((t) => t.id === taskId)
          return task?.automatedMinutes || 0
        })
      )
      return total + batchTime
    }, 0)

    return {
      sequential: sequentialTime,
      parallel: parallelTime,
      batches,
    }
  }

  exportPlanSummary(plan: MigrationPlan): string {
    let output = '# Migration Plan Summary\n\n'

    output += `**Created:** ${plan.createdAt.toISOString()}\n`
    output += `**Source:** ${plan.sourceStack.framework} ${plan.sourceStack.version}\n`
    output += `**Target:** ${plan.targetStack.framework} ${plan.targetStack.version}\n\n`

    output += '## Overview\n\n'
    output += `- Total Tasks: ${plan.summary.totalTasks}\n`
    output += `- Automated: ${plan.summary.automatedTasks}\n`
    output += `- Manual: ${plan.summary.manualTasks}\n`
    output += `- Review Required: ${plan.summary.reviewTasks}\n`
    output += `- Automation Savings: ${plan.summary.automationPercentage}%\n`
    output += `- Complexity Score: ${plan.summary.overallComplexity}/100\n\n`

    output += '## Time Estimates\n\n'
    output += `- Manual Migration: ${Math.ceil(plan.summary.totalEstimatedMinutes / 60)} hours\n`
    output += `- With ReviveHub: ${Math.ceil(plan.summary.totalAutomatedMinutes / 60)} hours\n`
    output += `- Time Saved: ${Math.ceil((plan.summary.totalEstimatedMinutes - plan.summary.totalAutomatedMinutes) / 60)} hours\n\n`

    output += '## Required Skills\n\n'
    for (const skill of plan.summary.requiredSkills) {
      output += `- ${skill}\n`
    }
    output += '\n'

    output += '## Migration Phases\n\n'
    for (const phase of plan.phases) {
      output += `### ${phase.name}\n\n`
      output += `${phase.description}\n\n`
      output += `- Tasks: ${phase.tasks.length}\n`
      output += `- Risk Level: ${phase.riskLevel}\n`
      output += `- Estimated Time: ${Math.ceil(phase.totalEstimatedMinutes / 60)} hours\n`
      output += `- Automated Time: ${Math.ceil(phase.totalAutomatedMinutes / 60)} hours\n\n`
    }

    return output
  }
}
