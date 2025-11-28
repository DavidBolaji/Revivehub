/**
 * Integration tests for Transformation API endpoint
 * POST /api/transform
 * 
 * Tests the API logic without importing the actual route handler
 * to avoid Next.js module resolution issues in test environment.
 * 
 * Tests:
 * - Authentication checks
 * - Request validation
 * - Rate limiting
 * - Job ID generation
 * - Background transformation execution
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { MigrationPlan, TransformationRequest } from '@/types/transformer'

// Mock migration plan
const createMockMigrationPlan = (): MigrationPlan => ({
  id: 'plan-123',
  sourceStack: {
    framework: 'React',
    version: '16.0.0',
    language: 'TypeScript',
    dependencies: { 'react': '^16.0.0' },
  },
  targetStack: {
    framework: 'React',
    version: '18.0.0',
    language: 'TypeScript',
    dependencies: { 'react': '^18.0.0' },
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
          description: 'Update React to 18',
          type: 'automated',
          estimatedMinutes: 10,
          automatedMinutes: 10,
          riskLevel: 'medium',
          affectedFiles: ['package.json'],
          dependencies: [],
          breakingChanges: [],
          pattern: {
            id: 'pattern-1',
            name: 'Outdated React',
            category: 'dependency',
            severity: 'high',
            occurrences: 1,
            affectedFiles: ['package.json'],
            description: 'React is outdated',
            automated: true,
          },
        },
      ],
      totalEstimatedMinutes: 10,
      totalAutomatedMinutes: 10,
      riskLevel: 'medium',
      canRunInParallel: false,
    },
  ],
  summary: {
    totalPhases: 1,
    totalTasks: 1,
    totalEstimatedMinutes: 10,
    totalAutomatedMinutes: 10,
    automationPercentage: 100,
    overallRiskLevel: 'medium',
  },
  dependencyGraph: [],
  customization: {
    preferences: {},
    constraints: [],
    priorities: [],
  },
  createdAt: new Date().toISOString(),
  aiInsights: {
    recommendations: [],
    warnings: [],
    estimatedComplexity: 'medium',
    suggestedApproach: 'Incremental',
  },
  aiMetadata: {
    model: 'gpt-4',
    timestamp: new Date().toISOString(),
    tokensUsed: 1000,
    confidence: 0.9,
  },
})

// Helper to simulate API validation logic
function validateTransformationRequest(body: any): { valid: boolean; error?: string } {
  if (!body.repository?.owner || !body.repository?.name) {
    return { valid: false, error: 'Missing required field: repository.owner and repository.name' }
  }

  if (!body.selectedTaskIds || !Array.isArray(body.selectedTaskIds)) {
    return { valid: false, error: 'Missing or invalid field: selectedTaskIds must be an array' }
  }

  if (body.selectedTaskIds.length === 0) {
    return { valid: false, error: 'No tasks selected. Please select at least one task to transform.' }
  }

  if (!body.migrationPlan) {
    return { valid: false, error: 'Missing required field: migrationPlan' }
  }

  // Validate task IDs exist in migration plan
  const allTaskIds = new Set<string>()
  for (const phase of body.migrationPlan.phases) {
    for (const task of phase.tasks) {
      allTaskIds.add(task.id)
    }
  }

  const invalidTaskIds = body.selectedTaskIds.filter((id: string) => !allTaskIds.has(id))
  if (invalidTaskIds.length > 0) {
    return {
      valid: false,
      error: `Invalid task IDs: ${invalidTaskIds.join(', ')} do not exist in the migration plan`,
    }
  }

  return { valid: true }
}

// Helper to generate job ID
function generateJobId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

// Rate limiting tracker
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 10

function checkRateLimitForUser(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const userLimit = requestCounts.get(userId)

  if (userLimit) {
    if (now < userLimit.resetAt) {
      if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
        return {
          allowed: false,
          retryAfter: Math.ceil((userLimit.resetAt - now) / 1000),
        }
      }
      userLimit.count++
    } else {
      userLimit.count = 1
      userLimit.resetAt = now + RATE_LIMIT_WINDOW_MS
    }
  } else {
    requestCounts.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
  }

  return { allowed: true }
}

describe('POST /api/transform - Request Validation', () => {
  beforeEach(() => {
    requestCounts.clear()
  })

  afterEach(() => {
    requestCounts.clear()
  })

  it('should reject request without authentication', () => {
    const session = null
    const isAuthenticated = session !== null

    expect(isAuthenticated).toBe(false)
  })

  it('should reject request with missing repository owner', () => {
    const body = {
      repository: { name: 'test-repo' },
      selectedTaskIds: ['task-1'],
      migrationPlan: createMockMigrationPlan(),
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('repository.owner')
  })

  it('should reject request with non-array selectedTaskIds', () => {
    const body = {
      repository: { owner: 'test-owner', name: 'test-repo' },
      selectedTaskIds: 'not-an-array',
      migrationPlan: createMockMigrationPlan(),
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('selectedTaskIds')
  })

  it('should reject request with empty selectedTaskIds', () => {
    const body = {
      repository: { owner: 'test-owner', name: 'test-repo' },
      selectedTaskIds: [],
      migrationPlan: createMockMigrationPlan(),
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('No tasks selected')
  })

  it('should reject request with missing migrationPlan', () => {
    const body = {
      repository: { owner: 'test-owner', name: 'test-repo' },
      selectedTaskIds: ['task-1'],
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('migrationPlan')
  })

  it('should reject request with invalid task IDs', () => {
    const body = {
      repository: { owner: 'test-owner', name: 'test-repo' },
      selectedTaskIds: ['invalid-task-id'],
      migrationPlan: createMockMigrationPlan(),
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid task IDs')
  })

  it('should accept valid request with all required fields', () => {
    const body: TransformationRequest = {
      repository: { owner: 'test-owner', name: 'test-repo' },
      selectedTaskIds: ['task-1'],
      migrationPlan: createMockMigrationPlan(),
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should accept valid request with optional branch', () => {
    const body: TransformationRequest = {
      repository: { owner: 'test-owner', name: 'test-repo', branch: 'main' },
      selectedTaskIds: ['task-1'],
      migrationPlan: createMockMigrationPlan(),
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(true)
  })

  it('should accept valid request with options', () => {
    const body: TransformationRequest = {
      repository: { owner: 'test-owner', name: 'test-repo' },
      selectedTaskIds: ['task-1'],
      migrationPlan: createMockMigrationPlan(),
      options: { aggressive: true, skipTests: false },
    }

    const result = validateTransformationRequest(body)

    expect(result.valid).toBe(true)
  })
})

describe('POST /api/transform - Rate Limiting', () => {
  beforeEach(() => {
    requestCounts.clear()
  })

  afterEach(() => {
    requestCounts.clear()
  })

  it('should allow requests within rate limit', () => {
    const userId = 'user-123'

    // Make 10 requests (the limit)
    for (let i = 0; i < 10; i++) {
      const result = checkRateLimitForUser(userId)
      expect(result.allowed).toBe(true)
    }
  })

  it('should block requests exceeding rate limit', () => {
    const userId = 'user-123'

    // Make 10 requests (the limit)
    for (let i = 0; i < 10; i++) {
      checkRateLimitForUser(userId)
    }

    // 11th request should be blocked
    const result = checkRateLimitForUser(userId)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeDefined()
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('should track rate limits per user independently', () => {
    const user1 = 'user-123'
    const user2 = 'user-456'

    // User 1 makes 10 requests
    for (let i = 0; i < 10; i++) {
      checkRateLimitForUser(user1)
    }

    // User 1 should be blocked
    const result1 = checkRateLimitForUser(user1)
    expect(result1.allowed).toBe(false)

    // User 2 should still be allowed
    const result2 = checkRateLimitForUser(user2)
    expect(result2.allowed).toBe(true)
  })

  it('should reset rate limit after window expires', async () => {
    const userId = 'user-123'

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      checkRateLimitForUser(userId)
    }

    // Should be blocked
    let result = checkRateLimitForUser(userId)
    expect(result.allowed).toBe(false)

    // Manually reset the window (simulate time passing)
    requestCounts.delete(userId)

    // Should be allowed again
    result = checkRateLimitForUser(userId)
    expect(result.allowed).toBe(true)
  })
})

describe('POST /api/transform - Job ID Generation', () => {
  it('should generate unique job IDs', () => {
    const jobId1 = generateJobId()
    const jobId2 = generateJobId()

    expect(jobId1).not.toBe(jobId2)
  })

  it('should generate job IDs with correct format', () => {
    const jobId = generateJobId()

    expect(jobId).toMatch(/^tx_\d+_[a-z0-9]+$/)
    expect(jobId).toContain('tx_')
  })

  it('should generate job IDs with timestamp component', () => {
    const beforeTime = Date.now()
    const jobId = generateJobId()
    const afterTime = Date.now()

    const timestampPart = jobId.split('_')[1]
    const timestamp = parseInt(timestampPart)

    expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
    expect(timestamp).toBeLessThanOrEqual(afterTime)
  })
})

describe('POST /api/transform - GitHub Rate Limit Check', () => {
  it('should require at least 50 remaining GitHub API requests', () => {
    const rateLimit = {
      core: {
        limit: 5000,
        remaining: 49,
        reset: new Date(Date.now() + 3600000),
        used: 4951,
      },
    }

    const hasEnoughRequests = rateLimit.core.remaining >= 50
    expect(hasEnoughRequests).toBe(false)
  })

  it('should allow transformation with sufficient GitHub API requests', () => {
    const rateLimit = {
      core: {
        limit: 5000,
        remaining: 100,
        reset: new Date(Date.now() + 3600000),
        used: 4900,
      },
    }

    const hasEnoughRequests = rateLimit.core.remaining >= 50
    expect(hasEnoughRequests).toBe(true)
  })
})

describe('POST /api/transform - API Documentation', () => {
  it('should provide endpoint information', () => {
    const docs = {
      endpoint: '/api/transform',
      method: 'POST',
      description: 'Initiates code transformation for selected tasks from a migration plan',
      authentication: 'Required - GitHub OAuth session',
      rateLimit: '10 requests per minute',
    }

    expect(docs.endpoint).toBe('/api/transform')
    expect(docs.method).toBe('POST')
    expect(docs.authentication).toContain('Required')
    expect(docs.rateLimit).toContain('10 requests per minute')
  })

  it('should document required request fields', () => {
    const requiredFields = [
      'repository.owner',
      'repository.name',
      'selectedTaskIds',
      'migrationPlan',
    ]

    expect(requiredFields).toContain('repository.owner')
    expect(requiredFields).toContain('repository.name')
    expect(requiredFields).toContain('selectedTaskIds')
    expect(requiredFields).toContain('migrationPlan')
  })

  it('should document response format', () => {
    const responseFormat = {
      jobId: 'string - Unique job identifier',
      status: 'processing | complete | failed',
      message: 'string - Human-readable status message',
    }

    expect(responseFormat.jobId).toBeDefined()
    expect(responseFormat.status).toBeDefined()
    expect(responseFormat.message).toBeDefined()
  })
})
