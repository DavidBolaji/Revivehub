/**
 * Integration Tests for ScannerOrchestrator
 * Tests: Full analysis pipeline, error handling, timeout behavior, detector dependency resolution
 * Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.2, 7.3
 */

import { describe, it, expect } from 'vitest'
import { ScannerOrchestrator } from '@/lib/scanner/services/orchestrator'
import { LanguageDetector } from '@/lib/scanner/detectors/language'
import { FrameworkRecognizer } from '@/lib/scanner/detectors/framework'
import { BuildToolDetector } from '@/lib/scanner/detectors/buildtool'
import { DependencyAnalyzer } from '@/lib/scanner/detectors/dependency'
import type { RepositoryContext, Detector, DetectionResult, FileNode } from '@/lib/scanner/types'

describe('ScannerOrchestrator Integration Tests', () => {
  // Helper function to create a mock repository context
  const createMockContext = (
    files: FileNode[] = [],
    contents: Map<string, string> = new Map()
  ): RepositoryContext => {
    return {
      owner: 'test-owner',
      repo: 'test-repo',
      files: {
        files,
        totalFiles: files.filter(f => f.type === 'file').length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
      },
      contents,
      metadata: {
        owner: 'test-owner',
        name: 'test-repo',
        fullName: 'test-owner/test-repo',
        defaultBranch: 'main',
        language: 'TypeScript',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-06-01'),
        pushedAt: new Date('2024-06-15'),
        size: 1000,
        stargazersCount: 10,
        forksCount: 2
      }
    }
  }

  describe('Full Analysis Pipeline', () => {
    it('should execute all detectors and generate complete report', async () => {
      const files: FileNode[] = [
        { path: 'index.ts', type: 'file', size: 100, sha: 'ts1' },
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg1' },
        { path: 'tsconfig.json', type: 'file', size: 50, sha: 'cfg1' },
        { path: 'vite.config.ts', type: 'file', size: 100, sha: 'vite1' },
        { path: 'README.md', type: 'file', size: 500, sha: 'md1' }
      ]

      const contents = new Map([
        ['index.ts', 'const x: number = 1;\nexport default x;\n'],
        [
          'package.json',
          JSON.stringify({
            name: 'test-app',
            dependencies: {
              react: '^18.2.0',
              vite: '^4.0.0'
            },
            devDependencies: {
              typescript: '^5.0.0'
            },
            scripts: {
              build: 'vite build',
              dev: 'vite'
            }
          })
        ],
        ['tsconfig.json', '{"compilerOptions": {"strict": true}}'],
        ['vite.config.ts', 'export default {}'],
        ['README.md', '# Test Project\n\nThis is a test project with comprehensive documentation.\n\n## Installation\n\nRun npm install\n\n## Usage\n\nRun npm start']
      ])

      const context = createMockContext(files, contents)

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new FrameworkRecognizer(),
        new BuildToolDetector(),
        new DependencyAnalyzer()
      ])

      const report = await orchestrator.analyzeRepository(context)

      // Verify report structure
      expect(report).toBeDefined()
      expect(report.repository.owner).toBe('test-owner')
      expect(report.repository.name).toBe('test-repo')
      expect(report.repository.analyzedAt).toBeInstanceOf(Date)

      // Verify language detection
      expect(report.languages.success).toBe(true)
      expect(report.languages.languages).toHaveLength(1)
      expect(report.languages.primaryLanguage?.name).toBe('TypeScript')

      // Verify framework detection
      expect(report.frameworks.success).toBe(true)
      expect(report.frameworks.frontend).toHaveLength(1)
      expect(report.frameworks.frontend[0].name).toBe('React')

      // Verify build tool detection
      expect(report.buildTools.success).toBe(true)
      expect(report.buildTools.buildTools).toHaveLength(1)
      expect(report.buildTools.buildTools[0].name).toBe('Vite')

      // Verify dependency analysis
      expect(report.dependencies.success).toBe(true)
      expect(report.dependencies.totalCount).toBeGreaterThan(0)

      // Verify health score
      expect(report.healthScore).toBeDefined()
      expect(report.healthScore.total).toBeGreaterThan(0)
      expect(report.healthScore.total).toBeLessThanOrEqual(100)

      // Verify issues and recommendations
      expect(Array.isArray(report.issues)).toBe(true)
      expect(Array.isArray(report.recommendations)).toBe(true)

      // Verify metadata
      expect(report.metadata.analysisVersion).toBeDefined()
      expect(report.metadata.completionStatus).toBe('complete')
      expect(report.metadata.errors).toHaveLength(0)
    })

    it('should handle repository with minimal files', async () => {
      const files: FileNode[] = [
        { path: 'index.js', type: 'file', size: 50, sha: 'js1' }
      ]

      const contents = new Map([
        ['index.js', 'console.log("hello");\n']
      ])

      const context = createMockContext(files, contents)

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new FrameworkRecognizer(),
        new BuildToolDetector(),
        new DependencyAnalyzer()
      ])

      const report = await orchestrator.analyzeRepository(context)

      expect(report.metadata.completionStatus).toBe('complete')
      expect(report.languages.success).toBe(true)
      expect(report.languages.languages).toHaveLength(1)
    })

    it('should handle empty repository', async () => {
      const context = createMockContext([], new Map())

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new FrameworkRecognizer(),
        new BuildToolDetector(),
        new DependencyAnalyzer()
      ])

      const report = await orchestrator.analyzeRepository(context)

      expect(report.metadata.completionStatus).toBe('complete')
      expect(report.languages.languages).toHaveLength(0)
      expect(report.frameworks.frontend).toHaveLength(0)
      expect(report.frameworks.backend).toHaveLength(0)
      expect(report.buildTools.buildTools).toHaveLength(0)
      expect(report.dependencies.totalCount).toBe(0)
    })
  })

  describe('Error Handling and Graceful Degradation', () => {
    it('should continue analysis when individual detector fails', async () => {
      const files: FileNode[] = [
        { path: 'index.ts', type: 'file', size: 100, sha: 'ts1' }
      ]

      const contents = new Map([
        ['index.ts', 'const x: number = 1;\n']
      ])

      const context = createMockContext(files, contents)

      // Create a failing detector
      class FailingDetector implements Detector {
        name = 'FailingDetector'
        
        async detect(): Promise<DetectionResult> {
          throw new Error('Detector failed')
        }
        
        getDependencies(): string[] {
          return []
        }
      }

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new FailingDetector()
      ])

      const report = await orchestrator.analyzeRepository(context)

      // Should have partial completion status
      expect(report.metadata.completionStatus).toBe('partial')
      expect(report.metadata.errors).toHaveLength(1)
      expect(report.metadata.errors[0]).toContain('FailingDetector')

      // Language detection should still succeed
      expect(report.languages.success).toBe(true)
      expect(report.languages.languages).toHaveLength(1)
    })

    it('should track errors from multiple failing detectors', async () => {
      const context = createMockContext([], new Map())

      class FailingDetector1 implements Detector {
        name = 'FailingDetector1'
        async detect(): Promise<DetectionResult> {
          throw new Error('Error 1')
        }
        getDependencies(): string[] {
          return []
        }
      }

      class FailingDetector2 implements Detector {
        name = 'FailingDetector2'
        async detect(): Promise<DetectionResult> {
          throw new Error('Error 2')
        }
        getDependencies(): string[] {
          return []
        }
      }

      const orchestrator = new ScannerOrchestrator([
        new FailingDetector1(),
        new FailingDetector2()
      ])

      const report = await orchestrator.analyzeRepository(context)

      expect(report.metadata.completionStatus).toBe('partial')
      expect(report.metadata.errors).toHaveLength(2)
      expect(report.metadata.errors[0]).toContain('FailingDetector1')
      expect(report.metadata.errors[1]).toContain('FailingDetector2')
    })

    it('should handle detector that returns error result', async () => {
      const context = createMockContext([], new Map())

      class ErrorReturningDetector implements Detector {
        name = 'ErrorReturningDetector'
        
        async detect(): Promise<DetectionResult> {
          return {
            detectorName: 'ErrorReturningDetector',
            success: false,
            error: {
              code: 'TEST_ERROR',
              message: 'Test error message',
              recoverable: true
            }
          }
        }
        
        getDependencies(): string[] {
          return []
        }
      }

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new ErrorReturningDetector()
      ])

      const report = await orchestrator.analyzeRepository(context)

      // Should still generate report
      expect(report).toBeDefined()
      expect(report.metadata.completionStatus).toBe('complete')
    })
  })

  describe('Timeout Behavior', () => {
    it('should timeout individual detector after specified time', async () => {
      const context = createMockContext([], new Map())

      class SlowDetector implements Detector {
        name = 'SlowDetector'
        
        async detect(): Promise<DetectionResult> {
          // Simulate slow operation
          await new Promise(resolve => setTimeout(resolve, 500))
          return {
            detectorName: 'SlowDetector',
            success: true
          }
        }
        
        getDependencies(): string[] {
          return []
        }
      }

      // Set very short detector timeout
      const orchestrator = new ScannerOrchestrator(
        [new SlowDetector()],
        30000, // overall timeout
        100    // detector timeout (shorter than detector execution)
      )

      const report = await orchestrator.analyzeRepository(context)

      expect(report.metadata.completionStatus).toBe('partial')
      expect(report.metadata.errors).toHaveLength(1)
      expect(report.metadata.errors[0]).toContain('timeout')
    })

    it('should timeout overall analysis after specified time', async () => {
      const context = createMockContext([], new Map())

      class SlowDetector implements Detector {
        name = 'SlowDetector'
        
        async detect(): Promise<DetectionResult> {
          await new Promise(resolve => setTimeout(resolve, 200))
          return {
            detectorName: 'SlowDetector',
            success: true
          }
        }
        
        getDependencies(): string[] {
          return []
        }
      }

      // Set very short overall timeout
      const orchestrator = new ScannerOrchestrator(
        [new SlowDetector(), new SlowDetector()],
        150, // overall timeout (shorter than total execution)
        100  // detector timeout
      )

      const report = await orchestrator.analyzeRepository(context)

      expect(report.metadata.completionStatus).toBe('partial')
      expect(report.metadata.errors.some(e => e.includes('timeout'))).toBe(true)
    })
  })

  describe('Detector Dependency Resolution', () => {
    it('should execute detectors in correct order based on dependencies', async () => {
      const context = createMockContext([], new Map())
      const executionOrder: string[] = []

      class DetectorA implements Detector {
        name = 'DetectorA'
        async detect(): Promise<DetectionResult> {
          executionOrder.push('A')
          return { detectorName: 'DetectorA', success: true }
        }
        getDependencies(): string[] {
          return []
        }
      }

      class DetectorB implements Detector {
        name = 'DetectorB'
        async detect(): Promise<DetectionResult> {
          executionOrder.push('B')
          return { detectorName: 'DetectorB', success: true }
        }
        getDependencies(): string[] {
          return ['DetectorA'] // B depends on A
        }
      }

      class DetectorC implements Detector {
        name = 'DetectorC'
        async detect(): Promise<DetectionResult> {
          executionOrder.push('C')
          return { detectorName: 'DetectorC', success: true }
        }
        getDependencies(): string[] {
          return ['DetectorB'] // C depends on B
        }
      }

      const orchestrator = new ScannerOrchestrator([
        new DetectorC(), // Register in reverse order
        new DetectorB(),
        new DetectorA()
      ])

      await orchestrator.analyzeRepository(context)

      // A should execute before B, B before C
      expect(executionOrder.indexOf('A')).toBeLessThan(executionOrder.indexOf('B'))
      expect(executionOrder.indexOf('B')).toBeLessThan(executionOrder.indexOf('C'))
    })

    it('should execute independent detectors in parallel', async () => {
      const context = createMockContext([], new Map())
      const startTimes = new Map<string, number>()
      const endTimes = new Map<string, number>()

      class ParallelDetector1 implements Detector {
        name = 'ParallelDetector1'
        async detect(): Promise<DetectionResult> {
          startTimes.set('P1', Date.now())
          await new Promise(resolve => setTimeout(resolve, 50))
          endTimes.set('P1', Date.now())
          return { detectorName: 'ParallelDetector1', success: true }
        }
        getDependencies(): string[] {
          return []
        }
      }

      class ParallelDetector2 implements Detector {
        name = 'ParallelDetector2'
        async detect(): Promise<DetectionResult> {
          startTimes.set('P2', Date.now())
          await new Promise(resolve => setTimeout(resolve, 50))
          endTimes.set('P2', Date.now())
          return { detectorName: 'ParallelDetector2', success: true }
        }
        getDependencies(): string[] {
          return []
        }
      }

      const orchestrator = new ScannerOrchestrator([
        new ParallelDetector1(),
        new ParallelDetector2()
      ])

      await orchestrator.analyzeRepository(context)

      // Both should start around the same time (within 20ms)
      const p1Start = startTimes.get('P1')!
      const p2Start = startTimes.get('P2')!
      expect(Math.abs(p1Start - p2Start)).toBeLessThan(20)
    })

    it('should handle circular dependencies gracefully', async () => {
      const context = createMockContext([], new Map())

      class DetectorX implements Detector {
        name = 'DetectorX'
        async detect(): Promise<DetectionResult> {
          return { detectorName: 'DetectorX', success: true }
        }
        getDependencies(): string[] {
          return ['DetectorY'] // X depends on Y
        }
      }

      class DetectorY implements Detector {
        name = 'DetectorY'
        async detect(): Promise<DetectionResult> {
          return { detectorName: 'DetectorY', success: true }
        }
        getDependencies(): string[] {
          return ['DetectorX'] // Y depends on X (circular)
        }
      }

      const orchestrator = new ScannerOrchestrator([
        new DetectorX(),
        new DetectorY()
      ])

      // Should not hang or crash
      const report = await orchestrator.analyzeRepository(context)
      expect(report).toBeDefined()
    })
  })

  describe('Detector Registration', () => {
    it('should register detectors via constructor', () => {
      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new FrameworkRecognizer()
      ])

      const detectors = orchestrator.getDetectors()
      expect(detectors).toHaveLength(2)
      expect(detectors.map(d => d.name)).toContain('LanguageDetector')
      expect(detectors.map(d => d.name)).toContain('FrameworkRecognizer')
    })

    it('should register detectors via registerDetector method', () => {
      const orchestrator = new ScannerOrchestrator()
      
      orchestrator.registerDetector(new LanguageDetector())
      orchestrator.registerDetector(new FrameworkRecognizer())

      const detectors = orchestrator.getDetectors()
      expect(detectors).toHaveLength(2)
    })

    it('should replace detector if registered with same name', () => {
      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector()
      ])

      // Register another instance with same name
      orchestrator.registerDetector(new LanguageDetector())

      const detectors = orchestrator.getDetectors()
      expect(detectors).toHaveLength(1)
    })
  })

  describe('Report Generation', () => {
    it('should include all required report sections', async () => {
      const context = createMockContext([], new Map())

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new FrameworkRecognizer(),
        new BuildToolDetector(),
        new DependencyAnalyzer()
      ])

      const report = await orchestrator.analyzeRepository(context)

      // Verify all required sections exist
      expect(report.repository).toBeDefined()
      expect(report.languages).toBeDefined()
      expect(report.frameworks).toBeDefined()
      expect(report.buildTools).toBeDefined()
      expect(report.dependencies).toBeDefined()
      expect(report.healthScore).toBeDefined()
      expect(report.issues).toBeDefined()
      expect(report.recommendations).toBeDefined()
      expect(report.metadata).toBeDefined()
    })

    it('should include repository metadata in report', async () => {
      const context = createMockContext([], new Map())

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector()
      ])

      const report = await orchestrator.analyzeRepository(context)

      expect(report.repository.owner).toBe('test-owner')
      expect(report.repository.name).toBe('test-repo')
      expect(report.repository.commitSha).toBe('main')
      expect(report.repository.analyzedAt).toBeInstanceOf(Date)
    })

    it('should calculate health scores from detector results', async () => {
      const files: FileNode[] = [
        { path: 'index.ts', type: 'file', size: 100, sha: 'ts1' },
        { path: 'README.md', type: 'file', size: 600, sha: 'md1' }
      ]

      const contents = new Map([
        ['index.ts', 'const x: number = 1;\n'],
        ['README.md', '# Project\n\n## Description\n\nA comprehensive project with good documentation and modern TypeScript.\n\n## Installation\n\nRun npm install\n\n## Usage\n\nImport and use the module\n\n## Contributing\n\nPull requests welcome\n\n## License\n\nMIT']
      ])

      const context = createMockContext(files, contents)

      const orchestrator = new ScannerOrchestrator([
        new LanguageDetector(),
        new FrameworkRecognizer(),
        new BuildToolDetector(),
        new DependencyAnalyzer()
      ])

      const report = await orchestrator.analyzeRepository(context)

      expect(report.healthScore.total).toBeGreaterThan(0)
      expect(report.healthScore.categories).toBeDefined()
      expect(report.healthScore.categories.codeQuality).toBeDefined()
      expect(report.healthScore.categories.documentation).toBeDefined()
    })
  })
})
