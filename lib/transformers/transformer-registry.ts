/**
 * TransformerRegistry - Centralized registry for managing and routing transformers
 * 
 * Provides a singleton registry for:
 * - Registering transformers with pattern categories and framework support
 * - Looking up transformers by category with framework filtering
 * - Routing tasks to appropriate transformers based on pattern metadata
 * - Managing transformer lifecycle and metadata
 * 
 * The registry uses pattern categories (dependency, structural, code-quality, documentation)
 * and framework compatibility to intelligently route transformation tasks to the correct transformer.
 * 
 * @example
 * ```typescript
 * import { transformerRegistry } from './transformer-registry'
 * import { MyTransformer } from './my-transformer'
 * 
 * // Register a transformer
 * transformerRegistry.register(new MyTransformer())
 * 
 * // Get transformer for a task
 * const transformer = transformerRegistry.getForTask(task, sourceStack)
 * if (transformer) {
 *   const result = await transformer.transform(code, options)
 * }
 * ```
 */

import type { Task, SourceStack } from '@/types/transformer'
import { BaseTransformer } from './base-transformer'

/**
 * Registry for managing transformer instances and routing
 */
export class TransformerRegistry {
  private transformers: Map<string, BaseTransformer>
  private categoryMap: Map<string, Set<string>>
  private frameworkMap: Map<string, Set<string>>

  constructor() {
    this.transformers = new Map()
    this.categoryMap = new Map()
    this.frameworkMap = new Map()
  }

  /**
   * Registers a transformer in the registry
   * 
   * Adds the transformer to internal maps for efficient lookup by:
   * - Transformer name (unique identifier)
   * - Pattern categories (dependency, structural, code-quality, documentation)
   * - Supported frameworks (React, Next.js, Vue, etc.)
   * 
   * If a transformer with the same name already exists, it will be replaced.
   * 
   * @param transformer - BaseTransformer instance to register
   * @throws Error if transformer is invalid or missing required metadata
   * 
   * @example
   * ```typescript
   * const registry = new TransformerRegistry()
   * registry.register(new DependencyUpdaterTransformer())
   * registry.register(new ClassToHooksTransformer())
   * ```
   */
  register(transformer: BaseTransformer): void {
    if (!transformer) {
      throw new Error('Cannot register null or undefined transformer')
    }

    const metadata = transformer.getMetadata()
    console.log(`[REGISTRY] Registering transformer:`, metadata)

    if (!metadata.name) {
      throw new Error('Transformer must have a name')
    }

    if (!metadata.supportedPatternCategories || metadata.supportedPatternCategories.length === 0) {
      throw new Error(`Transformer ${metadata.name} must support at least one pattern category`)
    }

    // Store transformer by name
    this.transformers.set(metadata.name, transformer)

    // Index by pattern categories
    for (const category of metadata.supportedPatternCategories) {
      if (!this.categoryMap.has(category)) {
        this.categoryMap.set(category, new Set())
      }
      this.categoryMap.get(category)!.add(metadata.name)
      console.log(`[REGISTRY] Added ${metadata.name} to category '${category}'`)
    }

    // Index by frameworks
    for (const framework of metadata.supportedFrameworks) {
      if (!this.frameworkMap.has(framework)) {
        this.frameworkMap.set(framework, new Set())
      }
      this.frameworkMap.get(framework)!.add(metadata.name)
      console.log(`[REGISTRY] Added ${metadata.name} to framework '${framework}'`)
    }
  }

