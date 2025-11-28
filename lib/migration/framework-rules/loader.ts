/**
 * Framework Rules Loader Utility
 * 
 * This module provides utilities to load framework rules from JSON files,
 * with caching for frequently accessed rules and validation.
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import type {
  FrameworkRules,
  FrameworkRulesDatabase,
  MigrationPath,
  VersionRules,
} from './schema'

// Import validation functions
import {
  validateFrameworkRules,
  validateMigrationPath,
  validateVersionRules,
  validateFrameworkRulesDatabase,
} from './schema'

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class RulesCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<unknown> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    }
    this.cache.set(key, entry)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  size(): number {
    return this.cache.size
  }
}

// ============================================================================
// Loader Class
// ============================================================================

export class FrameworkRulesLoader {
  private cache: RulesCache
  private rulesBasePath: string

  constructor(basePath?: string) {
    this.cache = new RulesCache()
    this.rulesBasePath = basePath || join(process.cwd(), 'lib/migration/framework-rules')
  }

  /**
   * Load the main framework rules database
   */
  async loadDatabase(): Promise<FrameworkRulesDatabase> {
    const cacheKey = 'database'
    
    // Check cache
    const cached = this.cache.get<FrameworkRulesDatabase>(cacheKey)
    if (cached) {
      return cached
    }

    // Load from file
    const dbPath = join(this.rulesBasePath, 'database.json')
    const content = await readFile(dbPath, { encoding: 'utf-8' })
    const data = JSON.parse(content)

    // Validate
    if (!validateFrameworkRulesDatabase(data)) {
      throw new Error('Invalid framework rules database structure')
    }

    // Cache and return
    this.cache.set(cacheKey, data)
    return data
  }

  /**
   * Load framework rules by framework ID
   */
  async loadFrameworkRules(frameworkId: string): Promise<FrameworkRules> {
    const cacheKey = `framework:${frameworkId}`
    
    // Check cache
    const cached = this.cache.get<FrameworkRules>(cacheKey)
    if (cached) {
      return cached
    }

    // Load database to get file path
    const db = await this.loadDatabase()
    const filePath: string | undefined = db.frameworks[frameworkId]
    
    if (!filePath) {
      throw new Error(`Framework '${frameworkId}' not found in database`)
    }

    // Load from file
    const fullPath = join(this.rulesBasePath, filePath)
    const content = await readFile(fullPath, { encoding: 'utf-8' })
    const data = JSON.parse(content) as FrameworkRules

    // Validate
    if (!validateFrameworkRules(data)) {
      throw new Error(`Invalid framework rules structure for '${frameworkId}'`)
    }

    // Cache and return
    this.cache.set<FrameworkRules>(cacheKey, data)
    return data
  }

  /**
   * Load version-specific rules for a framework
   */
  async loadVersionRules(
    frameworkId: string,
    version: string
  ): Promise<VersionRules | null> {
    const cacheKey = `version:${frameworkId}:${version}`
    
    // Check cache
    const cached = this.cache.get<VersionRules>(cacheKey)
    if (cached) {
      return cached
    }

    // Load framework rules
    const frameworkRules = await this.loadFrameworkRules(frameworkId)
    
    // Find version
    const versionRules = frameworkRules.versions.find(v => v.version === version)
    
    if (!versionRules) {
      return null
    }

    // Validate
    if (!validateVersionRules(versionRules)) {
      throw new Error(`Invalid version rules structure for '${frameworkId}@${version}'`)
    }

    // Cache and return
    this.cache.set(cacheKey, versionRules)
    return versionRules
  }

  /**
   * Load migration path by ID
   */
  async loadMigrationPath(pathId: string): Promise<MigrationPath> {
    const cacheKey = `migration-path:${pathId}`
    
    // Check cache
    const cached = this.cache.get<MigrationPath>(cacheKey)
    if (cached) {
      return cached
    }

    // Load database to get file path
    const db = await this.loadDatabase()
    const filePath: string | undefined = db.migrationPaths[pathId]
    
    if (!filePath) {
      throw new Error(`Migration path '${pathId}' not found in database`)
    }

    // Load from file
    const fullPath = join(this.rulesBasePath, filePath)
    const content = await readFile(fullPath, { encoding: 'utf-8' })
    const data = JSON.parse(content) as MigrationPath

    // Validate
    if (!validateMigrationPath(data)) {
      throw new Error(`Invalid migration path structure for '${pathId}'`)
    }

    // Cache and return
    this.cache.set<MigrationPath>(cacheKey, data)
    return data
  }

  /**
   * Load migration mappings by path ID
   */
  async loadMigrationMappings(pathId: string): Promise<any> {
    const cacheKey = `mappings:${pathId}`
    
    // Check cache
    const cached = this.cache.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    // Load from file
    const filePath = join(this.rulesBasePath, 'mappings', `${pathId}.json`)
    
    try {
      const content = await readFile(filePath, { encoding: 'utf-8' })
      const data = JSON.parse(content)

      // Cache and return
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      throw new Error(`Migration mappings not found for '${pathId}'`)
    }
  }

  /**
   * Load version upgrade rules
   */
  async loadVersionUpgradeRules(
    framework: string,
    fromVersion: string,
    toVersion: string
  ): Promise<any> {
    // Try direct path first (e.g., nextjs-12-to-14)
    const majorFrom = this.getMajorVersion(fromVersion)
    const majorTo = this.getMajorVersion(toVersion)
    const pathId = `${framework}-${majorFrom}-to-${majorTo}`
    const cacheKey = `upgrade:${pathId}`
    
    // Check cache
    const cached = this.cache.get<any>(cacheKey)
    if (cached) {
      return cached
    }

    // Load from file
    const filePath = join(
      this.rulesBasePath,
      'version-upgrades',
      `${pathId}.json`
    )
    
    try {
      const content = await readFile(filePath, { encoding: 'utf-8' })
      const data = JSON.parse(content)

      // Cache and return
      this.cache.set(cacheKey, data)
      return data
    } catch (error) {
      throw new Error(
        `Version upgrade rules not found for ${framework} ${fromVersion} → ${toVersion}`
      )
    }
  }

  /**
   * Get all available frameworks
   */
  async getAvailableFrameworks(): Promise<string[]> {
    const db = await this.loadDatabase()
    return Object.keys(db.frameworks)
  }

  /**
   * Get all available migration paths
   */
  async getAvailableMigrationPaths(): Promise<string[]> {
    const db = await this.loadDatabase()
    return Object.keys(db.migrationPaths)
  }

  /**
   * Find compatible target frameworks for a source framework
   */
  async getCompatibleTargets(sourceFramework: string): Promise<string[]> {
    const frameworkRules = await this.loadFrameworkRules(sourceFramework)
    return frameworkRules.compatibleTargets.map(t => t.framework)
  }

  /**
   * Find migration path between two frameworks
   */
  async findMigrationPath(
    sourceFramework: string,
    targetFramework: string,
    targetRouter?: string
  ): Promise<MigrationPath | null> {
    const paths = await this.getAvailableMigrationPaths()
    
    for (const pathId of paths) {
      const path = await this.loadMigrationPath(pathId)
      
      if (
        path.sourceFramework === sourceFramework &&
        path.targetFramework === targetFramework
      ) {
        // If router specified, check if path ID matches
        if (targetRouter) {
          if (pathId.includes(targetRouter)) {
            return path
          }
        } else {
          return path
        }
      }
    }
    
    return null
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size(),
      keys: Array.from((this.cache as any).cache.keys()),
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private getMajorVersion(version: string): string {
    const match = version.match(/^(\d+)/)
    return match ? match[1] : version
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let loaderInstance: FrameworkRulesLoader | null = null

/**
 * Get singleton instance of FrameworkRulesLoader
 */
export function getFrameworkRulesLoader(): FrameworkRulesLoader {
  if (!loaderInstance) {
    loaderInstance = new FrameworkRulesLoader()
  }
  return loaderInstance
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetFrameworkRulesLoader(): void {
  loaderInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Load framework rules by ID
 */
export async function loadFrameworkRules(
  frameworkId: string
): Promise<FrameworkRules> {
  const loader = getFrameworkRulesLoader()
  return loader.loadFrameworkRules(frameworkId)
}

/**
 * Load migration path by ID
 */
export async function loadMigrationPath(pathId: string): Promise<MigrationPath> {
  const loader = getFrameworkRulesLoader()
  return loader.loadMigrationPath(pathId)
}

/**
 * Load version upgrade rules
 */
export async function loadVersionUpgradeRules(
  framework: string,
  fromVersion: string,
  toVersion: string
): Promise<any> {
  const loader = getFrameworkRulesLoader()
  return loader.loadVersionUpgradeRules(framework, fromVersion, toVersion)
}

/**
 * Find migration path between frameworks
 */
export async function findMigrationPath(
  sourceFramework: string,
  targetFramework: string,
  targetRouter?: string
): Promise<MigrationPath | null> {
  const loader = getFrameworkRulesLoader()
  return loader.findMigrationPath(sourceFramework, targetFramework, targetRouter)
}

/**
 * Get compatible target frameworks
 */
export async function getCompatibleTargets(
  sourceFramework: string
): Promise<string[]> {
  const loader = getFrameworkRulesLoader()
  return loader.getCompatibleTargets(sourceFramework)
}
