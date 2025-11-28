'use client'

import { MigrationPhase } from '@/lib/planner/types'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhaseTimelineProps {
  phases: MigrationPhase[]
  expandedPhases: Set<string>
  onTogglePhase: (phaseId: string) => void
}

export function PhaseTimeline({ phases, expandedPhases, onTogglePhase }: PhaseTimelineProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-purple-500/20 bg-slate-900 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <span className="text-xl">📅</span>
        Migration Timeline
      </h3>
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500/50 to-orange-500/50" />

        {/* Phases */}
        <div className="space-y-6">
          {phases.map((phase, index) => {
            const isExpanded = expandedPhases.has(phase.id)
            const hours = Math.floor(phase.totalEstimatedMinutes / 60)
            const minutes = phase.totalEstimatedMinutes % 60
            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

            return (
              <div key={phase.id} className="relative pl-16">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                    isExpanded
                      ? 'border-purple-500 bg-purple-500 shadow-lg shadow-purple-500/50'
                      : 'border-purple-500/30 bg-slate-900'
                  )}
                >
                  {isExpanded ? (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  ) : (
                    <Circle className="h-2 w-2 fill-purple-500/50" />
                  )}
                </div>

                {/* Phase card */}
                <button
                  onClick={() => onTogglePhase(phase.id)}
                  className={cn(
                    'w-full text-left transition-all',
                    'hover:scale-[1.02] active:scale-[0.98]'
                  )}
                >
                  <div
                    className={cn(
                      'p-4 rounded-lg border cursor-pointer transition-all',
                      isExpanded
                        ? 'border-purple-500/40 bg-gradient-to-br from-purple-900/30 to-slate-900 shadow-lg shadow-purple-500/10'
                        : 'border-purple-500/20 bg-slate-900/50 hover:border-purple-500/30 hover:bg-slate-800/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs rounded-md border border-purple-500/30 bg-purple-900/30 px-2 py-0.5 text-purple-200">
                            Phase {index + 1}
                          </span>
                          <h4 className="font-semibold text-white">{phase.name}</h4>
                        </div>
                        <p className="text-sm text-purple-200/80 mb-2">
                          {phase.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-purple-300">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeStr}
                          </div>
                          <div>{phase.tasks.length} tasks</div>
                          <div>
                            {phase.tasks.filter((t) => t.type === 'automated').length} automated
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={cn(
                            'text-xs rounded-md px-2 py-0.5',
                            phase.tasks.some((t) => t.riskLevel === 'high')
                              ? 'border border-red-500/30 bg-red-900/30 text-red-200'
                              : phase.tasks.some((t) => t.riskLevel === 'medium')
                              ? 'border border-orange-500/30 bg-orange-900/30 text-orange-200'
                              : 'border border-purple-500/30 bg-purple-900/30 text-purple-200'
                          )}
                        >
                          {phase.tasks.some((t) => t.riskLevel === 'high')
                            ? 'High Risk'
                            : phase.tasks.some((t) => t.riskLevel === 'medium')
                            ? 'Medium Risk'
                            : 'Low Risk'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
