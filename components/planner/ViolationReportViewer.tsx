'use client'

import { useState } from 'react'
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight,
  FileCode,
  Loader2,
  Sparkles,
  Wrench
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { ViolationReport, FixSuggestion } from '@/types/migration'

interface ViolationReportViewerProps {
  report: ViolationReport
  fixSuggestions?: Map<string, FixSuggestion>
  onAutoFixAll?: () => void
  onAutoFixFile?: (filePath: string) => void
  onAutoFixViolation?: (violationId: string) => void
  isFixing?: boolean
  fixedViolations?: Set<string>
}

export function ViolationReportViewer({
  report,
  fixSuggestions,
  onAutoFixAll,
  onAutoFixFile,
  onAutoFixViolation,
  isFixing = false,
  fixedViolations = new Set(),
}: ViolationReportViewerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const [expandedViolations, setExpandedViolations] = useState<Set<string>>(new Set())

  const toggleFile = (filePath: string) => {
    const newExpanded = new Set(expandedFiles)
    if (newExpanded.has(filePath)) {
      newExpanded.delete(filePath)
    } else {
      newExpanded.add(filePath)
    }
    setExpandedFiles(newExpanded)
  }

  const toggleViolation = (violationId: string) => {
    const newExpanded = new Set(expandedViolations)
    if (newExpanded.has(violationId)) {
      newExpanded.delete(violationId)
    } else {
      newExpanded.add(violationId)
    }
    setExpandedViolations(newExpanded)
  }

  // Get severity icon and color
  const getSeverityIcon = (severity: 'error' | 'warning') => {
    if (severity === 'error') {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  }

  const getSeverityColor = (severity: 'error' | 'warning') => {
    if (severity === 'error') {
      return 'bg-red-100 text-red-800 border-red-300'
    }
    return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }

  // Get violation type badge
  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'breaking-change': 'bg-red-100 text-red-800 border-red-300',
      'deprecation': 'bg-orange-100 text-orange-800 border-orange-300',
      'incompatibility': 'bg-purple-100 text-purple-800 border-purple-300',
    }
    return (
      <Badge variant="outline" className={cn('text-xs', colors[type] || 'bg-gray-100')}>
        {type.replace('-', ' ')}
      </Badge>
    )
  }

  // Group violations by file
  const violationsByFile = Array.from(report.violationsByFile.entries())

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            Violation Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-xs text-red-600 mb-1">Total Violations</div>
              <div className="text-2xl font-bold text-red-900">
                {report.totalViolations}
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-xs text-green-600 mb-1">Auto-fixable</div>
              <div className="text-2xl font-bold text-green-900">
                {report.autoFixableCount}
              </div>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="text-xs text-orange-600 mb-1">Manual Review</div>
              <div className="text-2xl font-bold text-orange-900">
                {report.manualReviewCount}
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-600 mb-1">Affected Files</div>
              <div className="text-2xl font-bold text-blue-900">
                {report.violationsByFile.size}
              </div>
            </div>
          </div>

          {/* Summary Text */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">{report.summary}</p>
          </div>

          {/* Auto-fix All Button */}
          {report.autoFixableCount > 0 && onAutoFixAll && (
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
              onClick={onAutoFixAll}
              disabled={isFixing}
            >
              {isFixing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Applying Fixes...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Auto-fix All ({report.autoFixableCount} violations)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Violations by File */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Violations by File</h3>
        
        {violationsByFile.length === 0 ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-green-900 mb-1">
                No Violations Found
              </h4>
              <p className="text-sm text-green-700">
                Your codebase is compatible with the target version!
              </p>
            </CardContent>
          </Card>
        ) : (
          violationsByFile.map(([filePath, violations]) => {
            const isExpanded = expandedFiles.has(filePath)
            const fileAutoFixableCount = violations.filter(v => v.autoFixable).length
            const fileFixedCount = violations.filter(v => fixedViolations.has(v.id)).length

            return (
              <Card key={filePath} className="border-gray-200">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleFile(filePath)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>
                      <FileCode className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                          {filePath}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {violations.length} violation{violations.length !== 1 ? 's' : ''}
                          </Badge>
                          {fileAutoFixableCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                              {fileAutoFixableCount} auto-fixable
                            </Badge>
                          )}
                          {fileFixedCount > 0 && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                              {fileFixedCount} fixed
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {fileAutoFixableCount > 0 && onAutoFixFile && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAutoFixFile(filePath)
                        }}
                        disabled={isFixing}
                      >
                        <Wrench className="h-4 w-4 mr-1" />
                        Fix File
                      </Button>
                    )}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <div className="space-y-3">
                      {violations.map((violation) => {
                        const isViolationExpanded = expandedViolations.has(violation.id)
                        const isFixed = fixedViolations.has(violation.id)
                        const suggestion = fixSuggestions?.get(violation.id)

                        return (
                          <div
                            key={violation.id}
                            className={cn(
                              'border rounded-lg overflow-hidden',
                              isFixed ? 'border-green-300 bg-green-50' : 'border-gray-200'
                            )}
                          >
                            <div
                              className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => toggleViolation(violation.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5">
                                  {isViolationExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-gray-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {getSeverityIcon(violation.severity)}
                                      {getTypeBadge(violation.type)}
                                      <Badge
                                        variant="outline"
                                        className={cn('text-xs', getSeverityColor(violation.severity))}
                                      >
                                        Line {violation.line}:{violation.column}
                                      </Badge>
                                      {isFixed && (
                                        <Badge className="bg-green-600 text-white text-xs">
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                          Fixed
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-900 font-medium">
                                    {violation.message}
                                  </p>
                                  {violation.suggestion && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      💡 {violation.suggestion}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {isViolationExpanded && suggestion && (
                              <div className="border-t border-gray-200 p-3 bg-gray-50">
                                <h5 className="text-xs font-semibold text-gray-700 mb-2">
                                  Fix Suggestion
                                </h5>
                                <p className="text-sm text-gray-700 mb-3">
                                  {suggestion.description}
                                </p>

                                {suggestion.autoFixable && suggestion.fixCode && (
                                  <div className="space-y-2">
                                    <div className="p-2 bg-white border border-gray-200 rounded font-mono text-xs overflow-x-auto">
                                      <pre className="text-gray-800">{suggestion.fixCode}</pre>
                                    </div>
                                    {onAutoFixViolation && !isFixed && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => onAutoFixViolation(violation.id)}
                                        disabled={isFixing}
                                      >
                                        <Wrench className="h-4 w-4 mr-2" />
                                        Apply This Fix
                                      </Button>
                                    )}
                                  </div>
                                )}

                                {!suggestion.autoFixable && suggestion.manualSteps && (
                                  <div className="space-y-2">
                                    <h6 className="text-xs font-semibold text-orange-700">
                                      Manual Steps Required:
                                    </h6>
                                    <ol className="list-decimal list-inside space-y-1">
                                      {suggestion.manualSteps.map((step, index) => (
                                        <li key={index} className="text-xs text-gray-700">
                                          {step}
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
