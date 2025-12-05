"use client"

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Clock, AlertTriangle, FileText, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MigrationPlan, Task, Phase } from '@/types/transformer'

interface TaskSelectorProps {
  migrationPlan: MigrationPlan
  selectedTaskIds: Set<string>
  onSelectionChange: (taskIds: Set<string>) => void
}

interface TaskItemProps {
  task: Task
  isSelected: boolean
  onToggle: (taskId: string, checked: boolean) => void
}

interface PhaseItemProps {
  phase: Phase
  selectedTaskIds: Set<string>
  onTaskToggle: (taskId: string, checked: boolean) => void
  isExpanded: boolean
  onToggleExpanded: () => void
}

const getRiskLevelColor = (riskLevel: 'low' | 'medium' | 'high') => {
  switch (riskLevel) {
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getTaskTypeIcon = (type: 'automated' | 'manual' | 'review') => {
  switch (type) {
    case 'automated':
      return <Zap className="h-4 w-4 text-blue-500" />
    case 'manual':
      return <FileText className="h-4 w-4 text-orange-500" />
    case 'review':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    default:
      return null
  }
}

const TaskItem: React.FC<TaskItemProps> = ({ task, isSelected, onToggle }) => {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start space-x-3">
        <Checkbox
          id={task.id}
          checked={isSelected}
          onCheckedChange={(checked) => onToggle(task.id, checked as boolean)}
          className="mt-1"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                {getTaskTypeIcon(task.type)}
                <h4 className="font-medium text-gray-900">{task.name}</h4>
              </div>
              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <Badge
                variant="outline"
                className={cn("text-xs", getRiskLevelColor(task.riskLevel))}
              >
                {task.riskLevel} risk
              </Badge>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{task.estimatedMinutes}m</span>
              {task.automatedMinutes != null && task.automatedMinutes > 0 && (
                <span className="text-green-600">
                  ({task.automatedMinutes}m automated)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>{task?.affectedFiles && task.affectedFiles.length} files</span>
            </div>
          </div>

          {task?.affectedFiles && task.affectedFiles.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Affected Files:</p>
              <div className="flex flex-wrap gap-1">
                {task.affectedFiles.slice(0, 3).map((file, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {file}
                  </Badge>
                ))}
                {task.affectedFiles.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{task.affectedFiles.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {task.breakingChanges && task.breakingChanges.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <p className="text-xs font-medium text-orange-700">Breaking Changes:</p>
              </div>
              <ul className="text-xs text-orange-600 space-y-1 ml-5">
                {task.breakingChanges.map((change, index) => (
                  <li key={index} className="list-disc">
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {task.dependencies.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-700">Dependencies:</p>
              <div className="flex flex-wrap gap-1">
                {task.dependencies.map((dep, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {dep}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const PhaseItem: React.FC<PhaseItemProps> = ({
  phase,
  selectedTaskIds,
  onTaskToggle,
  isExpanded,
  onToggleExpanded,
}) => {
  const selectedTasksInPhase = phase.tasks.filter(task => selectedTaskIds.has(task.id))
  const allTasksSelected = phase.tasks.length > 0 && selectedTasksInPhase.length === phase.tasks.length

  const handlePhaseToggle = () => {
    const shouldSelectAll = !allTasksSelected
    phase.tasks.forEach(task => {
      onTaskToggle(task.id, shouldSelectAll)
    })
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={allTasksSelected}
              onCheckedChange={handlePhaseToggle}
            />
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center space-x-2">
                <span>Phase {phase.order}: {phase.name}</span>
                <Badge
                  variant="outline"
                  className={cn("text-xs", getRiskLevelColor(phase.riskLevel))}
                >
                  {phase.riskLevel} risk
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                <span>{phase.tasks.length} tasks</span>
                <span>{phase.totalEstimatedMinutes}m total</span>
                <span>{phase.totalAutomatedMinutes}m automated</span>
                {selectedTasksInPhase.length > 0 && (
                  <span className="text-blue-600 font-medium">
                    {selectedTasksInPhase.length} selected
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpanded}
            className="ml-2"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-3">
            {phase.tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                isSelected={selectedTaskIds.has(task.id)}
                onToggle={onTaskToggle}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({
  migrationPlan,
  selectedTaskIds,
  onSelectionChange,
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())

  // Calculate summary statistics
  const summary = useMemo(() => {
    const selectedTasks = migrationPlan.phases
      .flatMap(phase => phase.tasks)
      .filter(task => selectedTaskIds.has(task.id))

    return {
      totalSelected: selectedTasks.length,
      totalEstimatedTime: selectedTasks.reduce((sum, task) => sum + (task?.estimatedMinutes && task.estimatedMinutes ? task.estimatedMinutes: 0), 0),
      totalAutomatedTime: selectedTasks.reduce((sum, task) => sum + (task?.automatedMinutes && task.automatedMinutes ? task.automatedMinutes: 0), 0),
      highRiskTasks: selectedTasks.filter(task => task.riskLevel === 'high').length,
      breakingChanges: selectedTasks.reduce((sum, task) => sum + (task.breakingChanges ? task.breakingChanges.length: 0), 0),
    }
  }, [migrationPlan, selectedTaskIds])

  const handleTaskToggle = (taskId: string, checked: boolean) => {
    const newSelection = new Set(selectedTaskIds)
    
    if (checked) {
      newSelection.add(taskId)
      
      // Auto-select dependencies
      const task = migrationPlan.phases
        .flatMap(phase => phase.tasks)
        .find(t => t.id === taskId)
      
      if (task?.dependencies) {
        task.dependencies.forEach(depId => {
          const depTask = migrationPlan.phases
            .flatMap(phase => phase.tasks)
            .find(t => t.id === depId)
          if (depTask) {
            newSelection.add(depId)
          }
        })
      }
    } else {
      newSelection.delete(taskId)
      
      // Auto-deselect dependents
      migrationPlan.phases
        .flatMap(phase => phase.tasks)
        .filter(task => task.dependencies.includes(taskId))
        .forEach(dependentTask => {
          newSelection.delete(dependentTask.id)
        })
    }
    
    onSelectionChange(newSelection)
  }

  const togglePhaseExpanded = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId)
    } else {
      newExpanded.add(phaseId)
    }
    setExpandedPhases(newExpanded)
  }

  const sortedPhases = [...migrationPlan.phases].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {/* Summary Panel */}
      {summary.totalSelected > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{summary.totalSelected}</div>
                <div className="text-sm text-blue-700">Tasks Selected</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{summary.totalEstimatedTime}m</div>
                <div className="text-sm text-blue-700">Total Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.totalAutomatedTime}m</div>
                <div className="text-sm text-green-700">Automated</div>
              </div>
              <div>
                <div className="flex items-center justify-center space-x-2">
                  {summary.highRiskTasks > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {summary.highRiskTasks} high risk
                    </Badge>
                  )}
                  {summary.breakingChanges > 0 && (
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                      {summary.breakingChanges} breaking
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600 mt-1">Warnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phases List */}
      <div className="space-y-4">
        {sortedPhases.map((phase) => (
          <PhaseItem
            key={phase.id}
            phase={phase}
            selectedTaskIds={selectedTaskIds}
            onTaskToggle={handleTaskToggle}
            isExpanded={expandedPhases.has(phase.id)}
            onToggleExpanded={() => togglePhaseExpanded(phase.id)}
          />
        ))}
      </div>

      {/* Action Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          disabled={summary.totalSelected === 0}
          className="min-w-48"
        >
          Start Transformation
          {summary.totalSelected > 0 && (
            <span className="ml-2 bg-white/20 px-2 py-1 rounded text-sm">
              {summary.totalSelected} tasks
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}

export default TaskSelector