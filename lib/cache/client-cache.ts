/**
 * Client-side caching utilities for browser localStorage
 * Provides TTL-based caching with automatic expiration
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

export interface CacheOptions {
  ttl: number // Time to live in milliseconds
  key: string
}

/**
 * Cache manager for client-side data storage
 */
export class ClientCache {
  private static isAvailable(): boolean {
    try {
      const test = '__cache_test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Store data in cache with TTL
   */
  static set<T>(key: string, data: T, ttlMs: number): void {
    if (!this.isAvailable()) return

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    }

    try {
      localStorage.setItem(key, JSON.stringify(entry))
    } catch (error) {
      console.warn('Failed to cache data:', error)
      // If storage is full, clear expired entries and retry
      this.clearExpired()
      try {
        localStorage.setItem(key, JSON.stringify(entry))
      } catch {
        // Still failed, ignore silently
      }
    }
  }

  /**
   * Retrieve data from cache if not expired
   */
  static get<T>(key: string): T | null {
    if (!this.isAvailable()) return null

    try {
      const item = localStorage.getItem(key)
      if (!item) return null

      const entry: CacheEntry<T> = JSON.parse(item)

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.remove(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.warn('Failed to retrieve cached data:', error)
      return null
    }
  }

  /**
   * Remove specific cache entry
   */
  static remove(key: string): void {
    if (!this.isAvailable()) return

    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove cache entry:', error)
    }
  }

  /**
   * Clear all expired cache entries
   */
  static clearExpired(): void {
    if (!this.isAvailable()) return

    try {
      const keys = Object.keys(localStorage)
      const now = Date.now()

      keys.forEach((key) => {
        try {
          const item = localStorage.getItem(key)
          if (!item) return

          const entry: CacheEntry<unknown> = JSON.parse(item)
          if (entry.expiresAt && now > entry.expiresAt) {
            localStorage.removeItem(key)
          }
        } catch {
          // Invalid entry, skip
        }
      })
    } catch (error) {
      console.warn('Failed to clear expired cache:', error)
    }
  }

  /**
   * Clear all cache entries matching a pattern
   */
  static clearPattern(pattern: string): void {
    if (!this.isAvailable()) return

    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear cache pattern:', error)
    }
  }

  /**
   * Clear all cache entries
   */
  static clearAll(): void {
    if (!this.isAvailable()) return

    try {
      localStorage.clear()
    } catch (error) {
      console.warn('Failed to clear all cache:', error)
    }
  }
}

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  scanResults: (owner: string, repo: string) => `scan:${owner}:${repo}`,
  repositoryMeta: (owner: string, repo: string) => `repo:${owner}:${repo}`,
  migrationPlan: (owner: string, repo: string) => `plan:${owner}:${repo}`,
}

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  SCAN_RESULTS: 5 * 60 * 1000, // 5 minutes
  REPOSITORY_META: 10 * 60 * 1000, // 10 minutes
  MIGRATION_PLAN: 15 * 60 * 1000, // 15 minutes
}
