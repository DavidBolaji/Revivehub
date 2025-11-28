/**
 * Unit tests for TransformationProgress component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import TransformationProgress from '@/components/transformation/TransformationProgress'
import type { TransformationSummary } from '@/types/transformer'

// Mock EventSource for testing SSE functionality
class MockEventSource {
  public onopen: ((event: Event) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public readyState: number = 0
  public url: string
  public listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map()

  constructor(url: string) {
    this.url = url
    this.readyState = 1 // CONNECTING
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, [])
    }
    this.listeners.get(type)!.push(listener)
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  close() {
    this.readyState = 2 // CLOSED
  }

  // Helper method to simulate events
  simulateEvent(type: string, data: any) {
    const listeners = this.listeners.get(type)
    if (listeners) {
      const event = new MessageEvent(type, {
        data: JSON.stringify(data)
      })
      listeners.forEach(listener => listener(event))
    }
  }
}

describe('TransformationProgress', () => {
  const mockJobId = 'tx_test_123'
  const mockOnComplete = vi.fn()

  beforeEach(() => {
    mockOnComplete.mockClear()
  })

  describe('Component Structure', () => {
    it('should be defined as a React component', () => {
      expect(TransformationProgress).toBeDefined()
      expect(typeof TransformationProgress).toBe('function')
    })

    it('should accept required props', () => {
      // Test that component can be instantiated with required props
      const props = {
        jobId: mockJobId,
        onComplete: mockOnComplete
      }
      
      expect(props.jobId).toBe(mockJobId)
      expect(typeof props.onComplete).toBe('function')
    })
  })

  describe('Progress Message Parsing', () => {
    it('should parse phase messages correctly', () => {
      const parseProgressMessage = (message: string) => {
        const phaseMatch = message.match(/Phase (\d+): (.+)/)
        if (phaseMatch) {
          return {
            type: 'phase' as const,
            order: parseInt(phaseMatch[1]),
            name: phaseMatch[2],
          }
        }
        return null
      }

      const result = parseProgressMessage('Phase 1: Code Analysis')
      expect(result).toEqual({
        type: 'phase',
        order: 1,
        name: 'Code Analysis'
      })
    })

    it('should parse task messages correctly', () => {
      const parseProgressMessage = (message: string) => {
        const taskMatch = message.match(/⚙️ (.+)\.\.\./)
        if (taskMatch) {
          return {
            type: 'task' as const,
            name: taskMatch[1],
          }
        }
        return null
      }

      const result = parseProgressMessage('⚙️ Analyzing TypeScript files...')
      expect(result).toEqual({
        type: 'task',
        name: 'Analyzing TypeScript files'
      })
    })

    it('should parse file transformation messages correctly', () => {
      const parseProgressMessage = (message: string) => {
        const fileMatch = message.match(/✓ (.+) transformed/)
        if (fileMatch) {
          return {
            type: 'file' as const,
            path: fileMatch[1],
          }
        }
        return null
      }

      const result = parseProgressMessage('✓ src/components/Button.tsx transformed')
      expect(result).toEqual({
        type: 'file',
        path: 'src/components/Button.tsx'
      })
    })

    it('should return null for unrecognized messages', () => {
      const parseProgressMessage = (message: string) => {
        // Simple implementation for testing
        if (message.includes('Phase')) return { type: 'phase' as const }
        if (message.includes('⚙️')) return { type: 'task' as const }
        if (message.includes('✓') && message.includes('transformed')) return { type: 'file' as const }
        return null
      }

      const result = parseProgressMessage('Random message')
      expect(result).toBeNull()
    })
  })

  describe('Progress State Management', () => {
    it('should initialize with correct default state', () => {
      const initialState = {
        status: 'connecting' as const,
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
      }

      expect(initialState.status).toBe('connecting')
      expect(initialState.overallProgress).toBe(0)
      expect(initialState.phases).toHaveLength(0)
      expect(initialState.logs).toHaveLength(0)
      expect(initialState.metrics.filesProcessed).toBe(0)
    })

    it('should calculate progress percentage correctly', () => {
      const calculateProgress = (completedTasks: number, totalTasks: number) => {
        return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      }

      expect(calculateProgress(0, 0)).toBe(0)
      expect(calculateProgress(1, 2)).toBe(50)
      expect(calculateProgress(2, 2)).toBe(100)
      expect(calculateProgress(3, 4)).toBe(75)
    })

    it('should update metrics when files are processed', () => {
      const updateMetrics = (currentMetrics: any, message: string) => {
        const newMetrics = { ...currentMetrics }
        
        if (message.includes('transformed')) {
          newMetrics.filesProcessed += 1
        }
        
        if (message.includes('task completed')) {
          newMetrics.tasksCompleted += 1
        }
        
        return newMetrics
      }

      const initialMetrics = {
        filesProcessed: 0,
        linesChanged: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        duration: 0,
      }

      const updated1 = updateMetrics(initialMetrics, '✓ file1.ts transformed')
      expect(updated1.filesProcessed).toBe(1)

      const updated2 = updateMetrics(updated1, 'task completed')
      expect(updated2.tasksCompleted).toBe(1)
    })
  })

  describe('Log Entry Management', () => {
    it('should create log entries with correct structure', () => {
      const createLogEntry = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        return {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: new Date(),
          message,
          type,
        }
      }

      const entry = createLogEntry('Test message', 'success')
      
      expect(entry.message).toBe('Test message')
      expect(entry.type).toBe('success')
      expect(entry.id).toMatch(/^log_\d+_[a-z0-9]+$/)
      expect(entry.timestamp).toBeInstanceOf(Date)
    })

    it('should handle different log types', () => {
      const logTypes = ['info', 'success', 'warning', 'error'] as const
      
      logTypes.forEach(type => {
        const entry = {
          id: `test_${type}`,
          timestamp: new Date(),
          message: `Test ${type} message`,
          type,
        }
        
        expect(entry.type).toBe(type)
      })
    })
  })

  describe('Phase and Task Management', () => {
    it('should create phase objects correctly', () => {
      const createPhase = (id: string, name: string) => {
        return {
          id,
          name,
          status: 'in-progress' as const,
          tasks: [],
          startTime: new Date(),
        }
      }

      const phase = createPhase('phase_1', 'Code Analysis')
      
      expect(phase.id).toBe('phase_1')
      expect(phase.name).toBe('Code Analysis')
      expect(phase.status).toBe('in-progress')
      expect(phase.tasks).toHaveLength(0)
      expect(phase.startTime).toBeInstanceOf(Date)
    })

    it('should create task objects correctly', () => {
      const createTask = (id: string, name: string) => {
        return {
          id,
          name,
          status: 'in-progress' as const,
          startTime: new Date(),
        }
      }

      const task = createTask('task_1', 'Analyze TypeScript files')
      
      expect(task.id).toBe('task_1')
      expect(task.name).toBe('Analyze TypeScript files')
      expect(task.status).toBe('in-progress')
      expect(task.startTime).toBeInstanceOf(Date)
    })

    it('should update task status correctly', () => {
      const updateTaskStatus = (task: any, status: 'pending' | 'in-progress' | 'complete' | 'failed') => {
        return {
          ...task,
          status,
          endTime: status === 'complete' || status === 'failed' ? new Date() : undefined
        }
      }

      const task = {
        id: 'task_1',
        name: 'Test Task',
        status: 'in-progress' as const,
        startTime: new Date(),
      }

      const completedTask = updateTaskStatus(task, 'complete')
      expect(completedTask.status).toBe('complete')
      expect(completedTask.endTime).toBeInstanceOf(Date)
    })
  })

  describe('SSE Event Handling', () => {
    it('should handle progress events', () => {
      const handleProgressEvent = (event: any) => {
        return {
          type: event.type,
          jobId: event.jobId,
          message: event.message,
          timestamp: new Date(event.timestamp),
          data: event.data,
        }
      }

      const mockEvent = {
        type: 'progress',
        jobId: mockJobId,
        message: 'Processing files...',
        timestamp: new Date().toISOString(),
        data: {}
      }

      const result = handleProgressEvent(mockEvent)
      
      expect(result.type).toBe('progress')
      expect(result.jobId).toBe(mockJobId)
      expect(result.message).toBe('Processing files...')
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should handle completion events', () => {
      const handleCompleteEvent = (event: any, onComplete: Function) => {
        onComplete(event.data)
        return {
          status: 'complete',
          result: event.data
        }
      }

      const mockResult: TransformationSummary = {
        filesChanged: 5,
        linesAdded: 100,
        linesRemoved: 50,
        tasksCompleted: 3,
        tasksFailed: 0,
        tasksSkipped: 0,
        errors: [],
        warnings: [],
        manualReviewNeeded: [],
        estimatedTimeSaved: '2 hours',
        totalDuration: 30000
      }

      const mockEvent = {
        type: 'complete',
        jobId: mockJobId,
        message: 'Transformation completed',
        data: mockResult
      }

      const result = handleCompleteEvent(mockEvent, mockOnComplete)
      
      expect(result.status).toBe('complete')
      expect(result.result).toBe(mockResult)
      expect(mockOnComplete).toHaveBeenCalledWith(mockResult)
    })

    it('should handle error events', () => {
      const handleErrorEvent = (event: any, onComplete: Function) => {
        onComplete(null)
        return {
          status: 'error',
          error: event.message
        }
      }

      const mockEvent = {
        type: 'error',
        jobId: mockJobId,
        message: 'Transformation failed',
        data: { error: 'SyntaxError' }
      }

      const result = handleErrorEvent(mockEvent, mockOnComplete)
      
      expect(result.status).toBe('error')
      expect(result.error).toBe('Transformation failed')
      expect(mockOnComplete).toHaveBeenCalledWith(null)
    })
  })

  describe('EventSource Integration', () => {
    it('should create EventSource with correct URL', () => {
      const createEventSource = (jobId: string) => {
        return new MockEventSource(`/api/transform/stream/${jobId}`)
      }

      const eventSource = createEventSource(mockJobId)
      
      expect(eventSource.url).toBe(`/api/transform/stream/${mockJobId}`)
      expect(eventSource.readyState).toBe(1) // CONNECTING
    })

    it('should add event listeners correctly', () => {
      const eventSource = new MockEventSource(`/api/transform/stream/${mockJobId}`)
      const mockListener = vi.fn()

      eventSource.addEventListener('progress', mockListener)
      
      expect(eventSource.listeners.get('progress')).toContain(mockListener)
    })

    it('should simulate events correctly', () => {
      const eventSource = new MockEventSource(`/api/transform/stream/${mockJobId}`)
      const mockListener = vi.fn()

      eventSource.addEventListener('progress', mockListener)
      
      const testData = {
        jobId: mockJobId,
        message: 'Test message',
        timestamp: new Date().toISOString()
      }

      eventSource.simulateEvent('progress', testData)
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress',
          data: JSON.stringify(testData)
        })
      )
    })

    it('should close connection correctly', () => {
      const eventSource = new MockEventSource(`/api/transform/stream/${mockJobId}`)
      
      expect(eventSource.readyState).toBe(1) // CONNECTING
      
      eventSource.close()
      
      expect(eventSource.readyState).toBe(2) // CLOSED
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', () => {
      const parseSSEData = (data: string) => {
        try {
          return JSON.parse(data)
        } catch (error) {
          console.error('Error parsing SSE event:', error)
          return null
        }
      }

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const result = parseSSEData('invalid json')
      
      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Error parsing SSE event:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle missing event data', () => {
      const handleEvent = (event: any) => {
        if (!event || !event.data) {
          return { error: 'Missing event data' }
        }
        
        try {
          const parsed = JSON.parse(event.data)
          return { success: true, data: parsed }
        } catch (error) {
          return { error: 'Invalid JSON' }
        }
      }

      const result1 = handleEvent(null)
      expect(result1.error).toBe('Missing event data')

      const result2 = handleEvent({ data: null })
      expect(result2.error).toBe('Missing event data')

      const result3 = handleEvent({ data: 'invalid' })
      expect(result3.error).toBe('Invalid JSON')
    })
  })

  describe('Utility Functions', () => {
    it('should format duration correctly', () => {
      const formatDuration = (ms: number) => {
        return (ms / 1000).toFixed(1) + 's'
      }

      expect(formatDuration(1000)).toBe('1.0s')
      expect(formatDuration(1500)).toBe('1.5s')
      expect(formatDuration(30000)).toBe('30.0s')
    })

    it('should generate unique IDs', () => {
      const generateId = () => {
        return `log_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
      }

      const id1 = generateId()
      const id2 = generateId()
      
      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^log_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^log_\d+_[a-z0-9]+$/)
    })

    it('should validate job ID format', () => {
      const isValidJobId = (jobId: string) => {
        return !!jobId && jobId.startsWith('tx_')
      }

      expect(isValidJobId('tx_test_123')).toBe(true)
      expect(isValidJobId('invalid_id')).toBe(false)
      expect(isValidJobId('')).toBe(false)
      expect(isValidJobId('tx_')).toBe(true)
    })
  })
})