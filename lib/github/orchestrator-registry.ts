/**
 * Orchestrator Registry
 * 
 * Maintains a registry of active GitHubApplyOrchestrator instances
 * to enable progress tracking across API requests via Server-Sent Events.
 * 
 * This is necessary because SSE progress tracking happens in a separate
 * HTTP request from the initial apply operation.
 */

import { GitHubApplyOrchestrator } from './apply-orchestrator'

interface CompletedOperation {
  operationId: string
  status: 'completed' | 'failed'
  branch?: string
  prUrl?: string
  prNumber?: number
  error?: string
  completedAt: number
}

/**
 * Global registry of orchestrator instances by operation ID
 */
const orchestratorRegistry = new Map<string, GitHubApplyOrchestrator>()

/**
 * Cache of completed operations (kept for 5 minutes after completion)
 */
const completedOperations = new Map<string, CompletedOperation>()

const COMPLETION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Register an orchestrator instance for an operation
 */
export function registerOrchestrator(operationId: string, orchestrator: GitHubApplyOrchestrator): void {
  console.log(`[Registry] Registering orchestrator for operation ${operationId}`)
  orchestratorRegistry.set(operationId, orchestrator)
  
  // Auto-cleanup after 15 minutes to prevent memory leaks
  setTimeout(() => {
    console.log(`[Registry] Auto-cleanup timeout reached for operation ${operationId}`)
    unregisterOrchestrator(operationId)
  }, 15 * 60 * 1000)
}

/**
 * Get an orchestrator instance by operation ID
 */
export function getOrchestrator(operationId: string): GitHubApplyOrchestrator | undefined {
  const orchestrator = orchestratorRegistry.get(operationId)
  console.log(`[Registry] getOrchestrator(${operationId}): ${orchestrator ? 'FOUND' : 'NOT FOUND'}`)
  console.log(`[Registry] Active orchestrators: ${Array.from(orchestratorRegistry.keys()).join(', ') || 'none'}`)
  console.log(`[Registry] Completed operations: ${Array.from(completedOperations.keys()).join(', ') || 'none'}`)
  return orchestrator
}

/**
 * Get a completed operation by operation ID
 */
export function getCompletedOperation(operationId: string): CompletedOperation | undefined {
  return completedOperations.get(operationId)
}

/**
 * Unregister an orchestrator instance and cache its completion state
 */
export function unregisterOrchestrator(operationId: string): void {
  const orchestrator = orchestratorRegistry.get(operationId)
  
  // Cache the completion state before removing
  if (orchestrator) {
    const progress = orchestrator.getProgress()
    completedOperations.set(operationId, {
      operationId,
      status: progress.status === 'completed' ? 'completed' : 'failed',
      branch: progress.branch,
      prUrl: progress.prUrl,
      prNumber: progress.prNumber,
      error: progress.error,
      completedAt: Date.now(),
    })
    
    // Clean up completed operation after TTL
    setTimeout(() => {
      completedOperations.delete(operationId)
    }, COMPLETION_CACHE_TTL)
  }
  
  orchestratorRegistry.delete(operationId)
}

/**
 * Check if an orchestrator is registered or completed
 */
export function hasOrchestrator(operationId: string): boolean {
  return orchestratorRegistry.has(operationId) || completedOperations.has(operationId)
}
