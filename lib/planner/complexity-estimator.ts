import type {
  ComplexityEstimate,
  ComplexityFactors,
  DetectedPattern,
  SourceStack,
  TargetStack,
} from './types'

export class ComplexityEstimator {
  estimateComplexity(
    source: SourceStack,
    target: TargetStack,
    patterns: DetectedPattern[],
    codebaseStats: {
      totalFiles: number
      totalLines: number
      testCoverage: number
    }
  ): ComplexityEstimate {
    const factors = this.calculateFactors(source, target, patterns, codebaseStats)
    const score = this.calculateScore(factors)
    const level = this.determineLevel(score)
    const recommendations = this.generateRecommendations(factors, level)

    return { score, level, factors, recommendations }
  }

  private calculateFactors(
    source: SourceStack,
    target: TargetStack,
    patterns: DetectedPattern[],
    stats: { totalFiles: number; totalLines: number; testCoverage: number }
  ): ComplexityFactors {
    return {
      codebaseSize: stats.totalLines,
      fileCount: stats.totalFiles,
      dependencyCount: Object.keys(source.dependencies).length,
      patternComplexity: this.calculatePatternComplexity(patterns),
      frameworkDistance: this.calculateFrameworkDistance(source, target),
      customCodeRatio: this.estimateCustomCodeRatio(patterns, stats.totalFiles),
      testCoverage: stats.testCoverage,
    }
  }

  private calculatePatternComplexity(patterns: DetectedPattern[]): number {
    let complexity = 0

    for (const pattern of patterns) {
      const severityWeight = {
        low: 1,
        medium: 3,
        high: 5,
      }[pattern.severity]

      const automationPenalty = pattern.automated ? 0 : 2
      complexity += (severityWeight + automationPenalty) * pattern.occurrences
    }

    // Normalize to 0-100
    return Math.min(100, (complexity / patterns.length) * 10)
  }

  private calculateFrameworkDistance(source: SourceStack, target: TargetStack): number {
    // Same framework, different version
    if (source.framework === target.framework) {
      const versionDiff = this.compareVersions(source.version, target.version)
      return Math.min(30, versionDiff * 10)
    }

    // Different frameworks - check similarity
    const similarityMap: Record<string, string[]> = {
      'next.js': ['react', 'gatsby', 'remix'],
      react: ['preact', 'next.js', 'gatsby'],
      vue: ['nuxt', 'vue3'],
      angular: ['angularjs'],
    }

    const sourceFw = source.framework.toLowerCase()
    const targetFw = target.framework.toLowerCase()

    if (similarityMap[sourceFw]?.includes(targetFw)) {
      return 50 // Related frameworks
    }

    return 80 // Completely different frameworks
  }

  private compareVersions(v1: string, v2: string): number {
    const parse = (v: string) => v.split('.').map(Number)
    const [major1, minor1 = 0] = parse(v1)
    const [major2, minor2 = 0] = parse(v2)

    const majorDiff = Math.abs(major2 - major1)
    const minorDiff = Math.abs(minor2 - minor1)

    return majorDiff * 2 + minorDiff * 0.5
  }

  private estimateCustomCodeRatio(patterns: DetectedPattern[], totalFiles: number): number {
    const frameworkPatterns = patterns.filter((p) =>
      ['dependency', 'structural'].includes(p.category)
    )
    const affectedFiles = new Set(frameworkPatterns.flatMap((p) => p.affectedFiles))

    // Higher ratio = more custom code = potentially easier migration
    return Math.min(100, ((totalFiles - affectedFiles.size) / totalFiles) * 100)
  }

  private calculateScore(factors: ComplexityFactors): number {
    const weights = {
      codebaseSize: 0.15,
      fileCount: 0.1,
      dependencyCount: 0.15,
      patternComplexity: 0.25,
      frameworkDistance: 0.2,
      customCodeRatio: -0.1, // Negative because more custom code is easier
      testCoverage: -0.15, // Negative because better coverage makes migration safer
    }

    let score = 0

    // Normalize and weight each factor
    score += this.normalizeCodebaseSize(factors.codebaseSize) * weights.codebaseSize
    score += this.normalizeFileCount(factors.fileCount) * weights.fileCount
    score += this.normalizeDependencyCount(factors.dependencyCount) * weights.dependencyCount
    score += factors.patternComplexity * weights.patternComplexity
    score += factors.frameworkDistance * weights.frameworkDistance
    score += factors.customCodeRatio * weights.customCodeRatio
    score += factors.testCoverage * weights.testCoverage

    return Math.max(0, Math.min(100, score))
  }

  private normalizeCodebaseSize(lines: number): number {
    if (lines < 1000) return 10
    if (lines < 5000) return 30
    if (lines < 20000) return 50
    if (lines < 50000) return 70
    return 90
  }

  private normalizeFileCount(files: number): number {
    if (files < 10) return 10
    if (files < 50) return 30
    if (files < 200) return 50
    if (files < 500) return 70
    return 90
  }

  private normalizeDependencyCount(deps: number): number {
    if (deps < 10) return 10
    if (deps < 30) return 30
    if (deps < 50) return 50
    if (deps < 100) return 70
    return 90
  }

  private determineLevel(
    score: number
  ): 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex' {
    if (score < 20) return 'trivial'
    if (score < 40) return 'simple'
    if (score < 60) return 'moderate'
    if (score < 80) return 'complex'
    return 'very-complex'
  }

  private generateRecommendations(
    factors: ComplexityFactors,
    level: string
  ): string[] {
    const recommendations: string[] = []

    if (level === 'very-complex' || level === 'complex') {
      recommendations.push('Consider breaking migration into smaller incremental phases')
      recommendations.push('Set up comprehensive testing before starting migration')
    }

    if (factors.testCoverage < 50) {
      recommendations.push(
        'Increase test coverage before migration to catch regressions early'
      )
    }

    if (factors.frameworkDistance > 60) {
      recommendations.push(
        'Framework change is significant - allocate extra time for learning curve'
      )
      recommendations.push('Consider running both frameworks in parallel during transition')
    }

    if (factors.dependencyCount > 50) {
      recommendations.push('Audit dependencies and remove unused packages before migration')
    }

    if (factors.codebaseSize > 20000) {
      recommendations.push('Use feature flags to migrate functionality incrementally')
      recommendations.push('Consider automated code transformation tools')
    }

    if (factors.patternComplexity > 60) {
      recommendations.push('Review and refactor complex patterns before automated migration')
    }

    return recommendations
  }

  estimateTaskTime(
    task: {
      type: 'automated' | 'manual' | 'review'
      affectedFiles: string[]
      complexity: 'low' | 'medium' | 'high'
    },
    aggressiveness: 'conservative' | 'balanced' | 'aggressive'
  ): { manual: number; automated: number } {
    const baseMinutesPerFile = {
      low: 5,
      medium: 15,
      high: 30,
    }[task.complexity]

    const fileCount = task.affectedFiles.length
    const manualMinutes = baseMinutesPerFile * fileCount

    const automationFactor = {
      automated: 0.1, // 90% time savings
      review: 0.3, // 70% time savings (still need review)
      manual: 1.0, // No automation
    }[task.type]

    const aggressivenessFactor = {
      conservative: 1.2, // More careful, takes longer
      balanced: 1.0,
      aggressive: 0.8, // Faster but riskier
    }[aggressiveness]

    const automatedMinutes = manualMinutes * automationFactor * aggressivenessFactor

    return {
      manual: Math.ceil(manualMinutes),
      automated: Math.ceil(automatedMinutes),
    }
  }
}
