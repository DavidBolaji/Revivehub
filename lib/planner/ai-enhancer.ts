import type {
  MigrationPlan,
  MigrationPhase,
  MigrationTask,
  SourceStack,
  TargetStack,
} from './types'

export interface AIInsight {
  type: 'insight' | 'warning' | 'tip' | 'optimization'
  message: string
  confidence: number // 0-100
  category:
    | 'architecture'
    | 'dependencies'
    | 'testing'
    | 'performance'
    | 'security'
    | 'compatibility'
    | 'best-practices'
  affectedItems?: string[] // Task IDs, file paths, etc.
  suggestedAction?: string
}

export interface EnhancedMigrationPlan extends MigrationPlan {
  aiInsights: {
    overall: AIInsight[]
    byPhase: Record<string, AIInsight[]>
    byTask: Record<string, AIInsight[]>
  }
  aiMetadata: {
    analysisTimestamp: Date
    modelVersion: string
    confidenceScore: number
  }
}

export class AIEnhancer {
  private modelVersion = 'claude-sonnet-4-5-20250929'

  async enhancePlan(plan: MigrationPlan): Promise<EnhancedMigrationPlan> {
    const overallInsights = await this.generateOverallInsights(plan)
    const phaseInsights = await this.generatePhaseInsights(plan.phases)
    const taskInsights = await this.generateTaskInsights(plan)

    const avgConfidence = this.calculateAverageConfidence([
      ...overallInsights,
      ...Object.values(phaseInsights).flat(),
      ...Object.values(taskInsights).flat(),
    ])

    return {
      ...plan,
      aiInsights: {
        overall: overallInsights,
        byPhase: phaseInsights,
        byTask: taskInsights,
      },
      aiMetadata: {
        analysisTimestamp: new Date(),
        modelVersion: this.modelVersion,
        confidenceScore: avgConfidence,
      },
    }
  }

  private async generateOverallInsights(plan: MigrationPlan): Promise<AIInsight[]> {
    const insights: AIInsight[] = []

    // Analyze codebase structure
    insights.push(...this.analyzeCodebaseStructure(plan))

    // Analyze migration complexity
    insights.push(...this.analyzeComplexity(plan))

    // Analyze dependency risks
    insights.push(...this.analyzeDependencyRisks(plan))

    // Suggest testing strategies
    insights.push(...this.suggestTestingStrategies(plan))

    // Detect architectural patterns
    insights.push(...this.detectArchitecturalPatterns(plan))

    // Recommend gradual migration paths
    insights.push(...this.recommendGradualMigration(plan))

    return insights
  }

  private analyzeCodebaseStructure(plan: MigrationPlan): AIInsight[] {
    const insights: AIInsight[] = []
    const { sourceStack } = plan

    // Check for monorepo structure
    if (this.detectMonorepo(sourceStack)) {
      insights.push({
        type: 'insight',
        message:
          'Monorepo structure detected. Consider migrating packages incrementally to reduce risk.',
        confidence: 85,
        category: 'architecture',
        suggestedAction: 'Create separate migration phases for each package',
      })
    }

    // Check for micro-frontend architecture
    if (this.detectMicroFrontends(sourceStack)) {
      insights.push({
        type: 'tip',
        message:
          'Micro-frontend architecture allows independent migration of each module. Prioritize shared components first.',
        confidence: 90,
        category: 'architecture',
        suggestedAction: 'Migrate shared component library before individual apps',
      })
    }

    // Analyze custom hooks/utilities
    const customCodeRatio = this.estimateCustomCodeRatio(plan)
    if (customCodeRatio > 0.3) {
      insights.push({
        type: 'warning',
        message: `High custom code ratio (${Math.round(customCodeRatio * 100)}%). Many utilities and hooks will need manual review and adaptation.`,
        confidence: 80,
        category: 'compatibility',
        suggestedAction: 'Allocate extra time for custom code migration and testing',
      })
    }

    // Check for state management complexity
    if (this.detectComplexStateManagement(sourceStack)) {
      insights.push({
        type: 'insight',
        message:
          'Complex state management detected. Consider modernizing to simpler patterns during migration.',
        confidence: 75,
        category: 'architecture',
        suggestedAction: 'Evaluate React Context, Zustand, or Jotai as Redux alternatives',
      })
    }

    return insights
  }

