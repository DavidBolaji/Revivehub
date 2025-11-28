import type { Detector, RepositoryContext, DetectionResult, DetectionError } from '../types'

/**
 * Abstract base class for all detectors providing common functionality
 */
export abstract class BaseDetector implements Detector {
  abstract readonly name: string

  /**
   * Perform detection on the repository context
   */
  abstract detect(context: RepositoryContext): Promise<DetectionResult>

  /**
   * Get list of detector names this detector depends on
   * Override in subclasses if detector has dependencies
   */
  getDependencies(): string[] {
    return []
  }

  /**
   * Helper method to create a successful detection result
   */
  protected createSuccessResult<T extends DetectionResult>(data: Omit<T, 'detectorName' | 'success'>): T {
    return {
      ...data,
      detectorName: this.name,
      success: true,
    } as T
  }

  /**
   * Helper method to create a failed detection result
   */
  protected createErrorResult<T extends DetectionResult>(
    error: DetectionError,
    partialData?: Partial<Omit<T, 'detectorName' | 'success' | 'error'>>
  ): T {
    return {
      ...partialData,
      detectorName: this.name,
      success: false,
      error,
    } as T
  }

  /**
   * Helper method to check if a file exists in the repository
   */
  protected hasFile(context: RepositoryContext, path: string): boolean {
    return context.files.files.some(file => file.path === path && file.type === 'file')
  }

  /**
   * Helper method to get file content from the repository context
   */
  protected getFileContent(context: RepositoryContext, path: string): string | null {
    return context.contents.get(path) || null
  }

  /**
   * Helper method to find files by extension
   */
  protected findFilesByExtension(context: RepositoryContext, extensions: string[]): string[] {
    return context.files.files
      .filter(file => file.type === 'file')
      .filter(file => extensions.some(ext => file.path.endsWith(ext)))
      .map(file => file.path)
  }

  /**
   * Helper method to find files by pattern (simple glob-like matching)
   */
  protected findFilesByPattern(context: RepositoryContext, patterns: string[]): string[] {
    return context.files.files
      .filter(file => file.type === 'file')
      .filter(file => patterns.some(pattern => this.matchesPattern(file.path, pattern)))
      .map(file => file.path)
  }

  /**
   * Simple pattern matching for file paths
   * Supports * wildcard and exact matches
   */
  private matchesPattern(path: string, pattern: string): boolean {
    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\*/g, '.*')
      return new RegExp(`^${regexPattern}$`).test(path)
    }
    return path === pattern || path.endsWith('/' + pattern)
  }

  /**
   * Helper method to parse JSON files safely
   */
  protected parseJsonFile<T = any>(context: RepositoryContext, path: string): T | null {
    try {
      const content = this.getFileContent(context, path)
      if (!content) return null
      return JSON.parse(content) as T
    } catch (error) {
      return null
    }
  }

  /**
   * Helper method to count lines of code in files
   */
  protected countLinesOfCode(context: RepositoryContext, filePaths: string[]): number {
    let totalLines = 0
    for (const path of filePaths) {
      const content = this.getFileContent(context, path)
      if (content) {
        // Count non-empty lines
        const lines = content.split('\n').filter(line => line.trim().length > 0)
        totalLines += lines.length
      }
    }
    return totalLines
  }

  /**
   * Helper method to extract version from package.json-like dependency objects
   */
  protected extractVersion(versionString: string): string {
    // Remove common prefixes like ^, ~, >=, etc. and trim whitespace
    return versionString.replace(/^[\^~>=<]+/, '').trim()
  }

  /**
   * Helper method to create detection error
   */
  protected createDetectionError(
    code: string,
    message: string,
    recoverable: boolean = true
  ): DetectionError {
    return {
      code,
      message,
      recoverable,
    }
  }

  /**
   * Helper method to execute detection with timeout and error handling
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 10000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Detection timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      operation()
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }
}