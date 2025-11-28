'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, GitBranch, GitCommit, GitPullRequest } from 'lucide-react'
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

interface ApplyChangesModalProps {
  operationId: string
  isOpen: boolean
  onClose: () => void
  onComplete: (result: any) => void
  onError: (error: Error) => void
  onRetry?: () => void
}

interface ApplyProgressState {
  step: 'validating' | 'creating_branch' | 'committing' | 'creating_pr' | 'complete' | 'error'
  message: string
  percentage: number
  currentBatch?: number
  totalBatches?: number
  status: 'running' | 'completed' | 'failed'
  error?: string
  prUrl?: string
}

export function ApplyChangesModal({
  operationId,
  isOpen,
  onClose,
  onComplete,
  onError,
  onRetry,
}: ApplyChangesModalProps) {
  const [progressState, setProgressState] = useState<ApplyProgressState>({
    step: 'validating',
    message: 'Initializing...',
    percentage: 0,
    status: 'running',
  })

  useEffect(() => {
    if (!isOpen || !operationId) return

    console.log(`[Apply Modal] Connecting to SSE for operation ${operationId}`)

    let hasConnected = false
    let connectionErrorCount = 0
    const maxConnectionErrors = 3

    // Connect to SSE endpoint for progress updates
    const eventSource = new EventSource(`/api/github/apply/progress/${operationId}`)

    // Handle connected event
    eventSource.addEventListener('connected', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Connected to apply progress stream:', data)
        hasConnected = true
        connectionErrorCount = 0
      } catch (error) {
        console.error('Failed to parse connected event:', error)
      }
    })

    // Handle progress events
    eventSource.addEventListener('progress', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Apply progress update:', data)

        setProgressState((prev) => ({
          ...prev,
          step: data.step,
          message: data.message,
          percentage: data.percentage,
          currentBatch: data.currentBatch,
          totalBatches: data.totalBatches,
        }))
      } catch (error) {
        console.error('Failed to parse progress event:', error)
      }
    })

    // Handle complete event
    eventSource.addEventListener('complete', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Apply complete:', data)

        setProgressState({
          step: 'complete',
          message: 'Changes applied successfully!',
          percentage: 100,
          status: 'completed',
          prUrl: data.result?.pullRequest?.htmlUrl,
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
        console.log('Apply error:', data)

        setProgressState({
          step: 'error',
          message: data.message || 'An error occurred',
          percentage: progressState.percentage,
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
      console.error('[Apply Modal] SSE connection error:', error)
      console.error('[Apply Modal] EventSource readyState:', eventSource.readyState)
      
      if (hasConnected) {
        connectionErrorCount++
      } else {
        console.log('[Apply Modal] Connection error during initial setup, ignoring...')
        return
      }
      
      if (eventSource.readyState === EventSource.CLOSED) {
        console.error('[Apply Modal] Connection closed, marking as failed')
        eventSource.close()
        setProgressState((prev) => ({
          ...prev,
          status: 'failed',
          error: 'Connection lost. Please check the operation status.',
        }))
      } else if (connectionErrorCount >= maxConnectionErrors) {
        console.error('[Apply Modal] Too many connection errors, marking as failed')
        eventSource.close()
        setProgressState((prev) => ({
          ...prev,
          status: 'failed',
          error: 'Connection unstable. Please check the operation status.',
        }))
      }
    }

    return () => {
      eventSource.close()
    }
  }, [isOpen, operationId, onComplete, onError])

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'validating':
        return <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
      case 'creating_branch':
        return <GitBranch className="h-5 w-5 text-purple-600" />
      case 'committing':
        return <GitCommit className="h-5 w-5 text-purple-600" />
      case 'creating_pr':
        return <GitPullRequest className="h-5 w-5 text-purple-600" />
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
    }
  }

  const getStepLabel = (step: string) => {
    switch (step) {
      case 'validating':
        return 'Validating Repository'
      case 'creating_branch':
        return 'Creating Branch'
      case 'committing':
        return 'Committing Files'
      case 'creating_pr':
        return 'Creating Pull Request'
      case 'complete':
        return 'Complete'
      case 'error':
        return 'Error'
      default:
        return 'Processing'
    }
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
        return 'Applying Changes to GitHub'
      case 'completed':
        return 'Changes Applied Successfully'
      case 'failed':
        return 'Apply Failed'
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

  const steps = [
    { key: 'validating', label: 'Validate' },
    { key: 'creating_branch', label: 'Create Branch' },
    { key: 'committing', label: 'Commit Files' },
    { key: 'creating_pr', label: 'Create PR' },
  ]

  const currentStepIndex = steps.findIndex(s => s.key === progressState.step)

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
                {getStepLabel(progressState.step)}
              </span>
              <span className="font-semibold text-purple-600">
                {Math.round(progressState.percentage)}%
              </span>
            </div>
            <Progress
              value={progressState.percentage}
              className="h-3"
            />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    index < currentStepIndex
                      ? 'bg-green-100 border-green-600'
                      : index === currentStepIndex
                      ? 'bg-purple-100 border-purple-600'
                      : 'bg-gray-100 border-gray-300'
                  )}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : index === currentStepIndex ? (
                    <Loader2 className="h-5 w-5 text-purple-600 animate-spin" />
                  ) : (
                    <span className="text-gray-400 text-sm">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs text-center',
                    index <= currentStepIndex ? 'text-gray-900 font-medium' : 'text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Current Step Message */}
          {progressState.status === 'running' && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                {getStepIcon(progressState.step)}
                <div className="flex-1">
                  <div className="text-sm font-medium text-purple-900">
                    {progressState.message}
                  </div>
                  {progressState.currentBatch && progressState.totalBatches && (
                    <div className="text-xs text-purple-600 mt-1">
                      Batch {progressState.currentBatch} of {progressState.totalBatches}
                    </div>
                  )}
                </div>
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
                    Changes Applied Successfully
                  </h4>
                  <p className="text-sm text-green-700 mb-3">
                    A pull request has been created with your changes. You can now review and merge it on GitHub.
                  </p>
                  {progressState.prUrl && (
                    <a
                      href={progressState.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      View Pull Request
                      <span>→</span>
                    </a>
                  )}
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
                    Apply Failed
                  </h4>
                  <p className="text-sm text-red-700 mb-3">
                    {progressState.error || 'An unexpected error occurred while applying changes.'}
                  </p>
                  {onRetry && (
                    <Button
                      onClick={() => {
                        onClose()
                        onRetry()
                      }}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Retry Operation
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              Operation ID: {operationId.slice(0, 8)}
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
              {progressState.status === 'completed' && progressState.prUrl && (
                <Button
                  className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500"
                  onClick={() => window.open(progressState.prUrl, '_blank')}
                >
                  View Pull Request
                </Button>
              )}
            </div>
          )}

          {/* Warning for running operation */}
          {progressState.status === 'running' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs text-orange-700">
                ⚠️ Please keep this window open while changes are being applied.
                Closing it will not stop the operation.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
