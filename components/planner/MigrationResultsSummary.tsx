'use client'

import { useState } from 'react'
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  FileCode,
  TrendingUp,
  TrendingDown,
  Package,
  Eye,
  Check,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { Phase3OrchestrationResult } from '@/types/migration'

interface MigrationResultsSummaryProps {
  result: Phase3OrchestrationResult
  onAcceptAll?: () => void
  onRejectAll?: () => void
  onAcceptFile?: (filePath: string) => void
  onRejectFile?: (filePath: string) => void
  onViewFile?: (filePath: string) => void
  acceptedFiles?: Set<string>
  rejectedFiles?: Set<string>
}

export function MigrationResultsSummary({
  result,
  onAcceptAll,
  onRejectAll,
  onAcceptFile,
  onRejectFile,
  onViewFile,
  acceptedFiles = new Set(),
  rejectedFiles = new Set(),
}: MigrationResultsSummaryProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['successful'])
  )

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  // Get status badge
  const getStatusBadge = () => {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-300',
      partial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
    }
    const icons = {
      success: <CheckCircle2 className="h-4 w-4" />,
      partial: <AlertTriangle className="h-4 w-4" />,
      failed: <XCircle className="h-4 w-4" />,
    }
    return (
      <Badge variant="outline" className={cn('text-sm', colors[result.status])}>
        {icons[result.status]}
        <span className="ml-1">{result.status.toUpperCase()}</span>
      </Badge>
    )
  }

  // Group transformations - handle both Map and Object formats
  const transformationsEntries: Array<[string, any]> = result.transformations instanceof Map
    ? Array.from(result.transformations.entries())
    : Object.entries(result.transformations)
  
  const errorsEntries: Array<[string, any]> = result.errors instanceof Map
    ? Array.from(result.errors.entries())
    : Object.entries(result.errors || {})
  
  const transformationsKeys = result.transformations instanceof Map
    ? Array.from(result.transformations.keys())
    : Object.keys(result.transformations)

  const successfulTransforms = transformationsEntries.filter(
    ([_, transform]) => !transform.requiresReview && transform.newFilePath !== ''
  )
  const reviewRequiredTransforms = transformationsEntries.filter(
    ([_, transform]) => transform.requiresReview && transform.newFilePath !== ''
  )
  const deletedFiles = transformationsEntries.filter(
    ([_, transform]) => transform.newFilePath === '' || transform.metadata?.fileStructureChange?.action === 'delete'
  )
  // Only show actual errors (filter out empty/null values)
  const failedTransforms = errorsEntries.filter(
    ([_, error]) => error && (error.message || error.error || typeof error === 'string')
  )

  // Calculate pending actions
  const pendingFiles = transformationsKeys.filter(
    (path) => !acceptedFiles.has(path) && !rejectedFiles.has(path)
  )

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2 flex items-center gap-2">
                Migration Results
                {getStatusBadge()}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Job ID: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{result.jobId}</code>
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-600 mb-1">Total Files</div>
              <div className="text-2xl font-bold text-blue-900">
                {result.summary.totalFiles}
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-600 mb-1">Successful</div>
              <div className="text-2xl font-bold text-green-900">
                {result.summary.successfulTransformations}
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-xs text-red-600 mb-1">Failed</div>
              <div className="text-2xl font-bold text-red-900">
                {result.summary.failedTransformations}
              </div>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-xs text-orange-600 mb-1">Review Required</div>
              <div className="text-2xl font-bold text-orange-900">
                {result.summary.filesRequiringReview}
              </div>
            </div>
          </div>

          {/* Code Changes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div className="text-xs text-gray-600">Lines Added</div>
              </div>
              <div className="text-xl font-bold text-green-900">
                +{result.summary.linesAdded.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <div className="text-xs text-gray-600">Lines Removed</div>
              </div>
              <div className="text-xl font-bold text-red-900">
                -{result.summary.linesRemoved.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Dependencies */}
          {(result.summary.dependenciesAdded.length > 0 || 
            result.summary.dependenciesRemoved.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.summary.dependenciesAdded.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <div className="text-xs font-semibold text-green-700">
                      Dependencies Added ({result.summary.dependenciesAdded.length})
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.summary.dependenciesAdded.slice(0, 3).map((dep, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-white">
                        {dep}
                      </Badge>
                    ))}
                    {result.summary.dependenciesAdded.length > 3 && (
                      <Badge variant="outline" className="text-xs bg-white">
                        +{result.summary.dependenciesAdded.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              {result.summary.dependenciesRemoved.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-red-600" />
                    <div className="text-xs font-semibold text-red-700">
                      Dependencies Removed ({result.summary.dependenciesRemoved.length})
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.summary.dependenciesRemoved.slice(0, 3).map((dep, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-white">
                        {dep}
                      </Badge>
                    ))}
                    {result.summary.dependenciesRemoved.length > 3 && (
                      <Badge variant="outline" className="text-xs bg-white">
                        +{result.summary.dependenciesRemoved.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          {pendingFiles.length > 0 && (
            <div className="flex gap-3">
              {onAcceptAll && (
                <Button
                  size="lg"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                  onClick={onAcceptAll}
                >
                  <Check className="h-5 w-5 mr-2" />
                  Accept All ({pendingFiles.length})
                </Button>
              )}
              {onRejectAll && (
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  onClick={onRejectAll}
                >
                  <X className="h-5 w-5 mr-2" />
                  Reject All
                </Button>
              )}
            </div>
          )}

          {pendingFiles.length === 0 && acceptedFiles.size > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-green-900">
                All files have been reviewed!
              </p>
              <p className="text-xs text-green-700 mt-1">
                {acceptedFiles.size} accepted, {rejectedFiles.size} rejected
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Successful Transformations */}
      {successfulTransforms.length > 0 && (
        <Card className="border-green-200">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('successful')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expandedSections.has('successful') ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">
                  Successful Transformations ({successfulTransforms.length})
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          {expandedSections.has('successful') && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {successfulTransforms.map(([filePath, transform]) => {
                  const isAccepted = acceptedFiles.has(filePath)
                  const isRejected = rejectedFiles.has(filePath)

                  return (
                    <div
                      key={filePath}
                      className={cn(
                        'p-3 border rounded-lg',
                        isAccepted && 'border-green-300 bg-green-50',
                        isRejected && 'border-red-300 bg-red-50',
                        !isAccepted && !isRejected && 'border-gray-200 bg-white'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <FileCode className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {filePath}
                            </div>
                            {transform.newFilePath !== filePath && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                → {transform.newFilePath}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {transform.metadata.fileType}
                              </Badge>
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                {transform.confidence}% confidence
                              </Badge>
                              {isAccepted && (
                                <Badge className="bg-green-600 text-white text-xs">
                                  Accepted
                                </Badge>
                              )}
                              {isRejected && (
                                <Badge className="bg-red-600 text-white text-xs">
                                  Rejected
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          {onViewFile && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewFile(filePath)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {!isAccepted && !isRejected && (
                            <>
                              {onAcceptFile && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-300 text-green-700 hover:bg-green-50"
                                  onClick={() => onAcceptFile(filePath)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              {onRejectFile && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                  onClick={() => onRejectFile(filePath)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Review Required */}
      {reviewRequiredTransforms.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('review')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expandedSections.has('review') ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base">
                  Files Requiring Manual Review ({reviewRequiredTransforms.length})
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          {expandedSections.has('review') && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {reviewRequiredTransforms.map(([filePath, transform]) => (
                  <div
                    key={filePath}
                    className="p-3 border border-orange-200 bg-orange-50 rounded-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <FileCode className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {filePath}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                              {transform.confidence}% confidence
                            </Badge>
                            {transform.warnings.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {transform.warnings.length} warning{transform.warnings.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          {transform.warnings.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {transform.warnings.map((warning: string, index: number) => (
                                <li key={index} className="text-xs text-orange-700 flex items-start gap-1">
                                  <span className="mt-0.5">⚠️</span>
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      {onViewFile && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onViewFile(filePath)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Deleted Files */}
      {deletedFiles.length > 0 && (
        <Card className="border-gray-300">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('deleted')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expandedSections.has('deleted') ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <X className="h-5 w-5 text-gray-600" />
                <CardTitle className="text-base">
                  Files Removed ({deletedFiles.length})
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          {expandedSections.has('deleted') && (
            <CardContent className="pt-0">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg mb-3">
                <p className="text-sm text-gray-700">
                  These files are no longer needed in Next.js and will be removed during migration.
                </p>
              </div>
              <div className="space-y-2">
                {deletedFiles.map(([filePath]) => (
                  <div
                    key={filePath}
                    className="p-3 border border-gray-200 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <FileCode className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate line-through">
                          {filePath}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {filePath.includes('index.') && 'React entry point - replaced by Next.js App Router'}
                          {filePath.includes('reportWebVitals') && 'Web vitals reporting - not needed in Next.js'}
                          {filePath.includes('setupTests') && 'Test setup - moved to __tests__ directory'}
                          {filePath.includes('index.html') && 'HTML template - Next.js generates this automatically'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Failed Transformations */}
      {failedTransforms.length > 0 && (
        <Card className="border-red-200">
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('failed')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {expandedSections.has('failed') ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <XCircle className="h-5 w-5 text-red-600" />
                <CardTitle className="text-base">
                  Failed Transformations ({failedTransforms.length})
                </CardTitle>
              </div>
            </div>
          </CardHeader>

          {expandedSections.has('failed') && (
            <CardContent className="pt-0">
              <div className="space-y-2">
                {failedTransforms.map(([filePath, error]) => (
                  <div
                    key={filePath}
                    className="p-3 border border-red-200 bg-red-50 rounded-lg"
                  >
                    <div className="flex items-start gap-2">
                      <FileCode className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {filePath}
                        </div>
                        <div className="text-xs text-red-700 mt-1">
                          {error.message}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
