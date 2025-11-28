import type {
  Detector,
  RepositoryContext,
  DetectorResult,
  AnalysisData,
  AnalysisReport,
  DetectionResult
} from '../types'
import { ReportGenerator } from './report-generator'
import { getScannerConfig } from '../config'

/**
 * ScannerOrchestrator coordinates the analysis pipeline, manages detector execution,
 * handles errors, and aggregates results
 */
export class ScannerOrchestrator {
  private detectors: Map<string, Detector> = new Map()
  private reportGenerator: ReportGenerator
  private readonly overallTimeoutMs: number
  private readonly detectorTimeoutMs: number

  constructor(
    detectors: Detector[] = [],
    overallTimeoutMs?: number,
    detectorTimeoutMs?: number
  ) {
    this.reportGenerator = new ReportGenerator()
    
    // Use configuration values if not explicitly provided
    const config = getScannerConfig()
    this.overallTimeoutMs = overallTimeoutMs ?? config.timeoutMs
    this.detectorTimeoutMs = detectorTimeoutMs ?? Math.floor(config.timeoutMs / 3)

    // Register provided detectors
    detectors.forEach(detector => this.registerDetector(detector))
  }

  /**
   * Register a detector for use in analysis
   */
  registerDetector(detector: Detector): void {
    this.detectors.set(detector.name, detector)
  }

  /**
   * Get all registered detectors
   */
  getDetectors(): Detector[] {
    return Array.from(this.detectors.values())
  }

  /**
   * Analyze a repository and generate a comprehensive report
   */
  async analyzeRepository(context: RepositoryContext): Promise<AnalysisReport> {
    const startTime = Date.now()
    const errors: string[] = []
    const results = new Map<string, DetectorResult<any>>()

    try {
      // Group detectors by dependency levels for parallel execution
      const detectorGroups = this.groupDetectorsByDependencies()

      // Execute detector groups sequentially, but detectors within a group in parallel
      for (const group of detectorGroups) {
        // Check if we've exceeded overall timeout
        const elapsedTime = Date.now() - startTime
        if (elapsedTime >= this.overallTimeoutMs) {
          errors.push(`Analysis timeout after ${this.overallTimeoutMs}ms`)
          break
        }

        // Calculate remaining time for this group
        const remainingTime = this.overallTimeoutMs - elapsedTime

        // Execute all detectors in this group in parallel
        const groupResults = await Promise.allSettled(
          group.map(detector =>
            this.executeDetectorWithTimeout(
              detector,
              context,
              Math.min(this.detectorTimeoutMs, remainingTime)
            )
          )
        )

        // Process results from this group
        group.forEach((detector, index) => {
          const result = groupResults[index]
          
          if (result.status === 'fulfilled') {
            const detectorResult = result.value
            results.set(detector.name, detectorResult)
            
            // Track errors even from fulfilled promises if detector failed
            if (!detectorResult.success && detectorResult.error) {
              errors.push(`${detector.name}: ${detectorResult.error.message}`)
            }
          } else {
            // Handle rejected promise
            const error = result.reason
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            errors.push(`${detector.name}: ${errorMessage}`)
            
            results.set(detector.name, {
              success: false,
              error: {
                code: 'DETECTOR_EXECUTION_FAILED',
                message: errorMessage,
                recoverable: true
              }
            })
          }
        })
      }

      // Generate analysis report
      const analysisData: AnalysisData = {
        results,
        context,
        metadata: {
          completionStatus: errors.length > 0 ? 'partial' : 'complete',
          errors
        }
      }

      return await this.reportGenerator.generate(analysisData)

    } catch (error) {
      // Handle catastrophic failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Orchestrator failure: ${errorMessage}`)

      // Return a minimal report with error information
      const analysisData: AnalysisData = {
        results,
        context,
        metadata: {
          completionStatus: 'partial',
          errors
        }
      }

      return await this.reportGenerator.generate(analysisData)
    }
  }

  /**
   * Execute a detector with timeout and error handling
   */
  private async executeDetectorWithTimeout(
    detector: Detector,
    context: RepositoryContext,
    timeoutMs: number
  ): Promise<DetectorResult<DetectionResult>> {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Detector timeout after ${timeoutMs}ms`))
        }, timeoutMs)
      })

      // Race between detector execution and timeout
      const result = await Promise.race([
        detector.detect(context),
        timeoutPromise
      ])

      return {
        success: true,
        data: result
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        success: false,
        error: {
          code: 'DETECTOR_EXECUTION_ERROR',
          message: errorMessage,
          recoverable: true
        }
      }
    }
  }

  /**
   * Group detectors by dependency levels using topological sort
   * Returns groups where detectors in the same group can run in parallel
   */
  private groupDetectorsByDependencies(): Detector[][] {
    const detectorArray = Array.from(this.detectors.values())
    const groups: Detector[][] = []
    const processed = new Set<string>()
    const inProgress = new Set<string>()

    // Build dependency graph
    const dependencyMap = new Map<string, Set<string>>()
    detectorArray.forEach(detector => {
      const deps = detector.getDependencies()
      dependencyMap.set(detector.name, new Set(deps))
    })

    // Helper function to get dependency level (depth in dependency tree)
    const getDependencyLevel = (detectorName: string): number => {
      if (processed.has(detectorName)) {
        // Already processed, find its level
        for (let i = 0; i < groups.length; i++) {
          if (groups[i].some(d => d.name === detectorName)) {
            return i
          }
        }
        return 0
      }

      if (inProgress.has(detectorName)) {
        // Circular dependency detected, treat as level 0
        return 0
      }

      const detector = this.detectors.get(detectorName)
      if (!detector) return 0

      const deps = dependencyMap.get(detectorName) || new Set()
      
      if (deps.size === 0) {
        // No dependencies, can run in first group
        return 0
      }

      // Mark as in progress to detect circular dependencies
      inProgress.add(detectorName)

      // Find the maximum level of all dependencies
      let maxDepLevel = -1
      for (const depName of deps) {
        const depLevel = getDependencyLevel(depName)
        maxDepLevel = Math.max(maxDepLevel, depLevel)
      }

      inProgress.delete(detectorName)

      // This detector runs after all its dependencies
      return maxDepLevel + 1
    }

    // Assign each detector to a group based on its dependency level
    detectorArray.forEach(detector => {
      const level = getDependencyLevel(detector.name)
      
      // Ensure we have enough groups
      while (groups.length <= level) {
        groups.push([])
      }

      groups[level].push(detector)
      processed.add(detector.name)
    })

    return groups.filter(group => group.length > 0)
  }
}
