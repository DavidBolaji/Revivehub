'use client'

import { MigrationTask } from '@/lib/planner/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Clock,
  GitBranch,
  AlertCircle,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDetailsModalProps {
  task: MigrationTask | null
  isOpen: boolean
  onClose: () => void
  onExecuteTask?: (taskId: string) => void
  dependencyTasks?: MigrationTask[]
}

export function TaskDetailsModal({
  task,
  isOpen,
  onClose,
  onExecuteTask,
  dependencyTasks = [],
}: TaskDetailsModalProps) {
  if (!task) return null

  const hasUnmetDependencies = dependencyTasks.some(
    (dep) => task.dependencies.includes(dep.id)
  )

  const isHighRisk = task.riskLevel === 'high'
  const isAutomated = task.type === 'automated'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl">{task.name}</DialogTitle>
              <DialogDescription className="mt-2">
                {task.description}
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-2">
              {task.type === 'automated' ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Automated
                </Badge>
              ) : task.type === 'manual' ? (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Manual
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Review
                </Badge>
              )}
              <Badge
                variant={
                  task.riskLevel === 'high'
                    ? 'destructive'
                    : task.riskLevel === 'medium'
                    ? 'default'
                    : 'secondary'
                }
              >
                {task.riskLevel} risk
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Task Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Estimated Time:</span>
              <span className="font-medium">{task.estimatedMinutes} minutes</span>
            </div>
            {task.automatedMinutes > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Automated Time:</span>
                <span className="font-medium">{task.automatedMinutes} minutes</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Affected Files */}
          {task.affectedFiles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileCode className="h-4 w-4" />
                <h3 className="font-semibold">
                  Affected Files ({task.affectedFiles.length})
                </h3>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {task.affectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="text-sm font-mono bg-muted px-3 py-2 rounded"
                  >
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {task.dependencies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GitBranch className="h-4 w-4" />
                <h3 className="font-semibold">
                  Dependencies ({task.dependencies.length})
                </h3>
              </div>
              <div className="space-y-2">
                {dependencyTasks.length > 0 ? (
                  dependencyTasks.map((dep) => (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-3 bg-muted rounded"
                    >
                      <span className="text-sm">{dep.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {dep.type}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {task.dependencies.length} prerequisite task(s) required
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Breaking Changes */}
          {task.breakingChanges.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold text-orange-600">
                  Breaking Changes ({task.breakingChanges.length})
                </h3>
              </div>
              <div className="space-y-2">
                {task.breakingChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded text-sm"
                  >
                    {change}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pattern Information */}
          {task.pattern && (
            <div>
              <h3 className="font-semibold mb-3">Related Pattern</h3>
              <div className="p-4 bg-muted rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{task.pattern.name}</span>
                  <Badge variant="outline">{task.pattern.category}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {task.pattern.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{task.pattern.occurrences} occurrences</span>
                  <span>Severity: {task.pattern.severity}</span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              {hasUnmetDependencies && (
                <p className="text-sm text-orange-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  This task has unmet dependencies
                </p>
              )}
              {isHighRisk && !hasUnmetDependencies && (
                <p className="text-sm text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  High risk task - review carefully before executing
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {isAutomated && onExecuteTask && (
                <Button
                  onClick={() => {
                    if (
                      isHighRisk &&
                      !confirm(
                        'This is a high-risk task. Are you sure you want to execute it?'
                      )
                    ) {
                      return
                    }
                    onExecuteTask(task.id)
                  }}
                  disabled={hasUnmetDependencies}
                  className={cn(
                    'gap-2',
                    isHighRisk && 'bg-orange-600 hover:bg-orange-700'
                  )}
                >
                  <Play className="h-4 w-4" />
                  Execute Task
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
