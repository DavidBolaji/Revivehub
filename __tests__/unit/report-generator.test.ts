/**
 * Unit Tests for ReportGenerator
 * Tests: Report aggregation with complete data, partial data, issue generation, recommendation prioritization
 * Requirements: 6.1, 6.2, 6.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ReportGenerator } from '@/lib/scanner/services/report-generator'
import type {
  AnalysisData,
  LanguageDetectionResult,
  FrameworkDetectionResult,
  BuildToolDetectionResult,
  DependencyAnalysisResult,
  RepositoryContext,
  DetectorResult
} from '@/lib/scanner/types'

describe('ReportGenerator', () => {
  let generator: ReportGenerator

  beforeEach(() => {
    generator = new ReportGenerator()
  })

  // Helper to create mock repository context
  const createMockContext = (): RepositoryContext => ({
    owner: 'test-owner',
    repo: 'test-repo',
    files: {
      files: [
        { path: 'package.json', type: 'file', size: 100, sha: 'abc123' },
        { path: 'README.md', type: 'file', size: 500, sha: 'def456' }
      ],
      totalFiles: 2,
      totalSize: 600
    },
    contents: new Map([
      ['README.md', '# Test Project\n\nThis is a test project with comprehensive documentation.']
    ]),
    metadata: {
      owner: 'test-owner',
      name: 'test-repo',
      fullName: 'test-owner/test-repo',
      defaultBranch: 'main',
      language: 'TypeScript',
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date(),
      pushedAt: new Date(),
      size: 1000,
      stargazersCount: 100,
      forksCount: 10
    }
  })

  // Helper to create complete detector results
  const createCompleteResults = (): Map<string, DetectorResult<any>> => {
    const results = new Map()

    results.set('LanguageDetector', {
      success: true,
      data: {
        detectorName: 'LanguageDetector',
        success: true,
        languages: [
          { name: 'TypeScript', confidence: 90, fileCount: 10, linesOfCode: 1000, configFiles: ['tsconfig.json'] }
        ],
        primaryLanguage: { name: 'TypeScript', confidence: 90, fileCount: 10, linesOfCode: 1000, configFiles: ['tsconfig.json'] }
      } as LanguageDetectionResult
    })

    results.set('FrameworkRecognizer', {
      success: true,
      data: {
        detectorName: 'FrameworkRecognizer',
        success: true,
        frontend: [
          { name: 'React', version: '18.2.0', category: 'frontend', configFiles: ['package.json'], confidence: 95 }
        ],
        backend: []
      } as FrameworkDetectionResult
    })

    results.set('BuildToolDetector', {
      success: true,
      data: {
        detectorName: 'BuildToolDetector',
        success: true,
        buildTools: [
          { name: 'Vite', version: '4.0.0', configFile: 'vite.config.ts', buildScripts: ['build', 'dev'] }
        ]
      } as BuildToolDetectionResult
    })

    results.set('DependencyAnalyzer', {
      success: true,
      data: {
        detectorName: 'DependencyAnalyzer',
        success: true,
        dependencies: [
          { name: 'react', installedVersion: '18.2.0', latestVersion: '18.2.0', type: 'direct', ecosystem: 'npm' }
        ],
        devDependencies: [
          { name: 'vite', installedVersion: '4.0.0', latestVersion: '4.0.0', type: 'dev', ecosystem: 'npm' }
        ],
        outdatedDependencies: [],
        totalCount: 1,
        devCount: 1
      } as DependencyAnalysisResult
    })

    return results
  }

  describe('Report Aggregation with Complete Data', () => {
    it('should generate complete report with all detector results', () => {
      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context: createMockContext(),
        metadata: {
          completionStatus: 'complete',
          errors: []
        }
      }

      const report = generator.generate(analysisData)

      expect(report).toBeDefined()
      expect(report.repository.owner).toBe('test-owner')
      expect(report.repository.name).toBe('test-repo')
      expect(report.repository.analyzedAt).toBeInstanceOf(Date)
      expect(report.repository.commitSha).toBe('main')
    })

    it('should include all detection results in report', () => {
      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      expect(report.languages.success).toBe(true)
      expect(report.languages.languages).toHaveLength(1)
      expect(report.frameworks.success).toBe(true)
      expect(report.frameworks.frontend).toHaveLength(1)
      expect(report.buildTools.success).toBe(true)
      expect(report.buildTools.buildTools).toHaveLength(1)
      expect(report.dependencies.success).toBe(true)
      expect(report.dependencies.totalCount).toBe(1)
    })

    it('should calculate health score from detection results', () => {
      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      expect(report.healthScore).toBeDefined()
      expect(report.healthScore.total).toBeGreaterThan(0)
      expect(report.healthScore.total).toBeLessThanOrEqual(100)
      expect(report.healthScore.categories).toBeDefined()
      expect(report.healthScore.categories.dependencyHealth).toBeDefined()
      expect(report.healthScore.categories.frameworkModernity).toBeDefined()
      expect(report.healthScore.categories.buildHealth).toBeDefined()
      expect(report.healthScore.categories.codeQuality).toBeDefined()
      expect(report.healthScore.categories.documentation).toBeDefined()
      expect(report.healthScore.categories.repositoryActivity).toBeDefined()
    })

    it('should include metadata with analysis version and completion status', () => {
      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context: createMockContext(),
        metadata: {
          completionStatus: 'complete',
          errors: []
        }
      }

      const report = generator.generate(analysisData)

      expect(report.metadata.analysisVersion).toBe('1.0.0')
      expect(report.metadata.completionStatus).toBe('complete')
      expect(report.metadata.errors).toEqual([])
    })
  })

  describe('Report Generation with Partial Data', () => {
    it('should handle missing detector results gracefully', () => {
      const results = new Map()
      results.set('LanguageDetector', {
        success: false,
        error: {
          code: 'DETECTOR_FAILED',
          message: 'Language detection failed',
          recoverable: true
        }
      })

      const analysisData: AnalysisData = {
        results,
        context: createMockContext(),
        metadata: {
          completionStatus: 'partial',
          errors: ['LanguageDetector failed']
        }
      }

      const report = generator.generate(analysisData)

      expect(report).toBeDefined()
      expect(report.languages.success).toBe(false)
      expect(report.metadata.completionStatus).toBe('partial')
      expect(report.metadata.errors).toHaveLength(1)
    })

    it('should generate report even when all detectors fail', () => {
      const results = new Map()
      
      const analysisData: AnalysisData = {
        results,
        context: createMockContext(),
        metadata: {
          completionStatus: 'partial',
          errors: ['All detectors failed']
        }
      }

      const report = generator.generate(analysisData)

      expect(report).toBeDefined()
      expect(report.metadata.completionStatus).toBe('partial')
      expect(report.issues).toBeDefined()
      expect(report.recommendations).toBeDefined()
    })

    it('should mark failed detectors in results', () => {
      const results = new Map()
      results.set('DependencyAnalyzer', {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse package.json',
          recoverable: true
        }
      })

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      expect(report.dependencies.success).toBe(false)
      expect(report.dependencies.error).toBeDefined()
      expect(report.dependencies.error?.code).toBe('PARSE_ERROR')
    })
  })

  describe('Issue Generation Logic', () => {
    it('should generate critical issues for dependencies >2 major versions outdated', () => {
      const results = createCompleteResults()
      const dependencyData = results.get('DependencyAnalyzer')!.data as DependencyAnalysisResult
      
      dependencyData.outdatedDependencies = [
        {
          name: 'old-package',
          installedVersion: '1.0.0',
          latestVersion: '4.0.0',
          type: 'direct',
          ecosystem: 'npm',
          majorVersionsBehind: 3,
          severity: 'critical'
        }
      ]

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const criticalIssues = report.issues.filter(i => i.severity === 'critical')
      expect(criticalIssues.length).toBeGreaterThan(0)
      
      const depIssue = criticalIssues.find(i => i.category === 'Dependencies')
      expect(depIssue).toBeDefined()
      expect(depIssue?.title).toContain('Critical Outdated Dependencies')
    })

    it('should generate warning issues for outdated frameworks', () => {
      const results = createCompleteResults()
      const frameworkData = results.get('FrameworkRecognizer')!.data as FrameworkDetectionResult
      
      frameworkData.frontend = [
        { name: 'React', version: '1.0.0', category: 'frontend', configFiles: ['package.json'], confidence: 90 }
      ]

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const warningIssues = report.issues.filter(i => i.severity === 'warning')
      expect(warningIssues.length).toBeGreaterThan(0)
      
      const frameworkIssue = warningIssues.find(i => i.category === 'Frameworks')
      expect(frameworkIssue).toBeDefined()
      expect(frameworkIssue?.title).toContain('Outdated Framework')
    })

    it('should generate info issues for missing build configurations', () => {
      const results = createCompleteResults()
      const buildToolData = results.get('BuildToolDetector')!.data as BuildToolDetectionResult
      
      buildToolData.buildTools = []

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const infoIssues = report.issues.filter(i => i.severity === 'info')
      expect(infoIssues.length).toBeGreaterThan(0)
      
      const buildIssue = infoIssues.find(i => i.category === 'Build Tools')
      expect(buildIssue).toBeDefined()
      expect(buildIssue?.title).toContain('No Build Tools')
    })

    it('should include affected files in issue details', () => {
      const results = createCompleteResults()
      const dependencyData = results.get('DependencyAnalyzer')!.data as DependencyAnalysisResult
      
      dependencyData.outdatedDependencies = [
        {
          name: 'old-package',
          installedVersion: '1.0.0',
          latestVersion: '4.0.0',
          type: 'direct',
          ecosystem: 'npm',
          majorVersionsBehind: 3,
          severity: 'critical'
        }
      ]

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const depIssue = report.issues.find(i => i.category === 'Dependencies')
      expect(depIssue).toBeDefined()
      expect(depIssue?.affectedFiles).toBeDefined()
      expect(depIssue?.affectedFiles).toContain('package.json')
    })

    it('should generate multiple individual issues for critical dependencies', () => {
      const results = createCompleteResults()
      const dependencyData = results.get('DependencyAnalyzer')!.data as DependencyAnalysisResult
      
      dependencyData.outdatedDependencies = [
        {
          name: 'pkg1',
          installedVersion: '1.0.0',
          latestVersion: '4.0.0',
          type: 'direct',
          ecosystem: 'npm',
          majorVersionsBehind: 3,
          severity: 'critical'
        },
        {
          name: 'pkg2',
          installedVersion: '2.0.0',
          latestVersion: '5.0.0',
          type: 'direct',
          ecosystem: 'npm',
          majorVersionsBehind: 3,
          severity: 'critical'
        }
      ]

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const criticalIssues = report.issues.filter(i => 
        i.severity === 'critical' && i.category === 'Dependencies'
      )
      
      // Should have summary issue + individual issues
      expect(criticalIssues.length).toBeGreaterThan(2)
    })
  })

  describe('Recommendation Prioritization', () => {
    it('should create high-priority recommendations for critical dependency updates', () => {
      const results = createCompleteResults()
      const dependencyData = results.get('DependencyAnalyzer')!.data as DependencyAnalysisResult
      
      dependencyData.outdatedDependencies = [
        {
          name: 'critical-pkg',
          installedVersion: '1.0.0',
          latestVersion: '5.0.0',
          type: 'direct',
          ecosystem: 'npm',
          majorVersionsBehind: 4,
          severity: 'critical'
        }
      ]

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const highPriorityRecs = report.recommendations.filter(r => r.priority === 'high')
      expect(highPriorityRecs.length).toBeGreaterThan(0)
      
      const depRec = highPriorityRecs.find(r => r.category === 'Dependencies')
      expect(depRec).toBeDefined()
      expect(depRec?.title).toContain('Update Critical Dependencies')
      expect(depRec?.actionItems).toBeDefined()
      expect(depRec?.actionItems.length).toBeGreaterThan(0)
      expect(depRec?.estimatedEffort).toBe('high')
    })

    it('should create medium-priority recommendations for framework upgrades', () => {
      const results = createCompleteResults()
      const frameworkData = results.get('FrameworkRecognizer')!.data as FrameworkDetectionResult
      
      frameworkData.frontend = [
        { name: 'React', version: '2.0.0', category: 'frontend', configFiles: ['package.json'], confidence: 90 }
      ]

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const mediumPriorityRecs = report.recommendations.filter(r => r.priority === 'medium')
      expect(mediumPriorityRecs.length).toBeGreaterThan(0)
      
      const frameworkRec = mediumPriorityRecs.find(r => r.category === 'Frameworks')
      expect(frameworkRec).toBeDefined()
      expect(frameworkRec?.title).toContain('Upgrade Framework')
    })

    it('should create low-priority recommendations for documentation improvements', () => {
      const context = createMockContext()
      context.contents.clear() // Remove README

      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context
      }

      const report = generator.generate(analysisData)

      const lowPriorityRecs = report.recommendations.filter(r => r.priority === 'low')
      expect(lowPriorityRecs.length).toBeGreaterThan(0)
      
      const docRec = lowPriorityRecs.find(r => r.category === 'Documentation')
      expect(docRec).toBeDefined()
      expect(docRec?.title).toContain('README')
      expect(docRec?.estimatedEffort).toBe('low')
    })

    it('should include actionable steps in recommendations', () => {
      const results = createCompleteResults()
      const dependencyData = results.get('DependencyAnalyzer')!.data as DependencyAnalysisResult
      
      dependencyData.outdatedDependencies = [
        {
          name: 'old-pkg',
          installedVersion: '1.0.0',
          latestVersion: '4.0.0',
          type: 'direct',
          ecosystem: 'npm',
          majorVersionsBehind: 3,
          severity: 'critical'
        }
      ]

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const depRec = report.recommendations.find(r => r.category === 'Dependencies')
      expect(depRec).toBeDefined()
      expect(depRec?.actionItems).toBeDefined()
      expect(depRec?.actionItems.length).toBeGreaterThan(0)
      expect(depRec?.actionItems[0]).toContain('Review')
    })

    it('should include effort estimates for each recommendation', () => {
      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      report.recommendations.forEach(rec => {
        expect(rec.estimatedEffort).toBeDefined()
        expect(['low', 'medium', 'high']).toContain(rec.estimatedEffort)
      })
    })

    it('should recommend TypeScript adoption for JavaScript projects', () => {
      const results = createCompleteResults()
      const languageData = results.get('LanguageDetector')!.data as LanguageDetectionResult
      
      languageData.languages = [
        { name: 'JavaScript', confidence: 90, fileCount: 10, linesOfCode: 1000, configFiles: ['package.json'] }
      ]
      languageData.primaryLanguage = { name: 'JavaScript', confidence: 90, fileCount: 10, linesOfCode: 1000, configFiles: ['package.json'] }

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const tsRec = report.recommendations.find(r => 
        r.category === 'Code Quality' && r.title.includes('TypeScript')
      )
      expect(tsRec).toBeDefined()
      expect(tsRec?.priority).toBe('medium')
    })

    it('should recommend modern build tools when none detected', () => {
      const results = createCompleteResults()
      const buildToolData = results.get('BuildToolDetector')!.data as BuildToolDetectionResult
      
      buildToolData.buildTools = []

      const analysisData: AnalysisData = {
        results,
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      const buildRec = report.recommendations.find(r => 
        r.category === 'Build Tools' && r.title.includes('Add Modern Build Tool')
      )
      expect(buildRec).toBeDefined()
      expect(buildRec?.priority).toBe('medium')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty results map', () => {
      const analysisData: AnalysisData = {
        results: new Map(),
        context: createMockContext()
      }

      const report = generator.generate(analysisData)

      expect(report).toBeDefined()
      expect(report.issues).toBeDefined()
      expect(report.recommendations).toBeDefined()
    })

    it('should handle context without README', () => {
      const context = createMockContext()
      context.contents.clear()

      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context
      }

      const report = generator.generate(analysisData)

      expect(report).toBeDefined()
      expect(report.healthScore.categories.documentation.score).toBe(0)
    })

    it('should serialize report to JSON correctly', () => {
      const analysisData: AnalysisData = {
        results: createCompleteResults(),
        context: createMockContext()
      }

      const report = generator.generate(analysisData)
      const json = JSON.stringify(report)
      const parsed = JSON.parse(json)

      expect(parsed.repository).toBeDefined()
      expect(parsed.healthScore).toBeDefined()
      expect(parsed.issues).toBeDefined()
      expect(parsed.recommendations).toBeDefined()
    })
  })
})
