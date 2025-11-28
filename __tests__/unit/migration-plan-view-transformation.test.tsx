import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import type { MigrationPlan } from '@/lib/planner/types'

// Mock the dynamic imports to return simple components
vi.mock('next/dynamic', () => ({
  default: (fn: any, options?: any) => {
    return (props: any) => {
      if (options?.loading) {
        return options.loading()
      }
      return <div data-testid="dynamic-component">Dynamic Component</div>
    }
  },
}))

// Import after mocking
const { MigrationPlanView } = await import('@/components/planner/MigrationPlanView')

// Mock fetch
global.fetch = vi.fn()

const mockPlan: MigrationPlan = {
  id: 'test-plan-1',
  sourceStack: {
    framework: 'React',
    version: '17.0.0',
    language: 'JavaScript',
    dependencies: {
      react: '17.0.0',
    },
    patterns: [],
  },
  targetStack: {
    framework: 'React',
    version: '18.0.0',
    language: 'TypeScript',
    dependencies: {
      react: '18.0.0',
    },
    features: [],
  },
  phases: [
    {
      id: 'phase-1',
      name: 'Dependency Updates',
      description: 'Update dependencies',
      order: 1,
      tasks: [
        {
          id: 'task-1',
          name: 'Update React',
          description: 'Update React to v18',
          type: 'automated',
          estimatedMinutes: 30,
          automatedMinutes: 30,
          riskLevel: 'low',
          affectedFiles: ['package.json'],
          dependencies: [],
          breakingChanges: [],
          pattern: {
            id: 'pattern-1',
            name: 'Outdated React',
            category: 'dependency',
            severity: 'medium',
            occurrences: 1,
            affectedFiles: ['package.json'],
            description: 'React is outdated',
            automated: true,
          },
        },
      ],
      totalEstimatedMinutes: 30,
      totalAutomatedMinutes: 30,
      riskLevel: 'low',
      canRunInParallel: false,
    },
  ],
  summary: {
    totalTasks: 1,
    automatedTasks: 1,
    manualTasks: 0,
    reviewTasks: 0,
    totalEstimatedMinutes: 30,
    totalAutomatedMinutes: 30,
    automationPercentage: 100,
    overallComplexity: 1,
    requiredSkills: [],
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

describe('MigrationPlanView - Transformation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the migration plan with transformation button', () => {
    render(
      <MigrationPlanView
        plan={mockPlan}
        repositoryName="test-owner/test-repo"
        repositoryOwner="test-owner"
      />
    )

    expect(screen.getByText(/Ready to Transform/i)).toBeInTheDocument()
    expect(screen.getByText(/Start Transformation/i)).toBeInTheDocument()
  })

  it('should show task selector when clicking Select Tasks button', async () => {
    render(
      <MigrationPlanView
        plan={mockPlan}
        repositoryName="test-owner/test-repo"
        repositoryOwner="test-owner"
      />
    )

    const selectTasksButton = screen.getByText(/Select Tasks/i)
    fireEvent.click(selectTasksButton)

    await waitFor(() => {
      expect(screen.getByText(/Select Tasks to Transform/i)).toBeInTheDocument()
    })
  })

  it('should call API when starting transformation', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jobId: 'test-job-123', status: 'processing' }),
    })
    global.fetch = mockFetch

    render(
      <MigrationPlanView
        plan={mockPlan}
        repositoryName="test-owner/test-repo"
        repositoryOwner="test-owner"
      />
    )

    const startButton = screen.getByText(/Start Transformation/i)
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/transform',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })
  })

  it('should show error message when transformation fails', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'Transformation failed' }),
    })
    global.fetch = mockFetch

    render(
      <MigrationPlanView
        plan={mockPlan}
        repositoryName="test-owner/test-repo"
        repositoryOwner="test-owner"
      />
    )

    const startButton = screen.getByText(/Start Transformation/i)
    fireEvent.click(startButton)

    await waitFor(() => {
      expect(screen.getByText(/Transformation failed/i)).toBeInTheDocument()
    })
  })

  it('should disable start button when no tasks are selected', () => {
    render(
      <MigrationPlanView
        plan={{
          ...mockPlan,
          phases: [
            {
              ...mockPlan.phases[0],
              tasks: [],
            },
          ],
        }}
        repositoryName="test-owner/test-repo"
        repositoryOwner="test-owner"
      />
    )

    const startButton = screen.getByText(/Start Transformation/i)
    expect(startButton).toBeDisabled()
  })
})
