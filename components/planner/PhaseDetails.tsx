'use client'

import { MigrationPhase } from '@/lib/planner/types'
import { TaskList } from './TaskList'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhaseDetailsProps {
  phase: MigrationPhase
  isExpanded: boolean
  onToggle: () => void
  enabledTransformations: Set<string>
  onToggleTransformation: (taskId: string) => void
  onExecuteTask?: (taskId: string) => void
}

export function PhaseDetails({
  phase,
  isExpanded,
  onToggle,
  enabledTransformations,
  onToggleTransformation,
  onExecuteTask,
}: PhaseDetailsProps) {
  const hours = Math.floor(phase.totalEstimatedMinutes / 60)
  const minutes = phase.totalEstimatedMinutes % 60
  const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

  return (
    <div className={cn(
      'relative overflow-hidden rounded-lg border transition-all',
      isExpanded 
        ? 'border-purple-500/40 bg-gradient-to-br from-purple-900/20 to-slate-900 shadow-lg shadow-purple-500/10' 
        : 'border-purple-500/20 bg-slate-900 hover:border-purple-500/30'
    )}>
      {/* Spooky glow effect when expanded */}
      {isExpanded && (
        <>
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl" />
        </>
      )}
      
      <div
        className="relative z-10 cursor-pointer p-4 sm:p-6 hover:bg-purple-900/10 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="mt-1 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-white break-words">{phase.name}</h3>
              <p className="mt-1 text-sm text-purple-200 break-words">{phase.description}</p>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-purple-300">
                <span className="whitespace-nowrap">⏱️ {timeStr}</span>
                <span className="whitespace-nowrap">📋 {phase.tasks.length} tasks</span>
                <span className="whitespace-nowrap">
                  ✅ {phase.tasks.filter((t) => t.type === 'automated').length} automated
                </span>
                <span className="whitespace-nowrap">
                  ⚠️ {phase.tasks.filter((t) => t.type !== 'automated').length} manual review
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="relative z-10 p-4 sm:p-6 pt-0">
          <TaskList
            tasks={phase.tasks}
            enabledTransformations={enabledTransformations}
            onToggleTransformation={onToggleTransformation}
            onExecuteTask={onExecuteTask}
          />
        </div>
      )}
    </div>
  )
}
