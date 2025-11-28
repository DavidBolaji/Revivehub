/**
 * Unit Tests for FrameworkRecognizer
 * Tests: Framework detection, version extraction, multi-framework repos, categorization
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FrameworkRecognizer } from '@/lib/scanner/detectors/framework'
import type { RepositoryContext, FileNode } from '@/lib/scanner/types'

describe('FrameworkRecognizer', () => {
  let detector: FrameworkRecognizer

  beforeEach(() => {
    detector = new FrameworkRecognizer()
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

  describe('Frontend Framework Detection - React', () => {
    it('should detect React from package.json dependencies', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'react': '^18.2.0',
            'react-dom': '^18.2.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend).toHaveLength(1)
      expect(result.frontend[0].name).toBe('React')
      expect(result.frontend[0].version).toBe('18.2.0')
      expect(result.frontend[0].category).toBe('frontend')
    })

    it('should detect React with config files for higher confidence', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: '.babelrc', type: 'file', size: 50, sha: 'babel1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'react': '^18.0.0' } })],
        ['.babelrc', '{}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend[0].configFiles).toContain('.babelrc')
      expect(result.frontend[0].confidence).toBeGreaterThan(80)
    })
  })

  describe('Frontend Framework Detection - Vue', () => {
    it('should detect Vue from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'vue': '^3.2.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend[0].name).toBe('Vue')
      expect(result.frontend[0].version).toBe('3.2.0')
    })

    it('should detect Vue with vue.config.js', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'vue.config.js', type: 'file', size: 50, sha: 'vue1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'vue': '^3.0.0' } })],
        ['vue.config.js', 'module.exports = {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.frontend[0].configFiles).toContain('vue.config.js')
    })
  })

  describe('Frontend Framework Detection - Angular', () => {
    it('should detect Angular from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { '@angular/core': '^15.0.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend[0].name).toBe('Angular')
      expect(result.frontend[0].version).toBe('15.0.0')
    })

    it('should detect Angular with angular.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'angular.json', type: 'file', size: 50, sha: 'ng1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { '@angular/core': '^15.0.0' } })],
        ['angular.json', '{}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.frontend[0].configFiles).toContain('angular.json')
      expect(result.frontend[0].confidence).toBeGreaterThan(90)
    })
  })

  describe('Frontend Framework Detection - Svelte', () => {
    it('should detect Svelte from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'svelte': '^3.55.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend[0].name).toBe('Svelte')
      expect(result.frontend[0].version).toBe('3.55.0')
    })
  })

  describe('Frontend Framework Detection - Next.js', () => {
    it('should detect Next.js from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'next': '^13.0.0', 'react': '^18.0.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      const nextjs = result.frontend.find(f => f.name === 'Next.js')
      expect(nextjs).toBeDefined()
      expect(nextjs?.version).toBe('13.0.0')
    })

    it('should detect Next.js with next.config.js', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'next.config.js', type: 'file', size: 50, sha: 'next1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'next': '^13.0.0' } })],
        ['next.config.js', 'module.exports = {}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      const nextjs = result.frontend.find(f => f.name === 'Next.js')
      expect(nextjs?.configFiles).toContain('next.config.js')
    })
  })

  describe('Frontend Framework Detection - Nuxt', () => {
    it('should detect Nuxt from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'nuxt': '^3.0.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend[0].name).toBe('Nuxt')
      expect(result.frontend[0].version).toBe('3.0.0')
    })
  })

  describe('Backend Framework Detection - Express', () => {
    it('should detect Express from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'express': '^4.18.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend).toHaveLength(1)
      expect(result.backend[0].name).toBe('Express')
      expect(result.backend[0].version).toBe('4.18.0')
      expect(result.backend[0].category).toBe('backend')
    })
  })

  describe('Backend Framework Detection - Django', () => {
    it('should detect Django from requirements.txt', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req1' }
      ]
      const contents = new Map([
        ['requirements.txt', 'Django==4.1.0\npsycopg2==2.9.0']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('Django')
      expect(result.backend[0].version).toBe('4.1.0')
    })

    it('should detect Django with manage.py', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req1' },
        { path: 'manage.py', type: 'file', size: 50, sha: 'mg1' }
      ]
      const contents = new Map([
        ['requirements.txt', 'django>=4.0.0'],
        ['manage.py', '#!/usr/bin/env python']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].configFiles).toContain('manage.py')
    })
  })

  describe('Backend Framework Detection - Rails', () => {
    it('should detect Rails from Gemfile', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem1' }
      ]
      const contents = new Map([
        ['Gemfile', 'gem "rails", "~> 7.0.0"\ngem "pg", "~> 1.1"']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('Rails')
      expect(result.backend[0].version).toBe('7.0.0')
    })

    it('should detect Rails with config/application.rb', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem1' },
        { path: 'config/application.rb', type: 'file', size: 50, sha: 'cfg1' }
      ]
      const contents = new Map([
        ['Gemfile', 'gem "rails", "~> 7.0"'],
        ['config/application.rb', 'module MyApp']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].configFiles).toContain('config/application.rb')
    })
  })

  describe('Backend Framework Detection - Laravel', () => {
    it('should detect Laravel from composer.json', async () => {
      const files: FileNode[] = [
        { path: 'composer.json', type: 'file', size: 100, sha: 'comp1' }
      ]
      const contents = new Map([
        ['composer.json', JSON.stringify({ require: { 'laravel/framework': '^9.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('Laravel')
      expect(result.backend[0].version).toBe('9.0')
    })

    it('should detect Laravel with artisan', async () => {
      const files: FileNode[] = [
        { path: 'composer.json', type: 'file', size: 100, sha: 'comp1' },
        { path: 'artisan', type: 'file', size: 50, sha: 'art1' }
      ]
      const contents = new Map([
        ['composer.json', JSON.stringify({ require: { 'laravel/framework': '^9.0' } })],
        ['artisan', '#!/usr/bin/env php']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].configFiles).toContain('artisan')
    })
  })

  describe('Backend Framework Detection - FastAPI', () => {
    it('should detect FastAPI from requirements.txt', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req1' }
      ]
      const contents = new Map([
        ['requirements.txt', 'fastapi==0.95.0\nuvicorn==0.21.0']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('FastAPI')
      expect(result.backend[0].version).toBe('0.95.0')
    })
  })

  describe('Backend Framework Detection - NestJS', () => {
    it('should detect NestJS from package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { '@nestjs/core': '^9.0.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('NestJS')
      expect(result.backend[0].version).toBe('9.0.0')
    })

    it('should detect NestJS with nest-cli.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'nest-cli.json', type: 'file', size: 50, sha: 'nest1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { '@nestjs/core': '^9.0.0' } })],
        ['nest-cli.json', '{}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].configFiles).toContain('nest-cli.json')
    })
  })

  describe('Version Extraction', () => {
    it('should extract version without caret prefix', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'react': '^18.2.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.frontend[0].version).toBe('18.2.0')
    })

    it('should extract version without tilde prefix', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem1' }
      ]
      const contents = new Map([
        ['Gemfile', 'gem "rails", "~> 7.0.0"']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].version).toBe('7.0.0')
    })

    it('should extract version without >= prefix', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req1' }
      ]
      const contents = new Map([
        ['requirements.txt', 'django>=4.0.0']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].version).toBe('4.0.0')
    })

    it('should handle exact version numbers', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req1' }
      ]
      const contents = new Map([
        ['requirements.txt', 'Django==4.1.0']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].version).toBe('4.1.0')
    })
  })

  describe('Multi-Framework Repositories', () => {
    it('should detect multiple frontend frameworks', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'react': '^18.0.0',
            'vue': '^3.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend).toHaveLength(2)
      expect(result.frontend.map(f => f.name)).toContain('React')
      expect(result.frontend.map(f => f.name)).toContain('Vue')
    })

    it('should detect multiple backend frameworks', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'express': '^4.18.0',
            '@nestjs/core': '^9.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend).toHaveLength(2)
      expect(result.backend.map(f => f.name)).toContain('Express')
      expect(result.backend.map(f => f.name)).toContain('NestJS')
    })

    it('should detect both frontend and backend frameworks', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            'next': '^13.0.0',
            'react': '^18.0.0',
            'express': '^4.18.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend.length).toBeGreaterThan(0)
      expect(result.backend.length).toBeGreaterThan(0)
    })
  })

  describe('Framework Categorization', () => {
    it('should categorize React as frontend', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'react': '^18.0.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.frontend[0].category).toBe('frontend')
      expect(result.backend).toHaveLength(0)
    })

    it('should categorize Express as backend', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'express': '^4.18.0' } })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.backend[0].category).toBe('backend')
      expect(result.frontend).toHaveLength(0)
    })

    it('should correctly categorize mixed frameworks', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'vue': '^3.0.0' } })],
        ['requirements.txt', 'fastapi==0.95.0']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.frontend[0].category).toBe('frontend')
      expect(result.backend[0].category).toBe('backend')
    })
  })

  describe('Confidence Scoring', () => {
    it('should have higher confidence with config files', async () => {
      const withConfig: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'next.config.js', type: 'file', size: 50, sha: 'next1' }
      ]
      const withoutConfig: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]

      const withConfigContents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'next': '^13.0.0' } })],
        ['next.config.js', 'module.exports = {}']
      ])
      const withoutConfigContents = new Map([
        ['package.json', JSON.stringify({ dependencies: { 'next': '^13.0.0' } })]
      ])

      const withConfigContext = createMockContext(withConfig, withConfigContents)
      const withoutConfigContext = createMockContext(withoutConfig, withoutConfigContents)

      const withConfigResult = await detector.detect(withConfigContext)
      const withoutConfigResult = await detector.detect(withoutConfigContext)

      const withConfigFramework = withConfigResult.frontend.find(f => f.name === 'Next.js')
      const withoutConfigFramework = withoutConfigResult.frontend.find(f => f.name === 'Next.js')

      expect(withConfigFramework?.confidence).toBeGreaterThan(withoutConfigFramework?.confidence || 0)
    })

    it('should sort frameworks by confidence', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' },
        { path: 'angular.json', type: 'file', size: 50, sha: 'ng1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          dependencies: {
            '@angular/core': '^15.0.0',
            'react': '^18.0.0'
          }
        })],
        ['angular.json', '{}']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      // Angular should have higher confidence due to config file
      expect(result.frontend[0].name).toBe('Angular')
      expect(result.frontend[0].confidence).toBeGreaterThan(result.frontend[1].confidence)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty repository', async () => {
      const context = createMockContext([])
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend).toHaveLength(0)
      expect(result.backend).toHaveLength(0)
    })

    it('should handle repository with no dependency files', async () => {
      const files: FileNode[] = [
        { path: 'README.md', type: 'file', size: 100, sha: 'md1' }
      ]
      const contents = new Map([
        ['README.md', '# Test Project']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend).toHaveLength(0)
      expect(result.backend).toHaveLength(0)
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
      expect(result.frontend).toHaveLength(0)
      expect(result.backend).toHaveLength(0)
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
      expect(result.frontend).toHaveLength(0)
      expect(result.backend).toHaveLength(0)
    })

    it('should handle requirements.txt with comments', async () => {
      const files: FileNode[] = [
        { path: 'requirements.txt', type: 'file', size: 100, sha: 'req1' }
      ]
      const contents = new Map([
        ['requirements.txt', '# This is a comment\nDjango==4.1.0\n# Another comment\npsycopg2==2.9.0']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('Django')
    })

    it('should handle Gemfile with comments', async () => {
      const files: FileNode[] = [
        { path: 'Gemfile', type: 'file', size: 100, sha: 'gem1' }
      ]
      const contents = new Map([
        ['Gemfile', '# Comment\ngem "rails", "~> 7.0.0"\n# Another comment']
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('Rails')
    })

    it('should handle devDependencies in package.json', async () => {
      const files: FileNode[] = [
        { path: 'package.json', type: 'file', size: 100, sha: 'pkg1' }
      ]
      const contents = new Map([
        ['package.json', JSON.stringify({
          devDependencies: {
            'react': '^18.0.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.frontend[0].name).toBe('React')
    })

    it('should handle require-dev in composer.json', async () => {
      const files: FileNode[] = [
        { path: 'composer.json', type: 'file', size: 100, sha: 'comp1' }
      ]
      const contents = new Map([
        ['composer.json', JSON.stringify({
          'require-dev': {
            'laravel/framework': '^9.0'
          }
        })]
      ])

      const context = createMockContext(files, contents)
      const result = await detector.detect(context)

      expect(result.success).toBe(true)
      expect(result.backend[0].name).toBe('Laravel')
    })
  })

  describe('Detector Metadata', () => {
    it('should have correct detector name', () => {
      expect(detector.name).toBe('FrameworkRecognizer')
    })

    it('should have no dependencies', () => {
      expect(detector.getDependencies()).toHaveLength(0)
    })

    it('should include detector name in result', async () => {
      const context = createMockContext([])
      const result = await detector.detect(context)

      expect(result.detectorName).toBe('FrameworkRecognizer')
    })
  })
})
