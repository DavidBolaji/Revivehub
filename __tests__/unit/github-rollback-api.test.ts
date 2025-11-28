/**
 * Tests for GitHub Rollback API Route
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RollbackResult } from '@/lib/github/types'

// Mock dependencies before importing the route
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/github/orchestrator-registry', () => ({
  getOrchestrator: vi.fn(),
}))

// Import after mocking
const { POST, GET } = await import('@/app/api/github/rollback/route')
const { auth } = await import('@/auth')
const { getOrchestrator } = await import('@/lib/github/orchestrator-registry')

describe('GitHub Rollback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/github/rollback', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
      expect(data.message).toContain('sign in')
    })

    it('should return 400 if request body is invalid JSON', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.message).toContain('valid JSON')
    })

    it('should return 400 if operationId is missing', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request')
      expect(data.message).toContain('operationId')
    })

    it('should return 400 if confirmation is not provided (Requirement 9.4)', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123' }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Confirmation required')
      expect(data.message).toContain('confirmation')
      expect(data.requiresConfirmation).toBe(true)
    })

    it('should return 404 if orchestrator is not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      vi.mocked(getOrchestrator).mockReturnValue(undefined)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Operation not found')
      expect(data.message).toContain('not found')
    })

    it('should successfully rollback changes (Requirements 9.1, 9.2, 9.5)', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const mockResult: RollbackResult = {
        success: true,
        message: 'Successfully rolled back changes. Branch test-branch has been deleted.',
        branchDeleted: true,
        prClosed: true,
      }

      const mockOrchestrator = {
        rollbackChanges: vi.fn().mockResolvedValue(mockResult),
      }

      vi.mocked(getOrchestrator).mockReturnValue(mockOrchestrator as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toContain('Successfully rolled back')
      expect(data.branchDeleted).toBe(true)
      expect(data.prClosed).toBe(true)
      expect(mockOrchestrator.rollbackChanges).toHaveBeenCalledWith('test-op-123')
    })

    it('should return 409 if PR is already merged (Requirement 9.3)', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const mockResult: RollbackResult = {
        success: false,
        message: 'Cannot rollback: Pull request has already been merged',
        branchDeleted: false,
        prClosed: false,
        errors: ['Pull request is already merged'],
      }

      const mockOrchestrator = {
        rollbackChanges: vi.fn().mockResolvedValue(mockResult),
      }

      vi.mocked(getOrchestrator).mockReturnValue(mockOrchestrator as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Cannot rollback merged PR')
      expect(data.message).toContain('merged')
    })

    it('should return 500 if rollback fails with errors', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const mockResult: RollbackResult = {
        success: false,
        message: 'Rollback completed with errors',
        branchDeleted: false,
        prClosed: true,
        errors: ['Failed to delete branch: Branch not found'],
      }

      const mockOrchestrator = {
        rollbackChanges: vi.fn().mockResolvedValue(mockResult),
      }

      vi.mocked(getOrchestrator).mockReturnValue(mockOrchestrator as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Rollback failed')
      expect(data.errors).toBeDefined()
      expect(data.errors).toHaveLength(1)
    })

    it('should handle permission errors', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const mockOrchestrator = {
        rollbackChanges: vi.fn().mockRejectedValue(new Error('Insufficient permissions')),
      }

      vi.mocked(getOrchestrator).mockReturnValue(mockOrchestrator as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
      expect(data.message).toContain('permission')
    })

    it('should handle rate limit errors', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const mockOrchestrator = {
        rollbackChanges: vi.fn().mockRejectedValue(new Error('GitHub API rate limit exceeded')),
      }

      vi.mocked(getOrchestrator).mockReturnValue(mockOrchestrator as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.message).toContain('rate limit')
    })

    it('should handle network errors', async () => {
      vi.mocked(auth).mockResolvedValue({
        accessToken: 'test-token',
        user: { id: '1', name: 'Test User' },
      } as any)

      const mockOrchestrator = {
        rollbackChanges: vi.fn().mockRejectedValue(new Error('network timeout')),
      }

      vi.mocked(getOrchestrator).mockReturnValue(mockOrchestrator as any)

      const request = new Request('http://localhost/api/github/rollback', {
        method: 'POST',
        body: JSON.stringify({ operationId: 'test-op-123', confirmed: true }),
      })

      const response = await POST(request as any)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Network error')
      expect(data.message).toContain('GitHub')
    })
  })

  describe('GET /api/github/rollback', () => {
    it('should return API documentation', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.endpoint).toBe('/api/github/rollback')
      expect(data.method).toBe('POST')
      expect(data.description).toBeDefined()
      expect(data.requestBody).toBeDefined()
      expect(data.response).toBeDefined()
      expect(data.requirements).toBeDefined()
      expect(data.requirements['9.1']).toBeDefined()
      expect(data.requirements['9.2']).toBeDefined()
      expect(data.requirements['9.3']).toBeDefined()
      expect(data.requirements['9.4']).toBeDefined()
      expect(data.requirements['9.5']).toBeDefined()
    })
  })
})
