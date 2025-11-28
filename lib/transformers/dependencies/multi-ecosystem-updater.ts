/**
 * Multi-Ecosystem Dependency Updater
 * 
 * Extends dependency updating to support multiple package managers and ecosystems:
 * - JavaScript/TypeScript: npm, yarn, pnpm (package.json)
 * - Python: pip (requirements.txt, pyproject.toml)
 * - PHP: Composer (composer.json)
 * - Ruby: Bundler (Gemfile)
 * - Go: Go modules (go.mod)
 * - Rust: Cargo (Cargo.toml)
 * - Java: Maven (pom.xml), Gradle (build.gradle)
 * 
 * Each ecosystem has its own registry and version format
 */

import { BaseTransformer } from '../base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
} from '@/types/transformer'

/**
 * Supported package ecosystems
 */
export type PackageEcosystem = 
  | 'npm'
  | 'pip'
  | 'composer'
  | 'gem'
  | 'go'
  | 'cargo'
  | 'maven'
  | 'gradle'

/**
 * Registry URLs for different ecosystems
 */
const REGISTRY_URLS: Record<PackageEcosystem, string> = {
  npm: 'https://registry.npmjs.org',
  pip: 'https://pypi.org/pypi',
  composer: 'https://packagist.org/packages',
  gem: 'https://rubygems.org/api/v1/gems',
  go: 'https://proxy.golang.org',
  cargo: 'https://crates.io/api/v1/crates',
  maven: 'https://search.maven.org/solrsearch/select',
  gradle: 'https://search.maven.org/solrsearch/select',
}

/**
 * File patterns for detecting ecosystems
 */
const ECOSYSTEM_FILES: Record<PackageEcosystem, string[]> = {
  npm: ['package.json'],
  pip: ['requirements.txt', 'pyproject.toml', 'setup.py'],
  composer: ['composer.json'],
  gem: ['Gemfile', 'Gemfile.lock'],
  go: ['go.mod', 'go.sum'],
  cargo: ['Cargo.toml', 'Cargo.lock'],
  maven: ['pom.xml'],
  gradle: ['build.gradle', 'build.gradle.kts'],
}

/**
 * Multi-ecosystem dependency updater transformer
 */
export class MultiEcosystemDependencyUpdater extends BaseTransformer {
  private readonly REQUEST_TIMEOUT = 5000

  constructor() {
    super('MultiEcosystemDependencyUpdater', ['dependency'], ['*'])
  }

  /**
   * Detects the ecosystem based on file name
   */
  private detectEcosystem(fileName: string): PackageEcosystem | null {
    for (const [ecosystem, files] of Object.entries(ECOSYSTEM_FILES)) {
      if (files.some(f => fileName.endsWith(f))) {
        return ecosystem as PackageEcosystem
      }
    }
    return null
  }

