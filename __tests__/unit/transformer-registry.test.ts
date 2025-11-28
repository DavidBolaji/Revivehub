/**
 * Unit tests for TransformerRegistry
 * 
 * Tests transformer registration, lookup, routing, and management functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TransformerRegistry } from '../../lib/transformers/transformer-registry'
import { BaseTransformer } from '../../lib/transformers/base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
  SourceStack,
  Pattern,
} from '@/types/transformer'

// Mock transformer implementations for testing
class MockDependencyTransformer extends BaseTransformer {
  constructor() {
    super('MockDependencyTransformer', ['dependency'], ['*'])
  }

  async transform(
    code: string,
    options: TransformOptions
  ): Promise<TransformResult> {
    return {
      success: true,
      code: code + '// dependency transformed',
      metadata: this.createBaseMetadata(['package.json'], 80),
      errors: [],
      warnings: [],
    }
  }
}

class MockReactTransformer extends BaseTransformer {
  constructor() {
    super('MockReactTransformer', ['code-quality', 'structural'], ['React'])
  }

  async transform(
    code: string,
    options: TransformOptions
  ): Promise<TransformResult> {
    return {
      success: true,
      code: code + '// react transformed',
      metadata: this.createBaseMetadata(['Component.tsx'], 75),
      errors: [],
      warnings: [],
    }
  }
}

class MockNextJSTransformer extends BaseTransformer {
  constructor() {
    super('MockNextJSTransformer', ['structural'], ['Next.js'])
  }

  async transform(
    code: string,
    options: TransformOptions
  ): Promise<TransformResult> {
    return {
      success: true,
      code: code + '// nextjs transformed',
      metadata: this.createBaseMetadata(['page.tsx'], 70),
      errors: [],
      warnings: [],
    }
  }
}

class MockGenericTransformer extends BaseTransformer {
  constructor() {
    super('MockGenericTransformer', ['documentation'], ['*'])
  }

  async transform(
    code: string,
    options: TransformOptions
  ): Promise<TransformResult> {
    return {
      success: true,
      code: code + '// generic transformed',
      metadata: this.createBaseMetadata(['README.md'], 90),
      errors: [],
      warnings: [],
    }
  }
}

// Helper function to create mock tasks
function createMockTask(
  id: string,
  category: 'dependency' | 'structural' | 'code-quality' | 'documentation',
  framework?: string
): Task {
  const pattern: Pattern = {
    id: `pattern-${id}`,
    name: `Test Pattern ${id}`,
    category,
    severity: 'medium',
    occurrences: 1,
    affectedFiles: ['test.ts'],
    description: 'Test pattern',
    automated: true,
  }

  return {
    id,
    name: `Test Task ${id}`,
    description: 'Test task description',
    type: 'automated',
    estimatedMinutes: 10,
    automatedMinutes: 10,
    riskLevel: 'low',
    affectedFiles: ['test.ts'],
    dependencies: [],
    breakingChanges: [],
    pattern,
  }
}

// Helper function to create mock source stack
function createMockSourceStack(framework: string): SourceStack {
  return {
    framework,
    version: '1.0.0',
    language: 'TypeScript',
    dependencies: {},
  }
}

describe('TransformerRegistry', () => {
  let registry: TransformerRegistry

  beforeEach(() => {
    registry = new TransformerRegistry()
  })

  describe('register()', () => {
    it('should register a transformer successfully', () => {
      const transformer = new MockDependencyTransformer()
      
      expect(() => registry.register(transformer)).not.toThrow()
      expect(registry.getAll()).toHaveLength(1)
    })

    it('should register multiple transformers', () => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())

      expect(registry.getAll()).toHaveLength(3)
    })

    it('should replace existing transformer with same name', () => {
      const transformer1 = new MockDependencyTransformer()
      const transformer2 = new MockDependencyTransformer()

      registry.register(transformer1)
      registry.register(transformer2)

      expect(registry.getAll()).toHaveLength(1)
      expect(registry.getByName('MockDependencyTransformer')).toBe(transformer2)
    })

    it('should throw error for null transformer', () => {
      expect(() => registry.register(null as any)).toThrow('Cannot register null or undefined transformer')
    })

    it('should throw error for undefined transformer', () => {
      expect(() => registry.register(undefined as any)).toThrow('Cannot register null or undefined transformer')
    })

    it('should index transformer by pattern categories', () => {
      registry.register(new MockReactTransformer())

      expect(registry.hasTransformer('code-quality')).toBe(true)
      expect(registry.hasTransformer('structural')).toBe(true)
    })

    it('should index transformer by frameworks', () => {
      registry.register(new MockReactTransformer())

      const transformers = registry.getByCategory('code-quality', createMockSourceStack('React'))
      expect(transformers).toHaveLength(1)
    })
  })

  describe('getByCategory()', () => {
    beforeEach(() => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
      registry.register(new MockGenericTransformer())
    })

    it('should return transformers for a category', () => {
      const transformers = registry.getByCategory('dependency')
      
      expect(transformers).toHaveLength(1)
      expect(transformers[0].getMetadata().name).toBe('MockDependencyTransformer')
    })

    it('should return multiple transformers for a category', () => {
      const transformers = registry.getByCategory('structural')
      
      expect(transformers.length).toBeGreaterThanOrEqual(2)
      const names = transformers.map(t => t.getMetadata().name)
      expect(names).toContain('MockReactTransformer')
      expect(names).toContain('MockNextJSTransformer')
    })

    it('should return empty array for unknown category', () => {
      const transformers = registry.getByCategory('unknown-category')
      
      expect(transformers).toHaveLength(0)
    })

    it('should filter by framework when sourceStack provided', () => {
      const sourceStack = createMockSourceStack('React')
      const transformers = registry.getByCategory('structural', sourceStack)
      
      expect(transformers).toHaveLength(1)
      expect(transformers[0].getMetadata().name).toBe('MockReactTransformer')
    })

    it('should include generic transformers for any framework', () => {
      const sourceStack = createMockSourceStack('Vue')
      const transformers = registry.getByCategory('documentation', sourceStack)
      
      expect(transformers).toHaveLength(1)
      expect(transformers[0].getMetadata().name).toBe('MockGenericTransformer')
    })

    it('should sort framework-specific before generic', () => {
      const sourceStack = createMockSourceStack('React')
      const transformers = registry.getByCategory('code-quality', sourceStack)
      
      // MockReactTransformer should come before any generic transformers
      expect(transformers[0].getMetadata().supportedFrameworks).not.toContain('*')
    })

    it('should return all transformers when no sourceStack provided', () => {
      const transformers = registry.getByCategory('structural')
      
      expect(transformers.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle case-insensitive framework matching', () => {
      const sourceStack = createMockSourceStack('react') // lowercase
      const transformers = registry.getByCategory('code-quality', sourceStack)
      
      expect(transformers.length).toBeGreaterThan(0)
      expect(transformers[0].getMetadata().name).toBe('MockReactTransformer')
    })
  })

  describe('getForTask()', () => {
    beforeEach(() => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
      registry.register(new MockGenericTransformer())
    })

    it('should return appropriate transformer for dependency task', () => {
      const task = createMockTask('dep-1', 'dependency')
      const sourceStack = createMockSourceStack('React')
      
      const transformer = registry.getForTask(task, sourceStack)
      
      expect(transformer).not.toBeNull()
      expect(transformer?.getMetadata().name).toBe('MockDependencyTransformer')
    })

    it('should return framework-specific transformer for React task', () => {
      const task = createMockTask('react-1', 'code-quality')
      const sourceStack = createMockSourceStack('React')
      
      const transformer = registry.getForTask(task, sourceStack)
      
      expect(transformer).not.toBeNull()
      expect(transformer?.getMetadata().name).toBe('MockReactTransformer')
    })

    it('should return framework-specific transformer for Next.js task', () => {
      const task = createMockTask('nextjs-1', 'structural')
      const sourceStack = createMockSourceStack('Next.js')
      
      const transformer = registry.getForTask(task, sourceStack)
      
      expect(transformer).not.toBeNull()
      expect(transformer?.getMetadata().name).toBe('MockNextJSTransformer')
    })

    it('should return generic transformer when no framework-specific match', () => {
      const task = createMockTask('doc-1', 'documentation')
      const sourceStack = createMockSourceStack('Vue')
      
      const transformer = registry.getForTask(task, sourceStack)
      
      expect(transformer).not.toBeNull()
      expect(transformer?.getMetadata().name).toBe('MockGenericTransformer')
    })

    it('should return null for task with no matching transformer', () => {
      const task = createMockTask('unknown-1', 'code-quality')
      const sourceStack = createMockSourceStack('Vue') // No Vue transformer registered
      
      const transformer = registry.getForTask(task, sourceStack)
      
      expect(transformer).toBeNull()
    })

    it('should return null for null task', () => {
      const sourceStack = createMockSourceStack('React')
      
      const transformer = registry.getForTask(null as any, sourceStack)
      
      expect(transformer).toBeNull()
    })

    it('should return null for task without pattern', () => {
      const task = { ...createMockTask('test-1', 'dependency'), pattern: null as any }
      const sourceStack = createMockSourceStack('React')
      
      const transformer = registry.getForTask(task, sourceStack)
      
      expect(transformer).toBeNull()
    })

    it('should use canHandle() for final validation', () => {
      const task = createMockTask('test-1', 'structural')
      const sourceStack = createMockSourceStack('React')
      
      const transformer = registry.getForTask(task, sourceStack)
      
      expect(transformer).not.toBeNull()
      expect(transformer?.canHandle(task, sourceStack)).toBe(true)
    })
  })

  describe('getAll()', () => {
    it('should return empty array when no transformers registered', () => {
      expect(registry.getAll()).toHaveLength(0)
    })

    it('should return all registered transformers', () => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())

      const all = registry.getAll()
      
      expect(all).toHaveLength(3)
      const names = all.map(t => t.getMetadata().name)
      expect(names).toContain('MockDependencyTransformer')
      expect(names).toContain('MockReactTransformer')
      expect(names).toContain('MockNextJSTransformer')
    })

    it('should return array of BaseTransformer instances', () => {
      registry.register(new MockDependencyTransformer())
      
      const all = registry.getAll()
      
      expect(all[0]).toBeInstanceOf(BaseTransformer)
    })
  })

  describe('hasTransformer()', () => {
    beforeEach(() => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
    })

    it('should return true for registered category', () => {
      expect(registry.hasTransformer('dependency')).toBe(true)
      expect(registry.hasTransformer('code-quality')).toBe(true)
      expect(registry.hasTransformer('structural')).toBe(true)
    })

    it('should return false for unregistered category', () => {
      expect(registry.hasTransformer('unknown-category')).toBe(false)
    })

    it('should return false for empty registry', () => {
      const emptyRegistry = new TransformerRegistry()
      expect(emptyRegistry.hasTransformer('dependency')).toBe(false)
    })
  })

  describe('getByName()', () => {
    beforeEach(() => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
    })

    it('should return transformer by name', () => {
      const transformer = registry.getByName('MockDependencyTransformer')
      
      expect(transformer).toBeDefined()
      expect(transformer?.getMetadata().name).toBe('MockDependencyTransformer')
    })

    it('should return undefined for unknown name', () => {
      const transformer = registry.getByName('UnknownTransformer')
      
      expect(transformer).toBeUndefined()
    })

    it('should return correct transformer when multiple registered', () => {
      const transformer = registry.getByName('MockReactTransformer')
      
      expect(transformer).toBeDefined()
      expect(transformer?.getMetadata().name).toBe('MockReactTransformer')
    })
  })

  describe('unregister()', () => {
    beforeEach(() => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
    })

    it('should unregister transformer by name', () => {
      const result = registry.unregister('MockDependencyTransformer')
      
      expect(result).toBe(true)
      expect(registry.getByName('MockDependencyTransformer')).toBeUndefined()
      expect(registry.getAll()).toHaveLength(2)
    })

    it('should return false for unknown transformer', () => {
      const result = registry.unregister('UnknownTransformer')
      
      expect(result).toBe(false)
      expect(registry.getAll()).toHaveLength(3)
    })

    it('should clean up category mappings', () => {
      registry.unregister('MockDependencyTransformer')
      
      expect(registry.hasTransformer('dependency')).toBe(false)
    })

    it('should not affect other transformers', () => {
      registry.unregister('MockDependencyTransformer')
      
      expect(registry.getByName('MockReactTransformer')).toBeDefined()
      expect(registry.getByName('MockNextJSTransformer')).toBeDefined()
    })

    it('should allow re-registration after unregister', () => {
      registry.unregister('MockDependencyTransformer')
      registry.register(new MockDependencyTransformer())
      
      expect(registry.getByName('MockDependencyTransformer')).toBeDefined()
      expect(registry.hasTransformer('dependency')).toBe(true)
    })
  })

  describe('getStats()', () => {
    it('should return stats for empty registry', () => {
      const stats = registry.getStats()
      
      expect(stats.totalTransformers).toBe(0)
      expect(stats.categories).toHaveLength(0)
      expect(stats.frameworks).toHaveLength(0)
    })

    it('should return correct stats for registered transformers', () => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
      
      const stats = registry.getStats()
      
      expect(stats.totalTransformers).toBe(3)
      expect(stats.categories.length).toBeGreaterThan(0)
      expect(stats.frameworks.length).toBeGreaterThan(0)
    })

    it('should count transformers by category', () => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
      
      const stats = registry.getStats()
      
      expect(stats.transformersByCategory['dependency']).toBe(1)
      expect(stats.transformersByCategory['structural']).toBe(2)
      expect(stats.transformersByCategory['code-quality']).toBe(1)
    })

    it('should list all categories', () => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      
      const stats = registry.getStats()
      
      expect(stats.categories).toContain('dependency')
      expect(stats.categories).toContain('code-quality')
      expect(stats.categories).toContain('structural')
    })

    it('should list all frameworks', () => {
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
      
      const stats = registry.getStats()
      
      expect(stats.frameworks).toContain('React')
      expect(stats.frameworks).toContain('Next.js')
    })
  })

  describe('clear()', () => {
    beforeEach(() => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
    })

    it('should clear all transformers', () => {
      registry.clear()
      
      expect(registry.getAll()).toHaveLength(0)
    })

    it('should clear category mappings', () => {
      registry.clear()
      
      expect(registry.hasTransformer('dependency')).toBe(false)
      expect(registry.hasTransformer('structural')).toBe(false)
    })

    it('should clear stats', () => {
      registry.clear()
      
      const stats = registry.getStats()
      expect(stats.totalTransformers).toBe(0)
      expect(stats.categories).toHaveLength(0)
      expect(stats.frameworks).toHaveLength(0)
    })

    it('should allow registration after clear', () => {
      registry.clear()
      registry.register(new MockDependencyTransformer())
      
      expect(registry.getAll()).toHaveLength(1)
      expect(registry.hasTransformer('dependency')).toBe(true)
    })
  })

  describe('integration scenarios', () => {
    it('should handle complex multi-transformer routing', () => {
      registry.register(new MockDependencyTransformer())
      registry.register(new MockReactTransformer())
      registry.register(new MockNextJSTransformer())
      registry.register(new MockGenericTransformer())

      // Dependency task should route to dependency transformer
      const depTask = createMockTask('dep-1', 'dependency')
      const depTransformer = registry.getForTask(depTask, createMockSourceStack('React'))
      expect(depTransformer?.getMetadata().name).toBe('MockDependencyTransformer')

      // React structural task should route to React transformer
      const reactTask = createMockTask('react-1', 'structural')
      const reactTransformer = registry.getForTask(reactTask, createMockSourceStack('React'))
      expect(reactTransformer?.getMetadata().name).toBe('MockReactTransformer')

      // Next.js structural task should route to Next.js transformer
      const nextTask = createMockTask('next-1', 'structural')
      const nextTransformer = registry.getForTask(nextTask, createMockSourceStack('Next.js'))
      expect(nextTransformer?.getMetadata().name).toBe('MockNextJSTransformer')

      // Documentation task should route to generic transformer
      const docTask = createMockTask('doc-1', 'documentation')
      const docTransformer = registry.getForTask(docTask, createMockSourceStack('Vue'))
      expect(docTransformer?.getMetadata().name).toBe('MockGenericTransformer')
    })

    it('should prioritize framework-specific over generic transformers', () => {
      registry.register(new MockReactTransformer())
      registry.register(new MockGenericTransformer())

      const task = createMockTask('test-1', 'code-quality')
      const sourceStack = createMockSourceStack('React')
      
      const transformer = registry.getForTask(task, sourceStack)
      
      // Should get React-specific transformer, not generic
      expect(transformer?.getMetadata().name).toBe('MockReactTransformer')
    })

    it('should handle transformer replacement correctly', () => {
      const transformer1 = new MockDependencyTransformer()
      registry.register(transformer1)

      const task = createMockTask('dep-1', 'dependency')
      const sourceStack = createMockSourceStack('React')
      
      const result1 = registry.getForTask(task, sourceStack)
      expect(result1).toBe(transformer1)

      // Replace with new instance
      const transformer2 = new MockDependencyTransformer()
      registry.register(transformer2)

      const result2 = registry.getForTask(task, sourceStack)
      expect(result2).toBe(transformer2)
      expect(result2).not.toBe(transformer1)
    })
  })
})