  private analyzeComplexity(plan: MigrationPlan): AIInsight[] {
    const insights: AIInsight[] = []
    const { summary } = plan

    if (summary.overallComplexity > 80) {
      insights.push({
        type: 'warning',
        message:
          'Very high complexity migration. Consider breaking into smaller incremental releases.',
        confidence: 95,
        category: 'best-practices',
        suggestedAction: 'Plan for 3-4 incremental releases instead of big-bang migration',
      })
    }

    if (summary.automationPercentage < 40) {
      insights.push({
        type: 'tip',
        message: `Low automation coverage (${summary.automationPercentage}%). Focus on automating repetitive patterns first.`,
        confidence: 85,
        category: 'best-practices',
        suggestedAction: 'Create custom codemods for project-specific patterns',
      })
    }

    const manualRatio = summary.manualTasks / summary.totalTasks
    if (manualRatio > 0.5) {
      insights.push({
        type: 'insight',
        message:
          'High manual task ratio suggests unique architectural patterns. Budget extra time for careful migration.',
        confidence: 80,
        category: 'architecture',
      })
    }

    return insights
  }

  private analyzeDependencyRisks(plan: MigrationPlan): AIInsight[] {
    const insights: AIInsight[] = []
    const { sourceStack, targetStack } = plan

    // Check for deprecated dependencies
    const deprecatedDeps = this.findDeprecatedDependencies(sourceStack)
    if (deprecatedDeps.length > 0) {
      insights.push({
        type: 'warning',
        message: `Found ${deprecatedDeps.length} deprecated dependencies: ${deprecatedDeps.slice(0, 3).join(', ')}${deprecatedDeps.length > 3 ? '...' : ''}`,
        confidence: 90,
        category: 'dependencies',
        affectedItems: deprecatedDeps,
        suggestedAction: 'Upgrade or replace deprecated packages before migration',
      })
    }

    // Check for major version jumps
    const majorJumps = this.detectMajorVersionJumps(sourceStack, targetStack)
    if (majorJumps.length > 0) {
      insights.push({
        type: 'warning',
        message: `Major version jumps detected in ${majorJumps.length} dependencies. Review breaking changes carefully.`,
        confidence: 85,
        category: 'dependencies',
        affectedItems: majorJumps,
        suggestedAction: 'Read migration guides for each major version upgrade',
      })
    }

    // Check for conflicting peer dependencies
    if (this.detectPeerDependencyConflicts(targetStack)) {
      insights.push({
        type: 'warning',
        message:
          'Potential peer dependency conflicts detected. May require resolution strategies.',
        confidence: 70,
        category: 'dependencies',
        suggestedAction: 'Use npm overrides or yarn resolutions if conflicts arise',
      })
    }

    return insights
  }

  private suggestTestingStrategies(plan: MigrationPlan): AIInsight[] {
    const insights: AIInsight[] = []

    // Recommend testing approach based on complexity
    if (plan.summary.overallComplexity > 70) {
      insights.push({
        type: 'tip',
        message:
          'High complexity migration benefits from comprehensive E2E testing. Set up Playwright or Cypress early.',
        confidence: 90,
        category: 'testing',
        suggestedAction: 'Create E2E test suite covering critical user flows before migration',
      })
    }

    // Check if tests are being skipped
    if (plan.customization.skipTests) {
      insights.push({
        type: 'warning',
        message:
          'Test migration is disabled. This significantly increases risk of runtime issues.',
        confidence: 95,
        category: 'testing',
        suggestedAction: 'Reconsider enabling test migration for safer migration',
      })
    }

    // Suggest visual regression testing
    if (this.hasUIComponents(plan)) {
      insights.push({
        type: 'tip',
        message:
          'UI-heavy application detected. Visual regression testing (Chromatic, Percy) can catch styling issues.',
        confidence: 80,
        category: 'testing',
        suggestedAction: 'Set up visual regression testing for component library',
      })
    }

    // Recommend gradual rollout
    insights.push({
      type: 'tip',
      message:
        'Use feature flags to gradually roll out migrated features and quickly rollback if issues arise.',
      confidence: 85,
      category: 'testing',
      suggestedAction: 'Implement feature flag system (LaunchDarkly, Unleash, or custom)',
    })

    return insights
  }

