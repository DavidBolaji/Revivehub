#!/usr/bin/env node
/**
 * Log Cleanup Script
 * Remove old log files based on retention policy
 * Usage: node scripts/cleanup-logs.ts [--days <number>]
 */

import { readdirSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'

const LOG_DIR = 'logs'
const DEFAULT_RETENTION_DAYS = 30

function parseArgs(): number {
  const args = process.argv.slice(2)
  const daysIndex = args.indexOf('--days')
  
  if (daysIndex !== -1 && args[daysIndex + 1]) {
    return parseInt(args[daysIndex + 1])
  }
  
  return DEFAULT_RETENTION_DAYS
}

function cleanupOldLogs(retentionDays: number): void {
  try {
    const files = readdirSync(LOG_DIR)
    const logFiles = files.filter(f => f.endsWith('.log'))
    const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)
    
    let deletedCount = 0
    let totalSize = 0

    for (const file of logFiles) {
      const filePath = join(LOG_DIR, file)
      const stats = statSync(filePath)
      
      if (stats.mtimeMs < cutoffDate) {
        totalSize += stats.size
        unlinkSync(filePath)
        deletedCount++
        console.log(`Deleted: ${file} (${(stats.size / 1024).toFixed(2)} KB)`)
      }
    }

    if (deletedCount > 0) {
      console.log(`\n✅ Cleaned up ${deletedCount} log file(s)`)
      console.log(`   Total space freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    } else {
      console.log('No old log files to clean up.')
    }
  } catch (error) {
    console.error('Error cleaning up logs:', error)
    process.exit(1)
  }
}

const retentionDays = parseArgs()
console.log(`Cleaning up logs older than ${retentionDays} days...\n`)
cleanupOldLogs(retentionDays)
