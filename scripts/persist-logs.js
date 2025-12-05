#!/usr/bin/env node
/**
 * Log Persistence Script
 * Captures stdin and persists to log files
 * Usage: node scripts/persist-logs.js [log-message]
 */

const { appendFileSync, existsSync, mkdirSync } = require('fs')
const { join } = require('path')

const LOG_DIR = 'logs'

function ensureLogDirectory() {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
}

function getLogFileName() {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0]
  return join(LOG_DIR, `kiro-session-${dateStr}.log`)
}

function formatLogEntry(message) {
  const timestamp = new Date().toISOString()
  return `[${timestamp}] ${message}\n`
}

function persistLog(message) {
  ensureLogDirectory()
  const logFile = getLogFileName()
  const formatted = formatLogEntry(message)
  
  try {
    appendFileSync(logFile, formatted, 'utf-8')
    console.log(`✅ Log persisted to: ${logFile}`)
  } catch (error) {
    console.error('❌ Failed to persist log:', error.message)
    process.exit(1)
  }
}

// Main execution
const args = process.argv.slice(2)

if (args.length > 0) {
  // Log from command line arguments
  const message = args.join(' ')
  persistLog(message)
} else {
  // Read from stdin
  let inputData = ''
  
  process.stdin.setEncoding('utf-8')
  
  process.stdin.on('data', (chunk) => {
    inputData += chunk
  })
  
  process.stdin.on('end', () => {
    if (inputData.trim()) {
      persistLog(inputData.trim())
    }
  })
}
