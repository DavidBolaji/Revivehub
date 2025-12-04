'use client'

import { useState } from 'react'
import { FileCode, Package, ArrowRight, Info, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EditableDiffViewer } from '@/components/transformation/EditableDiffViewer'
import { cn } from '@/lib/utils'
import type { Diff } from '@/types/transformer'
import type { MigrationMetadata } from '@/types/migration'

interface CodeMigrationDiffViewerProps {
  transformedCode: string
  filePath: string
  metadata: MigrationMetadata
  onAccept: (modifiedCode?: string) => void
  onReject: () => void
  diff: Diff
  allFiles?: string[]
  currentFileIndex?: number
  onNavigateFile?: (direction: 'prev' | 'next') => void
}

export function CodeMigrationDiffViewer({
  transformedCode,
  filePath,
  metadata,
  onAccept,
  onReject,
  diff,
  allFiles = [],
  currentFileIndex = 0,
  onNavigateFile,
}: CodeMigrationDiffViewerProps) {
  const [showMetadata, setShowMetadata] = useState(true)

  // Get file type icon
  const getFileTypeIcon = (fileType: string): string => {
    const icons: Record<string, string> = {
      page: '📄',
      component: '🧩',
      layout: '🎨',
      api: '🔌',
      util: '🔧',
      module: '📦',
      config: '⚙️',
      test: '🧪',
    }
    return icons[fileType] || '📁'
  }

  // Get file type color
  const getFileTypeColor = (fileType: string): string => {
    const colors: Record<string, string> = {
      page: 'bg-blue-100 text-blue-800 border-blue-300',
      component: 'bg-purple-100 text-purple-800 border-purple-300',
      layout: 'bg-pink-100 text-pink-800 border-pink-300',
      api: 'bg-green-100 text-green-800 border-green-300',
      util: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      module: 'bg-orange-100 text-orange-800 border-orange-300',
      config: 'bg-gray-100 text-gray-800 border-gray-300',
      test: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    }
    return colors[fileType] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  return (
    <div className="space-y-4">
      {/* Migration Metadata Card */}
      {showMetadata && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode className="h-5 w-5 text-purple-600" />
                Migration Details
              </CardTitle>
              <button
                onClick={() => setShowMetadata(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Hide
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* File Path Change */}
            {metadata.newFilePath !== filePath && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  File Path Change
                </h4>
                <div className="flex items-center gap-2 text-sm">
                  <code className="px-2 py-1 bg-red-50 text-red-700 rounded border border-red-200 font-mono text-xs">
                    {filePath}
                  </code>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <code className="px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200 font-mono text-xs">
                    {metadata.newFilePath}
                  </code>
                </div>
              </div>
            )}

            {/* File Type and Framework */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  File Type
                </h4>
                <Badge
                  variant="outline"
                  className={cn('text-xs', getFileTypeColor(metadata.fileType))}
                >
                  {getFileTypeIcon(metadata.fileType)} {metadata.fileType}
                </Badge>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2">
                  Target Framework
                </h4>
                <Badge variant="outline" className="text-xs">
                  {metadata.framework} ({metadata.language})
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Dependencies Changes */}
            {(metadata.dependenciesAdded.length > 0 ||
              metadata.dependenciesRemoved.length > 0) && (
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Dependency Changes
                </h4>
                <div className="space-y-2">
                  {metadata.dependenciesAdded.length > 0 && (
                    <div>
                      <div className="text-xs text-green-700 font-medium mb-1">
                        Added ({metadata.dependenciesAdded.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {metadata.dependenciesAdded.map((dep, index) => (
                          <Badge
                            key={index}
                            className="bg-green-100 text-green-800 border-green-300 text-xs"
                          >
                            + {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {metadata.dependenciesRemoved.length > 0 && (
                    <div>
                      <div className="text-xs text-red-700 font-medium mb-1">
                        Removed ({metadata.dependenciesRemoved.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {metadata.dependenciesRemoved.map((dep, index) => (
                          <Badge
                            key={index}
                            className="bg-red-100 text-red-800 border-red-300 text-xs"
                          >
                            - {dep}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Transformation Notes */}
            {metadata.notes.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Transformation Notes
                  </h4>
                  <ul className="space-y-1">
                    {metadata.notes.map((note, index) => (
                      <li
                        key={index}
                        className="text-xs text-gray-600 flex items-start gap-2"
                      >
                        <span className="text-purple-600 mt-0.5">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Warning for manual review */}
            {metadata.notes.some(
              (note) =>
                note.toLowerCase().includes('review') ||
                note.toLowerCase().includes('manual')
            ) && (
              <>
                <Separator />
                <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="text-xs font-semibold text-orange-900 mb-1">
                      Manual Review Required
                    </h5>
                    <p className="text-xs text-orange-700">
                      This file contains transformations that require manual review.
                      Please carefully check the changes before accepting.
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show metadata button when hidden */}
      {!showMetadata && (
        <button
          onClick={() => setShowMetadata(true)}
          className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
        >
          <Info className="h-4 w-4" />
          Show Migration Details
        </button>
      )}

      {/* Debug Info */}
      {(() => {
        console.log('[CodeMigrationDiffViewer] filePath:', filePath)
        console.log('[CodeMigrationDiffViewer] diff.original length:', diff.original?.length || 0)
        console.log('[CodeMigrationDiffViewer] diff.transformed length:', diff.transformed?.length || 0)
        console.log('[CodeMigrationDiffViewer] diff.unified length:', diff.unified?.length || 0)
        console.log('[CodeMigrationDiffViewer] transformedCode length:', transformedCode?.length || 0)
        
        if (!diff.original || diff.original.length === 0) {
          console.warn('[CodeMigrationDiffViewer] WARNING: diff.original is empty!')
        }
        if (!diff.transformed || diff.transformed.length === 0) {
          console.warn('[CodeMigrationDiffViewer] WARNING: diff.transformed is empty!')
        }
        
        return null
      })()}

      {/* Editable Diff Viewer */}
      <EditableDiffViewer
        diff={diff}
        filePath={filePath}
        onAccept={onAccept}
        onReject={onReject}
        initialContent={transformedCode}
        allFiles={allFiles}
        currentFileIndex={currentFileIndex}
        onNavigateFile={onNavigateFile}
      />
    </div>
  )
}
