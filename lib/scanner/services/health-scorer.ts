import type {
  HealthScore,
  CategoryScore,
  ScoringFactor,
  DependencyAnalysisResult,
  FrameworkDetectionResult,
  BuildToolDetectionResult,
  LanguageDetectionResult,
  RepositoryMetadata
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
 * HealthScorer calculates repository health scores across multiple categories
 */
export class HealthScorer {
  /**
   * Calculate overall health score from detection results
   */
  calculateHealthScore(input: HealthScoringInput): HealthScore {
    const dependencyHealth = this.scoreDependencyHealth(input.dependencies)
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
   * Score Dependency Health (25 points max)
   * - Deduct 5 points per dependency >2 versions outdated
   * - Deduct 3 points per dependency 1-2 versions outdated
   * - Bonus +2 if all dependencies are current
   */
  private scoreDependencyHealth(dependencies: DependencyAnalysisResult): CategoryScore {
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

    const outdated = dependencies.outdatedDependencies
    const criticalOutdated = outdated.filter(d => d.majorVersionsBehind > 2)
    const moderateOutdated = outdated.filter(d => d.majorVersionsBehind >= 1 && d.majorVersionsBehind <= 2)

    // Deduct for critical outdated dependencies
    if (criticalOutdated.length > 0) {
      const deduction = criticalOutdated.length * 5
      score -= deduction
      factors.push({
        name: 'Critical Outdated Dependencies',
        impact: -deduction,
        description: `${criticalOutdated.length} dependencies are >2 major versions behind`
      })
    }

    // Deduct for moderate outdated dependencies
    if (moderateOutdated.length > 0) {
      const deduction = moderateOutdated.length * 3
      score -= deduction
      factors.push({
        name: 'Moderate Outdated Dependencies',
        impact: -deduction,
        description: `${moderateOutdated.length} dependencies are 1-2 major versions behind`
      })
    }

    // Bonus for all current dependencies
    if (outdated.length === 0 && dependencies.totalCount > 0) {
      score += 2
      factors.push({
        name: 'All Dependencies Current',
        impact: 2,
        description: 'All dependencies are up to date'
      })
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score)

    return { score, maxScore, factors }
  }

  /**
   * Score Framework Modernity (25 points max)
   * - Deduct 10 points per framework >1 major version behind
   * - Deduct 5 points for outdated minor versions
   * - Bonus +3 for latest versions
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
   * - 10 points for config file presence
   * - 5 points for build scripts
   * - 5 points for modern build tools
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
        name: 'No Build Tools',
        impact: 0,
        description: 'No build tools detected'
      })
      return { score: 0, maxScore, factors }
    }

    // Check for config file presence
    const hasConfigFile = buildTools.buildTools.some(tool => tool.configFile)
    if (hasConfigFile) {
      score += 10
      factors.push({
        name: 'Build Configuration Present',
        impact: 10,
        description: 'Build tool configuration files found'
      })
    }

    // Check for build scripts
    const hasBuildScripts = buildTools.buildTools.some(tool => tool.buildScripts.length > 0)
    if (hasBuildScripts) {
      score += 5
      factors.push({
        name: 'Build Scripts Configured',
        impact: 5,
        description: 'Build scripts are configured in package.json'
      })
    }

    // Check for modern build tools (Vite, esbuild, Turbopack)
    const modernTools = ['Vite', 'esbuild', 'Turbopack']
    const hasModernTool = buildTools.buildTools.some(tool => modernTools.includes(tool.name))
    if (hasModernTool) {
      score += 5
      factors.push({
        name: 'Modern Build Tools',
        impact: 5,
        description: 'Using modern build tools (Vite, esbuild, or Turbopack)'
      })
    }

    return { score, maxScore, factors }
  }

  /**
   * Score Code Quality (15 points max)
   * - 8 points for TypeScript adoption ratio
   * - 7 points for test file presence
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

    // Calculate TypeScript adoption ratio
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
        factors.push({
          name: 'TypeScript Adoption',
          impact: tsScore,
          description: `${Math.round(tsRatio * 100)}% TypeScript adoption`
        })
      }
    }

    // Check for test files
    const hasTests = languages.languages.some(lang => 
      lang.configFiles.some(file => 
        file.includes('test') || 
        file.includes('spec') || 
        file.includes('jest') ||
        file.includes('vitest')
      )
    )

    if (hasTests) {
      score += 7
      factors.push({
        name: 'Test Files Present',
        impact: 7,
        description: 'Test configuration or test files detected'
      })
    }

    return { score, maxScore, factors }
  }

  /**
   * Score Documentation (10 points max)
   * - 4 points for README presence
   * - 3 points for length >500 chars
   * - 3 points for proper sections
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
   * - Linear reduction from 5 points at 30 days to 0 points at 365 days since last commit
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
