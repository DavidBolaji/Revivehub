/**
 * Unit Tests for HealthScorer
 * Tests: Each category scoring independently, edge cases, scoring factor calculations, overall score aggregation
 * Requirements: 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HealthScorer } from '@/lib/scanner/services/health-scorer'
import type {
  DependencyAnalysisResult,
  FrameworkDetectionResult,
  BuildToolDetectionResult,
  LanguageDetectionResult,
  RepositoryMetadata
} from '@/lib/scanner/types'

describe('HealthScorer', () => {
  let scorer: HealthScorer

  beforeEach(() => {
    scorer = new HealthScorer()
  })

  // Helper to create mock metadata
  const createMockMetadata = (daysAgo: number = 10): RepositoryMetadata => {
    const now = new Date()
    const pushedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    
    return {
      owner: 'test-owner',
      name: 'test-repo',
      fullName: 'test-owner/test-repo',
      defaultBranch: 'main',
      language: 'TypeScript',
      createdAt: new Date('2020-01-01'),
      updatedAt: now,
      pushedAt,
      size: 1000,
      stargazersCount: 100,
      forksCount: 10
    }
  }

  describe('Dependency Health Scoring (25 points max)', () => {
    it('should give full score for no dependencies', () => {
      const dependencies: DependencyAnalysisResult = {
        detectorName: 'DependencyAnalyzer',
        success: true,
        dependencies: [],
        devDependencies: [],
        outdatedDependencies: [],
        totalCount: 0,
        devCount: 0
      }

      const input = {
        dependencies,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.dependencyHealth.score).toBe(25)
      expect(result.categories.dependencyHealth.maxScore).toBe(25)
      expect(result.categories.dependencyHealth.factors).toHaveLength(1)
      expect(result.categories.dependencyHealth.factors[0].name).toBe('No Dependencies')
    })

    it('should deduct 5 points per dependency >2 versions outdated', () => {
      const dependencies: DependencyAnalysisResult = {
        detectorName: 'DependencyAnalyzer',
        success: true,
        dependencies: [
          { name: 'pkg1', installedVersion: '1.0.0', type: 'direct', ecosystem: 'npm' },
          { name: 'pkg2', installedVersion: '1.0.0', type: 'direct', ecosystem: 'npm' }
        ],
        devDependencies: [],
        outdatedDependencies: [
          { name: 'pkg1', installedVersion: '1.0.0', type: 'direct', ecosystem: 'npm', majorVersionsBehind: 3, severity: 'critical' },
          { name: 'pkg2', installedVersion: '1.0.0', type: 'direct', ecosystem: 'npm', majorVersionsBehind: 4, severity: 'critical' }
        ],
        totalCount: 2,
        devCount: 0
      }

      const input = {
        dependencies,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.dependencyHealth.score).toBe(15) // 25 - (2 * 5)
      const criticalFactor = result.categories.dependencyHealth.factors.find(f => f.name === 'Critical Outdated Dependencies')
      expect(criticalFactor).toBeDefined()
      expect(criticalFactor?.impact).toBe(-10)
    })

    it('should deduct 3 points per dependency 1-2 versions outdated', () => {
      const dependencies: DependencyAnalysisResult = {
        detectorName: 'DependencyAnalyzer',
        success: true,
        dependencies: [
          { name: 'pkg1', installedVersion: '2.0.0', type: 'direct', ecosystem: 'npm' }
        ],
        devDependencies: [],
        outdatedDependencies: [
          { name: 'pkg1', installedVersion: '2.0.0', type: 'direct', ecosystem: 'npm', majorVersionsBehind: 1, severity: 'warning' }
        ],
        totalCount: 1,
        devCount: 0
      }

      const input = {
        dependencies,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.dependencyHealth.score).toBe(22) // 25 - 3
      const moderateFactor = result.categories.dependencyHealth.factors.find(f => f.name === 'Moderate Outdated Dependencies')
      expect(moderateFactor).toBeDefined()
      expect(moderateFactor?.impact).toBe(-3)
    })

    it('should give +2 bonus if all dependencies are current', () => {
      const dependencies: DependencyAnalysisResult = {
        detectorName: 'DependencyAnalyzer',
        success: true,
        dependencies: [
          { name: 'pkg1', installedVersion: '10.0.0', type: 'direct', ecosystem: 'npm' },
          { name: 'pkg2', installedVersion: '8.0.0', type: 'direct', ecosystem: 'npm' }
        ],
        devDependencies: [],
        outdatedDependencies: [],
        totalCount: 2,
        devCount: 0
      }

      const input = {
        dependencies,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.dependencyHealth.score).toBe(27) // 25 + 2
      const bonusFactor = result.categories.dependencyHealth.factors.find(f => f.name === 'All Dependencies Current')
      expect(bonusFactor).toBeDefined()
      expect(bonusFactor?.impact).toBe(2)
    })

    it('should not go below 0 score', () => {
      const dependencies: DependencyAnalysisResult = {
        detectorName: 'DependencyAnalyzer',
        success: true,
        dependencies: Array(10).fill(null).map((_, i) => ({
          name: `pkg${i}`,
          installedVersion: '0.1.0',
          type: 'direct' as const,
          ecosystem: 'npm' as const
        })),
        devDependencies: [],
        outdatedDependencies: Array(10).fill(null).map((_, i) => ({
          name: `pkg${i}`,
          installedVersion: '0.1.0',
          type: 'direct' as const,
          ecosystem: 'npm' as const,
          majorVersionsBehind: 5,
          severity: 'critical' as const
        })),
        totalCount: 10,
        devCount: 0
      }

      const input = {
        dependencies,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.dependencyHealth.score).toBe(0)
      expect(result.categories.dependencyHealth.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Framework Modernity Scoring (25 points max)', () => {
    it('should give full score for no frameworks', () => {
      const frameworks: FrameworkDetectionResult = {
        detectorName: 'FrameworkRecognizer',
        success: true,
        frontend: [],
        backend: []
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.frameworkModernity.score).toBe(25)
      expect(result.categories.frameworkModernity.factors[0].name).toBe('No Frameworks')
    })

    it('should deduct 10 points per framework >1 major version behind', () => {
      const frameworks: FrameworkDetectionResult = {
        detectorName: 'FrameworkRecognizer',
        success: true,
        frontend: [
          { name: 'React', version: '1.0.0', category: 'frontend', configFiles: [], confidence: 90 }
        ],
        backend: []
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.frameworkModernity.score).toBe(15) // 25 - 10
      const outdatedFactor = result.categories.frameworkModernity.factors.find(f => f.name === 'Outdated Framework Versions')
      expect(outdatedFactor).toBeDefined()
      expect(outdatedFactor?.impact).toBe(-10)
    })

    it('should deduct 5 points for outdated minor versions', () => {
      const frameworks: FrameworkDetectionResult = {
        detectorName: 'FrameworkRecognizer',
        success: true,
        frontend: [
          { name: 'Vue', version: '2.5.0', category: 'frontend', configFiles: [], confidence: 90 }
        ],
        backend: []
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.frameworkModernity.score).toBe(20) // 25 - 5
    })

    it('should give +3 bonus for all modern frameworks', () => {
      const frameworks: FrameworkDetectionResult = {
        detectorName: 'FrameworkRecognizer',
        success: true,
        frontend: [
          { name: 'React', version: '18.2.0', category: 'frontend', configFiles: [], confidence: 90 }
        ],
        backend: [
          { name: 'Express', version: '4.18.0', category: 'backend', configFiles: [], confidence: 80 }
        ]
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.frameworkModernity.score).toBe(28) // 25 + 3
      const modernFactor = result.categories.frameworkModernity.factors.find(f => f.name === 'Modern Framework Versions')
      expect(modernFactor).toBeDefined()
      expect(modernFactor?.impact).toBe(3)
    })
  })

  describe('Build Health Scoring (20 points max)', () => {
    it('should give 0 score for no build tools', () => {
      const buildTools: BuildToolDetectionResult = {
        detectorName: 'BuildToolDetector',
        success: true,
        buildTools: []
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.buildHealth.score).toBe(0)
      expect(result.categories.buildHealth.factors[0].name).toBe('No Build Tools')
    })

    it('should give 10 points for config file presence', () => {
      const buildTools: BuildToolDetectionResult = {
        detectorName: 'BuildToolDetector',
        success: true,
        buildTools: [
          { name: 'Webpack', version: '5.0.0', configFile: 'webpack.config.js', buildScripts: [] }
        ]
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.buildHealth.score).toBeGreaterThanOrEqual(10)
      const configFactor = result.categories.buildHealth.factors.find(f => f.name === 'Build Configuration Present')
      expect(configFactor).toBeDefined()
      expect(configFactor?.impact).toBe(10)
    })

    it('should give 5 points for build scripts', () => {
      const buildTools: BuildToolDetectionResult = {
        detectorName: 'BuildToolDetector',
        success: true,
        buildTools: [
          { name: 'Vite', version: '4.0.0', buildScripts: ['build', 'dev'] }
        ]
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      const scriptsFactor = result.categories.buildHealth.factors.find(f => f.name === 'Build Scripts Configured')
      expect(scriptsFactor).toBeDefined()
      expect(scriptsFactor?.impact).toBe(5)
    })

    it('should give 5 points for modern build tools', () => {
      const buildTools: BuildToolDetectionResult = {
        detectorName: 'BuildToolDetector',
        success: true,
        buildTools: [
          { name: 'Vite', version: '4.0.0', configFile: 'vite.config.js', buildScripts: ['build'] }
        ]
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.buildHealth.score).toBe(20) // 10 + 5 + 5
      const modernFactor = result.categories.buildHealth.factors.find(f => f.name === 'Modern Build Tools')
      expect(modernFactor).toBeDefined()
      expect(modernFactor?.impact).toBe(5)
    })
  })

  describe('Code Quality Scoring (15 points max)', () => {
    it('should give 0 score for no languages detected', () => {
      const languages: LanguageDetectionResult = {
        detectorName: 'LanguageDetector',
        success: true,
        languages: [],
        primaryLanguage: null
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.codeQuality.score).toBe(0)
    })

    it('should give 8 points for 100% TypeScript adoption', () => {
      const languages: LanguageDetectionResult = {
        detectorName: 'LanguageDetector',
        success: true,
        languages: [
          { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: [] }
        ],
        primaryLanguage: { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: [] }
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      const tsFactor = result.categories.codeQuality.factors.find(f => f.name === 'TypeScript Adoption')
      expect(tsFactor).toBeDefined()
      expect(tsFactor?.impact).toBe(8)
    })

    it('should calculate TypeScript adoption ratio correctly', () => {
      const languages: LanguageDetectionResult = {
        detectorName: 'LanguageDetector',
        success: true,
        languages: [
          { name: 'TypeScript', confidence: 80, fileCount: 5, linesOfCode: 500, configFiles: [] },
          { name: 'JavaScript', confidence: 70, fileCount: 5, linesOfCode: 500, configFiles: [] }
        ],
        primaryLanguage: { name: 'TypeScript', confidence: 80, fileCount: 5, linesOfCode: 500, configFiles: [] }
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      const tsFactor = result.categories.codeQuality.factors.find(f => f.name === 'TypeScript Adoption')
      expect(tsFactor).toBeDefined()
      expect(tsFactor?.impact).toBe(4) // 50% adoption = 4 points
    })

    it('should give 7 points for test file presence', () => {
      const languages: LanguageDetectionResult = {
        detectorName: 'LanguageDetector',
        success: true,
        languages: [
          { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: ['vitest.config.ts'] }
        ],
        primaryLanguage: { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: ['vitest.config.ts'] }
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      const testFactor = result.categories.codeQuality.factors.find(f => f.name === 'Test Files Present')
      expect(testFactor).toBeDefined()
      expect(testFactor?.impact).toBe(7)
    })

    it('should give full 15 points for TypeScript with tests', () => {
      const languages: LanguageDetectionResult = {
        detectorName: 'LanguageDetector',
        success: true,
        languages: [
          { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: ['jest.config.js'] }
        ],
        primaryLanguage: { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: ['jest.config.js'] }
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.codeQuality.score).toBe(15) // 8 + 7
    })
  })

  describe('Documentation Scoring (10 points max)', () => {
    it('should give 0 score for no README', () => {
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(),
        readmeContent: undefined
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.documentation.score).toBe(0)
      expect(result.categories.documentation.factors[0].name).toBe('No README')
    })

    it('should give 4 points for README presence', () => {
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(),
        readmeContent: '# Test Project'
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.documentation.score).toBeGreaterThanOrEqual(4)
      const readmeFactor = result.categories.documentation.factors.find(f => f.name === 'README Present')
      expect(readmeFactor).toBeDefined()
      expect(readmeFactor?.impact).toBe(4)
    })

    it('should give 3 points for length >500 chars', () => {
      const longReadme = 'a'.repeat(501)
      
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(),
        readmeContent: longReadme
      }

      const result = scorer.calculateHealthScore(input)
      
      const lengthFactor = result.categories.documentation.factors.find(f => f.name === 'Comprehensive README')
      expect(lengthFactor).toBeDefined()
      expect(lengthFactor?.impact).toBe(3)
    })

    it('should give 3 points for proper sections', () => {
      const readmeWithHeaders = `# Test Project

## Installation

Instructions here

## Usage

More info here`
      
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(),
        readmeContent: readmeWithHeaders
      }

      const result = scorer.calculateHealthScore(input)
      
      const structureFactor = result.categories.documentation.factors.find(f => f.name === 'Structured Documentation')
      expect(structureFactor).toBeDefined()
      expect(structureFactor?.impact).toBe(3)
    })

    it('should give full 10 points for comprehensive README', () => {
      const comprehensiveReadme = `# Test Project

## Overview

${'a'.repeat(500)}

## Installation

Instructions here

## Usage

More info here`
      
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(),
        readmeContent: comprehensiveReadme
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.documentation.score).toBe(10) // 4 + 3 + 3
    })
  })

  describe('Repository Activity Scoring (5 points max)', () => {
    it('should give 5 points for commits within 30 days', () => {
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(15) // 15 days ago
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.repositoryActivity.score).toBe(5)
      const activityFactor = result.categories.repositoryActivity.factors.find(f => f.name === 'Recently Active')
      expect(activityFactor).toBeDefined()
      expect(activityFactor?.impact).toBe(5)
    })

    it('should give 0 points for commits >365 days ago', () => {
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(400) // 400 days ago
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.repositoryActivity.score).toBe(0)
      const inactiveFactor = result.categories.repositoryActivity.factors.find(f => f.name === 'Inactive Repository')
      expect(inactiveFactor).toBeDefined()
      expect(inactiveFactor?.impact).toBe(0)
    })

    it('should calculate linear reduction between 30 and 365 days', () => {
      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks: {} as FrameworkDetectionResult,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata(197) // ~halfway between 30 and 365
      }

      const result = scorer.calculateHealthScore(input)
      
      expect(result.categories.repositoryActivity.score).toBeGreaterThan(0)
      expect(result.categories.repositoryActivity.score).toBeLessThan(5)
      const moderateFactor = result.categories.repositoryActivity.factors.find(f => f.name === 'Moderate Activity')
      expect(moderateFactor).toBeDefined()
    })
  })

  describe('Overall Score Aggregation', () => {
    it('should aggregate all category scores correctly', () => {
      const input = {
        dependencies: {
          detectorName: 'DependencyAnalyzer',
          success: true,
          dependencies: [],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 0,
          devCount: 0
        } as DependencyAnalysisResult,
        frameworks: {
          detectorName: 'FrameworkRecognizer',
          success: true,
          frontend: [],
          backend: []
        } as FrameworkDetectionResult,
        buildTools: {
          detectorName: 'BuildToolDetector',
          success: true,
          buildTools: []
        } as BuildToolDetectionResult,
        languages: {
          detectorName: 'LanguageDetector',
          success: true,
          languages: [],
          primaryLanguage: null
        } as LanguageDetectionResult,
        metadata: createMockMetadata(15)
      }

      const result = scorer.calculateHealthScore(input)
      
      const expectedTotal = 
        result.categories.dependencyHealth.score +
        result.categories.frameworkModernity.score +
        result.categories.buildHealth.score +
        result.categories.codeQuality.score +
        result.categories.documentation.score +
        result.categories.repositoryActivity.score

      expect(result.total).toBe(expectedTotal)
    })

    it('should handle perfect score scenario', () => {
      const input = {
        dependencies: {
          detectorName: 'DependencyAnalyzer',
          success: true,
          dependencies: [
            { name: 'pkg1', installedVersion: '10.0.0', type: 'direct', ecosystem: 'npm' }
          ],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 1,
          devCount: 0
        } as DependencyAnalysisResult,
        frameworks: {
          detectorName: 'FrameworkRecognizer',
          success: true,
          frontend: [
            { name: 'React', version: '18.2.0', category: 'frontend', configFiles: [], confidence: 90 }
          ],
          backend: []
        } as FrameworkDetectionResult,
        buildTools: {
          detectorName: 'BuildToolDetector',
          success: true,
          buildTools: [
            { name: 'Vite', version: '4.0.0', configFile: 'vite.config.js', buildScripts: ['build'] }
          ]
        } as BuildToolDetectionResult,
        languages: {
          detectorName: 'LanguageDetector',
          success: true,
          languages: [
            { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: ['vitest.config.ts'] }
          ],
          primaryLanguage: { name: 'TypeScript', confidence: 100, fileCount: 10, linesOfCode: 1000, configFiles: ['vitest.config.ts'] }
        } as LanguageDetectionResult,
        metadata: createMockMetadata(10),
        readmeContent: `# Awesome Project\n\n${'a'.repeat(600)}\n\n## Installation\n\nSteps here`
      }

      const result = scorer.calculateHealthScore(input)
      
      // Should be close to perfect score
      expect(result.total).toBeGreaterThan(90)
      expect(result.categories.dependencyHealth.score).toBeGreaterThan(20)
      expect(result.categories.frameworkModernity.score).toBeGreaterThan(20)
      expect(result.categories.buildHealth.score).toBe(20)
      expect(result.categories.codeQuality.score).toBe(15)
      expect(result.categories.documentation.score).toBe(10)
      expect(result.categories.repositoryActivity.score).toBe(5)
    })

    it('should handle zero score scenario', () => {
      const input = {
        dependencies: {
          detectorName: 'DependencyAnalyzer',
          success: true,
          dependencies: Array(10).fill(null).map((_, i) => ({
            name: `pkg${i}`,
            installedVersion: '0.1.0',
            type: 'direct' as const,
            ecosystem: 'npm' as const
          })),
          devDependencies: [],
          outdatedDependencies: Array(10).fill(null).map((_, i) => ({
            name: `pkg${i}`,
            installedVersion: '0.1.0',
            type: 'direct' as const,
            ecosystem: 'npm' as const,
            majorVersionsBehind: 5,
            severity: 'critical' as const
          })),
          totalCount: 10,
          devCount: 0
        } as DependencyAnalysisResult,
        frameworks: {
          detectorName: 'FrameworkRecognizer',
          success: false
        } as FrameworkDetectionResult,
        buildTools: {
          detectorName: 'BuildToolDetector',
          success: true,
          buildTools: []
        } as BuildToolDetectionResult,
        languages: {
          detectorName: 'LanguageDetector',
          success: true,
          languages: [],
          primaryLanguage: null
        } as LanguageDetectionResult,
        metadata: createMockMetadata(400)
      }

      const result = scorer.calculateHealthScore(input)
      
      // Should have very low score
      expect(result.total).toBeLessThan(30)
      expect(result.categories.dependencyHealth.score).toBe(0)
      expect(result.categories.buildHealth.score).toBe(0)
      expect(result.categories.codeQuality.score).toBe(0)
      expect(result.categories.documentation.score).toBe(0)
      expect(result.categories.repositoryActivity.score).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle failed detection results gracefully', () => {
      const input = {
        dependencies: {
          detectorName: 'DependencyAnalyzer',
          success: false,
          dependencies: [],
          devDependencies: [],
          outdatedDependencies: [],
          totalCount: 0,
          devCount: 0
        } as DependencyAnalysisResult,
        frameworks: {
          detectorName: 'FrameworkRecognizer',
          success: false,
          frontend: [],
          backend: []
        } as FrameworkDetectionResult,
        buildTools: {
          detectorName: 'BuildToolDetector',
          success: false,
          buildTools: []
        } as BuildToolDetectionResult,
        languages: {
          detectorName: 'LanguageDetector',
          success: false,
          languages: [],
          primaryLanguage: null
        } as LanguageDetectionResult,
        metadata: createMockMetadata(15)
      }

      const result = scorer.calculateHealthScore(input)
      
      // Should not throw and should return valid scores
      expect(result.total).toBeGreaterThanOrEqual(0)
      expect(result.categories.dependencyHealth.score).toBeGreaterThanOrEqual(0)
      expect(result.categories.frameworkModernity.score).toBeGreaterThanOrEqual(0)
    })

    it('should handle frameworks with invalid version strings', () => {
      const frameworks: FrameworkDetectionResult = {
        detectorName: 'FrameworkRecognizer',
        success: true,
        frontend: [
          { name: 'React', version: 'unknown', category: 'frontend', configFiles: [], confidence: 90 },
          { name: 'Vue', version: 'latest', category: 'frontend', configFiles: [], confidence: 85 }
        ],
        backend: []
      }

      const input = {
        dependencies: {} as DependencyAnalysisResult,
        frameworks,
        buildTools: {} as BuildToolDetectionResult,
        languages: {} as LanguageDetectionResult,
        metadata: createMockMetadata()
      }

      const result = scorer.calculateHealthScore(input)
      
      // Should not throw and should handle gracefully
      expect(result.categories.frameworkModernity.score).toBeGreaterThanOrEqual(0)
      expect(result.categories.frameworkModernity.score).toBeLessThanOrEqual(25)
    })
  })
})
