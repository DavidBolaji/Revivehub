'use client'

import { useState, lazy, Suspense, useEffect } from 'react'
import { ChevronDown, ChevronRight, Code2, Zap, FileCode, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { SourceStack, TargetSelection, MigrationConfig, MigrationSpecification } from '@/types/migration'
import { TargetFrameworkSelector } from './TargetFrameworkSelector'
import { FrameworkOptionsForm } from './FrameworkOptionsForm'
import { MigrationConfigReview } from './MigrationConfigReview'
import type { Phase3OrchestrationResult } from '@/types/migration'
import { SuccessModal, useSuccessModal } from '@/components/ui/success-modal'

// Lazy load heavy components
const MigrationProgressModal = lazy(() => import('./MigrationProgressModal').then(m => ({ default: m.MigrationProgressModal })))
const MigrationResultsSummary = lazy(() => import('./MigrationResultsSummary').then(m => ({ default: m.MigrationResultsSummary })))
const CodeMigrationDiffViewer = lazy(() => import('./CodeMigrationDiffViewer').then(m => ({ default: m.CodeMigrationDiffViewer })))
const ApplyChangesModal = lazy(() => import('../github/ApplyChangesModal').then(m => ({ default: m.ApplyChangesModal })))

interface Phase3CardProps {
  sourceStack: SourceStack
  onMigrationStart?: (config: MigrationConfig) => void
  repositoryName: string
  repositoryOwner: string
  isExpanded?: boolean
  onToggle?: () => void
}

type Phase3Step = 'select-target' | 'configure-options' | 'review-config' | 'migrating' | 'view-results'

export function Phase3Card({
  sourceStack,
  onMigrationStart,
  repositoryName,
  repositoryOwner,
  isExpanded = false,
  onToggle,
}: Phase3CardProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded)
  const [currentStep, setCurrentStep] = useState<Phase3Step>('select-target')
  const [selectedTarget, setSelectedTarget] = useState<TargetSelection | null>(null)
  const [frameworkOptions, setFrameworkOptions] = useState<any>({})
  const [migrationSpec, setMigrationSpec] = useState<MigrationSpecification | null>(null)
  const [migrationJobId, setMigrationJobId] = useState<string | null>(null)
  const [migrationResult, setMigrationResult] = useState<Phase3OrchestrationResult | null>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [viewingFilePath, setViewingFilePath] = useState<string | null>(null)
  const [acceptedFiles, setAcceptedFiles] = useState<Set<string>>(new Set())
  const [rejectedFiles, setRejectedFiles] = useState<Set<string>>(new Set())
  
  // File navigation state
  const allFiles = migrationResult?.transformations instanceof Map
    ? Array.from(migrationResult.transformations.keys())
    : migrationResult?.transformations ? Object.keys(migrationResult.transformations as any) : []
  
  const currentFileIndex = viewingFilePath ? allFiles.indexOf(viewingFilePath) : -1
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [applyOperationId, setApplyOperationId] = useState<string | null>(null)
  const [showApplyProgressModal, setShowApplyProgressModal] = useState(false)
  const [applyResult, setApplyResult] = useState<any>(null)
  const [showRollbackConfirmation, setShowRollbackConfirmation] = useState(false)
  const [isRollingBack, setIsRollingBack] = useState(false)
  const [rollbackError, setRollbackError] = useState<string | null>(null)
  const [rollbackSuccess, setRollbackSuccess] = useState(false)
  const [showMigrationSuccessModal, setShowMigrationSuccessModal] = useState(false)
  const [hasShownMigrationSuccessModal, setHasShownMigrationSuccessModal] = useState(false)
  const { shouldShow } = useSuccessModal()

  // Show success modal when migration is applied successfully (only once)
  useEffect(() => {
    if (applyResult && applyResult.pullRequest?.htmlUrl && shouldShow('migration') && !hasShownMigrationSuccessModal) {
      setShowMigrationSuccessModal(true)
      setHasShownMigrationSuccessModal(true)
    }
  }, [applyResult, shouldShow, hasShownMigrationSuccessModal])

  const expanded = onToggle ? isExpanded : localExpanded
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setLocalExpanded(!localExpanded)
    }
  }

  // Generate dynamic title based on source framework
  const getPhaseTitle = () => {
    const framework = sourceStack.framework || 'Application'
    return `Migrate ${framework} Code`
  }

  // Get framework icon/emoji
  const getFrameworkIcon = () => {
    const framework = sourceStack.framework?.toLowerCase() || ''
    if (framework.includes('react')) return '⚛️'
    if (framework.includes('vue')) return '💚'
    if (framework.includes('angular')) return '🅰️'
    if (framework.includes('next')) return '▲'
    if (framework.includes('flask')) return '🐍'
    if (framework.includes('django')) return '🎸'
    if (framework.includes('express')) return '🚂'
    return '🔄'
  }

  // Handle target framework selection
  const handleTargetSelect = (target: TargetSelection) => {
    setSelectedTarget(target)
    setCurrentStep('configure-options')
  }

  // Handle options change
  const handleOptionsChange = (options: any) => {
    setFrameworkOptions(options)
  }

  // Handle continue to review
  const handleContinueToReview = () => {
    // Generate migration spec from selections
    // This would normally call an API endpoint
    // For now, create a basic spec structure
    
    const targetLanguage = selectedTarget?.framework.toLowerCase().includes('next') ? 'typescript' : sourceStack.language || 'javascript'
    
    console.log('[Phase3Card] Creating migration spec')
    console.log('[Phase3Card] - Selected target framework:', selectedTarget?.framework)
    console.log('[Phase3Card] - Target language:', targetLanguage)
    
    const spec: MigrationSpecification = {
      source: {
        language: sourceStack.language || 'javascript',
        framework: sourceStack.framework || '',
        version: sourceStack.version || '',
        routing: '',
        patterns: {},
        buildTool: '',
        packageManager: 'pnpm',
      },
      target: {
        language: targetLanguage,
        framework: selectedTarget?.framework || '',
        version: selectedTarget?.version || '',
        routing: frameworkOptions.router || 'app',
        fileStructure: {
          pages: 'app',
          components: 'components',
          layouts: 'app/layouts',
          api: 'app/api',
        },
        componentConventions: {
          fileExtension: '.tsx',
          namingConvention: 'PascalCase',
          exportStyle: 'named',
          serverComponents: true,
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {},
        buildTool: 'turbopack',
        packageManager: 'pnpm',
      },
      mappings: {
        imports: {},
        routing: {},
        components: {},
        styling: {},
        stateManagement: {},
        buildSystem: {},
      },
      rules: {
        mustPreserve: ['Business logic', 'Component behavior'],
        mustTransform: ['Import statements', 'Routing configuration'],
        mustRemove: [],
        mustRefactor: [],
        breakingChanges: [],
        deprecations: [],
      },
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        estimatedComplexity: 'medium',
        estimatedDuration: '2-4 hours',
      },
    }
    
    setMigrationSpec(spec)
    setCurrentStep('review-config')
  }

  // Handle start migration
  const handleStartMigration = async () => {
    if (!migrationSpec || !selectedTarget) return

    setIsStarting(true)
    setError(null)


    try {
      // Call the API to start migration
      const response = await fetch('/api/migration/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: {
            owner: repositoryName.split('/')[0],
            name: repositoryName.split('/')[1],
          },
          migrationSpec,
          options: {
            batchSize: 20,
            parallelism: 5,
            skipTests: false,
            dryRun: false,
            createBackups: true,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.jobId) {
        setMigrationJobId(data.jobId)
        setShowProgressModal(true)
        setCurrentStep('migrating')
        
        const config: MigrationConfig = {
          targetFramework: selectedTarget.framework,
          targetVersion: selectedTarget.version,
          options: frameworkOptions,
          migrationSpec,
        }
        onMigrationStart?.(config)
      } else {
        throw new Error('No job ID returned from server')
      }
    } catch (err) {
      console.error('Failed to start migration:', err)
      setError(err instanceof Error ? err.message : 'Failed to start migration')
    } finally {
      setIsStarting(false)
    }
  }

  // Handle migration complete
  const handleMigrationComplete = (result: any) => {
    setShowProgressModal(false)
    setMigrationResult(result)
    setCurrentStep('view-results')
  }

  // Handle close progress modal
  const handleCloseProgressModal = () => {
    setShowProgressModal(false)
    setCurrentStep('review-config')
  }

  // Handle view file diff
  const handleViewFile = (filePath: string) => {
    setViewingFilePath(filePath)
  }

  // Handle close diff viewer
  const handleCloseDiffViewer = () => {
    setViewingFilePath(null)
  }

  // Handle accept file with optional modified content
  const handleAcceptFile = (filePath: string, modifiedContent?: string, callback?: () => void) => {
    console.log(`[Phase3Card] handleAcceptFile called for ${filePath}`)
    console.log(`[Phase3Card] modifiedContent provided:`, !!modifiedContent)
    if (modifiedContent) {
      console.log(`[Phase3Card] Modified content preview:`, modifiedContent.substring(0, 200))
    }
    
    setAcceptedFiles((prev) => new Set(prev).add(filePath))
    setRejectedFiles((prev) => {
      const next = new Set(prev)
      next.delete(filePath)
      return next
    })
    
    // If content was modified, update it in the migration result
    if (modifiedContent && migrationResult) {
      console.log(`[Phase3Card] Updating migration result with edited content`)
      console.log(`[Phase3Card] Modified content length:`, modifiedContent.length)
      
      setMigrationResult((prevResult: any) => {
        if (!prevResult) return prevResult
        
        // Update the transformations Map
        // Handle both Map and plain object (from JSON deserialization)
        const updatedTransformations = prevResult.transformations instanceof Map
          ? new Map(prevResult.transformations)
          : new Map(Object.entries(prevResult.transformations as any))
        const existingTransform = updatedTransformations.get(filePath)
        
        if (existingTransform) {
          console.log(`[Phase3Card] Found existing transform, updating code`)
          console.log(`[Phase3Card] Old code length:`, (existingTransform as any).code?.length || 0)
          console.log(`[Phase3Card] New code length:`, modifiedContent.length)
          console.log(`[Phase3Card] Old code preview:`, (existingTransform as any).code?.substring(0, 100) || '')
          console.log(`[Phase3Card] New code preview:`, modifiedContent.substring(0, 100))
          
          updatedTransformations.set(filePath, {
            ...existingTransform,
            code: modifiedContent, // This is the edited content
          } as any)
          
          console.log(`[Phase3Card] ✅ Transform updated in Map`)
        } else {
          console.warn(`[Phase3Card] ⚠️ No existing transform found for ${filePath}`)
        }
        
        const newResult = {
          ...prevResult,
          transformations: updatedTransformations,
        }
        
        console.log(`[Phase3Card] ✅ New migration result created`)
        
        // Call callback after state update
        if (callback) {
          setTimeout(callback, 0)
        }
        
        return newResult
      })
      
      console.log(`[Phase3Card] ✅ setMigrationResult called for ${filePath}`)
    } else {
      console.log(`[Phase3Card] No modified content provided, accepting original transformation`)
      if (callback) {
        callback()
      }
    }
  }

  // Handle reject file
  const handleRejectFile = (filePath: string) => {
    setRejectedFiles((prev) => new Set(prev).add(filePath))
    setAcceptedFiles((prev) => {
      const next = new Set(prev)
      next.delete(filePath)
      return next
    })
  }

  // Handle accept all
  const handleAcceptAll = () => {
    if (!migrationResult) return
    const allFiles = migrationResult.transformations instanceof Map
      ? Array.from(migrationResult.transformations.keys())
      : Object.keys(migrationResult.transformations)
    setAcceptedFiles(new Set(allFiles))
    setRejectedFiles(new Set())
  }

  // Handle reject all
  const handleRejectAll = () => {
    if (!migrationResult) return
    const allFiles = migrationResult.transformations instanceof Map
      ? Array.from(migrationResult.transformations.keys())
      : Object.keys(migrationResult.transformations)
    setRejectedFiles(new Set(allFiles))
    setAcceptedFiles(new Set())
  }

  // Handle apply changes to GitHub
  const handleApplyChanges = async () => {
    if (!migrationResult || !migrationSpec || acceptedFiles.size === 0) return

    setIsApplying(true)
    setError(null)

    try {
      // Prepare transformations for accepted files only
      const acceptedTransformations: Record<string, any> = {}
      
      acceptedFiles.forEach((filePath) => {
        const transform = migrationResult.transformations instanceof Map
          ? migrationResult.transformations.get(filePath)
          : (migrationResult.transformations as any)[filePath]
        
        if (transform) {
          acceptedTransformations[filePath] = {
            originalCode: transform.originalCode || '',
            transformedCode: transform.code,
            confidence: transform.confidence,
            changes: transform.metadata?.notes || [],
            warnings: transform.warnings || [],
          }
        }
      })

      console.log(['APPLY CODE'],JSON.stringify({
          repository: {
            owner: repositoryName.split('/')[0],
            name: repositoryName.split('/')[1],
          },
          migrationJobId: migrationJobId || 'unknown',
          acceptedFiles: Array.from(acceptedFiles),
          transformations: acceptedTransformations,
          migrationSpec: {
            sourceFramework: {
              name: migrationSpec.source.framework,
              version: migrationSpec.source.version,
            },
            targetFramework: {
              name: migrationSpec.target.framework,
              version: migrationSpec.target.version,
            },
            options: frameworkOptions,
          },
        }))
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
          migrationJobId: migrationJobId || 'unknown',
          acceptedFiles: Array.from(acceptedFiles),
          transformations: acceptedTransformations,
          migrationSpec: {
            sourceFramework: {
              name: migrationSpec.source.framework,
              version: migrationSpec.source.version,
            },
            targetFramework: {
              name: migrationSpec.target.framework,
              version: migrationSpec.target.version,
            },
            options: frameworkOptions,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Handle synchronous response (SSE doesn't work in Next.js serverless)
      if (data.status === 'success' || data.status === 'partial') {
        // Operation completed successfully
        setApplyResult(data)
        console.log('PR created:', data.pullRequest?.url)
        console.log('Migration URL:', data.migrationUrl)
        
        // Note: Migration details are automatically stored by the GitHub Apply API
        // No need to store again here to avoid duplicate storage
      } else {
        // Operation failed
        throw new Error(data.message || 'Failed to apply changes')
      }
    } catch (err) {
      console.error('Failed to apply changes:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply changes to GitHub')
    } finally {
      setIsApplying(false)
    }
  }

  // Handle apply complete
  const handleApplyComplete = (result: any) => {
    setShowApplyProgressModal(false)
    setApplyResult(result)
    // Show success message with PR URL
    if (result.pullRequest?.htmlUrl) {
      // Could show a success modal or notification here
      console.log('PR created:', result.pullRequest.htmlUrl)
    }
  }

  // Handle close apply progress modal
  const handleCloseApplyProgressModal = () => {
    setShowApplyProgressModal(false)
  }

  // Handle rollback button click - show confirmation dialog
  const handleRollbackClick = () => {
    setShowRollbackConfirmation(true)
    setRollbackError(null)
  }

  // Handle rollback confirmation
  const handleRollbackConfirm = async () => {
    if (!applyOperationId) {
      setRollbackError('No operation ID available for rollback')
      return
    }

    setIsRollingBack(true)
    setRollbackError(null)

    try {
      const response = await fetch('/api/github/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationId: applyOperationId,
          confirmed: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          throw new Error('Cannot rollback: Pull request has already been merged')
        }
        throw new Error(data.message || data.error || 'Rollback failed')
      }

      // Success
      setRollbackSuccess(true)
      setShowRollbackConfirmation(false)
      
      // Reset apply result to hide the PR success message
      setApplyResult(null)
      setApplyOperationId(null)
      
      // Show success message for a few seconds
      setTimeout(() => {
        setRollbackSuccess(false)
      }, 5000)
    } catch (err) {
      console.error('Rollback failed:', err)
      setRollbackError(err instanceof Error ? err.message : 'Failed to rollback changes')
    } finally {
      setIsRollingBack(false)
    }
  }

  // Handle rollback cancel
  const handleRollbackCancel = () => {
    setShowRollbackConfirmation(false)
    setRollbackError(null)
  }

  // Handle finish and reset
  const handleFinish = () => {
    // Reset to initial state
    setCurrentStep('select-target')
    setSelectedTarget(null)
    setFrameworkOptions({})
    setMigrationSpec(null)
    setMigrationJobId(null)
    setMigrationResult(null)
    setAcceptedFiles(new Set())
    setRejectedFiles(new Set())
    setApplyOperationId(null)
    setApplyResult(null)
    setRollbackSuccess(false)
    setRollbackError(null)
  }

  // Handle back navigation
  const handleBack = () => {
    if (currentStep === 'configure-options') {
      setCurrentStep('select-target')
      setSelectedTarget(null)
    } else if (currentStep === 'review-config') {
      setCurrentStep('configure-options')
      setMigrationSpec(null)
    }
  }

  // Handle file navigation in diff viewer
  const handleNavigateFile = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentFileIndex > 0) {
      setViewingFilePath(allFiles[currentFileIndex - 1])
    } else if (direction === 'next' && currentFileIndex < allFiles.length - 1) {
      setViewingFilePath(allFiles[currentFileIndex + 1])
    }
  }

  return (
    <>
      {/* Migration Success Modal */}
      {showMigrationSuccessModal && (
        <SuccessModal
          isOpen={showMigrationSuccessModal}
          onClose={() => {
            setShowMigrationSuccessModal(false)
          }}
          title="Migration Complete!"
          message="Your code migration has been successfully applied to GitHub. A pull request has been created with all your accepted changes."
          pullRequestUrl={applyResult?.pullRequest?.htmlUrl}
          pullRequestNumber={applyResult?.pullRequest?.number}
          type="migration"
          showViewPullRequest={true}
        />
      )}

      <Card
        className={cn(
          'relative overflow-hidden rounded-lg border transition-all',
          expanded
            ? 'border-purple-500/40 bg-gradient-to-br from-purple-900/20 to-slate-900 shadow-lg shadow-purple-500/10'
            : 'border-purple-500/20 bg-slate-900 hover:border-purple-500/30'
        )}
      >
      {/* Spooky glow effect when expanded */}
      {expanded && (
        <>
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
        </>
      )}

      <CardHeader
        className="relative z-10 cursor-pointer p-4 sm:p-6 hover:bg-purple-900/10 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="mt-1 shrink-0">
              {expanded ? (
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{getFrameworkIcon()}</span>
                <h3 className="text-lg sm:text-xl font-semibold text-white break-words">
                  Migration: {getPhaseTitle()}
                </h3>
                <Badge variant="secondary" className="ml-2 bg-purple-600/20 text-purple-200 border-purple-500/30">
                  <Code2 className="h-3 w-3 mr-1" />
                  Independent Flow
                </Badge>
              </div>
              <p className="mt-1 text-sm text-purple-200 break-words">
                Transform your {sourceStack.framework || 'application'} codebase to a modern framework
                with AI-powered code migration
              </p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-purple-300">
                <span className="whitespace-nowrap flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Automated
                </span>
                <span className="whitespace-nowrap">
                  📦 {sourceStack.framework || 'Unknown'} v{sourceStack.version || 'N/A'}
                </span>
                <span className="whitespace-nowrap">
                  🎯 Multiple target frameworks available
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="relative z-10 p-4 sm:p-6 pt-0">
          <div className="space-y-4">
            <div className="p-4 bg-purple-900/20 border border-purple-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">
                What&apos;s included in Phase 3:
              </h4>
              <ul className="space-y-2 text-sm text-purple-200">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Select target framework and configuration options</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Automated code transformation with AST and AI</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>File structure reorganization</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Import and routing mappings</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Before/after diff viewer with inline editing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>Version upgrade with violation detection</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-orange-900/20 border border-orange-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <span>⚠️</span>
                Important Notes:
              </h4>
              <ul className="space-y-2 text-sm text-orange-200">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Review all changes before accepting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>High-risk transformations will be flagged for manual review</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Backup your code before applying changes</span>
                </li>
              </ul>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            {/* Step Content */}
            {currentStep === 'select-target' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Step 1: Select Target Framework</h4>
                  <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                    1 of 3
                  </Badge>
                </div>
                <TargetFrameworkSelector
                  sourceFramework={sourceStack.framework || ''}
                  sourceLanguage={sourceStack.language || 'javascript'}
                  onSelect={handleTargetSelect}
                  selectedTarget={selectedTarget || undefined}
                />
              </div>
            )}

            {currentStep === 'configure-options' && selectedTarget && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Step 2: Configure Migration Options</h4>
                  <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                    2 of 3
                  </Badge>
                </div>
                <FrameworkOptionsForm
                  targetFramework={selectedTarget.framework}
                  targetVersion={selectedTarget.version}
                  initialOptions={frameworkOptions}
                  onChange={handleOptionsChange}
                />
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleContinueToReview}
                    className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500"
                  >
                    Continue to Review
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'review-config' && migrationSpec && selectedTarget && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Step 3: Review & Start Migration</h4>
                  <Badge variant="outline" className="text-purple-300 border-purple-500/30">
                    3 of 3
                  </Badge>
                </div>
                <MigrationConfigReview
                  sourceStack={sourceStack}
                  targetSelection={selectedTarget}
                  migrationSpec={migrationSpec}
                  repositoryName={repositoryName}
                  repositoryOwner={repositoryOwner}
                  onStartMigration={handleStartMigration}
                  onEdit={handleBack}
                  isLoading={isStarting}
                />
              </div>
            )}

            {currentStep === 'view-results' && migrationResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Migration Results</h4>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      migrationResult.status === 'success' 
                        ? 'text-green-300 border-green-500/30' 
                        : 'text-orange-300 border-orange-500/30'
                    )}
                  >
                    {migrationResult.status === 'success' ? 'Success' : 'Partial Success'}
                  </Badge>
                </div>

                <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading results...</div>}>
                  <MigrationResultsSummary
                    result={migrationResult}
                    onAcceptAll={handleAcceptAll}
                    onRejectAll={handleRejectAll}
                    onAcceptFile={handleAcceptFile}
                    onRejectFile={handleRejectFile}
                    onViewFile={handleViewFile}
                    acceptedFiles={acceptedFiles}
                    rejectedFiles={rejectedFiles}
                  />
                </Suspense>
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={handleFinish}
                    disabled={isApplying}
                  >
                    Close
                  </Button>
                  {!applyResult && (
                    <Button
                      onClick={handleApplyChanges}
                      className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500"
                      disabled={acceptedFiles.size === 0 || isApplying}
                      title={acceptedFiles.size === 0 ? 'Accept files first by clicking the checkmark buttons or "Accept All"' : ''}
                    >
                      {isApplying ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Applying...
                        </>
                      ) : acceptedFiles.size === 0 ? (
                        'Apply Changes (accept files first)'
                      ) : (
                        `Apply Changes (${acceptedFiles.size} file${acceptedFiles.size !== 1 ? 's' : ''})`
                      )}
                    </Button>
                  )}
                </div>
                
                {/* Success message with PR URL */}
                {applyResult && applyResult.pullRequest?.htmlUrl && (
                  <div className="mt-4 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <span>✅</span>
                      Changes Applied Successfully!
                    </h4>
                    <p className="text-sm text-green-200 mb-3">
                      A pull request has been created with your changes.
                    </p>
                    <div className="flex gap-3">
                      <a
                        href={applyResult.pullRequest.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        View Pull Request on GitHub
                        <span>→</span>
                      </a>
                      <Button
                        variant="outline"
                        onClick={handleRollbackClick}
                        disabled={isRollingBack}
                        className="border-red-500/30 text-red-300 hover:bg-red-900/20 hover:text-red-200"
                      >
                        {isRollingBack ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            Rolling back...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Rollback Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Rollback success message */}
                {rollbackSuccess && (
                  <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                    <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                      <span>✅</span>
                      Rollback Successful!
                    </h4>
                    <p className="text-sm text-blue-200">
                      The pull request has been closed and the branch has been deleted.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}

      {/* Diff Viewer Modal */}
      {viewingFilePath && migrationResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-purple-500/20">
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-purple-500/20">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCode className="h-5 w-5 text-purple-400" />
                Viewing Diff: {viewingFilePath}
                {allFiles.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    {currentFileIndex + 1} of {allFiles.length}
                  </Badge>
                )}
              </h2>
              <button
                onClick={handleCloseDiffViewer}
                className="text-white hover:text-white transition-colors p-2 rounded-lg hover:bg-white/20 bg-white/10 border border-white/30"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="relative z-10 flex-1 overflow-y-auto p-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                {(() => {
                  // Handle both Map and Object formats
                  const transform = migrationResult.transformations instanceof Map
                    ? migrationResult.transformations.get(viewingFilePath)
                    : (migrationResult.transformations as any)[viewingFilePath]
                  
                  if (!transform) {
                    return (
                      <div className="py-8 text-center text-gray-400">
                        <p>No transformation data found for this file.</p>
                        <p className="text-sm mt-2">File: {viewingFilePath}</p>
                      </div>
                    )
                  }

                  // Debug logging
                  console.log('[Phase3Card] ========== VIEWING FILE ==========')
                  console.log('[Phase3Card] File:', viewingFilePath)
                  console.log('[Phase3Card] transform.originalCode length:', transform.originalCode?.length || 0)
                  console.log('[Phase3Card] transform.code length:', transform.code?.length || 0)
                  console.log('[Phase3Card] transform.code preview:', transform.code?.substring(0, 200))
                  console.log('[Phase3Card] transform.diff length:', transform.diff?.length || 0)
                  console.log('[Phase3Card] =====================================')

                  // Generate visual diff from original and transformed code
                  const generateVisualDiff = (original: string, transformed: string) => {
                    const originalLines = original.split('\n')
                    const transformedLines = transformed.split('\n')
                    const visual: any[] = []
                    
                    const maxLines = Math.max(originalLines.length, transformedLines.length)
                    
                    for (let i = 0; i < maxLines; i++) {
                      const origLine = originalLines[i]
                      const transLine = transformedLines[i]
                      
                      if (origLine === transLine) {
                        // Unchanged line
                        visual.push({
                          type: 'unchanged',
                          lineNumber: i + 1,
                          content: origLine || '',
                          oldLineNumber: i + 1,
                          newLineNumber: i + 1,
                        })
                      } else if (origLine !== undefined && transLine !== undefined) {
                        // Modified line
                        visual.push({
                          type: 'removed',
                          lineNumber: i + 1,
                          content: origLine,
                          oldLineNumber: i + 1,
                        })
                        visual.push({
                          type: 'added',
                          lineNumber: i + 1,
                          content: transLine,
                          newLineNumber: i + 1,
                        })
                      } else if (origLine !== undefined) {
                        // Removed line
                        visual.push({
                          type: 'removed',
                          lineNumber: i + 1,
                          content: origLine,
                          oldLineNumber: i + 1,
                        })
                      } else if (transLine !== undefined) {
                        // Added line
                        visual.push({
                          type: 'added',
                          lineNumber: i + 1,
                          content: transLine,
                          newLineNumber: i + 1,
                        })
                      }
                    }
                    
                    return visual
                  }

                  // Use the current transform.code which may have been updated by edits
                  const visualDiff = generateVisualDiff(transform.originalCode || '', transform.code)
                  console.log('[Phase3Card] Generated visual diff with', visualDiff.length, 'lines')
                  console.log('[Phase3Card] Using transform.code (may be edited):', transform.code.substring(0, 100) + '...')

                  return (
                    <Suspense fallback={<div className="py-8 text-center text-gray-400">Loading diff viewer...</div>}>
                      <CodeMigrationDiffViewer
                        transformedCode={transform.code}
                        filePath={viewingFilePath}
                        metadata={transform.metadata}
                        diff={{
                          original: transform.originalCode || '',
                          transformed: transform.code, // This is the current code (may be edited)
                          unified: transform.diff || '',
                          visual: visualDiff,
                          characterLevel: [],
                        }}
                        onAccept={(modifiedCode?: string) => {
                          console.log('[Phase3Card] onAccept called with modifiedCode:', !!modifiedCode)
                          // Pass the modified content to handleAcceptFile
                          // If modifiedCode is provided, it means the user edited the content
                          handleAcceptFile(viewingFilePath, modifiedCode, () => {
                            console.log('[Phase3Card] Closing diff viewer after state update')
                            handleCloseDiffViewer()
                          })
                        }}
                        onReject={() => {
                          handleRejectFile(viewingFilePath)
                          handleCloseDiffViewer()
                        }}
                        allFiles={allFiles}
                        currentFileIndex={currentFileIndex}
                        onNavigateFile={handleNavigateFile}
                      />
                    </Suspense>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Migration Progress Modal */}
      {showProgressModal && migrationJobId && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>}>
          <MigrationProgressModal
            jobId={migrationJobId}
            isOpen={showProgressModal}
            onClose={handleCloseProgressModal}
            onComplete={handleMigrationComplete}
            onError={(error) => {
              setError(error.message)
              setShowProgressModal(false)
              setCurrentStep('review-config')
            }}
          />
        </Suspense>
      )}

      {/* Apply Changes Progress Modal */}
      {showApplyProgressModal && applyOperationId && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="text-white">Loading...</div></div>}>
          <ApplyChangesModal
            operationId={applyOperationId}
            isOpen={showApplyProgressModal}
            onClose={handleCloseApplyProgressModal}
            onComplete={handleApplyComplete}
            onError={(error) => {
              setError(error.message)
              setShowApplyProgressModal(false)
            }}
            onRetry={handleApplyChanges}
          />
        </Suspense>
      )}

      {/* Rollback Confirmation Dialog */}
      <Dialog open={showRollbackConfirmation} onOpenChange={setShowRollbackConfirmation}>
        <DialogContent className="bg-gradient-to-br from-slate-900 to-red-900 border-red-500/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Confirm Rollback
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              This action will close the pull request and delete the branch. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-2">What will happen:</h4>
              <ul className="space-y-2 text-sm text-red-200">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>The pull request will be closed</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>The feature branch will be deleted from GitHub</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Your local migration results will remain unchanged</span>
                </li>
              </ul>
            </div>

            {rollbackError && (
              <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-200">{rollbackError}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleRollbackCancel}
              disabled={isRollingBack}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRollbackConfirm}
              disabled={isRollingBack}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              {isRollingBack ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Rolling back...
                </>
              ) : (
                'Confirm Rollback'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Card>
    </>
  )
}
