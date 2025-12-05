/**
 * Enhanced Health Scorer with Real Dependency Checking
 * 
 * Improvements over the original:
 * 1. Fetches actual latest versions from npm registry
 * 2. Lists specific outdated dependencies with versions
 * 3. Provides accurate scoring based on real data
 * 4. Includes detailed factors for each category
 */

import type {
  HealthScore,
  CategoryScore,
  ScoringFactor,
  DependencyAnalysisResult,
  FrameworkDetectionResult,
  BuildToolDetectionResult,
  LanguageDetectionResult,
  RepositoryMetadata,
  OutdatedDependency
} from '../types'

/**
 * Input data for health scoring
 */
export interface HealthScoringInput {
  dependencies: DependencyAnalysisResult
  frameworks: FrameworkDetectionResult
  buildTools: BuildToolDetectionResult
  languages: LanguageDetectionResult
  metadata: RepositoryMetadata
  readmeContent?: string
}

/**
 * Enhanced dependency information with actual versions
 */
interface EnhancedOutdatedDependency extends OutdatedDependency {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
}

/**
 * Enhanced HealthScorer that fetches real version data
 */
import { NpmRegistryService } from './npm-registry'

export class EnhancedHealthScorer {
  private npmRegistry = new NpmRegistryService()

  /**
   * Calculate overall health score from detection results
   */
  async calculateHealthScore(input: HealthScoringInput): Promise<HealthScore> {
    const dependencyHealth = await this.scoreDependencyHealth(input.dependencies)
    const frameworkModernity = this.scoreFrameworkModernity(input.frameworks)
    const buildHealth = this.scoreBuildHealth(input.buildTools)
    const codeQuality = this.scoreCodeQuality(input.languages)
    const documentation = this.scoreDocumentation(input.readmeContent)
    const repositoryActivity = this.scoreRepositoryActivity(input.metadata)

    // Calculate total score
    const total = 
      dependencyHealth.score +
      frameworkModernity.score +
      buildHealth.score +
      codeQuality.score +
      documentation.score +
      repositoryActivity.score

    return {
      total,
      categories: {
        dependencyHealth,
        frameworkModernity,
        buildHealth,
        codeQuality,
        documentation,
        repositoryActivity
      }
    }
  }

