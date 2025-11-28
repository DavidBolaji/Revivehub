/**
 * Unit Tests for BuildToolDetector
 * Tests: Build tool detection, version extraction, build script identification, multiple build tools
 * Requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BuildToolDetector } from '@/lib/scanner/detectors/buildtool'
import type { RepositoryContext, FileNode } from '@/lib/scanner/types'

describe('BuildToolDetector', () => {
  let detector: BuildToolDetector

  beforeEach(() => {
    detector = new BuildToolDetector()
  })

  // Helper function to create a mock repository context
  const createMockContext = (files: FileNode[], contents: Map<string, string> = new Map()): RepositoryContext => {
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
        language: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        pushedAt: new Date(),
        size: 1000,
        stargazersCount: 0,
        forksCount: 0
      }
    }
  }

  describe('Webpack Detection', () => {
    it('should detect Webpack from package.json dependencies', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'webpack': '^5.75.0',
            'webpack-cli': '^5.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools).toHaveLength(1)
      expect(result.buildTools[0].name).toBe('Webpack')
      expect(result.buildTools[0].version).toBe('5.75.0')
    })

    it('should detect Webpack with webpack.config.js', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'webpack.config.js', type: 'file', size: 50, sha: 'wp1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'webpack': '^5.0.0' } })],
        ['webpack.config.js', 'module.exports = {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].configFile).toBe('webpack.config.js')
    })

    it('should detect Webpack build scripts', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'webpack': '^5.0.0' },
          scripts: {
            'build': 'webpack --mode production',
            'dev': 'webpack serve --mode development'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toContain('build')
      expect(result.buildTools[0].buildScripts).toContain('dev')
    })

    it('should detect Webpack with TypeScript config', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'webpack.config.ts', type: 'file', size: 50, sha: 'wp1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'webpack': '^5.0.0' } })],
        ['webpack.config.ts', 'export default {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].configFile).toBe('webpack.config.ts')
    })
  })

  describe('Vite Detection', () => {
    it('should detect Vite from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'vite': '^4.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools[0].name).toBe('Vite')
      expect(result.buildTools[0].version).toBe('4.0.0')
    })

    it('should detect Vite with vite.config.ts', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'vite.config.ts', type: 'file', size: 50, sha: 'vite1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'vite': '^4.0.0' } })],
        ['vite.config.ts', 'export default {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].configFile).toBe('vite.config.ts')
    })

    it('should detect Vite build scripts', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'vite': '^4.0.0' },
          scripts: {
            'build': 'vite build',
            'dev': 'vite'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toContain('build')
      expect(result.buildTools[0].buildScripts).toContain('dev')
    })
  })

  describe('Rollup Detection', () => {
    it('should detect Rollup from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'rollup': '^3.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools[0].name).toBe('Rollup')
      expect(result.buildTools[0].version).toBe('3.0.0')
    })

    it('should detect Rollup with rollup.config.js', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'rollup.config.js', type: 'file', size: 50, sha: 'rollup1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'rollup': '^3.0.0' } })],
        ['rollup.config.js', 'export default {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].configFile).toBe('rollup.config.js')
    })
  })

  describe('esbuild Detection', () => {
    it('should detect esbuild from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'esbuild': '^0.17.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools[0].name).toBe('esbuild')
      expect(result.buildTools[0].version).toBe('0.17.0')
    })

    it('should detect esbuild with esbuild.config.js', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'esbuild.config.js', type: 'file', size: 50, sha: 'es1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'esbuild': '^0.17.0' } })],
        ['esbuild.config.js', 'module.exports = {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].configFile).toBe('esbuild.config.js')
    })

    it('should detect esbuild build scripts', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'esbuild': '^0.17.0' },
          scripts: {
            'build': 'esbuild src/index.ts --bundle --outfile=dist/bundle.js'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toContain('build')
    })
  })

  describe('Parcel Detection', () => {
    it('should detect Parcel from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'parcel': '^2.8.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools[0].name).toBe('Parcel')
      expect(result.buildTools[0].version).toBe('2.8.0')
    })

    it('should detect Parcel with .parcelrc', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: '.parcelrc', type: 'file', size: 50, sha: 'parcel1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'parcel': '^2.8.0' } })],
        ['.parcelrc', '{}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].configFile).toBe('.parcelrc')
    })

    it('should detect parcel-bundler package', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'parcel-bundler': '^1.12.5'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].name).toBe('Parcel')
      expect(result.buildTools[0].version).toBe('1.12.5')
    })
  })

  describe('Turbopack Detection', () => {
    it('should detect Turbopack from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'turbo': '^1.8.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools[0].name).toBe('Turbopack')
      expect(result.buildTools[0].version).toBe('1.8.0')
    })

    it('should detect Turbopack with turbo.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'turbo.json', type: 'file', size: 50, sha: 'turbo1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'turbo': '^1.8.0' } })],
        ['turbo.json', '{"pipeline": {}}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].configFile).toBe('turbo.json')
    })

    it('should detect Turbopack build scripts', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'turbo': '^1.8.0' },
          scripts: {
            'build': 'turbo build',
            'dev': 'turbo run dev'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toContain('build')
      expect(result.buildTools[0].buildScripts).toContain('dev')
    })
  })

  describe('Version Extraction', () => {
    it('should extract version without caret prefix', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'vite': '^4.2.1' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].version).toBe('4.2.1')
    })

    it('should extract version without tilde prefix', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'webpack': '~5.75.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].version).toBe('5.75.0')
    })

    it('should handle exact version numbers', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'rollup': '3.0.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].version).toBe('3.0.0')
    })
  })

  describe('Build Script Identification', () => {
    it('should identify build scripts with webpack command', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'webpack': '^5.0.0' },
          scripts: {
            'build': 'webpack --mode production',
            'build:dev': 'webpack --mode development',
            'start': 'node server.js'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toHaveLength(2)
      expect(result.buildTools[0].buildScripts).toContain('build')
      expect(result.buildTools[0].buildScripts).toContain('build:dev')
      expect(result.buildTools[0].buildScripts).not.toContain('start')
    })

    it('should identify build scripts case-insensitively', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'vite': '^4.0.0' },
          scripts: {
            'build': 'VITE build',
            'dev': 'Vite'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toContain('build')
      expect(result.buildTools[0].buildScripts).toContain('dev')
    })

    it('should not duplicate script names', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'webpack': '^5.0.0' },
          scripts: {
            'build': 'webpack && webpack --mode production'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toHaveLength(1)
      expect(result.buildTools[0].buildScripts).toContain('build')
    })

    it('should handle empty scripts object', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: { 'vite': '^4.0.0' },
          scripts: {}
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.buildTools[0].buildScripts).toHaveLength(0)
    })
  })

  describe('Multiple Build Tools', () => {
    it('should detect multiple build tools in same repository', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'webpack': '^5.0.0',
            'vite': '^4.0.0',
            'rollup': '^3.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools).toHaveLength(3)
      expect(result.buildTools.map(t => t.name)).toContain('Webpack')
      expect(result.buildTools.map(t => t.name)).toContain('Vite')
      expect(result.buildTools.map(t => t.name)).toContain('Rollup')
    })

    it('should prioritize tools with config files', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'vite.config.ts', type: 'file', size: 50, sha: 'vite1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'webpack': '^5.0.0',
            'vite': '^4.0.0'
          }
        })],
        ['vite.config.ts', 'export default {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      // Vite should be first because it has a config file
      expect(result.buildTools[0].name).toBe('Vite')
      expect(result.buildTools[0].configFile).toBe('vite.config.ts')
      expect(result.buildTools[1].name).toBe('Webpack')
      expect(result.buildTools[1].configFile).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty repository', async () => {
      const context = createMockContext([])
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools).toHaveLength(0)
    })

    it('should handle repository without package.json', async () => {
      const files: FileNode[] = [
        { path: 'README.md', type: 'file', size: 100, sha: 'md1' }
      ]
      const contents = new Map([
        ['README.md', '# Test Project']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools).toHaveLength(0)
    })

    it('should handle malformed package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', 'invalid json {']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools).toHaveLength(0)
    })

    it('should handle package.json without dependencies', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ name: 'test-project' })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools).toHaveLength(0)
    })

    it('should detect build tool from config file even without package.json dependency', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'webpack.config.js', type: 'file', size: 50, sha: 'wp1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ name: 'test-project' })],
        ['webpack.config.js', 'module.exports = {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools).toHaveLength(1) // Should detect from config file
      expect(result.buildTools[0].name).toBe('Webpack')
      expect(result.buildTools[0].configFile).toBe('webpack.config.js')
      expect(result.buildTools[0].version).toBe('unknown')
    })

    it('should handle build tool in regular dependencies', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'vite': '^4.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools[0].name).toBe('Vite')
    })

    it('should handle package.json without scripts', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'webpack': '^5.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.buildTools[0].buildScripts).toHaveLength(0)
    })

    it('should handle multiple config file variants', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'webpack.config.js', type: 'file', size: 50, sha: 'wp1' },
        { path: 'webpack.config.ts', type: 'file', size: 50, sha: 'wp2' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ devDependencies: { 'webpack': '^5.0.0' } })],
        ['webpack.config.js', 'module.exports = {}'],
        ['webpack.config.ts', 'export default {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      // Should detect the first matching config file
      expect(result.buildTools[0].configFile).toBe('webpack.config.js')
    })
  })

  describe('Detector Metadata', () => {
    it('should have correct detector name', () => {
      expect(detector.name).toBe('BuildToolDetector')
    })

    it('should have no dependencies', () => {
      expect(detector.getDependencies()).toHaveLength(0)
    })

    it('should include detector name in result', async () => {
      const context = createMockContext([])
      const result = await detector.detect(context)

      expect(result.detectorName).toBe('BuildToolDetector')
    })
  })
})
