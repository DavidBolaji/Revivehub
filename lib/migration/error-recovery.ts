/**
 * Error recovery strategies for migration operations
 */

import { MigrationError, logMigrationEvent } from './errors'

/**
 * Result of an error recovery attempt
 */
export interface RecoveryResult<T = any> {
  success: boolean
  data?: T
  error?: Error
  strategy: string
  attempts: number
}

/**
 * Base interface for error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  name: string
  canRecover(error: MigrationError): boolean
  recover<T>(
    error: MigrationError,
    context: RecoveryContext,
    operation: () => Promise<T>
  ): Promise<RecoveryResult<T>>
}

/**
 * Context information for error recovery
 */
export interface RecoveryContext {
  jobId?: string
  filePath?: string
  operation: string
  metadata?: Record<string, any>
}

/**
 * Retry strategy with exponential backoff
 */
export class RetryStrategy implements ErrorRecoveryStrategy {
  name = 'RetryStrategy'

  constructor(
    private maxRetries: number = 3,
    private initialBackoffMs: number = 1000,
    private maxBackoffMs: number = 30000,
    private backoffMultiplier: number = 2
  ) {}

  canRecover(error: MigrationError): boolean {
    // Can retry if error is marked as recoverable
    return error.recoverable
  }

  async recover<T>(
    error: MigrationError,
    context: RecoveryContext,
    operation: () => Promise<T>
  ): Promise<RecoveryResult<T>> {
    logMigrationEvent('recovery:retry:start', {
      error: error.code,
      context,
      maxRetries: this.maxRetries
    })

    let lastError: Error = error
    let backoffMs = this.initialBackoffMs

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Wait before retry (except first attempt)
        if (attempt > 1) {
          logMigrationEvent('recovery:retry:waiting', {
            attempt,
            backoffMs,
            context
          })
          await this.sleep(backoffMs)
        }

        logMigrationEvent('recovery:retry:attempt', {
          attempt,
          maxRetries: this.maxRetries,
          context
        })

        // Attempt operation
        const data = await operation()

        logMigrationEvent('recovery:retry:success', {
          attempt,
          context
        })

        return {
          success: true,
          data,
          strategy: this.name,
          attempts: attempt
        }
      } catch (err) {
        lastError = err as Error
        
        logMigrationEvent('recovery:retry:failed', {
          attempt,
          error: lastError.message,
          context
        })

        // Calculate next backoff with exponential increase
        backoffMs = Math.min(
          backoffMs * this.backoffMultiplier,
          this.maxBackoffMs
        )
      }
    }

    logMigrationEvent('recovery:retry:exhausted', {
      attempts: this.maxRetries,
      context
    })

    return {
      success: false,
      error: lastError,
      strategy: this.name,
      attempts: this.maxRetries
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Fallback strategy for alternative transformations
 */
export class FallbackStrategy implements ErrorRecoveryStrategy {
  name = 'FallbackStrategy'

  constructor(
    private fallbackOperations: Array<{
      name: string
      operation: (context: RecoveryContext) => Promise<any>
      condition?: (error: MigrationError) => boolean
    }>
  ) {}

  canRecover(error: MigrationError): boolean {
    // Can use fallback if any fallback operation matches the error
    return this.fallbackOperations.some(
      fb => !fb.condition || fb.condition(error)
    )
  }

  async recover<T>(
    error: MigrationError,
    context: RecoveryContext,
    _operation: () => Promise<T>
  ): Promise<RecoveryResult<T>> {
    logMigrationEvent('recovery:fallback:start', {
      error: error.code,
      context,
      fallbackCount: this.fallbackOperations.length
    })

    // Try each fallback operation
    for (const fallback of this.fallbackOperations) {
      // Check if this fallback applies to this error
      if (fallback.condition && !fallback.condition(error)) {
        continue
      }

      try {
        logMigrationEvent('recovery:fallback:attempt', {
          fallback: fallback.name,
          context
        })

        const data = await fallback.operation(context)

        logMigrationEvent('recovery:fallback:success', {
          fallback: fallback.name,
          context
        })

        return {
          success: true,
          data,
          strategy: `${this.name}:${fallback.name}`,
          attempts: 1
        }
      } catch (err) {
        logMigrationEvent('recovery:fallback:failed', {
          fallback: fallback.name,
          error: (err as Error).message,
          context
        })
        continue
      }
    }

    logMigrationEvent('recovery:fallback:exhausted', {
      context
    })

    return {
      success: false,
      error,
      strategy: this.name,
      attempts: this.fallbackOperations.length
    }
  }
}

/**
 * Skip strategy for non-critical failures
 */
export class SkipStrategy implements ErrorRecoveryStrategy {
  name = 'SkipStrategy'

  constructor(
    private skipCondition: (error: MigrationError, context: RecoveryContext) => boolean,
    private onSkip?: (error: MigrationError, context: RecoveryContext) => void
  ) {}

  canRecover(_error: MigrationError): boolean {
    // Always can "recover" by skipping, but check condition in recover()
    return true
  }

  async recover<T>(
    error: MigrationError,
    context: RecoveryContext,
    _operation: () => Promise<T>
  ): Promise<RecoveryResult<T>> {
    // Check if we should skip this error
    if (!this.skipCondition(error, context)) {
      return {
        success: false,
        error,
        strategy: this.name,
        attempts: 0
      }
    }

    logMigrationEvent('recovery:skip', {
      error: error.code,
      context
    })

    // Call skip callback if provided
    if (this.onSkip) {
      this.onSkip(error, context)
    }

    // Return success with undefined data to indicate skip
    return {
      success: true,
      data: undefined,
      strategy: this.name,
      attempts: 1
    }
  }
}

/**
 * Composite strategy that tries multiple strategies in order
 */
export class CompositeRecoveryStrategy implements ErrorRecoveryStrategy {
  name = 'CompositeRecoveryStrategy'

  constructor(private strategies: ErrorRecoveryStrategy[]) {}

  canRecover(error: MigrationError): boolean {
    return this.strategies.some(strategy => strategy.canRecover(error))
  }

  async recover<T>(
    error: MigrationError,
    context: RecoveryContext,
    operation: () => Promise<T>
  ): Promise<RecoveryResult<T>> {
    logMigrationEvent('recovery:composite:start', {
      error: error.code,
      context,
      strategyCount: this.strategies.length
    })

    for (const strategy of this.strategies) {
      if (!strategy.canRecover(error)) {
        continue
      }

      logMigrationEvent('recovery:composite:trying', {
        strategy: strategy.name,
        context
      })

      const result = await strategy.recover(error, context, operation)

      if (result.success) {
        logMigrationEvent('recovery:composite:success', {
          strategy: strategy.name,
          context
        })
        return result
      }

      logMigrationEvent('recovery:composite:failed', {
        strategy: strategy.name,
        context
      })
    }

    logMigrationEvent('recovery:composite:exhausted', {
      context
    })

    return {
      success: false,
      error,
      strategy: this.name,
      attempts: this.strategies.length
    }
  }
}

/**
 * Recovery manager that applies appropriate strategies based on error type
 */
export class RecoveryManager {
  private strategies: Map<string, ErrorRecoveryStrategy> = new Map()
  private defaultStrategy?: ErrorRecoveryStrategy

  /**
   * Register a recovery strategy for a specific error code
   */
  registerStrategy(errorCode: string, strategy: ErrorRecoveryStrategy): void {
    this.strategies.set(errorCode, strategy)
  }

  /**
   * Set the default recovery strategy for unmatched errors
   */
  setDefaultStrategy(strategy: ErrorRecoveryStrategy): void {
    this.defaultStrategy = strategy
  }

  /**
   * Attempt to recover from an error
   */
  async recover<T>(
    error: MigrationError,
    context: RecoveryContext,
    operation: () => Promise<T>
  ): Promise<RecoveryResult<T>> {
    // Find appropriate strategy
    const strategy = this.strategies.get(error.code) || this.defaultStrategy

    if (!strategy) {
      logMigrationEvent('recovery:no-strategy', {
        error: error.code,
        context
      })

      return {
        success: false,
        error,
        strategy: 'none',
        attempts: 0
      }
    }

    if (!strategy.canRecover(error)) {
      logMigrationEvent('recovery:cannot-recover', {
        error: error.code,
        strategy: strategy.name,
        context
      })

      return {
        success: false,
        error,
        strategy: strategy.name,
        attempts: 0
      }
    }

    return strategy.recover(error, context, operation)
  }
}

/**
 * Create a default recovery manager with common strategies
 */
export function createDefaultRecoveryManager(): RecoveryManager {
  const manager = new RecoveryManager()

  // Retry strategy for rate limits and server errors
  const retryStrategy = new RetryStrategy(3, 1000, 30000, 2)
  manager.registerStrategy('RATE_LIMIT_EXCEEDED', retryStrategy)
  manager.registerStrategy('GITHUB_API_ERROR', retryStrategy)
  manager.registerStrategy('AI_SERVICE_ERROR', retryStrategy)

  // Skip strategy for non-critical transformation errors
  const skipStrategy = new SkipStrategy(
    (error, context) => {
      // Skip if it's a transformation error and not a critical file
      return error.code === 'TRANSFORMATION_ERROR' && 
             !context.metadata?.critical
    },
    (error, context) => {
      console.warn(`Skipping non-critical transformation error:`, {
        error: error.message,
        context
      })
    }
  )
  manager.registerStrategy('TRANSFORMATION_ERROR', skipStrategy)

  // Composite strategy as default
  const compositeStrategy = new CompositeRecoveryStrategy([
    retryStrategy,
    skipStrategy
  ])
  manager.setDefaultStrategy(compositeStrategy)

  return manager
}
