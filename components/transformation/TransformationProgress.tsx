"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertTriangle, 
  FileText, 
  Activity,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { ProgressEvent, TransformationSummary } from '@/types/transformer'

interface TransformationProgressProps {
  jobId: string
  onComplete: (result: TransformationSummary | null) => void
}

interface ProgressState {
  status: 'connecting' | 'processing' | 'complete' | 'error'
  overallProgress: number
  currentPhase?: string
  currentTask?: string
  phases: PhaseProgress[]
  logs: LogEntry[]
  metrics: ProgressMetrics
  error?: string
  result?: TransformationSummary
}

interface PhaseProgress {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'complete' | 'failed'
  tasks: TaskProgress[]
  startTime?: Date
  endTime?: Date
}

interface TaskProgress {
  id: string
  name: string
  status: 'pending' | 'in-progress' | 'complete' | 'failed'
  files?: string[]
  startTime?: Date
  endTime?: Date
  error?: string
}

interface LogEntry {
  id: string
  timestamp: Date
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

interface ProgressMetrics {
  filesProcessed: number
  linesChanged: number
  tasksCompleted: number
  tasksFailed: number
  duration: number
}

// Progress bar component with animation
const ProgressBar: React.FC<{ 
  value: number
  className?: string
  showPercentage?: boolean
  animated?: boolean
}> = ({ value, className, showPercentage = true, animated = false }) => {
  const percentage = Math.min(Math.max(value, 0), 100)
  const [displayValue, setDisplayValue] = useState(0)
  
  // Animate progress changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(percentage)
    }, 100)
    return () => clearTimeout(timer)
  }, [percentage])
  
  return (
    <div className={cn("w-full", className)}>
      {showPercentage && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {displayValue.toFixed(1)}%
          </span>
          {animated && percentage > displayValue && (
            <span className="text-xs text-blue-600 animate-pulse">
              Updating...
            </span>
          )}
        </div>
      )}
      <Progress 
        value={displayValue} 
        className={cn(
          "w-full transition-all duration-500",
          animated && "animate-pulse"
        )} 
      />
    </div>
  )
}

// Status icon component
const StatusIcon: React.FC<{ 
  status: 'pending' | 'in-progress' | 'complete' | 'failed'
  className?: string
}> = ({ status, className }) => {
  switch (status) {
    case 'pending':
      return <Clock className={cn("h-4 w-4 text-gray-400", className)} />
    case 'in-progress':
      return <Loader2 className={cn("h-4 w-4 text-blue-500 animate-spin", className)} />
    case 'complete':
      return <CheckCircle className={cn("h-4 w-4 text-green-500", className)} />
    case 'failed':
      return <XCircle className={cn("h-4 w-4 text-red-500", className)} />
    default:
      return null
  }
}

