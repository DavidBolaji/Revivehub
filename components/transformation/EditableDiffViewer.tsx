"use client"

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import './vscode-diff-theme.css'
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
  Edit3,
  Save,
  RotateCcw,
  Loader2,
  SplitSquareHorizontal,
  AlignLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// Simple Textarea component
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"
// Simple Switch component
const Switch = React.forwardRef<
  React.ElementRef<"button">,
  React.ComponentPropsWithoutRef<"button"> & {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }
>(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
})
Switch.displayName = "Switch"
import { cn } from '@/lib/utils'
import type { Diff } from '@/types/transformer'

interface EditableDiffViewerProps {
  diff: Diff
  filePath: string
  onAccept: (modifiedContent?: string) => void
  onReject: () => void
  initialContent?: string
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

export const EditableDiffViewer: React.FC<EditableDiffViewerProps> = ({
  diff,
  filePath,
  onAccept,
  onReject,
  initialContent,
}) => {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'split' | 'inline'>('split')
  const [acceptedChanges, setAcceptedChanges] = useState<Set<number>>(new Set())
  const [rejectedChanges, setRejectedChanges] = useState<Set<number>>(new Set())
  
  const changeRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const originalScrollRef = useRef<HTMLDivElement>(null)
  const modifiedScrollRef = useRef<HTMLDivElement>(null)
  const language = useMemo(() => detectLanguage(filePath), [filePath])

  // Initialize edited content with the transformed content
  useEffect(() => {
    if (initialContent) {
      setEditedContent(initialContent)
    } else {
      // Reconstruct the transformed content from diff
      const transformedLines = diff.visual
        .filter(line => line.type !== 'removed')
        .map(line => line.content)
      setEditedContent(transformedLines.join('\n'))
    }
  }, [diff, initialContent])

  // Create a modified diff that shows the edited content in the "After" column
  const modifiedDiff = useMemo(() => {
    if (!hasUnsavedChanges && !isEditing) {
      return diff // Return original diff if no changes
    }

    // Create a new diff that shows the edited content
    const editedLines = editedContent.split('\n')
    const originalLines = diff.visual
      .filter(line => line.type !== 'added')
      .map(line => line.content)

    // Simple diff generation - in a real implementation, you'd use a proper diff algorithm
    const newVisual = []
    const maxLines = Math.max(editedLines.length, originalLines.length)

    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i]
      const editedLine = editedLines[i]

      if (originalLine !== undefined && editedLine !== undefined) {
        if (originalLine === editedLine) {
          // Unchanged line
          newVisual.push({
            type: 'unchanged' as const,
            content: originalLine,
            oldLineNumber: i + 1,
            newLineNumber: i + 1,
            lineNumber: i + 1
          })
        } else {
          // Modified line - show both old and new
          newVisual.push({
            type: 'removed' as const,
            content: originalLine,
            oldLineNumber: i + 1,
            lineNumber: i + 1
          })
          newVisual.push({
            type: 'added' as const,
            content: editedLine,
            newLineNumber: i + 1,
            lineNumber: i + 1
          })
        }
      } else if (originalLine !== undefined) {
        // Line removed
        newVisual.push({
          type: 'removed' as const,
          content: originalLine,
          oldLineNumber: i + 1,
          lineNumber: i + 1
        })
      } else if (editedLine !== undefined) {
        // Line added
        newVisual.push({
          type: 'added' as const,
          content: editedLine,
          newLineNumber: i + 1,
          lineNumber: i + 1
        })
      }
    }

    return {
      ...diff,
      visual: newVisual
    }
  }, [diff, editedContent, hasUnsavedChanges, isEditing])

  // Find all changes (added, removed, modified lines) using modified diff
  const changes = useMemo<Change[]>(() => {
    const changeList: Change[] = []
    modifiedDiff.visual.forEach((line, index) => {
      if (line.type !== 'unchanged') {
        changeList.push({ index, lineNumber: line.lineNumber })
      }
    })
    return changeList
  }, [modifiedDiff.visual])

  // Calculate summary statistics using the modified diff
  const summary = useMemo(() => {
    const currentDiff = modifiedDiff
    const added = currentDiff.visual.filter(l => l.type === 'added').length
    const removed = currentDiff.visual.filter(l => l.type === 'removed').length
    const modified = currentDiff.visual.filter(l => l.type === 'modified').length
    return { added, removed, modified, total: added + removed + modified }
  }, [modifiedDiff])

  // Track unsaved changes
  const handleContentChange = useCallback((value: string) => {
    setEditedContent(value)
    setHasUnsavedChanges(true)
  }, [])

  // Save changes
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 500))
    setHasUnsavedChanges(false)
    setIsSaving(false)
    
    // Show success message
    console.log('✅ Changes saved locally')
  }, [])

  // Reset to original transformed content
  const handleReset = useCallback(() => {
    if (initialContent) {
      setEditedContent(initialContent)
    } else {
      const transformedLines = diff.visual
        .filter(line => line.type !== 'removed')
        .map(line => line.content)
      setEditedContent(transformedLines.join('\n'))
    }
    setHasUnsavedChanges(false)
  }, [diff, initialContent])

  // Toggle editing mode
  const toggleEditing = useCallback(() => {
    if (isEditing && hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to exit editing mode?')) {
        return
      }
    }
    setIsEditing(!isEditing)
    setIsPreviewMode(false)
  }, [isEditing, hasUnsavedChanges])

  // Accept with modifications
  const handleAcceptWithChanges = useCallback(() => {
    onAccept(editedContent)
  }, [onAccept, editedContent])

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
  const handleScroll = useCallback((source: 'original' | 'modified') => {
    return (e: React.UIEvent<HTMLDivElement>) => {
      const sourceElement = e.currentTarget
      const targetElement = source === 'original' ? modifiedScrollRef.current : originalScrollRef.current
      
      if (targetElement && sourceElement) {
        // Sync scroll position
        targetElement.scrollTop = sourceElement.scrollTop
        targetElement.scrollLeft = sourceElement.scrollLeft
      }
    }
  }, [])

  // Accept a specific change
  const acceptChange = useCallback((index: number) => {
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
    setHasUnsavedChanges(true)
  }, [])

  // Reject a specific change
  const rejectChange = useCallback((index: number) => {
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
    setHasUnsavedChanges(true)
  }, [])

  // Apply accepted/rejected changes to generate final code
  const applyChangeSelections = useCallback(() => {
    const lines: string[] = []
    
    modifiedDiff.visual.forEach((line, index) => {
      const isAccepted = acceptedChanges.has(index)
      const isRejected = rejectedChanges.has(index)
      
      if (line.type === 'unchanged') {
        // Always include unchanged lines
        lines.push(line.content)
      } else if (line.type === 'added') {
        // Include added lines unless explicitly rejected
        if (!isRejected) {
          lines.push(line.content)
        }
      } else if (line.type === 'removed') {
        // Include removed lines only if explicitly accepted (to keep original)
        if (isAccepted) {
          lines.push(line.content)
        }
      }
    })
    
    const finalCode = lines.join('\n')
    setEditedContent(finalCode)
    setHasUnsavedChanges(true)
  }, [modifiedDiff.visual, acceptedChanges, rejectedChanges])

  // Apply selections when they change
  useEffect(() => {
    if (acceptedChanges.size > 0 || rejectedChanges.size > 0) {
      applyChangeSelections()
    }
  }, [acceptedChanges, rejectedChanges, applyChangeSelections])

  // Render a single line with VS Code-style syntax highlighting
  const renderLine = (
    content: string,
    lineType: 'added' | 'removed' | 'unchanged' | 'modified',
    lineNumber: number | undefined,
    index: number,
    oldLineNumber?: number,
    showActions: boolean = false
  ) => {
    const isChange = lineType !== 'unchanged'
    const isCurrentChange =
      isChange &&
      changes.findIndex(c => c.index === index) === currentChangeIndex
    
    const isAccepted = acceptedChanges.has(index)
    const isRejected = rejectedChanges.has(index)

    // VS Code-style colors with opacity for rejected changes
    const bgColor = {
      added: isRejected ? 'bg-gray-100 dark:bg-gray-800 opacity-50' : 'bg-[#e6ffec] dark:bg-[#1e4620]',
      removed: isAccepted ? 'bg-[#e6ffec] dark:bg-[#1e4620]' : 'bg-[#ffebe9] dark:bg-[#4b1818]',
      modified: 'bg-[#fff8e1] dark:bg-[#3d3d1f]',
      unchanged: 'bg-white dark:bg-[#1e1e1e]',
    }[lineType]

    const borderColor = {
      added: 'border-l-2 border-[#2ea043]',
      removed: 'border-l-2 border-[#cf222e]',
      modified: 'border-l-2 border-[#fb8500]',
      unchanged: '',
    }[lineType]

    const highlightedContent = highlightCode(content || ' ', language)

    return (
      <div
        ref={el => {
          if (el && isChange) {
            changeRefs.current.set(index, el)
          }
        }}
        className={cn(
          'group flex items-start font-mono text-[13px] leading-[20px] hover:bg-opacity-80 transition-colors relative',
          bgColor,
          borderColor,
          isCurrentChange && 'ring-1 ring-inset ring-blue-500'
        )}
      >
        {/* Line numbers - VS Code style with two columns for split view */}
        {showLineNumbers && viewMode === 'split' && (
          <>
            <div
              className={cn(
                'flex-shrink-0 w-12 px-2 py-0.5 text-right select-none text-[12px]',
                lineType === 'unchanged'
                  ? 'text-gray-400 dark:text-gray-600'
                  : lineType === 'removed'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-600'
              )}
            >
              {oldLineNumber !== undefined && lineType !== 'added' ? oldLineNumber : ''}
            </div>
            <div
              className={cn(
                'flex-shrink-0 w-12 px-2 py-0.5 text-right select-none text-[12px] border-r border-gray-200 dark:border-gray-700',
                lineType === 'unchanged'
                  ? 'text-gray-400 dark:text-gray-600'
                  : lineType === 'added'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-600'
              )}
            >
              {lineNumber !== undefined && lineType !== 'removed' ? lineNumber : ''}
            </div>
          </>
        )}

        {/* Single line number for inline view */}
        {showLineNumbers && viewMode === 'inline' && (
          <div
            className={cn(
              'flex-shrink-0 w-12 px-2 py-0.5 text-right select-none text-[12px] border-r border-gray-200 dark:border-gray-700',
              lineType === 'unchanged'
                ? 'text-gray-400 dark:text-gray-600'
                : lineType === 'added'
                ? 'text-green-600 dark:text-green-400'
                : lineType === 'removed'
                ? 'text-red-600 dark:text-red-400'
                : 'text-yellow-600 dark:text-yellow-400'
            )}
          >
            {lineNumber !== undefined ? lineNumber : ''}
          </div>
        )}

        {/* Change indicator for inline view */}
        {viewMode === 'inline' && (
          <div className="flex-shrink-0 w-6 flex items-center justify-center text-[11px] font-bold">
            {lineType === 'added' && <span className="text-green-600">+</span>}
            {lineType === 'removed' && <span className="text-red-600">-</span>}
            {lineType === 'modified' && <span className="text-yellow-600">~</span>}
          </div>
        )}

        {/* Line content with better spacing */}
        <div
          className="flex-1 px-4 py-0.5 overflow-x-auto whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />

        {/* VS Code-style inline actions */}
        {showActions && isChange && !isEditing && (
          <div className="absolute right-2 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Debug: Show what buttons should appear */}
            {(() => {
              if (lineType === 'removed' && isAccepted) {
                console.log(`[DiffViewer] Line ${index}: removed + accepted, should show Remove button`)
              }
              return null
            })()}
            
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
                  setHasUnsavedChanges(true)
                }}
                className="px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded shadow-sm"
                title="Accept this change"
              >
                ✓
              </button>
            )}
            {lineType === 'removed' && !isAccepted && (
              <button
                onClick={() => {
                  console.log(`[DiffViewer] Accepting (keeping) line ${index}`)
                  acceptChange(index)
                }}
                className="px-2 py-0.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded shadow-sm"
                title="Keep original (reject removal)"
              >
                ✓ Keep
              </button>
            )}
            {lineType === 'removed' && isAccepted && (
              <button
                onClick={() => {
                  console.log(`[DiffViewer] Removing (un-accepting) line ${index}`)
                  setAcceptedChanges(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(index)
                    return newSet
                  })
                  setHasUnsavedChanges(true)
                }}
                className="px-2 py-0.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded shadow-sm"
                title="Remove this line (undo keep)"
              >
                ✕ Remove
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render preview of edited content - VS Code style
  const renderPreview = () => {
    const lines = editedContent.split('\n')
    return (
      <div className="overflow-auto max-h-[600px] bg-white dark:bg-[#0d1117]">
        <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Preview (Edited)
          </h3>
        </div>
        {lines.map((line, index) => (
          <div
            key={index}
            className="flex items-start font-mono text-[13px] leading-[20px] hover:bg-gray-50 dark:hover:bg-[#1e1e1e] transition-colors"
          >
            {showLineNumbers && (
              <div className="flex-shrink-0 w-12 px-2 py-0.5 text-right select-none text-[12px] text-gray-400 dark:text-gray-600 border-r border-gray-200 dark:border-gray-700">
                {index + 1}
              </div>
            )}
            <div
              className="flex-1 px-4 py-0.5 overflow-x-auto whitespace-pre"
              dangerouslySetInnerHTML={{ __html: highlightCode(line || ' ', language) }}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 vscode-diff-viewer">
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
                {hasUnsavedChanges && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Unsaved Changes
                  </Badge>
                )}
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
            
            {/* Action buttons */}
            <div className="flex items-center space-x-2 ml-4">
              {/* Edit mode toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleEditing}
                className={cn(
                  isEditing && "bg-blue-50 border-blue-300 text-blue-700"
                )}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {isEditing ? 'Exit Edit' : 'Edit'}
              </Button>
              
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
                onClick={handleAcceptWithChanges}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accept{hasUnsavedChanges ? ' Changes' : ''}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* View controls - Always visible */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* View mode toggle */}
              <div className="flex items-center space-x-2 border rounded-md p-1">
                <Button
                  variant={viewMode === 'split' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('split')}
                  className="h-7 px-2"
                >
                  <SplitSquareHorizontal className="h-3.5 w-3.5 mr-1" />
                  Split
                </Button>
                <Button
                  variant={viewMode === 'inline' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('inline')}
                  className="h-7 px-2"
                >
                  <AlignLeft className="h-3.5 w-3.5 mr-1" />
                  Inline
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={showLineNumbers}
                  onCheckedChange={setShowLineNumbers}
                  id="line-numbers"
                />
                <label htmlFor="line-numbers" className="text-sm cursor-pointer">
                  Line numbers
                </label>
              </div>

              {isEditing && (
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isPreviewMode}
                    onCheckedChange={setIsPreviewMode}
                    id="preview-mode"
                  />
                  <label htmlFor="preview-mode" className="text-sm cursor-pointer">
                    Preview mode
                  </label>
                </div>
              )}
            </div>
            
            {isEditing && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={!hasUnsavedChanges}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges || isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation controls */}
      {!isEditing && changes.length > 0 && (
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

      {/* Content display - VS Code style */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isEditing ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
              {/* Editor */}
              <div className="overflow-hidden">
                <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Editor
                  </h3>
                </div>
                <div className="p-4 bg-white dark:bg-[#0d1117]">
                  <Textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(e.target.value)}
                    className="min-h-[500px] font-mono text-[13px] leading-[20px] resize-none border-gray-300 dark:border-gray-700 bg-white dark:bg-[#0d1117] text-gray-900 dark:text-gray-100"
                    placeholder="Edit your content here..."
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="overflow-hidden">
                {isPreviewMode ? renderPreview() : (
                  <div className="overflow-auto max-h-[600px] bg-white dark:bg-[#0d1117]">
                    <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        {hasUnsavedChanges ? 'Updated Diff' : 'Original Diff'}
                      </h3>
                    </div>
                    {modifiedDiff.visual.map((line, index) => (
                      <div key={index}>
                        {renderLine(
                          line.content,
                          line.type,
                          line.newLineNumber || line.oldLineNumber,
                          index,
                          line.oldLineNumber,
                          false
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === 'split' ? (
            /* Split-pane diff view - VS Code style */
            <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
              {/* Before (Original) */}
              <div className="overflow-hidden">
                <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Original
                  </h3>
                </div>
                <div 
                  ref={originalScrollRef}
                  onScroll={handleScroll('original')}
                  className="overflow-auto max-h-[600px] bg-white dark:bg-[#0d1117]"
                >
                  {modifiedDiff.visual.map((line, index) => {
                    if (line.type === 'removed' || line.type === 'unchanged') {
                      return (
                        <div key={index}>
                          {renderLine(
                            line.content,
                            line.type,
                            line.oldLineNumber,
                            index,
                            line.oldLineNumber,
                            true
                          )}
                        </div>
                      )
                    }
                    if (line.type === 'added') {
                      return (
                        <div
                          key={index}
                          className="flex items-start font-mono text-[13px] leading-[20px] bg-gray-50 dark:bg-[#1e1e1e] opacity-30"
                        >
                          {showLineNumbers && (
                            <>
                              <div className="flex-shrink-0 w-12 px-2 py-0.5" />
                              <div className="flex-shrink-0 w-12 px-2 py-0.5 border-r border-gray-200 dark:border-gray-700" />
                            </>
                          )}
                          <div className="flex-1 px-4 py-0.5">&nbsp;</div>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>

              {/* After (Modified) */}
              <div className="overflow-hidden">
                <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Modified
                  </h3>
                </div>
                <div 
                  ref={modifiedScrollRef}
                  onScroll={handleScroll('modified')}
                  className="overflow-auto max-h-[600px] bg-white dark:bg-[#0d1117]"
                >
                  {modifiedDiff.visual.map((line, index) => {
                    const isAccepted = acceptedChanges.has(index)
                    
                    // Show added lines and unchanged lines
                    if (line.type === 'added' || line.type === 'unchanged') {
                      return (
                        <div key={index}>
                          {renderLine(
                            line.content,
                            line.type,
                            line.newLineNumber,
                            index,
                            line.oldLineNumber,
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
                            line.oldLineNumber,
                            true
                          )}
                        </div>
                      )
                    }
                    // Show empty space for removed lines that haven't been kept
                    if (line.type === 'removed') {
                      return (
                        <div
                          key={index}
                          className="flex items-start font-mono text-[13px] leading-[20px] bg-gray-50 dark:bg-[#1e1e1e] opacity-30"
                        >
                          {showLineNumbers && (
                            <>
                              <div className="flex-shrink-0 w-12 px-2 py-0.5" />
                              <div className="flex-shrink-0 w-12 px-2 py-0.5 border-r border-gray-200 dark:border-gray-700" />
                            </>
                          )}
                          <div className="flex-1 px-4 py-0.5">&nbsp;</div>
                        </div>
                      )
                    }
                    return null
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Inline diff view - VS Code style */
            <div className="overflow-hidden">
              <div className="bg-[#f6f8fa] dark:bg-[#161b22] px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Changes
                </h3>
              </div>
              <div className="overflow-auto max-h-[600px] bg-white dark:bg-[#0d1117]">
                {modifiedDiff.visual.map((line, index) => (
                  <div key={index}>
                    {renderLine(
                      line.content,
                      line.type,
                      line.newLineNumber || line.oldLineNumber,
                      index,
                      line.oldLineNumber,
                      true
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
              onClick={handleAcceptWithChanges}
              className="min-w-[140px] bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Accept{hasUnsavedChanges ? ' Changes' : ' File'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EditableDiffViewer