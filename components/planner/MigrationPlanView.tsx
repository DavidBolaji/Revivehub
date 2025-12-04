'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { MigrationPlan, MigrationPhase, MigrationTask } from '@/lib/planner/types'
import type { EnhancedMigrationPlan } from '@/lib/planner/ai-enhancer'
import { Clock, Zap, AlertTriangle, CheckCircle2, X, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComponentLoadingSkeleton } from './ComponentLoadingSkeleton'
import type { OrchestrationResult, TransformationRequest } from '@/types/transformer'
import { Phase3Card } from './Phase3Card'
import { SuccessModal, useSuccessModal } from '@/components/ui/success-modal'
import { recordTransformation } from '@/lib/stats/statistics-service'


// Lazy load heavy components for better performance
// const PhaseTimeline = dynamic(() => import('./PhaseTimeline').then(mod => ({ default: mod.PhaseTimeline })), {
//   loading: () => <ComponentLoadingSkeleton type="timeline" />,
// })

const PhaseDetails = dynamic(() => import('./PhaseDetails').then(mod => ({ default: mod.PhaseDetails })), {
  loading: () => <ComponentLoadingSkeleton type="details" />,
})


const TaskSelector = dynamic(() => import('../transformation/TaskSelector'), {
  loading: () => <ComponentLoadingSkeleton type="details" />,
})

const TransformationProgress = dynamic(() => import('../transformation/TransformationProgress'), {
  loading: () => <ComponentLoadingSkeleton type="details" />,
})

const TransformationResults = dynamic(() => import('../transformation/TransformationResults'), {
  loading: () => <ComponentLoadingSkeleton type="details" />,
})

const EditableDiffViewer = dynamic(() => import('../transformation/EditableDiffViewer'), {
  loading: () => <ComponentLoadingSkeleton type="details" />,
})

interface MigrationPlanViewProps {
  plan: MigrationPlan | EnhancedMigrationPlan
  repositoryName: string
  repositoryOwner?: string
  onStartTransformation?: () => void
  onExecuteTask?: (taskId: string) => void
}

type TransformationFlowState =
  | { stage: 'idle' }
  | { stage: 'selecting' }
  | { stage: 'processing'; jobId: string }
  | { stage: 'results'; result: OrchestrationResult }
  | { stage: 'viewing-diff'; result: OrchestrationResult; filePath: string }

function isEnhancedPlan(plan: MigrationPlan | EnhancedMigrationPlan): plan is EnhancedMigrationPlan {
  return 'aiInsights' in plan
}

// Helper function to generate Phase 3 dynamically based on source stack
function generatePhase3(sourceStack: any): MigrationPhase {
  const framework = sourceStack.framework || 'Application'

  // Generate Phase 3 tasks dynamically
  const tasks: MigrationTask[] = [
    {
      id: 'phase3-select-target',
      name: 'Select Target Framework',
      description: `Choose the target framework and version for migrating your ${framework} application`,
      type: 'manual' as const,
      estimatedMinutes: 10,
      automatedMinutes: 0,
      riskLevel: 'low' as const,
      affectedFiles: [],
      dependencies: [],
      breakingChanges: [],
    },
    {
      id: 'phase3-configure-options',
      name: 'Configure Migration Options',
      description: 'Set framework-specific options like router type, styling approach, and TypeScript support',
      type: 'manual' as const,
      estimatedMinutes: 15,
      automatedMinutes: 0,
      riskLevel: 'low' as const,
      affectedFiles: [],
      dependencies: ['phase3-select-target'],
      breakingChanges: [],
    },
    {
      id: 'phase3-execute-migration',
      name: 'Execute Code Migration',
      description: 'Run the automated code transformation engine to migrate your codebase',
      type: 'automated' as const,
      estimatedMinutes: 120,
      automatedMinutes: 120,
      riskLevel: 'high' as const,
      affectedFiles: ['**/*.{js,jsx,ts,tsx,vue,py}'],
      dependencies: ['phase3-configure-options'],
      breakingChanges: [
        'File structure will be reorganized',
        'Import statements will be updated',
        'Component syntax may change',
        'Routing configuration will be transformed',
      ],
    },
  ]

  return {
    id: 'phase-3-code-migration',
    name: 'Migration: Code Migration',
    description: `Transform your ${framework} codebase to a modern framework with AI-powered migration`,
    order: 3,
    tasks,
    totalEstimatedMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
    totalAutomatedMinutes: tasks.reduce((sum, t) => sum + t.automatedMinutes, 0),
    riskLevel: 'high' as const,
    canRunInParallel: false,
  }
}

