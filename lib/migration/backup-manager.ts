/**
 * Backup and Rollback System for Migration Operations
 * Requirements: 12.3, 12.4, 12.5
 */

import { BackupError, logMigrationEvent } from './errors'

/**
 * Backup entry containing original file state
 */
export interface BackupEntry {
  filePath: string
  originalContent: string
  timestamp: Date
  metadata?: Record<string, any>
}

/**
 * Backup snapshot for a migration job
 */
export interface BackupSnapshot {
  jobId: string
  timestamp: Date
  files: Map<string, BackupEntry>
  metadata: {
    sourceFramework: string
    targetFramework: string
    totalFiles: number
  }
}

/**
 * Backup Manager
 * 
 * Manages backups and rollbacks for migration operations.
 * Stores original file contents before transformations and
 * provides rollback capability if needed.
 * 
 * Requirements: 12.3, 12.4, 12.5
 */
export class BackupManager {
  private backups: Map<string, BackupSnapshot> = new Map()
  private maxBackups: number = 10 // Keep last 10 backups

  /**
   * Create a backup snapshot before starting transformations
   * 
   * Requirements: 12.3
   * 
   * @param jobId - Unique job identifier
   * @param files - Files to backup with their original content
   * @param metadata - Additional metadata about the migration
   * @returns Backup ID (same as jobId)
   */
  async createBackup(
    jobId: string,
    files: Array<{ path: string; content: string }>,
    metadata: {
      sourceFramework: string
      targetFramework: string
    }
  ): Promise<string> {
    try {
      logMigrationEvent('backup:create:start', {
        jobId,
        fileCount: files.length,
        metadata
      })

      // Check if backup already exists
      if (this.backups.has(jobId)) {
        throw new BackupError(
          `Backup already exists for job ${jobId}`,
          'create',
          jobId
        )
      }

      // Create backup entries for each file
      const backupFiles = new Map<string, BackupEntry>()
      
      for (const file of files) {
        backupFiles.set(file.path, {
          filePath: file.path,
          originalContent: file.content,
          timestamp: new Date(),
          metadata: {}
        })
      }

      // Create snapshot
      const snapshot: BackupSnapshot = {
        jobId,
        timestamp: new Date(),
        files: backupFiles,
        metadata: {
          ...metadata,
          totalFiles: files.length
        }
      }

      // Store backup
      this.backups.set(jobId, snapshot)

      // Cleanup old backups if needed
      await this.cleanupOldBackups()

      logMigrationEvent('backup:create:complete', {
        jobId,
        fileCount: files.length,
        backupSize: this.calculateBackupSize(snapshot)
      })

      return jobId
    } catch (error: any) {
      logMigrationEvent('backup:create:failed', {
        jobId,
        error: error.message
      })

      if (error instanceof BackupError) {
        throw error
      }

      throw new BackupError(
        `Failed to create backup: ${error.message}`,
        'create',
        jobId
      )
    }
  }

  /**
   * Restore files from a backup snapshot
   * 
   * This performs a complete rollback of all transformed files
   * to their original state before the migration.
   * 
   * Requirements: 12.4, 12.5
   * 
   * @param jobId - Job ID to restore from
   * @returns Map of file paths to restored content
   */
  async restoreBackup(
    jobId: string
  ): Promise<Map<string, string>> {
    try {
      logMigrationEvent('backup:restore:start', {
        jobId
      })

      // Get backup snapshot
      const snapshot = this.backups.get(jobId)
      
      if (!snapshot) {
        throw new BackupError(
          `No backup found for job ${jobId}`,
          'restore',
          jobId
        )
      }

      // Restore all files
      const restoredFiles = new Map<string, string>()
      
      for (const [filePath, entry] of snapshot.files) {
        restoredFiles.set(filePath, entry.originalContent)
      }

      logMigrationEvent('backup:restore:complete', {
        jobId,
        fileCount: restoredFiles.size
      })

      return restoredFiles
    } catch (error: any) {
      logMigrationEvent('backup:restore:failed', {
        jobId,
        error: error.message
      })

      if (error instanceof BackupError) {
        throw error
      }

      throw new BackupError(
        `Failed to restore backup: ${error.message}`,
        'restore',
        jobId
      )
    }
  }

  /**
   * Restore a single file from backup
   * 
   * Requirements: 12.4
   * 
   * @param jobId - Job ID containing the backup
   * @param filePath - Path of file to restore
   * @returns Original file content
   */
  async restoreFile(
    jobId: string,
    filePath: string
  ): Promise<string> {
    try {
      logMigrationEvent('backup:restore-file:start', {
        jobId,
        filePath
      })

      // Get backup snapshot
      const snapshot = this.backups.get(jobId)
      
      if (!snapshot) {
        throw new BackupError(
          `No backup found for job ${jobId}`,
          'restore',
          jobId
        )
      }

      // Get file entry
      const entry = snapshot.files.get(filePath)
      
      if (!entry) {
        throw new BackupError(
          `File ${filePath} not found in backup ${jobId}`,
          'restore',
          jobId
        )
      }

      logMigrationEvent('backup:restore-file:complete', {
        jobId,
        filePath
      })

      return entry.originalContent
    } catch (error: any) {
      logMigrationEvent('backup:restore-file:failed', {
        jobId,
        filePath,
        error: error.message
      })

      if (error instanceof BackupError) {
        throw error
      }

      throw new BackupError(
        `Failed to restore file: ${error.message}`,
        'restore',
        jobId
      )
    }
  }

