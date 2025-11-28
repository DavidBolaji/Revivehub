/**
 * Example usage of the Migration Planner
 * 
 * This file demonstrates how to use the migration planner to generate
 * a comprehensive migration plan for upgrading from Next.js 12 to Next.js 14
 */

import { MigrationPlanner } from './migration-planner'
import { DependencyGraphBuilder } from './dependency-graph'
import type { DetectedPattern, SourceStack, TargetStack } from './types'

export async function exampleNextJsMigration() {
  // Define source stack (current state)
  const source: SourceStack = {
    framework: 'next.js',
    version: '12.3.0',
    language: 'JavaScript',
    dependencies: {
      'next': '^12.3.0',
      'react': '^17.0.2',
      'react-dom': '^17.0.2',
    },
    patterns: ['pages-router', 'getServerSideProps', 'getStaticProps'],
  }

  // Define target stack (desired state)
  const target: TargetStack = {
    framework: 'next.js',
    version: '14.0.0',
    language: 'TypeScript',
    dependencies: {
      'next': '^14.0.0',
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
    },
    features: ['app-router', 'server-components', 'server-actions'],
  }

  // Define detected patterns (from pattern detection system)
  const patterns: DetectedPattern[] = [
    {
      id: 'dep-react-18',
      name: 'React 18 Upgrade',
      category: 'dependency',
      severity: 'medium',
      occurrences: 1,
      affectedFiles: ['package.json'],
      description: 'Upgrade React from v17 to v18',
      automated: true,
    },
    {
      id: 'dep-next-14',
      name: 'Next.js 14 Upgrade',
      category: 'dependency',
      severity: 'high',
      occurrences: 1,
      affectedFiles: ['package.json'],
      description: 'Upgrade Next.js from v12 to v14',
      automated: true,
    },
    {
      id: 'struct-pages-to-app',
      name: 'Pages Router to App Router',
      category: 'structural',
      severity: 'high',
      occurrences: 15,
      affectedFiles: [
        'pages/index.tsx',
        'pages/about.tsx',
        'pages/blog/[slug].tsx',
        'pages/api/hello.ts',
      ],
      description: 'Migrate from Pages Router to App Router structure',
      automated: true,
    },
    {
      id: 'struct-data-fetching',
      name: 'Data Fetching Migration',
      category: 'structural',
      severity: 'high',
      occurrences: 8,
      affectedFiles: [
        'pages/index.tsx',
        'pages/blog/[slug].tsx',
      ],
      description: 'Replace getServerSideProps/getStaticProps with Server Components',
      automated: true,
    },
    {
      id: 'comp-client-components',
      name: 'Client Component Directives',
      category: 'component',
      severity: 'medium',
      occurrences: 12,
      affectedFiles: [
        'components/Counter.tsx',
        'components/Form.tsx',
      ],
      description: 'Add "use client" directive to interactive components',
      automated: true,
    },
    {
      id: 'comp-typescript',
      name: 'JavaScript to TypeScript',
      category: 'component',
      severity: 'medium',
      occurrences: 25,
      affectedFiles: [
        'components/Header.js',
        'lib/utils.js',
      ],
      description: 'Convert JavaScript files to TypeScript',
      automated: false,
    },
  ]

  // Codebase statistics
  const codebaseStats = {
    totalFiles: 50,
    totalLines: 5000,
    testCoverage: 65,
  }

  // Create planner instance
  const planner = new MigrationPlanner()

  // Generate migration plan
  console.log('🔍 Generating migration plan...\n')
  const plan = await planner.createPlan(
    source,
    target,
    patterns,
    codebaseStats,
    {
      aggressiveness: 'balanced',
      skipDocumentation: false,
    }
  )

  // Optimize the plan
  console.log('⚡ Optimizing plan...\n')
  const optimizedPlan = await planner.optimizePlan(plan)

  // Validate the plan
  console.log('✅ Validating plan...\n')
  const validation = await planner.validatePlan(optimizedPlan)
  if (!validation.valid) {
    console.error('❌ Plan validation failed:', validation.errors)
    return
  }

  // Generate execution timeline
  const timeline = planner.generateExecutionTimeline(optimizedPlan)

  // Print summary
  console.log('📊 Migration Plan Summary')
  console.log('═'.repeat(50))
  console.log(`Source: ${source.framework} ${source.version}`)
  console.log(`Target: ${target.framework} ${target.version}`)
  console.log()
  console.log(`Total Tasks: ${optimizedPlan.summary.totalTasks}`)
  console.log(`  - Automated: ${optimizedPlan.summary.automatedTasks}`)
  console.log(`  - Manual: ${optimizedPlan.summary.manualTasks}`)
  console.log(`  - Review: ${optimizedPlan.summary.reviewTasks}`)
  console.log()
  console.log(`Time Estimates:`)
  console.log(`  - Manual: ${Math.ceil(optimizedPlan.summary.totalEstimatedMinutes / 60)} hours`)
  console.log(`  - Automated: ${Math.ceil(optimizedPlan.summary.totalAutomatedMinutes / 60)} hours`)
  console.log(`  - Time Saved: ${Math.ceil((optimizedPlan.summary.totalEstimatedMinutes - optimizedPlan.summary.totalAutomatedMinutes) / 60)} hours`)
  console.log()
  console.log(`Automation: ${optimizedPlan.summary.automationPercentage}%`)
  console.log(`Complexity: ${optimizedPlan.summary.overallComplexity}/100`)
  console.log()
  console.log(`Execution Timeline:`)
  console.log(`  - Sequential: ${Math.ceil(timeline.sequential / 60)} hours`)
  console.log(`  - Parallel: ${Math.ceil(timeline.parallel / 60)} hours`)
  console.log(`  - Batches: ${timeline.batches.length}`)
  console.log()

  // Print phases
  console.log('📋 Migration Phases')
  console.log('═'.repeat(50))
  for (const phase of optimizedPlan.phases) {
    console.log(`\n${phase.name}`)
    console.log(`${phase.description}`)
    console.log(`Risk: ${phase.riskLevel.toUpperCase()} | Tasks: ${phase.tasks.length} | Time: ${Math.ceil(phase.totalAutomatedMinutes / 60)}h`)
    console.log()
    
    for (const task of phase.tasks) {
      const icon = task.type === 'automated' ? '🤖' : task.type === 'review' ? '👀' : '✋'
      console.log(`  ${icon} ${task.name}`)
      console.log(`     ${task.description}`)
      console.log(`     Files: ${task.affectedFiles.length} | Time: ${task.automatedMinutes}m | Risk: ${task.riskLevel}`)
      
      if (task.breakingChanges.length > 0) {
        console.log(`     ⚠️  Breaking: ${task.breakingChanges.join(', ')}`)
      }
    }
  }

  // Print dependency graph visualization
  console.log('\n\n🔗 Dependency Graph')
  console.log('═'.repeat(50))
  const graphBuilder = new DependencyGraphBuilder()
  const visualization = graphBuilder.visualizeGraph(
    optimizedPlan.dependencyGraph,
    optimizedPlan.phases.flatMap(p => p.tasks)
  )
  console.log(visualization)

  // Print required skills
  console.log('\n💡 Required Skills')
  console.log('═'.repeat(50))
  for (const skill of optimizedPlan.summary.requiredSkills) {
    console.log(`  • ${skill}`)
  }

  // Export plan summary
  console.log('\n\n📄 Exporting plan summary...')
  const markdown = planner.exportPlanSummary(optimizedPlan)
  console.log('✅ Plan exported successfully')

  return {
    plan: optimizedPlan,
    timeline,
    validation,
    markdown,
  }
}

