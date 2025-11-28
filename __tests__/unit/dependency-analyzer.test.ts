/**
 * Unit Tests for DependencyAnalyzer
 * Tests: Parsing for each package manager, version comparison, outdated detection, severity classification
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DependencyAnalyzer } from '@/lib/scanner/detectors/dependency'
import type { RepositoryContext, FileNode } from '@/lib/scanner/types'

describe('DependencyAnalyzer', () => {
  let analyzer: DependencyAnalyzer

  beforeEach(() => {
    analyzer = new DependencyAnalyzer()
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

  describe('NPM Package.json Parsing', () => {
    it('should parse npm dependencies from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'react': '^18.2.0',
            'express': '~4.18.0',
            'lodash': '4.17.21'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(3)
      expect(result.dependencies[0].name).toBe('react')
      expect(result.dependencies[0].installedVersion).toBe('18.2.0')
      expect(result.dependencies[0].ecosystem).toBe('npm')
      expect(result.dependencies[0].type).toBe('direct')
    })

    it('should parse npm devDependencies from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'vitest': '^1.0.0',
            'typescript': '~5.2.0',
            'eslint': '8.50.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.devDependencies).toHaveLength(3)
      expect(result.devDependencies[0].name).toBe('vitest')
      expect(result.devDependencies[0].installedVersion).toBe('1.0.0')
      expect(result.devDependencies[0].ecosystem).toBe('npm')
      expect(result.devDependencies[0].type).toBe('dev')
    })

    it('should parse both dependencies and devDependencies', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'react': '^18.2.0',
            'express': '4.18.0'
          },
          devDependencies: {
            'vitest': '^1.0.0',
            'typescript': '5.2.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(2)
      expect(result.devDependencies).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.devCount).toBe(2)
    })

    it('should handle version prefixes (^, ~, >=)', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'pkg1': '^1.2.3',
            'pkg2': '~2.3.4',
            'pkg3': '>=3.4.5',
            'pkg4': '<4.5.6',
            'pkg5': '5.6.7'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies[0].installedVersion).toBe('1.2.3')
      expect(result.dependencies[1].installedVersion).toBe('2.3.4')
      expect(result.dependencies[2].installedVersion).toBe('3.4.5')
      expect(result.dependencies[3].installedVersion).toBe('4.5.6')
      expect(result.dependencies[4].installedVersion).toBe('5.6.7')
    })
  })

  describe('Python requirements.txt Parsing', () => {
    it('should parse pip dependencies from requirements.txt', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req123' }
      ]
      const contents = new Map([
        ['requirements.txt', 'flask==2.3.0\ndjango>=4.2.0\nrequests~=2.31.0']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(3)
      expect(result.dependencies[0].name).toBe('flask')
      expect(result.dependencies[0].installedVersion).toBe('2.3.0')
      expect(result.dependencies[0].ecosystem).toBe('pip')
      expect(result.dependencies[0].type).toBe('direct')
    })

    it('should handle requirements.txt with comments and empty lines', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req123' }
      ]
      const contents = new Map([
        ['requirements.txt', `# Web framework
flask==2.3.0

# Database
sqlalchemy==2.0.0
# ORM tools
alembic==1.12.0`]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(3)
      expect(result.dependencies[0].name).toBe('flask')
      expect(result.dependencies[1].name).toBe('sqlalchemy')
      expect(result.dependencies[2].name).toBe('alembic')
    })

    it('should handle requirements.txt with packages without versions', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req123' }
      ]
      const contents = new Map([
        ['requirements.txt', 'flask==2.3.0\nrequests\npytest']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(3)
      expect(result.dependencies[1].name).toBe('requests')
      expect(result.dependencies[1].installedVersion).toBe('latest')
      expect(result.dependencies[2].name).toBe('pytest')
      expect(result.dependencies[2].installedVersion).toBe('latest')
    })
  })

  describe('Ruby Gemfile Parsing', () => {
    it('should parse gem dependencies from Gemfile', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem123' }
      ]
      const contents = new Map([
        ['Gemfile', `gem 'rails', '7.0.0'
gem 'pg', '1.5.0'
gem 'puma', '~> 6.0'`]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(3)
      expect(result.dependencies[0].name).toBe('rails')
      expect(result.dependencies[0].installedVersion).toBe('7.0.0')
      expect(result.dependencies[0].ecosystem).toBe('gem')
      expect(result.dependencies[0].type).toBe('direct')
    })

    it('should handle Gemfile with double quotes', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem123' }
      ]
      const contents = new Map([
        ['Gemfile', `gem "rails", "7.0.0"
gem "pg", "1.5.0"`]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(2)
      expect(result.dependencies[0].name).toBe('rails')
      expect(result.dependencies[0].installedVersion).toBe('7.0.0')
    })

    it('should handle Gemfile with gems without versions', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem123' }
      ]
      const contents = new Map([
        ['Gemfile', `gem 'rails', '7.0.0'
gem 'pg'
gem 'puma'`]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(3)
      expect(result.dependencies[1].name).toBe('pg')
      expect(result.dependencies[1].installedVersion).toBe('latest')
      expect(result.dependencies[2].name).toBe('puma')
      expect(result.dependencies[2].installedVersion).toBe('latest')
    })

    it('should handle Gemfile with comments', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem123' }
      ]
      const contents = new Map([
        ['Gemfile', `# Web framework
gem 'rails', '7.0.0'
# Database
gem 'pg', '1.5.0'`]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(2)
    })
  })

  describe('PHP composer.json Parsing', () => {
    it('should parse composer dependencies from composer.json', async () => {
      const files: FileNode[] = [
        { path: 'composer.json', type: 'file', size: 200, sha: 'comp123' }
      ]
      const contents = new Map([
        ['composer.json', JSON.stringify({
          require: {
            'php': '>=8.1',
            'laravel/framework': '^10.0',
            'guzzlehttp/guzzle': '~7.5'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(2) // PHP version is skipped
      expect(result.dependencies[0].name).toBe('laravel/framework')
      expect(result.dependencies[0].installedVersion).toBe('10.0')
      expect(result.dependencies[0].ecosystem).toBe('composer')
      expect(result.dependencies[0].type).toBe('direct')
    })

    it('should parse composer devDependencies from composer.json', async () => {
      const files: FileNode[] = [
        { path: 'composer.json', type: 'file', size: 200, sha: 'comp123' }
      ]
      const contents = new Map([
        ['composer.json', JSON.stringify({
          'require-dev': {
            'phpunit/phpunit': '^10.0',
            'mockery/mockery': '~1.6'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.devDependencies).toHaveLength(2)
      expect(result.devDependencies[0].name).toBe('phpunit/phpunit')
      expect(result.devDependencies[0].installedVersion).toBe('10.0')
      expect(result.devDependencies[0].ecosystem).toBe('composer')
      expect(result.devDependencies[0].type).toBe('dev')
    })

    it('should parse both require and require-dev', async () => {
      const files: FileNode[] = [
        { path: 'composer.json', type: 'file', size: 200, sha: 'comp123' }
      ]
      const contents = new Map([
        ['composer.json', JSON.stringify({
          require: {
            'laravel/framework': '^10.0',
            'guzzlehttp/guzzle': '7.5.0'
          },
          'require-dev': {
            'phpunit/phpunit': '^10.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(2)
      expect(result.devDependencies).toHaveLength(1)
      expect(result.totalCount).toBe(2)
      expect(result.devCount).toBe(1)
    })
  })

  describe('Multi-Ecosystem Parsing', () => {
    it('should parse dependencies from multiple package managers', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' },
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req123' },
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem123' },
        { path: 'composer.json', type: 'file', size: 200, sha: 'comp123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: { 'react': '^18.2.0' }
        })],
        ['requirements.txt', 'flask==2.3.0'],
        ['Gemfile', `gem 'rails', '7.0.0'`],
        ['composer.json', JSON.stringify({
          require: { 'laravel/framework': '^10.0' }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(4)
      
      const ecosystems = result.dependencies.map(d => d.ecosystem)
      expect(ecosystems).toContain('npm')
      expect(ecosystems).toContain('pip')
      expect(ecosystems).toContain('gem')
      expect(ecosystems).toContain('composer')
    })
  })

  describe('Version Comparison Logic', () => {
    it('should identify outdated dependencies based on major version', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'old-pkg': '0.5.0',  // Pre-1.0, considered very outdated
            'older-pkg': '1.2.0', // Version 1.x, considered outdated
            'recent-pkg': '3.0.0', // Version 3.x, might be outdated
            'current-pkg': '10.0.0' // Version 10+, considered current
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.outdatedDependencies.length).toBeGreaterThan(0)
      
      // Check that pre-1.0 versions are flagged
      const preMajorOutdated = result.outdatedDependencies.find(d => d.name === 'old-pkg')
      expect(preMajorOutdated).toBeDefined()
      expect(preMajorOutdated?.majorVersionsBehind).toBeGreaterThan(0)
    })

    it('should calculate correct severity for outdated dependencies', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'critical-pkg': '0.5.0',  // Should be critical (3+ versions behind)
            'warning-pkg': '1.2.0',   // Should be warning (1-2 versions behind)
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      
      const criticalDep = result.outdatedDependencies.find(d => d.name === 'critical-pkg')
      const warningDep = result.outdatedDependencies.find(d => d.name === 'warning-pkg')
      
      if (criticalDep) {
        expect(criticalDep.severity).toBe('critical')
        expect(criticalDep.majorVersionsBehind).toBeGreaterThan(2)
      }
      
      if (warningDep) {
        expect(warningDep.severity).toBe('warning')
        expect(warningDep.majorVersionsBehind).toBeGreaterThanOrEqual(1)
        expect(warningDep.majorVersionsBehind).toBeLessThanOrEqual(2)
      }
    })

    it('should not flag current versions as outdated', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'current-pkg': '10.5.0',
            'recent-pkg': '8.2.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      
      const currentOutdated = result.outdatedDependencies.find(d => d.name === 'current-pkg')
      const recentOutdated = result.outdatedDependencies.find(d => d.name === 'recent-pkg')
      
      expect(currentOutdated).toBeUndefined()
      expect(recentOutdated).toBeUndefined()
    })

    it('should skip dependencies without version info', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req123' }
      ]
      const contents = new Map([
        ['requirements.txt', 'flask\ndjango\nrequests==2.31.0']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(3)
      
      // Dependencies without versions should not be in outdated list
      const flaskOutdated = result.outdatedDependencies.find(d => d.name === 'flask')
      const djangoOutdated = result.outdatedDependencies.find(d => d.name === 'django')
      
      expect(flaskOutdated).toBeUndefined()
      expect(djangoOutdated).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle repository with no package manager files', async () => {
      const files: FileNode[] = [
        { path: 'README.md', type: 'file', size: 100, sha: 'md1' }
      ]
      const contents = new Map([
        ['README.md', '# Test Project']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(0)
      expect(result.devDependencies).toHaveLength(0)
      expect(result.outdatedDependencies).toHaveLength(0)
      expect(result.totalCount).toBe(0)
      expect(result.devCount).toBe(0)
    })

    it('should handle malformed package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 50, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', '{ invalid json }']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(0)
    })

    it('should handle empty package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 10, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', '{}']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(0)
      expect(result.devDependencies).toHaveLength(0)
    })

    it('should handle empty requirements.txt', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 0, sha: 'req123' }
      ]
      const contents = new Map([
        ['requirements.txt', '']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(0)
    })

    it('should handle malformed composer.json', async () => {
      const files: FileNode[] = [
        { path: 'composer.json', type: 'file', size: 50, sha: 'comp123' }
      ]
      const contents = new Map([
        ['composer.json', '{ "require": invalid }']
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.dependencies).toHaveLength(0)
    })
  })

  describe('Detector Metadata', () => {
    it('should have correct detector name', () => {
      expect(analyzer.name).toBe('DependencyAnalyzer')
    })

    it('should have no dependencies', () => {
      expect(analyzer.getDependencies()).toHaveLength(0)
    })

    it('should include detector name in result', async () => {
      const context = createMockContext([])
      const result = await analyzer.detect(context)

      expect(result.detectorName).toBe('DependencyAnalyzer')
    })

    it('should mark result as successful', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 200, sha: 'pkg123' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: { 'react': '^18.2.0' }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await analyzer.detect(context)

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})
