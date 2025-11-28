// Utility functions for the scanner engine

/**
 * Utility function to create a timeout promise
 */
export function createTimeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
  })
}

/**
 * Utility function to execute a promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([promise, createTimeout(timeoutMs)])
}

/**
 * Utility function to safely parse JSON
 */
export function safeJsonParse<T = any>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T
  } catch {
    return null
  }
}

/**
 * Utility function to normalize file paths
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/')
}

/**
 * Utility function to get file extension
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot === -1 ? '' : filename.slice(lastDot)
}

/**
 * Utility function to check if a version is outdated
 */
export function compareVersions(current: string, latest: string): {
  majorVersionsBehind: number
  isOutdated: boolean
} {
  const currentParts = current.replace(/^[\^~>=<]+/, '').split('.').map(Number)
  const latestParts = latest.split('.').map(Number)
  
  const currentMajor = currentParts[0] || 0
  const latestMajor = latestParts[0] || 0
  
  const majorVersionsBehind = Math.max(0, latestMajor - currentMajor)
  
  return {
    majorVersionsBehind,
    isOutdated: majorVersionsBehind > 0 || 
      (majorVersionsBehind === 0 && (currentParts[1] || 0) < (latestParts[1] || 0)) ||
      (majorVersionsBehind === 0 && (currentParts[1] || 0) === (latestParts[1] || 0) && (currentParts[2] || 0) < (latestParts[2] || 0))
  }
}

/**
 * Utility function to calculate confidence score based on multiple factors
 */
export function calculateConfidence(factors: Array<{ weight: number; value: number }>): number {
  const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0)
  if (totalWeight === 0) return 0
  
  const weightedSum = factors.reduce((sum, factor) => sum + (factor.weight * factor.value), 0)
  return Math.round((weightedSum / totalWeight) * 100) / 100
}

/**
 * Utility function to debounce async operations
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  func: T,
  waitMs: number
): T {
  let timeoutId: NodeJS.Timeout | null = null
  let lastPromise: Promise<any> | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    if (lastPromise) {
      return lastPromise
    }

    lastPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          lastPromise = null
          timeoutId = null
        }
      }, waitMs)
    })

    return lastPromise
  }) as T
}