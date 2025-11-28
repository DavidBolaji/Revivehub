/**
 * Caching utilities for transformation-related data
 * Caches parsed ASTs, migration specs, and transformation results
 */

import { createHash } from 'crypto'
import { getCache, CacheKeys, CacheTTL } from './redis-cache'
import type { MigrationSpecification } from '@/types/migration'

/**
 * Generate content hash for cache key
 */
export function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex').substring(0, 16)
}

/**
 * Cache parsed AST
 */
export async function cacheAST(
  filePath: string,
  content: string,
  ast: any
): Promise<void> {
  const cache = getCache()
  const contentHash = generateContentHash(content)
  const key = CacheKeys.ast(filePath, contentHash)
  await cache.set(key, ast, CacheTTL.AST)
}

/**
 * Get cached AST
 */
export async function getCachedAST(
  filePath: string,
  content: string
): Promise<any | null> {
  const cache = getCache()
  const contentHash = generateContentHash(content)
  const key = CacheKeys.ast(filePath, contentHash)
  return cache.get(key)
}

/**
 * Cache migration specification
 */
export async function cacheMigrationSpec(
  sourceFramework: string,
  targetFramework: string,
  spec: MigrationSpecification
): Promise<void> {
  const cache = getCache()
  const key = CacheKeys.migrationSpec(sourceFramework, targetFramework)
  await cache.set(key, spec, CacheTTL.MIGRATION_SPEC)
}

/**
 * Get cached migration specification
 */
export async function getCachedMigrationSpec(
  sourceFramework: string,
  targetFramework: string
): Promise<MigrationSpecification | null> {
  const cache = getCache()
  const key = CacheKeys.migrationSpec(sourceFramework, targetFramework)
  return cache.get<MigrationSpecification>(key)
}

/**
 * Cache framework rules
 */
export async function cacheFrameworkRules(
  framework: string,
  version: string,
  rules: any
): Promise<void> {
  const cache = getCache()
  const key = CacheKeys.frameworkRules(framework, version)
  await cache.set(key, rules, CacheTTL.FRAMEWORK_RULES)
}

/**
 * Get cached framework rules
 */
export async function getCachedFrameworkRules(
  framework: string,
  version: string
): Promise<any | null> {
  const cache = getCache()
  const key = CacheKeys.frameworkRules(framework, version)
  return cache.get(key)
}

/**
 * Cache transformation result
 */
export async function cacheTransformResult(
  filePath: string,
  content: string,
  result: any
): Promise<void> {
  const cache = getCache()
  const contentHash = generateContentHash(content)
  const key = CacheKeys.transformResult(filePath, contentHash)
  await cache.set(key, result, CacheTTL.TRANSFORM_RESULT)
}

/**
 * Get cached transformation result
 */
export async function getCachedTransformResult(
  filePath: string,
  content: string
): Promise<any | null> {
  const cache = getCache()
  const contentHash = generateContentHash(content)
  const key = CacheKeys.transformResult(filePath, contentHash)
  return cache.get(key)
}

/**
 * Cache violation report
 */
export async function cacheViolationReport(
  owner: string,
  repo: string,
  fromVersion: string,
  toVersion: string,
  report: any
): Promise<void> {
  const cache = getCache()
  const key = CacheKeys.violationReport(owner, repo, fromVersion, toVersion)
  await cache.set(key, report, CacheTTL.VIOLATION_REPORT)
}

/**
 * Get cached violation report
 */
export async function getCachedViolationReport(
  owner: string,
  repo: string,
  fromVersion: string,
  toVersion: string
): Promise<any | null> {
  const cache = getCache()
  const key = CacheKeys.violationReport(owner, repo, fromVersion, toVersion)
  return cache.get(key)
}

/**
 * Invalidate all caches for a repository
 */
export async function invalidateRepositoryCache(
  owner: string,
  repo: string
): Promise<void> {
  const cache = getCache()
  await cache.deletePattern(`gh:*:${owner}:${repo}*`)
  await cache.deletePattern(`violations:${owner}:${repo}*`)
}

/**
 * Invalidate transformation caches for a file
 */
export async function invalidateFileCache(filePath: string): Promise<void> {
  const cache = getCache()
  await cache.deletePattern(`ast:${filePath}:*`)
  await cache.deletePattern(`transform:${filePath}:*`)
}
