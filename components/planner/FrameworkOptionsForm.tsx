'use client'

import { useState, useEffect } from 'react'
import { Info, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { FrameworkOptions } from '@/types/migration'

interface FrameworkOptionsFormProps {
  targetFramework: string
  targetVersion: string
  initialOptions?: FrameworkOptions
  onChange: (options: FrameworkOptions) => void
}

interface OptionConfig {
  id: string
  label: string
  description: string
  type: 'select' | 'boolean'
  options?: Array<{ value: string; label: string; description?: string }>
  defaultValue: any
  recommended?: string
  incompatibleWith?: string[]
}

// Get framework-specific options
const getFrameworkOptions = (framework: string): OptionConfig[] => {
  const frameworkId = framework.toLowerCase()

  // Next.js options
  if (frameworkId.includes('nextjs')) {
    return [
      {
        id: 'router',
        label: 'Router Type',
        description: 'Choose between Pages Router (traditional) or App Router (modern with Server Components)',
        type: 'select',
        options: [
          {
            value: 'pages',
            label: 'Pages Router',
            description: 'Traditional routing with pages directory. Easier migration path.',
          },
          {
            value: 'app',
            label: 'App Router',
            description: 'Modern routing with app directory and Server Components. Recommended for new projects.',
          },
        ],
        defaultValue: 'app',
        recommended: 'app',
      },
      {
        id: 'styling',
        label: 'Styling Solution',
        description: 'Select your preferred styling approach',
        type: 'select',
        options: [
          { value: 'css-modules', label: 'CSS Modules', description: 'Scoped CSS with .module.css files' },
          { value: 'tailwind', label: 'Tailwind CSS', description: 'Utility-first CSS framework' },
          { value: 'styled-components', label: 'Styled Components', description: 'CSS-in-JS with tagged templates' },
          { value: 'emotion', label: 'Emotion', description: 'Performant CSS-in-JS library' },
          { value: 'sass', label: 'Sass/SCSS', description: 'CSS preprocessor with variables and mixins' },
        ],
        defaultValue: 'tailwind',
        recommended: 'tailwind',
      },
      {
        id: 'typescript',
        label: 'TypeScript',
        description: 'Enable TypeScript for type safety and better developer experience',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
      {
        id: 'ssr',
        label: 'Server-Side Rendering',
        description: 'Enable SSR for better SEO and initial page load performance',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
    ]
  }

  // Nuxt 3 options
  if (frameworkId.includes('nuxt')) {
    return [
      {
        id: 'typescript',
        label: 'TypeScript',
        description: 'Enable TypeScript support',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
      {
        id: 'styling',
        label: 'Styling Solution',
        description: 'Select your preferred styling approach',
        type: 'select',
        options: [
          { value: 'css-modules', label: 'CSS Modules' },
          { value: 'tailwind', label: 'Tailwind CSS' },
          { value: 'sass', label: 'Sass/SCSS' },
        ],
        defaultValue: 'tailwind',
        recommended: 'tailwind',
      },
      {
        id: 'ssr',
        label: 'Server-Side Rendering',
        description: 'Enable SSR (recommended for Nuxt)',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
    ]
  }

  // FastAPI options
  if (frameworkId.includes('fastapi')) {
    return [
      {
        id: 'async',
        label: 'Async/Await',
        description: 'Use async/await for better performance with I/O operations',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
      {
        id: 'pydantic',
        label: 'Pydantic Models',
        description: 'Use Pydantic for data validation and serialization',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
      {
        id: 'docs',
        label: 'Auto-generate API Docs',
        description: 'Enable automatic OpenAPI documentation generation',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
    ]
  }

  // NestJS options
  if (frameworkId.includes('nestjs')) {
    return [
      {
        id: 'typescript',
        label: 'TypeScript',
        description: 'NestJS requires TypeScript',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
      {
        id: 'graphql',
        label: 'GraphQL Support',
        description: 'Add GraphQL support with Apollo Server',
        type: 'boolean',
        defaultValue: false,
      },
      {
        id: 'swagger',
        label: 'Swagger/OpenAPI',
        description: 'Enable automatic API documentation',
        type: 'boolean',
        defaultValue: true,
        recommended: 'true',
      },
    ]
  }

  // Default options for other frameworks
  return [
    {
      id: 'typescript',
      label: 'TypeScript',
      description: 'Enable TypeScript for type safety',
      type: 'boolean',
      defaultValue: true,
      recommended: 'true',
    },
  ]
}

// Validate option combinations
const validateOptions = (
  options: FrameworkOptions,
  configs: OptionConfig[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Check for incompatible combinations
  configs.forEach((config) => {
    if (config.incompatibleWith && options[config.id]) {
      config.incompatibleWith.forEach((incompatible) => {
        if (options[incompatible]) {
          errors.push(`${config.label} is incompatible with ${incompatible}`)
        }
      })
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function FrameworkOptionsForm({
  targetFramework,
  targetVersion,
  initialOptions,
  onChange,
}: FrameworkOptionsFormProps) {
  const optionConfigs = getFrameworkOptions(targetFramework)
  
  // Initialize options with defaults
  const [options, setOptions] = useState<FrameworkOptions>(() => {
    const defaults: FrameworkOptions = {}
    optionConfigs.forEach((config) => {
      defaults[config.id] = config.defaultValue
    })
    return { ...defaults, ...initialOptions }
  })

  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] }>({
    valid: true,
    errors: [],
  })

  // Validate and notify parent on change
  useEffect(() => {
    const validationResult = validateOptions(options, optionConfigs)
    setValidation(validationResult)
    onChange(options)
  }, [options])

  const handleSelectChange = (optionId: string, value: string) => {
    setOptions((prev) => ({ ...prev, [optionId]: value }))
  }

  const handleBooleanChange = (optionId: string, checked: boolean) => {
    setOptions((prev) => ({ ...prev, [optionId]: checked }))
  }

  const isRecommended = (config: OptionConfig, value: any): boolean => {
    if (!config.recommended) return false
    return String(value) === String(config.recommended)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <Info className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-purple-900 mb-1">
            Configure Migration Options
          </h4>
          <p className="text-sm text-purple-700">
            Customize how your code will be migrated to {targetFramework} v{targetVersion}.
            Recommended options are marked with a star.
          </p>
        </div>
      </div>

      {/* Validation Errors */}
      {!validation.valid && (
        <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-900 mb-1">
              Configuration Errors
            </h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-4">
        {optionConfigs.map((config) => (
          <Card key={config.id} className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    {config.label}
                    {isRecommended(config, options[config.id]) && (
                      <Badge className="bg-gradient-to-r from-purple-600 to-orange-600 text-white border-0 text-xs">
                        ⭐ Recommended
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{config.description}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {config.type === 'select' && config.options && (
                <div className="space-y-2">
                  {config.options.map((option) => {
                    const isSelected = options[config.id] === option.value
                    const isRecommendedOption = config.recommended === option.value

                    return (
                      <div
                        key={option.value}
                        className={cn(
                          'relative p-3 border rounded-lg cursor-pointer transition-all',
                          isSelected
                            ? 'border-purple-500 bg-purple-50 shadow-sm'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                        )}
                        onClick={() => handleSelectChange(config.id, option.value)}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center',
                              isSelected
                                ? 'border-purple-600 bg-purple-600'
                                : 'border-gray-300'
                            )}
                          >
                            {isSelected && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium cursor-pointer">
                                {option.label}
                              </Label>
                              {isRecommendedOption && (
                                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                                  ⭐ Recommended
                                </Badge>
                              )}
                            </div>
                            {option.description && (
                              <p className="text-xs text-gray-500 mt-1">
                                {option.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {config.type === 'boolean' && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={config.id}
                      checked={options[config.id] as boolean}
                      onCheckedChange={(checked) => handleBooleanChange(config.id, checked)}
                    />
                    <Label
                      htmlFor={config.id}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {options[config.id] ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                  {options[config.id] && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Configuration Summary
        </h4>
        <div className="space-y-1">
          {optionConfigs.map((config) => (
            <div key={config.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{config.label}:</span>
              <span className="font-medium text-gray-900">
                {config.type === 'boolean'
                  ? options[config.id]
                    ? 'Enabled'
                    : 'Disabled'
                  : config.options?.find((opt) => opt.value === options[config.id])?.label ||
                    options[config.id]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
