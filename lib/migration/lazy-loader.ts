/**
 * Lazy loading utilities for migration components and data
 * Defers loading of non-critical resources to improve performance
 */

import { getCachedFrameworkRules } from '@/lib/cache/transformation-cache'

/**
 * Lazy load framework rules on demand
 */
export class FrameworkRulesLoader {
  private cache = new Map<string, any>()
  private loading = new Map<string, Promise<any>>()

  /**
   * Load framework rules with caching
   */
  async loadRules(framework: string, version: string): Promise<any> {
    const key = `${framework}:${version}`

    // Return from memory cache if available
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    // Return existing loading promise if already loading
    if (this.loading.has(key)) {
      return this.loading.get(key)
    }

    // Start loading
    const loadPromise = this.fetchRules(framework, version)
    this.loading.set(key, loadPromise)

    try {
      const rules = await loadPromise
      this.cache.set(key, rules)
      this.loading.delete(key)
      return rules
    } catch (error) {
      this.loading.delete(key)
      throw error
    }
  }

  /**
   * Fetch rules from cache or API
   */
  private async fetchRules(framework: string, version: string): Promise<any> {
    // Try to get from Redis cache first
    const cached = await getCachedFrameworkRules(framework, version)
    if (cached) {
      return cached
    }

    // Fetch from API
    const response = await fetch(`/api/frameworks/rules?framework=${framework}&version=${version}`)
    if (!response.ok) {
      throw new Error(`Failed to load framework rules: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Preload rules for common frameworks
   */
  async preloadCommonRules(): Promise<void> {
    const commonFrameworks = [
      { framework: 'React', version: '18.0.0' },
      { framework: 'Next.js', version: '14.0.0' },
      { framework: 'Vue', version: '3.0.0' },
    ]

    await Promise.all(
      commonFrameworks.map(({ framework, version }) =>
        this.loadRules(framework, version).catch((error) => {
          console.warn(`Failed to preload ${framework} ${version}:`, error)
        })
      )
    )
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }
}

/**
 * Singleton instance
 */
let frameworkRulesLoader: FrameworkRulesLoader | null = null

/**
 * Get or create framework rules loader
 */
export function getFrameworkRulesLoader(): FrameworkRulesLoader {
  if (!frameworkRulesLoader) {
    frameworkRulesLoader = new FrameworkRulesLoader()
  }
  return frameworkRulesLoader
}

/**
 * Lazy transformation executor
 * Defers non-critical transformations until needed
 */
export class LazyTransformationExecutor {
  private pendingTransformations = new Map<string, () => Promise<any>>()
  private results = new Map<string, any>()

  /**
   * Register a transformation to be executed later
   */
  register(id: string, transformer: () => Promise<any>): void {
    this.pendingTransformations.set(id, transformer)
  }

  /**
   * Execute a specific transformation
   */
  async execute(id: string): Promise<any> {
    // Return cached result if available
    if (this.results.has(id)) {
      return this.results.get(id)
    }

    // Get transformer
    const transformer = this.pendingTransformations.get(id)
    if (!transformer) {
      throw new Error(`No transformation registered with id: ${id}`)
    }

    // Execute and cache result
    const result = await transformer()
    this.results.set(id, result)
    this.pendingTransformations.delete(id)

    return result
  }

  /**
   * Execute all pending transformations
   */
  async executeAll(): Promise<Map<string, any>> {
    const ids = Array.from(this.pendingTransformations.keys())
    await Promise.all(ids.map((id) => this.execute(id)))
    return this.results
  }

  /**
   * Check if transformation is pending
   */
  isPending(id: string): boolean {
    return this.pendingTransformations.has(id)
  }

  /**
   * Check if transformation is complete
   */
  isComplete(id: string): boolean {
    return this.results.has(id)
  }

  /**
   * Clear all transformations
   */
  clear(): void {
    this.pendingTransformations.clear()
    this.results.clear()
  }
}

/**
 * Deferred data loader
 * Loads data only when accessed
 */
export class DeferredDataLoader<T> {
  private data: T | null = null
  private loading: Promise<T> | null = null
  private loader: () => Promise<T>

  constructor(loader: () => Promise<T>) {
    this.loader = loader
  }

  /**
   * Get data, loading if necessary
   */
  async get(): Promise<T> {
    // Return cached data if available
    if (this.data !== null) {
      return this.data
    }

    // Return existing loading promise if already loading
    if (this.loading !== null) {
      return this.loading
    }

    // Start loading
    this.loading = this.loader()

    try {
      this.data = await this.loading
      this.loading = null
      return this.data
    } catch (error) {
      this.loading = null
      throw error
    }
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.data !== null
  }

  /**
   * Check if data is loading
   */
  isLoading(): boolean {
    return this.loading !== null
  }

  /**
   * Clear cached data
   */
  clear(): void {
    this.data = null
    this.loading = null
  }
}

/**
 * Priority queue for loading resources
 */
export class ResourceLoadQueue {
  private queue: Array<{
    id: string
    priority: number
    loader: () => Promise<any>
  }> = []
  private loading = new Set<string>()
  private loaded = new Set<string>()
  private maxConcurrent: number

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * Add resource to load queue
   */
  add(id: string, loader: () => Promise<any>, priority: number = 0): void {
    if (this.loaded.has(id) || this.loading.has(id)) {
      return
    }

    this.queue.push({ id, priority, loader })
    this.queue.sort((a, b) => b.priority - a.priority) // Higher priority first
  }

  /**
   * Start loading resources
   */
  async start(): Promise<void> {
    while (this.queue.length > 0 || this.loading.size > 0) {
      // Start new loads up to max concurrent
      while (this.queue.length > 0 && this.loading.size < this.maxConcurrent) {
        const item = this.queue.shift()!
        this.loading.add(item.id)

        // Load resource
        item
          .loader()
          .then(() => {
            this.loading.delete(item.id)
            this.loaded.add(item.id)
          })
          .catch((error) => {
            console.error(`Failed to load resource ${item.id}:`, error)
            this.loading.delete(item.id)
          })
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * Check if resource is loaded
   */
  isLoaded(id: string): boolean {
    return this.loaded.has(id)
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = []
    this.loading.clear()
    this.loaded.clear()
  }
}

/**
 * Intersection Observer based lazy loader for UI components
 */
export class IntersectionLazyLoader {
  private observer: IntersectionObserver | null = null
  private callbacks = new Map<Element, () => void>()

  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const callback = this.callbacks.get(entry.target)
              if (callback) {
                callback()
                this.unobserve(entry.target)
              }
            }
          })
        },
        {
          rootMargin: '50px', // Load 50px before element is visible
        }
      )
    }
  }

  /**
   * Observe element and trigger callback when visible
   */
  observe(element: Element, callback: () => void): void {
    if (!this.observer) {
      // Fallback: execute immediately if IntersectionObserver not available
      callback()
      return
    }

    this.callbacks.set(element, callback)
    this.observer.observe(element)
  }

  /**
   * Stop observing element
   */
  unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element)
    }
    this.callbacks.delete(element)
  }

  /**
   * Disconnect observer
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.callbacks.clear()
  }
}

/**
 * Create deferred loader for diff viewer
 */
export function createDeferredDiffViewer() {
  return new DeferredDataLoader(async () => {
    // Dynamically import diff viewer component
    const module = await import('@/components/planner/CodeMigrationDiffViewer')
    return module.default
  })
}

/**
 * Create deferred loader for violation report viewer
 */
export function createDeferredViolationViewer() {
  return new DeferredDataLoader(async () => {
    // Dynamically import violation report viewer component
    const module = await import('@/components/planner/ViolationReportViewer')
    return module.default
  })
}

/**
 * Batch loader for multiple resources
 */
export class BatchResourceLoader {
  private loaders = new Map<string, () => Promise<any>>()
  private results = new Map<string, any>()
  private errors = new Map<string, Error>()

  /**
   * Register resource loader
   */
  register(id: string, loader: () => Promise<any>): void {
    this.loaders.set(id, loader)
  }

  /**
   * Load all resources in parallel
   */
  async loadAll(): Promise<void> {
    const promises = Array.from(this.loaders.entries()).map(
      async ([id, loader]) => {
        try {
          const result = await loader()
          this.results.set(id, result)
        } catch (error) {
          this.errors.set(id, error as Error)
        }
      }
    )

    await Promise.all(promises)
  }

  /**
   * Get loaded resource
   */
  get(id: string): any | null {
    return this.results.get(id) || null
  }

  /**
   * Get error for resource
   */
  getError(id: string): Error | null {
    return this.errors.get(id) || null
  }

  /**
   * Check if resource loaded successfully
   */
  isLoaded(id: string): boolean {
    return this.results.has(id)
  }

  /**
   * Check if resource failed to load
   */
  hasFailed(id: string): boolean {
    return this.errors.has(id)
  }
}
