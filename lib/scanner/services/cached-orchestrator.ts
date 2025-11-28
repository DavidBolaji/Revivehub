import type { Octokit } from '@octokit/rest'
import type { AnalysisReport, RepositoryContext, Detector } from '../types'
import { ScannerOrchestrator } from './orchestrator'
import type { CacheService } from './cache'
import { generateScannerCacheKey, getScannerCacheTTL } from './cache'

/**
 * CachedScannerOrchestrator extends ScannerOrchestrator with caching behavior
 * Caches analysis results based on repository commit SHA
 */
export class CachedScannerOrchestrator extends ScannerOrchestrator {
  constructor(
    private cache: CacheService,
    private octokit: Octokit,
    detectors: Detector[] = [],
    overallTimeoutMs: number = 30000,
    detectorTimeoutMs: number = 10000
  ) {
    super(detectors, overallTimeoutMs, detectorTimeoutMs)
  }

  /**
   * Analyze a repository with caching
   * Checks cache before running analysis and stores results after completion
   */
  async analyzeRepository(context: RepositoryContext): Promise<AnalysisReport> {
    try {
      // Get latest commit SHA for cache key
      const commitSha = await this.getLatestCommitSha(
        context.owner,
        context.repo,
        context.metadata.defaultBranch
      )

      // Generate cache key
      const cacheKey = generateScannerCacheKey(context.owner, context.repo, commitSha)

      // Check cache
      const cached = await this.cache.get(cacheKey)
      if (cached) {
        // Return cached result with updated analyzedAt timestamp
        return {
          ...cached,
          repository: {
            ...cached.repository,
            analyzedAt: new Date() // Update to show when cache was retrieved
          }
        }
      }

      // Cache miss - perform analysis
      const report = await super.analyzeRepository(context)

      // Add commit SHA to report
      const reportWithSha: AnalysisReport = {
        ...report,
        repository: {
          ...report.repository,
          commitSha
        }
      }

      // Store in cache (don't await - fire and forget)
      const cacheTTL = getScannerCacheTTL()
      this.cache.set(cacheKey, reportWithSha, cacheTTL).catch(error => {
        console.error('Failed to cache analysis result:', error)
      })

      return reportWithSha

    } catch (error) {
      // If cache operations fail, fall back to direct analysis
      console.error('Cache error, falling back to direct analysis:', error)
      return super.analyzeRepository(context)
    }
  }

  /**
   * Get the latest commit SHA for a repository branch
   */
  private async getLatestCommitSha(
    owner: string,
    repo: string,
    branch: string
  ): Promise<string> {
    try {
      const { data } = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch
      })

      return data.commit.sha
    } catch (error) {
      // If we can't get the commit SHA, use a timestamp-based fallback
      // This ensures caching still works but with shorter effective TTL
      console.warn('Failed to fetch commit SHA, using timestamp fallback:', error)
      return `fallback-${Date.now()}`
    }
  }

  /**
   * Invalidate cache for a specific repository
   * Useful when repository is updated
   */
  async invalidateRepositoryCache(owner: string, repo: string): Promise<void> {
    const pattern = `scanner:${owner}:${repo}:*`
    await this.cache.invalidate(pattern)
  }
}
