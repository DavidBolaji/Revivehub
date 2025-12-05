#!/usr/bin/env node
/**
 * Log Viewer Script
 * View and filter persisted logs
 * Usage: node scripts/view-logs.ts [options]
 */

import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

const LOG_DIR = 'logs'

interface LogViewOptions {
  lines?: number
  filter?: string
  date?: string
  level?: string
}

function parseArgs(): LogViewOptions {
  const args = process.argv.slice(2)
  const options: LogViewOptions = {}

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '-n':
      case '--lines':
        options.lines = parseInt(args[++i])
        break
      case '-f':
      case '--filter':
        options.filter = args[++i]
        break
      case '-d':
      case '--date':
        options.date = args[++i]
        break
      case '-l':
      case '--level':
        options.level = args[++i]
        break
      case '-h':
      case '--help':
        printHelp()
        process.exit(0)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
Log Viewer - View persisted Kiro logs

Usage: node scripts/view-logs.ts [options]

Options:
  -n, --lines <number>    Show last N lines (default: all)
  -f, --filter <text>     Filter logs containing text
  -d, --date <YYYY-MM-DD> Show logs from specific date
  -l, --level <level>     Filter by log level (INFO, WARN, ERROR, etc.)
  -h, --help              Show this help message

Examples:
  node scripts/view-logs.ts -n 50
  node scripts/view-logs.ts -f "ERROR"
  node scripts/view-logs.ts -d 2025-12-05
  node scripts/view-logs.ts -l ERROR -n 20
`)
}

function getLogFiles(date?: string): string[] {
  try {
    const files = readdirSync(LOG_DIR)
    let logFiles = files.filter(f => f.endsWith('.log'))

    if (date) {
      logFiles = logFiles.filter(f => f.includes(date))
    }

    // Sort by modification time (newest first)
    logFiles.sort((a, b) => {
      const statA = statSync(join(LOG_DIR, a))
      const statB = statSync(join(LOG_DIR, b))
      return statB.mtimeMs - statA.mtimeMs
    })

    return logFiles.map(f => join(LOG_DIR, f))
  } catch (error) {
    console.error('Error reading log directory:', error)
    return []
  }
}

function readLogs(files: string[], options: LogViewOptions): string[] {
  let allLines: string[] = []

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n').filter(line => line.trim())
      allLines.push(...lines)
    } catch (error) {
      console.error(`Error reading ${file}:`, error)
    }
  }

  // Apply filters
  if (options.filter) {
    allLines = allLines.filter(line =>
      line.toLowerCase().includes(options.filter!.toLowerCase())
    )
  }

  if (options.level) {
    const levelPattern = new RegExp(`\\[${options.level.toUpperCase()}\\]`, 'i')
    allLines = allLines.filter(line => levelPattern.test(line))
  }

  // Limit lines
  if (options.lines && options.lines > 0) {
    allLines = allLines.slice(-options.lines)
  }

  return allLines
}

function main(): void {
  const options = parseArgs()
  const logFiles = getLogFiles(options.date)

  if (logFiles.length === 0) {
    console.log('No log files found.')
    return
  }

  console.log(`Reading logs from ${logFiles.length} file(s)...\n`)

  const logs = readLogs(logFiles, options)

  if (logs.length === 0) {
    console.log('No matching log entries found.')
    return
  }

  console.log(logs.join('\n'))
  console.log(`\n--- Showing ${logs.length} log entries ---`)
}

main()
