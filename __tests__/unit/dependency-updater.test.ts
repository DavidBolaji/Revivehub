/**
 * Unit tests for DependencyUpdaterTransformer
 * 
 * Tests dependency update functionality including:
 * - Package.json parsing and transformation
 * - Package name extraction from task descriptions
 * - npm registry version fetching (mocked)
 * - Breaking change handling
 * - Error scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DependencyUpdaterTransformer } from '../../lib/transformers/dependencies/dependency-updater'
import type { Task, Pattern, TransformOptions } from '@/types/transformer'

// Mock fetch globally
global.fetch = vi.fn()

// Helper function to create mock task
function createMockTask(
  description: string,
  breakingChanges: string[] = [],
  riskLevel: 'low' | 'medium' | 'high' = 'low'
): Task {
  const pattern: Pattern = {
    id: 'dep-pattern-1',
    name: 'Outdated Dependencies',
    category: 'dependency',
    severity: 'medium',
    occurrences: 1,
    affectedFiles: ['package.json'],
    description,
    automated: true,
  }

  return {
    id: 'dep-task-1',
    name: 'Update Dependencies',
    description,
    type: 'automated',
    estimatedMinutes: 30,
    automatedMinutes: 30,
    riskLevel,
    affectedFiles: ['package.json'],
    dependencies: [],
    breakingChanges,
    pattern,
  }
}

// Helper to create mock npm registry response
function createNpmResponse(packageName: string, latestVersion: string) {
  return {
    name: packageName,
    'dist-tags': {
      latest: latestVersion,
    },
    versions: {},
  }
}

describe('DependencyUpdaterTransformer', () => {
  let transformer: DependencyUpdaterTransformer
  let options: TransformOptions

  beforeEach(() => {
    transformer = new DependencyUpdaterTransformer()
    options = {
      preserveFormatting: true,
    }
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with correct metadata', () => {
      const metadata = transformer.getMetadata()

      expect(metadata.name).toBe('DependencyUpdater')
      expect(metadata.supportedPatternCategories).toEqual(['dependency'])
      expect(metadata.supportedFrameworks).toEqual(['*'])
    })
  })

  describe('transform()', () => {
    it('should update dependencies to latest versions', async () => {
      const packageJson = JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          dependencies: {
            react: '^16.0.0',
            'react-dom': '^16.0.0',
          },
        },
        null,
        2
      )

      const task = createMockTask('Update react and react-dom to latest versions')

      // Mock npm registry responses
      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/react-dom')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react-dom', '18.2.0')),
          })
        }
        if (url.includes('/react')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
          })
        }
        return Promise.reject(new Error('Unknown package'))
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toBeDefined()

      const updated = JSON.parse(result.code!)
      expect(updated.dependencies.react).toBe('^18.2.0')
      expect(updated.dependencies['react-dom']).toBe('^18.2.0')
    })

    it('should update devDependencies', async () => {
      const packageJson = JSON.stringify(
        {
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            vitest: '^0.30.0',
          },
        },
        null,
        2
      )

      const task = createMockTask('Update vitest to latest version')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('vitest', '1.0.0')),
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      const updated = JSON.parse(result.code!)
      expect(updated.devDependencies.vitest).toBe('^1.0.0')
    })

    it('should preserve JSON formatting with 2-space indentation', async () => {
      const packageJson = JSON.stringify(
        {
          name: 'test-project',
          dependencies: {
            react: '^16.0.0',
          },
        },
        null,
        2
      )

      const task = createMockTask('Update react')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('  "name"')
      expect(result.code).toContain('  "dependencies"')
      expect(result.code).toMatch(/\n$/) // Should end with newline
    })

    it('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{ invalid json }'
      const task = createMockTask('Update react')

      const result = await transformer.transform(invalidJson, options, task)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Failed to parse package.json')
      expect(result.errors[0].code).toBe('INVALID_JSON')
    })

    it('should handle no packages specified', async () => {
      const packageJson = JSON.stringify(
        {
          name: 'test-project',
          dependencies: {},
        },
        null,
        2
      )

      const task = createMockTask('') // Empty description

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('No packages specified for update')
    })

    it('should handle packages not found in dependencies', async () => {
      const packageJson = JSON.stringify(
        {
          name: 'test-project',
          dependencies: {
            react: '^18.0.0',
          },
        },
        null,
        2
      )

      const task = createMockTask('Update vue') // Package not in dependencies

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('vue', '3.0.0')),
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('Specified packages not found in dependencies')
    })

    it('should calculate risk score based on task risk level', async () => {
      const packageJson = JSON.stringify(
        {
          dependencies: { react: '^16.0.0' },
        },
        null,
        2
      )

      const highRiskTask = createMockTask('Update react', [], 'high')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
      })

      const result = await transformer.transform(packageJson, options, highRiskTask)

      expect(result.success).toBe(true)
      expect(result.metadata.riskScore).toBeGreaterThanOrEqual(60)
    })

    it('should flag for manual review when breaking changes present', async () => {
      const packageJson = JSON.stringify(
        {
          dependencies: { react: '^16.0.0' },
        },
        null,
        2
      )

      const task = createMockTask(
        'Update react',
        ['React 18 introduces new concurrent features'],
        'high'
      )

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.requiresManualReview).toBe(true)
      expect(result.warnings).toContain('React 18 introduces new concurrent features')
    })

    it('should generate diff with line changes', async () => {
      const packageJson = JSON.stringify(
        {
          dependencies: { react: '^16.0.0' },
        },
        null,
        2
      )

      const task = createMockTask('Update react')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.diff).toBeDefined()
      expect(result.diff!.visual.length).toBeGreaterThan(0)
      expect(result.metadata.linesAdded).toBeGreaterThan(0)
      expect(result.metadata.linesRemoved).toBeGreaterThan(0)
    })

    it('should track transformations applied', async () => {
      const packageJson = JSON.stringify(
        {
          dependencies: {
            react: '^16.0.0',
            next: '^12.0.0',
          },
        },
        null,
        2
      )

      const task = createMockTask('Update packages: react, next')

      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/react')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
          })
        }
        if (url.includes('/next')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('next', '14.0.0')),
          })
        }
        return Promise.reject(new Error('Unknown package'))
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBeGreaterThanOrEqual(2)
      expect(result.metadata.transformationsApplied.some(t => t.includes('react'))).toBe(true)
      expect(result.metadata.transformationsApplied.some(t => t.includes('next'))).toBe(true)
    })

    it('should estimate time saved based on updates', async () => {
      const packageJson = JSON.stringify(
        {
          dependencies: {
            react: '^16.0.0',
            'react-dom': '^16.0.0',
          },
        },
        null,
        2
      )

      const task = createMockTask('Update react and react-dom')

      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/react')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
          })
        }
        if (url.includes('/react-dom')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react-dom', '18.2.0')),
          })
        }
        return Promise.reject(new Error('Unknown package'))
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.estimatedTimeSaved).toContain('minutes')
    })

    it('should handle npm registry errors gracefully', async () => {
      const packageJson = JSON.stringify(
        {
          dependencies: { react: '^16.0.0' },
        },
        null,
        2
      )

      const task = createMockTask('Update react')

      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('No package updates available')
    })

    it('should handle 404 responses from npm registry', async () => {
      const packageJson = JSON.stringify(
        {
          dependencies: { 'non-existent-package': '^1.0.0' },
        },
        null,
        2
      )

      const task = createMockTask('Update non-existent-package')

      ;(global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
      })

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.warnings).toContain('No package updates available')
    })
  })

  describe('extractPackages()', () => {
    it('should extract package names from "update X" pattern', async () => {
      const task = createMockTask('Update react from 16.0.0 to 18.0.0')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
      })

      const packageJson = JSON.stringify({ dependencies: { react: '^16.0.0' } }, null, 2)
      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBeGreaterThan(0)
    })

    it('should extract package names from "upgrade X" pattern', async () => {
      const task = createMockTask('Upgrade next to latest version')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('next', '14.0.0')),
      })

      const packageJson = JSON.stringify({ dependencies: { next: '^12.0.0' } }, null, 2)
      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBeGreaterThan(0)
    })

    it('should extract package names from comma-separated list', async () => {
      const task = createMockTask('Update packages: react, react-dom, next')

      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/react-dom')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react-dom', '18.2.0')),
          })
        }
        if (url.includes('/react')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
          })
        }
        if (url.includes('/next')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('next', '14.0.0')),
          })
        }
        return Promise.reject(new Error('Unknown package'))
      })

      const packageJson = JSON.stringify(
        {
          dependencies: {
            react: '^16.0.0',
            'react-dom': '^16.0.0',
            next: '^12.0.0',
          },
        },
        null,
        2
      )

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBe(3)
    })

    it('should extract package names in backticks', async () => {
      const task = createMockTask('Update `react` and `next` packages')

      ;(global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/react')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
          })
        }
        if (url.includes('/next')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('next', '14.0.0')),
          })
        }
        return Promise.reject(new Error('Unknown package'))
      })

      const packageJson = JSON.stringify(
        {
          dependencies: {
            react: '^16.0.0',
            next: '^12.0.0',
          },
        },
        null,
        2
      )

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBe(2)
    })

    it('should handle scoped packages', async () => {
      const task = createMockTask('Update @types/react to latest')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('@types/react', '18.2.0')),
      })

      const packageJson = JSON.stringify(
        {
          devDependencies: {
            '@types/react': '^16.0.0',
          },
        },
        null,
        2
      )

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(result.metadata.transformationsApplied.length).toBeGreaterThan(0)
    })
  })

  describe('fetchLatestVersions()', () => {
    it('should fetch versions from npm registry', async () => {
      const task = createMockTask('Update react')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
      })

      const packageJson = JSON.stringify({ dependencies: { react: '^16.0.0' } }, null, 2)
      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('registry.npmjs.org/react'),
        expect.any(Object)
      )
    })

    it('should use caret prefix for semantic versioning', async () => {
      const task = createMockTask('Update react')

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
      })

      const packageJson = JSON.stringify({ dependencies: { react: '^16.0.0' } }, null, 2)
      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      const updated = JSON.parse(result.code!)
      expect(updated.dependencies.react).toMatch(/^\^/)
    })

    it('should handle timeout gracefully', async () => {
      const task = createMockTask('Update react')

      // Mock AbortController to simulate timeout
      ;(global.fetch as any).mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Aborted')), 100)
          })
      )

      const packageJson = JSON.stringify({ dependencies: { react: '^16.0.0' } }, null, 2)
      const result = await transformer.transform(packageJson, options, task)

      // Should complete without hanging and handle the error gracefully
      expect(result.success).toBe(true)
      expect(result.warnings).toContain('No package updates available')
    })

    it('should fetch multiple packages in parallel', async () => {
      const task = createMockTask('Update packages: react, next, vitest')

      let fetchCount = 0
      ;(global.fetch as any).mockImplementation((url: string) => {
        fetchCount++
        if (url.includes('/react')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('react', '18.2.0')),
          })
        }
        if (url.includes('/next')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('next', '14.0.0')),
          })
        }
        if (url.includes('/vitest')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createNpmResponse('vitest', '1.0.0')),
          })
        }
        return Promise.reject(new Error('Unknown package'))
      })

      const packageJson = JSON.stringify(
        {
          dependencies: {
            react: '^16.0.0',
            next: '^12.0.0',
          },
          devDependencies: {
            vitest: '^0.30.0',
          },
        },
        null,
        2
      )

      const result = await transformer.transform(packageJson, options, task)

      expect(result.success).toBe(true)
      // Should fetch all 3 packages (may have additional attempts for invalid package names)
      expect(fetchCount).toBeGreaterThanOrEqual(3)
      expect(result.metadata.transformationsApplied.length).toBe(3)
    })
  })

  describe('canHandle()', () => {
    it('should handle dependency category tasks', () => {
      const task = createMockTask('Update dependencies')
      const sourceStack = {
        framework: 'React',
        version: '18.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      expect(transformer.canHandle(task, sourceStack)).toBe(true)
    })

    it('should handle tasks for any framework', () => {
      const task = createMockTask('Update dependencies')
      const frameworks = ['React', 'Vue', 'Angular', 'Next.js', 'Svelte']

      frameworks.forEach((framework) => {
        const sourceStack = {
          framework,
          version: '1.0.0',
          language: 'TypeScript',
          dependencies: {},
        }

        expect(transformer.canHandle(task, sourceStack)).toBe(true)
      })
    })

    it('should not handle non-dependency tasks', () => {
      const task = createMockTask('Refactor components')
      task.pattern.category = 'code-quality'

      const sourceStack = {
        framework: 'React',
        version: '18.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      expect(transformer.canHandle(task, sourceStack)).toBe(false)
    })
  })
})
