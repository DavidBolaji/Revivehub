import type {
  AnalysisReport,
  AnalysisData,
  Issue,
  Recommendation,
  LanguageDetectionResult,
  FrameworkDetectionResult,
  BuildToolDetectionResult,
  DependencyAnalysisResult,
  HealthScore
} from '../types'
import { EnhancedHealthScorer, type HealthScoringInput } from './enhanced-health-scorer'

/**
 * ReportGenerator aggregates detection results and generates comprehensive analysis reports
 */
export class ReportGenerator {
  private healthScorer: EnhancedHealthScorer
  private readonly analysisVersion = '1.0.0'

  constructor() {
    this.healthScorer = new EnhancedHealthScorer()
  }

  /**
   * Generate a complete analysis report from detector results
   */
  async generate(analysisData: AnalysisData): Promise<AnalysisReport> {
    const { results, context, metadata } = analysisData

    // Extract detector results
    const languages = this.extractResult<LanguageDetectionResult>(results, 'LanguageDetector')
    const frameworks = this.extractResult<FrameworkDetectionResult>(results, 'FrameworkRecognizer')
    const buildTools = this.extractResult<BuildToolDetectionResult>(results, 'BuildToolDetector')
    const dependencies = this.extractResult<DependencyAnalysisResult>(results, 'DependencyAnalyzer')

    // Get README content for documentation scoring
    const readmeContent = context.contents.get('README.md') || 
                         context.contents.get('readme.md') || 
                         context.contents.get('README') ||
                         undefined

    // Calculate health score (now async to fetch real version data)
    const healthScore = await this.calculateHealthScore({
      languages,
      frameworks,
      buildTools,
      dependencies,
      metadata: context.metadata,
      readmeContent
    })

    // Generate issues and recommendations
    const issues = this.generateIssues({
      dependencies,
      frameworks,
      buildTools,
      languages
    })

    const recommendations = this.generateRecommendations({
      dependencies,
      frameworks,
      buildTools,
      languages,
      healthScore,
      readmeContent
    })

    // Get latest commit SHA (use metadata or default)
    const commitSha = context.metadata.defaultBranch || 'HEAD'

    return {
      repository: {
        owner: context.owner,
        name: context.repo,
        analyzedAt: new Date(),
        commitSha
      },
      languages,
      frameworks,
      buildTools,
      dependencies,
      healthScore,
      issues,
      recommendations,
      metadata: {
        analysisVersion: this.analysisVersion,
        completionStatus: metadata?.completionStatus || 'complete',
        errors: metadata?.errors || []
      }
    }
  }

  /**
   * Extract a specific detector result from the results map
   */
  private extractResult<T>(
    results: Map<string, any>,
    detectorName: string
  ): T {
    const result = results.get(detectorName)
    
    if (!result || !result.success) {
      // Return a failed result with appropriate structure
      return {
        detectorName,
        success: false,
        error: result?.error || {
          code: 'DETECTOR_FAILED',
          message: `${detectorName} failed or did not run`,
          recoverable: true
        }
      } as T
    }

    return result.data as T
  }

  /**
   * Calculate health score from detection results
   */
  private async calculateHealthScore(input: HealthScoringInput): Promise<HealthScore> {
    return await this.healthScorer.calculateHealthScore(input)
  }

  /**
   * Generate issues based on detection findings
   */
  private generateIssues(data: {
    dependencies: DependencyAnalysisResult
    frameworks: FrameworkDetectionResult
    buildTools: BuildToolDetectionResult
    languages: LanguageDetectionResult
  }): Issue[] {
    const issues: Issue[] = []

    // Generate dependency issues
    if (data.dependencies.success) {
      issues.push(...this.generateDependencyIssues(data.dependencies))
    }

    // Generate framework issues
    if (data.frameworks.success) {
      issues.push(...this.generateFrameworkIssues(data.frameworks))
    }

    // Generate build tool issues
    if (data.buildTools.success) {
      issues.push(...this.generateBuildToolIssues(data.buildTools))
    }

    return issues
  }

