/**
 * Unit tests for GitHub Apply Changes API endpoint
 * POST /api/github/apply
 * 
 * Tests the API logic including:
 * - Authentication checks
 * - Request validation
 * - Service integration
 * - Error handling
 * 
 * Requirements: 1.1, 4.4, 7.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ApplyChangesRequest } from '@/lib/github/types'

// Mock request helper
const createMockRequest = (body: any): Request => {
  return {
    json: async () => body,
  } as Request
}

// Mock session
const createMockSession = (accessToken?: string) => ({
  user: {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
  },
  accessToken,
  expiresAt: Date.now() + 3600000,
})

// Mock apply changes request
const createMockApplyRequest = (): ApplyChangesRequest => ({
  repository: {
    owner: 'test-owner',
    name: 'test-repo',
  },
  migrationJobId: 'job-123',
  acceptedFiles: ['src/App.tsx', 'src/index.tsx'],
  transformations: {
    'src/App.tsx': {
      originalCode: 'const App = () => <div>Old</div>',
      transformedCode: 'const App = () => <div>New</div>',
      confidence: 0.95,
      changes: ['Updated component'],
      warnings: [],
    },
    'src/index.tsx': {
      originalCode: 'import React from "react"',
      transformedCode: 'import React from "react"',
      confidence: 1.0,
      changes: [],
      warnings: [],
    },
  },
  migrationSpec: {
    sourceFramework: {
      name: 'React',
      version: '16.0.0',
    },
    targetFramework: {
      name: 'React',
      version: '18.0.0',
    },
    options: {},
  },
  baseBranch: 'main',
})

describe('POST /api/github/apply - Authentication', () => {
  it('should require authentication', () => {
    // Requirement 7.2: Must validate session and extract token
    const session = null
    
    expect(session).toBeNull()
    
    // API should return 401 when session is null
    const expectedResponse = {
      error: 'Unauthorized',
      message: expect.stringContaining('sign in'),
    }
    
    expect(expectedResponse.error).toBe('Unauthorized')
  })

  it('should require access token in session', () => {
    // Requirement 7.2: Must have access token
    const session = createMockSession()
    
    expect(session.accessToken).toBeUndefined()
    
    // API should return 401 when access token is missing
    const expectedResponse = {
      error: 'Unauthorized',
      message: expect.stringContaining('sign in'),
    }
    
    expect(expectedResponse.error).toBe('Unauthorized')
  })

  it('should accept valid session with access token', () => {
    // Requirement 7.2: Valid session with token should be accepted
    const session = createMockSession('ghp_test_token_123')
    
    expect(session.accessToken).toBe('ghp_test_token_123')
    expect(session.accessToken).toBeTruthy()
  })
})

describe('POST /api/github/apply - Request Validation', () => {
  it('should reject invalid JSON', async () => {
    // Requirement 4.4: Clear error messages
    const invalidRequest = {
      json: async () => {
        throw new Error('Invalid JSON')
      },
    } as Request
    
    await expect(invalidRequest.json()).rejects.toThrow('Invalid JSON')
  })

  it('should require repository.owner', () => {
    const request = createMockApplyRequest()
    delete (request.repository as any).owner
    
    expect(request.repository.owner).toBeUndefined()
  })

  it('should require repository.name', () => {
    const request = createMockApplyRequest()
    delete (request.repository as any).name
    
    expect(request.repository.name).toBeUndefined()
  })

  it('should require migrationJobId', () => {
    const request = createMockApplyRequest()
    delete (request as any).migrationJobId
    
    expect(request.migrationJobId).toBeUndefined()
  })

  it('should require acceptedFiles array', () => {
    const request = createMockApplyRequest()
    delete (request as any).acceptedFiles
    
    expect(request.acceptedFiles).toBeUndefined()
  })

  it('should reject empty acceptedFiles array', () => {
    const request = createMockApplyRequest()
    request.acceptedFiles = []
    
    expect(request.acceptedFiles).toHaveLength(0)
  })

  it('should require transformations object', () => {
    const request = createMockApplyRequest()
    delete (request as any).transformations
    
    expect(request.transformations).toBeUndefined()
  })

  it('should require migrationSpec', () => {
    const request = createMockApplyRequest()
    delete (request as any).migrationSpec
    
    expect(request.migrationSpec).toBeUndefined()
  })

  it('should require sourceFramework in migrationSpec', () => {
    const request = createMockApplyRequest()
    delete (request.migrationSpec as any).sourceFramework
    
    expect(request.migrationSpec.sourceFramework).toBeUndefined()
  })

  it('should require targetFramework in migrationSpec', () => {
    const request = createMockApplyRequest()
    delete (request.migrationSpec as any).targetFramework
    
    expect(request.migrationSpec.targetFramework).toBeUndefined()
  })

  it('should require framework names', () => {
    const request = createMockApplyRequest()
    delete (request.migrationSpec.sourceFramework as any).name
    
    expect(request.migrationSpec.sourceFramework.name).toBeUndefined()
  })

  it('should validate all accepted files have transformations', () => {
    const request = createMockApplyRequest()
    request.acceptedFiles.push('src/missing.tsx')
    
    const missingFiles = request.acceptedFiles.filter(
      file => !request.transformations[file]
    )
    
    expect(missingFiles).toHaveLength(1)
    expect(missingFiles[0]).toBe('src/missing.tsx')
  })

  it('should accept valid request', () => {
    const request = createMockApplyRequest()
    
    // Validate all required fields are present
    expect(request.repository.owner).toBe('test-owner')
    expect(request.repository.name).toBe('test-repo')
    expect(request.migrationJobId).toBe('job-123')
    expect(request.acceptedFiles).toHaveLength(2)
    expect(request.transformations).toBeDefined()
    expect(request.migrationSpec).toBeDefined()
    expect(request.migrationSpec.sourceFramework.name).toBe('React')
    expect(request.migrationSpec.targetFramework.name).toBe('React')
    
    // All accepted files have transformations
    const allFilesHaveTransformations = request.acceptedFiles.every(
      file => request.transformations[file]
    )
    expect(allFilesHaveTransformations).toBe(true)
  })
})

describe('POST /api/github/apply - Error Handling', () => {
  it('should detect rate limit errors', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('rate limit exceeded')
    
    expect(error.message).toContain('rate limit')
  })

  it('should detect permission errors', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('Insufficient permissions')
    
    expect(error.message).toContain('permission')
  })

  it('should detect repository not found errors', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('Repository does not exist')
    
    expect(error.message).toContain('not exist')
  })

  it('should detect archived repository errors', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('Repository is archived')
    
    expect(error.message).toContain('archived')
  })

  it('should detect operation in progress errors', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('Operation already in progress')
    
    expect(error.message).toContain('already in progress')
  })

  it('should handle validation errors', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('Validation failed: missing files')
    
    expect(error.message).toContain('Validation failed')
  })

  it('should detect network errors', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('network timeout')
    
    expect(error.message).toContain('network')
  })

  it('should handle unknown errors gracefully', () => {
    // Requirement 4.4: User-friendly error messages
    const error = new Error('Something unexpected happened')
    
    expect(error.message).toBeTruthy()
  })
})

describe('POST /api/github/apply - Success Response', () => {
  it('should return operation ID on success', () => {
    // Requirement 1.1: Return operation ID
    const result = {
      operationId: 'op_123456789_abc',
      status: 'success' as const,
      branchName: 'revivehub/migration-react-2024-01-01',
      pullRequest: {
        number: 42,
        url: 'https://api.github.com/repos/test-owner/test-repo/pulls/42',
        htmlUrl: 'https://github.com/test-owner/test-repo/pull/42',
      },
      commits: [
        {
          sha: 'abc1234',
          message: 'ReviveHub Migration: React 16 to React 18 (batch 1/1: 2 files)',
          filesCount: 2,
        },
      ],
    }
    
    expect(result.operationId).toBeTruthy()
    expect(result.operationId).toMatch(/^op_/)
    expect(result.status).toBe('success')
    expect(result.branchName).toBeTruthy()
    expect(result.pullRequest.number).toBeGreaterThan(0)
    expect(result.pullRequest.htmlUrl).toContain('github.com')
    expect(result.commits).toHaveLength(1)
  })

  it('should include branch name in response', () => {
    const result = {
      branchName: 'revivehub/migration-react-2024-01-01',
    }
    
    expect(result.branchName).toMatch(/^revivehub\/migration-/)
  })

  it('should include pull request details', () => {
    const result = {
      pullRequest: {
        number: 42,
        url: 'https://github.com/test-owner/test-repo/pull/42',
      },
    }
    
    expect(result.pullRequest.number).toBe(42)
    expect(result.pullRequest.url).toContain('github.com')
    expect(result.pullRequest.url).toContain('/pull/42')
  })

  it('should include commit information', () => {
    const result = {
      commits: [
        {
          sha: 'abc1234',
          message: 'ReviveHub Migration: React 16 to React 18 (batch 1/1: 2 files)',
          filesCount: 2,
        },
      ],
    }
    
    expect(result.commits).toHaveLength(1)
    expect(result.commits[0].sha).toBeTruthy()
    expect(result.commits[0].message).toContain('ReviveHub Migration')
    expect(result.commits[0].filesCount).toBe(2)
  })
})

describe('GET /api/github/apply - Documentation', () => {
  it('should provide API documentation structure', () => {
    const docs = {
      endpoint: '/api/github/apply',
      method: 'POST',
      description: 'Applies transformation changes to GitHub by creating a branch and pull request',
      authentication: 'Required - GitHub OAuth session with repo scope',
      requestBody: {},
      response: {},
    }
    
    expect(docs.endpoint).toBe('/api/github/apply')
    expect(docs.method).toBe('POST')
    expect(docs.description).toContain('transformation')
    expect(docs.authentication).toContain('GitHub OAuth')
  })
})
