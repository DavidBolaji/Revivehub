import { BaseDetector } from './base'
import { NpmRegistryService } from '../services/npm-registry'
import type {
  RepositoryContext,
  DependencyAnalysisResult,
  DependencyInfo,
  OutdatedDependency
} from '../types'

/**
 * Dependency analyzer that parses package manager files and identifies outdated dependencies
 */
export class DependencyAnalyzer extends BaseDetector {
  readonly name = 'DependencyAnalyzer'
  private npmRegistry = new NpmRegistryService()

  // Package manager file mappings
  private readonly packageManagerFiles = {
    npm: 'package.json',
    pip: 'requirements.txt',
    gem: 'Gemfile',
    composer: 'composer.json'
  }

  async detect(context: RepositoryContext): Promise<DependencyAnalysisResult> {
    try {
      const allDependencies: DependencyInfo[] = []
      const allDevDependencies: DependencyInfo[] = []

      // Parse npm dependencies
      await this.parseNpmDependencies(context, allDependencies, allDevDependencies)

      // Parse pip dependencies
      await this.parsePipDependencies(context, allDependencies)

      // Parse gem dependencies
      await this.parseGemDependencies(context, allDependencies)

      // Parse composer dependencies
      await this.parseComposerDependencies(context, allDependencies, allDevDependencies)

      // Identify outdated dependencies
      const outdatedDependencies = await this.identifyOutdatedDependencies([
        ...allDependencies,
        ...allDevDependencies
      ])

      return this.createSuccessResult<DependencyAnalysisResult>({
        dependencies: allDependencies,
        devDependencies: allDevDependencies,
        outdatedDependencies,
        totalCount: allDependencies.length,
        devCount: allDevDependencies.length
      })
    } catch (error) {
      return this.createErrorResult<DependencyAnalysisResult>(
        this.createDetectionError(
          'DEPENDENCY_ANALYSIS_FAILED',
          `Failed to analyze dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        ),
        {
          dependencies: [],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 0,
          devCount: 0
        }
      )
    }
  }

  /**
   * Parse npm package.json dependencies
   */
  private async parseNpmDependencies(
    context: RepositoryContext,
    dependencies: DependencyInfo[],
    devDependencies: DependencyInfo[]
  ): Promise<void> {
    const packageJson = this.parseJsonFile<{
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }>(context, this.packageManagerFiles.npm)

    if (!packageJson) return

    // Parse direct dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        dependencies.push({
          name,
          installedVersion: this.extractVersion(version),
          type: 'direct',
          ecosystem: 'npm'
        })
      }
    }

    // Parse dev dependencies
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        devDependencies.push({
          name,
          installedVersion: this.extractVersion(version),
          type: 'dev',
          ecosystem: 'npm'
        })
      }
    }
  }

  /**
   * Parse pip requirements.txt dependencies
   */
  private async parsePipDependencies(
    context: RepositoryContext,
    dependencies: DependencyInfo[]
  ): Promise<void> {
    const requirementsContent = this.getFileContent(context, this.packageManagerFiles.pip)
    if (!requirementsContent) return

    const lines = requirementsContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) continue

      // Parse dependency line (format: package==version or package>=version)
      const match = trimmedLine.match(/^([a-zA-Z0-9_-]+)\s*([=><~!]+)\s*(.+)$/)
      if (match) {
        const [, name, , version] = match
        dependencies.push({
          name,
          installedVersion: this.extractVersion(version),
          type: 'direct',
          ecosystem: 'pip'
        })
      } else {
        // Handle simple package names without version
        const simpleMatch = trimmedLine.match(/^([a-zA-Z0-9_-]+)$/)
        if (simpleMatch) {
          dependencies.push({
            name: simpleMatch[1],
            installedVersion: 'latest',
            type: 'direct',
            ecosystem: 'pip'
          })
        }
      }
    }
  }

  /**
   * Parse Gemfile dependencies
   */
  private async parseGemDependencies(
    context: RepositoryContext,
    dependencies: DependencyInfo[]
  ): Promise<void> {
    const gemfileContent = this.getFileContent(context, this.packageManagerFiles.gem)
    if (!gemfileContent) return

    const lines = gemfileContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) continue

      // Parse gem line (format: gem 'name', 'version' or gem "name", "version")
      const match = trimmedLine.match(/gem\s+['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/)
      if (match) {
        const [, name, version] = match
        dependencies.push({
          name,
          installedVersion: this.extractVersion(version),
          type: 'direct',
          ecosystem: 'gem'
        })
      } else {
        // Handle gem without version
        const simpleMatch = trimmedLine.match(/gem\s+['"]([^'"]+)['"]/)
        if (simpleMatch) {
          dependencies.push({
            name: simpleMatch[1],
            installedVersion: 'latest',
            type: 'direct',
            ecosystem: 'gem'
          })
        }
      }
    }
  }

  /**
   * Parse composer.json dependencies
   */
  private async parseComposerDependencies(
    context: RepositoryContext,
    dependencies: DependencyInfo[],
    devDependencies: DependencyInfo[]
  ): Promise<void> {
    const composerJson = this.parseJsonFile<{
      require?: Record<string, string>
      'require-dev'?: Record<string, string>
    }>(context, this.packageManagerFiles.composer)

    if (!composerJson) return

    // Parse direct dependencies
    if (composerJson.require) {
      for (const [name, version] of Object.entries(composerJson.require)) {
        // Skip PHP version requirement
        if (name === 'php') continue
        
        dependencies.push({
          name,
          installedVersion: this.extractVersion(version),
          type: 'direct',
          ecosystem: 'composer'
        })
      }
    }

    // Parse dev dependencies
    if (composerJson['require-dev']) {
      for (const [name, version] of Object.entries(composerJson['require-dev'])) {
        devDependencies.push({
          name,
          installedVersion: this.extractVersion(version),
          type: 'dev',
          ecosystem: 'composer'
        })
      }
    }
  }

  /**
   * Identify outdated dependencies based on version comparison
   * Queries npm registry for actual latest versions
   */
  private async identifyOutdatedDependencies(dependencies: DependencyInfo[]): Promise<OutdatedDependency[]> {
    const outdated: OutdatedDependency[] = []

    // Only check npm dependencies for now
    const npmDeps = dependencies.filter(dep => dep.ecosystem === 'npm')

    // Filter out dependencies without valid versions
    const depsToCheck = npmDeps.filter(dep => {
      if (dep.installedVersion === 'latest' || !dep.installedVersion) return false
      return this.parseVersion(dep.installedVersion) !== null
    })

    // Fetch all latest versions in batch
    const packageNames = depsToCheck.map(dep => dep.name)
    const latestVersions = await this.npmRegistry.getLatestVersionsBatch(packageNames)

    // Compare versions
    for (const dep of depsToCheck) {
      const installedVersion = this.parseVersion(dep.installedVersion)
      if (!installedVersion) continue

      const latestVersionString = latestVersions.get(dep.name)
      if (!latestVersionString) continue

      const latestVersion = this.parseVersion(latestVersionString)
      if (!latestVersion) continue

      // Calculate how many major versions behind
      const majorVersionsBehind = latestVersion.major - installedVersion.major
      
      if (majorVersionsBehind > 0) {
        const severity = this.calculateSeverity(majorVersionsBehind)
        outdated.push({
          ...dep,
          majorVersionsBehind,
          severity
        })
      }
    }

    return outdated
  }

  /**
   * Parse semantic version string into components
   */
  private parseVersion(version: string): { major: number; minor: number; patch: number } | null {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!match) return null

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10)
    }
  }

  /**
   * Calculate severity based on how many major versions behind
   */
  private calculateSeverity(majorVersionsBehind: number): 'critical' | 'warning' | 'info' {
    if (majorVersionsBehind > 2) {
      return 'critical'
    } else if (majorVersionsBehind >= 1) {
      return 'warning'
    }
    return 'info'
  }
}
