"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-markdown'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Diff } from '@/types/transformer'

interface DiffViewerProps {
  diff: Diff
  filePath: string
  onAccept: () => void
  onReject: () => void
}

interface Change {
  index: number
  lineNumber: number
}

// Detect language from file extension
const detectLanguage = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    json: 'json',
    css: 'css',
    scss: 'css',
    py: 'python',
    md: 'markdown',
    html: 'markup',
    xml: 'markup',
  }
  return languageMap[ext || ''] || 'javascript'
}

// Highlight code with Prism
const highlightCode = (code: string, language: string): string => {
  try {
    const grammar = Prism.languages[language]
    if (grammar) {
      return Prism.highlight(code, grammar, language)
    }
  } catch (error) {
    console.warn('Syntax highlighting failed:', error)
  }
  return code
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  diff,
  filePath,
  onAccept,
  onReject,
}) => {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const [acceptedChanges, setAcceptedChanges] = useState<Set<number>>(new Set())
  const [rejectedChanges, setRejectedChanges] = useState<Set<number>>(new Set())
  const changeRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const beforeScrollRef = useRef<HTMLDivElement>(null)
  const afterScrollRef = useRef<HTMLDivElement>(null)
  const language = useMemo(() => detectLanguage(filePath), [filePath])

  // Find all changes (added, removed, modified lines)
  const changes = useMemo<Change[]>(() => {
    const changeList: Change[] = []
    diff.visual.forEach((line, index) => {
      if (line.type !== 'unchanged') {
        changeList.push({ index, lineNumber: line.lineNumber })
      }
    })
    return changeList
  }, [diff.visual])

  // Calculate summary statistics
  const summary = useMemo(() => {
    const added = diff.visual.filter(l => l.type === 'added').length
    const removed = diff.visual.filter(l => l.type === 'removed').length
    const modified = diff.visual.filter(l => l.type === 'modified').length
    return { added, removed, modified, total: added + removed + modified }
  }, [diff.visual])

  // Scroll to current change
  useEffect(() => {
    if (changes.length > 0 && currentChangeIndex < changes.length) {
      const change = changes[currentChangeIndex]
      const element = changeRefs.current.get(change.index)
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      }
    }
  }, [currentChangeIndex, changes])

  const goToPreviousChange = () => {
    if (currentChangeIndex > 0) {
      setCurrentChangeIndex(currentChangeIndex - 1)
    }
  }

  const goToNextChange = () => {
    if (currentChangeIndex < changes.length - 1) {
      setCurrentChangeIndex(currentChangeIndex + 1)
    }
  }

  // Synchronized scrolling for split view
  const handleScroll = (source: 'before' | 'after') => {
    return (e: React.UIEvent<HTMLDivElement>) => {
      const sourceElement = e.currentTarget
      const targetElement = source === 'before' ? afterScrollRef.current : beforeScrollRef.current
      
      if (targetElement && sourceElement) {
        // Sync scroll position
        targetElement.scrollTop = sourceElement.scrollTop
        targetElement.scrollLeft = sourceElement.scrollLeft
      }
    }
  }

  // Accept a specific change
  const acceptChange = (index: number) => {
    setAcceptedChanges(prev => {
      const newSet = new Set(prev)
      newSet.add(index)
      return newSet
    })
    setRejectedChanges(prev => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }

  // Reject a specific change
  const rejectChange = (index: number) => {
    setRejectedChanges(prev => {
      const newSet = new Set(prev)
      newSet.add(index)
      return newSet
    })
    setAcceptedChanges(prev => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }

  // Render a single line with syntax highlighting
  const renderLine = (
    content: string,
    lineType: 'added' | 'removed' | 'unchanged' | 'modified',
    lineNumber: number | undefined,
    index: number,
    showActions: boolean = false
  ) => {
    const isChange = lineType !== 'unchanged'
    const isCurrentChange =
      isChange &&
      changes.findIndex(c => c.index === index) === currentChangeIndex
    
    const isAccepted = acceptedChanges.has(index)
    const isRejected = rejectedChanges.has(index)

    const bgColor = {
      added: isRejected ? 'bg-gray-100 opacity-50 border-l-4 border-gray-300' : 'bg-green-50 border-l-4 border-green-500',
      removed: isAccepted ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500',
      modified: 'bg-yellow-50 border-l-4 border-yellow-500',
      unchanged: 'bg-white',
    }[lineType]

    const highlightedContent = highlightCode(content, language)

    return (
      <div
        ref={el => {
          if (el && isChange) {
            changeRefs.current.set(index, el)
          }
        }}
        className={cn(
          'group flex items-start font-mono text-sm leading-relaxed relative',
          bgColor,
          isCurrentChange && 'ring-2 ring-blue-500 ring-inset'
        )}
      >
        {/* Line number */}
        <div
          className={cn(
            'flex-shrink-0 w-12 px-2 py-1 text-right select-none',
            lineType === 'unchanged'
              ? 'text-gray-400'
              : lineType === 'added'
              ? 'text-green-700 font-semibold'
              : lineType === 'removed'
              ? 'text-red-700 font-semibold'
              : 'text-yellow-700 font-semibold'
          )}
        >
          {lineNumber !== undefined ? lineNumber : ''}
        </div>

        {/* Line content */}
        <div
          className="flex-1 px-3 py-1 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />

        {/* VS Code-style inline actions */}
        {showActions && isChange && (
          <div className="absolute right-2 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {lineType === 'added' && !isRejected && (
              <button
                onClick={() => rejectChange(index)}
                className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded shadow-sm"
                title="Reject this change"
              >
                ✕
              </button>
            )}
            {lineType === 'added' && isRejected && (
              <button
                onClick={() => {
                  setRejectedChanges(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(index)
                    return newSet
                  })
                }}
                className="px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded shadow-sm"
                title="Accept this change"
              >
                ✓
              </button>
            )}
            {lineType === 'removed' && !isAccepted && (
              <button
                onClick={() => acceptChange(index)}
                className="px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded shadow-sm"
                title="Keep original (reject removal)"
              >
                ✓ Keep
              </button>
            )}
            {lineType === 'removed' && isAccepted && (
              <button
                onClick={() => {
                  setAcceptedChanges(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(index)
                    return newSet
                  })
                }}
                className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded shadow-sm"
                title="Remove this line"
              >
                ✕ Remove
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with file path and summary */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg font-mono break-all">
                  {filePath}
                </CardTitle>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-semibold">
                    +{summary.added}
                  </span>
                  <span className="text-gray-500">added</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <span className="text-red-700 font-semibold">
                    -{summary.removed}
                  </span>
                  <span className="text-gray-500">removed</span>
                </div>
                {summary.modified > 0 && (
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-700 font-semibold">
                      ~{summary.modified}
                    </span>
                    <span className="text-gray-500">modified</span>
                  </div>
                )}
                <Badge variant="secondary" className="ml-2">
                  {summary.total} changes
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onAccept}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation controls */}
      {changes.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Change {currentChangeIndex + 1} of {changes.length}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousChange}
                  disabled={currentChangeIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextChange}
                  disabled={currentChangeIndex === changes.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split-pane diff view */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-2 divide-x">
            {/* Before (Original) */}
            <div className="overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">
                  Before
                </h3>
              </div>
              <div 
                ref={beforeScrollRef}
                onScroll={handleScroll('before')}
                className="overflow-auto max-h-[600px]"
              >
                {diff.visual.map((line, index) => {
                  // Show removed and unchanged lines on the left
                  if (line.type === 'removed' || line.type === 'unchanged') {
                    return (
                      <div key={index}>
                        {renderLine(
                          line.content,
                          line.type,
                          line.oldLineNumber,
                          index,
                          true
                        )}
                      </div>
                    )
                  }
                  // For added lines, show empty space on left
                  if (line.type === 'added') {
                    return (
                      <div
                        key={index}
                        className="flex items-start font-mono text-sm leading-relaxed bg-gray-50"
                      >
                        <div className="flex-shrink-0 w-12 px-2 py-1 text-right select-none text-gray-300">
                          
                        </div>
                        <div className="flex-1 px-3 py-1 text-gray-300">
                          
                        </div>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>

            {/* After (Transformed) */}
            <div className="overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b">
                <h3 className="text-sm font-semibold text-gray-700">After</h3>
              </div>
              <div 
                ref={afterScrollRef}
                onScroll={handleScroll('after')}
                className="overflow-auto max-h-[600px]"
              >
                {diff.visual.map((line, index) => {
                  const isAccepted = acceptedChanges.has(index)
                  
                  // Show added and unchanged lines on the right
                  if (line.type === 'added' || line.type === 'unchanged') {
                    return (
                      <div key={index}>
                        {renderLine(
                          line.content,
                          line.type,
                          line.newLineNumber,
                          index,
                          true
                        )}
                      </div>
                    )
                  }
                  // Show removed lines that have been "kept" (accepted)
                  if (line.type === 'removed' && isAccepted) {
                    return (
                      <div key={index}>
                        {renderLine(
                          line.content,
                          line.type,
                          line.oldLineNumber,
                          index,
                          true
                        )}
                      </div>
                    )
                  }
                  // For removed lines that haven't been kept, show empty space on right
                  if (line.type === 'removed') {
                    return (
                      <div
                        key={index}
                        className="flex items-start font-mono text-sm leading-relaxed bg-gray-50"
                      >
                        <div className="flex-shrink-0 w-12 px-2 py-1 text-right select-none text-gray-300">
                          
                        </div>
                        <div className="flex-1 px-3 py-1 text-gray-300">
                          
                        </div>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons at bottom */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center space-x-3">
            <Button
              variant="outline"
              size="lg"
              onClick={onReject}
              className="min-w-[140px]"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Reject File
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={onAccept}
              className="min-w-[140px] bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Accept File
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DiffViewer
