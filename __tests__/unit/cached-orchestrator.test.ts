/**
 * Unit Tests for CachedScannerOrchestrator
 * Tests: Cache integration, commit SHA handling, fallback behavior
 * Requirements: 8.1, 8.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CachedScannerOrchestrator } from '@/lib/scanner/services/cached-orchestrator'
import { MemoryCacheService } from '@/lib/scanner/services/cache'
import type { RepositoryContext, AnalysisReport } from '@/lib/scanner/types'

describe('CachedScannerOrchestrator', () => {
  let cache: MemoryCacheService
  let mockOctokit: any
  let orchestrator: CachedScannerOrchestrator

  beforeEach(() => {
    cache = new MemoryCacheService()
    
    // Mock Octokit
    mockOctokit = {
      repos: {
        getBranch: vi.fn()
      }
    }

    orchestrator = new CachedScannerOrchestrator(
      cache,
      mockOctokit,
      [],
      30000,
      10000
    )
  })

  // Helper to create mock context
  const createMockContext = (): RepositoryContext => ({
    owner: 'test-owner',
    repo: 'test-repo',
    files: {
      files: [],
      totalFiles: 0,
      totalSize: 0
    },
    contents: new Map(),
    metadata: {
      owner: 'test-owner',
      name: 'test-repo',
      fullName: 'test-owner/test-repo',
      defaultBranch: 'main',
      language: 'TypeScript',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      pushedAt: new Date('2024-01-15'),
      size: 1000,
      stargazersCount: 10,
      forksCount: 2
    }
  })

  describe('Cache Hit Behavior', () => {
    it('should return cached report when available', async () => {
      const context = createMockContext()
      const commitSha = 'abc123'

      // Mock getBranch to return commit SHA
      mockOctokit.repos.getBranch.mockResolvedValue({
        data: {
          commit: { sha: commitSha }
        }
      })

      // Pre-populate cache
      const cachedReport: AnalysisReport = {
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          analyzedAt: new Date('2024-01-01'),
          commitSha
        },
        languages: {
          detectorName: 'LanguageDetector',
          success: true,
          languages: [],
          primaryLanguage: null
        },
        frameworks: {
          detectorName: 'FrameworkRecognizer',
          success: true,
          frontend: [],
          backend: []
        },
        buildTools: {
          detectorName: 'BuildToolDetector',
          success: true,
          buildTools: []
        },
        dependencies: {
          detectorName: 'DependencyAnalyzer',
          success: true,
          dependencies: [],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 0,
          devCount: 0
        },
        healthScore: {
          total: 75,
          categories: {
            dependencyHealth: { score: 20, maxScore: 25, factors: [] },
            frameworkModernity: { score: 20, maxScore: 25, factors: [] },
            buildHealth: { score: 15, maxScore: 20, factors: [] },
            codeQuality: { score: 10, maxScore: 15, factors: [] },
            documentation: { score: 7, maxScore: 10, factors: [] },
            repositoryActivity: { score: 3, maxScore: 5, factors: [] }
          }
        },
        issues: [],
        recommendations: [],
        metadata: {
          analysisVersion: '1.0.0',
          completionStatus: 'complete',
          errors: []
        }
      }

      await cache.set(`scanner:test-owner:test-repo:${commitSha}`, cachedReport, 600)

      const result = await orchestrator.analyzeRepository(context)

      expect(result.repository.owner).toBe('test-owner')
      expect(result.repository.commitSha).toBe(commitSha)
      expect(mockOctokit.repos.getBranch).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        branch: 'main'
      })
    })

    it('should update analyzedAt timestamp when returning cached result', async () => {
      const context = createMockContext()
      const commitSha = 'abc123'
      const oldDate = new Date('2024-01-01')

      mockOctokit.repos.getBranch.mockResolvedValue({
        data: { commit: { sha: commitSha } }
      })

      const cachedReport: AnalysisReport = {
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          analyzedAt: oldDate,
          commitSha
        },
        languages: {
          detectorName: 'LanguageDetector',
          success: true,
          languages: [],
          primaryLanguage: null
        },
        frameworks: {
          detectorName: 'FrameworkRecognizer',
          success: true,
          frontend: [],
          backend: []
        },
        buildTools: {
          detectorName: 'BuildToolDetector',
          success: true,
          buildTools: []
        },
        dependencies: {
          detectorName: 'DependencyAnalyzer',
          success: true,
          dependencies: [],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 0,
          devCount: 0
        },
        healthScore: {
          total: 75,
          categories: {
            dependencyHealth: { score: 20, maxScore: 25, factors: [] },
            frameworkModernity: { score: 20, maxScore: 25, factors: [] },
            buildHealth: { score: 15, maxScore: 20, factors: [] },
            codeQuality: { score: 10, maxScore: 15, factors: [] },
            documentation: { score: 7, maxScore: 10, factors: [] },
            repositoryActivity: { score: 3, maxScore: 5, factors: [] }
          }
        },
        issues: [],
        recommendations: [],
        metadata: {
          analysisVersion: '1.0.0',
          completionStatus: 'complete',
          errors: []
        }
      }

      await cache.set(`scanner:test-owner:test-repo:${commitSha}`, cachedReport, 600)

      const result = await orchestrator.analyzeRepository(context)

      expect(result.repository.analyzedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    })
  })

  describe('Cache Miss Behavior', () => {
    it('should perform analysis when cache is empty', async () => {
      const context = createMockContext()
      const commitSha = 'abc123'

      mockOctokit.repos.getBranch.mockResolvedValue({
        data: { commit: { sha: commitSha } }
      })

      const result = await orchestrator.analyzeRepository(context)

      expect(result).toBeDefined()
      expect(result.repository.commitSha).toBe(commitSha)
    })

    it('should cache result after analysis', async () => {
      const context = createMockContext()
      const commitSha = 'abc123'

      mockOctokit.repos.getBranch.mockResolvedValue({
        data: { commit: { sha: commitSha } }
      })

      await orchestrator.analyzeRepository(context)

      // Check if result was cached
      const cached = await cache.get(`scanner:test-owner:test-repo:${commitSha}`)
      expect(cached).not.toBeNull()
      expect(cached?.repository.commitSha).toBe(commitSha)
    })
  })

  describe('Commit SHA Change Invalidation', () => {
    it('should not use cache when commit SHA changes', async () => {
      const context = createMockContext()
      const oldSha = 'abc123'
      const newSha = 'def456'

      // First analysis with old SHA
      mockOctokit.repos.getBranch.mockResolvedValueOnce({
        data: { commit: { sha: oldSha } }
      })

      const firstResult = await orchestrator.analyzeRepository(context)
      expect(firstResult.repository.commitSha).toBe(oldSha)

      // Second analysis with new SHA (simulating a new commit)
      mockOctokit.repos.getBranch.mockResolvedValueOnce({
        data: { commit: { sha: newSha } }
      })

      const secondResult = await orchestrator.analyzeRepository(context)
      expect(secondResult.repository.commitSha).toBe(newSha)

      // Both should be cached separately
      const cachedOld = await cache.get(`scanner:test-owner:test-repo:${oldSha}`)
      const cachedNew = await cache.get(`scanner:test-owner:test-repo:${newSha}`)

      expect(cachedOld).not.toBeNull()
      expect(cachedNew).not.toBeNull()
      expect(cachedOld?.repository.commitSha).toBe(oldSha)
      expect(cachedNew?.repository.commitSha).toBe(newSha)
    })
  })

  describe('Error Handling', () => {
    it('should fall back to direct analysis if getBranch fails', async () => {
      const context = createMockContext()

      mockOctokit.repos.getBranch.mockRejectedValue(new Error('API error'))

      const result = await orchestrator.analyzeRepository(context)

      expect(result).toBeDefined()
      expect(result.repository.commitSha).toMatch(/^fallback-\d+$/)
    })

    it('should continue analysis if cache.get fails', async () => {
      const context = createMockContext()
      const commitSha = 'abc123'

      mockOctokit.repos.getBranch.mockResolvedValue({
        data: { commit: { sha: commitSha } }
      })

      // Mock cache.get to throw error
      vi.spyOn(cache, 'get').mockRejectedValue(new Error('Cache error'))

      const result = await orchestrator.analyzeRepository(context)

      expect(result).toBeDefined()
    })

    it('should not fail if cache.set fails', async () => {
      const context = createMockContext()
      const commitSha = 'abc123'

      mockOctokit.repos.getBranch.mockResolvedValue({
        data: { commit: { sha: commitSha } }
      })

      // Mock cache.set to throw error
      vi.spyOn(cache, 'set').mockRejectedValue(new Error('Cache write error'))

      // Should not throw
      await expect(orchestrator.analyzeRepository(context)).resolves.toBeDefined()
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate all cache entries for a repository', async () => {
      const sha1 = 'abc123'
      const sha2 = 'def456'

      const report: AnalysisReport = {
        repository: {
          owner: 'test-owner',
          name: 'test-repo',
          analyzedAt: new Date(),
          commitSha: sha1
        },
        languages: {
          detectorName: 'LanguageDetector',
          success: true,
          languages: [],
          primaryLanguage: null
        },
        frameworks: {
          detectorName: 'FrameworkRecognizer',
          success: true,
          frontend: [],
          backend: []
        },
        buildTools: {
          detectorName: 'BuildToolDetector',
          success: true,
          buildTools: []
        },
        dependencies: {
          detectorName: 'DependencyAnalyzer',
          success: true,
          dependencies: [],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 0,
          devCount: 0
        },
        healthScore: {
          total: 75,
          categories: {
            dependencyHealth: { score: 20, maxScore: 25, factors: [] },
            frameworkModernity: { score: 20, maxScore: 25, factors: [] },
            buildHealth: { score: 15, maxScore: 20, factors: [] },
            codeQuality: { score: 10, maxScore: 15, factors: [] },
            documentation: { score: 7, maxScore: 10, factors: [] },
            repositoryActivity: { score: 3, maxScore: 5, factors: [] }
          }
        },
        issues: [],
        recommendations: [],
        metadata: {
          analysisVersion: '1.0.0',
          completionStatus: 'complete',
          errors: []
        }
      }

      // Cache two different commits
      await cache.set(`scanner:test-owner:test-repo:${sha1}`, report, 600)
      await cache.set(`scanner:test-owner:test-repo:${sha2}`, { ...report, repository: { ...report.repository, commitSha: sha2 } }, 600)

      // Invalidate all
      await orchestrator.invalidateRepositoryCache('test-owner', 'test-repo')

      expect(await cache.get(`scanner:test-owner:test-repo:${sha1}`)).toBeNull()
      expect(await cache.get(`scanner:test-owner:test-repo:${sha2}`)).toBeNull()
    })
  })
})