// Helper function to check if Phase 3 should be shown
function shouldShowPhase3(plan: MigrationPlan): boolean {
  // Show Phase 3 if there are at least 2 phases (Phase 1 and Phase 2)
  // This ensures dependencies and documentation phases are present
  return plan.phases.length >= 2
}

export function MigrationPlanView({
  plan,
  repositoryName,
  repositoryOwner,
  onStartTransformation,
  onExecuteTask
}: MigrationPlanViewProps) {
  // Generate Phase 3 dynamically if conditions are met
  const planWithPhase3 = useMemo(() => {
    if (shouldShowPhase3(plan)) {
      const phase3 = generatePhase3(plan.sourceStack)

      // Check if Phase 3 already exists
      const hasPhase3 = plan.phases.some(p => p.id === 'phase-3-code-migration')

      if (!hasPhase3) {
        return {
          ...plan,
          phases: [...plan.phases, phase3],
        }
      }
    }
    return plan
  }, [plan])

  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set([planWithPhase3.phases[0]?.id]))
  const [enabledTransformations, setEnabledTransformations] = useState<Set<string>>(
    new Set(planWithPhase3.phases.flatMap(p => p.tasks.map(t => t.id)))
  )
  const [transformationFlow, setTransformationFlow] = useState<TransformationFlowState>({ stage: 'idle' })
  const [acceptedFiles, setAcceptedFiles] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use a ref to preserve the orchestration result object across re-renders
  // This ensures that the same object reference is maintained, preventing unnecessary memo rebuilds
  const orchestrationResultRef = useRef<OrchestrationResult | null>(null)


  // Reset acceptedFiles when new transformation results arrive (only on jobId change)
  const [lastJobId, setLastJobId] = useState<string | null>(null)

  useEffect(() => {
    if (transformationFlow.stage === 'results') {
      const currentJobId = (transformationFlow as any).result?.jobId
      if (currentJobId && currentJobId !== lastJobId) {
        console.log('[MigrationPlanView] New job detected, resetting acceptedFiles. Old:', lastJobId, 'New:', currentJobId)
        setAcceptedFiles(new Set())
        setLastJobId(currentJobId)
      }
    }
  }, [transformationFlow.stage, transformationFlow.stage === 'results' ? (transformationFlow as any).result?.jobId : null, lastJobId])
  const [applySuccess, setApplySuccess] = useState<{ prUrl: string; prNumber: number } | null>(null)
  const [showTransformationSuccessModal, setShowTransformationSuccessModal] = useState(false)
  const { shouldShow } = useSuccessModal()

  // Show success modal when transformation is applied successfully
  useEffect(() => {
    if (applySuccess && shouldShow('transformation') && !showTransformationSuccessModal) {
      setShowTransformationSuccessModal(true)
    }
  }, [applySuccess, shouldShow, showTransformationSuccessModal])

  console.log('[ENABLED_TRANSFORMATION]', enabledTransformations)

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const toggleTransformation = (taskId: string) => {
    setEnabledTransformations(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleStartTransformation = async () => {
    if (enabledTransformations.size === 0) {
      setError('Please select at least one task to transform')
      return
    }

    // Extract repository owner and name from repositoryName
    // Format could be "owner/repo" or just "repo"
    const parts = repositoryName.split('/')
    const owner = repositoryOwner || parts[0]
    const name = parts.length > 1 ? parts[1] : parts[0]

    setIsLoading(true)
    setError(null)

    try {
      // Convert planner MigrationPlan to transformer MigrationPlan format
      const transformerPlan: any = {
        id: planWithPhase3.id,
        sourceStack: planWithPhase3.sourceStack,
        targetStack: planWithPhase3.targetStack,
        phases: planWithPhase3.phases.map(phase => ({
          ...phase,
          tasks: phase.tasks.map(task => {
            // Infer category from task name/description if pattern is missing
            const inferCategory = (): 'dependency' | 'structural' | 'component' | 'documentation' => {
              const name = task.name.toLowerCase()
              const desc = task.description.toLowerCase()

              if (name.includes('depend') || name.includes('package') || desc.includes('depend')) {
                return 'dependency'
              }
              if (name.includes('doc') || name.includes('readme') || name.includes('changelog') || desc.includes('documentation')) {
                return 'documentation'
              }
              if (name.includes('component') || desc.includes('component')) {
                return 'component'
              }
              return 'structural'
            }

            return {
              ...task,
              pattern: task.pattern || {
                id: task.id,
                name: task.name,
                category: inferCategory(),
                severity: task.riskLevel,
                occurrences: 1,
                affectedFiles: task.affectedFiles,
                description: task.description,
                automated: task.type === 'automated',
              },
            }
          }),
        })),
        summary: planWithPhase3.summary,
        dependencyGraph: planWithPhase3.dependencyGraph,
        customization: planWithPhase3.customization,
        createdAt: planWithPhase3.createdAt instanceof Date ? planWithPhase3.createdAt.toISOString() : planWithPhase3.createdAt,
        aiInsights: isEnhancedPlan(planWithPhase3) ? planWithPhase3.aiInsights : {
          recommendations: [],
          warnings: [],
          estimatedComplexity: 'medium' as const,
          suggestedApproach: '',
        },
        aiMetadata: isEnhancedPlan(planWithPhase3) ? planWithPhase3.aiMetadata : {
          model: 'unknown',
          timestamp: new Date().toISOString(),
          tokensUsed: 0,
          confidence: 0,
        },
      }

      // Filter out Phase 3 tasks (migration tasks) - only include transformation tasks
      const transformationTaskIds = Array.from(enabledTransformations).filter(taskId =>
        !taskId.startsWith('phase3-') && !taskId.includes('migration')
      )

      if (transformationTaskIds.length === 0) {
        setError('No transformation tasks selected. Phase 3 migration tasks cannot be run through transformations.')
        setIsLoading(false)
        return
      }

      const request: TransformationRequest = {
        repository: {
          owner,
          name,
        },
        selectedTaskIds: transformationTaskIds,
        migrationPlan: transformerPlan,
        options: {
          preserveFormatting: true,
          skipTests: false,
        },
      }

      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.jobId) {
        setTransformationFlow({ stage: 'processing', jobId: data.jobId })
        onStartTransformation?.()
      } else {
        throw new Error('No job ID returned from server')
      }
    } catch (err) {
      console.error('Failed to start transformation:', err)
      setError(err instanceof Error ? err.message : 'Failed to start transformation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTransformationComplete = (result: any) => {
    if (result && result.success !== undefined) {
      console.log('[MigrationPlanView] ===== TRANSFORMATION COMPLETE =====')
      console.log('[MigrationPlanView] Raw result.transformedFiles:', result.transformedFiles)
      console.log('[MigrationPlanView] Raw result.results length:', result.results?.length)

      // Build transformedFiles Map from results if it's empty
      let transformedFiles: Map<string, string>

      if (result.transformedFiles instanceof Map) {
        transformedFiles = result.transformedFiles
      } else if (result.transformedFiles && Object.keys(result.transformedFiles).length > 0) {
        transformedFiles = new Map(Object.entries(result.transformedFiles))
      } else {
        // transformedFiles is empty, build it from results array
        console.log('[MigrationPlanView] Building transformedFiles from results array')
        transformedFiles = new Map()

        if (result.results && Array.isArray(result.results)) {
          result.results.forEach((taskResult: any) => {
            if (taskResult.success && taskResult.filePath && taskResult.result?.code) {
              transformedFiles.set(taskResult.filePath, taskResult.result.code)
              console.log('[MigrationPlanView] Added file:', taskResult.filePath)
            }
          })
        }
      }

      console.log('[MigrationPlanView] Final transformedFiles size:', transformedFiles.size)
      console.log('[MigrationPlanView] Final transformedFiles keys:', Array.from(transformedFiles.keys()))

      const orchestrationResult: OrchestrationResult = {
        jobId: result.jobId || (transformationFlow.stage === 'processing' ? transformationFlow.jobId : ''),
        success: result.success,
        transformedFiles,
        results: result.results || [],
        summary: result.summary,
      }

      // Store in ref to maintain the same object reference
      orchestrationResultRef.current = orchestrationResult

      console.log('[MigrationPlanView] Stored in ref, transformedFiles size:', orchestrationResultRef.current.transformedFiles.size)

      // Reset accepted files when new results arrive
      setAcceptedFiles(new Set())
      setTransformationFlow({ stage: 'results', result: orchestrationResult })
    } else {
      setError('Transformation failed. Please check the logs for details.')
      setTransformationFlow({ stage: 'idle' })
    }
  }

  const handleAcceptChanges = async () => {
    if (transformationFlow.stage !== 'results') return

    const result = transformationFlow.result

    console.log('[MigrationPlanView] handleAcceptChanges called')
    console.log('[MigrationPlanView] result.transformedFiles type:', typeof result.transformedFiles)
    console.log('[MigrationPlanView] result.transformedFiles:', result.transformedFiles)
    console.log('[MigrationPlanView] Is Map?', result.transformedFiles instanceof Map)

    // Prepare transformations for ONLY accepted files
    const transformations: Record<string, any> = {}
    const acceptedFilesArray: string[] = []

    console.log('[MigrationPlanView] Accepted files from state:', Array.from(acceptedFiles))

    // Handle both Map and object formats, but only for accepted files
    if (result.transformedFiles instanceof Map) {
      console.log('[MigrationPlanView] Processing as Map, size:', result.transformedFiles.size)
      result.transformedFiles.forEach((code, filePath) => {
        // Only include files that have been explicitly accepted
        if (acceptedFiles.has(filePath)) {
          console.log('[MigrationPlanView] Adding accepted file:', filePath)
          acceptedFilesArray.push(filePath)
          transformations[filePath] = {
            originalCode: '',
            transformedCode: code,
            confidence: 100,
            changes: [],
            warnings: [],
          }
        }
      })
    } else if (typeof result.transformedFiles === 'object') {
      console.log('[MigrationPlanView] Processing object')
      Object.entries(result.transformedFiles).forEach(([filePath, code]) => {
        // Only include files that have been explicitly accepted
        if (acceptedFiles.has(filePath)) {
          acceptedFilesArray.push(filePath)
          transformations[filePath] = {
            originalCode: '',
            transformedCode: code as string,
            confidence: 100,
            changes: [],
            warnings: [],
          }
        }
      })
    }

    console.log('[MigrationPlanView] acceptedFilesArray:', acceptedFilesArray)
    console.log('[MigrationPlanView] acceptedFilesArray count:', acceptedFilesArray.length)

    if (acceptedFilesArray.length === 0) {
      setError('No files accepted. Please view and accept files before applying to GitHub.')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Call the apply API
      const response = await fetch('/api/github/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: {
            owner: repositoryName.split('/')[0],
            name: repositoryName.split('/')[1],
          },
          migrationJobId: result.jobId,
          acceptedFiles: acceptedFilesArray,
          transformations,
          migrationSpec: {
            sourceFramework: {
              name: 'Legacy',
              version: '1.0.0',
            },
            targetFramework: {
              name: 'Modern',
              version: '2.0.0',
            },
            options: {},
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle synchronous response
      if (data.status === 'success' || data.status === 'partial') {
        // Set success state with PR info
        setApplySuccess({
          prUrl: data.pullRequest?.htmlUrl || data.pullRequest?.url || '',
          prNumber: data.pullRequest?.number || 0,
        })
        setError(null)
        console.log('[MigrationPlanView] Apply successful, PR:', data.pullRequest?.htmlUrl)
        
        // Record transformation statistics
        recordTransformation({
          repositoryFullName: repositoryName,
          tasksCompleted: acceptedFilesArray.length,
          filesTransformed: acceptedFilesArray.length,
          status: data.status === 'success' ? 'success' : 'partial',
        })
        
        // Dispatch custom event to update stats in dashboard
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('revivehub-stats-updated'))
        }
      } else {
        throw new Error(data.message || 'Failed to apply changes')
      }
    } catch (err) {
      console.error('Failed to apply changes:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply changes to GitHub')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRejectChanges = () => {
    if (confirm('Are you sure you want to reject all changes?')) {
      setTransformationFlow({ stage: 'idle' })
    }
  }

  const handleViewDiff = (filePath: string) => {
    if (transformationFlow.stage === 'results') {
      // Use the ref to ensure we're using the same result object
      const currentResult = orchestrationResultRef.current || transformationFlow.result
      setTransformationFlow({
        stage: 'viewing-diff',
        result: currentResult,
        filePath
      })
    }
  }

  const handleCloseDiff = () => {
    if (transformationFlow.stage === 'viewing-diff') {
      // Use the ref to ensure we're using the same result object
      const currentResult = orchestrationResultRef.current || transformationFlow.result
      setTransformationFlow({
        stage: 'results',
        result: currentResult
      })
    }
  }

  const handleCloseTaskSelector = () => {
    setTransformationFlow({ stage: 'idle' })
  }

  const totalTasks = planWithPhase3.phases.reduce((sum, phase) => sum + phase.tasks.length, 0)
  const automatedTasks = planWithPhase3.phases.reduce(
    (sum, phase) => sum + phase.tasks.filter(t => t.type === 'automated').length,
    0
  )
  const automationPercentage = Math.round((automatedTasks / totalTasks) * 100)

  const totalEstimatedMinutes = planWithPhase3.phases.reduce((sum, phase) => sum + phase.totalEstimatedMinutes, 0)
  const hours = Math.floor(totalEstimatedMinutes / 60)
  const minutes = totalEstimatedMinutes % 60

  const highRiskCount = planWithPhase3.phases.reduce(
    (sum, phase) => sum + phase.tasks.filter(t => t.riskLevel === 'high').length,
    0
  )

  const enhancedPlan = isEnhancedPlan(planWithPhase3) ? planWithPhase3 : null

  // Get diff for viewing
  const getDiffForFile = (filePath: string): any | undefined => {
    if (transformationFlow.stage !== 'viewing-diff' && transformationFlow.stage !== 'results') {
      return undefined
    }

    const result = transformationFlow.stage === 'viewing-diff'
      ? transformationFlow.result
      : transformationFlow.result

    const taskResult = result.results.find(r => r.filePath === filePath)
    return taskResult?.result?.diff
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Transformation Success Modal */}
      <SuccessModal
        isOpen={showTransformationSuccessModal}
        onClose={() => {
          setShowTransformationSuccessModal(false)
          setApplySuccess(null)
          setTransformationFlow({ stage: 'idle' })
        }}
        title="Transformation Applied!"
        message="Your code transformation has been successfully applied to GitHub. A pull request has been created with all your accepted changes."
        pullRequestUrl={applySuccess?.prUrl}
        pullRequestNumber={applySuccess?.prNumber}
        type="transformation"
        showViewPullRequest={true}
      />

      {/* Task Selector Modal */}
      {transformationFlow.stage === 'selecting' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-purple-500/20">
            {/* Spooky glow effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex items-center justify-between p-6 border-b border-purple-500/20">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Select Tasks to Transform
              </h2>
              <button
                onClick={handleCloseTaskSelector}
                className="text-purple-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
              <TaskSelector
                migrationPlan={planWithPhase3 as any}
                selectedTaskIds={enabledTransformations}
                onSelectionChange={setEnabledTransformations}
              />
            </div>
            <div className="relative z-10 flex items-center justify-end gap-3 p-6 border-t border-purple-500/20 bg-gradient-to-r from-purple-900/40 to-orange-900/40">
              <button
                onClick={handleCloseTaskSelector}
                className="px-6 py-2 rounded-lg font-medium text-purple-200 bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleCloseTaskSelector()
                  handleStartTransformation()
                }}
                disabled={enabledTransformations.size === 0 || isLoading}
                className={cn(
                  'px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2',
                  enabledTransformations.size === 0 || isLoading
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-orange-600 text-white hover:from-purple-500 hover:to-orange-500 hover:shadow-lg hover:shadow-purple-500/30'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  `Start Transformation (${enabledTransformations.size} tasks)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transformation Progress Modal */}
      {transformationFlow.stage === 'processing' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-purple-500/20">
            {/* Spooky glow effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex items-center justify-between p-6 border-b border-purple-500/20">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                Transformation in Progress
              </h2>
            </div>
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                <TransformationProgress
                  jobId={transformationFlow.jobId}
                  onComplete={handleTransformationComplete}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transformation Results Modal */}
      {transformationFlow.stage === 'results' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-purple-500/20">
            {/* Spooky glow effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex items-center justify-between p-6 border-b border-purple-500/20">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
                Transformation Results
              </h2>
              <button
                onClick={() => setTransformationFlow({ stage: 'idle' })}
                className="text-purple-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                <TransformationResults
                  result={transformationFlow.result}
                  onAccept={handleAcceptChanges}
                  onReject={handleRejectChanges}
                  onViewDiff={handleViewDiff}
                  isApplying={isLoading}
                  acceptedFiles={acceptedFiles}
                  applySuccess={applySuccess}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {transformationFlow.stage === 'viewing-diff' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-purple-500/20">
            {/* Spooky glow effects */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex items-center justify-between p-6 border-b border-purple-500/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Viewing Diff: {transformationFlow.filePath}
              </h2>
              <button
                onClick={handleCloseDiff}
                className="text-purple-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                {getDiffForFile(transformationFlow.filePath) ? (
                  <EditableDiffViewer
                    diff={getDiffForFile(transformationFlow.filePath)!}
                    filePath={transformationFlow.filePath}
                    onAccept={(modifiedContent) => {
                      if (transformationFlow.stage === 'viewing-diff') {
                        const currentFilePath = transformationFlow.filePath

                        console.log('[MigrationPlanView] ===== ACCEPTING FILE =====')
                        console.log('[MigrationPlanView] File path:', currentFilePath)
                        console.log('[MigrationPlanView] Ref transformedFiles size:', orchestrationResultRef.current?.transformedFiles.size)
                        console.log('[MigrationPlanView] Flow transformedFiles size:', transformationFlow.result.transformedFiles.size)

                        // CRITICAL: Always mutate the ORIGINAL result object from the flow
                        // Don't use the ref if it has an empty Map
                        const currentResult = transformationFlow.result

                        console.log('[MigrationPlanView] Using result with size:', currentResult.transformedFiles.size)
                        console.log('[MigrationPlanView] All files before accept:', Array.from(currentResult.transformedFiles.keys()))

                        // Update with modified content if provided (mutate the existing Map)
                        if (modifiedContent) {
                          currentResult.transformedFiles.set(currentFilePath, modifiedContent)
                          console.log('[MigrationPlanView] Updated file with modified content')
                        }

                        console.log('[MigrationPlanView] All files after accept:', Array.from(currentResult.transformedFiles.keys()))

                        // Mark file as accepted
                        setAcceptedFiles(prev => {
                          const newSet = new Set(prev)
                          newSet.add(currentFilePath)
                          console.log('[MigrationPlanView] Accepted files count:', newSet.size)
                          return newSet
                        })

                        // Pass back the same result object
                        setTransformationFlow({
                          stage: 'results',
                          result: currentResult
                        })
                        console.log('[MigrationPlanView] ===== ACCEPT COMPLETE =====')
                      } else {
                        handleCloseDiff()
                      }
                    }}
                    onReject={() => {
                      alert('File changes rejected')
                      handleCloseDiff()
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-purple-300">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    No diff available for this file
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header Stats */}
      <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-slate-900 backdrop-blur-sm">
        {/* Spooky glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white break-words flex items-center gap-2">
                <span className="text-2xl">🔮</span>
                Migration Plan: {repositoryName}
              </h2>
              <p className="text-sm text-purple-200 mt-1">
                Automated transformation plan with {planWithPhase3.phases.length} phases and {totalTasks} tasks
              </p>
            </div>
            {enhancedPlan && (
              <div className="flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-900/30 px-3 py-1.5 shrink-0">
                <span className="text-lg">✨</span>
                <span className="text-xs sm:text-sm text-purple-200">
                  AI Enhanced ({enhancedPlan.aiMetadata.confidenceScore}% confidence)
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="group relative overflow-hidden flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-purple-900/60 to-purple-800/60 rounded-lg border border-purple-500/20 transition-all hover:border-purple-500/40 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-300 shrink-0 relative z-10" />
              <div className="min-w-0 relative z-10">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {hours}h {minutes}m
                </div>
                <div className="text-xs sm:text-sm text-purple-200">Estimated Time</div>
              </div>
            </div>

            <div className="group relative overflow-hidden flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-orange-900/60 to-orange-800/60 rounded-lg border border-orange-500/20 transition-all hover:border-orange-500/40 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-orange-300 shrink-0 relative z-10" />
              <div className="min-w-0 relative z-10">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {automationPercentage}%
                </div>
                <div className="text-xs sm:text-sm text-orange-200">Automated</div>
              </div>
            </div>

            <div className="group relative overflow-hidden flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-purple-900/60 to-violet-900/60 rounded-lg border border-purple-500/20 transition-all hover:border-purple-500/40 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-300 shrink-0 relative z-10" />
              <div className="min-w-0 relative z-10">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {totalTasks}
                </div>
                <div className="text-xs sm:text-sm text-purple-200">Total Tasks</div>
              </div>
            </div>

            <div className="group relative overflow-hidden flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-br from-orange-900/60 to-red-900/60 rounded-lg border border-orange-500/20 transition-all hover:border-orange-500/40 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-300 shrink-0 relative z-10" />
              <div className="min-w-0 relative z-10">
                <div className="text-xl sm:text-2xl font-bold text-white">
                  {highRiskCount}
                </div>
                <div className="text-xs sm:text-sm text-orange-200">High Risk</div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Timeline */}
      {/* <PhaseTimeline phases={planWithPhase3.phases} expandedPhases={expandedPhases} onTogglePhase={togglePhase} /> */}

      {/* Transformation Phases Section */}
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-900/20 to-slate-900 p-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
              <span className="text-xl">🔄</span>
              Transformations (Phase 1 & 2)
            </h3>
            <p className="text-sm text-blue-200">
              Update dependencies and documentation. These transformations prepare your codebase for migration.
            </p>
          </div>
        </div>

        {planWithPhase3.phases
          .filter((phase) => phase.id !== 'phase-3-code-migration')
          .map((phase) => (
            <div key={phase.id} className="space-y-3">
              <PhaseDetails
                phase={phase}
                isExpanded={expandedPhases.has(phase.id)}
                onToggle={() => togglePhase(phase.id)}
                enabledTransformations={enabledTransformations}
                onToggleTransformation={toggleTransformation}
                onExecuteTask={onExecuteTask}
              />
            </div>
          ))}

        {/* Transformation Action Button */}
        <div className="relative overflow-hidden rounded-lg border border-blue-500/20 bg-gradient-to-br from-blue-900/40 to-slate-900 p-4 sm:p-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <span className="text-xl">🔄</span>
                Ready to Run Transformations?
              </h3>
              <p className="text-xs sm:text-sm text-blue-200">
                {Array.from(enabledTransformations).filter(taskId => !taskId.startsWith('phase3-')).length} of {planWithPhase3.phases.filter(p => p.id !== 'phase-3-code-migration').flatMap(p => p.tasks).length} transformations enabled
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={handleStartTransformation}
                disabled={enabledTransformations.size === 0 || isLoading}
                className={cn(
                  'w-full sm:w-auto px-6 sm:px-8 py-3 rounded-lg font-medium text-sm sm:text-base transition-all',
                  enabledTransformations.size === 0 || isLoading
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105'
                )}
              >
                {isLoading ? 'Starting...' : 'Start Transformations'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Migration Phase Section */}
      {planWithPhase3.phases.some((phase) => phase.id === 'phase-3-code-migration') && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-slate-900 p-4">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-2">
                <span className="text-xl">🚀</span>
                Code Migration (Independent Flow)
              </h3>
              <p className="text-sm text-purple-200">
                Transform your entire codebase to a modern framework. This is a separate, independent process from transformations above.
              </p>
            </div>
          </div>

          {planWithPhase3.phases
            .filter((phase) => phase.id === 'phase-3-code-migration')
            .map((phase) => (
              <Phase3Card
                key={phase.id}
                sourceStack={planWithPhase3.sourceStack}
                repositoryName={repositoryName}
                repositoryOwner={repositoryOwner || ''}
                isExpanded={expandedPhases.has(phase.id)}
                onToggle={() => togglePhase(phase.id)}
              />
            ))}
        </div>
      )}


    </div>
  )
}
