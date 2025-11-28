/**
 * Scanner Configuration Module
 * 
 * Provides centralized configuration management for the Universal Scanner Engine
 * with validation and type-safe access to environment variables.
 */

export interface ScannerConfig {
  /** Maximum time in milliseconds for a complete repository scan */
  timeoutMs: number
  /** Maximum file size in megabytes to process */
  maxFileSizeMB: number
  /** Time-to-live for cached scan results in seconds */
  cacheTTLSeconds: number
}

/**
 * Configuration validation error
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Parse and validate an environment variable as a positive integer
 */
function parsePositiveInt(
  value: string | undefined,
  name: string,
  defaultValue: number
): number {
  if (!value) {
    return defaultValue
  }

  const parsed = parseInt(value, 10)
  
  if (isNaN(parsed)) {
    throw new ConfigurationError(
      `${name} must be a valid number, got: ${value}`
    )
  }
  
  if (parsed <= 0) {
    throw new ConfigurationError(
      `${name} must be a positive number, got: ${parsed}`
    )
  }
  
  return parsed
}

/**
 * Parse and validate an environment variable as a positive float
 */
function parsePositiveFloat(
  value: string | undefined,
  name: string,
  defaultValue: number
): number {
  if (!value) {
    return defaultValue
  }

  const parsed = parseFloat(value)
  
  if (isNaN(parsed)) {
    throw new ConfigurationError(
      `${name} must be a valid number, got: ${value}`
    )
  }
  
  if (parsed <= 0) {
    throw new ConfigurationError(
      `${name} must be a positive number, got: ${parsed}`
    )
  }
  
  return parsed
}

/**
 * Load and validate scanner configuration from environment variables
 * 
 * @throws {ConfigurationError} If configuration is invalid
 */
export function loadScannerConfig(): ScannerConfig {
  const timeoutMs = parsePositiveInt(
    process.env.SCANNER_TIMEOUT_MS,
    'SCANNER_TIMEOUT_MS',
    30000 // Default: 30 seconds
  )

  const maxFileSizeMB = parsePositiveFloat(
    process.env.SCANNER_MAX_FILE_SIZE_MB,
    'SCANNER_MAX_FILE_SIZE_MB',
    1 // Default: 1 MB
  )

  const cacheTTLSeconds = parsePositiveInt(
    process.env.SCANNER_CACHE_TTL_SECONDS,
    'SCANNER_CACHE_TTL_SECONDS',
    600 // Default: 10 minutes
  )

  // Additional validation rules
  if (timeoutMs < 5000) {
    throw new ConfigurationError(
      'SCANNER_TIMEOUT_MS must be at least 5000ms (5 seconds)'
    )
  }

  if (timeoutMs > 300000) {
    throw new ConfigurationError(
      'SCANNER_TIMEOUT_MS must not exceed 300000ms (5 minutes)'
    )
  }

  if (maxFileSizeMB > 10) {
    throw new ConfigurationError(
      'SCANNER_MAX_FILE_SIZE_MB must not exceed 10 MB'
    )
  }

  if (cacheTTLSeconds < 60) {
    throw new ConfigurationError(
      'SCANNER_CACHE_TTL_SECONDS must be at least 60 seconds'
    )
  }

  if (cacheTTLSeconds > 3600) {
    throw new ConfigurationError(
      'SCANNER_CACHE_TTL_SECONDS must not exceed 3600 seconds (1 hour)'
    )
  }

  return {
    timeoutMs,
    maxFileSizeMB,
    cacheTTLSeconds,
  }
}

/**
 * Singleton instance of scanner configuration
 * Loaded once on module initialization
 */
let configInstance: ScannerConfig | null = null

/**
 * Get the scanner configuration
 * Loads and validates configuration on first call
 * 
 * @throws {ConfigurationError} If configuration is invalid
 */
export function getScannerConfig(): ScannerConfig {
  if (!configInstance) {
    configInstance = loadScannerConfig()
  }
  return configInstance
}

/**
 * Reset configuration instance (useful for testing)
 */
export function resetScannerConfig(): void {
  configInstance = null
}

/**
 * Validate scanner configuration without throwing
 * Returns validation result with error details
 */
export function validateScannerConfig(): {
  valid: boolean
  errors: string[]
  config?: ScannerConfig
} {
  try {
    const config = loadScannerConfig()
    return {
      valid: true,
      errors: [],
      config,
    }
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return {
        valid: false,
        errors: [error.message],
      }
    }
    return {
      valid: false,
      errors: ['Unknown configuration error'],
    }
  }
}