  /**
   * Main transform method that routes to ecosystem-specific handlers
   */
  async transform(
    code: string,
    options: TransformOptions,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata(task?.affectedFiles || [], 85)

    try {
      // Detect ecosystem from affected files
      const fileName = task?.affectedFiles?.[0] || ''
      const ecosystem = this.detectEcosystem(fileName)

      if (!ecosystem) {
        return {
          success: false,
          metadata,
          errors: [
            {
              message: 'Unable to detect package ecosystem',
              code: 'UNKNOWN_ECOSYSTEM',
              location: undefined,
              suggestions: [
                'Ensure file is a recognized dependency file',
                'Supported: package.json, requirements.txt, composer.json, Gemfile, go.mod, Cargo.toml',
              ],
              severity: 'error',
            },
          ],
          warnings: [],
        }
      }

      console.log(`[MultiEcosystemUpdater] Detected ecosystem: ${ecosystem}`)

      // Route to ecosystem-specific handler
      switch (ecosystem) {
        case 'npm':
          return await this.updateNpmDependencies(code, task)
        case 'pip':
          return await this.updatePipDependencies(code, fileName, task)
        case 'composer':
          return await this.updateComposerDependencies(code, task)
        case 'gem':
          return await this.updateGemDependencies(code, task)
        case 'go':
          return await this.updateGoDependencies(code, task)
        case 'cargo':
          return await this.updateCargoDependencies(code, task)
        default:
          return {
            success: false,
            metadata,
            errors: [
              {
                message: `Ecosystem ${ecosystem} not yet implemented`,
                code: 'NOT_IMPLEMENTED',
                location: undefined,
                suggestions: ['Check back for future updates'],
                severity: 'error',
              },
            ],
            warnings: [],
          }
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
            suggestions: ['Check file format and syntax'],
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * Update npm dependencies (package.json)
   * Delegates to the existing DependencyUpdaterTransformer
   */
  private async updateNpmDependencies(
    code: string,
    task?: Task
  ): Promise<TransformResult> {
    // Import and use the existing npm updater
    const { DependencyUpdaterTransformer } = await import('./dependency-updater')
    const npmUpdater = new DependencyUpdaterTransformer()
    return await npmUpdater.transform(code, {}, task)
  }

  /**
   * Update Python dependencies (requirements.txt or pyproject.toml)
   */
  private async updatePipDependencies(
    code: string,
    fileName: string,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata([fileName], 80)

    if (fileName.endsWith('requirements.txt')) {
      return await this.updateRequirementsTxt(code, metadata)
    } else if (fileName.endsWith('pyproject.toml')) {
      return await this.updatePyprojectToml(code, metadata)
    }

    return {
      success: false,
      metadata,
      errors: [
        {
          message: 'Unsupported Python dependency file',
          code: 'UNSUPPORTED_FILE',
          location: undefined,
          suggestions: ['Use requirements.txt or pyproject.toml'],
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }

  /**
   * Update requirements.txt format
   */
  private async updateRequirementsTxt(
    code: string,
    metadata: any
  ): Promise<TransformResult> {
    const lines = code.split('\n')
    const updates: string[] = []
    let updatedCount = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue
      }

      // Parse package==version or package>=version
      const match = line.match(/^([a-zA-Z0-9_-]+)\s*([=><~!]+)\s*(.+)$/)
      if (match) {
        const [, pkgName, operator, currentVersion] = match

        // Fetch latest version from PyPI
        const latestVersion = await this.fetchPyPIVersion(pkgName)

        if (latestVersion && this.isNewerPythonVersion(latestVersion, currentVersion)) {
          lines[i] = `${pkgName}==${latestVersion}`
          updates.push(`${pkgName}: ${currentVersion} → ${latestVersion}`)
          updatedCount++
        }
      }
    }

    if (updatedCount === 0) {
      return {
        success: true,
        code,
        metadata: { ...metadata, confidenceScore: 100 },
        errors: [],
        warnings: ['No package updates available'],
      }
    }

    const transformed = lines.join('\n')
    const diff = this.generateDiff(code, transformed)

    return {
      success: true,
      code: transformed,
      diff,
      metadata: {
        ...metadata,
        linesAdded: diff.visual.filter((l) => l.type === 'added').length,
        linesRemoved: diff.visual.filter((l) => l.type === 'removed').length,
        transformationsApplied: updates,
      },
      errors: [],
      warnings: [`⚠️  ${updatedCount} package(s) updated. Run 'pip install -r requirements.txt' to apply changes.`],
    }
  }

  /**
   * Update pyproject.toml format (TOML parsing required)
   */
  private async updatePyprojectToml(
    code: string,
    metadata: any
  ): Promise<TransformResult> {
    // For now, return a placeholder
    // Full implementation would require TOML parsing library
    return {
      success: false,
      metadata,
      errors: [
        {
          message: 'pyproject.toml updates not yet implemented',
          code: 'NOT_IMPLEMENTED',
          location: undefined,
          suggestions: ['Use requirements.txt for now', 'Check back for future updates'],
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }

  /**
   * Update PHP Composer dependencies (composer.json)
   */
  private async updateComposerDependencies(
    code: string,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata(['composer.json'], 80)

    try {
      const composerJson = JSON.parse(code)
      const updates: string[] = []
      let updatedCount = 0

      // Update require dependencies
      if (composerJson.require) {
        for (const [pkg, version] of Object.entries(composerJson.require)) {
          if (pkg === 'php') continue // Skip PHP version

          const latestVersion = await this.fetchPackagistVersion(pkg)
          if (latestVersion && this.isNewerComposerVersion(latestVersion, version as string)) {
            composerJson.require[pkg] = `^${latestVersion}`
            updates.push(`${pkg}: ${version} → ^${latestVersion}`)
            updatedCount++
          }
        }
      }

      // Update require-dev dependencies
      if (composerJson['require-dev']) {
        for (const [pkg, version] of Object.entries(composerJson['require-dev'])) {
          const latestVersion = await this.fetchPackagistVersion(pkg)
          if (latestVersion && this.isNewerComposerVersion(latestVersion, version as string)) {
            composerJson['require-dev'][pkg] = `^${latestVersion}`
            updates.push(`${pkg}: ${version} → ^${latestVersion} (dev)`)
            updatedCount++
          }
        }
      }

      if (updatedCount === 0) {
        return {
          success: true,
          code,
          metadata: { ...metadata, confidenceScore: 100 },
          errors: [],
          warnings: ['No package updates available'],
        }
      }

      const transformed = JSON.stringify(composerJson, null, 4) + '\n'
      const diff = this.generateDiff(code, transformed)

      return {
        success: true,
        code: transformed,
        diff,
        metadata: {
          ...metadata,
          linesAdded: diff.visual.filter((l) => l.type === 'added').length,
          linesRemoved: diff.visual.filter((l) => l.type === 'removed').length,
          transformationsApplied: updates,
        },
        errors: [],
        warnings: [`⚠️  ${updatedCount} package(s) updated. Run 'composer update' to apply changes.`],
      }
    } catch (error: any) {
      return {
        success: false,
        metadata,
        errors: [
          {
            message: 'Failed to parse composer.json',
            code: 'INVALID_JSON',
            location: undefined,
            suggestions: ['Ensure composer.json is valid JSON'],
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * Update Ruby Gem dependencies (Gemfile)
   */
  private async updateGemDependencies(
    code: string,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata(['Gemfile'], 80)
    const lines = code.split('\n')
    const updates: string[] = []
    let updatedCount = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Parse gem 'name', 'version'
      const match = line.match(/gem\s+['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/)
      if (match) {
        const [, gemName, currentVersion] = match

        const latestVersion = await this.fetchRubyGemsVersion(gemName)
        if (latestVersion && this.isNewerGemVersion(latestVersion, currentVersion)) {
          lines[i] = line.replace(currentVersion, latestVersion)
          updates.push(`${gemName}: ${currentVersion} → ${latestVersion}`)
          updatedCount++
        }
      }
    }

    if (updatedCount === 0) {
      return {
        success: true,
        code,
        metadata: { ...metadata, confidenceScore: 100 },
        errors: [],
        warnings: ['No gem updates available'],
      }
    }

    const transformed = lines.join('\n')
    const diff = this.generateDiff(code, transformed)

    return {
      success: true,
      code: transformed,
      diff,
      metadata: {
        ...metadata,
        linesAdded: diff.visual.filter((l) => l.type === 'added').length,
        linesRemoved: diff.visual.filter((l) => l.type === 'removed').length,
        transformationsApplied: updates,
      },
      errors: [],
      warnings: [`⚠️  ${updatedCount} gem(s) updated. Run 'bundle install' to apply changes.`],
    }
  }

  /**
   * Update Go module dependencies (go.mod)
   */
  private async updateGoDependencies(
    code: string,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata(['go.mod'], 80)

    return {
      success: false,
      metadata,
      errors: [
        {
          message: 'Go module updates not yet implemented',
          code: 'NOT_IMPLEMENTED',
          location: undefined,
          suggestions: ['Use "go get -u" command manually', 'Check back for future updates'],
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }

  /**
   * Update Rust Cargo dependencies (Cargo.toml)
   */
  private async updateCargoDependencies(
    code: string,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata(['Cargo.toml'], 80)

    return {
      success: false,
      metadata,
      errors: [
        {
          message: 'Cargo updates not yet implemented',
          code: 'NOT_IMPLEMENTED',
          location: undefined,
          suggestions: ['Use "cargo update" command manually', 'Check back for future updates'],
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }

  // ============================================================================
  // Registry API Methods
  // ============================================================================

  /**
   * Fetch latest version from PyPI
   */
  private async fetchPyPIVersion(packageName: string): Promise<string | null> {
    try {
      const response = await fetch(`${REGISTRY_URLS.pip}/${packageName}/json`, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.info?.version || null
    } catch (error) {
      console.warn(`Failed to fetch PyPI version for ${packageName}:`, error)
      return null
    }
  }

  /**
   * Fetch latest version from Packagist (PHP)
   */
  private async fetchPackagistVersion(packageName: string): Promise<string | null> {
    try {
      const response = await fetch(`${REGISTRY_URLS.composer}/${packageName}.json`, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
      })

      if (!response.ok) return null

      const data = await response.json()
      const versions = Object.keys(data.package?.versions || {})
        .filter(v => !v.includes('dev') && !v.includes('alpha') && !v.includes('beta'))
        .sort()
        .reverse()

      return versions[0]?.replace(/^v/, '') || null
    } catch (error) {
      console.warn(`Failed to fetch Packagist version for ${packageName}:`, error)
      return null
    }
  }

  /**
   * Fetch latest version from RubyGems
   */
  private async fetchRubyGemsVersion(gemName: string): Promise<string | null> {
    try {
      const response = await fetch(`${REGISTRY_URLS.gem}/${gemName}.json`, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.version || null
    } catch (error) {
      console.warn(`Failed to fetch RubyGems version for ${gemName}:`, error)
      return null
    }
  }

  // ============================================================================
  // Version Comparison Methods
  // ============================================================================

  private isNewerPythonVersion(latest: string, current: string): boolean {
    return this.compareSemanticVersions(latest, current) > 0
  }

  private isNewerComposerVersion(latest: string, current: string): boolean {
    const cleanCurrent = current.replace(/^[\^~>=<]+/, '')
    return this.compareSemanticVersions(latest, cleanCurrent) > 0
  }

  private isNewerGemVersion(latest: string, current: string): boolean {
    const cleanCurrent = current.replace(/^[\^~>=<]+/, '')
    return this.compareSemanticVersions(latest, cleanCurrent) > 0
  }

  private compareSemanticVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aNum = aParts[i] || 0
      const bNum = bParts[i] || 0
      if (aNum !== bNum) return aNum - bNum
    }

    return 0
  }
}
