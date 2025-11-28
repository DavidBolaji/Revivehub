import { BaseDetector } from './base'
import type {
  RepositoryContext,
  FrameworkDetectionResult,
  DetectedFramework
} from '../types'

/**
 * Framework detector that identifies frontend and backend frameworks
 * based on dependency files and configuration files
 */
export class FrameworkRecognizer extends BaseDetector {
  readonly name = 'FrameworkRecognizer'

  // Frontend framework detection patterns
  private readonly frontendFrameworks = {
    'React': {
      packageNames: ['react'],
      configFiles: ['.babelrc', '.babelrc.js', '.babelrc.json'],
      minConfidence: 80
    },
    'Vue': {
      packageNames: ['vue'],
      configFiles: ['vue.config.js', 'vue.config.ts'],
      minConfidence: 80
    },
    'Angular': {
      packageNames: ['@angular/core'],
      configFiles: ['angular.json', '.angular-cli.json'],
      minConfidence: 90
    },
    'Svelte': {
      packageNames: ['svelte'],
      configFiles: ['svelte.config.js', 'svelte.config.cjs', 'svelte.config.mjs'],
      minConfidence: 80
    },
    'Next.js': {
      packageNames: ['next'],
      configFiles: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
      minConfidence: 90
    },
    'Nuxt': {
      packageNames: ['nuxt'],
      configFiles: ['nuxt.config.js', 'nuxt.config.ts'],
      minConfidence: 90
    }
  }

  // Backend framework detection patterns
  private readonly backendFrameworks = {
    'Express': {
      packageNames: ['express'],
      configFiles: [],
      minConfidence: 70
    },
    'Django': {
      packageNames: ['Django', 'django'],
      configFiles: ['manage.py', 'settings.py', '*/settings.py'],
      minConfidence: 85
    },
    'Rails': {
      packageNames: ['rails'],
      configFiles: ['config/application.rb', 'Rakefile', 'config.ru'],
      minConfidence: 90
    },
    'Laravel': {
      packageNames: ['laravel/framework'],
      configFiles: ['artisan', 'config/app.php'],
      minConfidence: 90
    },
    'FastAPI': {
      packageNames: ['fastapi'],
      configFiles: [],
      minConfidence: 80
    },
    'NestJS': {
      packageNames: ['@nestjs/core'],
      configFiles: ['nest-cli.json'],
      minConfidence: 90
    }
  }

  // Package manager file mappings
  private readonly packageManagers = {
    npm: 'package.json',
    pip: 'requirements.txt',
    bundler: 'Gemfile',
    composer: 'composer.json'
  }

