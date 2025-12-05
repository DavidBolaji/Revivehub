import type {
  DetectedPattern,
  MigrationPhase,
  MigrationTask,
  PlanCustomization,
  SourceStack,
  TargetStack,
} from './types'
import { ComplexityEstimator } from './complexity-estimator'

export class PhaseGenerator {
  private complexityEstimator = new ComplexityEstimator()

  generatePhases(
    source: SourceStack,
    _target: TargetStack,
    patterns: DetectedPattern[],
    customization: PlanCustomization,
    healthScore?: { buildHealth?: number; total?: number }
  ): MigrationPhase[] {
    console.log(`[PHASE_GEN] Starting phase generation with ${patterns.length} patterns`)
    console.log(`[PHASE_GEN] Pattern IDs:`, patterns.map(p => p.id))
    console.log(`[PHASE_GEN] Health score:`, healthScore)
    
    const phases: MigrationPhase[] = []

    // Phase 1: Dependency Updates & Build Tool Setup
    // Includes all dependency-related patterns (updates, conflicts, etc.)
    const dependencyPatterns = patterns.filter((p) => p.category === 'dependency')
    console.log(`[PHASE_GEN] Dependency patterns:`, dependencyPatterns.map(p => p.id))
    
    const dependencyPhase = this.createDependencyPhase(
      dependencyPatterns,
      customization,
      source,
      healthScore
    )
    if (dependencyPhase.tasks.length > 0) {
      phases.push(dependencyPhase)
    }

    // Phase 2: Documentation Updates
    // Always include documentation phase (README, CHANGELOG, Migration Guide)
    if (!customization.skipDocumentation) {
      const docPatterns = patterns.filter((p) => p.category === 'documentation')
      console.log(`[PHASE_GEN] Documentation patterns:`, docPatterns.map(p => p.id))
      
      const docPhase = this.createDocumentationPhase(
        docPatterns,
        customization,
        2 // Always phase 2
      )
      if (docPhase.tasks.length > 0) {
        phases.push(docPhase)
      }
    }

    console.log(`[PHASE_GEN] Generated ${phases.length} phases with total tasks:`, 
      phases.reduce((sum, p) => sum + p.tasks.length, 0))
    
    return phases
  }

  private createDependencyPhase(
    patterns: DetectedPattern[],
    customization: PlanCustomization,
    source: SourceStack,
    healthScore?: { buildHealth?: number; total?: number }
  ): MigrationPhase {
    console.log(`[PHASE_GEN] Creating dependency phase with ${patterns.length} patterns`)
    const tasks: MigrationTask[] = []

    for (const pattern of patterns) {
      if (!this.shouldIncludePattern(pattern, customization)) {
        console.log(`[PHASE_GEN] Skipping pattern ${pattern.id} (not included)`)
        continue
      }

      const timeEstimate = this.complexityEstimator.estimateTaskTime(
        {
          type: pattern.automated ? 'automated' : 'manual',
          affectedFiles: pattern.affectedFiles,
          complexity: pattern.severity === 'high' ? 'high' : 'medium',
        },
        customization.aggressiveness
      )

      const taskId = `dep-${pattern.id}`
      
      const task: MigrationTask = {
        id: taskId,
        name: `Update ${pattern.name}`,
        description: pattern.description,
        type: (pattern.automated ? 'automated' : 'manual') as 'automated' | 'manual' | 'review',
        estimatedMinutes: timeEstimate.manual,
        automatedMinutes: timeEstimate.automated,
        riskLevel: (pattern.severity === 'high' ? 'medium' : 'low') as 'low' | 'medium' | 'high',
        affectedFiles: pattern.affectedFiles,
        dependencies: [], // Dependency tasks have no dependencies
        breakingChanges: this.identifyBreakingChanges(pattern),
        pattern,
      }
      
      tasks.push(task)
    }

    // Check if Vite setup is needed (React project)
    const isReactProject = source.framework?.toLowerCase().includes('react') || false
    const buildHealth = healthScore?.buildHealth ?? 20
    
    // Check if project already has modern build tools
    const hasModernBuildTool = source.dependencies && (
      'vite' in source.dependencies ||
      'esbuild' in source.dependencies ||
      'turbopack' in source.dependencies ||
      '@vitejs/plugin-react' in source.dependencies
    )
    
    // Add Vite setup for React projects that don't have modern build tools
    // OR have low build health (< 20)
    // For testing purposes, always add Vite setup for React projects
    const needsVite = isReactProject && !hasModernBuildTool
    
    console.log(`[PHASE_GEN] Vite check: isReact=${isReactProject}, buildHealth=${buildHealth}, hasModernBuildTool=${hasModernBuildTool}, needsVite=${needsVite}`)
    
    if (needsVite) {
      // Detect the correct entry point filename based on project structure
      const entryPoint = this.detectEntryPoint(source)
      const viteConfigExt = source.language === 'TypeScript' ? 'ts' : 'js'
      
      console.log(`[PHASE_GEN] Detected entry point: ${entryPoint}, config ext: ${viteConfigExt}`)
      
      const viteTask: MigrationTask = {
        id: 'dep-vite-setup',
        name: 'Setup Vite Build Tool',
        description: 'Add Vite for fast development and optimized production builds. Includes configuration files, updated scripts, and React 18+ setup.',
        type: 'automated',
        estimatedMinutes: 10,
        automatedMinutes: 10,
        riskLevel: 'low',
        affectedFiles: [
          'package.json', 
          `vite.config.${viteConfigExt}`, 
          'index.html', 
          entryPoint,
          '.eslintrc.json',
          '.prettierrc',
          '.eslintignore',
          '.prettierignore'
        ],
        dependencies: [], // Can run independently
        breakingChanges: [
          `Entry point changes to ${entryPoint}`,
          'index.html moves from public/ to root directory',
          'Build scripts change to use Vite commands',
        ],
        pattern: {
          id: 'vite-setup',
          name: 'Vite Build Tool',
          description: 'Modern build tool with fast HMR and optimized builds',
          category: 'build-tool',
          severity: 'medium',
          automated: true,
          occurrences: 1,
          affectedFiles: [
            'package.json', 
            `vite.config.${viteConfigExt}`, 
            'index.html', 
            entryPoint,
            '.eslintrc.json',
            '.prettierrc',
            '.eslintignore',
            '.prettierignore'
          ],
        },
      }
      
      tasks.push(viteTask)
      console.log(`[PHASE_GEN] Added Vite setup task with entry point: ${entryPoint}`)
    }

    const totalEstimated = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
    const totalAutomated = tasks.reduce((sum, t) => sum + t.automatedMinutes, 0)

    return {
      id: 'phase-1-dependencies',
      name: 'Transformation Phase 1: Dependency Updates',
      description:
        'Update package dependencies and resolve version conflicts. This transformation has the lowest risk and should be completed first.',
      order: 1,
      tasks,
      totalEstimatedMinutes: totalEstimated,
      totalAutomatedMinutes: totalAutomated,
      riskLevel: 'low',
      canRunInParallel: true,
    }
  }

