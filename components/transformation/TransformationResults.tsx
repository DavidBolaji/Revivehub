"use client"

import React, { useState, useMemo, useEffect } from 'react'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Clock,
  TrendingUp,
  TrendingDown,
  Eye,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SuccessModal, useSuccessModal } from '@/components/ui/success-modal'
import type { OrchestrationResult, TaskResult } from '@/types/transformer'

interface TransformationResultsProps {
  result: OrchestrationResult
  onAccept: () => void
  onReject: () => void
  onViewDiff?: (filePath: string) => void
  isApplying?: boolean
  acceptedFiles?: Set<string>
  applySuccess?: { prUrl: string; prNumber: number } | null
  onAcceptAll?: () => void
  onReset?: () => void
}

interface FileChange {
  filePath: string
  taskId: string
  taskName?: string
  phaseId?: string
  phaseName?: string
  result: TaskResult
}

interface GroupedFiles {
  [phaseId: string]: {
    phaseName: string
    files: FileChange[]
  }
}

// Summary metrics card
const SummaryCard: React.FC<{ result: OrchestrationResult }> = ({ result }) => {
  const { summary } = result

  const successRate = summary.tasksCompleted + summary.tasksFailed > 0
    ? (summary.tasksCompleted / (summary.tasksCompleted + summary.tasksFailed)) * 100
    : 0

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {result.success ? (
            <>
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span>Transformation Complete</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-6 w-6 text-yellow-500" />
              <span>Transformation Completed with Issues</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {summary.filesChanged}
            </div>
            <div className="text-sm text-gray-600 mt-1">Files Changed</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-center space-x-1">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold text-green-600">
                {summary.linesAdded}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">Lines Added</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-center space-x-1">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <span className="text-3xl font-bold text-red-600">
                {summary.linesRemoved}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">Lines Removed</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-indigo-600">
              {Math.round(successRate)}%
            </div>
            <div className="text-sm text-gray-600 mt-1">Success Rate</div>
          </div>
        </div>
        
        {/* File Structure Changes Summary */}
        {result.results.some(r => r.result?.metadata.fileStructureChange) && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">File Structure Changes</h4>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const moves = result.results.filter(r => r.result?.metadata.fileStructureChange?.action === 'move').length
                const creates = result.results.filter(r => r.result?.metadata.fileStructureChange?.action === 'create').length
                const renames = result.results.filter(r => r.result?.metadata.fileStructureChange?.action === 'rename').length
                const jsToJsxConversions = result.results.filter(r => 
                  r.result?.metadata.transformationType === 'js-to-jsx-conversion'
                ).length
                
                return (
                  <>
                    {moves > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        📦 {moves} Moved
                      </Badge>
                    )}
                    {creates > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ✨ {creates} Created
                      </Badge>
                    )}
                    {renames > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        ✏️ {renames} Renamed
                      </Badge>
                    )}
                    {jsToJsxConversions > 0 && (
                      <Badge variant="secondary" className="text-xs bg-blue-500 text-white">
                        🔄 {jsToJsxConversions} JS→JSX
                      </Badge>
                    )}
                  </>
                )
              })()}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600">
              {summary.errors.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Errors</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {summary.tasksCompleted}
            </div>
            <div className="text-xs text-gray-600">Tasks Completed</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-red-600">
              {summary.tasksFailed}
            </div>
            <div className="text-xs text-gray-600">Tasks Failed</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-gray-600">
              {summary.tasksSkipped}
            </div>
            <div className="text-xs text-gray-600">Tasks Skipped</div>
          </div>
        </div>

        {summary.estimatedTimeSaved && (
          <div className="mt-4 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="text-lg font-semibold text-gray-700">
                Estimated Time Saved:
              </span>
              <span className="text-lg font-bold text-blue-600">
                {summary.estimatedTimeSaved}
              </span>
            </div>
          </div>
        )}

        {successRate < 100 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Success Rate: {successRate.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// CSS Transformation Summary Card
const CSSTransformationCard: React.FC<{ results: TaskResult[] }> = ({ results }) => {
  // Extract CSS transformation data from results
  const cssStats = useMemo(() => {
    let totalClassesTransformed = 0
    let unmappedClasses: string[] = []
    let cssFilesAnalyzed = 0
    let tailwindConfigGenerated = false
    
    results.forEach(result => {
      if (result.result?.metadata.notes) {
        result.result.metadata.notes.forEach(note => {
          // Parse "CSS classes transformed: X"
          const classMatch = note.match(/CSS classes transformed: (\d+)/)
          if (classMatch) {
            totalClassesTransformed += parseInt(classMatch[1])
          }
          
          // Parse "Unmapped classes: X"
          const unmappedMatch = note.match(/Unmapped classes: (\d+)/)
          if (unmappedMatch) {
            const count = parseInt(unmappedMatch[1])
            if (count > 0) {
              unmappedClasses.push(note)
            }
          }
        })
      }
      
      // Check for CSS files
      if (result.filePath?.match(/\.(css|scss|sass)$/)) {
        cssFilesAnalyzed++
      }
      
      // Check for Tailwind config
      if (result.filePath === 'tailwind.config.ts') {
        tailwindConfigGenerated = true
      }
    })
    
    return {
      totalClassesTransformed,
      unmappedClasses,
      cssFilesAnalyzed,
      tailwindConfigGenerated,
      hasTransformations: totalClassesTransformed > 0 || tailwindConfigGenerated
    }
  }, [results])
  
  if (!cssStats.hasTransformations) return null
  
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span>🎨 CSS to Tailwind Conversion</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-purple-600">
              {cssStats.totalClassesTransformed}
            </div>
            <div className="text-sm text-gray-600 mt-1">Classes Converted</div>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-blue-600">
              {cssStats.cssFilesAnalyzed}
            </div>
            <div className="text-sm text-gray-600 mt-1">CSS Files Analyzed</div>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-green-600">
              {cssStats.tailwindConfigGenerated ? '✓' : '—'}
            </div>
            <div className="text-sm text-gray-600 mt-1">Tailwind Config</div>
          </div>
          
          <div className="text-center p-4 bg-white rounded-lg shadow-sm">
            <div className="text-3xl font-bold text-orange-600">
              {cssStats.unmappedClasses.length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Unmapped Classes</div>
          </div>
        </div>
        
        {cssStats.unmappedClasses.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                Some CSS classes could not be automatically converted
              </span>
            </div>
            <p className="text-xs text-yellow-700">
              {cssStats.unmappedClasses.length} classes require manual review and conversion
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Issues Summary Section - Shows Critical, Warning, and Info
const IssuesSummarySection: React.FC<{ 
  errors: string[]
  warnings: string[]
  manualReviewNeeded: string[]
  results: TaskResult[]
}> = ({ errors, warnings, manualReviewNeeded }) => {
  const [isExpanded, setIsExpanded] = useState(true)

  // Categorize issues
  const criticalIssues = errors
  const warningIssues = warnings
  const infoItems = manualReviewNeeded.map(file => `${file}: Manual review recommended`)

  const totalIssues = criticalIssues.length + warningIssues.length + infoItems.length

  if (totalIssues === 0) return null

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-base">Issues Found</CardTitle>
            <div className="flex gap-2">
              {criticalIssues.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalIssues.length} Critical
                </Badge>
              )}
              {warningIssues.length > 0 && (
                <Badge className="text-xs bg-yellow-500 hover:bg-yellow-600">
                  {warningIssues.length} Warning
                </Badge>
              )}
              {infoItems.length > 0 && (
                <Badge variant="secondary" className="text-xs bg-blue-500 text-white hover:bg-blue-600">
                  {infoItems.length} Info
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Critical Issues */}
          {criticalIssues.length > 0 && (
            <div>
              <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Critical ({criticalIssues.length})
              </h4>
              <ul className="space-y-2">
                {criticalIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                    <span className="font-mono text-red-600 mt-0.5">•</span>
                    <span className="text-sm text-red-800">{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Warnings */}
          {warningIssues.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-600 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Warnings ({warningIssues.length})
              </h4>
              <ul className="space-y-2">
                {warningIssues.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="font-mono text-yellow-600 mt-0.5">•</span>
                    <span className="text-sm text-yellow-800">{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Info */}
          {infoItems.length > 0 && (
            <div>
              <h4 className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Info ({infoItems.length})
              </h4>
              <ul className="space-y-2">
                {infoItems.map((info, i) => (
                  <li key={i} className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <span className="font-mono text-blue-600 mt-0.5">ℹ</span>
                    <span className="text-sm text-blue-800">{info}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// File list grouped by phase
const FileListByPhase: React.FC<{
  groupedFiles: GroupedFiles
  onViewDiff?: (filePath: string) => void
  acceptedFiles?: Set<string>
}> = ({ groupedFiles, onViewDiff, acceptedFiles = new Set() }) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(
    new Set(Object.keys(groupedFiles))
  )

  const togglePhase = (phaseId: string) => {
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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Changed Files by Phase</h3>
      {Object.entries(groupedFiles).map(([phaseId, phase]) => (
        <Card key={phaseId}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-base">{phase.phaseName}</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {phase.files.length} files
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => togglePhase(phaseId)}
              >
                {expandedPhases.has(phaseId) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          {expandedPhases.has(phaseId) && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {phase.files.map((file, index) => {
                  const isAccepted = acceptedFiles.has(file.filePath)
                  return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      isAccepted 
                        ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {isAccepted ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : file.result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm font-medium text-gray-900 truncate">
                            {file.filePath}
                          </div>
                          {isAccepted && (
                            <Badge variant="default" className="text-xs bg-green-600 text-white">
                              ✓ Accepted
                            </Badge>
                          )}
                        </div>
                        {file.taskName && (
                          <div className="text-xs text-gray-500 mt-1">
                            Task: {file.taskName}
                          </div>
                        )}
                        {file.result.result?.metadata.fileStructureChange && (
                          <div className="flex items-center space-x-2 text-xs mt-1">
                            <Badge variant="outline" className="text-xs">
                              {file.result.result.metadata.fileStructureChange.action === 'move' && '📦 Moved'}
                              {file.result.result.metadata.fileStructureChange.action === 'create' && '✨ Created'}
                              {file.result.result.metadata.fileStructureChange.action === 'rename' && 
                                (file.result.result.metadata.transformationType === 'js-to-jsx-conversion' ? '🔄 JS→JSX' : '✏️ Renamed')}
                            </Badge>
                            {(file.result.result.metadata.fileStructureChange.action === 'move' || 
                              file.result.result.metadata.fileStructureChange.action === 'rename') && (
                              <span className="text-gray-500">
                                {file.result.result.metadata.transformationType === 'js-to-jsx-conversion' ? (
                                  <>from <span className="font-mono">{file.result.result.metadata.fileStructureChange.originalPath}</span></>
                                ) : (
                                  <>→ <span className="font-mono">{file.result.result.metadata.newFilePath}</span></>
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        {file.result.result && (
                          <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center space-x-1">
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span>+{file.result.result.metadata.linesAdded}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <TrendingDown className="h-3 w-3 text-red-500" />
                              <span>-{file.result.result.metadata.linesRemoved}</span>
                            </span>
                          </div>
                        )}
                        {file.result.error && (
                          <div className="text-xs text-red-600 mt-1">
                            Error: {file.result.error}
                          </div>
                        )}
                      </div>
                    </div>
                    {file.result.success && onViewDiff && (
                      <Button
                        variant={isAccepted ? "default" : "outline"}
                        size="sm"
                        onClick={() => onViewDiff(file.filePath)}
                        className={`ml-2 flex-shrink-0 ${isAccepted ? 'bg-green-600 hover:bg-green-700' : ''}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {isAccepted ? 'View Again' : 'View Diff'}
                      </Button>
                    )}
                  </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}

// Action buttons
const ActionButtons: React.FC<{
  onAccept: () => void
  onReject: () => void
  onDownload: () => void
  onRestart: () => void
  onReset: () => void
  onAcceptAll?: () => void
  hasErrors: boolean
  isApplying?: boolean
  acceptedCount: number
  totalCount: number
  applySuccess?: { prUrl: string; prNumber: number } | null
}> = ({ onAccept, onReject, onDownload, onRestart, onReset, onAcceptAll, hasErrors, isApplying, acceptedCount, totalCount, applySuccess }) => {
  
  const handleRestart = () => {
    if (confirm('Are you sure you want to restart the transformation? All progress will be lost.')) {
      onRestart()
    }
  }

  const handleReject = () => {
    if (confirm('Are you sure you want to reject all changes? This cannot be undone.')) {
      onReject()
    }
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset accepted files? You will need to review them again.')) {
      onReset()
    }
  }

  const handleAcceptAll = () => {
    if (onAcceptAll && confirm(`Accept all ${totalCount} files without reviewing?`)) {
      onAcceptAll()
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!applySuccess && (
            <>
              <Button
                size="lg"
                onClick={onAccept}
                className="w-full sm:w-auto min-w-[200px] bg-green-600 hover:bg-green-700 text-white"
                disabled={hasErrors || isApplying || acceptedCount === 0}
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Applying to GitHub...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Apply to GitHub ({acceptedCount}/{totalCount})
                  </>
                )}
              </Button>
              {onAcceptAll && acceptedCount < totalCount && (
                <Button
                  size="lg"
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto min-w-[160px] bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isApplying}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Accept All
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={handleReset}
                className="w-full sm:w-auto min-w-[160px] border-gray-300 hover:bg-gray-100"
                disabled={isApplying || acceptedCount === 0}
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset Accepted
              </Button>
            </>
          )}
          <Button
            size="lg"
            variant="outline"
            onClick={onDownload}
            className="w-full sm:w-auto min-w-[160px] border-gray-300 hover:bg-gray-100"
            disabled={isApplying}
          >
            <Download className="h-5 w-5 mr-2" />
            Download Changes
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleRestart}
            className="w-full sm:w-auto min-w-[160px] border-gray-300 hover:bg-gray-100"
            disabled={isApplying}
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Restart
          </Button>
          <Button
            size="lg"
            variant="destructive"
            onClick={handleReject}
            className="w-full sm:w-auto min-w-[160px] bg-red-600 hover:bg-red-700 text-white"
            disabled={isApplying}
          >
            <XCircle className="h-5 w-5 mr-2" />
            Reject All
          </Button>
        </div>
        {hasErrors && (
          <p className="text-sm text-center text-yellow-600 mt-3">
            Cannot apply changes due to errors. Please review and fix issues first.
          </p>
        )}
        {isApplying && (
          <p className="text-sm text-center text-blue-600 mt-3">
            Creating pull request on GitHub...
          </p>
        )}
        {acceptedCount === 0 && !isApplying && (
          <p className="text-sm text-center text-orange-600 mt-3">
            Please accept files by viewing their diffs before applying to GitHub.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export const TransformationResults: React.FC<TransformationResultsProps> = ({
  result,
  onAccept,
  onReject,
  onViewDiff,
  isApplying = false,
  acceptedFiles = new Set(),
  applySuccess = null,
  onAcceptAll,
  onReset,
}) => {
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [hasShownSuccessModal, setHasShownSuccessModal] = useState(false)
  const { shouldShow } = useSuccessModal()

  // Show success modal when applySuccess changes (only once)
  useEffect(() => {
    if (applySuccess && shouldShow('transformation') && !hasShownSuccessModal) {
      setShowSuccessModal(true)
      setHasShownSuccessModal(true)
    }
  }, [applySuccess, shouldShow, hasShownSuccessModal])

  const handleReset = () => {
    if (onReset) {
      onReset()
    } else {
      // Fallback: Clear accepted files by reloading
      window.location.reload()
    }
  }

  const handleAcceptAll = () => {
    if (onAcceptAll) {
      onAcceptAll()
    }
  }

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
  }
  // Group files by phase and merge duplicate files (like package.json)
  // NOTE: acceptedFiles is intentionally NOT in the dependency array
  // We want to keep all files visible, just mark which ones are accepted
  const groupedFiles = useMemo<GroupedFiles>(() => {
    const groups: GroupedFiles = {}
    const fileMap = new Map<string, FileChange>() // Track unique files

    console.log('[TransformationResults] ===== BUILDING FILE LIST =====')
    console.log('[TransformationResults] TransformedFiles size:', result.transformedFiles?.size)
    console.log('[TransformationResults] TransformedFiles keys:', result.transformedFiles ? Array.from(result.transformedFiles.keys()) : [])
    console.log('[TransformationResults] Results array length:', result.results.length)

    // If we have transformedFiles Map, use that to build the file list
    if (result.transformedFiles && result.transformedFiles.size > 0) {
      console.log('[TransformationResults] Using transformedFiles Map (size:', result.transformedFiles.size, ')')
      
      // Convert Map to array of entries
      const fileEntries = Array.from(result.transformedFiles.entries())
      
      fileEntries.forEach(([filePath, content]) => {
        // Find ALL task results for this file (there may be multiple for package.json)
        const taskResults = result.results.filter(r => 
          r.filePath === filePath || 
          (r.result?.metadata as any)?.filePath === filePath ||
          (r.result?.diff as any)?.filePath === filePath
        )

        // Use the first task result or create a default one
        const primaryTaskResult = taskResults[0]
        
        // If no task result found, create a default one
        const fileResult: TaskResult = primaryTaskResult || {
          taskId: 'phase-3-migration',
          filePath,
          success: true,
          result: {
            success: true,
            code: content,
            errors: [],
            warnings: [],
            metadata: {
              transformationType: 'migration',
              filesModified: [filePath],
              linesAdded: 0,
              linesRemoved: 0,
              confidenceScore: 100,
              riskScore: 0,
              requiresManualReview: false,
              estimatedTimeSaved: '0 minutes',
              transformationsApplied: [],
            },
          },
        }

        // If there are multiple task results for the same file, merge their metadata
        if (taskResults.length > 1) {
          console.log(`[TransformationResults] Merging ${taskResults.length} results for ${filePath}`)
          
          // Sum up lines added/removed
          const totalLinesAdded = taskResults.reduce((sum, r) => 
            sum + (r.result?.metadata.linesAdded || 0), 0
          )
          const totalLinesRemoved = taskResults.reduce((sum, r) => 
            sum + (r.result?.metadata.linesRemoved || 0), 0
          )
          
          // Merge transformations applied
          const allTransformations = taskResults.flatMap(r => 
            r.result?.metadata.transformationsApplied || []
          )
          
          // Update metadata with merged values
          if (fileResult.result) {
            fileResult.result.metadata = {
              ...fileResult.result.metadata,
              linesAdded: totalLinesAdded,
              linesRemoved: totalLinesRemoved,
              transformationsApplied: allTransformations,
            }
          }
          
          // Create a combined task name
          fileResult.taskId = `${fileResult.taskId.split('-')[0]}-combined`
        }

        // Determine phase from file path or task ID
        const phaseId = fileResult.taskId.split('-')[0] || 'phase-3'
        const phaseName = phaseId === 'phase-3' ? 'Phase 3: Code Migration' : `Phase ${phaseId.replace('phase-', '')}`

        // Only add if not already in fileMap (prevents duplicates)
        if (!fileMap.has(filePath)) {
          const fileChange: FileChange = {
            filePath,
            taskId: fileResult.taskId,
            taskName: taskResults.length > 1 
              ? `Combined: ${taskResults.length} dependency updates`
              : undefined,
            phaseId,
            phaseName,
            result: fileResult,
          }
          
          fileMap.set(filePath, fileChange)
          
          if (!groups[phaseId]) {
            groups[phaseId] = {
              phaseName,
              files: [],
            }
          }

          groups[phaseId].files.push(fileChange)
        }
      })
    } else {
      // Fallback to original logic if transformedFiles is not available
      console.log('[TransformationResults] Using results array (fallback)')
      
      // Group by file path first to detect duplicates
      const fileResultsMap = new Map<string, TaskResult[]>()
      
      result.results.forEach(taskResult => {
        if (!taskResult.filePath || taskResult.skipped) return
        
        const existing = fileResultsMap.get(taskResult.filePath) || []
        existing.push(taskResult)
        fileResultsMap.set(taskResult.filePath, existing)
      })
      
      // Process each unique file
      fileResultsMap.forEach((taskResults, filePath) => {
        const primaryResult = taskResults[0]
        const phaseId = primaryResult.taskId.split('-')[0] || 'unknown'
        const phaseName = `Phase ${phaseId}`

        if (!groups[phaseId]) {
          groups[phaseId] = {
            phaseName,
            files: [],
          }
        }

        groups[phaseId].files.push({
          filePath,
          taskId: primaryResult.taskId,
          taskName: taskResults.length > 1 
            ? `Combined: ${taskResults.length} updates`
            : undefined,
          phaseId,
          phaseName,
          result: primaryResult,
        })
      })
    }

    console.log('[TransformationResults] Grouped files:', groups)
    console.log('[TransformationResults] Total groups:', Object.keys(groups).length)
    console.log('[TransformationResults] Unique files:', fileMap.size)
    Object.entries(groups).forEach(([phaseId, phase]) => {
      console.log(`[TransformationResults] ${phaseId}: ${phase.files.length} files`)
    })

    console.log('[TransformationResults] ===== FINAL GROUPS =====')
    console.log('[TransformationResults] Total groups:', Object.keys(groups).length)
    Object.entries(groups).forEach(([phaseId, phase]) => {
      console.log(`[TransformationResults] ${phaseId}: ${phase.files.length} files -`, phase.files.map(f => f.filePath))
    })
    
    return groups
  }, [result]) // Removed acceptedFiles from dependencies - we want to keep all files visible

  const handleDownload = () => {
    // Create a JSON blob with all transformed files
    const data = {
      jobId: result.jobId,
      summary: result.summary,
      transformedFiles: Array.from(result.transformedFiles.entries()).map(
        ([path, content]) => ({ path, content })
      ),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transformation-${result.jobId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const hasErrors = result.summary.errors.length > 0 || result.summary.tasksFailed > 0

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleCloseSuccessModal}
        title="Transformation Complete!"
        message="Your code transformation has been successfully applied to GitHub. A pull request has been created with all your accepted changes."
        pullRequestUrl={applySuccess?.prUrl}
        pullRequestNumber={applySuccess?.prNumber}
        type="transformation"
        showViewPullRequest={true}
      />

      {/* Summary Card */}
      <SummaryCard result={result} />

      {/* Success Message */}
      {applySuccess && applySuccess.prUrl && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  ✅ Changes Applied Successfully!
                </h3>
                <p className="text-sm text-green-800 mb-4">
                  Your transformation has been applied to GitHub. A pull request has been created with all accepted changes.
                </p>
                <div className="flex gap-3">
                  <a
                    href={applySuccess.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    View Pull Request #{applySuccess.prNumber}
                    <span>→</span>
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSS Transformation Card */}
      <CSSTransformationCard results={result.results} />

      {/* Issues Summary Section - Replaces individual Warnings/Errors/Manual Review sections */}
      <IssuesSummarySection
        errors={result.summary.errors}
        warnings={result.summary.warnings}
        manualReviewNeeded={result.summary.manualReviewNeeded}
        results={result.results}
      />

      {/* File List by Phase */}
      {Object.keys(groupedFiles).length > 0 && (
        <FileListByPhase 
          groupedFiles={groupedFiles} 
          onViewDiff={onViewDiff}
          acceptedFiles={acceptedFiles}
        />
      )}

      {/* Action Buttons */}
      <ActionButtons
        onAccept={onAccept}
        onReject={onReject}
        onDownload={handleDownload}
        onReset={handleReset}
        onRestart={() => window.location.reload()}
        onAcceptAll={handleAcceptAll}
        hasErrors={hasErrors}
        isApplying={isApplying}
        acceptedCount={acceptedFiles.size}
        totalCount={result.transformedFiles.size}
        applySuccess={applySuccess}
      />
    </div>
  )
}

export default TransformationResults
