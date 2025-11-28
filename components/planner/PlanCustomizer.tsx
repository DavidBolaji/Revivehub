'use client'

import { MigrationPlan } from '@/lib/planner/types'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Settings2, Download, Share2 } from 'lucide-react'
import { useState } from 'react'

interface PlanCustomizerProps {
  plan: MigrationPlan
  enabledTransformations: Set<string>
  onToggleTransformation: (taskId: string) => void
}

export function PlanCustomizer({
  plan,
  enabledTransformations,
  onToggleTransformation,
}: PlanCustomizerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const allTaskIds = plan.phases.flatMap(p => p.tasks.map(t => t.id))
  const allEnabled = allTaskIds.every(id => enabledTransformations.has(id))
  const automatedTaskIds = plan.phases.flatMap(p => 
    p.tasks.filter(t => t.type === 'automated').map(t => t.id)
  )
  const manualTaskIds = plan.phases.flatMap(p => 
    p.tasks.filter(t => t.type !== 'automated').map(t => t.id)
  )

  const toggleAll = () => {
    if (allEnabled) {
      allTaskIds.forEach(id => {
        if (enabledTransformations.has(id)) {
          onToggleTransformation(id)
        }
      })
    } else {
      allTaskIds.forEach(id => {
        if (!enabledTransformations.has(id)) {
          onToggleTransformation(id)
        }
      })
    }
  }

  const toggleAutomatedOnly = () => {
    const allAutomatedEnabled = automatedTaskIds.every(id => enabledTransformations.has(id))
    
    if (allAutomatedEnabled) {
      automatedTaskIds.forEach(id => {
        if (enabledTransformations.has(id)) {
          onToggleTransformation(id)
        }
      })
    } else {
      automatedTaskIds.forEach(id => {
        if (!enabledTransformations.has(id)) {
          onToggleTransformation(id)
        }
      })
    }
  }

  const handleExport = async () => {
    const exportData = {
      plan,
      enabledTransformations: Array.from(enabledTransformations),
      exportedAt: new Date().toISOString(),
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `migration-plan-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-lg border border-purple-500/20 bg-slate-900">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-purple-300" />
              Customize Plan
            </h3>
            <p className="text-sm text-purple-200 mt-1">
              Toggle transformations and adjust the migration plan
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg border border-purple-500/20 bg-slate-800 px-4 py-2 text-sm text-purple-200 transition-all hover:border-purple-500/40 hover:bg-slate-700"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-6 pt-0 space-y-6">
          {/* Quick toggles */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-white">Quick Actions</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 border border-purple-500/20 bg-slate-800/50 rounded-lg">
                <Label htmlFor="toggle-all" className="cursor-pointer">
                  <div className="font-medium text-white">All Tasks</div>
                  <div className="text-xs text-purple-300">
                    {enabledTransformations.size} of {allTaskIds.length} enabled
                  </div>
                </Label>
                <Switch
                  id="toggle-all"
                  checked={allEnabled}
                  onCheckedChange={toggleAll}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-purple-500/20 bg-slate-800/50 rounded-lg">
                <Label htmlFor="toggle-automated" className="cursor-pointer">
                  <div className="font-medium text-white">Automated Only</div>
                  <div className="text-xs text-purple-300">
                    {automatedTaskIds.filter(id => enabledTransformations.has(id)).length} of{' '}
                    {automatedTaskIds.length} tasks
                  </div>
                </Label>
                <Switch
                  id="toggle-automated"
                  checked={automatedTaskIds.every(id => enabledTransformations.has(id))}
                  onCheckedChange={toggleAutomatedOnly}
                />
              </div>

              <div className="flex items-center justify-between p-3 border border-purple-500/20 bg-slate-800/50 rounded-lg">
                <Label className="cursor-pointer">
                  <div className="font-medium text-white">Manual Review</div>
                  <div className="text-xs text-purple-300">
                    {manualTaskIds.filter(id => enabledTransformations.has(id)).length} of{' '}
                    {manualTaskIds.length} tasks
                  </div>
                </Label>
                <span className="text-xs rounded-md border border-purple-500/30 bg-purple-900/30 px-2 py-0.5 text-purple-200">Info</span>
              </div>
            </div>
          </div>

          {/* Phase breakdown */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-white">Phase Breakdown</h4>
            <div className="space-y-2">
              {plan.phases.map((phase, idx) => {
                const phaseTaskIds = phase.tasks.map(t => t.id)
                const enabledCount = phaseTaskIds.filter(id => 
                  enabledTransformations.has(id)
                ).length

                return (
                  <div
                    key={phase.id}
                    className="flex items-center justify-between p-3 border border-purple-500/20 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white">
                        Phase {idx + 1}: {phase.name}
                      </div>
                      <div className="text-xs text-purple-300">
                        {enabledCount} of {phaseTaskIds.length} tasks enabled
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-24 sm:w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-orange-500 transition-all"
                          style={{
                            width: `${(enabledCount / phaseTaskIds.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-purple-300 w-10 text-right">
                        {Math.round((enabledCount / phaseTaskIds.length) * 100)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Export options */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-white">Export & Share</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-slate-800 px-4 py-2 text-sm text-purple-200 transition-all hover:border-purple-500/40 hover:bg-slate-700"
              >
                <Download className="h-4 w-4" />
                Export Plan
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-slate-800 px-4 py-2 text-sm text-purple-200 transition-all hover:border-purple-500/40 hover:bg-slate-700">
                <Share2 className="h-4 w-4" />
                Share Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