  // private createStructuralPhase(
  //   patterns: DetectedPattern[],
  //   customization: PlanCustomization
  // ): MigrationPhase {
  //   const tasks: MigrationTask[] = []

  //   for (const pattern of patterns) {
  //     if (!this.shouldIncludePattern(pattern, customization)) continue

  //     const timeEstimate = this.complexityEstimator.estimateTaskTime(
  //       {
  //         type: pattern.automated ? 'review' : 'manual',
  //         affectedFiles: pattern.affectedFiles,
  //         complexity: 'high',
  //       },
  //       customization.aggressiveness
  //     )

  //     const taskId = `struct-${pattern.id}`
  //     const isAIGenerated = pattern.id.includes('mcp-') || pattern.id.includes('detector-')
  //     const dependencies = isAIGenerated ? [] : ['phase-1-dependencies']
      
  //     // Ensure task doesn't depend on itself
  //     const safeDependencies = dependencies.filter(dep => dep !== taskId)
      
  //     console.log(`[PHASE_GEN] Creating task ${taskId}, AI-generated: ${isAIGenerated}, dependencies: ${JSON.stringify(safeDependencies)}, pattern.id: ${pattern.id}`)

  //     const task: MigrationTask = {
  //       id: taskId,
  //       name: `Migrate ${pattern.name}`,
  //       description: pattern.description,
  //       type: (pattern.automated ? 'review' : 'manual') as 'automated' | 'manual' | 'review',
  //       estimatedMinutes: timeEstimate.manual,
  //       automatedMinutes: timeEstimate.automated,
  //       riskLevel: pattern.severity as 'low' | 'medium' | 'high',
  //       affectedFiles: pattern.affectedFiles,
  //       dependencies: safeDependencies,
  //       breakingChanges: this.identifyBreakingChanges(pattern),
  //       pattern,
  //     }
      
  //     // Double-check: ensure no self-reference
  //     if (task.dependencies.includes(task.id)) {
  //       console.warn(`[PHASE_GEN] WARNING: Task ${task.id} has self-reference, removing it`)
  //       task.dependencies = task.dependencies.filter(dep => dep !== task.id)
  //     }
      
  //     tasks.push(task)
  //   }

  //   const totalEstimated = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
  //   const totalAutomated = tasks.reduce((sum, t) => sum + t.automatedMinutes, 0)