  /**
   * Generate issues for outdated dependencies
   */
  private generateDependencyIssues(dependencies: DependencyAnalysisResult): Issue[] {
    const issues: Issue[] = []

    // Critical issues for dependencies >2 major versions outdated
    const criticalDeps = dependencies.outdatedDependencies.filter(
      dep => dep.majorVersionsBehind > 2
    )

    if (criticalDeps.length > 0) {
      // Create a detailed list of critical dependencies
      const depList = criticalDeps.map(dep => 
        `${dep.name} (${dep.installedVersion} → ${dep.latestVersion || 'latest'})`
      ).join(', ')

      issues.push({
        severity: 'critical',
        category: 'Dependencies',
        title: `${criticalDeps.length} Critical Outdated Dependencies`,
        description: `Found ${criticalDeps.length} dependencies that are more than 2 major versions behind: ${depList}. These should be updated as soon as possible to avoid security vulnerabilities and compatibility issues.`,
        affectedFiles: this.getDependencyFiles(dependencies)
      })

      // Add individual issues for each critical dependency
      criticalDeps.slice(0, 5).forEach(dep => {
        issues.push({
          severity: 'critical',
          category: 'Dependencies',
          title: `Update ${dep.name}`,
          description: `${dep.name} is ${dep.majorVersionsBehind} major versions behind (current: ${dep.installedVersion}, latest: ${dep.latestVersion || 'unknown'})`,
          affectedFiles: this.getDependencyFiles(dependencies)
        })
      })
    }

    // Warning issues for dependencies 1-2 major versions outdated
    const warningDeps = dependencies.outdatedDependencies.filter(
      dep => dep.majorVersionsBehind >= 1 && dep.majorVersionsBehind <= 2
    )

    if (warningDeps.length > 0) {
      // Create a detailed list of outdated dependencies
      const depList = warningDeps.map(dep => 
        `${dep.name} (${dep.installedVersion} → ${dep.latestVersion || 'latest'})`
      ).join(', ')

      issues.push({
        severity: 'warning',
        category: 'Dependencies',
        title: `${warningDeps.length} Outdated Dependencies`,
        description: `Found ${warningDeps.length} dependencies that are 1-2 major versions behind: ${depList}. Consider updating these to benefit from new features and bug fixes.`,
        affectedFiles: this.getDependencyFiles(dependencies)
      })
    }

    return issues
  }

  /**
   * Generate issues for outdated frameworks with specific upgrade paths
   */
  private generateFrameworkIssues(frameworks: FrameworkDetectionResult): Issue[] {
    const issues: Issue[] = []
    const allFrameworks = [...frameworks.frontend, ...frameworks.backend]

    // Define latest stable versions for popular frameworks
    const latestVersions: Record<string, { version: string; reason: string }> = {
      'React': { 
        version: '18.3.1', 
        reason: 'Latest stable with concurrent features, automatic batching, and improved performance' 
      },
      'Next.js': { 
        version: '15.1.0', 
        reason: 'Latest stable with React 19 support, improved caching, and Turbopack' 
      },
      'Vue': { 
        version: '3.5.0', 
        reason: 'Latest stable with Composition API, better TypeScript support, and performance improvements' 
      },
      'Angular': { 
        version: '18.0.0', 
        reason: 'Latest stable with standalone components, signals, and improved performance' 
      },
      'Svelte': { 
        version: '5.0.0', 
        reason: 'Latest stable with runes, improved reactivity, and better TypeScript support' 
      },
      'Express': { 
        version: '4.21.0', 
        reason: 'Latest stable with security updates and bug fixes' 
      },
      'NestJS': { 
        version: '10.0.0', 
        reason: 'Latest stable with improved performance and new features' 
      },
      'Laravel': { 
        version: '11.0.0', 
        reason: 'Latest stable with improved performance and new features' 
      },
    }

    // Check each framework for upgrades
    for (const fw of allFrameworks) {
      const currentVersion = this.parseVersion(fw.version)
      if (!currentVersion) continue

      const latestInfo = latestVersions[fw.name]
      if (!latestInfo) continue

      const latestVersion = this.parseVersion(latestInfo.version)
      if (!latestVersion) continue

      // Check if upgrade is needed
      if (currentVersion.major < latestVersion.major || 
          (currentVersion.major === latestVersion.major && currentVersion.minor < latestVersion.minor)) {
        
        const severity = currentVersion.major < latestVersion.major ? 'warning' : 'info'
        
        issues.push({
          severity,
          category: 'Frameworks',
          title: `Upgrade ${fw.name} from ${fw.version} to ${latestInfo.version}`,
          description: `Your project uses ${fw.name} ${fw.version}. Upgrade to ${latestInfo.version} for: ${latestInfo.reason}`,
          affectedFiles: fw.configFiles
        })
      }
    }

    return issues
  }

