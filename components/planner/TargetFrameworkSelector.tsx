'use client'

import { useState } from 'react'
import { Check, ChevronRight, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TargetSelection } from '@/types/migration'

interface TargetFrameworkSelectorProps {
  sourceFramework: string
  sourceLanguage: string
  onSelect: (target: TargetSelection) => void
  selectedTarget?: TargetSelection
}

interface FrameworkOption {
  id: string
  name: string
  version: string
  description: string
  icon: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string
  features: string[]
  recommended?: boolean
  comingSoon?: boolean
}

// Get compatible target frameworks based on source
const getCompatibleFrameworks = (
  sourceFramework: string,
  sourceLanguage: string
): FrameworkOption[] => {
  const source = sourceFramework.toLowerCase()
  const lang = sourceLanguage.toLowerCase()

  // React source
  if (source.includes('react')) {
    return [
      {
        id: 'nextjs-app',
        name: 'Next.js (App Router)',
        version: '14.x',
        description: 'Modern React framework with App Router, Server Components, and built-in optimizations',
        icon: '▲',
        difficulty: 'medium',
        estimatedTime: '2-4 hours',
        features: ['Server Components', 'App Router', 'Built-in SEO', 'Image Optimization'],
        recommended: true,
      },
      {
        id: 'vue3',
        name: 'Vue 3',
        version: '3.x',
        description: 'Progressive JavaScript framework with Composition API',
        icon: '💚',
        difficulty: 'hard',
        estimatedTime: '4-8 hours',
        features: ['Composition API', 'Reactivity', 'SFC', 'TypeScript Support'],
        comingSoon: true,
      },
      {
        id: 'svelte',
        name: 'Svelte',
        version: '4.x',
        description: 'Compile-time framework with no virtual DOM',
        icon: '🔥',
        difficulty: 'hard',
        estimatedTime: '4-8 hours',
        features: ['No Virtual DOM', 'Reactive', 'Small Bundle', 'Easy Syntax'],
        comingSoon: true,
      },
    ]
  }

  // Vue source
  if (source.includes('vue')) {
    return [
      {
        id: 'nuxt3',
        name: 'Nuxt 3',
        version: '3.x',
        description: 'Vue framework with server-side rendering and auto-imports',
        icon: '💚',
        difficulty: 'easy',
        estimatedTime: '1-2 hours',
        features: ['Auto-imports', 'SSR', 'File-based Routing', 'TypeScript'],
        recommended: true,
      },
      {
        id: 'react',
        name: 'React',
        version: '18.x',
        description: 'Popular JavaScript library for building user interfaces',
        icon: '⚛️',
        difficulty: 'medium',
        estimatedTime: '3-6 hours',
        features: ['Hooks', 'Virtual DOM', 'Large Ecosystem', 'JSX'],
      },
      {
        id: 'svelte',
        name: 'Svelte',
        version: '4.x',
        description: 'Compile-time framework with no virtual DOM',
        icon: '🔥',
        difficulty: 'medium',
        estimatedTime: '2-4 hours',
        features: ['No Virtual DOM', 'Reactive', 'Small Bundle', 'Easy Syntax'],
        comingSoon: true,
      },
    ]
  }

  // Flask/Python source
  if (source.includes('flask') || lang.includes('python')) {
    return [
      {
        id: 'fastapi',
        name: 'FastAPI',
        version: '0.1x',
        description: 'Modern Python web framework with automatic API documentation',
        icon: '⚡',
        difficulty: 'easy',
        estimatedTime: '1-3 hours',
        features: ['Async Support', 'Auto Docs', 'Type Hints', 'Fast Performance'],
        recommended: true,
      },
      {
        id: 'django',
        name: 'Django',
        version: '4.x',
        description: 'High-level Python web framework with batteries included',
        icon: '🎸',
        difficulty: 'medium',
        estimatedTime: '3-6 hours',
        features: ['ORM', 'Admin Panel', 'Security', 'Scalable'],
      },
    ]
  }

  // Express/Node source
  if (source.includes('express')) {
    return [
      {
        id: 'nestjs',
        name: 'NestJS',
        version: '10.x',
        description: 'Progressive Node.js framework with TypeScript and dependency injection',
        icon: '🐱',
        difficulty: 'medium',
        estimatedTime: '2-4 hours',
        features: ['TypeScript', 'DI', 'Modular', 'GraphQL Support'],
        recommended: true,
      },
      {
        id: 'fastify',
        name: 'Fastify',
        version: '4.x',
        description: 'Fast and low overhead web framework for Node.js',
        icon: '⚡',
        difficulty: 'easy',
        estimatedTime: '1-2 hours',
        features: ['Fast', 'Schema-based', 'Plugin System', 'TypeScript'],
      },
    ]
  }

  // Default fallback
  return [
    {
      id: 'nextjs-app',
      name: 'Next.js (App Router)',
      version: '14.x',
      description: 'Modern React framework with App Router and Server Components',
      icon: '▲',
      difficulty: 'medium',
      estimatedTime: '2-4 hours',
      features: ['Server Components', 'App Router', 'Built-in SEO', 'Image Optimization'],
      recommended: true,
    },
  ]
}

