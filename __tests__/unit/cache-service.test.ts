/**
 * Unit Tests for CacheService
 * Tests: Cache hit/miss, invalidation, TTL expiration, error handling
 * Requirements: 8.1, 8.2
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  MemoryCacheService,
  generateScannerCacheKey,
  getScannerCacheTTL
} from '@/lib/scanner/services/cache'
import type { AnalysisReport } from '@/lib/scanner/types'

describe('CacheService', () => {
  describe('MemoryCacheService', () => {
    let cache: MemoryCacheService

    beforeEach(() => {
      cache = new MemoryCacheService()
    })

    // Helper to create a mock analysis report
    const createMockReport = (owner: string, repo: string): AnalysisReport => ({
      repository: {
        owner,
        name: repo,
        analyzedAt: new Date(),
        commitSha: 'abc123'
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
    })

    describe('Cache Hit Behavior', () => {
      it('should return cached report when key exists', async () => {
        const key = 'scanner:owner:repo:sha123'
        const report = createMockReport('owner', 'repo')

        await cache.set(key, report, 600)
        const result = await cache.get(key)

        expect(result).not.toBeNull()
        expect(result?.repository.owner).toBe('owner')
        expect(result?.repository.name).toBe('repo')
      })

      it('should return exact same data structure', async () => {
        const key = 'scanner:owner:repo:sha123'
        const report = createMockReport('owner', 'repo')

        await cache.set(key, report, 600)
        const result = await cache.get(key)

        expect(result).toEqual(report)
      })

      it('should handle multiple cached reports', async () => {
        const report1 = createMockReport('owner1', 'repo1')
        const report2 = createMockReport('owner2', 'repo2')

        await cache.set('scanner:owner1:repo1:sha1', report1, 600)
        await cache.set('scanner:owner2:repo2:sha2', report2, 600)

        const result1 = await cache.get('scanner:owner1:repo1:sha1')
        const result2 = await cache.get('scanner:owner2:repo2:sha2')

        expect(result1?.repository.owner).toBe('owner1')
        expect(result2?.repository.owner).toBe('owner2')
      })
    })

    describe('Cache Miss Behavior', () => {
      it('should return null for non-existent key', async () => {
        const result = await cache.get('scanner:nonexistent:repo:sha')
        expect(result).toBeNull()
      })

      it('should return null after TTL expires', async () => {
        const key = 'scanner:owner:repo:sha123'
        const report = createMockReport('owner', 'repo')

        // Set with 1 second TTL
        await cache.set(key, report, 1)

        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 1100))

        const result = await cache.get(key)
        expect(result).toBeNull()
      })

      it('should not return expired cache even if key exists', async () => {
        const key = 'scanner:owner:repo:sha123'
        const report = createMockReport('owner', 'repo')

        await cache.set(key, report, 0) // Immediate expiration
        
        // Small delay to ensure expiration
        await new Promise(resolve => setTimeout(resolve, 10))

        const result = await cache.get(key)
        expect(result).toBeNull()
      })
    })

    describe('Cache Invalidation', () => {
      it('should invalidate cache entries matching pattern with wildcard', async () => {
        const report1 = createMockReport('owner', 'repo1')
        const report2 = createMockReport('owner', 'repo2')
        const report3 = createMockReport('other', 'repo3')

        await cache.set('scanner:owner:repo1:sha1', report1, 600)
        await cache.set('scanner:owner:repo2:sha2', report2, 600)
        await cache.set('scanner:other:repo3:sha3', report3, 600)

        // Invalidate all entries for 'owner'
        await cache.invalidate('scanner:owner:*')

        expect(await cache.get('scanner:owner:repo1:sha1')).toBeNull()
        expect(await cache.get('scanner:owner:repo2:sha2')).toBeNull()
        expect(await cache.get('scanner:other:repo3:sha3')).not.toBeNull()
      })

      it('should invalidate specific repository across all commits', async () => {
        const report1 = createMockReport('owner', 'repo')
        const report2 = createMockReport('owner', 'repo')

        await cache.set('scanner:owner:repo:sha1', report1, 600)
        await cache.set('scanner:owner:repo:sha2', report2, 600)

        await cache.invalidate('scanner:owner:repo:*')

        expect(await cache.get('scanner:owner:repo:sha1')).toBeNull()
        expect(await cache.get('scanner:owner:repo:sha2')).toBeNull()
      })

      it('should handle invalidation with no matches', async () => {
        const report = createMockReport('owner', 'repo')
        await cache.set('scanner:owner:repo:sha1', report, 600)

        // Should not throw error
        await expect(cache.invalidate('scanner:nonexistent:*')).resolves.not.toThrow()

        // Original entry should still exist
        expect(await cache.get('scanner:owner:repo:sha1')).not.toBeNull()
      })

      it('should support complex patterns', async () => {
        const report1 = createMockReport('owner', 'repo')
        const report2 = createMockReport('owner', 'other-repo')

        await cache.set('scanner:owner:repo:sha1', report1, 600)
        await cache.set('scanner:owner:other-repo:sha2', report2, 600)

        await cache.invalidate('scanner:owner:repo:*')

        expect(await cache.get('scanner:owner:repo:sha1')).toBeNull()
        expect(await cache.get('scanner:owner:other-repo:sha2')).not.toBeNull()
      })
    })

    describe('Cache Key Generation', () => {
      it('should generate correct cache key format', () => {
        const key = generateScannerCacheKey('owner', 'repo', 'abc123')
        expect(key).toBe('scanner:owner:repo:abc123')
      })

      it('should handle special characters in owner/repo names', () => {
        const key = generateScannerCacheKey('my-org', 'my-repo', 'sha456')
        expect(key).toBe('scanner:my-org:my-repo:sha456')
      })

      it('should generate unique keys for different commits', () => {
        const key1 = generateScannerCacheKey('owner', 'repo', 'sha1')
        const key2 = generateScannerCacheKey('owner', 'repo', 'sha2')
        
        expect(key1).not.toBe(key2)
        expect(key1).toBe('scanner:owner:repo:sha1')
        expect(key2).toBe('scanner:owner:repo:sha2')
      })
    })

    describe('TTL Configuration', () => {
      it('should use correct default TTL', () => {
        expect(getScannerCacheTTL()).toBe(600) // 10 minutes
      })

      it('should respect custom TTL values', async () => {
        const key = 'scanner:owner:repo:sha123'
        const report = createMockReport('owner', 'repo')

        // Set with custom TTL
        await cache.set(key, report, 300) // 5 minutes

        const result = await cache.get(key)
        expect(result).not.toBeNull()
      })
    })

    describe('Clear Cache', () => {
      it('should clear all cache entries', async () => {
        const report1 = createMockReport('owner1', 'repo1')
        const report2 = createMockReport('owner2', 'repo2')

        await cache.set('scanner:owner1:repo1:sha1', report1, 600)
        await cache.set('scanner:owner2:repo2:sha2', report2, 600)

        await cache.clear()

        expect(await cache.get('scanner:owner1:repo1:sha1')).toBeNull()
        expect(await cache.get('scanner:owner2:repo2:sha2')).toBeNull()
      })
    })
  })
})