  /**
   * Generate issues for build tool recommendations based on project type
   */
  private generateBuildToolIssues(buildTools: BuildToolDetectionResult): Issue[] {
    const issues: Issue[] = []

    // Detect project type from languages
    const languages = this.detectProjectLanguages()
    const projectType = this.determineProjectType(languages, buildTools)

    if (buildTools.buildTools.length === 0) {
      // Recommend specific build tool based on project type
      const recommendation = this.recommendBuildTool(projectType)
      
      issues.push({
        severity: 'info',
        category: 'Build Tools',
        title: `Add ${recommendation.tool} for ${projectType} Project`,
        description: `No build tools detected. For ${projectType} projects, add ${recommendation.tool}: ${recommendation.reason}`,
        affectedFiles: recommendation.configFiles
      })
      return issues
    }

    // Check for outdated build tools
    const hasWebpack = buildTools.buildTools.some(t => t.name === 'Webpack')
    const hasModernTool = buildTools.buildTools.some(t => ['Vite', 'esbuild', 'Turbopack'].includes(t.name))

    if (hasWebpack && !hasModernTool && projectType !== 'PHP') {
      issues.push({
        severity: 'info',
        category: 'Build Tools',
        title: 'Migrate from Webpack to Vite',
        description: 'Your project uses Webpack. Migrate to Vite for 10-100x faster builds, instant HMR, and better developer experience. Vite is production-ready and widely adopted.',
        affectedFiles: ['webpack.config.js', 'package.json']
      })
    }

    // Check for missing config files
    const toolsWithoutConfig = buildTools.buildTools.filter(tool => !tool.configFile)
    if (toolsWithoutConfig.length > 0) {
      toolsWithoutConfig.forEach(tool => {
        const configRecommendation = this.getConfigRecommendation(tool.name)
        issues.push({
          severity: 'info',
          category: 'Build Tools',
          title: `Add ${tool.name} Configuration`,
          description: `${tool.name} detected but no configuration file found. Create ${configRecommendation.file} to: ${configRecommendation.benefits}`,
          affectedFiles: [configRecommendation.file]
        })
      })
    }

    // Check for missing build scripts
    const toolsWithoutScripts = buildTools.buildTools.filter(tool => tool.buildScripts.length === 0)
    if (toolsWithoutScripts.length > 0) {
      issues.push({
        severity: 'info',
        category: 'Build Tools',
        title: 'Add Build Scripts to package.json',
        description: `Add build scripts for ${toolsWithoutScripts.map(t => t.name).join(', ')}: "build", "dev", "preview" for consistent development workflow.`,
        affectedFiles: ['package.json']
      })
    }

    return issues
  }

  /**
   * Detect project languages from context
   */
  private detectProjectLanguages(): string[] {
    // This would be populated from the analysis context
    // For now, return empty array - will be enhanced when context is available
    return []
  }

  /**
   * Determine project type based on languages and existing tools
   */
  private determineProjectType(languages: string[], buildTools: BuildToolDetectionResult): string {
    // Check for PHP
    if (languages.includes('PHP')) return 'PHP'
    
    // Check for Python
    if (languages.includes('Python')) return 'Python'
    
    // Check for Go
    if (languages.includes('Go')) return 'Go'
    
    // Check for Rust
    if (languages.includes('Rust')) return 'Rust'
    
    // Check for Ruby
    if (languages.includes('Ruby')) return 'Ruby'
    
    // Check for framework-specific types
    const hasReact = buildTools.buildTools.some(t => 
      t.name.includes('React') || t.name.includes('Next')
    )
    if (hasReact) return 'React/Next.js'
    
    const hasVue = buildTools.buildTools.some(t => t.name.includes('Vue'))
    if (hasVue) return 'Vue'
    
    const hasAngular = buildTools.buildTools.some(t => t.name.includes('Angular'))
    if (hasAngular) return 'Angular'
    
    // Default to JavaScript/TypeScript
    if (languages.includes('TypeScript') || languages.includes('JavaScript')) {
      return 'JavaScript/TypeScript'
    }
    
    return 'Web'
  }