  async detect(context: RepositoryContext): Promise<FrameworkDetectionResult> {
    try {
      const frontend: DetectedFramework[] = []
      const backend: DetectedFramework[] = []

      // Parse dependency files
      const dependencies = await this.parseDependencyFiles(context)

      // Detect frontend frameworks
      for (const [frameworkName, pattern] of Object.entries(this.frontendFrameworks)) {
        const detection = await this.detectFramework(
          context,
          frameworkName,
          pattern,
          dependencies,
          'frontend'
        )
        if (detection) {
          frontend.push(detection)
        }
      }

      // Detect backend frameworks
      for (const [frameworkName, pattern] of Object.entries(this.backendFrameworks)) {
        const detection = await this.detectFramework(
          context,
          frameworkName,
          pattern,
          dependencies,
          'backend'
        )
        if (detection) {
          backend.push(detection)
        }
      }

      // Sort by confidence (highest first)
      frontend.sort((a, b) => b.confidence - a.confidence)
      backend.sort((a, b) => b.confidence - a.confidence)

      return this.createSuccessResult<FrameworkDetectionResult>({
        frontend,
        backend
      })

    } catch (error) {
      return this.createErrorResult<FrameworkDetectionResult>(
        this.createDetectionError(
          'FRAMEWORK_DETECTION_FAILED',
          `Failed to detect frameworks: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        ),
        { frontend: [], backend: [] }
      )
    }
  }

  /**
   * Parse all dependency files in the repository
   */
  private async parseDependencyFiles(context: RepositoryContext): Promise<Map<string, DependencyData>> {
    const allDependencies = new Map<string, DependencyData>()

    // Parse package.json (npm)
    const packageJson = this.parseJsonFile<PackageJson>(context, this.packageManagers.npm)
    if (packageJson) {
      this.extractNpmDependencies(packageJson, allDependencies)
    }

    // Parse requirements.txt (pip)
    const requirementsTxt = this.getFileContent(context, this.packageManagers.pip)
    if (requirementsTxt) {
      this.extractPipDependencies(requirementsTxt, allDependencies)
    }

    // Parse Gemfile (bundler)
    const gemfile = this.getFileContent(context, this.packageManagers.bundler)
    if (gemfile) {
      this.extractGemDependencies(gemfile, allDependencies)
    }

    // Parse composer.json (composer)
    const composerJson = this.parseJsonFile<ComposerJson>(context, this.packageManagers.composer)
    if (composerJson) {
      this.extractComposerDependencies(composerJson, allDependencies)
    }

    return allDependencies
  }

  /**
   * Extract dependencies from package.json
   */
  private extractNpmDependencies(packageJson: PackageJson, dependencies: Map<string, DependencyData>): void {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    for (const [name, version] of Object.entries(allDeps || {})) {
      dependencies.set(name.toLowerCase(), {
        name,
        version: this.extractVersion(version),
        ecosystem: 'npm'
      })
    }
  }

  /**
   * Extract dependencies from requirements.txt
   */
  private extractPipDependencies(content: string, dependencies: Map<string, DependencyData>): void {
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      // Parse lines like "Django==3.2.0" or "fastapi>=0.68.0"
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)([>=<~!]+)?(.+)?/)
      if (match) {
        const [, name, , version] = match
        dependencies.set(name.toLowerCase(), {
          name,
          version: version ? this.extractVersion(version.trim()) : 'unknown',
          ecosystem: 'pip'
        })
      }
    }
  }

  /**
   * Extract dependencies from Gemfile
   */
  private extractGemDependencies(content: string, dependencies: Map<string, DependencyData>): void {
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      // Parse lines like "gem 'rails', '~> 6.1.0'"
      const match = trimmed.match(/gem\s+['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/)
      if (match) {
        const [, name, version] = match
        dependencies.set(name.toLowerCase(), {
          name,
          version: this.extractVersion(version),
          ecosystem: 'gem'
        })
      } else {
        // Handle gems without version specified
        const simpleMatch = trimmed.match(/gem\s+['"]([^'"]+)['"]/)
        if (simpleMatch) {
          const [, name] = simpleMatch
          dependencies.set(name.toLowerCase(), {
            name,
            version: 'unknown',
            ecosystem: 'gem'
          })
        }
      }
    }
  }

  /**
   * Extract dependencies from composer.json
   */
  private extractComposerDependencies(composerJson: ComposerJson, dependencies: Map<string, DependencyData>): void {
    const allDeps = {
      ...composerJson.require,
      ...composerJson['require-dev']
    }

    for (const [name, version] of Object.entries(allDeps || {})) {
      dependencies.set(name.toLowerCase(), {
        name,
        version: this.extractVersion(version),
        ecosystem: 'composer'
      })
    }
  }

  /**
   * Detect a specific framework
   */
  private async detectFramework(
    context: RepositoryContext,
    frameworkName: string,
    pattern: FrameworkPattern,
    dependencies: Map<string, DependencyData>,
    category: 'frontend' | 'backend'
  ): Promise<DetectedFramework | null> {
    // Check if any of the framework's package names exist in dependencies
    let version = 'unknown'
    let foundInDependencies = false

    for (const packageName of pattern.packageNames) {
      const dep = dependencies.get(packageName.toLowerCase())
      if (dep) {
        version = dep.version
        foundInDependencies = true
        break
      }
    }

    if (!foundInDependencies) {
      return null
    }

    // Find configuration files
    const configFiles = this.findFrameworkConfigFiles(context, pattern.configFiles)

    // Calculate confidence score
    const confidence = this.calculateFrameworkConfidence(
      foundInDependencies,
      configFiles.length,
      pattern.minConfidence
    )

    return {
      name: frameworkName,
      version,
      category,
      configFiles,
      confidence
    }
  }

  /**
   * Find framework-specific configuration files
   */
  private findFrameworkConfigFiles(context: RepositoryContext, configPatterns: string[]): string[] {
    const foundConfigs: string[] = []

    for (const pattern of configPatterns) {
      if (pattern.includes('*')) {
        // Handle wildcard patterns
        const matchingFiles = this.findFilesByPattern(context, [pattern])
        foundConfigs.push(...matchingFiles)
      } else {
        // Handle exact file names
        if (this.hasFile(context, pattern)) {
          foundConfigs.push(pattern)
        }
      }
    }

    return foundConfigs
  }

  /**
   * Calculate confidence score for framework detection
   * Base confidence from pattern + bonus for config files
   */
  private calculateFrameworkConfidence(
    foundInDependencies: boolean,
    configFileCount: number,
    minConfidence: number
  ): number {
    if (!foundInDependencies) return 0

    // Start with minimum confidence
    let confidence = minConfidence

    // Add bonus for each config file found (up to 20 points total)
    const configBonus = Math.min(configFileCount * 10, 20)
    confidence = Math.min(confidence + configBonus, 100)

    return confidence
  }
}

// Type definitions for package manager files
interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

interface ComposerJson {
  require?: Record<string, string>
  'require-dev'?: Record<string, string>
}

interface DependencyData {
  name: string
  version: string
  ecosystem: 'npm' | 'pip' | 'gem' | 'composer'
}

interface FrameworkPattern {
  packageNames: string[]
  configFiles: string[]
  minConfidence: number
}
