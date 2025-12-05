/**
 * Log Persistence Utility for ReviveHub
 * Captures and persists console logs to files
 */

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface LogEntry {
  timestamp: string
  level: 'log' | 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
  stack?: string
}

export class LogPersister {
  private logDir: string
  private currentLogFile: string
  private maxLogSizeMB: number = 10
  private rotateOnSize: boolean = true

  constructor(logDir: string = 'logs') {
    this.logDir = logDir
    this.ensureLogDirectory()
    this.currentLogFile = this.getLogFileName()
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true })
    }
  }

  private getLogFileName(): string {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0]
    return join(this.logDir, `revivehub-${dateStr}.log`)
  }

  private formatLogEntry(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.message,
    ]

    if (entry.data) {
      parts.push(`\nData: ${JSON.stringify(entry.data, null, 2)}`)
    }

    if (entry.stack) {
      parts.push(`\nStack: ${entry.stack}`)
    }

    return parts.join(' ') + '\n'
  }

  public log(level: LogEntry['level'], message: string, data?: any, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      stack: error?.stack,
    }

    const formatted = this.formatLogEntry(entry)

    try {
      appendFileSync(this.currentLogFile, formatted, 'utf-8')
    } catch (err) {
      // Fallback: write to stderr if file write fails
      console.error('Failed to write to log file:', err)
    }
  }

  public info(message: string, data?: any): void {
    this.log('info', message, data)
  }

  public warn(message: string, data?: any): void {
    this.log('warn', message, data)
  }

  public error(message: string, error?: Error, data?: any): void {
    this.log('error', message, data, error)
  }

  public debug(message: string, data?: any): void {
    this.log('debug', message, data)
  }
}

// Singleton instance
let persisterInstance: LogPersister | null = null

export function getLogPersister(): LogPersister {
  if (!persisterInstance) {
    persisterInstance = new LogPersister()
  }
  return persisterInstance
}

// Intercept console methods
export function interceptConsole(): void {
  const persister = getLogPersister()
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  }

  console.log = (...args: any[]) => {
    originalConsole.log(...args)
    persister.log('log', args.map(a => String(a)).join(' '))
  }

  console.info = (...args: any[]) => {
    originalConsole.info(...args)
    persister.info(args.map(a => String(a)).join(' '))
  }

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args)
    persister.warn(args.map(a => String(a)).join(' '))
  }

  console.error = (...args: any[]) => {
    originalConsole.error(...args)
    const errorArg = args.find(a => a instanceof Error)
    persister.error(
      args.map(a => String(a)).join(' '),
      errorArg
    )
  }

  console.debug = (...args: any[]) => {
    originalConsole.debug(...args)
    persister.debug(args.map(a => String(a)).join(' '))
  }
}