  /**
   * Recommend build tool based on project type
   */
  private recommendBuildTool(projectType: string): { 
    tool: string
    reason: string
    configFiles: string[]
  } {
    const recommendations: Record<string, { tool: string; reason: string; configFiles: string[] }> = {
      'React/Next.js': {
        tool: 'Vite',
        reason: 'Lightning-fast HMR, optimized builds, and excellent React support. Next.js has built-in Turbopack.',
        configFiles: ['vite.config.ts', 'package.json']
      },
      'Vue': {
        tool: 'Vite',
        reason: 'Created by Vue team, instant server start, lightning-fast HMR, and optimized builds.',
        configFiles: ['vite.config.ts', 'package.json']
      },
      'Angular': {
        tool: 'Angular CLI with esbuild',
        reason: 'Official Angular tooling with esbuild for 10x faster builds.',
        configFiles: ['angular.json', 'package.json']
      },
      'PHP': {
        tool: 'Laravel Mix or Vite',
        reason: 'Laravel Mix for traditional PHP apps, Vite for modern Laravel with Inertia.js.',
        configFiles: ['webpack.mix.js', 'vite.config.js']
      },
      'Python': {
        tool: 'setuptools or Poetry',
        reason: 'Modern Python packaging with dependency management and build automation.',
        configFiles: ['pyproject.toml', 'setup.py']
      },
      'Go': {
        tool: 'Go build',
        reason: 'Native Go toolchain with fast compilation and cross-platform support.',
        configFiles: ['go.mod', 'Makefile']
      },
      'Rust': {
        tool: 'Cargo',
        reason: 'Official Rust build tool with dependency management and testing.',
        configFiles: ['Cargo.toml']
      },
      'JavaScript/TypeScript': {
        tool: 'Vite',
        reason: 'Modern, fast, and framework-agnostic. Works with vanilla JS, TypeScript, and any framework.',
        configFiles: ['vite.config.ts', 'package.json']
      },
    }

    return recommendations[projectType] || recommendations['JavaScript/TypeScript']
  }

  /**
   * Get configuration recommendation for a build tool
   */
  private getConfigRecommendation(toolName: string): { file: string; benefits: string } {
    const configs: Record<string, { file: string; benefits: string }> = {
      'Vite': {
        file: 'vite.config.ts',
        benefits: 'customize plugins, define aliases, configure build options, and optimize for production'
      },
      'Webpack': {
        file: 'webpack.config.js',
        benefits: 'configure loaders, plugins, optimization, and output settings'
      },
      'esbuild': {
        file: 'esbuild.config.js',
        benefits: 'configure entry points, output format, and build options'
      },
      'Rollup': {
        file: 'rollup.config.js',
        benefits: 'configure plugins, output formats, and tree-shaking options'
      },
      'Turbopack': {
        file: 'next.config.js',
        benefits: 'enable Turbopack, configure build options, and optimize performance'
      },
    }

    return configs[toolName] || {
      file: `${toolName.toLowerCase()}.config.js`,
      benefits: 'customize build behavior and optimize for your project'
    }
  }

