'use client'

import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface HealthIssue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  message: string
  impact: string
}

interface HealthSuggestion {
  priority: 'high' | 'medium' | 'low'
  category: string
  message: string
  benefit: string
}

interface HealthReport {
  score: number
  breakdown: {
    documentation: number
    codeQuality: number
    testing: number
    dependencies: number
    cicd: number
    security: number
  }
  issues: HealthIssue[]
  suggestions: HealthSuggestion[]
}

interface HealthBreakdownProps {
  report: HealthReport
  animated?: boolean
}

export function HealthBreakdown({ report, animated = true }: HealthBreakdownProps) {
  const categories = [
    { 
      name: 'Documentation', 
      score: report.breakdown.documentation,
      icon: '📚',
      description: 'README, docs, and guides'
    },
    { 
      name: 'Code Quality', 
      score: report.breakdown.codeQuality,
      icon: '✨',
      description: 'Linting, formatting, and standards'
    },
    { 
      name: 'Testing', 
      score: report.breakdown.testing,
      icon: '🧪',
      description: 'Test coverage and frameworks'
    },
    { 
      name: 'Dependencies', 
      score: report.breakdown.dependencies,
      icon: '📦',
      description: 'Package management and updates'
    },
    { 
      name: 'CI/CD', 
      score: report.breakdown.cicd,
      icon: '🚀',
      description: 'Automation and workflows'
    },
    { 
      name: 'Security', 
      score: report.breakdown.security,
      icon: '🔒',
      description: 'Security practices and configs'
    }
  ]

  const getBarColor = (score: number) => {
    if (score >= 71) return 'bg-green-500'
    if (score >= 41) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getBarBgColor = (score: number) => {
    if (score >= 71) return 'bg-green-100'
    if (score >= 41) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Category Scores */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Score Breakdown</h3>
        <div className="space-y-3">
          {categories.map((category, index) => (
            <motion.div
              key={category.name}
              initial={animated ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{category.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {category.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {category.description}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {category.score}/100
                </span>
              </div>
              
              {/* Progress bar */}
              <div className={`h-2 rounded-full ${getBarBgColor(category.score)} overflow-hidden`}>
                <motion.div
                  className={`h-full rounded-full ${getBarColor(category.score)}`}
                  initial={animated ? { width: 0 } : { width: `${category.score}%` }}
                  animate={{ width: `${category.score}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Issues */}
      {report.issues.length > 0 && (
        <motion.div
          initial={animated ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Issues Found ({report.issues.length})
          </h3>
          <div className="space-y-2">
            {report.issues.map((issue: HealthIssue, index: number) => (
              <motion.div
                key={index}
                initial={animated ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.9 + index * 0.05 }}
                className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-red-900">{issue.category}</div>
                  <div className="text-sm text-red-700">{issue.message}</div>
                  <div className="text-xs text-red-600 mt-1">
                    Impact: {issue.severity} • {issue.impact}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Suggestions */}
      {report.suggestions.length > 0 && (
        <motion.div
          initial={animated ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="space-y-3"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Suggestions ({report.suggestions.length})
          </h3>
          <div className="space-y-2">
            {report.suggestions.map((suggestion: HealthSuggestion, index: number) => (
              <motion.div
                key={index}
                initial={animated ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 1.1 + index * 0.05 }}
                className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-900">{suggestion.category}</div>
                  <div className="text-sm text-blue-700">{suggestion.message}</div>
                  <div className="text-xs text-blue-600 mt-1">
                    Priority: {suggestion.priority} • {suggestion.benefit}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