  private detectArchitecturalPatterns(plan: MigrationPlan): AIInsight[] {
    const insights: AIInsight[] = []

    // Detect HOC pattern (legacy)
    if (this.detectHOCPattern(plan)) {
      insights.push({
        type: 'optimization',
        message:
          'Higher-Order Components (HOCs) detected. Consider refactoring to hooks for better composability.',
        confidence: 85,
        category: 'architecture',
        suggestedAction: 'Create migration guide for converting HOCs to custom hooks',
      })
    }

    // Detect render props pattern
    if (this.detectRenderPropsPattern(plan)) {
      insights.push({
        type: 'optimization',
        message:
          'Render props pattern detected. Modern hooks often provide cleaner alternatives.',
        confidence: 80,
        category: 'architecture',
        suggestedAction: 'Evaluate which render props can be replaced with hooks',
      })
    }

    // Detect class components
    if (this.detectClassComponents(plan)) {
      insights.push({
        type: 'insight',
        message:
          'Class components found. While functional, consider gradual conversion to function components with hooks.',
        confidence: 75,
        category: 'architecture',
        suggestedAction: 'Convert class components to functions during migration',
      })
    }

    // Detect prop drilling
    if (this.detectPropDrilling(plan)) {
      insights.push({
        type: 'optimization',
        message:
          'Deep prop drilling detected. Consider Context API or state management library.',
        confidence: 70,
        category: 'architecture',
        suggestedAction: 'Refactor deeply nested props to use Context or state management',
      })
    }

    return insights
  }

  private recommendGradualMigration(plan: MigrationPlan): AIInsight[] {
    const insights: AIInsight[] = []

    // Recommend incremental adoption
    insights.push({
      type: 'tip',
      message:
        'Start with low-risk, isolated components. Build confidence before tackling core features.',
      confidence: 90,
      category: 'best-practices',
      suggestedAction: 'Identify 2-3 low-risk components for initial migration',
    })

    // Suggest parallel running
    if (plan.summary.overallComplexity > 60) {
      insights.push({
        type: 'tip',
        message:
          'Consider running old and new versions in parallel during transition period.',
        confidence: 80,
        category: 'best-practices',
        suggestedAction: 'Set up routing to serve different versions based on feature flags',
      })
    }

    // Recommend documentation
    insights.push({
      type: 'tip',
      message:
        'Document migration decisions and patterns for team alignment and future reference.',
      confidence: 95,
      category: 'best-practices',
      suggestedAction: 'Create migration runbook with common patterns and gotchas',
    })

    return insights
  }

