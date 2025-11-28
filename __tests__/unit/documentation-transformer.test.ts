import { describe, it, expect } from 'vitest'
import { DocumentationTransformer } from '@/lib/transformers/documentation/documentation-transformer'
import type { Task, TransformOptions } from '@/types/transformer'

describe('DocumentationTransformer', () => {
  const transformer = new DocumentationTransformer()

  describe('constructor', () => {
    it('should initialize with correct metadata', () => {
      const metadata = transformer.getMetadata()
      expect(metadata.name).toBe('DocumentationTransformer')
      expect(metadata.supportedPatternCategories).toContain('documentation')
      expect(metadata.supportedFrameworks).toContain('*')
    })
  })

  describe('transform - CHANGELOG generation', () => {
    it('should generate a new CHANGELOG when none exists', async () => {
      const task: Task = {
        id: 'doc-1',
        name: 'Generate CHANGELOG',
        description: 'Create changelog for recent changes',
        type: 'automated',
        estimatedMinutes: 10,
        automatedMinutes: 10,
        riskLevel: 'low',
        affectedFiles: ['CHANGELOG.md'],
        dependencies: [],
        breakingChanges: [],
        pattern: {
          id: 'doc-pattern-1',
          name: 'CHANGELOG Generation',
          category: 'documentation',
          severity: 'low',
          occurrences: 1,
          affectedFiles: ['CHANGELOG.md'],
          description: 'Generate changelog from transformations',
          automated: true,
        },
      }

      const options: TransformOptions = {}
      const result = await transformer.transform('', options, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('# Changelog')
      expect(result.code).toContain('## [Unreleased]')
      expect(result.metadata.filesModified).toContain('CHANGELOG.md')
      expect(result.metadata.confidenceScore).toBe(90)
      expect(result.metadata.riskScore).toBe(10)
    })

    it('should append to existing CHANGELOG', async () => {
      const existingChangelog = `# Changelog

## [1.0.0] - 2024-01-01

### Added
- Initial release
`

      const task: Task = {
        id: 'doc-2',
        name: 'Update CHANGELOG',
        description: 'Add new entry to changelog',
        type: 'automated',
        estimatedMinutes: 5,
        automatedMinutes: 5,
        riskLevel: 'low',
        affectedFiles: ['CHANGELOG.md'],
        dependencies: [],
        breakingChanges: [],
        pattern: {
          id: 'doc-pattern-2',
          name: 'Dependency Update',
          category: 'documentation',
          severity: 'low',
          occurrences: 1,
          affectedFiles: ['CHANGELOG.md'],
          description: 'Document dependency updates',
          automated: true,
        },
      }

      const result = await transformer.transform(existingChangelog, {}, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('## [Unreleased]')
      expect(result.code).toContain('## [1.0.0] - 2024-01-01')
      expect(result.code?.indexOf('Unreleased')).toBeLessThan(
        result.code?.indexOf('1.0.0') || 0
      )
    })
  })

  describe('transform - README update', () => {
    it('should create a basic README when none exists', async () => {
      const task: Task = {
        id: 'doc-3',
        name: 'Generate README',
        description: 'Create README for project',
        type: 'automated',
        estimatedMinutes: 15,
        automatedMinutes: 15,
        riskLevel: 'low',
        affectedFiles: ['README.md'],
        dependencies: [],
        breakingChanges: [],
        pattern: {
          id: 'doc-pattern-3',
          name: 'README Generation',
          category: 'documentation',
          severity: 'low',
          occurrences: 1,
          affectedFiles: ['README.md'],
          description: 'Generate README',
          automated: true,
        },
      }

      const result = await transformer.transform('', {}, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('# Project')
      expect(result.code).toContain('## Description')
      expect(result.code).toContain('## Getting Started')
      expect(result.metadata.filesModified).toContain('README.md')
    })

    it('should update existing README with recent changes', async () => {
      const existingReadme = `# My Project

## Description
A great project.

## Installation
npm install
`

      const task: Task = {
        id: 'doc-4',
        name: 'Update README',
        description: 'Add recent changes to README',
        type: 'automated',
        estimatedMinutes: 10,
        automatedMinutes: 10,
        riskLevel: 'low',
        affectedFiles: ['README.md'],
        dependencies: [],
        breakingChanges: [],
        pattern: {
          id: 'doc-pattern-4',
          name: 'Framework Migration',
          category: 'documentation',
          severity: 'medium',
          occurrences: 1,
          affectedFiles: ['README.md'],
          description: 'Document framework migration',
          automated: true,
        },
      }

      const result = await transformer.transform(existingReadme, {}, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('# My Project')
      expect(result.code).toContain('## Recent Changes')
      expect(result.code).toContain('Framework Migration')
    })
  })

  describe('transform - Migration Guide', () => {
    it('should generate a comprehensive migration guide', async () => {
      const task: Task = {
        id: 'doc-5',
        name: 'Generate Migration Guide',
        description: 'Create migration guide for framework upgrade',
        type: 'automated',
        estimatedMinutes: 20,
        automatedMinutes: 20,
        riskLevel: 'medium',
        affectedFiles: ['MIGRATION.md'],
        dependencies: [],
        breakingChanges: ['API changes', 'Breaking component updates'],
        pattern: {
          id: 'doc-pattern-5',
          name: 'Migration Guide',
          category: 'documentation',
          severity: 'medium',
          occurrences: 1,
          affectedFiles: ['MIGRATION.md'],
          description: 'Generate migration guide',
          automated: true,
        },
      }

      const result = await transformer.transform('', {}, task)

      expect(result.success).toBe(true)
      expect(result.code).toContain('# Migration Guide')
      expect(result.code).toContain('## Overview')
      expect(result.code).toContain('## Prerequisites')
      expect(result.code).toContain('## Changes Applied')
      expect(result.code).toContain('## Next Steps')
      expect(result.code).toContain('## Troubleshooting')
      expect(result.metadata.filesModified).toContain('MIGRATION.md')
    })
  })

  describe('error handling', () => {
    it('should handle transformation errors gracefully', async () => {
      // Pass invalid task that might cause issues
      const result = await transformer.transform('', {}, undefined)

      // Should still succeed with default behavior
      expect(result.success).toBe(true)
      expect(result.code).toContain('# Changelog')
    })
  })

  describe('canHandle', () => {
    it('should handle documentation category tasks', () => {
      const task: Task = {
        id: 'doc-6',
        name: 'Documentation Task',
        description: 'Generate docs',
        type: 'automated',
        estimatedMinutes: 10,
        automatedMinutes: 10,
        riskLevel: 'low',
        affectedFiles: [],
        dependencies: [],
        breakingChanges: [],
        pattern: {
          id: 'doc-pattern-6',
          name: 'Documentation',
          category: 'documentation',
          severity: 'low',
          occurrences: 1,
          affectedFiles: [],
          description: 'Generate documentation',
          automated: true,
        },
      }

      const sourceStack = {
        framework: 'React',
        version: '18.0.0',
        language: 'TypeScript',
        dependencies: {},
      }

      expect(transformer.canHandle(task, sourceStack)).toBe(true)
    })

    it('should not handle non-documentation tasks', () => {
      const task: Task = {
        id: 'dep-1',
        name: 'Dependency Task',
        description: 'Update deps',
        type: 'automated',
        estimatedMinutes: 10,
        automatedMinutes: 10,
        riskLevel: 'low',
        affectedFiles: [],
        dependencies: [],
        breakingChanges: [],
        pattern: {
          id: 'dep-pattern-1',
          name: 'Dependency Update',
          category: 'dependency',
          severity: 'low',
          occurrences: 1,
          affectedFiles: [],
          description: 'Update dependencies',
          automated: true,
        },
      }

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
