import { describe, it, expect } from 'vitest'
import { AIEnhancer } from '@/lib/planner/ai-enhancer'
import type { MigrationPlan, SourceStack, TargetStack } from '@/lib/planner/types'

describe('AIEnhancer', () => {
  const enhancer = new AIEnhancer()

  const mockSourceStack: SourceStack = {
    framework: 'React',
    version: '17.0.2',
    language: 'JavaScript',
    dependencies: {
      react: '17.0.2',
      'react-dom': '17.0.2',
      'react-router-dom': '5.3.0',
      redux: '4.1.0',
      'react-redux': '7.2.4',
      enzyme: '3.11.0',
    },
    patterns: ['class-components', 'redux', 'enzyme-tests'],
  }

  const mockTargetStack: TargetStack = {
    framework: 'React',
    version: '18.2.0',
    language: 'TypeScript',
    dependencies: {
      react: '18.2.0',
      'react-dom': '18.2.0',
      'react-router-dom': '6.8.0',
      zustand: '4.3.0',
    },
    features: ['hooks', 'typescript', 'vitest'],
  }

  const mockPlan: MigrationPlan = {
    id: 'test-plan-1',
    sourceStack: mockSourceStack,
    targetStack: mockTargetStack,
    phases: [
      {
        id: 'phase-1',
        name: 'Setup & Dependencies',
        description: 'Update dependencies and configuration',
        order: 1,
        tasks: [
          {
            id: 'task-1',
            name: 'Update React to v18',
            description: 'Upgrade React and React DOM',
            type: 'automated',
            estimatedMinutes: 30,
            automatedMinutes: 5,
            riskLevel: 'medium',
            affectedFiles: ['package.json'],
            dependencies: [],
            breakingChanges: ['ReactDOM.render API changed'],
          },
          {
            id: 'task-2',
            name: 'Migrate authentication middleware',
            description: 'Update auth logic for new version',
            type: 'manual',
            estimatedMinutes: 120,
            automatedMinutes: 0,
            riskLevel: 'high',
            affectedFiles: ['src/middleware/auth.js', 'src/utils/auth.js'],
            dependencies: ['task-1'],
            breakingChanges: [],
          },
        ],
        totalEstimatedMinutes: 150,
        totalAutomatedMinutes: 5,
        riskLevel: 'high',
        canRunInParallel: false,
      },
      {
        id: 'phase-2',
        name: 'Component Migration',
        description: 'Convert class components to functional components',
        order: 2,
        tasks: [
          {
            id: 'task-3',
            name: 'Convert UserProfile component',
            description: 'Migrate class component with custom hooks',
            type: 'manual',
            estimatedMinutes: 60,
            automatedMinutes: 20,
            riskLevel: 'medium',
            affectedFiles: ['src/components/UserProfile.jsx'],
            dependencies: ['task-1'],
            breakingChanges: [],
          },
        ],
        totalEstimatedMinutes: 60,
        totalAutomatedMinutes: 20,
        riskLevel: 'medium',
        canRunInParallel: true,
      },
    ],
    summary: {
      totalTasks: 3,
      automatedTasks: 1,
      manualTasks: 2,
      reviewTasks: 0,
      totalEstimatedMinutes: 210,
      totalAutomatedMinutes: 25,
      automationPercentage: 88,
      overallComplexity: 75,
      requiredSkills: ['React', 'TypeScript', 'Testing'],
    },
    dependencyGraph: [],
    customization: {
      aggressiveness: 'balanced',
      enabledTransformations: [],
      disabledTransformations: [],
      selectedPatterns: [],
      skipTests: false,
      skipDocumentation: false,
    },
    createdAt: new Date(),
  }

  it('should enhance plan with AI insights', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    expect(enhancedPlan).toBeDefined()
    expect(enhancedPlan.aiInsights).toBeDefined()
    expect(enhancedPlan.aiMetadata).toBeDefined()
  })

  it('should generate overall insights', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    expect(enhancedPlan.aiInsights.overall).toBeDefined()
    expect(enhancedPlan.aiInsights.overall.length).toBeGreaterThan(0)

    // Check for specific insight types
    const insightTypes = enhancedPlan.aiInsights.overall.map((i) => i.type)
    expect(insightTypes).toContain('warning')
    expect(insightTypes).toContain('tip')
  })

  it('should detect deprecated dependencies', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const deprecatedWarning = enhancedPlan.aiInsights.overall.find(
      (i) => i.message.includes('deprecated') && i.message.includes('enzyme')
    )

    expect(deprecatedWarning).toBeDefined()
    expect(deprecatedWarning?.type).toBe('warning')
    expect(deprecatedWarning?.category).toBe('dependencies')
    expect(deprecatedWarning?.confidence).toBeGreaterThan(80)
  })

  it('should detect complex state management', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const stateManagementInsight = enhancedPlan.aiInsights.overall.find(
      (i) => i.message.toLowerCase().includes('state management')
    )

    expect(stateManagementInsight).toBeDefined()
    expect(stateManagementInsight?.category).toBe('architecture')
  })

  it('should generate phase-specific insights', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    expect(enhancedPlan.aiInsights.byPhase).toBeDefined()
    expect(Object.keys(enhancedPlan.aiInsights.byPhase).length).toBeGreaterThan(0)

    // Check high-risk phase has warnings
    const phase1Insights = enhancedPlan.aiInsights.byPhase['phase-1']
    expect(phase1Insights).toBeDefined()
    expect(phase1Insights.length).toBeGreaterThan(0)

    const hasHighRiskWarning = phase1Insights.some(
      (i) => i.type === 'warning' && i.message.includes('High-risk')
    )
    expect(hasHighRiskWarning).toBe(true)
  })

  it('should detect authentication tasks requiring manual review', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const phase1Insights = enhancedPlan.aiInsights.byPhase['phase-1']
    const authWarning = phase1Insights.find(
      (i) => i.message.toLowerCase().includes('authentication') || i.message.toLowerCase().includes('security')
    )

    expect(authWarning).toBeDefined()
    expect(authWarning?.type).toBe('warning')
    expect(authWarning?.category).toBe('security')
  })

  it('should generate task-specific insights', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    expect(enhancedPlan.aiInsights.byTask).toBeDefined()

    // Check for insights on manual task with many files
    const task2Insights = enhancedPlan.aiInsights.byTask['task-2']
    expect(task2Insights).toBeDefined()
  })

  it('should detect custom hooks requiring attention', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const task3Insights = enhancedPlan.aiInsights.byTask['task-3']
    const hookInsight = task3Insights?.find((i) => i.message.toLowerCase().includes('hook'))

    expect(hookInsight).toBeDefined()
    expect(hookInsight?.category).toBe('compatibility')
  })

  it('should suggest testing strategies', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const testingInsights = enhancedPlan.aiInsights.overall.filter(
      (i) => i.category === 'testing'
    )

    expect(testingInsights.length).toBeGreaterThan(0)

    // Should recommend E2E testing for high complexity
    const e2eRecommendation = testingInsights.find((i) =>
      i.message.toLowerCase().includes('e2e')
    )
    expect(e2eRecommendation).toBeDefined()
  })

  it('should recommend gradual migration approach', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const gradualMigrationTips = enhancedPlan.aiInsights.overall.filter(
      (i) => i.type === 'tip' && i.category === 'best-practices'
    )

    expect(gradualMigrationTips.length).toBeGreaterThan(0)
  })

  it('should include confidence scores', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const allInsights = [
      ...enhancedPlan.aiInsights.overall,
      ...Object.values(enhancedPlan.aiInsights.byPhase).flat(),
      ...Object.values(enhancedPlan.aiInsights.byTask).flat(),
    ]

    allInsights.forEach((insight) => {
      expect(insight.confidence).toBeGreaterThanOrEqual(0)
      expect(insight.confidence).toBeLessThanOrEqual(100)
    })
  })

  it('should include suggested actions for warnings', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const warnings = enhancedPlan.aiInsights.overall.filter((i) => i.type === 'warning')

    warnings.forEach((warning) => {
      expect(warning.suggestedAction).toBeDefined()
      expect(warning.suggestedAction).not.toBe('')
    })
  })

  it('should calculate overall confidence score', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    expect(enhancedPlan.aiMetadata.confidenceScore).toBeGreaterThan(0)
    expect(enhancedPlan.aiMetadata.confidenceScore).toBeLessThanOrEqual(100)
  })

  it('should include model version metadata', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    expect(enhancedPlan.aiMetadata.modelVersion).toBeDefined()
    expect(enhancedPlan.aiMetadata.analysisTimestamp).toBeInstanceOf(Date)
  })

  it('should detect major version jumps', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const versionJumpWarning = enhancedPlan.aiInsights.overall.find(
      (i) => i.message.includes('Major version jumps')
    )

    expect(versionJumpWarning).toBeDefined()
    expect(versionJumpWarning?.affectedItems).toBeDefined()
    expect(versionJumpWarning?.affectedItems?.length).toBeGreaterThan(0)
  })

  it('should warn about breaking changes', async () => {
    const enhancedPlan = await enhancer.enhancePlan(mockPlan)

    const task1Insights = enhancedPlan.aiInsights.byTask['task-1']
    const breakingChangeWarning = task1Insights?.find(
      (i) => i.message.includes('breaking changes')
    )

    expect(breakingChangeWarning).toBeDefined()
    expect(breakingChangeWarning?.type).toBe('warning')
  })
})