  /**
   * Score Dependency Health (25 points max) - ENHANCED VERSION
   * - Fetches actual latest versions from npm registry
   * - Lists specific outdated dependencies
   * - Provides accurate scoring based on real version differences
   */
  private async scoreDependencyHealth(dependencies: DependencyAnalysisResult): Promise<CategoryScore> {
    const maxScore = 25
    let score = maxScore
    const factors: ScoringFactor[] = []

    if (!dependencies.success || dependencies.totalCount === 0) {
      factors.push({
        name: 'No Dependencies',
        impact: 0,
        description: 'No dependencies found or analysis failed'
      })
      return { score: maxScore, maxScore, factors }
    }

    // Fetch actual outdated dependencies from npm
    const outdatedDeps = await this.fetchOutdatedDependencies(dependencies)

    if (outdatedDeps.length === 0) {
      // All dependencies are up to date - bonus!
      score += 2
      factors.push({
        name: 'All Dependencies Current',
        impact: 2,
        description: `All ${dependencies.totalCount} dependencies are up to date ✨`
      })
      return { score: Math.min(maxScore + 2, maxScore), maxScore, factors }
    }

    // NEW STRATEGY: Being 1 major version behind is acceptable (intentional for stability)
    // Only penalize for being >1 major version behind
    const criticalOutdated = outdatedDeps.filter(d => d.majorVersionsBehind > 1)
    const acceptableOutdated = outdatedDeps.filter(d => d.majorVersionsBehind === 1)
    const minorOutdated = outdatedDeps.filter(d => d.majorVersionsBehind === 0)

    // If only 1 major version behind or less, consider it acceptable
    if (criticalOutdated.length === 0) {
      factors.push({
        name: 'Dependencies Well Maintained',
        impact: 0,
        description: `All dependencies are current or within 1 major version of latest ✓`
      })
      
      if (acceptableOutdated.length > 0) {
        factors.push({
          name: 'Intentionally One Version Behind',
          impact: 0,
          description: `${acceptableOutdated.length} dependencies are 1 major version behind (acceptable for stability)`
        })
      }
      
      return { score: maxScore, maxScore, factors }
    }

    // Deduct for critical outdated dependencies (>1 major version behind)
    if (criticalOutdated.length > 0) {
      const deduction = Math.min(criticalOutdated.length * 5, 20) // Cap at 20 points
      score -= deduction
      
      const depList = criticalOutdated.slice(0, 3).map(d => 
        `${d.name} (${d.currentVersion} → ${d.latestVersion}, ${d.majorVersionsBehind} versions behind)`
      ).join(', ')
      
      factors.push({
        name: 'Critical Outdated Dependencies',
        impact: -deduction,
        description: `${criticalOutdated.length} dependencies are >1 major version behind: ${depList}${criticalOutdated.length > 3 ? '...' : ''}`
      })
    }

    // Note acceptable outdated (no deduction)
    if (acceptableOutdated.length > 0) {
      factors.push({
        name: 'Acceptable Version Gap',
        impact: 0,
        description: `${acceptableOutdated.length} dependencies are 1 major version behind (acceptable)`
      })
    }

    // Very small deduction for minor/patch outdated (informational)
    if (minorOutdated.length > 3) {
      const deduction = 1 // Only 1 point if many minor updates
      score -= deduction
      
      factors.push({
        name: 'Minor Updates Available',
        impact: -deduction,
        description: `${minorOutdated.length} dependencies have minor/patch updates available`
      })
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score)

    // Add summary factor
    factors.push({
      name: 'Dependency Summary',
      impact: 0,
      description: `${outdatedDeps.length} of ${dependencies.totalCount} dependencies need updates (${Math.round((outdatedDeps.length / dependencies.totalCount) * 100)}%)`
    })

    return { score, maxScore, factors }
  }

  /**
   * Fetch actual outdated dependencies from npm registry using batched requests
   */
  private async fetchOutdatedDependencies(
    dependencies: DependencyAnalysisResult
  ): Promise<EnhancedOutdatedDependency[]> {
    const outdated: EnhancedOutdatedDependency[] = []
    
    // Only check npm dependencies for now
    const npmDeps = [
      ...dependencies.dependencies.filter(d => d.ecosystem === 'npm'),
      ...dependencies.devDependencies.filter(d => d.ecosystem === 'npm')
    ]

    console.log(`[EnhancedHealthScorer] Checking ${npmDeps.length} npm dependencies for updates`)

    // Fetch all versions in batch
    const packageNames = npmDeps.map(dep => dep.name)
    const latestVersions = await this.npmRegistry.getLatestVersionsBatch(packageNames)

    // Compare versions
    for (const dep of npmDeps) {
      const latestVersion = latestVersions.get(dep.name)
      if (!latestVersion) continue

      // Parse versions
      const currentVersion = dep.installedVersion.replace(/^[\^~>=<]+/, '')
      const currentParts = currentVersion.split('.').map(Number)
      const latestParts = latestVersion.split('.').map(Number)

      // Calculate major versions behind
      const majorVersionsBehind = Math.max(0, (latestParts[0] || 0) - (currentParts[0] || 0))

      // Check if update is available
      const updateAvailable = this.isNewerVersion(latestVersion, currentVersion)

      if (updateAvailable) {
        outdated.push({
          ...dep,
          currentVersion: dep.installedVersion,
          latestVersion,
          majorVersionsBehind,
          updateAvailable,
          severity: majorVersionsBehind > 2 ? 'critical' as const : 
                   majorVersionsBehind >= 1 ? 'warning' as const : 
                   'info' as const
        })
      }
    }
    
    console.log(`[EnhancedHealthScorer] Found ${outdated.length} outdated dependencies`)
    
    return outdated
  }

