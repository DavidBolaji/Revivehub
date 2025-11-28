'use client'

import { useState } from 'react'
import { Issue } from '@/lib/scanner/types'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface IssueCardProps {
  issue: Issue
  severity: 'minor' | 'moderate' | 'major'
}

const severityConfig = {
  minor: {
    bgColor: 'bg-blue-900/30',
    borderColor: 'border-blue-500/40',
    hoverBorder: 'hover:border-blue-400/60',
    textColor: 'text-blue-200',
    badgeColor: 'bg-blue-500/30 text-blue-100 border-blue-400/50',
    iconColor: 'text-blue-400',
  },
  moderate: {
    bgColor: 'bg-yellow-900/30',
    borderColor: 'border-yellow-500/40',
    hoverBorder: 'hover:border-yellow-400/60',
    textColor: 'text-yellow-200',
    badgeColor: 'bg-yellow-500/30 text-yellow-100 border-yellow-400/50',
    iconColor: 'text-yellow-400',
  },
  major: {
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-500/40',
    hoverBorder: 'hover:border-red-400/60',
    textColor: 'text-red-200',
    badgeColor: 'bg-red-500/30 text-red-100 border-red-400/50',
    iconColor: 'text-red-400',
  },
}

export function IssueCard({ issue, severity }: IssueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const config = severityConfig[severity]

  const hasAffectedFiles = issue.affectedFiles && issue.affectedFiles.length > 0
  const descriptionLimit = 120
  const isTruncated = issue.description.length > descriptionLimit
  const displayDescription =
    !showFullDescription && isTruncated
      ? issue.description.slice(0, descriptionLimit) + '...'
      : issue.description

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border ${config.borderColor} ${config.bgColor} ${config.hoverBorder} p-4 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10`}
    >
      {/* Spooky glow effect on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 to-orange-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 space-y-3">
        {/* Header: Title and Category Badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-white leading-tight flex-1">
            {issue.title}
          </h4>
          <Badge className={`${config.badgeColor} text-xs shrink-0`}>
            {issue.category}
          </Badge>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <p className={`text-sm ${config.textColor} leading-relaxed`}>
            {displayDescription}
          </p>
          {isTruncated && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className={`text-xs font-medium ${config.iconColor} hover:underline transition-colors`}
            >
              {showFullDescription ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        {/* Affected Files Section */}
        {hasAffectedFiles && (
          <div className="space-y-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-2 text-xs font-medium ${config.iconColor} hover:underline transition-colors w-full`}
            >
              <span>
                Affected Files ({issue.affectedFiles!.length})
              </span>
              {isExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {isExpanded && (
              <div className="space-y-1 pl-2 border-l-2 border-purple-500/30">
                {issue.affectedFiles!.map((file, index) => (
                  <div
                    key={index}
                    className="text-xs text-purple-300/80 font-mono truncate"
                    title={file}
                  >
                    {file}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decorative corner accent */}
      <div className="absolute -right-1 -top-1 h-12 w-12 rounded-full bg-gradient-to-br from-purple-500/10 to-orange-500/10 blur-lg transition-opacity duration-300 opacity-0 group-hover:opacity-100" />
    </div>
  )
}
