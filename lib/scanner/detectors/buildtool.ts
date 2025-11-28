import { BaseDetector } from './base'
import type {
  RepositoryContext,
  BuildToolDetectionResult,
  DetectedBuildTool
} from '../types'

/**
 * Build tool detector that identifies build tools and bundlers
 * based on configuration files and package.json dependencies
 */
export class BuildToolDetector extends BaseDetector {
  readonly name = 'BuildToolDetector'

  // Build tool detection patterns
  private readonly buildToolPatterns = {
    'Webpack': {
      configFiles: [
        'webpack.config.js',
        'webpack.config.ts',
        'webpack.config.cjs',
        'webpack.config.mjs',
        'webpack.config.babel.js',
        '.webpack/webpack.config.js'
      ],
      packageNames: ['webpack'],
      buildScriptPatterns: ['webpack', 'build:webpack']
    },
    'Vite': {
      configFiles: [
        'vite.config.js',
        'vite.config.ts',
        'vite.config.mjs',
        'vite.config.cjs'
      ],
      packageNames: ['vite'],
      buildScriptPatterns: ['vite build', 'vite']
    },
    'Rollup': {
      configFiles: [
        'rollup.config.js',
        'rollup.config.ts',
        'rollup.config.mjs',
        'rollup.config.cjs'
      ],
      packageNames: ['rollup'],
      buildScriptPatterns: ['rollup', 'build:rollup']
    },
    'esbuild': {
      configFiles: [
        'esbuild.config.js',
        'esbuild.config.ts',
        'esbuild.config.mjs'
      ],
      packageNames: ['esbuild'],
      buildScriptPatterns: ['esbuild', 'build:esbuild']
    },
    'Parcel': {
      configFiles: [
        '.parcelrc',
        'parcel.config.json',
        '.parcelrc.json'
      ],
      packageNames: ['parcel', 'parcel-bundler'],
      buildScriptPatterns: ['parcel build', 'parcel']
    },
    'Turbopack': {
      configFiles: [
        'turbo.json'
      ],
      packageNames: ['turbo'],
      buildScriptPatterns: ['turbo']
    }
  } as const

  async detect(context: RepositoryContext): Promise<BuildToolDetectionResult> {
    try {
      const buildTools: DetectedBuildTool[] = []

      // Parse package.json to get dependencies and scripts
      const packageJson = this.parseJsonFile<PackageJson>(context, 'package.json')
      const dependencies = packageJson ? this.extractDependencies(packageJson) : new Map()
      const scripts = packageJson?.scripts || {}

      // Detect each build tool
      for (const [toolName, pattern] of Object.entries(this.buildToolPatterns)) {
        const detection = await this.detectBuildTool(
          context,
          toolName as DetectedBuildTool['name'],
          pattern,
          dependencies,
          scripts
        )
        
        if (detection) {
          buildTools.push(detection)
        }
      }

      // Sort by presence of config file (tools with config files first)
      buildTools.sort((a, b) => {
        if (a.configFile && !b.configFile) return -1
        if (!a.configFile && b.configFile) return 1
        return 0
      })

      return this.createSuccessResult<BuildToolDetectionResult>({
        buildTools
      })

    } catch (error) {
      return this.createErrorResult<BuildToolDetectionResult>(
        this.createDetectionError(
          'BUILD_TOOL_DETECTION_FAILED',
          `Failed to detect build tools: ${error instanceof Error ? error.message : 'Unknown error'}`,
          true
        ),
        { buildTools: [] }
      )
    }
  }

  /**
   * Extract all dependencies from package.json
   */
  private extractDependencies(packageJson: PackageJson): Map<string, string> {
    const allDeps = new Map<string, string>()

    // Combine dependencies and devDependencies
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }

    for (const [name, version] of Object.entries(deps || {})) {
      allDeps.set(name.toLowerCase(), this.extractVersion(version))
    }

    return allDeps
  }

  /**
   * Detect a specific build tool
   */
  private async detectBuildTool(
    context: RepositoryContext,
    toolName: DetectedBuildTool['name'],
    pattern: BuildToolPattern,
    dependencies: Map<string, string>,
    scripts: Record<string, string>
  ): Promise<DetectedBuildTool | null> {
    // Check if build tool exists in dependencies
    let version = 'unknown'
    let foundInDependencies = false

    for (const packageName of pattern.packageNames) {
      const dep = dependencies.get(packageName.toLowerCase())
      if (dep) {
        version = dep
        foundInDependencies = true
        break
      }
    }

    // Find configuration file
    const configFile = this.findConfigFile(context, pattern.configFiles)

    // Find build scripts that use this tool
    const buildScripts = this.findBuildScripts(scripts, pattern.buildScriptPatterns)

    // A build tool is detected if it's in dependencies OR has a config file
    if (!foundInDependencies && !configFile) {
      return null
    }

    return {
      name: toolName,
      version,
      configFile,
      buildScripts
    }
  }

  /**
   * Find the first matching configuration file
   */
  private findConfigFile(context: RepositoryContext, configFiles: readonly string[]): string | undefined {
    for (const configFile of configFiles) {
      if (this.hasFile(context, configFile)) {
        return configFile
      }
    }
    return undefined
  }

  /**
   * Find build scripts that match the tool's patterns
   */
  private findBuildScripts(
    scripts: Record<string, string>,
    patterns: readonly string[]
  ): string[] {
    const matchingScripts: string[] = []

    for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
      // Check if the script command contains any of the build tool patterns
      for (const pattern of patterns) {
        if (scriptCommand.toLowerCase().includes(pattern.toLowerCase())) {
          matchingScripts.push(scriptName)
          break // Only add each script once
        }
      }
    }

    return matchingScripts
  }
}

// Type definitions
interface PackageJson {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

interface BuildToolPattern {
  configFiles: readonly string[]
  packageNames: readonly string[]
  buildScriptPatterns: readonly string[]
}
