'use client'

import { Issue, HealthScore } from '@/lib/scanner/types'
import { Badge } from '@/components/ui/badge'
import { IssueCard } from './IssueCard'

interface IssueKanbanProps {
  issues: Issue[]
  healthScore?: HealthScore
}

interface CategorizedIssues {
  minor: Issue[]
  moderate: Issue[]
  major: Issue[]
}

function categorizeIssues(issues: Issue[]): CategorizedIssues {
  return {
    minor: issues.filter((i) => i.severity === 'info'),
    moderate: issues.filter((i) => i.severity === 'warning'),
    major: issues.filter((i) => i.severity === 'critical'),
  }
}

export function IssueKanban({ issues }: IssueKanbanProps) {
  const categorized = categorizeIssues(issues)

  const columns = [
    {
      title: 'Minor',
      severity: 'minor' as const,
      issues: categorized.minor,
      gradient: 'from-blue-900/40 to-blue-800/40',
      borderColor: 'border-blue-500/30',
      badgeColor: 'bg-blue-500/20 text-blue-200 border-blue-500/40',
      emptyIcon: '✓',
      emptyText: 'No minor issues',
    },
    {
      title: 'Moderate',
      severity: 'moderate' as const,
      issues: categorized.moderate,
      gradient: 'from-yellow-900/40 to-yellow-800/40',
      borderColor: 'border-yellow-500/30',
      badgeColor: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/40',
      emptyIcon: '✓',
      emptyText: 'No moderate issues',
    },
    {
      title: 'Major',
      severity: 'major' as const,
      issues: categorized.major,
      gradient: 'from-red-900/40 to-red-800/40',
      borderColor: 'border-red-500/30',
      badgeColor: 'bg-red-500/20 text-red-200 border-red-500/40',
      emptyIcon: '✓',
      emptyText: 'No major issues',
    },
  ]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Detected Issues</h2>
        <p className="text-purple-300/80">
          Issues categorized by severity level
        </p>
      </div>

      {/* Kanban Columns - Horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
        {columns.map((column) => (
          <div
            key={column.title}
            className="flex-shrink-0 w-[85vw] md:w-auto snap-center"
          >
            {/* Column Header */}
            <div
              className={`rounded-t-lg border-t border-x ${column.borderColor} bg-gradient-to-br ${column.gradient} p-4`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {column.title}
                </h3>
                <Badge className={column.badgeColor}>
                  {column.issues.length}
                </Badge>
              </div>
            </div>

            {/* Column Content */}
            <div
              className={`min-h-[200px] rounded-b-lg border-b border-x ${column.borderColor} bg-gradient-to-br ${column.gradient} bg-opacity-50 p-4 space-y-3`}
            >
              {column.issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-4xl mb-3 opacity-50">
                    {column.emptyIcon}
                  </div>
                  <p className="text-sm text-purple-300/60">
                    {column.emptyText}
                  </p>
                </div>
              ) : (
                column.issues.map((issue, index) => (
                  <IssueCard
                    key={`${issue.category}-${index}`}
                    issue={issue}
                    severity={column.severity}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile scroll hint */}
      <div className="md:hidden mt-4 text-center text-sm text-purple-300/60">
        ← Swipe to view all columns →
      </div>
    </div>
  )
}
