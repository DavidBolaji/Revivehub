/**
 * Error hierarchy for migration and transformation operations
 */

/**
 * Base class for all migration-related errors
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'MigrationError'
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      statusCode: this.statusCode,
      stack: this.stack
    }
  }
}

/**
 * Error thrown during code transformation operations
 */
export class TransformationError extends MigrationError {
  constructor(
    message: string,
    public filePath: string,
    public line?: number,
    public column?: number,
    public suggestions?: string[]
  ) {
    super(message, 'TRANSFORMATION_ERROR', true, 500)
    this.name = 'TransformationError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      filePath: this.filePath,
      line: this.line,
      column: this.column,
      suggestions: this.suggestions
    }
  }

  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    msg += `  File: ${this.filePath}\n`
    
    if (this.line !== undefined) {
      msg += `  at line ${this.line}`
      if (this.column !== undefined) {
        msg += `, column ${this.column}`
      }
      msg += '\n'
    }
    
    if (this.suggestions && this.suggestions.length > 0) {
      msg += '\nSuggestions:\n'
      this.suggestions.forEach(s => msg += `  - ${s}\n`)
    }
    
    return msg
  }
}

/**
 * Error thrown during validation operations
 */
export class ValidationError extends MigrationError {
  constructor(
    message: string,
    public violations: Array<{
      id: string
      type: string
      severity: 'error' | 'warning'
      line?: number
      column?: number
      message: string
      suggestion?: string
    }>
  ) {
    super(message, 'VALIDATION_ERROR', true, 400)
    this.name = 'ValidationError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      violations: this.violations
    }
  }

  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    
    if (this.violations.length > 0) {
      msg += '\nViolations:\n'
      this.violations.forEach(v => {
        msg += `  [${v.severity.toUpperCase()}] ${v.type}: ${v.message}\n`
        if (v.line !== undefined) {
          msg += `    at line ${v.line}`
          if (v.column !== undefined) {
            msg += `, column ${v.column}`
          }
          msg += '\n'
        }
        if (v.suggestion) {
          msg += `    Suggestion: ${v.suggestion}\n`
        }
      })
    }
    
    return msg
  }
}

/**
 * Error thrown during GitHub API operations
 */
export class GitHubAPIError extends MigrationError {
  constructor(
    message: string,
    public statusCode: number,
    public rateLimit?: {
      limit: number
      remaining: number
      reset: Date
    }
  ) {
    super(
      message,
      statusCode === 403 && rateLimit?.remaining === 0 
        ? 'RATE_LIMIT_EXCEEDED' 
        : 'GITHUB_API_ERROR',
      statusCode >= 500 || statusCode === 429, // Recoverable for server errors and rate limits
      statusCode
    )
    this.name = 'GitHubAPIError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      rateLimit: this.rateLimit
    }
  }

  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    msg += `  Status Code: ${this.statusCode}\n`
    
    if (this.rateLimit) {
      msg += '\nRate Limit Info:\n'
      msg += `  Limit: ${this.rateLimit.limit}\n`
      msg += `  Remaining: ${this.rateLimit.remaining}\n`
      msg += `  Resets at: ${this.rateLimit.reset.toISOString()}\n`
    }
    
    return msg
  }
}

/**
 * Error thrown during AI service operations
 */
export class AIServiceError extends MigrationError {
  constructor(
    message: string,
    public retryable: boolean = true,
    public provider?: string
  ) {
    super(message, 'AI_SERVICE_ERROR', retryable, 503)
    this.name = 'AIServiceError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryable: this.retryable,
      provider: this.provider
    }
  }

  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    if (this.provider) {
      msg += `  Provider: ${this.provider}\n`
    }
    msg += `  Retryable: ${this.retryable}\n`
    
    return msg
  }
}

/**
 * Error thrown during AST parsing operations
 */
export class ParseError extends MigrationError {
  constructor(
    message: string,
    public filePath: string,
    public language: string,
    public line?: number,
    public column?: number
  ) {
    super(message, 'PARSE_ERROR', false, 400)
    this.name = 'ParseError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      filePath: this.filePath,
      language: this.language,
      line: this.line,
      column: this.column
    }
  }

  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    msg += `  File: ${this.filePath}\n`
    msg += `  Language: ${this.language}\n`
    
    if (this.line !== undefined) {
      msg += `  at line ${this.line}`
      if (this.column !== undefined) {
        msg += `, column ${this.column}`
      }
      msg += '\n'
    }
    
    return msg
  }
}

/**
 * Error thrown during job orchestration operations
 */
export class OrchestrationError extends MigrationError {
  constructor(
    message: string,
    public jobId: string,
    public phase?: string
  ) {
    super(message, 'ORCHESTRATION_ERROR', true, 500)
    this.name = 'OrchestrationError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      jobId: this.jobId,
      phase: this.phase
    }
  }

  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    msg += `  Job ID: ${this.jobId}\n`
    if (this.phase) {
      msg += `  Phase: ${this.phase}\n`
    }
    
    return msg
  }
}

/**
 * Error thrown during backup/rollback operations
 */
export class BackupError extends MigrationError {
  constructor(
    message: string,
    public operation: 'create' | 'restore' | 'cleanup',
    public backupId?: string
  ) {
    super(message, 'BACKUP_ERROR', false, 500)
    this.name = 'BackupError'
  }

  toJSON() {
    return {
      ...super.toJSON(),
      operation: this.operation,
      backupId: this.backupId
    }
  }

  toString(): string {
    let msg = `${this.name}: ${this.message}\n`
    msg += `  Operation: ${this.operation}\n`
    if (this.backupId) {
      msg += `  Backup ID: ${this.backupId}\n`
    }
    
    return msg
  }
}

/**
 * Handles migration errors by logging them and returning appropriate responses
 */
export function handleMigrationError(error: unknown): {
  message: string
  code: string
  statusCode: number
  details?: any
} {
  // Handle MigrationError instances
  if (error instanceof MigrationError) {
    console.error(`[Migration Error] ${error.name} [${error.code}]:`, {
      message: error.message,
      statusCode: error.statusCode,
      recoverable: error.recoverable,
      stack: error.stack,
      details: error.toJSON()
    })
    
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.toJSON()
    }
  }
  
  // Handle standard Error instances
  if (error instanceof Error) {
    console.error('[Migration Error] Unexpected error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
    
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500
    }
  }
  
  // Handle unknown error types
  console.error('[Migration Error] Unknown error type:', error)
  
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  }
}

/**
 * Logs migration events for monitoring and debugging
 */
export function logMigrationEvent(
  event: string,
  details: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString()
  console.log(`[Migration Event] ${timestamp} - ${event}:`, {
    ...details,
    // Redact sensitive information
    accessToken: details.accessToken ? '[REDACTED]' : undefined,
    apiKey: details.apiKey ? '[REDACTED]' : undefined
  })
}