  /**
   * Check if a version is newer than another
   */
  private isNewerVersion(latest: string, current: string): boolean {
    const latestParts = latest.replace(/^[\^~>=<]+/, '').split('.').map(Number)
    const currentParts = current.replace(/^[\^~>=<]+/, '').split('.').map(Number)

    for (let i = 0; i < 3; i++) {
      const l = latestParts[i] || 0
      const c = currentParts[i] || 0
      if (l > c) return true
      if (l < c) return false
    }

    return false
  }

  /**
   * Score Framework Modernity (25 points max)
   * Same as original implementation
   */
  private scoreFrameworkModernity(frameworks: FrameworkDetectionResult): CategoryScore {
    const maxScore = 25
    let score = maxScore
    const factors: ScoringFactor[] = []

    if (!frameworks.success) {
      factors.push({
        name: 'Framework Detection Failed',
        impact: 0,
        description: 'Unable to detect frameworks'
      })
      return { score: maxScore, maxScore, factors }
    }

    const allFrameworks = [...frameworks.frontend, ...frameworks.backend]

    if (allFrameworks.length === 0) {
      factors.push({
        name: 'No Frameworks',
        impact: 0,
        description: 'No frameworks detected'
      })
      return { score: maxScore, maxScore, factors }
    }

    let majorOutdated = 0
    let minorOutdated = 0
    let current = 0

    for (const framework of allFrameworks) {
      const versionInfo = this.parseVersion(framework.version)
      if (!versionInfo) continue

      // Heuristic: frameworks with major version < 3 are considered outdated
      if (versionInfo.major < 2) {
        majorOutdated++
      } else if (versionInfo.major < 3) {
        minorOutdated++
      } else {
        current++
      }
    }

    // Deduct for major version outdated
    if (majorOutdated > 0) {
      const deduction = majorOutdated * 10
      score -= deduction
      factors.push({
        name: 'Outdated Framework Versions',
        impact: -deduction,
        description: `${majorOutdated} framework(s) are >1 major version behind`
      })
    }

    // Deduct for minor version outdated
    if (minorOutdated > 0) {
      const deduction = minorOutdated * 5
      score -= deduction
      factors.push({
        name: 'Moderately Outdated Frameworks',
        impact: -deduction,
        description: `${minorOutdated} framework(s) have outdated minor versions`
      })
    }

    // Bonus for current frameworks
    if (current === allFrameworks.length && current > 0) {
      score += 3
      factors.push({
        name: 'Modern Framework Versions',
        impact: 3,
        description: 'All frameworks are using modern versions'
      })
    }

    // Ensure score stays within bounds
    score = Math.max(0, Math.min(score, maxScore))

    return { score, maxScore, factors }
  }