  private async generatePhaseInsights(
    phases: MigrationPhase[]
  ): Promise<Record<string, AIInsight[]>> {
    const phaseInsights: Record<string, AIInsight[]> = {}

    for (const phase of phases) {
      const insights: AIInsight[] = []

      // Analyze phase risk
      if (phase.riskLevel === 'high') {
        insights.push({
          type: 'warning',
          message: `High-risk phase. Consider additional code review and testing checkpoints.`,
          confidence: 90,
          category: 'best-practices',
          suggestedAction: 'Schedule team review before proceeding to next phase',
        })
      }

      // Check for authentication/security tasks
      if (this.hasSecurityTasks(phase)) {
        insights.push({
          type: 'warning',
          message: 'Authentication or security-related changes require careful manual review.',
          confidence: 95,
          category: 'security',
          suggestedAction: 'Conduct security audit after completing this phase',
        })
      }

      // Check for database/API changes
      if (this.hasDataLayerTasks(phase)) {
        insights.push({
          type: 'insight',
          message: 'Data layer changes detected. Ensure backward compatibility for gradual rollout.',
          confidence: 85,
          category: 'compatibility',
          suggestedAction: 'Test with production data snapshots before deployment',
        })
      }

      // Suggest parallelization opportunities
      if (phase.canRunInParallel && phase.tasks.length > 5) {
        insights.push({
          type: 'optimization',
          message: `This phase has ${phase.tasks.length} tasks that can run in parallel. Consider team distribution.`,
          confidence: 80,
          category: 'best-practices',
          suggestedAction: 'Assign independent tasks to different team members',
        })
      }

      phaseInsights[phase.id] = insights
    }

    return phaseInsights
  }

  private async generateTaskInsights(
    plan: MigrationPlan
  ): Promise<Record<string, AIInsight[]>> {
    const taskInsights: Record<string, AIInsight[]> = {}
    const allTasks = plan.phases.flatMap((p) => p.tasks)

    for (const task of allTasks) {
      const insights: AIInsight[] = []

      // Warn about manual tasks with many affected files
      if (task.type === 'manual' && task.affectedFiles.length > 1) {
        if (task.affectedFiles.length > 10) {
          insights.push({
            type: 'warning',
            message: `Manual task affecting ${task.affectedFiles.length} files. Consider creating a custom codemod.`,
            confidence: 75,
            category: 'best-practices',
            affectedItems: task.affectedFiles,
            suggestedAction: 'Explore automation opportunities with jscodeshift',
          })
        } else if (task.affectedFiles.length > 1) {
          insights.push({
            type: 'insight',
            message: `Manual task affecting ${task.affectedFiles.length} files. Ensure consistent changes across all files.`,
            confidence: 70,
            category: 'best-practices',
            affectedItems: task.affectedFiles,
            suggestedAction: 'Review all affected files for consistency',
          })
        }
      }

      // Highlight breaking changes
      if (task.breakingChanges.length > 0) {
        insights.push({
          type: 'warning',
          message: `Contains ${task.breakingChanges.length} breaking changes. Thorough testing required.`,
          confidence: 90,
          category: 'compatibility',
          affectedItems: task.breakingChanges,
          suggestedAction: 'Add integration tests covering affected functionality',
        })
      }

      // Suggest dependency order optimization
      if (task.dependencies.length > 3) {
        insights.push({
          type: 'insight',
          message: `Task has ${task.dependencies.length} dependencies. May be on critical path.`,
          confidence: 70,
          category: 'best-practices',
          suggestedAction: 'Prioritize completing dependency tasks to unblock this work',
        })
      }

      // Warn about high-risk automated tasks
      if (task.type === 'automated' && task.riskLevel === 'high') {
        insights.push({
          type: 'warning',
          message: 'High-risk automated transformation. Review output carefully before committing.',
          confidence: 85,
          category: 'best-practices',
          suggestedAction: 'Run in dry-run mode first and review diffs',
        })
      }

      // Detect custom hooks that need attention
      if (this.isCustomHookTask(task)) {
        insights.push({
          type: 'insight',
          message: 'Custom hooks may use deprecated APIs. Verify compatibility with target version.',
          confidence: 80,
          category: 'compatibility',
          suggestedAction: 'Check React hooks documentation for API changes',
        })
      }

      if (insights.length > 0) {
        taskInsights[task.id] = insights
      }
    }

    return taskInsights
  }

  private calculateAverageConfidence(insights: AIInsight[]): number {
    if (insights.length === 0) return 0
    const sum = insights.reduce((acc, insight) => acc + insight.confidence, 0)
    return Math.round(sum / insights.length)
  }