  //   return {
  //     id: 'phase-2-structural',
  //     name: 'Phase 2: Structural Changes',
  //     description:
  //       'Migrate routing, architecture patterns, and core framework features. Requires careful testing.',
  //     order: 2,
  //     tasks,
  //     totalEstimatedMinutes: totalEstimated,
  //     totalAutomatedMinutes: totalAutomated,
  //     riskLevel: 'high',
  //     canRunInParallel: false,
  //   }
  // }

  // private createComponentPhase(
  //   patterns: DetectedPattern[],
  //   customization: PlanCustomization
  // ): MigrationPhase {
  //   const tasks: MigrationTask[] = []

  //   for (const pattern of patterns) {
  //     if (!this.shouldIncludePattern(pattern, customization)) continue

  //     const timeEstimate = this.complexityEstimator.estimateTaskTime(
  //       {
  //         type: pattern.automated ? 'automated' : 'review',
  //         affectedFiles: pattern.affectedFiles,
  //         complexity: pattern.severity === 'high' ? 'high' : 'medium',
  //       },
  //       customization.aggressiveness
  //     )

  //     const taskId = `comp-${pattern.id}`
  //     const isAIGenerated = pattern.id.includes('mcp-') || pattern.id.includes('detector-')
  //     const dependencies = isAIGenerated ? [] : ['phase-2-structural']
      
  //     // Ensure task doesn't depend on itself
  //     const safeDependencies = dependencies.filter(dep => dep !== taskId)
      
  //     const task: MigrationTask = {
  //       id: taskId,
  //       name: `Modernize ${pattern.name}`,
  //       description: pattern.description,
  //       type: (pattern.automated ? 'automated' : 'review') as 'automated' | 'manual' | 'review',
  //       estimatedMinutes: timeEstimate.manual,
  //       automatedMinutes: timeEstimate.automated,
  //       riskLevel: (pattern.severity === 'high' ? 'medium' : 'low') as 'low' | 'medium' | 'high',
  //       affectedFiles: pattern.affectedFiles,
  //       dependencies: safeDependencies,
  //       breakingChanges: this.identifyBreakingChanges(pattern),
  //       pattern,
  //     }
      
  //     // Double-check: ensure no self-reference
  //     if (task.dependencies.includes(task.id)) {
  //       console.warn(`[PHASE_GEN] WARNING: Task ${task.id} has self-reference, removing it`)
  //       task.dependencies = task.dependencies.filter(dep => dep !== task.id)
  //     }
      
  //     tasks.push(task)
  //   }

  //   const totalEstimated = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
  //   const totalAutomated = tasks.reduce((sum, t) => sum + t.automatedMinutes, 0)

  //   return {
  //     id: 'phase-3-components',
  //     name: 'Phase 3: Component Modernization',
  //     description:
  //       'Update components to use modern patterns, hooks, and best practices. Can be done incrementally.',
  //     order: 3,
  //     tasks,
  //     totalEstimatedMinutes: totalEstimated,
  //     totalAutomatedMinutes: totalAutomated,
  //     riskLevel: 'medium',
  //     canRunInParallel: true,
  //   }
  // }

  private createDocumentationPhase(
    _patterns: DetectedPattern[],
    _customization: PlanCustomization,
    phaseNumber: number
  ): MigrationPhase {
    const tasks: MigrationTask[] = []

    // Always include README generation
    tasks.push({
      id: 'doc-readme',
      name: 'Generate/Update README',
      description: 'AI-powered README generation: Analyzes project structure, dependencies, and features to create comprehensive documentation with installation guides, usage examples, and project overview',
      type: 'automated',
      estimatedMinutes: 3,
      automatedMinutes: 2,
      riskLevel: 'low',
      affectedFiles: ['README.md'],
      dependencies: [],
      breakingChanges: [],
      pattern: {
        id: 'readme-generation',
        name: 'README Generation',
        category: 'documentation',
        description: 'Generate comprehensive README from repository analysis',
        severity: 'low',
        automated: true,
        affectedFiles: ['README.md'],
        occurrences: 1
      }
    })

    // Always include CHANGELOG generation (documents what changed)
    tasks.push({
      id: 'doc-changelog',
      name: 'Generate CHANGELOG',
      description: 'Standard changelog generation: Documents all changes, improvements, and fixes in Keep a Changelog format for version tracking and release notes',
      type: 'automated',
      estimatedMinutes: 2,
      automatedMinutes: 1,
      riskLevel: 'low',
      affectedFiles: ['CHANGELOG.md'],
      dependencies: [],
      breakingChanges: [],
      pattern: {
        id: 'changelog-generation',
        name: 'CHANGELOG Generation',
        category: 'documentation',
        description: 'Generate CHANGELOG from transformation metadata',
        severity: 'low',
        automated: true,
        affectedFiles: ['CHANGELOG.md'],
        occurrences: 1
      }
    })

    // Only include Migration Guide if there are breaking changes or structural changes
    const hasBreakingChanges = this.hasBreakingChanges(_patterns, _customization)
    if (hasBreakingChanges) {
      tasks.push({
        id: 'doc-migration-guide',
        name: 'Create Migration Guide',
        description: 'Breaking changes migration guide: Creates step-by-step upgrade instructions with prerequisites, breaking changes, troubleshooting, and rollback procedures',
        type: 'automated',
        estimatedMinutes: 4,
        automatedMinutes: 3,
        riskLevel: 'low',
        affectedFiles: ['MIGRATION.md'],
        dependencies: [],
        breakingChanges: [],
        pattern: {
          id: 'migration-guide-generation',
          name: 'Migration Guide Generation',
          category: 'documentation',
          description: 'Generate step-by-step migration guide for breaking changes',
          severity: 'low',
          automated: true,
          affectedFiles: ['MIGRATION.md'],
          occurrences: 1
        }
      })
    }

    const totalEstimated = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)
    const totalAutomated = tasks.reduce((sum, t) => sum + t.automatedMinutes, 0)

