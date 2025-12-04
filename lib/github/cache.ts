/**
 * GitHub API Response Caching
 * Provides caching utilities for GitHub API responses with appropriate TTLs
 */

// Cache TTL constants (in seconds)
export const CacheTTL = {
  REPOSITORY_METADATA: 300, // 5 minutes
  REPO_METADATA: 300, // 5 minutes (alias)
  FILE_CONTENTS: 600, // 10 minutes
  FILE_TREE: 300, // 5 minutes
  USER_PROFILE: 900, // 15 minutes
  REPOSITORY_LIST: 180, // 3 minutes
  COMMIT_HISTORY: 1800, // 30 minutes
  BRANCH_INFO: 300, // 5 minutes
} as const

// Cache key generators
export const CacheKeys = {
  repo: (owner: string, repo: string) => `gh:repo:${owner}:${repo}`,
  repoContent: (owner: string, repo: string, path: string) => 
    `gh:content:${owner}:${repo}:${path}`,
  repoTree: (owner: string, repo: string, ref: string) =>
    `gh:tree:${owner}:${repo}:${ref}`,
  userRepos: (username: string) => `gh:user:${username}:repos`,
  commits: (owner: string, repo: string, branch: string) => 
    `gh:commits:${owner}:${repo}:${branch}`,
  rateLimit: () => 'gh:ratelimit',
  branch: (owner: string, repo: string, branch: string) =>
    `gh:branch:${owner}:${repo}:${branch}`,
} as const

// In-memory cache for development (in production, use Redis)
const cache = new Map<string, { data: any; expires: number }>()

/**
 * Cached GitHub request wrapper
 */
export async function cachedGitHubRequest<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  
  // Check cache first
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > now) {
    console.log(`[GitHub Cache] Hit: ${cacheKey}`)
    return cached.data
  }
  
  // Fetch fresh data
  console.log(`[GitHub Cache] Miss: ${cacheKey}`)
  const data = await fetchFn()
  
  // Store in cache
  cache.set(cacheKey, {
    data,
    expires: now + (ttlSeconds * 1000)
  })
  
  return data
}

/**
 * Clear cache entries matching a pattern
 */
export function clearCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    console.log('[GitHub Cache] Cleared all entries')
    return
  }
  
  const regex = new RegExp(pattern)
  let cleared = 0
  
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key)
      cleared++
    }
  }
  
  console.log(`[GitHub Cache] Cleared ${cleared} entries matching pattern: ${pattern}`)
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now()
  let active = 0
  let expired = 0
  
  for (const entry of cache.values()) {
    if (entry.expires > now) {
      active++
    } else {
      expired++
    }
  }
  
  return {
    total: cache.size,
    active,
    expired
  }
}

/**
 * Clean up expired cache entries
 */
export function cleanupExpiredCache(): void {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, entry] of cache.entries()) {
    if (entry.expires <= now) {
      cache.delete(key)
      cleaned++
    }
  }
  
  if (cleaned > 0) {
    console.log(`[GitHub Cache] Cleaned up ${cleaned} expired entries`)
  }
}

// Auto-cleanup expired entries every 5 minutes
if (typeof window === 'undefined') { // Only in Node.js environment
  setInterval(cleanupExpiredCache, 5 * 60 * 1000)
}