  // Helper detection methods
  private detectMonorepo(stack: SourceStack): boolean {
    return stack.patterns.some((p) => p.includes('monorepo') || p.includes('workspace'))
  }

  private detectMicroFrontends(stack: SourceStack): boolean {
    return stack.patterns.some((p) => p.includes('micro-frontend') || p.includes('module-federation'))
  }

  private estimateCustomCodeRatio(plan: MigrationPlan): number {
    const patterns = plan.phases.flatMap((p) => p.tasks.map((t) => t.pattern)).filter(Boolean)
    const customPatterns = patterns.filter((p) => p && !p.automated)
    return patterns.length > 0 ? customPatterns.length / patterns.length : 0.5
  }

  private detectComplexStateManagement(stack: SourceStack): boolean {
    return Object.keys(stack.dependencies).some(
      (dep) => dep.includes('redux') || dep.includes('mobx') || dep.includes('recoil')
    )
  }

  private findDeprecatedDependencies(stack: SourceStack): string[] {
    const deprecated = ['enzyme', 'react-router-redux', 'redux-saga', 'recompose']
    return Object.keys(stack.dependencies).filter((dep) =>
      deprecated.some((d) => dep.includes(d))
    )
  }

  private detectMajorVersionJumps(source: SourceStack, target: TargetStack): string[] {
    const jumps: string[] = []
    for (const [dep, sourceVer] of Object.entries(source.dependencies)) {
      const targetVer = target.dependencies[dep]
      if (targetVer && this.isMajorJump(sourceVer, targetVer)) {
        jumps.push(dep)
      }
    }
    return jumps
  }

  private isMajorJump(sourceVer: string, targetVer: string): boolean {
    const sourceMajor = parseInt(sourceVer.replace(/^\D+/, ''))
    const targetMajor = parseInt(targetVer.replace(/^\D+/, ''))
    return targetMajor > sourceMajor
  }

  private detectPeerDependencyConflicts(stack: TargetStack): boolean {
    // Simplified check - in real implementation, would parse package.json peer deps
    return Object.keys(stack.dependencies).length > 20
  }

  private hasUIComponents(plan: MigrationPlan): boolean {
    return plan.phases.some((p) =>
      p.tasks.some((t) => t.name.toLowerCase().includes('component') || t.name.toLowerCase().includes('ui'))
    )
  }

  private detectHOCPattern(plan: MigrationPlan): boolean {
    return plan.phases.some((p) =>
      p.tasks.some((t) => t.name.toLowerCase().includes('hoc') || t.name.toLowerCase().includes('higher-order'))
    )
  }

  private detectRenderPropsPattern(plan: MigrationPlan): boolean {
    return plan.phases.some((p) =>
      p.tasks.some((t) => t.name.toLowerCase().includes('render prop'))
    )
  }

  private detectClassComponents(plan: MigrationPlan): boolean {
    return plan.phases.some((p) =>
      p.tasks.some((t) => t.name.toLowerCase().includes('class component'))
    )
  }

  private detectPropDrilling(plan: MigrationPlan): boolean {
    return plan.phases.some((p) =>
      p.tasks.some((t) => t.description.toLowerCase().includes('prop drilling') || t.description.toLowerCase().includes('deeply nested'))
    )
  }

  private hasSecurityTasks(phase: MigrationPhase): boolean {
    return phase.tasks.some(
      (t) =>
        t.name.toLowerCase().includes('auth') ||
        t.name.toLowerCase().includes('security') ||
        t.name.toLowerCase().includes('permission')
    )
  }

  private hasDataLayerTasks(phase: MigrationPhase): boolean {
    return phase.tasks.some(
      (t) =>
        t.name.toLowerCase().includes('api') ||
        t.name.toLowerCase().includes('database') ||
        t.name.toLowerCase().includes('data')
    )
  }

  private isCustomHookTask(task: MigrationTask): boolean {
    return (
      (task.name.toLowerCase().includes('hook') || 
       task.description.toLowerCase().includes('hook')) && 
      task.type !== 'automated'
    )
  }
}