// Example: Custom aggressiveness levels
export async function exampleConservativeMigration() {
  const planner = new MigrationPlanner()

  const plan = await planner.createPlan(
    {} as SourceStack,
    {} as TargetStack,
    [] as DetectedPattern[],
    { totalFiles: 100, totalLines: 10000, testCoverage: 80 },
    {
      aggressiveness: 'conservative', // More careful approach
      skipTests: false,
      skipDocumentation: false,
    }
  )

  console.log('Conservative migration plan generated')
  console.log(`Estimated time: ${Math.ceil(plan.summary.totalAutomatedMinutes / 60)} hours`)
}

// Example: Aggressive migration
export async function exampleAggressiveMigration() {
  const planner = new MigrationPlanner()

  const plan = await planner.createPlan(
    {} as SourceStack,
    {} as TargetStack,
    [] as DetectedPattern[],
    { totalFiles: 100, totalLines: 10000, testCoverage: 90 },
    {
      aggressiveness: 'aggressive', // Faster but riskier
      skipTests: false,
      skipDocumentation: true, // Skip docs for speed
    }
  )

  console.log('Aggressive migration plan generated')
  console.log(`Estimated time: ${Math.ceil(plan.summary.totalAutomatedMinutes / 60)} hours`)
}

// Run example if executed directly
if (require.main === module) {
  exampleNextJsMigration()
    .then(() => console.log('\n✅ Example completed successfully'))
    .catch((error) => console.error('\n❌ Example failed:', error))
}
