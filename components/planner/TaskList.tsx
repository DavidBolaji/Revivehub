'use client'

import { MigrationTask } from '@/lib/planner/types'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, AlertTriangle, FileCode, Clock, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { TaskDetailsModal } from './TaskDetailsModal'

interface TaskListProps {
  tasks: MigrationTask[]
  enabledTransformations: Set<string>
  onToggleTransformation: (taskId: string) => void
  onExecuteTask?: (taskId: string) => void
}

export function TaskList({ tasks, enabledTransformations, onToggleTransformation, onExecuteTask }: TaskListProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [expandedDependencies, setExpandedDependencies] = useState<Set<string>>(new Set())
  const [selectedTask, setSelectedTask] = useState<MigrationTask | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const toggleDependencyList = (taskId: string) => {
    setExpandedDependencies(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  // Extract dependency list from description if it's a dependency update task
  const extractDependencyList = (task: MigrationTask): { shortDescription: string; dependencies: string[] } | null => {
    if (!task.name.toLowerCase().includes('depend') && !task.name.toLowerCase().includes('package')) {
      return null
    }

    const description = task.description
    
    // Look for pattern: "dependencies: pkg1 (v1 → v2), pkg2 (v1 → v2), ..."
    const match = description.match(/behind:\s*(.+?)\.\s*Consider/i)
    if (!match) return null

    const depString = match[1]
    const dependencies = depString.split(',').map(d => d.trim()).filter(Boolean)

    if (dependencies.length === 0) return null

    // Create short description without the long list
    const shortDescription = description.replace(/:\s*(.+?)\.\s*Consider/, '. Consider')

    return {
      shortDescription,
      dependencies
    }
  }

  const handleTaskClick = (task: MigrationTask) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
  }

  const getDependencyTasks = (task: MigrationTask): MigrationTask[] => {
    return tasks.filter(t => task.dependencies.includes(t.id))
  }

  return (
    <>
      <div className="space-y-3">
        {tasks.map((task) => {
          const isEnabled = enabledTransformations.has(task.id)
          const isExpanded = expandedTasks.has(task.id)
          const isDependencyListExpanded = expandedDependencies.has(task.id)
          const dependencyInfo = extractDependencyList(task)

          return (
            <div
              key={task.id}
              className={cn(
                'group relative overflow-hidden rounded-lg border p-3 sm:p-4 transition-all cursor-pointer',
                isEnabled 
                  ? 'border-purple-500/20 bg-gradient-to-br from-slate-900 to-slate-800 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/10' 
                  : 'opacity-50 border-purple-500/10 bg-slate-900/50'
              )}
              onClick={() => handleTaskClick(task)}
            >
              {/* Hover glow effect */}
              {isEnabled && (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-orange-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
              )}
              <div className="space-y-3 relative z-10">
                {/* Task header */}
                <div className="flex items-start gap-2 sm:gap-3">
                  <Checkbox
                    id={task.id}
                    checked={isEnabled}
                    onCheckedChange={() => {
                      onToggleTransformation(task.id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                      <div className="font-medium text-white group-hover:text-purple-200 transition-colors text-sm sm:text-base break-words">
                        {task.name}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        {task.type === 'automated' ? (
                          <span className="flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-900/30 px-2 py-0.5 text-xs text-purple-200">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="hidden sm:inline">Automated</span>
                            <span className="sm:hidden">Auto</span>
                          </span>
                        ) : task.type === 'manual' ? (
                          <span className="flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-900/30 px-2 py-0.5 text-xs text-orange-200">
                            <AlertTriangle className="h-3 w-3" />
                            Manual
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-900/30 px-2 py-0.5 text-xs text-orange-200">
                            <AlertTriangle className="h-3 w-3" />
                            Review
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-xs',
                            task.riskLevel === 'high'
                              ? 'border border-red-500/30 bg-red-900/30 text-red-200'
                              : task.riskLevel === 'medium'
                              ? 'border border-orange-500/30 bg-orange-900/30 text-orange-200'
                              : 'border border-purple-500/30 bg-purple-900/30 text-purple-200'
                          )}
                        >
                          {task.riskLevel} risk
                        </span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-purple-200/80 mt-1 break-words">
                      {dependencyInfo ? dependencyInfo.shortDescription : task.description}
                    </p>

                    {/* Dependency list dropdown */}
                    {dependencyInfo && dependencyInfo.dependencies.length > 0 && (
                      <div className="mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleDependencyList(task.id)
                          }}
                          className="text-xs text-purple-300 hover:text-purple-200 hover:underline transition-colors flex items-center gap-1.5"
                        >
                          <Package className="h-3 w-3" />
                          <span>{isDependencyListExpanded ? '▼' : '▶'}</span>
                          <span>{isDependencyListExpanded ? 'Hide' : 'Show'} {dependencyInfo.dependencies.length} outdated dependencies</span>
                        </button>
                        {isDependencyListExpanded && (
                          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-2">
                            {dependencyInfo.dependencies.map((dep, idx) => (
                              <div
                                key={idx}
                                className="text-xs font-mono bg-slate-800/50 border border-purple-500/10 text-purple-200 px-2 py-1.5 rounded break-all hover:bg-slate-800/70 transition-colors"
                              >
                                📦 {dep}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Task metadata */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-purple-300">
                      <div className="flex items-center gap-1 whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {task.estimatedMinutes}m
                      </div>
                      {task.affectedFiles.length > 0 && (
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <FileCode className="h-3 w-3" />
                          {task.affectedFiles.length} files
                        </div>
                      )}
                      {task.dependencies.length > 0 && (
                        <div className="whitespace-nowrap">Depends on: {task.dependencies.length} tasks</div>
                      )}
                      {task.breakingChanges.length > 0 && (
                        <div className="flex items-center gap-1 text-orange-300 whitespace-nowrap">
                          <AlertTriangle className="h-3 w-3" />
                          {task.breakingChanges.length} breaking changes
                        </div>
                      )}
                    </div>

                    {/* Affected files preview */}
                    {task.affectedFiles.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleTask(task.id)
                          }}
                          className="text-xs text-purple-300 hover:text-purple-200 hover:underline transition-colors"
                        >
                          {isExpanded ? 'Hide' : 'Show'} affected files ({task.affectedFiles.length})
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-1">
                            {task.affectedFiles.slice(0, 5).map((file: string, idx: number) => (
                              <div
                                key={idx}
                                className="text-xs font-mono bg-slate-800/50 border border-purple-500/10 text-purple-200 px-2 py-1 rounded break-all"
                              >
                                {file}
                              </div>
                            ))}
                            {task.affectedFiles.length > 5 && (
                              <div className="text-xs text-purple-300/60 px-2">
                                +{task.affectedFiles.length - 5} more files
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <TaskDetailsModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onExecuteTask={onExecuteTask}
        dependencyTasks={selectedTask ? getDependencyTasks(selectedTask) : []}
      />
    </>
  )
}
