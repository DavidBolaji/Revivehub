/**
 * Cache service for scanner analysis results
 * Supports both in-memory caching (development) and Redis (production)
 */

import type { AnalysisReport } from '../types'
import { getScannerConfig } from '../config'

/**
 * Cache service interface for storing and retrieving analysis reports
 */
export interface CacheService {
  /**
   * Retrieve a cached analysis report
   * @param key Cache key
   * @returns Cached report or null if not found/expired
   */
  get(key: string): Promise<AnalysisReport | null>

  /**
   * Store an analysis report in cache with TTL
   * @param key Cache key
   * @param value Analysis report to cache
   * @param ttl Time to live in seconds
   */
  set(key: string, value: AnalysisReport, ttl: number): Promise<void>

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern Pattern to match (e.g., "scanner:owner:*")
   */
  invalidate(pattern: string): Promise<void>
}

/**
 * In-memory cache implementation for development/testing
 */
export class MemoryCacheService implements CacheService {
  private cache = new Map<string, { data: AnalysisReport; expires: number }>()

  async get(key: string): Promise<AnalysisReport | null> {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  async set(key: string, value: AnalysisReport, ttl: number): Promise<void> {
    const expires = Date.now() + ttl * 1000
    this.cache.set(key, { data: value, expires })
  }

  async invalidate(pattern: string): Promise<void> {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    const regex = new RegExp(`^${regexPattern}$`)

    // Delete all matching keys
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries (useful for testing)
   */
  async clear(): Promise<void> {
    this.cache.clear()
  }
}

/**
 * Redis cache implementation for production
 * Requires @upstash/redis package
 */
export class RedisCacheService implements CacheService {
  private redis: any

  constructor(redisUrl: string, redisToken: string) {
    // Lazy load Redis to avoid requiring it in development
    try {
      const { Redis } = require('@upstash/redis')
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      })
    } catch (error) {
      throw new Error(
        'Redis package not installed. Run: pnpm add @upstash/redis'
      )
    }
  }

  async get(key: string): Promise<AnalysisReport | null> {
    try {
      const data = await this.redis.get(key)
      if (!data) return null

      // Parse JSON if it's a string
      if (typeof data === 'string') {
        return JSON.parse(data) as AnalysisReport
      }

      return data as AnalysisReport
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  async set(key: string, value: AnalysisReport, ttl: number): Promise<void> {
    try {
      // Serialize dates properly
      const serialized = JSON.stringify(value)
      await this.redis.setex(key, ttl, serialized)
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
      // Don't throw - cache failures should not break the application
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      // Use Redis SCAN to find matching keys
      const keys = await this.scanKeys(pattern)
      
      if (keys.length > 0) {
        await this.redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache invalidate error for pattern ${pattern}:`, error)
      // Don't throw - cache failures should not break the application
    }
  }

  /**
   * Scan for keys matching a pattern
   * Uses SCAN command for efficient iteration
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = []
    let cursor = 0

    do {
      try {
        const result = await this.redis.scan(cursor, {
          match: pattern,
          count: 100,
        })
        
        cursor = result[0]
        keys.push(...result[1])
      } catch (error) {
        console.error('Error scanning keys:', error)
        break
      }
    } while (cursor !== 0)

    return keys
  }
}

/**
 * Create a cache service based on environment configuration
 */
export function createCacheService(): CacheService {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  // Use Redis if configured, otherwise fall back to memory cache
  if (redisUrl && redisToken) {
    try {
      return new RedisCacheService(redisUrl, redisToken)
    } catch (error) {
      console.warn('Failed to initialize Redis cache, falling back to memory cache:', error)
      return new MemoryCacheService()
    }
  }

  return new MemoryCacheService()
}

/**
 * Generate cache key for scanner analysis
 * Format: scanner:${owner}:${repo}:${commitSha}
 */
export function generateScannerCacheKey(
  owner: string,
  repo: string,
  commitSha: string
): string {
  return `scanner:${owner}:${repo}:${commitSha}`
}

/**
 * Get cache TTL for scanner analysis results from configuration
 */
export function getScannerCacheTTL(): number {
  const config = getScannerConfig()
  return config.cacheTTLSeconds
}