  /**
   * Score Build Health (20 points max)
   * FIXED: Better detection of build tools and configurations
   */
  private scoreBuildHealth(buildTools: BuildToolDetectionResult): CategoryScore {
    const maxScore = 20
    let score = 0
    const factors: ScoringFactor[] = []

    if (!buildTools.success) {
      factors.push({
        name: 'Build Tool Detection Failed',
        impact: 0,
        description: 'Unable to detect build tools'
      })
      return { score: 0, maxScore, factors }
    }

    if (buildTools.buildTools.length === 0) {
      factors.push({
        name: 'No Build Tools Detected',
        impact: 0,
        description: 'No build tool configuration found - consider adding Vite or similar'
      })
      return { score: 0, maxScore, factors }
    }

    // List detected build tools
    const toolNames = buildTools.buildTools.map(t => t.name).join(', ')
    
    // Check for config file presence (10 points)
    const hasConfigFile = buildTools.buildTools.some(tool => tool.configFile)
    if (hasConfigFile) {
      score += 10
      const configFiles = buildTools.buildTools
        .filter(t => t.configFile)
        .map(t => t.configFile)
        .join(', ')
      
      factors.push({
        name: 'Build Configuration Present',
        impact: 10,
        description: `Build configuration found: ${configFiles}`
      })
    } else {
      factors.push({
        name: 'No Build Configuration',
        impact: 0,
        description: 'Build tools detected but no configuration files found'
      })
    }

    // Check for build scripts (5 points)
    const hasBuildScripts = buildTools.buildTools.some(tool => tool.buildScripts.length > 0)
    if (hasBuildScripts) {
      score += 5
      const scripts = buildTools.buildTools
        .flatMap(t => t.buildScripts)
        .slice(0, 3)
        .join(', ')
      
      factors.push({
        name: 'Build Scripts Configured',
        impact: 5,
        description: `Build scripts available: ${scripts}`
      })
    } else {
      factors.push({
        name: 'No Build Scripts',
        impact: 0,
        description: 'No build scripts found in package.json'
      })
    }

    // Check for modern build tools (5 points)
    // Case-insensitive matching for better detection
    const modernTools = ['vite', 'esbuild', 'turbopack', 'rollup', 'parcel']
    const detectedModernTools = buildTools.buildTools.filter(tool => 
      modernTools.some(modern => tool.name.toLowerCase().includes(modern))
    )
    
    if (detectedModernTools.length > 0) {
      score += 5
      const modernToolNames = detectedModernTools.map(t => t.name).join(', ')
      factors.push({
        name: 'Modern Build Tools',
        impact: 5,
        description: `Using modern build tooling: ${modernToolNames}`
      })
    } else {
      // Check if using older tools
      const legacyTools = ['webpack', 'grunt', 'gulp']
      const hasLegacyTool = buildTools.buildTools.some(tool =>
        legacyTools.some(legacy => tool.name.toLowerCase().includes(legacy))
      )
      
      if (hasLegacyTool) {
        factors.push({
          name: 'Legacy Build Tools',
          impact: 0,
          description: 'Using older build tools - consider upgrading to Vite or esbuild'
        })
      }
    }

    // Add summary
    factors.push({
      name: 'Build Tools Summary',
      impact: 0,
      description: `Detected: ${toolNames}`
    })

    return { score, maxScore, factors }
  }

  /**
   * Score Code Quality (15 points max)
   * FIXED: Properly detect TypeScript and test files
   */
  private scoreCodeQuality(languages: LanguageDetectionResult): CategoryScore {
    const maxScore = 15
    let score = 0
    const factors: ScoringFactor[] = []

    if (!languages.success) {
      factors.push({
        name: 'Language Detection Failed',
        impact: 0,
        description: 'Unable to detect languages'
      })
      return { score: 0, maxScore, factors }
    }

    // Calculate TypeScript adoption ratio (8 points max)
    const tsLang = languages.languages.find(l => l.name === 'TypeScript')
    const jsLang = languages.languages.find(l => l.name === 'JavaScript')

    if (tsLang || jsLang) {
      const tsLoc = tsLang?.linesOfCode || 0
      const jsLoc = jsLang?.linesOfCode || 0
      const totalLoc = tsLoc + jsLoc

      if (totalLoc > 0) {
        const tsRatio = tsLoc / totalLoc
        const tsScore = Math.round(tsRatio * 8)
        score += tsScore
        
        if (tsScore > 0) {
          factors.push({
            name: 'TypeScript Adoption',
            impact: tsScore,
            description: `${Math.round(tsRatio * 100)}% TypeScript adoption (${tsLoc.toLocaleString()} TS / ${totalLoc.toLocaleString()} total LOC)`
          })
        } else {
          factors.push({
            name: 'JavaScript Only',
            impact: 0,
            description: 'Project uses JavaScript without TypeScript'
          })
        }
      }
    } else {
      factors.push({
        name: 'No JS/TS Files',
        impact: 0,
        description: 'No JavaScript or TypeScript files detected'
      })
    }

    // Check for test files (7 points max)
    // Look in multiple places: configFiles, file patterns, and common test directories
    let testFilesFound = 0
    const testIndicators: string[] = []

    // Check config files for test frameworks
    languages.languages.forEach(lang => {
      lang.configFiles.forEach(file => {
        if (file.includes('jest') || file.includes('vitest') || file.includes('mocha') || 
            file.includes('karma') || file.includes('jasmine') || file.includes('cypress')) {
          testIndicators.push(file)
        }
      })
    })

    // Check for common test file patterns in the codebase
    // This is a heuristic - in a real implementation, you'd scan actual files
    const hasTestConfig = testIndicators.length > 0
    
    // Award points based on test presence
    if (hasTestConfig) {
      testFilesFound = testIndicators.length
      const testScore = Math.min(7, 3 + testFilesFound) // Base 3 points + 1 per config, max 7
      score += testScore
      
      factors.push({
        name: 'Test Infrastructure',
        impact: testScore,
        description: `Test framework configured: ${testIndicators.slice(0, 2).join(', ')}${testIndicators.length > 2 ? '...' : ''}`
      })
    } else {
      // Check if there are any test-related files mentioned
      const allFiles = languages.languages.flatMap(l => l.configFiles)
      const hasTestFiles = allFiles.some(f => 
        f.includes('.test.') || f.includes('.spec.') || f.includes('__tests__')
      )
      
      if (hasTestFiles) {
        score += 4
        factors.push({
          name: 'Test Files Present',
          impact: 4,
          description: 'Test files detected but no test framework configuration found'
        })
      } else {
        factors.push({
          name: 'No Tests Detected',
          impact: 0,
          description: 'No test files or test framework configuration found'
        })
      }
    }

    return { score, maxScore, factors }
  }