  /**
   * Generate recommendations based on analysis results
   */
  private generateRecommendations(data: {
    dependencies: DependencyAnalysisResult
    frameworks: FrameworkDetectionResult
    buildTools: BuildToolDetectionResult
    languages: LanguageDetectionResult
    healthScore: HealthScore
    readmeContent?: string
  }): Recommendation[] {
    const recommendations: Recommendation[] = []

    // Generate dependency recommendations
    if (data.dependencies.success) {
      recommendations.push(...this.generateDependencyRecommendations(data.dependencies))
    }

    // Generate framework recommendations
    if (data.frameworks.success) {
      recommendations.push(...this.generateFrameworkRecommendations(data.frameworks))
    }

    // Generate documentation recommendations
    recommendations.push(...this.generateDocumentationRecommendations(data.readmeContent))

    // Generate code quality recommendations
    if (data.languages.success) {
      recommendations.push(...this.generateCodeQualityRecommendations(data.languages))
    }

    // Generate build tool recommendations
    if (data.buildTools.success) {
      recommendations.push(...this.generateBuildToolRecommendations(data.buildTools))
    }

    return recommendations
  }

  /**
   * Generate recommendations for dependency updates
   */
  private generateDependencyRecommendations(dependencies: DependencyAnalysisResult): Recommendation[] {
    const recommendations: Recommendation[] = []

    const criticalDeps = dependencies.outdatedDependencies.filter(
      dep => dep.majorVersionsBehind > 2
    )

    if (criticalDeps.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Dependencies',
        title: 'Update Critical Dependencies',
        description: `${criticalDeps.length} dependencies are critically outdated (>2 major versions behind): ${criticalDeps.map(d => d.name).join(', ')}. Updating these will improve security and stability.`,
        actionItems: [
          'Review breaking changes in dependency changelogs',
          'Update dependencies one at a time to isolate issues',
          'Run tests after each update to ensure compatibility',
          ...criticalDeps.slice(0, 5).map(dep => 
            `Update ${dep.name} from ${dep.installedVersion} to ${dep.latestVersion || 'latest'}`
          )
        ],
        estimatedEffort: 'high'
      })
    }

    const moderateDeps = dependencies.outdatedDependencies.filter(
      dep => dep.majorVersionsBehind >= 1 && dep.majorVersionsBehind <= 2
    )

    if (moderateDeps.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Dependencies',
        title: 'Update Outdated Dependencies',
        description: `${moderateDeps.length} dependencies are moderately outdated: ${moderateDeps.map(d => d.name).join(', ')}. Consider updating to benefit from bug fixes and new features.`,
        actionItems: [
          'Check for breaking changes in release notes',
          'Update dependencies in batches',
          'Test thoroughly after updates',
          ...moderateDeps.slice(0, 5).map(dep => 
            `Update ${dep.name} from ${dep.installedVersion} to ${dep.latestVersion || 'latest'}`
          )
        ],
        estimatedEffort: 'medium'
      })
    }

    return recommendations
  }

  /**
   * Generate recommendations for framework upgrades
   */
  private generateFrameworkRecommendations(frameworks: FrameworkDetectionResult): Recommendation[] {
    const recommendations: Recommendation[] = []
    const allFrameworks = [...frameworks.frontend, ...frameworks.backend]

    const outdatedFrameworks = allFrameworks.filter(fw => {
      const version = this.parseVersion(fw.version)
      return version && version.major < 3
    })

    if (outdatedFrameworks.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Frameworks',
        title: 'Upgrade Framework Versions',
        description: `${outdatedFrameworks.length} framework(s) are using older versions. Upgrading will provide better performance and new features.`,
        actionItems: [
          'Review migration guides for each framework',
          'Set up a test environment for upgrades',
          'Update one framework at a time',
          ...outdatedFrameworks.map(fw => 
            `Upgrade ${fw.name} from version ${fw.version}`
          )
        ],
        estimatedEffort: 'high'
      })
    }

    return recommendations
  }

  /**
   * Generate recommendations for documentation improvements
   */
  private generateDocumentationRecommendations(readmeContent?: string): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (!readmeContent) {
      recommendations.push({
        priority: 'low',
        category: 'Documentation',
        title: 'Add README Documentation',
        description: 'No README file found. Adding documentation will help other developers understand and contribute to the project.',
        actionItems: [
          'Create a README.md file',
          'Add project description and purpose',
          'Include installation instructions',
          'Document usage examples',
          'Add contribution guidelines'
        ],
        estimatedEffort: 'low'
      })
    } else if (readmeContent.length < 500) {
      recommendations.push({
        priority: 'low',
        category: 'Documentation',
        title: 'Expand README Documentation',
        description: 'README exists but is minimal. Expanding it will improve project accessibility.',
        actionItems: [
          'Add more detailed project description',
          'Include setup and installation steps',
          'Add usage examples and code snippets',
          'Document API or main features',
          'Add troubleshooting section'
        ],
        estimatedEffort: 'low'
      })
    }

    return recommendations
  }

  /**
   * Generate recommendations for code quality improvements
   */
  private generateCodeQualityRecommendations(languages: LanguageDetectionResult): Recommendation[] {
    const recommendations: Recommendation[] = []

    const tsLang = languages.languages.find(l => l.name === 'TypeScript')
    const jsLang = languages.languages.find(l => l.name === 'JavaScript')

    // Recommend TypeScript adoption if using JavaScript
    if (jsLang && !tsLang) {
      recommendations.push({
        priority: 'medium',
        category: 'Code Quality',
        title: 'Adopt TypeScript',
        description: 'Project is using JavaScript. Migrating to TypeScript will improve type safety and developer experience.',
        actionItems: [
          'Install TypeScript and type definitions',
          'Add tsconfig.json configuration',
          'Rename .js files to .ts incrementally',
          'Add type annotations to functions',
          'Enable strict mode gradually'
        ],
        estimatedEffort: 'high'
      })
    } else if (jsLang && tsLang) {
      const tsLoc = tsLang.linesOfCode
      const jsLoc = jsLang.linesOfCode
      const tsRatio = tsLoc / (tsLoc + jsLoc)

      if (tsRatio < 0.5) {
        recommendations.push({
          priority: 'low',
          category: 'Code Quality',
          title: 'Increase TypeScript Coverage',
          description: `Project has ${Math.round(tsRatio * 100)}% TypeScript coverage. Consider migrating more JavaScript files to TypeScript.`,
          actionItems: [
            'Identify JavaScript files that can be migrated',
            'Convert files to TypeScript incrementally',
            'Add type definitions for untyped code',
            'Enable stricter TypeScript compiler options'
          ],
          estimatedEffort: 'medium'
        })
      }
    }

    return recommendations
  }

  /**
   * Generate recommendations for build tool improvements
   */
  private generateBuildToolRecommendations(buildTools: BuildToolDetectionResult): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (buildTools.buildTools.length === 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Build Tools',
        title: 'Add Modern Build Tool',
        description: 'No build tools detected. Adding a modern build tool will improve development experience and production builds.',
        actionItems: [
          'Choose a build tool (Vite recommended for modern projects)',
          'Install build tool dependencies',
          'Create configuration file',
          'Add build scripts to package.json',
          'Configure for development and production'
        ],
        estimatedEffort: 'medium'
      })
    } else {
      // Check if using older build tools
      const hasWebpack = buildTools.buildTools.some(t => t.name === 'Webpack')
      const hasModernTool = buildTools.buildTools.some(t => 
        ['Vite', 'esbuild', 'Turbopack'].includes(t.name)
      )

      if (hasWebpack && !hasModernTool) {
        recommendations.push({
          priority: 'low',
          category: 'Build Tools',
          title: 'Consider Modern Build Tool',
          description: 'Project uses Webpack. Consider migrating to Vite or esbuild for faster build times.',
          actionItems: [
            'Evaluate Vite or esbuild for your use case',
            'Set up new build tool in parallel',
            'Migrate configuration incrementally',
            'Compare build performance',
            'Switch when confident in new setup'
          ],
          estimatedEffort: 'medium'
        })
      }
    }

    return recommendations
  }

  /**
   * Get dependency file paths based on ecosystem
   */
  private getDependencyFiles(dependencies: DependencyAnalysisResult): string[] {
    const files: string[] = []
    const ecosystems = new Set(
      [...dependencies.dependencies, ...dependencies.devDependencies].map(d => d.ecosystem)
    )

    if (ecosystems.has('npm')) files.push('package.json')
    if (ecosystems.has('pip')) files.push('requirements.txt')
    if (ecosystems.has('gem')) files.push('Gemfile')
    if (ecosystems.has('composer')) files.push('composer.json')

    return files
  }

  /**
   * Parse semantic version string
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
}