  /**
   * Gets transformers by pattern category with optional framework filtering
   * 
   * Looks up all transformers that support the specified pattern category.
   * If sourceStack is provided, filters results to only include transformers
   * that support the source framework.
   * 
   * Returns transformers sorted by specificity:
   * 1. Framework-specific transformers first
   * 2. Generic transformers (supporting '*') last
   * 
   * @param category - Pattern category (dependency, structural, code-quality, documentation)
   * @param sourceStack - Optional source stack for framework filtering
   * @returns Array of matching transformers, sorted by specificity
   * 
   * @example
   * ```typescript
   * // Get all dependency transformers
   * const depTransformers = registry.getByCategory('dependency')
   * 
   * // Get React-specific structural transformers
   * const reactTransformers = registry.getByCategory('structural', { framework: 'React', ... })
   * ```
   */
  getByCategory(
    category: string,
    sourceStack?: SourceStack
  ): BaseTransformer[] {
    console.log(`[REGISTRY] getByCategory: category='${category}', sourceStack=`, sourceStack)
    
    const transformerNames = this.categoryMap.get(category)
    console.log(`[REGISTRY] getByCategory: transformerNames for '${category}':`, transformerNames ? Array.from(transformerNames) : 'none')

    if (!transformerNames || transformerNames.size === 0) {
      console.log(`[REGISTRY] getByCategory: No transformers found for category '${category}'`)
      return []
    }

    // Get all transformers for this category
    const transformers = Array.from(transformerNames)
      .map((name) => this.transformers.get(name))
      .filter((t): t is BaseTransformer => t !== undefined)

    console.log(`[REGISTRY] getByCategory: Found ${transformers.length} transformers for category '${category}':`, transformers.map(t => t.getMetadata().name))

    // If no source stack provided, return all
    if (!sourceStack) {
      console.log(`[REGISTRY] getByCategory: No sourceStack provided, returning all ${transformers.length} transformers`)
      return transformers
    }

    // Filter by framework compatibility and sort by specificity
    const compatibleTransformers = transformers.filter((transformer) => {
      const metadata = transformer.getMetadata()
      console.log(`[REGISTRY] getByCategory: Checking ${metadata.name}, supportedFrameworks:`, metadata.supportedFrameworks)
      
      // Transformers supporting '*' are compatible with all frameworks
      if (metadata.supportedFrameworks.includes('*')) {
        console.log(`[REGISTRY] getByCategory: ${metadata.name} supports '*', including it`)
        return true
      }

      // Check if transformer supports the source framework
      const isCompatible = metadata.supportedFrameworks.some(
        (framework) =>
          framework.toLowerCase() === sourceStack.framework.toLowerCase()
      )
      console.log(`[REGISTRY] getByCategory: ${metadata.name} compatible with '${sourceStack.framework}': ${isCompatible}`)
      return isCompatible
    })
    
    console.log(`[REGISTRY] getByCategory: After filtering, ${compatibleTransformers.length} compatible transformers:`, compatibleTransformers.map(t => t.getMetadata().name))

    // Sort: framework-specific first, then generic
    return compatibleTransformers.sort((a, b) => {
      const aMetadata = a.getMetadata()
      const bMetadata = b.getMetadata()

      const aIsGeneric = aMetadata.supportedFrameworks.includes('*')
      const bIsGeneric = bMetadata.supportedFrameworks.includes('*')

      // Framework-specific transformers come first
      if (aIsGeneric && !bIsGeneric) return 1
      if (!aIsGeneric && bIsGeneric) return -1

      return 0
    })
  }

  /**
   * Gets the most appropriate transformer for a specific task
   * 
   * Analyzes the task's pattern metadata and source stack to find the best transformer:
   * 1. Extracts pattern category from task
   * 2. Finds transformers supporting that category
   * 3. Filters by framework compatibility
   * 4. Uses canHandle() method for final validation
   * 5. Returns the most specific match
   * 
   * Returns null if no compatible transformer is found.
   * 
   * @param task - Task to find transformer for
   * @param sourceStack - Source stack information with framework details
   * @returns Most appropriate transformer or null if none found
   * 
   * @example
   * ```typescript
   * const task = {
   *   id: 'dep-1',
   *   pattern: { category: 'dependency', ... },
   *   ...
   * }
   * 
   * const transformer = registry.getForTask(task, sourceStack)
   * if (transformer) {
   *   const result = await transformer.transform(code, options, task)
   * } else {
   *   console.log('No transformer available for this task')
   * }
   * ```
   */
  getForTask(task: Task, sourceStack: SourceStack): BaseTransformer | null {
    if (!task || !task.pattern) {
      console.log(`[REGISTRY] getForTask: No task or pattern provided`)
      return null
    }

    console.log(`[REGISTRY] getForTask: Looking for transformer for category '${task.pattern.category}', framework '${sourceStack.framework}'`)

    // Get transformers for this pattern category
    const candidates = this.getByCategory(task.pattern.category, sourceStack)

    console.log(`[REGISTRY] getForTask: Found ${candidates.length} candidates:`, candidates.map(c => c.getMetadata().name))

    if (candidates.length === 0) {
      console.log(`[REGISTRY] getForTask: No transformers found for category '${task.pattern.category}'`)
      return null
    }

    // Find first transformer that can handle this task
    // Candidates are already sorted by specificity
    for (const transformer of candidates) {
      const canHandle = transformer.canHandle(task, sourceStack)
      console.log(`[REGISTRY] getForTask: ${transformer.getMetadata().name}.canHandle() = ${canHandle}`)
      if (canHandle) {
        console.log(`[REGISTRY] getForTask: Selected transformer: ${transformer.getMetadata().name}`)
        return transformer
      }
    }

    console.log(`[REGISTRY] getForTask: No transformer can handle this task`)
    return null
  }

