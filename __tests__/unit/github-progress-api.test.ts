/**
 * Tests for GitHub Apply Progress API
 * 
 * Tests the Server-Sent Events endpoint for progress tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/github/apply/progress/[operationId]/route'
import { registerOrchestrator, unregisterOrchestrator } from '@/lib/github/orchestrator-registry'
import type { GitHubApplyOrchestrator } from '@/lib/github/apply-orchestrator'
import type { ApplyProgress } from '@/lib/github/types'

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

const { auth } = await import('@/auth')

describe('GitHub Apply Progress API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/github/apply/progress/[operationId]', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null)

      const request = new Request('http://localhost/api/github/apply/progress/op_123')
      const response = await GET(request, { params: { operationId: 'op_123' } })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 if operation ID is missing', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'Test User' },
        accessToken: 'test-token',
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any)

      const request = new Request('http://localhost/api/github/apply/progress/')
      const response = await GET(request, { params: { operationId: '' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid request')
    })

    it('should return 404 if operation is not found', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'Test User' },
        accessToken: 'test-token',
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any)

      const request = new Request('http://localhost/api/github/apply/progress/nonexistent')
      const response = await GET(request, { params: { operationId: 'nonexistent' } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Not found')
      expect(data.message).toContain('Operation not found')
    })

    it('should return SSE stream with correct headers when operation exists', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'Test User' },
        accessToken: 'test-token',
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any)

      // Create mock orchestrator
      const mockOrchestrator = {
        trackProgress: vi.fn(),
        stopTracking: vi.fn(),
      } as unknown as GitHubApplyOrchestrator

      const operationId = 'op_test_123'
      registerOrchestrator(operationId, mockOrchestrator)

      try {
        const request = new Request(`http://localhost/api/github/apply/progress/${operationId}`)
        const response = await GET(request, { params: { operationId } })

        // Check response headers
        expect(response.headers.get('Content-Type')).toBe('text/event-stream')
        expect(response.headers.get('Cache-Control')).toBe('no-cache, no-transform')
        expect(response.headers.get('Connection')).toBe('keep-alive')

        // Verify orchestrator.trackProgress was called
        expect(mockOrchestrator.trackProgress).toHaveBeenCalledWith(
          operationId,
          expect.any(Function)
        )
      } finally {
        unregisterOrchestrator(operationId)
      }
    })

    it('should send progress updates via SSE', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'Test User' },
        accessToken: 'test-token',
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any)

      let progressCallback: ((progress: ApplyProgress) => void) | null = null

      // Create mock orchestrator that captures the callback
      const mockOrchestrator = {
        trackProgress: vi.fn((_, callback) => {
          progressCallback = callback
        }),
        stopTracking: vi.fn(),
      } as unknown as GitHubApplyOrchestrator

      const operationId = 'op_test_456'
      registerOrchestrator(operationId, mockOrchestrator)

      try {
        const request = new Request(`http://localhost/api/github/apply/progress/${operationId}`)
        const response = await GET(request, { params: { operationId } })

        expect(response.body).toBeTruthy()

        // Read the stream
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()

        // Read initial connection message
        const { value: initialValue } = await reader.read()
        const initialMessage = decoder.decode(initialValue)
        expect(initialMessage).toContain('data:')
        expect(initialMessage).toContain('connected')

        // Simulate progress update
        if (progressCallback) {
          progressCallback({
            operationId,
            step: 'validating',
            message: 'Validating repository...',
            percentage: 10,
            timestamp: new Date(),
          })
        }

        // Read progress update
        const { value: progressValue } = await reader.read()
        const progressMessage = decoder.decode(progressValue)
        expect(progressMessage).toContain('data:')
        expect(progressMessage).toContain('validating')
        expect(progressMessage).toContain('Validating repository')

        reader.releaseLock()
      } finally {
        unregisterOrchestrator(operationId)
      }
    })

    it('should handle client disconnect gracefully', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '1', name: 'Test User' },
        accessToken: 'test-token',
        expires: new Date(Date.now() + 3600000).toISOString(),
      } as any)

      const mockOrchestrator = {
        trackProgress: vi.fn(),
        stopTracking: vi.fn(),
      } as unknown as GitHubApplyOrchestrator

      const operationId = 'op_test_789'
      registerOrchestrator(operationId, mockOrchestrator)

      try {
        // Create request with abort controller
        const controller = new AbortController()
        const request = new Request(
          `http://localhost/api/github/apply/progress/${operationId}`,
          { signal: controller.signal }
        )

        const response = await GET(request, { params: { operationId } })
        expect(response.body).toBeTruthy()

        // Simulate client disconnect
        controller.abort()

        // Wait a bit for abort handler to execute
        await new Promise(resolve => setTimeout(resolve, 100))

        // Verify stopTracking was called
        expect(mockOrchestrator.stopTracking).toHaveBeenCalledWith(
          operationId,
          expect.any(Function)
        )
      } finally {
        unregisterOrchestrator(operationId)
      }
    })
  })
})
