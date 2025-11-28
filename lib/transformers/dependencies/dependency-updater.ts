/**
 * DependencyUpdaterTransformer - Updates package dependencies to latest versions
 * 
 * Handles automated dependency updates by:
 * - Parsing package.json files
 * - Extracting package names from task descriptions
 * - Fetching latest versions from npm registry
 * - Updating dependencies and devDependencies
 * - Preserving JSON formatting
 * - Handling breaking changes with warnings
 * 
 * Supports all frameworks (category: 'dependency', frameworks: ['*'])
 * 
 * @example
 * ```typescript
 * const transformer = new DependencyUpdaterTransformer()
 * const result = await transformer.transform(packageJsonContent, options, task)
 * ```
 */

import { BaseTransformer } from '../base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
} from '@/types/transformer'

/**
 * Interface for npm registry package information
 */
interface NpmPackageInfo {
  name: string
  'dist-tags': {
    latest: string
    [key: string]: string
  }
  versions: Record<string, any>
}

/**
 * Interface for package version metadata
 */
interface PackageVersionMetadata {
  peerDependencies?: Record<string, string>
  engines?: {
    node?: string
    npm?: string
  }
}

/**
 * Interface for compatibility check result
 */
interface CompatibilityCheck {
  compatible: boolean
  warnings: string[]
  conflicts: Array<{
    package: string
    required: string
    current: string
  }>
}

/**
 * Transformer for updating package dependencies
 */
export class DependencyUpdaterTransformer extends BaseTransformer {
  private readonly NPM_REGISTRY_URL = 'https://registry.npmjs.org'
  private readonly REQUEST_TIMEOUT = 5000 // 5 seconds

  constructor() {
    super('DependencyUpdater', ['dependency'], ['*'])
  }