  /**
   * Gets all registered transformers
   * 
   * Returns an array of all transformer instances in the registry.
   * Useful for debugging, testing, or displaying available transformers.
   * 
   * @returns Array of all registered transformers
   * 
   * @example
   * ```typescript
   * const allTransformers = registry.getAll()
   * console.log(`Registered transformers: ${allTransformers.length}`)
   * allTransformers.forEach(t => {
   *   const meta = t.getMetadata()
   *   console.log(`- ${meta.name}: ${meta.supportedPatternCategories.join(', ')}`)
   * })
   * ```
   */
  getAll(): BaseTransformer[] {
    return Array.from(this.transformers.values())
  }

  /**
   * Checks if a transformer exists for a pattern category
   * 
   * Quick check to determine if any transformer is registered
   * for the specified pattern category.
   * 
   * @param category - Pattern category to check
   * @returns true if at least one transformer supports this category
   * 
   * @example
   * ```typescript
   * if (registry.hasTransformer('dependency')) {
   *   console.log('Dependency transformations are supported')
   * }
   * ```
   */
  hasTransformer(category: string): boolean {
    const transformerNames = this.categoryMap.get(category)
    return transformerNames !== undefined && transformerNames.size > 0
  }

  /**
   * Gets a transformer by name
   * 
   * Retrieves a specific transformer instance by its unique name.
   * Returns undefined if no transformer with that name is registered.
   * 
   * @param name - Unique transformer name
   * @returns Transformer instance or undefined
   * 
   * @example
   * ```typescript
   * const depTransformer = registry.getByName('DependencyUpdater')
   * if (depTransformer) {
   *   // Use transformer
   * }
   * ```
   */
  getByName(name: string): BaseTransformer | undefined {
    return this.transformers.get(name)
  }

  /**
   * Unregisters a transformer from the registry
   * 
   * Removes a transformer and cleans up all index mappings.
   * Useful for testing or dynamic transformer management.
   * 
   * @param name - Name of transformer to unregister
   * @returns true if transformer was found and removed, false otherwise
   * 
   * @example
   * ```typescript
   * registry.unregister('MyTransformer')
   * ```
   */
  unregister(name: string): boolean {
    const transformer = this.transformers.get(name)

    if (!transformer) {
      return false
    }

    const metadata = transformer.getMetadata()

    // Remove from transformers map
    this.transformers.delete(name)

    // Remove from category map
    for (const category of metadata.supportedPatternCategories) {
      const categorySet = this.categoryMap.get(category)
      if (categorySet) {
        categorySet.delete(name)
        if (categorySet.size === 0) {
          this.categoryMap.delete(category)
        }
      }
    }

    // Remove from framework map
    for (const framework of metadata.supportedFrameworks) {
      const frameworkSet = this.frameworkMap.get(framework)
      if (frameworkSet) {
        frameworkSet.delete(name)
        if (frameworkSet.size === 0) {
          this.frameworkMap.delete(framework)
        }
      }
    }

    return true
  }

  /**
   * Gets registry statistics
   * 
   * Returns information about the current state of the registry.
   * Useful for monitoring and debugging.
   * 
   * @returns Statistics object with counts and mappings
   * 
   * @example
   * ```typescript
   * const stats = registry.getStats()
   * console.log(`Total transformers: ${stats.totalTransformers}`)
   * console.log(`Categories: ${stats.categories.join(', ')}`)
   * ```
   */
  getStats() {
    return {
      totalTransformers: this.transformers.size,
      categories: Array.from(this.categoryMap.keys()),
      frameworks: Array.from(this.frameworkMap.keys()),
      transformersByCategory: Object.fromEntries(
        Array.from(this.categoryMap.entries()).map(([category, names]) => [
          category,
          names.size,
        ])
      ),
    }
  }

