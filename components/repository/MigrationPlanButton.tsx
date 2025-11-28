'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'
import type { AnalysisReport } from '@/lib/scanner/types'
import type { EnhancedMigrationPlan } from '@/lib/planner/ai-enhancer'
import { extractSourceStack } from '@/lib/planner/utils/stack-extractor'
import { convertIssuesToPatterns } from '@/lib/planner/utils/pattern-converter'

interface MigrationPlanButtonProps {
  scanResults: AnalysisReport
  owner: string
  repo: string
  onPlanGenerated: (plan: EnhancedMigrationPlan) => void
  onPlanError: (error: string) => void
  onPlanStart?: () => void
  disabled?: boolean
}

const PROGRESS_MESSAGES = [
  'Analyzing codebase structure...',
  'Detecting legacy patterns...',
  'Generating migration phases...',
  'Optimizing task dependencies...',
  'Enhancing with AI insights...',
  'Finalizing migration plan...',
]

export function MigrationPlanButton({
  scanResults,
  owner,
  repo,
  onPlanGenerated,
  onPlanError,
  onPlanStart,
  disabled = false,
}: MigrationPlanButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressMessage, setProgressMessage] = useState('')

  const handleGeneratePlan = async () => {
    setIsGenerating(true)
    setProgressMessage(PROGRESS_MESSAGES[0])
    onPlanStart?.() // Notify parent component that plan generation has started

    try {
      // Cycle through progress messages
      const progressInterval = setInterval(() => {
        setProgressMessage((prev) => {
          const currentIndex = PROGRESS_MESSAGES.indexOf(prev)
          const nextIndex = (currentIndex + 1) % PROGRESS_MESSAGES.length
          return PROGRESS_MESSAGES[nextIndex]
        })
      }, 2000)

      // Extract source stack from scan results
      const sourceStack = extractSourceStack(scanResults)

      // Convert issues to patterns
      const patterns = convertIssuesToPatterns(scanResults.issues)

      // Prepare codebase stats from available data
      const totalLines = scanResults.languages.languages.reduce(
        (sum, lang) => sum + lang.linesOfCode,
        0
      )
      const totalFiles = scanResults.languages.languages.reduce(
        (sum, lang) => sum + lang.fileCount,
        0
      )

      const codebaseStats = {
        totalFiles,
        totalLines,
        testCoverage: 0, // Would be extracted from scan if available
      }

      // TODO: Allow user to select target framework
      // For now, use a default target based on source
      const targetStack = {
        framework: getDefaultTargetFramework(sourceStack.framework),
        version: 'latest',
        language: sourceStack.language,
        dependencies: {},
        features: ['typescript', 'modern-syntax', 'best-practices'],
      }

      // Extract health score from scan results
      const healthScore = scanResults.healthScore ? {
        total: scanResults.healthScore.total,
        buildHealth: scanResults.healthScore.categories?.buildHealth?.score,
      } : undefined

      // Call plan API
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          repo,
          source: sourceStack,
          target: targetStack,
          patterns,
          codebaseStats,
          enableAI: true,
          healthScore,
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        
        // Handle specific error cases
        if (response.status === 400) {
          if (errorData.details && Array.isArray(errorData.details)) {
            onPlanError(
              `Invalid configuration:\n${errorData.details.join('\n')}`
            )
          } else {
            onPlanError(
              errorData.error || 'Invalid stack configuration. Please verify the scan results and try again.'
            )
          }
        } else if (response.status === 503) {
          onPlanError(
            'AI service is temporarily unavailable. You can try again or proceed with a basic migration plan.'
          )
        } else if (response.status === 429) {
          onPlanError(
            'Rate limit exceeded. Please wait a moment before generating another plan.'
          )
        } else if (response.status >= 500) {
          onPlanError(
            `Server error occurred (${response.status}). Please try again in a few moments.`
          )
        } else {
          onPlanError(
            errorData.error || `Failed to generate migration plan (Error ${response.status})`
          )
        }
        return
      }

      const data = await response.json()
      
      if (!data.plan) {
        onPlanError('Plan generation completed but no plan was returned. Please try again.')
        return
      }
      
      onPlanGenerated(data.plan)
    } catch (error) {
      console.error('Error generating migration plan:', error)
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        onPlanError(
          'Network error: Unable to connect to the server. Please check your internet connection and try again.'
        )
      } else if (error instanceof Error && error.message.includes('timeout')) {
        onPlanError(
          'Plan generation timed out. This may happen with complex codebases. Please try again.'
        )
      } else {
        onPlanError(
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while generating the migration plan. Please try again.'
        )
      }
    } finally {
      setIsGenerating(false)
      setProgressMessage('')
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        onClick={handleGeneratePlan}
        disabled={disabled || isGenerating}
        size="lg"
        className="bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-700 hover:to-orange-700 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Plan...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Get Migration Plan
          </>
        )}
      </Button>

      {isGenerating && progressMessage && (
        <p className="text-sm text-purple-300 animate-pulse">
          {progressMessage}
        </p>
      )}
    </div>
  )
}

/**
 * Get default target framework based on source framework
 */
function getDefaultTargetFramework(sourceFramework: string): string {
  const frameworkMap: Record<string, string> = {
    'react': 'react',
    'vue': 'vue',
    'angular': 'angular',
    'next.js': 'next.js',
    'nuxt': 'nuxt',
    'express': 'express',
    'nest': 'nest',
  }

  const normalized = sourceFramework.toLowerCase()
  return frameworkMap[normalized] || sourceFramework
}