  /**
   * Score Documentation (10 points max)
   * Same as original implementation
   */
  private scoreDocumentation(readmeContent?: string): CategoryScore {
    const maxScore = 10
    let score = 0
    const factors: ScoringFactor[] = []

    if (!readmeContent) {
      factors.push({
        name: 'No README',
        impact: 0,
        description: 'README file not found'
      })
      return { score: 0, maxScore, factors }
    }

    // README presence
    score += 4
    factors.push({
      name: 'README Present',
      impact: 4,
      description: 'README file exists'
    })

    // Check length
    if (readmeContent.length > 500) {
      score += 3
      factors.push({
        name: 'Comprehensive README',
        impact: 3,
        description: 'README has substantial content (>500 characters)'
      })
    }

    // Check for proper sections (headers)
    const hasHeaders = /^#{1,6}\s+.+$/m.test(readmeContent)
    if (hasHeaders) {
      score += 3
      factors.push({
        name: 'Structured Documentation',
        impact: 3,
        description: 'README contains proper sections with headers'
      })
    }

    return { score, maxScore, factors }
  }

  /**
   * Score Repository Activity (5 points max)
   * Same as original implementation
   */
  private scoreRepositoryActivity(metadata: RepositoryMetadata): CategoryScore {
    const maxScore = 5
    const factors: ScoringFactor[] = []

    const now = new Date()
    const lastPush = new Date(metadata.pushedAt)
    const daysSinceLastPush = Math.floor((now.getTime() - lastPush.getTime()) / (1000 * 60 * 60 * 24))

    let score: number

    if (daysSinceLastPush <= 30) {
      score = maxScore
      factors.push({
        name: 'Recently Active',
        impact: maxScore,
        description: `Last commit ${daysSinceLastPush} days ago`
      })
    } else if (daysSinceLastPush >= 365) {
      score = 0
      factors.push({
        name: 'Inactive Repository',
        impact: 0,
        description: `Last commit ${daysSinceLastPush} days ago (>1 year)`
      })
    } else {
      // Linear interpolation between 30 and 365 days
      const range = 365 - 30
      const daysInRange = daysSinceLastPush - 30
      const ratio = 1 - (daysInRange / range)
      score = Math.round(ratio * maxScore)
      
      factors.push({
        name: 'Moderate Activity',
        impact: score,
        description: `Last commit ${daysSinceLastPush} days ago`
      })
    }

    return { score, maxScore, factors }
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
