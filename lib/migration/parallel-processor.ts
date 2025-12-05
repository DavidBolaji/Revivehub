/**
 * Parallel processing utilities for transformation operations
 * Processes independent files in parallel with configurable concurrency
 */

import { Worker } from 'worker_threads'
import { cpus } from 'os'

/**
 * Task to be processed
 */
export interface Task<T, _R> {
  id: string
  data: T
}

/**
 * Task result
 */
export interface TaskResult<R> {
  id: string
  success: boolean
  result?: R
  error?: Error
}

/**
 * Progress callback
 */
export type ProgressCallback = (completed: number, total: number) => void

/**
 * Parallel processor configuration
 */
export interface ParallelProcessorConfig {
  maxWorkers?: number
  batchSize?: number
  onProgress?: ProgressCallback
}

/**
 * Process tasks in parallel with limited concurrency
 */
export class ParallelProcessor<T, R> {
  private maxWorkers: number
  private batchSize: number
  private onProgress?: ProgressCallback

  constructor(config?: ParallelProcessorConfig) {
    this.maxWorkers = config?.maxWorkers || Math.min(5, cpus().length)
    this.batchSize = config?.batchSize || 20
    this.onProgress = config?.onProgress
  }

  /**
   * Process tasks in parallel
   */
  async process(
    tasks: Task<T, R>[],
    processor: (data: T) => Promise<R>
  ): Promise<TaskResult<R>[]> {
    const results: TaskResult<R>[] = []
    let completed = 0

    // Process in batches
    for (let i = 0; i < tasks.length; i += this.batchSize) {
      const batch = tasks.slice(i, i + this.batchSize)
      const batchResults = await this.processBatch(batch, processor)
      results.push(...batchResults)

      completed += batch.length
      if (this.onProgress) {
        this.onProgress(completed, tasks.length)
      }
    }

    return results
  }

  /**
   * Process a batch of tasks with limited concurrency
   */
  private async processBatch(
    tasks: Task<T, R>[],
    processor: (data: T) => Promise<R>
  ): Promise<TaskResult<R>[]> {
    const results: TaskResult<R>[] = []
    const queue = [...tasks]
    const active: Promise<void>[] = []

    while (queue.length > 0 || active.length > 0) {
      // Start new tasks up to maxWorkers
      while (queue.length > 0 && active.length < this.maxWorkers) {
        const task = queue.shift()!
        const promise = this.processTask(task, processor).then((result) => {
          results.push(result)
          const index = active.indexOf(promise)
          if (index > -1) {
            active.splice(index, 1)
          }
        })
        active.push(promise)
      }

      // Wait for at least one task to complete
      if (active.length > 0) {
        await Promise.race(active)
      }
    }

    return results
  }

  /**
   * Process a single task
   */
  private async processTask(
    task: Task<T, R>,
    processor: (data: T) => Promise<R>
  ): Promise<TaskResult<R>> {
    try {
      const result = await processor(task.data)
      return {
        id: task.id,
        success: true,
        result,
      }
    } catch (error) {
      return {
        id: task.id,
        success: false,
        error: error as Error,
      }
    }
  }
}

/**
 * Batch API requests with rate limiting
 */
export class BatchRequestProcessor<T, R> {
  private requestsPerSecond: number
  private batchSize: number

  constructor(requestsPerSecond: number = 10, batchSize: number = 20) {
    this.requestsPerSecond = requestsPerSecond
    this.batchSize = batchSize
  }

  /**
   * Process requests in batches with rate limiting
   */
  async process(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: ProgressCallback
  ): Promise<R[]> {
    const results: R[] = []
    const delayMs = 1000 / this.requestsPerSecond

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize)

      // Process batch in parallel
      const batchPromises = batch.map(async (item) => {
        const result = await processor(item)
        // Add delay between requests
        await this.delay(delayMs)
        return result
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      if (onProgress) {
        onProgress(Math.min(i + this.batchSize, items.length), items.length)
      }
    }

    return results
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * Worker thread pool for CPU-intensive tasks
 */
export class WorkerPool {
  private workers: Worker[] = []
  private availableWorkers: Worker[] = []
  private taskQueue: Array<{
    data: any
    resolve: (value: any) => void
    reject: (error: Error) => void
  }> = []
  private workerScript: string

  constructor(workerScript: string, poolSize?: number) {
    this.workerScript = workerScript
    const size = poolSize || Math.min(5, cpus().length)

    // Initialize worker pool
    for (let i = 0; i < size; i++) {
      this.createWorker()
    }
  }

  private createWorker(): void {
    const worker = new Worker(this.workerScript)

    worker.on('message', (_result) => {
      this.availableWorkers.push(worker)
      this.processQueue()
    })

    worker.on('error', (error) => {
      console.error('Worker error:', error)
      // Remove failed worker and create a new one
      const index = this.workers.indexOf(worker)
      if (index > -1) {
        this.workers.splice(index, 1)
      }
      this.createWorker()
    })

    this.workers.push(worker)
    this.availableWorkers.push(worker)
  }

  /**
   * Execute task in worker thread
   */
  async execute<T, R>(data: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ data, resolve, reject })
      this.processQueue()
    })
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
      const task = this.taskQueue.shift()!
      const worker = this.availableWorkers.shift()!

      worker.once('message', (result) => {
        if (result.error) {
          task.reject(new Error(result.error))
        } else {
          task.resolve(result.data)
        }
        this.availableWorkers.push(worker)
        this.processQueue()
      })

      worker.postMessage(task.data)
    }
  }

  /**
   * Terminate all workers
   */
  async terminate(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.terminate()))
    this.workers = []
    this.availableWorkers = []
    this.taskQueue = []
  }
}

/**
 * Parallel file processor for transformations
 */
export class ParallelFileProcessor {
  private processor: ParallelProcessor<any, any>

  constructor(maxWorkers?: number) {
    this.processor = new ParallelProcessor({ maxWorkers })
  }

  /**
   * Process files in parallel
   */
  async processFiles<T, R>(
    files: Array<{ path: string; content: string; metadata?: T }>,
    transformer: (file: {
      path: string
      content: string
      metadata?: T
    }) => Promise<R>,
    _onProgress?: ProgressCallback
  ): Promise<Map<string, TaskResult<R>>> {
    const tasks: Task<
      { path: string; content: string; metadata?: T },
      R
    >[] = files.map((file) => ({
      id: file.path,
      data: file,
    }))

    const results = await this.processor.process(tasks, transformer)

    // Convert to map for easy lookup
    const resultMap = new Map<string, TaskResult<R>>()
    results.forEach((result) => {
      resultMap.set(result.id, result)
    })

    return resultMap
  }
}

/**
 * Utility function to chunk array for parallel processing
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * Utility function to process items with concurrency limit
 */
export async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = []
  const queue = [...items]
  const active: Promise<R>[] = []

  while (queue.length > 0 || active.length > 0) {
    // Start new tasks up to concurrency limit
    while (queue.length > 0 && active.length < concurrency) {
      const item = queue.shift()!
      const promise = processor(item).then((result) => {
        const index = active.indexOf(promise)
        if (index > -1) {
          active.splice(index, 1)
        }
        return result
      })
      active.push(promise)
    }

    // Wait for at least one task to complete
    if (active.length > 0) {
      const result = await Promise.race(active)
      results.push(result)
    }
  }

  return results
}
