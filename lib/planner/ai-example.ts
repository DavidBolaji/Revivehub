/**
 * Example: AI-Enhanced Migration Planning
 * 
 * This example demonstrates how to use the AI enhancement feature
 * to get intelligent insights for your migration plan.
 */

import { MigrationPlanner } from './migration-planner'
import type { SourceStack, TargetStack, DetectedPattern } from './types'

async function demonstrateAIEnhancement() {
  // Define source stack (legacy React app)
  const sourceStack: SourceStack = {
    framework: 'React',
    version: '17.0.2',
    language: 'JavaScript',
    dependencies: {
      react: '17.0.2',
      'react-dom': '17.0.2',
      'react-router-dom': '5.3.0',
      redux: '4.1.0',
      'react-redux': '7.2.4',
      'redux-thunk': '2.3.0',
      enzyme: '3.11.0', // Deprecated!
      'prop-types': '15.7.2',
      axios: '0.21.1',
    },
    patterns: ['class-components', 'redux', 'enzyme-tests', 'hoc-patterns'],
  }

  // Define target stack (modern React app)
  const targetStack: TargetStack = {
    framework: 'React',
    version: '18.2.0',
    language: 'TypeScript',
    dependencies: {
      react: '18.2.0',
      'react-dom': '18.2.0',
      'react-router-dom': '6.8.0',
      zustand: '4.3.0',
      '@tanstack/react-query': '4.24.0',
      vitest: '0.28.5',
      '@testing-library/react': '13.4.0',
      axios: '1.3.0',
    },
    features: ['hooks', 'typescript', 'vitest', 'concurrent-rendering'],
  }

  // Define detected patterns
  const patterns: DetectedPattern[] = [
    {
      id: 'pattern-1',
      name: 'Class Components',
      category: 'component',
      severity: 'medium',
      occurrences: 45,
      affectedFiles: [
        'src/components/UserProfile.jsx',
        'src/components/Dashboard.jsx',
        'src/components/Settings.jsx',
        // ... more files
      ],
      description: 'Legacy class components that should be converted to functional components',
      automated: false,
    },
    {
      id: 'pattern-2',
      name: 'Redux Store',
      category: 'structural',
      severity: 'high',
      occurrences: 1,
      affectedFiles: ['src/store/index.js', 'src/store/reducers/', 'src/store/actions/'],
      description: 'Complex Redux setup that could be simplified',
      automated: false,
    },
    {
      id: 'pattern-3',
      name: 'Enzyme Tests',
      category: 'documentation',
      severity: 'high',
      occurrences: 120,
      affectedFiles: ['src/**/*.test.js'],
      description: 'Enzyme tests need migration to React Testing Library',
      automated: true,
    },
    {
      id: 'pattern-4',
      name: 'Higher-Order Components',
      category: 'component',
      severity: 'medium',
      occurrences: 12,
      affectedFiles: ['src/hoc/withAuth.jsx', 'src/hoc/withLoading.jsx'],
      description: 'HOCs that could be converted to custom hooks',
      automated: false,
    },
  ]

  // Codebase statistics
  const codebaseStats = {
    totalFiles: 250,
    totalLines: 45000,
    testCoverage: 65,
  }

  // Create planner and generate AI-enhanced plan
  const planner = new MigrationPlanner()
  
  console.log('🤖 Generating AI-enhanced migration plan...\n')
  
  const plan = await planner.createPlan(
    sourceStack,
    targetStack,
    patterns,
    codebaseStats,
    {
      aggressiveness: 'balanced',
      skipTests: false,
      skipDocumentation: false,
    },
    true // Enable AI enhancement
  )

  // Check if plan has AI insights
  if ('aiInsights' in plan) {
    console.log('✅ AI Enhancement Complete!\n')
    console.log(`📊 Overall Confidence Score: ${plan.aiMetadata.confidenceScore}%`)
    console.log(`🕐 Analysis Timestamp: ${plan.aiMetadata.analysisTimestamp.toISOString()}`)
    console.log(`🤖 Model Version: ${plan.aiMetadata.modelVersion}\n`)

    // Display overall insights
    console.log('═══════════════════════════════════════════════════════')
    console.log('📋 OVERALL AI INSIGHTS')
    console.log('═══════════════════════════════════════════════════════\n')

    plan.aiInsights.overall.forEach((insight, index) => {
      const icon = {
        warning: '⚠️',
        tip: '💡',
        insight: 'ℹ️',
        optimization: '⚡',
      }[insight.type]

      console.log(`${icon} ${insight.type.toUpperCase()} [${insight.confidence}% confident]`)
      console.log(`   Category: ${insight.category}`)
      console.log(`   ${insight.message}`)
      if (insight.suggestedAction) {
        console.log(`   → Action: ${insight.suggestedAction}`)
      }
      if (insight.affectedItems && insight.affectedItems.length > 0) {
        console.log(`   → Affects: ${insight.affectedItems.slice(0, 3).join(', ')}${insight.affectedItems.length > 3 ? '...' : ''}`)
      }
      console.log()
    })

    // Display phase-specific insights
    console.log('═══════════════════════════════════════════════════════')
    console.log('📦 PHASE-SPECIFIC INSIGHTS')
    console.log('═══════════════════════════════════════════════════════\n')

    plan.phases.forEach((phase) => {
      const phaseInsights = plan.aiInsights.byPhase[phase.id]
      if (phaseInsights && phaseInsights.length > 0) {
        console.log(`Phase: ${phase.name}`)
        console.log(`Risk Level: ${phase.riskLevel.toUpperCase()}`)
        console.log(`Tasks: ${phase.tasks.length}\n`)

        phaseInsights.forEach((insight) => {
          const icon = {
            warning: '⚠️',
            tip: '💡',
            insight: 'ℹ️',
            optimization: '⚡',
          }[insight.type]

          console.log(`  ${icon} ${insight.message}`)
          if (insight.suggestedAction) {
            console.log(`     → ${insight.suggestedAction}`)
          }
        })
        console.log()
      }
    })

    // Display task-specific insights summary
    const taskInsightCount = Object.keys(plan.aiInsights.byTask).length
    if (taskInsightCount > 0) {
      console.log('═══════════════════════════════════════════════════════')
      console.log('🎯 TASK-SPECIFIC INSIGHTS')
      console.log('═══════════════════════════════════════════════════════\n')
      console.log(`${taskInsightCount} tasks have specific AI recommendations`)
      console.log('View individual tasks in the plan for detailed insights.\n')
    }

    // Display summary statistics
    console.log('═══════════════════════════════════════════════════════')
    console.log('📈 MIGRATION SUMMARY')
    console.log('═══════════════════════════════════════════════════════\n')
    console.log(`Total Phases: ${plan.phases.length}`)
    console.log(`Total Tasks: ${plan.summary.totalTasks}`)
    console.log(`Automated Tasks: ${plan.summary.automatedTasks}`)
    console.log(`Manual Tasks: ${plan.summary.manualTasks}`)
    console.log(`Automation Savings: ${plan.summary.automationPercentage}%`)
    console.log(`Complexity Score: ${plan.summary.overallComplexity}/100`)
    console.log(`Estimated Time: ${Math.ceil(plan.summary.totalEstimatedMinutes / 60)} hours`)
    console.log(`With Automation: ${Math.ceil(plan.summary.totalAutomatedMinutes / 60)} hours`)
    console.log(`Time Saved: ${Math.ceil((plan.summary.totalEstimatedMinutes - plan.summary.totalAutomatedMinutes) / 60)} hours\n`)

    // Key recommendations
    console.log('═══════════════════════════════════════════════════════')
    console.log('🎯 KEY RECOMMENDATIONS')
    console.log('═══════════════════════════════════════════════════════\n')

    const warnings = plan.aiInsights.overall.filter((i) => i.type === 'warning')
    const highConfidenceWarnings = warnings.filter((w) => w.confidence >= 85)

    if (highConfidenceWarnings.length > 0) {
      console.log('⚠️  Critical Issues to Address:')
      highConfidenceWarnings.forEach((warning) => {
        console.log(`   • ${warning.message}`)
        if (warning.suggestedAction) {
          console.log(`     → ${warning.suggestedAction}`)
        }
      })
      console.log()
    }

    const tips = plan.aiInsights.overall.filter((i) => i.type === 'tip')
    if (tips.length > 0) {
      console.log('💡 Helpful Tips:')
      tips.slice(0, 3).forEach((tip) => {
        console.log(`   • ${tip.message}`)
      })
      console.log()
    }

    const optimizations = plan.aiInsights.overall.filter((i) => i.type === 'optimization')
    if (optimizations.length > 0) {
      console.log('⚡ Optimization Opportunities:')
      optimizations.slice(0, 3).forEach((opt) => {
        console.log(`   • ${opt.message}`)
      })
      console.log()
    }
  } else {
    console.log('ℹ️  Plan generated without AI enhancement')
  }

  return plan
}

// Run the example
if (require.main === module) {
  demonstrateAIEnhancement()
    .then(() => {
      console.log('✅ Example completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Error:', error)
      process.exit(1)
    })
}

export { demonstrateAIEnhancement }