  /**
   * Transforms package.json by updating specified dependencies to latest versions
   * 
   * Process:
   * 1. Parse package.json
   * 2. Extract packages to update from task description
   * 3. Fetch latest versions from npm registry
   * 4. Update dependencies and devDependencies
   * 5. Preserve JSON formatting (2-space indentation)
   * 6. Generate diff and metadata
   * 
   * @param code - package.json content as string
   * @param options - Transformation options
   * @param task - Task containing pattern information with packages to update
   * @returns Transformation result with updated package.json
   */
  async transform(
    code: string,
    options: TransformOptions,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata(['package.json'], 85)

    try {
      // Parse package.json
      let packageJson: any
      try {
        packageJson = JSON.parse(code)
      } catch (error: any) {
        return {
          success: false,
          metadata,
          errors: [
            {
              message: 'Failed to parse package.json',
              code: 'INVALID_JSON',
              location: undefined,
              suggestions: [
                'Ensure package.json is valid JSON',
                'Check for trailing commas or syntax errors',
              ],
              severity: 'error',
            },
          ],
          warnings: [],
        }
      }

      // Extract packages to update from task
      let packagesToUpdate = task ? this.extractPackages(task) : []

      // If no specific packages mentioned, scan all dependencies
      if (packagesToUpdate.length === 0) {
        console.log('[DependencyUpdater] No specific packages found, scanning all dependencies')
        packagesToUpdate = await this.getAllDependencies(packageJson)
        console.log('[DependencyUpdater] Found', packagesToUpdate.length, 'total dependencies to check')
      }

      if (packagesToUpdate.length === 0) {
        return {
          success: true,
          code,
          metadata: {
            ...metadata,
            confidenceScore: 100,
          },
          errors: [],
          warnings: ['No dependencies found in package.json'],
        }
      }

      // Fetch latest versions from npm registry and compare with current versions
      const updates = await this.fetchLatestVersions(packagesToUpdate, packageJson)

      if (updates.size === 0) {
        return {
          success: true,
          code,
          metadata: {
            ...metadata,
            confidenceScore: 100,
          },
          errors: [],
          warnings: ['No package updates available - all dependencies are up to date'],
        }
      }

      console.log('[DependencyUpdater] Applying', updates.size, 'updates to package.json')

      // Check compatibility of updates
      const compatibilityCheck = await this.checkCompatibility(updates, packageJson)
      const compatibilityWarnings = compatibilityCheck.warnings

      // Track changes
      const transformationsApplied: string[] = []
      let updatedCount = 0

      // Update dependencies
      if (packageJson.dependencies) {
        for (const [pkg, version] of updates) {
          if (packageJson.dependencies[pkg]) {
            const oldVersion = packageJson.dependencies[pkg]
            packageJson.dependencies[pkg] = version
            transformationsApplied.push(`${pkg}: ${oldVersion} → ${version}`)
            updatedCount++
          }
        }
      }

      // Update devDependencies
      if (packageJson.devDependencies) {
        for (const [pkg, version] of updates) {
          if (packageJson.devDependencies[pkg]) {
            const oldVersion = packageJson.devDependencies[pkg]
            packageJson.devDependencies[pkg] = version
            transformationsApplied.push(`${pkg}: ${oldVersion} → ${version} (dev)`)
            updatedCount++
          }
        }
      }

      if (updatedCount === 0) {
        return {
          success: true,
          code,
          metadata: {
            ...metadata,
            confidenceScore: 100,
          },
          errors: [],
          warnings: ['Specified packages not found in dependencies'],
        }
      }

      // Preserve formatting with 2-space indentation
      const transformed = JSON.stringify(packageJson, null, 2) + '\n'

      // Generate diff
      const diff = this.generateDiff(code, transformed)

      // Calculate risk score based on task risk level and breaking changes
      const hasBreakingChanges = task?.breakingChanges && task.breakingChanges.length > 0
      const baseRiskScore = task?.riskLevel === 'high' ? 60 : task?.riskLevel === 'medium' ? 40 : 20
      const breakingChangesPenalty = hasBreakingChanges ? 20 : 0
      const riskScore = Math.min(100, baseRiskScore + breakingChangesPenalty)

      // Build final metadata
      const finalMetadata = {
        ...metadata,
        linesAdded: diff.visual.filter((l) => l.type === 'added').length,
        linesRemoved: diff.visual.filter((l) => l.type === 'removed').length,
        confidenceScore: hasBreakingChanges ? 70 : 85,
        riskScore,
        requiresManualReview: hasBreakingChanges || riskScore > 70,
        estimatedTimeSaved: `${updatedCount * 5} minutes`,
        transformationsApplied,
      }

      // Combine all warnings
      const allWarnings = [
        ...(task?.breakingChanges || []),
        ...compatibilityWarnings,
      ]

      return {
        success: true,
        code: transformed,
        diff,
        metadata: finalMetadata,
        errors: [],
        warnings: allWarnings,
      }
    } catch (error: any) {
      return {
        success: false,
        metadata,
        errors: [
          {
            message: error.message || 'Transformation failed',
            code: 'TRANSFORM_ERROR',
            location: undefined,
            suggestions: [
              'Check npm registry connectivity',
              'Verify package names are correct',
              'Ensure package.json is valid',
            ],
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * Extracts package names from task description or scans package.json for outdated packages
   * 
   * @param task - Task with pattern description containing package information
   * @returns Array of package names to update
   */
  private extractPackages(task: Task): string[] {
    const packages: string[] = []

    if (!task.pattern || !task.pattern.description) {
      return packages
    }

    const description = task.pattern.description
    const taskName = task.name || ''

    console.log('[DependencyUpdater] Extracting packages from:', { description, taskName })

    // Pattern 1: Extract from "packages: pkg1, pkg2, pkg3"
    const listPattern = /packages?:\s*([a-z0-9@\-\/,\s]+)/i
    const listMatch = description.match(listPattern)
    if (listMatch) {
      const pkgList = listMatch[1]
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && /^[a-z0-9@\-\/]+$/i.test(p))

      packages.push(...pkgList)
      console.log('[DependencyUpdater] Found packages from list pattern:', pkgList)
    }

    // Pattern 2: Extract package names in backticks or quotes
    const quotedPattern = /[`'"]([a-z0-9@\-\/]+)[`'"]/g
    let match
    while ((match = quotedPattern.exec(description)) !== null) {
      const pkgName = match[1].trim()
      if (pkgName && !packages.includes(pkgName)) {
        packages.push(pkgName)
      }
    }

    // Pattern 3: Extract from task name if it mentions specific packages
    const packageNamePattern = /\b([a-z0-9]+(?:-[a-z0-9]+)+|@[a-z0-9\-\/]+)\b/gi
    while ((match = packageNamePattern.exec(taskName)) !== null) {
      const pkgName = match[1].trim()
      if (pkgName && !packages.includes(pkgName) && 
          pkgName !== 'package' && pkgName !== 'packages' &&
          pkgName !== 'outdated' && pkgName !== 'dependencies') {
        packages.push(pkgName)
      }
    }

    console.log('[DependencyUpdater] Extracted packages:', packages)

    // If no specific packages found, return empty array
    // The transformer will then scan package.json for all outdated dependencies
    return packages
  }

  /**
   * Scans package.json and returns all dependencies that could be updated
   */
  private async getAllDependencies(packageJson: any): Promise<string[]> {
    const allPackages: string[] = []
    
    if (packageJson.dependencies) {
      allPackages.push(...Object.keys(packageJson.dependencies))
    }
    
    if (packageJson.devDependencies) {
      allPackages.push(...Object.keys(packageJson.devDependencies))
    }
    
    return allPackages
  }

  /**
   * Fetches latest versions for packages from npm registry and compares with current versions
   * 
   * Makes HTTP requests to npm registry API to get latest version information.
   * Handles errors gracefully and continues with available packages.
   * Uses caret (^) prefix for semantic versioning compatibility.
   * Only returns packages that have newer versions available.
   * 
   * Safe update strategy:
   * - Minor/patch updates: Always safe (e.g., 18.0.0 → 18.3.1)
   * - Major updates: Only if within same major version family (e.g., 17.x → 18.x, but not 17.x → 19.x)
   * - Breaking changes: Flagged for manual review
   * 
   * @param packages - Array of package names to fetch versions for
   * @param packageJson - Current package.json to compare versions
   * @returns Map of package name to latest version string (with ^ prefix) for packages that need updates
   * 
   * @example
   * ```typescript
   * const versions = await this.fetchLatestVersions(['react', 'next'], packageJson)
   * // Returns: Map { 'react' => '^18.2.0' } (only if newer than current)
   * ```
   */
  private async fetchLatestVersions(
    packages: string[],
    packageJson: any
  ): Promise<Map<string, string>> {
    const versions = new Map<string, string>()

    console.log('[DependencyUpdater] Fetching latest versions for', packages.length, 'packages')

    // Fetch versions in parallel with error handling
    const fetchPromises = packages.map(async (pkg) => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT)

        const response = await fetch(`${this.NPM_REGISTRY_URL}/${pkg}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          console.warn(`Failed to fetch version for ${pkg}: ${response.status}`)
          return
        }

        const data: NpmPackageInfo = await response.json()

        if (data['dist-tags'] && data['dist-tags'].latest) {
          const latestVersion = data['dist-tags'].latest
          
          // Get current version from package.json
          const currentVersion = 
            packageJson.dependencies?.[pkg] || 
            packageJson.devDependencies?.[pkg]
          
          if (currentVersion) {
            // Get safe update version (respects semantic versioning)
            const safeVersion = this.getSafeUpdateVersion(currentVersion, latestVersion, data.versions)
            
            if (safeVersion && this.isNewerVersion(safeVersion, currentVersion)) {
              // Use caret (^) for semantic versioning compatibility
              versions.set(pkg, `^${safeVersion}`)
              console.log(`[DependencyUpdater] ${pkg}: ${currentVersion} → ^${safeVersion}`)
            } else {
              console.log(`[DependencyUpdater] ${pkg}: ${currentVersion} is up to date`)
            }
          }
        }
      } catch (error: any) {
        // Log error but continue with other packages
        console.warn(`Error fetching version for ${pkg}:`, error.message)
      }
    })

    await Promise.all(fetchPromises)

    console.log('[DependencyUpdater] Found', versions.size, 'packages with updates available')

    return versions
  }

  /**
   * Determines the safe version to update to based on semantic versioning rules
   * 
   * Strategy:
   * - If current is 17.x, update to latest stable 18.x (one major version jump)
   * - If current is 18.x, update to latest stable 18.x (minor/patch updates)
   * - Avoid jumping multiple major versions (e.g., 17.x → 19.x)
   * - Only use stable releases (no canary, beta, alpha, rc)
   * 
   * @param currentVersion - Current version string (e.g., "^17.0.0")
   * @param latestVersion - Latest version from npm (e.g., "19.2.0")
   * @param allVersions - All available versions from npm registry
   * @returns Safe version to update to, or null if no safe update available
   */
  private getSafeUpdateVersion(
    currentVersion: string,
    latestVersion: string,
    allVersions: Record<string, any>
  ): string | null {
    // Parse current version
    const cleanCurrent = currentVersion.replace(/^[\^~>=<]+/, '')
    const currentParts = cleanCurrent.split('.').map(Number)
    const currentMajor = currentParts[0] || 0

    // Parse latest version
    const latestParts = latestVersion.split('.').map(Number)
    const latestMajor = latestParts[0] || 0

    // If already on latest major version, return latest
    if (currentMajor === latestMajor) {
      return latestVersion
    }

    // If one major version behind, update to next major version's latest
    if (latestMajor === currentMajor + 1) {
      return latestVersion
    }

    // If multiple major versions behind, find the latest stable of next major version
    if (latestMajor > currentMajor + 1) {
      const targetMajor = currentMajor + 1
      const targetVersions = Object.keys(allVersions)
        .filter(v => {
          // Filter out pre-release versions
          if (this.isPreRelease(v)) return false
          
          const parts = v.split('.')
          return parseInt(parts[0]) === targetMajor
        })
        .sort((a, b) => this.compareVersions(b, a)) // Sort descending

      if (targetVersions.length > 0) {
        console.log(`[DependencyUpdater] Limiting update to next major version: ${targetVersions[0]} (latest is ${latestVersion})`)
        return targetVersions[0]
      }
    }

    // No safe update found
    return null
  }

  /**
   * Checks if a version string is a pre-release version
   * @param version - Version string to check
   * @returns true if version contains pre-release identifiers
   */
  private isPreRelease(version: string): boolean {
    const preReleasePatterns = [
      'alpha',
      'beta',
      'rc',
      'canary',
      'next',
      'dev',
      'pre',
      'preview',
      'experimental'
    ]
    
    const lowerVersion = version.toLowerCase()
    return preReleasePatterns.some(pattern => lowerVersion.includes(pattern))
  }

  /**
   * Compares two version strings
   * @returns positive if a > b, negative if a < b, 0 if equal
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)

    for (let i = 0; i < 3; i++) {
      const aNum = aParts[i] || 0
      const bNum = bParts[i] || 0
      if (aNum !== bNum) return aNum - bNum
    }

    return 0
  }

  /**
   * Compares two version strings to determine if the latest is newer
   * Handles version prefixes like ^, ~, >=, etc.
   * 
   * @param latestVersion - Latest version from npm registry (e.g., "18.2.0")
   * @param currentVersion - Current version from package.json (e.g., "^18.0.0" or "18.0.0")
   * @returns true if latest version is newer than current version
   */
  private isNewerVersion(latestVersion: string, currentVersion: string): boolean {
    // Remove version prefixes (^, ~, >=, etc.)
    const cleanLatest = latestVersion.replace(/^[\^~>=<]+/, '')
    const cleanCurrent = currentVersion.replace(/^[\^~>=<]+/, '')

    // Parse versions
    const latestParts = cleanLatest.split('.').map(Number)
    const currentParts = cleanCurrent.split('.').map(Number)

    // Compare major.minor.patch
    for (let i = 0; i < 3; i++) {
      const latest = latestParts[i] || 0
      const current = currentParts[i] || 0

      if (latest > current) return true
      if (latest < current) return false
    }

    // Versions are equal
    return false
  }

  /**
   * Checks compatibility of proposed updates with existing dependencies
   * Validates peer dependencies and known breaking changes
   * 
   * @param updates - Map of packages to update with their new versions
   * @param packageJson - Current package.json
   * @returns Compatibility check result with warnings
   */
  private async checkCompatibility(
    updates: Map<string, string>,
    packageJson: any
  ): Promise<CompatibilityCheck> {
    const warnings: string[] = []
    const conflicts: Array<{ package: string; required: string; current: string }> = []

    console.log('[DependencyUpdater] Checking compatibility for', updates.size, 'updates')

    // Known compatibility rules
    const compatibilityRules = this.getCompatibilityRules()

    for (const [pkg, newVersion] of updates) {
      const cleanVersion = newVersion.replace(/^[\^~>=<]+/, '')
      const majorVersion = parseInt(cleanVersion.split('.')[0])

      // Check known compatibility rules
      const rule = compatibilityRules[pkg]
      if (rule) {
        for (const [depPkg, requiredVersion] of Object.entries(rule)) {
          // Check if the dependency will be updated too
          const updatedDepVersion = updates.get(depPkg)
          
          // Use updated version if available, otherwise use current version
          const effectiveDepVersion = updatedDepVersion || 
            packageJson.dependencies?.[depPkg] || 
            packageJson.devDependencies?.[depPkg]

          if (effectiveDepVersion) {
            const effectiveMajor = parseInt(effectiveDepVersion.replace(/^[\^~>=<]+/, '').split('.')[0])
            const requiredMajor = parseInt(requiredVersion.replace(/^[\^~>=<]+/, '').split('.')[0])

            // Only warn if the effective version (after all updates) is still incompatible
            if (effectiveMajor < requiredMajor) {
              const currentDepVersion = packageJson.dependencies?.[depPkg] || packageJson.devDependencies?.[depPkg]
              warnings.push(
                `⚠️  ${pkg}@${cleanVersion} requires ${depPkg}@${requiredVersion} but you have ${currentDepVersion}`
              )
              warnings.push(
                `   💡 Consider updating ${depPkg} to version ${requiredVersion} or higher`
              )
              conflicts.push({
                package: depPkg,
                required: requiredVersion,
                current: currentDepVersion,
              })
            }
          }
        }
      }

      // Check for known breaking changes
      const breakingChanges = this.getBreakingChanges(pkg, majorVersion)
      if (breakingChanges.length > 0) {
        warnings.push(`⚠️  ${pkg}@${majorVersion}.x has breaking changes:`)
        breakingChanges.forEach(change => {
          warnings.push(`   - ${change}`)
        })
      }
    }

    // Add general warning for major version updates
    const majorUpdates = Array.from(updates.entries()).filter(([pkg, version]) => {
      const currentVersion = packageJson.dependencies?.[pkg] || packageJson.devDependencies?.[pkg]
      if (!currentVersion) return false

      const currentMajor = parseInt(currentVersion.replace(/^[\^~>=<]+/, '').split('.')[0])
      const newMajor = parseInt(version.replace(/^[\^~>=<]+/, '').split('.')[0])

      return newMajor > currentMajor
    })

    if (majorUpdates.length > 0) {
      warnings.push(
        `⚠️  ${majorUpdates.length} major version update(s) detected. Please review breaking changes and test thoroughly.`
      )
      warnings.push(
        `   Recommended: Run 'npm install' and test your application after accepting these changes.`
      )
    }

    return {
      compatible: conflicts.length === 0,
      warnings,
      conflicts,
    }
  }

  /**
   * Returns known compatibility rules for popular packages
   * Maps package names to their peer dependency requirements
   */
  private getCompatibilityRules(): Record<string, Record<string, string>> {
    return {
      'next': {
        'react': '^18.0.0',
        'react-dom': '^18.0.0',
      },
      '@tanstack/react-query': {
        'react': '^18.0.0',
      },
      'react-dom': {
        'react': '^18.0.0', // react-dom must match react version
      },
      'eslint-config-next': {
        'next': '^14.0.0',
        'eslint': '^8.0.0',
      },
    }
  }

  /**
   * Returns known breaking changes for specific package versions
   */
  private getBreakingChanges(pkg: string, majorVersion: number): string[] {
    const breakingChanges: Record<string, Record<number, string[]>> = {
      'react': {
        18: [
          'Automatic batching of state updates',
          'New root API (createRoot)',
          'Strict mode effects run twice in development',
          'Removed IE 11 support',
        ],
        19: [
          'Server Components are stable',
          'Actions and form handling changes',
          'New hooks: useOptimistic, useFormStatus',
        ],
      },
      'next': {
        14: [
          'Turbopack is default for dev (opt-in)',
          'Server Actions are stable',
          'Partial Prerendering (experimental)',
        ],
        15: [
          'React 19 support',
          'Async Request APIs',
          'Caching semantics changes',
        ],
      },
      'typescript': {
        5: [
          'Decorators are stable',
          'New module resolution modes',
          'Stricter type checking',
        ],
      },
      'eslint': {
        9: [
          'Flat config is default',
          'Removed deprecated rules',
          'New configuration format required',
        ],
      },
    }

    return breakingChanges[pkg]?.[majorVersion] || []
  }
}
