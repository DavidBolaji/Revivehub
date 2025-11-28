/**
 * Redis caching layer for server-side caching
 * Used for GitHub API responses, parsed ASTs, and migration specs
 * Falls back to in-memory cache if Redis is not available
 */

import { Redis } from '@upstash/redis'

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

/**
 * Redis cache configuration
 */
interface RedisCacheConfig {
  url?: string
  token?: string
  defaultTTL?: number // Default TTL in seconds
}

/**
 * In-memory cache fallback
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    }
    this.cache.set(key, entry)
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.cache.clear()
  }
}

/**
 * Redis cache manager with fallback to in-memory cache
 */
export class RedisCache {
  private redis: Redis | null = null
  private memoryCache: MemoryCache
  private defaultTTL: number

  constructor(config?: RedisCacheConfig) {
    this.defaultTTL = config?.defaultTTL || 300 // 5 minutes default
    this.memoryCache = new MemoryCache()

    // Initialize Redis if credentials are provided
    if (config?.url && config?.token) {
      try {
        this.redis = new Redis({
          url: config.url,
          token: config.token,
        })
      } catch (error) {
        console.warn('Failed to initialize Redis, using in-memory cache:', error)
        this.redis = null
      }
    } else if (
      process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      try {
        this.redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
      } catch (error) {
        console.warn('Failed to initialize Redis from env, using in-memory cache:', error)
        this.redis = null
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const value = await this.redis.get<T>(key)
        return value
      }
      return await this.memoryCache.get<T>(key)
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error)
      return null
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds || this.defaultTTL

    try {
      if (this.redis) {
        await this.redis.setex(key, ttl, JSON.stringify(value))
      } else {
        await this.memoryCache.set(key, value, ttl)
      }
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error)
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key)
      } else {
        await this.memoryCache.del(key)
      }
    } catch (error) {
      console.warn(`Cache delete error for key ${key}:`, error)
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        const result = await this.redis.exists(key)
        return result === 1
      }
      return await this.memoryCache.exists(key)
    } catch (error) {
      console.warn(`Cache exists error for key ${key}:`, error)
      return false
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        // Note: flushdb is dangerous in production, use pattern-based deletion instead
        console.warn('Redis clear() called - this will clear all keys')
      }
      await this.memoryCache.clear()
    } catch (error) {
      console.warn('Cache clear error:', error)
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        // Redis pattern matching with SCAN
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } else {
        // Memory cache doesn't support patterns efficiently
        console.warn('Pattern deletion not fully supported in memory cache')
      }
    } catch (error) {
      console.warn(`Cache deletePattern error for pattern ${pattern}:`, error)
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const data = await fetchFn()

    // Store in cache
    await this.set(key, data, ttlSeconds)

    return data
  }

  /**
   * Check if Redis is available
   */
  isRedisAvailable(): boolean {
    return this.redis !== null
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.memoryCache.destroy()
  }
}

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  // GitHub API responses
  githubRepo: (owner: string, repo: string) => `gh:repo:${owner}:${repo}`,
  githubRepoContent: (owner: string, repo: string, path: string) =>
    `gh:content:${owner}:${repo}:${path}`,
  githubFileTree: (owner: string, repo: string, branch: string) =>
    `gh:tree:${owner}:${repo}:${branch}`,
  githubUserRepos: (username: string) => `gh:user:${username}:repos`,
  githubCommits: (owner: string, repo: string, branch: string) =>
    `gh:commits:${owner}:${repo}:${branch}`,

  // Parsed ASTs
  ast: (filePath: string, contentHash: string) =>
    `ast:${filePath}:${contentHash}`,

  // Migration specs
  migrationSpec: (sourceFramework: string, targetFramework: string) =>
    `spec:${sourceFramework}:${targetFramework}`,

  // Framework rules
  frameworkRules: (framework: string, version: string) =>
    `rules:${framework}:${version}`,

  // Transformation results
  transformResult: (filePath: string, contentHash: string) =>
    `transform:${filePath}:${contentHash}`,

  // Violation reports
  violationReport: (owner: string, repo: string, fromVersion: string, toVersion: string) =>
    `violations:${owner}:${repo}:${fromVersion}:${toVersion}`,
}

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  // GitHub API responses
  GITHUB_REPO: 300, // 5 minutes
  GITHUB_CONTENT: 600, // 10 minutes
  GITHUB_FILE_TREE: 600, // 10 minutes
  GITHUB_USER_REPOS: 180, // 3 minutes
  GITHUB_COMMITS: 1800, // 30 minutes

  // Parsed ASTs
  AST: 3600, // 1 hour

  // Migration specs
  MIGRATION_SPEC: 86400, // 24 hours

  // Framework rules
  FRAMEWORK_RULES: 86400, // 24 hours

  // Transformation results
  TRANSFORM_RESULT: 1800, // 30 minutes

  // Violation reports
  VIOLATION_REPORT: 600, // 10 minutes
}

/**
 * Singleton instance for global use
 */
let globalCache: RedisCache | null = null

/**
 * Get or create global cache instance
 */
export function getCache(): RedisCache {
  if (!globalCache) {
    globalCache = new RedisCache()
  }
  return globalCache
}

/**
 * Helper function for cached GitHub API requests
 */
export async function cachedGitHubRequest<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cache = getCache()
  return cache.getOrSet(cacheKey, fetchFn, ttlSeconds)
}
