/**
 * Operation Lock Manager
 * 
 * Manages locks for GitHub operations to prevent concurrent operations
 * on the same repository. Locks automatically expire after 10 minutes
 * to prevent permanent locks from crashed operations.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

interface LockEntry {
  repositoryKey: string
  acquiredAt: Date
  expiresAt: Date
}

export class OperationLockManager {
  private locks: Map<string, LockEntry> = new Map()
  private readonly LOCK_EXPIRATION_MS = 10 * 60 * 1000 // 10 minutes

  /**
   * Acquire a lock for a repository operation
   * 
   * @param repositoryKey - Unique identifier for the repository (e.g., "owner/repo")
   * @returns true if lock was acquired, false if already locked
   * 
   * Requirement 12.2: Track active operations per repository using a lock mechanism
   */
  acquireLock(repositoryKey: string): boolean {
    // Clean up expired locks first
    this.cleanupExpiredLocks()

    // Check if already locked
    if (this.isLocked(repositoryKey)) {
      return false
    }

    // Acquire the lock
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.LOCK_EXPIRATION_MS)

    this.locks.set(repositoryKey, {
      repositoryKey,
      acquiredAt: now,
      expiresAt,
    })

    return true
  }

  /**
   * Release a lock for a repository operation
   * 
   * @param repositoryKey - Unique identifier for the repository
   * 
   * Requirement 12.4: Release the lock when an operation completes or fails
   */
  releaseLock(repositoryKey: string): void {
    this.locks.delete(repositoryKey)
  }

  /**
   * Check if a repository is currently locked
   * 
   * @param repositoryKey - Unique identifier for the repository
   * @returns true if locked and not expired, false otherwise
   * 
   * Requirement 12.3: Check if a repository has an active operation
   */
  isLocked(repositoryKey: string): boolean {
    const lock = this.locks.get(repositoryKey)

    if (!lock) {
      return false
    }

    // Check if lock has expired
    const now = new Date()
    if (now >= lock.expiresAt) {
      // Lock expired, remove it
      this.locks.delete(repositoryKey)
      return false
    }

    return true
  }

  /**
   * Get information about a lock
   * 
   * @param repositoryKey - Unique identifier for the repository
   * @returns Lock information or null if not locked
   */
  getLockInfo(repositoryKey: string): LockEntry | null {
    const lock = this.locks.get(repositoryKey)

    if (!lock) {
      return null
    }

    // Check if expired
    const now = new Date()
    if (now >= lock.expiresAt) {
      this.locks.delete(repositoryKey)
      return null
    }

    return lock
  }

  /**
   * Clean up all expired locks
   * 
   * Requirement 12.5: Locks automatically expire after 10 minutes
   */
  private cleanupExpiredLocks(): void {
    const now = new Date()

    for (const [key, lock] of this.locks.entries()) {
      if (now >= lock.expiresAt) {
        this.locks.delete(key)
      }
    }
  }

  /**
   * Get all active locks (for debugging/monitoring)
   * 
   * @returns Array of active lock entries
   */
  getActiveLocks(): LockEntry[] {
    this.cleanupExpiredLocks()
    return Array.from(this.locks.values())
  }

  /**
   * Clear all locks (for testing purposes)
   */
  clearAllLocks(): void {
    this.locks.clear()
  }

  /**
   * Get the number of active locks
   * 
   * @returns Number of active locks
   */
  getActiveLockCount(): number {
    this.cleanupExpiredLocks()
    return this.locks.size
  }
}

// Singleton instance for application-wide use
let lockManagerInstance: OperationLockManager | null = null

/**
 * Get the singleton lock manager instance
 * 
 * @returns The global lock manager instance
 */
export function getLockManager(): OperationLockManager {
  if (!lockManagerInstance) {
    lockManagerInstance = new OperationLockManager()
  }
  return lockManagerInstance
}

/**
 * Reset the lock manager instance (for testing)
 */
export function resetLockManager(): void {
  lockManagerInstance = null
}