    return {
      id: `phase-${phaseNumber}-documentation`,
      name: `Transformation Phase ${phaseNumber}: Documentation Updates`,
      description: 'Update project documentation to reflect transformation changes.',
      order: phaseNumber,
      tasks,
      totalEstimatedMinutes: totalEstimated,
      totalAutomatedMinutes: totalAutomated,
      riskLevel: 'low',
      canRunInParallel: true,
    }
  }

  /**
   * Determines if there are breaking changes that require a migration guide
   */
  private hasBreakingChanges(patterns: DetectedPattern[], customization: PlanCustomization): boolean {
    // Check if any structural patterns are selected (these typically have breaking changes)
    const structuralPatterns = patterns.filter(p => p.category === 'structural')
    if (structuralPatterns.length > 0) {
      return true
    }

    // Check if any patterns explicitly mention breaking changes
    const breakingPatterns = patterns.filter(p => 
      p.description.toLowerCase().includes('breaking') ||
      p.description.toLowerCase().includes('major') ||
      p.severity === 'high'
    )
    if (breakingPatterns.length > 0) {
      return true
    }

    // Check customization for aggressive mode (more likely to have breaking changes)
    if (customization.aggressiveness === 'aggressive') {
      return patterns.length > 2 // Multiple changes in aggressive mode likely have breaking changes
    }

    return false
  }

  private shouldIncludePattern(
    pattern: DetectedPattern,
    customization: PlanCustomization
  ): boolean {
    // Check if pattern is explicitly selected
    if (
      customization.selectedPatterns.length > 0 &&
      !customization.selectedPatterns.includes(pattern.id)
    ) {
      return false
    }

    // Check if transformation is disabled
    if (customization.disabledTransformations.includes(pattern.id)) {
      return false
    }

    return true
  }

  private identifyBreakingChanges(pattern: DetectedPattern): string[] {
    const breakingChanges: string[] = []

    // Common breaking change patterns
    if (pattern.name.includes('API') || pattern.name.includes('interface')) {
      breakingChanges.push('API signature changes may affect consumers')
    }

    if (pattern.severity === 'high') {
      breakingChanges.push('High-risk change - thorough testing required')
    }

    if (pattern.category === 'structural') {
      breakingChanges.push('File structure changes may break imports')
    }

    if (pattern.name.includes('deprecated')) {
      breakingChanges.push('Deprecated features removed - update usage')
    }

    return breakingChanges
  }

  /**
   * Detects the correct entry point filename based on project structure
   * Priority: main.jsx > index.jsx > main.js > index.js > main.tsx > index.tsx > index.ts
   */
  private detectEntryPoint(source: SourceStack): string {
    const isTypeScript = source.language === 'TypeScript'
    const deps = source.dependencies || {}
    
    // Check if project uses JSX (has React)
    const usesJSX = !!deps.react
    
    // Determine file extension priority
    if (usesJSX && !isTypeScript) {
      // React JavaScript project - prefer .jsx
      return 'src/main.jsx'
    } else if (usesJSX && isTypeScript) {
      // React TypeScript project - prefer .tsx
      return 'src/main.tsx'
    } else if (isTypeScript) {
      // TypeScript without React - use .ts
      return 'src/index.ts'
    } else {
      // Plain JavaScript - use .js
      return 'src/index.js'
    }
  }
}