  /**
   * Clears all registered transformers
   * 
   * Removes all transformers from the registry and clears all index mappings.
   * Primarily used for testing.
   * 
   * @example
   * ```typescript
   * registry.clear()
   * ```
   */
  clear(): void {
    this.transformers.clear()
    this.categoryMap.clear()
    this.frameworkMap.clear()
  }
}

/**
 * Global singleton registry that works across Next.js module boundaries
 */
function getGlobalTransformerRegistry(): TransformerRegistry {
  const globalKey = '__GLOBAL_TRANSFORMER_REGISTRY__'
  
  if (typeof globalThis !== 'undefined') {
    const globalAny = globalThis as any
    if (!globalAny[globalKey]) {
      globalAny[globalKey] = new TransformerRegistry()
      console.log(`[REGISTRY] Created new global transformer registry`)
    } else {
      console.log(`[REGISTRY] Using existing global transformer registry`)
    }
    return globalAny[globalKey]
  }
  
  // Fallback for environments without globalThis
  const globalAny = global as any
  if (!globalAny[globalKey]) {
    globalAny[globalKey] = new TransformerRegistry()
    console.log(`[REGISTRY] Created new global transformer registry (fallback)`)
  } else {
    console.log(`[REGISTRY] Using existing global transformer registry (fallback)`)
  }
  return globalAny[globalKey]
}

/**
 * Singleton instance of the transformer registry
 * 
 * Use this instance throughout the application to ensure
 * all transformers are registered in a single location.
 * 
 * @example
 * ```typescript
 * import { transformerRegistry } from '@/lib/transformers/transformer-registry'
 * 
 * // Register transformers at application startup
 * transformerRegistry.register(new DependencyUpdaterTransformer())
 * transformerRegistry.register(new ClassToHooksTransformer())
 * 
 * // Use in transformation orchestration
 * const transformer = transformerRegistry.getForTask(task, sourceStack)
 * ```
 */
export const transformerRegistry = getGlobalTransformerRegistry()

// Register built-in transformers
import { DependencyUpdaterTransformer } from './dependencies'
import { DocumentationTransformer } from './documentation/documentation-transformer'
import { PagesToAppTransformer } from './nextjs/pages-to-app-transformer'
import { ClassToHooksTransformer } from './react/class-to-hooks-transformer'
import { PropTypesToTSTransformer } from './typescript/proptypes-to-ts-transformer'
import { BuildToolConfigGenerator } from './build-tools'
import { ViteSetupTransformer } from './build-tools/vite-setup-transformer'

console.log('[REGISTRY] Registering transformers...')

try {
  transformerRegistry.register(new DependencyUpdaterTransformer())
  console.log('[REGISTRY] ✓ DependencyUpdaterTransformer registered')
} catch (error) {
  console.error('[REGISTRY] ✗ Failed to register DependencyUpdaterTransformer:', error)
}

try {
  transformerRegistry.register(new DocumentationTransformer())
  console.log('[REGISTRY] ✓ DocumentationTransformer registered')
} catch (error) {
  console.error('[REGISTRY] ✗ Failed to register DocumentationTransformer:', error)
}

try {
  transformerRegistry.register(new PagesToAppTransformer())
  console.log('[REGISTRY] ✓ PagesToAppTransformer registered')
} catch (error) {
  console.error('[REGISTRY] ✗ Failed to register PagesToAppTransformer:', error)
}

try {
  transformerRegistry.register(new ClassToHooksTransformer())
  console.log('[REGISTRY] ✓ ClassToHooksTransformer registered')
} catch (error) {
  console.error('[REGISTRY] ✗ Failed to register ClassToHooksTransformer:', error)
}

try {
  transformerRegistry.register(new PropTypesToTSTransformer())
  console.log('[REGISTRY] ✓ PropTypesToTSTransformer registered')
} catch (error) {
  console.error('[REGISTRY] ✗ Failed to register PropTypesToTSTransformer:', error)
}

try {
  transformerRegistry.register(new ViteSetupTransformer())
  console.log('[REGISTRY] ✓ ViteSetupTransformer registered')
} catch (error) {
  console.error('[REGISTRY] ✗ Failed to register ViteSetupTransformer:', error)
}

try {
  transformerRegistry.register(new BuildToolConfigGenerator())
  console.log('[REGISTRY] ✓ BuildToolConfigGenerator registered')
} catch (error) {
  console.error('[REGISTRY] ✗ Failed to register BuildToolConfigGenerator:', error)
}

const stats = transformerRegistry.getStats()
console.log('[REGISTRY] Registration complete:', stats)
