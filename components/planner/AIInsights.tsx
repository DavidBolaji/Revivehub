'use client'

import { AlertCircle, Lightbulb, AlertTriangle, Zap } from 'lucide-react'
import type { AIInsight } from '@/lib/planner/types'
import { cn } from '@/lib/utils'

interface AIInsightsProps {
  insights: AIInsight[]
  title?: string
  showConfidence?: boolean
}

export function AIInsights({ insights, title = 'AI Insights', showConfidence = true }: AIInsightsProps) {
  if (insights.length === 0) {
    return null
  }

  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'tip':
        return <Lightbulb className="h-4 w-4" />
      case 'optimization':
        return <Zap className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-gradient-to-br from-purple-900/20 to-slate-900">
      {/* Spooky glow effect */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
      
      <div className="relative z-10 p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-300" />
            {title}
          </h3>
          <p className="text-sm text-purple-200 mt-1">
            AI-powered analysis and recommendations for your migration
          </p>
        </div>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={cn(
                'p-3 sm:p-4 rounded-lg border transition-all',
                insight.type === 'warning' && 'border-orange-500/30 bg-orange-900/20',
                insight.type === 'tip' && 'border-purple-500/30 bg-purple-900/20',
                insight.type === 'optimization' && 'border-purple-500/30 bg-purple-900/20'
              )}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className={cn(
                  'mt-0.5 shrink-0',
                  insight.type === 'warning' && 'text-orange-300',
                  insight.type === 'tip' && 'text-purple-300',
                  insight.type === 'optimization' && 'text-purple-300'
                )}>
                  {getIcon(insight.type)}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                    <p className="text-sm font-medium text-white break-words">{insight.message}</p>
                    {showConfidence && (
                      <span
                        className={cn(
                          'shrink-0 text-xs rounded-md px-2 py-0.5',
                          insight.confidence >= 85 && 'border border-purple-500/30 bg-purple-900/30 text-purple-200',
                          insight.confidence >= 70 && insight.confidence < 85 && 'border border-purple-500/30 bg-purple-900/30 text-purple-200',
                          insight.confidence < 70 && 'border border-purple-500/20 bg-slate-800/50 text-purple-300'
                        )}
                      >
                        {insight.confidence}% confident
                      </span>
                    )}
                  </div>

                  {insight.suggestedAction && (
                    <div className="text-xs sm:text-sm text-purple-200">
                      <span className="font-medium">Suggested action:</span> {insight.suggestedAction}
                    </div>
                  )}

                  {insight.affectedItems && insight.affectedItems.length > 0 && (
                    <div className="text-xs text-purple-300/80">
                      Affects: {insight.affectedItems.slice(0, 3).join(', ')}
                      {insight.affectedItems.length > 3 && ` +${insight.affectedItems.length - 3} more`}
                    </div>
                  )}

                  <span className="inline-block text-xs rounded-md border border-purple-500/30 bg-purple-900/30 px-2 py-0.5 text-purple-200">
                    {insight.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