// Phase component
const PhaseItem: React.FC<{
  phase: PhaseProgress
  isExpanded: boolean
  onToggleExpanded: () => void
}> = ({ phase, isExpanded, onToggleExpanded }) => {
  const completedTasks = phase.tasks.filter(t => t.status === 'complete').length
  const failedTasks = phase.tasks.filter(t => t.status === 'failed').length
  const progress = phase.tasks.length > 0 ? (completedTasks / phase.tasks.length) * 100 : 0
  
  const duration = phase.startTime && phase.endTime 
    ? phase.endTime.getTime() - phase.startTime.getTime()
    : phase.startTime 
    ? Date.now() - phase.startTime.getTime()
    : 0

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <StatusIcon status={phase.status} />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-base">{phase.name}</CardTitle>
                <Badge 
                  variant={phase.status === 'failed' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {completedTasks}/{phase.tasks.length} tasks
                </Badge>
                {failedTasks > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {failedTasks} failed
                  </Badge>
                )}
              </div>
              {phase.status !== 'pending' && (
                <div className="mt-2">
                  <ProgressBar value={progress} showPercentage={false} />
                </div>
              )}
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                {duration > 0 && (
                  <span>{(duration / 1000).toFixed(1)}s</span>
                )}
                {phase.status === 'in-progress' && (
                  <span className="text-blue-600 font-medium">Processing...</span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="ml-2"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && phase.tasks.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {phase.tasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Task component
const TaskItem: React.FC<{ task: TaskProgress }> = ({ task }) => {
  const duration = task.startTime && task.endTime 
    ? task.endTime.getTime() - task.startTime.getTime()
    : task.startTime 
    ? Date.now() - task.startTime.getTime()
    : 0

  return (
    <div className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
      <StatusIcon status={task.status} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">{task.name}</span>
          {duration > 0 && (
            <span className="text-xs text-gray-500">
              {(duration / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        {task.files && task.files.length > 0 && (
          <div className="flex items-center space-x-1 mt-1">
            <FileText className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">
              {task.files.length} file{task.files.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {task.error && (
          <div className="flex items-center space-x-1 mt-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-600">{task.error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Log entry component with loading indicators
const LogEntryItem: React.FC<{ 
  entry: LogEntry
  isLatest?: boolean
  showSpinner?: boolean
}> = ({ entry, isLatest = false, showSpinner = false }) => {
  const getLogIcon = (type: LogEntry['type']) => {
    // Show spinner for latest processing entry
    if (isLatest && showSpinner && type === 'info') {
      return <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
    }
    
    switch (type) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <Activity className="h-3 w-3 text-blue-500" />
    }
  }

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-700'
      case 'warning':
        return 'text-yellow-700'
      case 'error':
        return 'text-red-700'
      default:
        return 'text-gray-700'
    }
  }

  const isProcessingMessage = entry.message.includes('...') || 
                             entry.message.includes('Processing') ||
                             entry.message.includes('Analyzing') ||
                             entry.message.includes('Transforming')

  return (
    <div className={cn(
      "flex items-start space-x-2 py-1 transition-all duration-200",
      isLatest && isProcessingMessage && "bg-blue-50 rounded px-2 -mx-2"
    )}>
      <span className="text-xs text-gray-400 font-mono min-w-[60px]">
        {entry.timestamp.toLocaleTimeString()}
      </span>
      {getLogIcon(entry.type)}
      <span className={cn(
        "text-xs flex-1",
        getLogColor(entry.type),
        isLatest && isProcessingMessage && "font-medium"
      )}>
        {entry.message}
      </span>
    </div>
  )
}

export const TransformationProgress: React.FC<TransformationProgressProps> = ({
  jobId,
  onComplete,
}) => {
  const [state, setState] = useState<ProgressState>({
    status: 'connecting',
    overallProgress: 0,
    phases: [],
    logs: [],
    metrics: {
      filesProcessed: 0,
      linesChanged: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      duration: 0,
    },
  })

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const eventSourceRef = useRef<EventSource | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<Date>(new Date())

  // Auto-scroll log to bottom
  const scrollToBottom = useCallback(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [])

  // Add log entry
  const addLogEntry = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date(),
      message,
      type,
    }

    setState(prev => ({
      ...prev,
      logs: [...prev.logs, entry],
    }))

    // Auto-scroll after a short delay to ensure DOM update
    setTimeout(scrollToBottom, 100)
  }, [scrollToBottom])

  // Parse progress message to extract phase/task info
  const parseProgressMessage = useCallback((message: string) => {
    // Check if this is a phase completion message (should be ignored, not create new phase)
    if (message.includes('complete') && message.match(/✓.*Phase \d+/)) {
      return {
        type: 'phase-complete' as const,
        message,
      }
    }
    
    // Extract phase information - support both "Phase X:" and "Transformation Phase X:"
    // Match the full phase name including prefix
    const phaseMatch = message.match(/🚀\s+(.+)/) || // Match everything after 🚀
                      message.match(/((?:Transformation )?Phase \d+: .+)/) || // Match full phase name
                      message.match(/⚙️ Starting ((?:Transformation )?Phase \d+)/)
    
    if (phaseMatch) {
      const fullName = phaseMatch[1].trim()
      // Extract order from the full name
      const orderMatch = fullName.match(/Phase (\d+)/)
      const order = orderMatch ? parseInt(orderMatch[1]) : 1
      
      return {
        type: 'phase' as const,
        order,
        name: fullName,
      }
    }

    // Extract task information - more patterns
    const taskMatch = message.match(/⚙️ (.+)\.\.\./) || 
                     message.match(/📝 (.+)\.\.\./) ||
                     message.match(/🔍 (.+)\.\.\./) ||
                     message.match(/🤖 (.+)\.\.\./)
    if (taskMatch) {
      return {
        type: 'task' as const,
        name: taskMatch[1],
      }
    }

    // Extract file information - more patterns
    const fileMatch = message.match(/✓ (.+) transformed/) ||
                     message.match(/✅ (.+) generated/) ||
                     message.match(/📄 (.+) updated/)
    if (fileMatch) {
      return {
        type: 'file' as const,
        path: fileMatch[1],
      }
    }

    // Extract progress indicators
    if (message.includes('Fetching repository files') || 
        message.includes('📥 Fetching')) {
      return { type: 'progress' as const, stage: 'fetching', progress: 10 }
    }
    
    if (message.includes('Extracting selected tasks') || 
        message.includes('🔍 Extracting')) {
      return { type: 'progress' as const, stage: 'extracting', progress: 20 }
    }
    
    if (message.includes('Analyzing repository structure') || 
        message.includes('🤖 Analyzing')) {
      return { type: 'progress' as const, stage: 'analyzing', progress: 30 }
    }

    return null
  }, [])

  // Update progress state based on message
  const updateProgress = useCallback((message: string) => {
    const parsed = parseProgressMessage(message)
    
    setState(prev => {
      const newState = { ...prev }
      
      // Update metrics based on message content
      if (message.includes('transformed')) {
        newState.metrics = {
          ...prev.metrics,
          filesProcessed: prev.metrics.filesProcessed + 1,
        }
      }

      // Extract lines changed from transformation messages
      const linesMatch = message.match(/\(\+(\d+) -(\d+) lines\)/)
      if (linesMatch) {
        const added = parseInt(linesMatch[1])
        const removed = parseInt(linesMatch[2])
        newState.metrics = {
          ...newState.metrics,
          linesChanged: prev.metrics.linesChanged + added + removed,
        }
      }

      // Update phases and tasks based on parsed message
      if (parsed?.type === 'phase-complete') {
        // Just mark the current phase as complete, don't create a new one
        const currentPhase = newState.phases.find(p => p.status === 'in-progress')
        if (currentPhase) {
          currentPhase.status = 'complete'
          currentPhase.endTime = new Date()
          
          // Mark all in-progress tasks as complete
          currentPhase.tasks.forEach(task => {
            if (task.status === 'in-progress') {
              task.status = 'complete'
              if (!task.endTime) {
                task.endTime = new Date()
              }
              newState.metrics = {
                ...newState.metrics,
                tasksCompleted: prev.metrics.tasksCompleted + 1,
              }
            }
          })
        }
      } else if (parsed?.type === 'phase') {
        // Mark previous phase as complete and update its tasks
        const prevPhase = newState.phases.find(p => p.status === 'in-progress')
        if (prevPhase) {
          prevPhase.status = 'complete'
          prevPhase.endTime = new Date()
          
          // Mark all in-progress tasks in previous phase as complete
          // Only increment count for tasks that weren't already complete
          prevPhase.tasks.forEach(task => {
            if (task.status === 'in-progress') {
              task.status = 'complete'
              if (!task.endTime) {
                task.endTime = new Date()
              }
              // Only increment if not already counted
              newState.metrics = {
                ...newState.metrics,
                tasksCompleted: prev.metrics.tasksCompleted + 1,
              }
            }
          })
        }

        const existingPhase = newState.phases.find(p => p.name === parsed.name)
        if (!existingPhase) {
          newState.phases.push({
            id: `phase_${parsed.order}`,
            name: parsed.name,
            status: 'in-progress',
            tasks: [],
            startTime: new Date(),
          })
        } else {
          existingPhase.status = 'in-progress'
          existingPhase.startTime = new Date()
        }
        newState.currentPhase = parsed.name
      }

      if (parsed?.type === 'task') {
        const currentPhase = newState.phases.find(p => p.status === 'in-progress')
        if (currentPhase) {
          // Mark previous task as complete (only if not already complete)
          const prevTask = currentPhase.tasks.find(t => t.status === 'in-progress')
          if (prevTask) {
            // Task is already complete if it has an endTime (was completed by file message)
            const wasAlreadyComplete = prevTask.status === 'complete'
            prevTask.status = 'complete'
            if (!prevTask.endTime) {
              prevTask.endTime = new Date()
            }
            // Only increment if not already counted
            if (!wasAlreadyComplete) {
              newState.metrics = {
                ...newState.metrics,
                tasksCompleted: prev.metrics.tasksCompleted + 1,
              }
            }
          }

          const existingTask = currentPhase.tasks.find(t => t.name === parsed.name)
          if (!existingTask) {
            currentPhase.tasks.push({
              id: `task_${Date.now()}`,
              name: parsed.name,
              status: 'in-progress',
              startTime: new Date(),
            })
          } else {
            existingTask.status = 'in-progress'
            existingTask.startTime = new Date()
          }
        }
        newState.currentTask = parsed.name
      }

      if (parsed?.type === 'file') {
        // Mark current task as complete and add file info
        const currentPhase = newState.phases.find(p => p.status === 'in-progress')
        if (currentPhase) {
          const currentTask = currentPhase.tasks.find(t => t.status === 'in-progress')
          if (currentTask) {
            currentTask.status = 'complete'
            currentTask.endTime = new Date()
            currentTask.files = currentTask.files || []
            if (!currentTask.files.includes(parsed.path)) {
              currentTask.files.push(parsed.path)
            }
            
            // Increment task completion count
            newState.metrics = {
              ...newState.metrics,
              tasksCompleted: prev.metrics.tasksCompleted + 1,
            }
          }
        }
      }

      // Calculate overall progress based on parsed information and activity
      let overallProgress = prev.overallProgress
      
      // Use parsed progress information if available
      if (parsed?.type === 'progress') {
        overallProgress = Math.max(parsed.progress, prev.overallProgress)
      } else if (parsed?.type === 'phase') {
        // Phase-based progress
        const phaseProgress = {
          1: 30, // Dependencies
          2: 50, // Structural
          3: 70, // Components
          4: 85  // Documentation
        }[parsed.order] || prev.overallProgress
        overallProgress = Math.max(phaseProgress, prev.overallProgress)
      } else if (parsed?.type === 'file') {
        // Increment progress for each file transformed
        overallProgress = Math.min(prev.overallProgress + 3, 95)
      } else if (parsed?.type === 'task') {
        // Small increment for task start
        overallProgress = Math.min(prev.overallProgress + 1, 90)
      } else {
        // Fallback to message pattern matching
        if (message.includes('Fetching repository files') || message.includes('📥')) {
          overallProgress = Math.max(10, prev.overallProgress)
        } else if (message.includes('Extracting selected tasks') || message.includes('🔍')) {
          overallProgress = Math.max(20, prev.overallProgress)
        } else if (message.includes('transformed') || message.includes('✓')) {
          overallProgress = Math.min(prev.overallProgress + 2, 95)
        } else if (message.includes('Analyzing') || message.includes('Processing') || message.includes('🤖')) {
          overallProgress = Math.min(prev.overallProgress + 1, 90)
        }
      }
      
      // Ensure progress never goes backwards and caps at 95% until completion
      newState.overallProgress = Math.max(overallProgress, prev.overallProgress)

      // Update duration
      newState.metrics = {
        ...newState.metrics,
        duration: Date.now() - startTimeRef.current.getTime(),
      }

      return newState
    })
  }, [parseProgressMessage])

  // Handle SSE events
  const handleSSEEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)
      const progressEvent: ProgressEvent = {
        type: event.type as any,
        jobId: data.jobId,
        message: data.message,
        timestamp: new Date(data.timestamp),
        data: data.data,
      }

      console.log(`[SSE] Received event:`, progressEvent.type, progressEvent.message)

      switch (progressEvent.type) {
        case 'progress':
          addLogEntry(progressEvent.message, 'info')
          updateProgress(progressEvent.message)
          break

        case 'complete':
          console.log(`[SSE] Transformation complete`)
          addLogEntry(progressEvent.message, 'success')
          setState(prev => ({
            ...prev,
            status: 'complete',
            overallProgress: 100, // Ensure 100% on completion
            result: progressEvent.data,
            phases: prev.phases.map(phase => ({
              ...phase,
              status: phase.status === 'in-progress' ? 'complete' : phase.status,
              endTime: phase.status === 'in-progress' ? new Date() : phase.endTime,
            })),
          }))
          // Pass the full result data instead of just summary
          onComplete(progressEvent.data || null)
          // Close connection after complete
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
          }
          break

        case 'error':
          console.log(`[SSE] Transformation error`)
          addLogEntry(progressEvent.message, 'error')
          setState(prev => ({
            ...prev,
            status: 'error',
            error: progressEvent.message,
            phases: prev.phases.map(phase => ({
              ...phase,
              status: phase.status === 'in-progress' ? 'failed' : phase.status,
              endTime: phase.status === 'in-progress' ? new Date() : phase.endTime,
            })),
          }))
          onComplete(null)
          // Close connection after error
          if (eventSourceRef.current) {
            eventSourceRef.current.close()
          }
          break
      }
    } catch (error) {
      console.error('[SSE] Error parsing event:', error)
      addLogEntry(`Error parsing event: ${error}`, 'error')
    }
  }, [addLogEntry, updateProgress, onComplete])

  // Establish SSE connection with auto-reconnect
  useEffect(() => {
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5
    const reconnectDelay = 2000 // 2 seconds
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isManualClose = false

    const connect = () => {
      console.log(`[SSE] Connecting to /api/transform/stream/${jobId}`)
      const eventSource = new EventSource(`/api/transform/stream/${jobId}`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log(`[SSE] Connection opened`)
        reconnectAttempts = 0 // Reset on successful connection
        setState(prev => ({ ...prev, status: 'processing' }))
        addLogEntry('Connected to transformation stream', 'success')
      }

      eventSource.addEventListener('progress', handleSSEEvent)
      eventSource.addEventListener('complete', handleSSEEvent)
      eventSource.addEventListener('error', handleSSEEvent)

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error)
        console.log(`[SSE] ReadyState: ${eventSource.readyState}`)
        
        // Close the current connection
        eventSource.close()
        
        // Don't reconnect if manually closed or if we've received a complete/error event
        if (isManualClose) {
          console.log('[SSE] Manual close, not reconnecting')
          return
        }

        // Check if we should reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++
          addLogEntry(`Connection lost. Reconnecting (attempt ${reconnectAttempts}/${maxReconnectAttempts})...`, 'warning')
          
          reconnectTimeout = setTimeout(() => {
            console.log(`[SSE] Reconnecting (attempt ${reconnectAttempts})`)
            connect()
          }, reconnectDelay)
        } else {
          addLogEntry('Connection lost. Maximum reconnection attempts reached.', 'error')
          setState(prev => ({ ...prev, status: 'error', error: 'Connection lost' }))
        }
      }
    }

    connect()

    return () => {
      console.log('[SSE] Cleanup: closing connection')
      isManualClose = true
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [jobId, handleSSEEvent, addLogEntry])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const togglePhaseExpanded = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev)
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId)
      } else {
        newSet.add(phaseId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <span>Transformation Progress</span>
            <Badge variant="outline" className="ml-2">
              Job {jobId}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-gray-500">
                  {state.status === 'complete' ? 'Complete' : 
                   state.status === 'error' ? 'Failed' :
                   state.status === 'connecting' ? 'Connecting...' : 'Processing...'}
                </span>
              </div>
              <ProgressBar 
                value={state.overallProgress} 
                animated={state.status === 'processing'}
              />
            </div>

            {/* Real-time Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {state.metrics.filesProcessed}
                </div>
                <div className="text-sm text-gray-600">Files Processed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {state.metrics.linesChanged}
                </div>
                <div className="text-sm text-gray-600">Lines Changed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {state.metrics.tasksCompleted}
                </div>
                <div className="text-sm text-gray-600">Tasks Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {(state.metrics.duration / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">Duration</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phase Progress */}
      {state.phases.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Phase Progress</h3>
          {state.phases.map((phase) => (
            <PhaseItem
              key={phase.id}
              phase={phase}
              isExpanded={expandedPhases.has(phase.id)}
              onToggleExpanded={() => togglePhaseExpanded(phase.id)}
            />
          ))}
        </div>
      )}

      {/* Live Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={logContainerRef}
            className="h-64 overflow-y-auto bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1"
          >
            {state.logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8 flex items-center justify-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Waiting for transformation to begin...</span>
              </div>
            ) : (
              state.logs.map((entry, index) => {
                const isLatest = index === state.logs.length - 1
                const showSpinner = state.status === 'processing' && isLatest
                return (
                  <LogEntryItem 
                    key={entry.id} 
                    entry={entry} 
                    isLatest={isLatest}
                    showSpinner={showSpinner}
                  />
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {state.status === 'error' && state.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-700">Transformation Failed</span>
            </div>
            <p className="text-red-600 mt-2">{state.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default TransformationProgress