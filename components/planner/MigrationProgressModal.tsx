'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, Clock, FileCode } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MigrationProgress } from '@/types/migration'

interface MigrationProgressModalProps {
  jobId: string
  isOpen: boolean
  onClose: () => void
  onComplete: (result: any) => void
  onError: (error: Error) => void
}

interface ProgressState {
  progress: MigrationProgress
  status: 'running' | 'completed' | 'failed'
  error?: string
}

export function MigrationProgressModal({
  jobId,
  isOpen,
  onClose,
  onComplete,
  onError,
}: MigrationProgressModalProps) {
  const [progressState, setProgressState] = useState<ProgressState>({
    progress: {
      totalFiles: 0,
      processedFiles: 0,
      percentage: 0,
    },
    status: 'running',
  })

  const [recentFiles, setRecentFiles] = useState<string[]>([])

  useEffect(() => {
    if (!isOpen || !jobId) return

    console.log(`[Progress Modal] Connecting to SSE for job ${jobId}`)

    // Track if we've successfully connected
    let hasConnected = false
    let connectionErrorCount = 0
    const maxConnectionErrors = 3

    // Connect to SSE endpoint for progress updates
    const eventSource = new EventSource(`/api/migration/progress/${jobId}`)

    // Handle connected event
    eventSource.addEventListener('connected', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Connected to migration progress stream:', data)
        
        // Mark as successfully connected
        hasConnected = true
        connectionErrorCount = 0 // Reset error count on successful connection
        
        // Initialize progress from connection data
        if (data.progress) {
          setProgressState((prev) => ({
            ...prev,
            progress: {
              totalFiles: data.progress.totalFiles || 0,
              processedFiles: data.progress.processedFiles || 0,
              percentage: data.progress.percentage || 0,
            },
            status: data.status === 'completed' ? 'completed' : data.status === 'failed' ? 'failed' : 'running',
          }))
        }
      } catch (error) {
        console.error('Failed to parse connected event:', error)
      }
    })

    // Handle progress events
    eventSource.addEventListener('progress', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Progress update:', data)

        setProgressState((prev) => ({
          ...prev,
          progress: data.progress,
        }))

        // Track recent files
        if (data.currentFile) {
          setRecentFiles((prev) => {
            const updated = [data.currentFile, ...prev.slice(0, 4)]
            return updated
          })
        }
      } catch (error) {
        console.error('Failed to parse progress event:', error)
      }
    })

    // Handle complete event
    eventSource.addEventListener('complete', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Migration complete:', data)

        setProgressState({
          progress: {
            totalFiles: data.result?.summary?.totalFiles || 0,
            processedFiles: data.result?.summary?.totalFiles || 0,
            percentage: 100,
          },
          status: 'completed',
        })
        eventSource.close()
        onComplete(data.result)
      } catch (error) {
        console.error('Failed to parse complete event:', error)
      }
    })

    // Handle error event
    eventSource.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Migration error:', data)

        setProgressState({
          progress: progressState.progress,
          status: 'failed',
          error: data.message || data.error,
        })
        eventSource.close()
        onError(new Error(data.message || data.error))
      } catch (error) {
        console.error('Failed to parse error event:', error)
      }
    })

    eventSource.onerror = (error) => {
      console.error('[Progress Modal] SSE connection error:', error)
      console.error('[Progress Modal] EventSource readyState:', eventSource.readyState)
      
      // Only count errors if we've successfully connected before
      // This prevents false failures during initial connection
      if (hasConnected) {
        connectionErrorCount++
      } else {
        console.log('[Progress Modal] Connection error during initial setup, ignoring...')
        return
      }
      
      // Don't immediately fail - the connection might reconnect
      // Only fail if we've had multiple errors or connection is closed
      if (eventSource.readyState === EventSource.CLOSED) {
        console.error('[Progress Modal] Connection closed, marking as failed')
        eventSource.close()
        setProgressState((prev) => ({
          ...prev,
          status: 'failed',
          error: 'Connection lost. Please check the migration status.',
        }))
      } else if (connectionErrorCount >= maxConnectionErrors) {
        console.error('[Progress Modal] Too many connection errors, marking as failed')
        eventSource.close()
        setProgressState((prev) => ({
          ...prev,
          status: 'failed',
          error: 'Connection unstable. Please check the migration status.',
        }))
      } else {
        console.log(`[Progress Modal] Connection error ${connectionErrorCount}/${maxConnectionErrors}, will retry...`)
      }
    }

    return () => {
      eventSource.close()
    }
  }, [isOpen, jobId, onComplete, onError])

  const formatTime = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return 'Calculating...'
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const getStatusIcon = () => {
    switch (progressState.status) {
      case 'running':
        return <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />
      case 'failed':
        return <AlertCircle className="h-6 w-6 text-red-600" />
    }
  }

  const getStatusText = () => {
    switch (progressState.status) {
      case 'running':
        return 'Migration in Progress'
      case 'completed':
        return 'Migration Complete'
      case 'failed':
        return 'Migration Failed'
    }
  }

  const getStatusColor = () => {
    switch (progressState.status) {
      case 'running':
        return 'text-purple-600'
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
    }
  }

  const canClose = progressState.status !== 'running'

  return (
    <Dialog open={isOpen} onOpenChange={canClose ? onClose : undefined}>
      <DialogContent
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => {
          if (!canClose) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (!canClose) e.preventDefault()
        }}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              {getStatusIcon()}
              <span className={cn('text-xl', getStatusColor())}>
                {getStatusText()}
              </span>
            </DialogTitle>
            {canClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {progressState.progress.processedFiles} of {progressState.progress.totalFiles} files
              </span>
              <span className="font-semibold text-purple-600">
                {Math.round(progressState.progress.percentage)}%
              </span>
            </div>
            <Progress
              value={progressState.progress.percentage}
              className="h-3"
            />
          </div>

          {/* Current File */}
          {progressState.status === 'running' && progressState.progress.currentFile && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FileCode className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-purple-600 mb-1">Currently Processing</div>
                  <div className="text-sm font-mono text-purple-900 truncate">
                    {progressState.progress.currentFile}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Estimated Time Remaining */}
          {progressState.status === 'running' && (
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-600">Estimated Time Remaining</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatTime(progressState.progress.estimatedTimeRemaining)}
              </span>
            </div>
          )}

          {/* Recent Files */}
          {recentFiles.length > 0 && progressState.status === 'running' && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Recent Files</h4>
              <div className="space-y-1">
                {recentFiles.map((file, index) => (
                  <div
                    key={`${file}-${index}`}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded text-xs font-mono',
                      index === 0
                        ? 'bg-purple-100 text-purple-900'
                        : 'bg-gray-50 text-gray-600'
                    )}
                  >
                    <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span className="truncate">{file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {progressState.status === 'completed' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 mb-1">
                    Migration Completed Successfully
                  </h4>
                  <p className="text-sm text-green-700">
                    All files have been transformed. You can now review the changes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {progressState.status === 'failed' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Migration Failed
                  </h4>
                  <p className="text-sm text-red-700">
                    {progressState.error || 'An unexpected error occurred during migration.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Job ID: {jobId.slice(0, 8)}
            </Badge>
            {progressState.status === 'running' && (
              <Badge className="bg-purple-600 text-white text-xs">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
            {progressState.status === 'completed' && (
              <Badge className="bg-green-600 text-white text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Complete
              </Badge>
            )}
            {progressState.status === 'failed' && (
              <Badge className="bg-red-600 text-white text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Failed
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          {progressState.status !== 'running' && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {progressState.status === 'completed' && (
                <Button
                  className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500"
                  onClick={onClose}
                >
                  View Results
                </Button>
              )}
            </div>
          )}

          {/* Warning for running migration */}
          {progressState.status === 'running' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700">
                ⚠️ Please keep this window open while the migration is in progress.
                Closing it will not stop the migration.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
