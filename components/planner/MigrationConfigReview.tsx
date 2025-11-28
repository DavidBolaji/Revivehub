'use client'

import { useState } from 'react'
import { ArrowRight, CheckCircle2, Info, Loader2, Rocket } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { MigrationSpecification, SourceStack, TargetSelection } from '@/types/migration'

interface MigrationConfigReviewProps {
  sourceStack: SourceStack
  targetSelection: TargetSelection
  migrationSpec: MigrationSpecification
  repositoryName: string
  repositoryOwner: string
  onStartMigration: () => void
  onEdit?: () => void
  isLoading?: boolean
}

export function MigrationConfigReview({
  sourceStack,
  targetSelection,
  migrationSpec,
  repositoryName,
  repositoryOwner,
  onStartMigration,
  onEdit,
  isLoading = false,
}: MigrationConfigReviewProps) {
  const [showDetails, setShowDetails] = useState(false)

  // Get framework display names
  const getFrameworkDisplayName = (frameworkId: string): string => {
    const names: Record<string, string> = {
      'nextjs-app': 'Next.js (App Router)',
      'nextjs-pages': 'Next.js (Pages Router)',
      'nuxt3': 'Nuxt 3',
      'vue3': 'Vue 3',
      'react': 'React',
      'svelte': 'Svelte',
      'fastapi': 'FastAPI',
      'django': 'Django',
      'nestjs': 'NestJS',
      'fastify': 'Fastify',
    }
    return names[frameworkId] || frameworkId
  }

  // Get option display value
  const getOptionDisplayValue = (key: string, value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled'
    }
    
    const displayNames: Record<string, Record<string, string>> = {
      router: {
        pages: 'Pages Router',
        app: 'App Router',
        'file-based': 'File-based Router',
      },
      styling: {
        'css-modules': 'CSS Modules',
        tailwind: 'Tailwind CSS',
        'styled-components': 'Styled Components',
        emotion: 'Emotion',
        sass: 'Sass/SCSS',
      },
    }

    return displayNames[key]?.[value] || String(value)
  }

  // Get option icon
  const getOptionIcon = (key: string): string => {
    const icons: Record<string, string> = {
      router: '🗺️',
      styling: '🎨',
      typescript: '📘',
      ssr: '🖥️',
      async: '⚡',
      pydantic: '✅',
      docs: '📚',
      graphql: '🔷',
      swagger: '📄',
    }
    return icons[key] || '⚙️'
  }

  // Calculate estimated complexity
  const getComplexityBadge = () => {
    const complexity = migrationSpec.metadata.estimatedComplexity
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300',
    }
    return (
      <Badge variant="outline" className={cn('text-xs', colors[complexity])}>
        {complexity.toUpperCase()} Complexity
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-green-900 mb-1">
            Configuration Complete
          </h4>
          <p className="text-sm text-green-700">
            Review your migration configuration below and start the migration when ready.
          </p>
        </div>
      </div>

      {/* Main Review Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Migration Configuration</CardTitle>
              <p className="text-sm text-gray-600">
                {repositoryOwner}/{repositoryName}
              </p>
            </div>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                Edit
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Source → Target */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Migration Path</h4>
            <div className="flex items-center gap-4">
              {/* Source */}
              <div className="flex-1 p-4 bg-white border border-gray-200 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">FROM</div>
                <div className="font-semibold text-gray-900">
                  {sourceStack.framework || 'Unknown'}
                </div>
                <div className="text-sm text-gray-600">
                  v{sourceStack.version || 'N/A'}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {sourceStack.language && (
                    <Badge variant="secondary" className="text-xs">
                      {sourceStack.language}
                    </Badge>
                  )}
                  {sourceStack.buildTool && (
                    <Badge variant="secondary" className="text-xs">
                      {sourceStack.buildTool}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-6 w-6 text-purple-600 flex-shrink-0" />

              {/* Target */}
              <div className="flex-1 p-4 bg-gradient-to-br from-purple-100 to-orange-100 border border-purple-300 rounded-lg">
                <div className="text-xs text-purple-700 mb-1">TO</div>
                <div className="font-semibold text-purple-900">
                  {getFrameworkDisplayName(targetSelection.framework)}
                </div>
                <div className="text-sm text-purple-700">
                  v{targetSelection.version}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge className="bg-purple-600 text-white text-xs">
                    Modern
                  </Badge>
                  {getComplexityBadge()}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Configuration Options */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Configuration Options
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(targetSelection.options).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <span className="text-2xl">{getOptionIcon(key)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {getOptionDisplayValue(key, value)}
                    </div>
                  </div>
                  {typeof value === 'boolean' && value && (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Migration Spec Summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">
                Migration Specification
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xs text-blue-600 mb-1">Estimated Time</div>
                <div className="text-sm font-semibold text-blue-900">
                  {migrationSpec.metadata.estimatedDuration}
                </div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="text-xs text-purple-600 mb-1">Mappings</div>
                <div className="text-sm font-semibold text-purple-900">
                  {Object.keys(migrationSpec.mappings).length} types
                </div>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-xs text-orange-600 mb-1">Rules</div>
                <div className="text-sm font-semibold text-orange-900">
                  {migrationSpec.rules.mustTransform.length} transforms
                </div>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-xs text-green-600 mb-1">Spec Version</div>
                <div className="text-sm font-semibold text-green-900">
                  {migrationSpec.metadata.version}
                </div>
              </div>
            </div>

            {/* Detailed Spec Info */}
            {showDetails && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Must Preserve ({migrationSpec.rules.mustPreserve.length})
                  </h5>
                  <ul className="space-y-1">
                    {migrationSpec.rules.mustPreserve.slice(0, 3).map((rule, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-green-600 mt-0.5">✓</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                    {migrationSpec.rules.mustPreserve.length > 3 && (
                      <li className="text-xs text-gray-500 italic">
                        +{migrationSpec.rules.mustPreserve.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">
                    Must Transform ({migrationSpec.rules.mustTransform.length})
                  </h5>
                  <ul className="space-y-1">
                    {migrationSpec.rules.mustTransform.slice(0, 3).map((rule, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="text-purple-600 mt-0.5">→</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                    {migrationSpec.rules.mustTransform.length > 3 && (
                      <li className="text-xs text-gray-500 italic">
                        +{migrationSpec.rules.mustTransform.length - 3} more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Important Notes */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-sm font-semibold text-orange-900 mb-2">
                  Before You Start
                </h5>
                <ul className="space-y-1 text-sm text-orange-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>The migration will fetch your repository code and transform it</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>You'll be able to review all changes before accepting them</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>High-risk transformations will be flagged for manual review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5">•</span>
                    <span>Estimated time: {migrationSpec.metadata.estimatedDuration}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Start Migration Button */}
          <div className="pt-2">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 text-white"
              onClick={onStartMigration}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Starting Migration...
                </>
              ) : (
                <>
                  <Rocket className="h-5 w-5 mr-2" />
                  Start Migration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