// Difficulty badge color
const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800 border-green-300'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'hard':
      return 'bg-red-100 text-red-800 border-red-300'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

export function TargetFrameworkSelector({
  sourceFramework,
  sourceLanguage,
  onSelect,
  selectedTarget,
}: TargetFrameworkSelectorProps) {
  const [hoveredFramework, setHoveredFramework] = useState<string | null>(null)

  const frameworks = getCompatibleFrameworks(sourceFramework, sourceLanguage)

  const handleSelect = (framework: FrameworkOption) => {
    // Don't allow selection of coming soon frameworks
    if (framework.comingSoon) {
      return
    }
    
    const target: TargetSelection = {
      framework: framework.id,
      version: framework.version,
      options: {}, // Will be filled in FrameworkOptionsForm
    }
    onSelect(target)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            Select Target Framework
          </h4>
          <p className="text-sm text-blue-700">
            Choose the framework you want to migrate your {sourceFramework} application to.
            We'll guide you through the configuration options next.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {frameworks.map((framework) => {
          const isSelected = selectedTarget?.framework === framework.id
          const isHovered = hoveredFramework === framework.id

          return (
            <Card
              key={framework.id}
              className={cn(
                'relative transition-all duration-200',
                framework.comingSoon
                  ? 'cursor-not-allowed opacity-60 border-gray-300 bg-gray-50'
                  : 'cursor-pointer',
                !framework.comingSoon && isSelected
                  ? 'border-purple-500 bg-purple-50 shadow-lg ring-2 ring-purple-500'
                  : !framework.comingSoon && 'border-gray-200 hover:border-purple-300 hover:shadow-md',
                !framework.comingSoon && isHovered && !isSelected && 'scale-[1.02]'
              )}
              onMouseEnter={() => !framework.comingSoon && setHoveredFramework(framework.id)}
              onMouseLeave={() => setHoveredFramework(null)}
              onClick={() => handleSelect(framework)}
            >
              {framework.comingSoon && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-gradient-to-r from-gray-600 to-gray-700 text-white border-0">
                    🚧 Coming Soon
                  </Badge>
                </div>
              )}
              {framework.recommended && !framework.comingSoon && (
                <div className="absolute -top-2 -right-2 z-10">
                  <Badge className="bg-gradient-to-r from-purple-600 to-orange-600 text-white border-0">
                    ⭐ Recommended
                  </Badge>
                </div>
              )}

              {isSelected && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="bg-purple-600 text-white rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="text-4xl">{framework.icon}</div>
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">
                      {framework.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        v{framework.version}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', getDifficultyColor(framework.difficulty))}
                      >
                        {framework.difficulty}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        ⏱️ {framework.estimatedTime}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">{framework.description}</p>

                <div className="space-y-1">
                  <h5 className="text-xs font-semibold text-gray-700">Key Features:</h5>
                  <div className="flex flex-wrap gap-1">
                    {framework.features.map((feature, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-xs bg-gray-100"
                      >
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'w-full',
                      isSelected &&
                        'bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500'
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelect(framework)
                    }}
                    disabled={framework.comingSoon}
                  >
                    {framework.comingSoon ? (
                      <>
                        🚧 Coming Soon
                      </>
                    ) : isSelected ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Selected
                      </>
                    ) : (
                      <>
                        Select Framework
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {frameworks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No compatible target frameworks found for {sourceFramework}</p>
        </div>
      )}
    </div>
  )
}