  /**
   * Clean up a backup after successful migration
   * 
   * Requirements: 12.5
   * 
   * @param jobId - Job ID to clean up
   */
  async cleanupBackup(jobId: string): Promise<void> {
    try {
      logMigrationEvent('backup:cleanup:start', {
        jobId
      })

      const snapshot = this.backups.get(jobId)
      
      if (!snapshot) {
        // Already cleaned up or never existed
        logMigrationEvent('backup:cleanup:not-found', {
          jobId
        })
        return
      }

      // Remove backup
      this.backups.delete(jobId)

      logMigrationEvent('backup:cleanup:complete', {
        jobId,
        fileCount: snapshot.files.size
      })
    } catch (error: any) {
      logMigrationEvent('backup:cleanup:failed', {
        jobId,
        error: error.message
      })

      throw new BackupError(
        `Failed to cleanup backup: ${error.message}`,
        'cleanup',
        jobId
      )
    }
  }

  /**
   * Check if a backup exists for a job
   * 
   * @param jobId - Job ID to check
   * @returns True if backup exists
   */
  hasBackup(jobId: string): boolean {
    return this.backups.has(jobId)
  }

  /**
   * Get backup information without restoring
   * 
   * @param jobId - Job ID to get info for
   * @returns Backup snapshot info or null if not found
   */
  getBackupInfo(jobId: string): {
    jobId: string
    timestamp: Date
    fileCount: number
    metadata: BackupSnapshot['metadata']
  } | null {
    const snapshot = this.backups.get(jobId)
    
    if (!snapshot) {
      return null
    }

    return {
      jobId: snapshot.jobId,
      timestamp: snapshot.timestamp,
      fileCount: snapshot.files.size,
      metadata: snapshot.metadata
    }
  }

  /**
   * List all available backups
   * 
   * @returns Array of backup information
   */
  listBackups(): Array<{
    jobId: string
    timestamp: Date
    fileCount: number
    metadata: BackupSnapshot['metadata']
  }> {
    const backups: Array<{
      jobId: string
      timestamp: Date
      fileCount: number
      metadata: BackupSnapshot['metadata']
    }> = []

    for (const snapshot of this.backups.values()) {
      backups.push({
        jobId: snapshot.jobId,
        timestamp: snapshot.timestamp,
        fileCount: snapshot.files.size,
        metadata: snapshot.metadata
      })
    }

    // Sort by timestamp (newest first)
    return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Calculate backup size in bytes
   */
  private calculateBackupSize(snapshot: BackupSnapshot): number {
    let size = 0
    
    for (const entry of snapshot.files.values()) {
      size += entry.originalContent.length
    }

    return size
  }

  /**
   * Clean up old backups to maintain max limit
   */
  private async cleanupOldBackups(): Promise<void> {
    if (this.backups.size <= this.maxBackups) {
      return
    }

    // Get all backups sorted by timestamp
    const sortedBackups = Array.from(this.backups.entries())
      .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime())

    // Remove oldest backups beyond the limit
    const toRemove = sortedBackups.slice(this.maxBackups)
    
    for (const [jobId] of toRemove) {
      logMigrationEvent('backup:auto-cleanup', {
        jobId,
        reason: 'max-backups-exceeded'
      })
      this.backups.delete(jobId)
    }
  }

  /**
   * Clear all backups (use with caution)
   */
  clearAllBackups(): void {
    logMigrationEvent('backup:clear-all', {
      count: this.backups.size
    })
    this.backups.clear()
  }
}

/**
 * Transaction-based backup manager for atomic operations
 * 
 * Provides transaction-like semantics for migrations:
 * - Create backup before starting
 * - Commit on success (cleanup backup)
 * - Rollback on failure (restore from backup)
 * 
 * Requirements: 12.3, 12.4, 12.5
 */
export class BackupTransaction {
  private backupManager: BackupManager
  private jobId: string
  private committed: boolean = false
  private rolledBack: boolean = false

  constructor(backupManager: BackupManager, jobId: string) {
    this.backupManager = backupManager
    this.jobId = jobId
  }

  /**
   * Create backup for transaction
   */
  async begin(
    files: Array<{ path: string; content: string }>,
    metadata: {
      sourceFramework: string
      targetFramework: string
    }
  ): Promise<void> {
    await this.backupManager.createBackup(this.jobId, files, metadata)
  }

  /**
   * Commit transaction (cleanup backup)
   */
  async commit(): Promise<void> {
    if (this.committed) {
      throw new BackupError(
        'Transaction already committed',
        'cleanup',
        this.jobId
      )
    }

    if (this.rolledBack) {
      throw new BackupError(
        'Cannot commit after rollback',
        'cleanup',
        this.jobId
      )
    }

    await this.backupManager.cleanupBackup(this.jobId)
    this.committed = true
  }

  /**
   * Rollback transaction (restore from backup)
   */
  async rollback(): Promise<Map<string, string>> {
    if (this.committed) {
      throw new BackupError(
        'Cannot rollback after commit',
        'restore',
        this.jobId
      )
    }

    if (this.rolledBack) {
      throw new BackupError(
        'Transaction already rolled back',
        'restore',
        this.jobId
      )
    }

    const restoredFiles = await this.backupManager.restoreBackup(this.jobId)
    this.rolledBack = true
    
    return restoredFiles
  }

  /**
   * Check if transaction is complete
   */
  isComplete(): boolean {
    return this.committed || this.rolledBack
  }
}

/**
 * Create a backup transaction for a migration job
 * 
 * @param jobId - Unique job identifier
 * @param backupManager - Optional backup manager instance
 * @returns Backup transaction
 */
export function createBackupTransaction(
  jobId: string,
  backupManager?: BackupManager
): BackupTransaction {
  const manager = backupManager || new BackupManager()
  return new BackupTransaction(manager, jobId)
}
