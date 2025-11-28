'use client'

import { useState, useEffect } from 'react'
import { ClientCache, CacheKeys } from '@/lib/cache/client-cache'
import type { AnalysisReport } from '@/lib/scanner/types'

interface ScanButtonProps {
  owner: string
  repo: string
  onScanComplete: (results: AnalysisReport) => void
  onScanError: (error: string) => void
  onScanStart?: () => void
  disabled?: boolean
}

const PROGRESS_MESSAGES = [
  'Initializing scan...',
  'Analyzing dependencies...',
  'Detecting frameworks...',
  'Scanning build tools...',
  'Evaluating code quality...',
  'Generating health report...',
]

export function ScanButton({
  owner,
  repo,
  onScanComplete,
  onScanError,
  onScanStart,
  disabled = false,
}: ScanButtonProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')

  // Check cache on mount
  useEffect(() => {
    const cachedResults = ClientCache.get<AnalysisReport>(
      CacheKeys.scanResults(owner, repo)
    )
    if (cachedResults) {
      // If we have cached results, notify parent immediately
      onScanComplete(cachedResults)
    }
  }, [owner, repo, onScanComplete])

  const handleScan = async () => {
    setIsScanning(true)
    setProgressMessage(PROGRESS_MESSAGES[0])
    onScanStart?.() // Notify parent component that scan has started

    // Cycle through progress messages
    let messageIndex = 0
    const progressInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % PROGRESS_MESSAGES.length
      setProgressMessage(PROGRESS_MESSAGES[messageIndex])
    }, 2000)

    try {
      const response = await fetch(`/api/scan/${owner}/${repo}`)
      
      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle specific error cases with detailed messages
        if (response.status === 429) {
          const resetTime = errorData.rateLimit?.reset
            ? new Date(errorData.rateLimit.reset).toLocaleTimeString()
            : 'soon'
          const remaining = errorData.rateLimit?.remaining ?? 0
          const limit = errorData.rateLimit?.limit ?? 5000
          onScanError(
            `GitHub API rate limit exceeded (${remaining}/${limit} remaining). Resets at ${resetTime}. Please try again later.`
          )
        } else if (response.status === 404) {
          onScanError(
            'Repository not found. Please verify the repository exists and you have access to it.'
          )
        } else if (response.status === 504 || response.status === 408) {
          onScanError(
            'Repository scan timed out. This may happen with very large repositories. Please try again or contact support.'
          )
        } else if (response.status === 401 || response.status === 403) {
          onScanError(
            'Authentication error. Please sign out and sign in again to refresh your GitHub access.'
          )
        } else if (response.status >= 500) {
          onScanError(
            `Server error occurred (${response.status}). Please try again in a few moments.`
          )
        } else {
          onScanError(
            errorData.message || errorData.error || `Failed to scan repository (Error ${response.status})`
          )
        }
        return
      }

      const data = await response.json()
      
      if (data.success && data.data) {
        setProgressMessage('Scan complete!')
        setTimeout(() => {
          onScanComplete(data.data)
        }, 500)
      } else {
        onScanError('Scan completed but no data was returned')
      }
    } catch (error) {
      clearInterval(progressInterval)
      console.error('Scan error:', error)
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        onScanError(
          'Network error: Unable to connect to the server. Please check your internet connection and try again.'
        )
      } else {
        onScanError(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred during scanning. Please try again.'
        )
      }
    } finally {
      setIsScanning(false)
      setProgressMessage('')
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleScan}
        disabled={disabled || isScanning}
        aria-label={`Scan ${repo} for health issues`}
        aria-busy={isScanning}
        className={`
          group relative overflow-hidden rounded-lg px-6 py-3 font-semibold text-white
          transition-all duration-300
          ${
            disabled || isScanning
              ? 'cursor-not-allowed opacity-50'
              : 'hover:scale-105 hover:shadow-lg hover:shadow-purple-500/30'
          }
        `}
      >
        {/* Gradient background */}
        <div
          className={`
            absolute inset-0 bg-gradient-to-r from-purple-600 to-orange-600
            transition-opacity duration-300
            ${disabled || isScanning ? 'opacity-50' : 'opacity-100 group-hover:opacity-90'}
          `}
        />

        {/* Animated glow effect on hover */}
        {!disabled && !isScanning && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-orange-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-30" />
        )}

        {/* Button content */}
        <span className="relative flex items-center gap-2">
          {isScanning ? (
            <>
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Scan Repository</span>
            </>
          )}
        </span>
      </button>

      {/* Progress message */}
      {isScanning && progressMessage && (
        <div
          className="text-sm text-purple-300 animate-pulse"
          role="status"
          aria-live="polite"
        >
          {progressMessage}
        </div>
      )}
    </div>
  )
}
