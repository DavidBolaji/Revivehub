/**
 * Scanner API Endpoint Integration Tests
 * Tests the /api/scan/[owner]/[repo] endpoint
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/scan/[owner]/[repo]/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/github/octokit', () => ({
  createOctokit: vi.fn(),
  checkRateLimit: vi.fn(),
}))

vi.mock('@/lib/scanner', () => ({
  CachedScannerOrchestrator: vi.fn(),
  LanguageDetector: vi.fn(),
  FrameworkRecognizer: vi.fn(),
  BuildToolDetector: vi.fn(),
  DependencyAnalyzer: vi.fn(),
  RepositoryFetcher: vi.fn(),
  createCacheService: vi.fn(),
}))

import { auth } from '@/auth'
import { createOctokit, checkRateLimit } from '@/lib/github/octokit'
import {
  CachedScannerOrchestrator,
  RepositoryFetcher,
  createCacheService,
} from '@/lib/scanner'
import { GitHubAPIError } from '@/lib/github/errors'

describe('Scanner API Endpoint', () => {
  const mockOwner = 'testowner'
  const mockRepo = 'testrepo'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Mock no session
      vi.mocked(auth).mockResolvedValue(null as any)

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized. Please sign in to analyze repositories.')
    })

    it('should return 401 when session has no access token', async () => {
      // Mock session without access token
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123', name: 'Test User' },
      } as any)

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized. Please sign in to analyze repositories.')
    })
  })

  describe('Parameter Validation', () => {
    it('should return 400 when owner is missing', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const request = new NextRequest(
        'http://localhost:3000/api/scan//testrepo'
      )
      const params = { params: { owner: '', repo: 'testrepo' } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters: owner and repo')
    })

    it('should return 400 when repo is missing', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const request = new NextRequest(
        'http://localhost:3000/api/scan/testowner/'
      )
      const params = { params: { owner: 'testowner', repo: '' } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required parameters: owner and repo')
    })
  })

  describe('Rate Limit Handling', () => {
    it('should return 429 when rate limit is too low', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const mockOctokit = {}
      vi.mocked(createOctokit).mockReturnValue(mockOctokit as any)

      const resetDate = new Date(Date.now() + 3600000)
      vi.mocked(checkRateLimit).mockResolvedValue({
        core: {
          limit: 5000,
          remaining: 10, // Below threshold of 20
          reset: resetDate,
          used: 4990,
        },
        search: {
          limit: 30,
          remaining: 30,
          reset: resetDate,
          used: 0,
        },
        graphql: {
          limit: 5000,
          remaining: 5000,
          reset: resetDate,
          used: 0,
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit too low for analysis')
      expect(data.rateLimit).toBeDefined()
      expect(data.rateLimit.remaining).toBe(10)
    })
  })

  describe('Successful Analysis', () => {
    it('should return analysis report on success', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const mockOctokit = {}
      vi.mocked(createOctokit).mockReturnValue(mockOctokit as any)

      const resetDate = new Date(Date.now() + 3600000)
      vi.mocked(checkRateLimit).mockResolvedValue({
        core: {
          limit: 5000,
          remaining: 4500,
          reset: resetDate,
          used: 500,
        },
        search: {
          limit: 30,
          remaining: 30,
          reset: resetDate,
          used: 0,
        },
        graphql: {
          limit: 5000,
          remaining: 5000,
          reset: resetDate,
          used: 0,
        },
      })

      const mockContext = {
        owner: mockOwner,
        repo: mockRepo,
        files: { files: [], totalFiles: 0, totalSize: 0 },
        contents: new Map(),
        metadata: {
          owner: mockOwner,
          name: mockRepo,
          fullName: `${mockOwner}/${mockRepo}`,
          defaultBranch: 'main',
          language: 'TypeScript',
          createdAt: new Date(),
          updatedAt: new Date(),
          pushedAt: new Date(),
          size: 1000,
          stargazersCount: 10,
          forksCount: 2,
        },
      }

      const mockReport = {
        repository: {
          owner: mockOwner,
          name: mockRepo,
          analyzedAt: new Date(),
          commitSha: 'abc123',
        },
        languages: {
          languages: [
            {
              name: 'TypeScript',
              confidence: 95,
              fileCount: 10,
              linesOfCode: 1000,
              configFiles: ['tsconfig.json'],
            },
          ],
          primaryLanguage: {
            name: 'TypeScript',
            confidence: 95,
            fileCount: 10,
            linesOfCode: 1000,
            configFiles: ['tsconfig.json'],
          },
        },
        frameworks: {
          frontend: [],
          backend: [],
        },
        buildTools: {
          buildTools: [],
        },
        dependencies: {
          dependencies: [],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 0,
          devCount: 0,
        },
        healthScore: {
          total: 75,
          categories: {
            dependencyHealth: { score: 20, maxScore: 25, factors: [] },
            frameworkModernity: { score: 20, maxScore: 25, factors: [] },
            buildHealth: { score: 15, maxScore: 20, factors: [] },
            codeQuality: { score: 12, maxScore: 15, factors: [] },
            documentation: { score: 8, maxScore: 10, factors: [] },
            repositoryActivity: { score: 0, maxScore: 5, factors: [] },
          },
        },
        issues: [],
        recommendations: [],
        metadata: {
          analysisVersion: '1.0.0',
          completionStatus: 'complete',
          errors: [],
        },
      }

      const mockCacheService = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        invalidate: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(createCacheService).mockReturnValue(mockCacheService)

      const mockFetcher = {
        fetchRepositoryContext: vi.fn().mockResolvedValue(mockContext),
      }
      vi.mocked(RepositoryFetcher).mockImplementation(() => mockFetcher as any)

      const mockScanner = {
        analyzeRepository: vi.fn().mockResolvedValue(mockReport),
      }
      vi.mocked(CachedScannerOrchestrator).mockImplementation(() => mockScanner as any)

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.repository.owner).toBe(mockOwner)
      expect(data.data.repository.name).toBe(mockRepo)
      expect(data.rateLimit).toBeDefined()
    })
  })

  describe('GitHub API Error Handling', () => {
    it('should handle repository not found error', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const mockOctokit = {}
      vi.mocked(createOctokit).mockReturnValue(mockOctokit as any)

      const resetDate = new Date(Date.now() + 3600000)
      vi.mocked(checkRateLimit).mockResolvedValue({
        core: {
          limit: 5000,
          remaining: 4500,
          reset: resetDate,
          used: 500,
        },
        search: {
          limit: 30,
          remaining: 30,
          reset: resetDate,
          used: 0,
        },
        graphql: {
          limit: 5000,
          remaining: 5000,
          reset: resetDate,
          used: 0,
        },
      })

      const mockCacheService = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        invalidate: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(createCacheService).mockReturnValue(mockCacheService)

      const mockFetcher = {
        fetchRepositoryContext: vi.fn().mockRejectedValue(
          new GitHubAPIError('Repository not found', 404)
        ),
      }
      vi.mocked(RepositoryFetcher).mockImplementation(() => mockFetcher as any)

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBeDefined()
      expect(data.statusCode).toBe(404)
    })

    it('should handle rate limit exceeded error', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const mockOctokit = {}
      vi.mocked(createOctokit).mockReturnValue(mockOctokit as any)

      const resetDate = new Date(Date.now() + 3600000)
      const rateLimitError = new GitHubAPIError(
        'GitHub API rate limit exceeded',
        403,
        {
          limit: 5000,
          remaining: 0,
          reset: resetDate,
        }
      )

      vi.mocked(checkRateLimit).mockRejectedValue(rateLimitError)

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBeDefined()
      expect(data.rateLimit).toBeDefined()
    })
  })

  describe('Scanner Error Handling', () => {
    it('should handle timeout errors', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const mockOctokit = {}
      vi.mocked(createOctokit).mockReturnValue(mockOctokit as any)

      const resetDate = new Date(Date.now() + 3600000)
      vi.mocked(checkRateLimit).mockResolvedValue({
        core: {
          limit: 5000,
          remaining: 4500,
          reset: resetDate,
          used: 500,
        },
        search: {
          limit: 30,
          remaining: 30,
          reset: resetDate,
          used: 0,
        },
        graphql: {
          limit: 5000,
          remaining: 5000,
          reset: resetDate,
          used: 0,
        },
      })

      const mockCacheService = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        invalidate: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(createCacheService).mockReturnValue(mockCacheService)

      const mockContext = {
        owner: mockOwner,
        repo: mockRepo,
        files: { files: [], totalFiles: 0, totalSize: 0 },
        contents: new Map(),
        metadata: {},
      }

      const mockFetcher = {
        fetchRepositoryContext: vi.fn().mockResolvedValue(mockContext),
      }
      vi.mocked(RepositoryFetcher).mockImplementation(() => mockFetcher as any)

      const mockScanner = {
        analyzeRepository: vi.fn().mockRejectedValue(
          new Error('Analysis timeout: operation timed out after 30 seconds')
        ),
      }
      vi.mocked(CachedScannerOrchestrator).mockImplementation(() => mockScanner as any)

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(504)
      expect(data.error).toBe('Analysis timeout')
      expect(data.message).toContain('took too long')
    })

    it('should handle generic scanner errors', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: '123' },
        accessToken: 'test_token',
      } as any)

      const mockOctokit = {}
      vi.mocked(createOctokit).mockReturnValue(mockOctokit as any)

      const resetDate = new Date(Date.now() + 3600000)
      vi.mocked(checkRateLimit).mockResolvedValue({
        core: {
          limit: 5000,
          remaining: 4500,
          reset: resetDate,
          used: 500,
        },
        search: {
          limit: 30,
          remaining: 30,
          reset: resetDate,
          used: 0,
        },
        graphql: {
          limit: 5000,
          remaining: 5000,
          reset: resetDate,
          used: 0,
        },
      })

      const mockCacheService = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        invalidate: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(createCacheService).mockReturnValue(mockCacheService)

      const mockContext = {
        owner: mockOwner,
        repo: mockRepo,
        files: { files: [], totalFiles: 0, totalSize: 0 },
        contents: new Map(),
        metadata: {},
      }

      const mockFetcher = {
        fetchRepositoryContext: vi.fn().mockResolvedValue(mockContext),
      }
      vi.mocked(RepositoryFetcher).mockImplementation(() => mockFetcher as any)

      const mockScanner = {
        analyzeRepository: vi.fn().mockRejectedValue(
          new Error('Failed to parse package.json')
        ),
      }
      vi.mocked(CachedScannerOrchestrator).mockImplementation(() => mockScanner as any)

      const request = new NextRequest(
        `http://localhost:3000/api/scan/${mockOwner}/${mockRepo}`
      )
      const params = { params: { owner: mockOwner, repo: mockRepo } }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Analysis failed')
      expect(data.message).toBe('Failed to parse package.json')
    })
  })
})
