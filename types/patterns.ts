// Pattern detection and analysis types

export type PatternSeverity = 'low' | 'medium' | 'high'

export type PatternCategory = 
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'typescript'
  | 'dependencies'
  | 'async'
  | 'modules'

export interface DetectedPattern {
  id: string
  category: PatternCategory
  name: string
  description: string
  severity: PatternSeverity
  autoFixable: boolean
  suggestedFix: string
  estimatedTimeMinutes: number
  locations: PatternLocation[]
  examples?: string[]
}

export interface PatternLocation {
  file: string
  line: number
  column?: number
  snippet: string
}

export interface ModernizationSuggestion {
  patternId: string
  currentPattern: string
  modernAlternative: string
  benefits: string[]
  migrationSteps: string[]
  breakingChanges: string[]
  estimatedEffort: EffortEstimate
}

export interface EffortEstimate {
  timeMinutes: number
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex'
  riskLevel: 'low' | 'medium' | 'high'
  automationPotential: number // 0-100%
}

export interface BreakingChange {
  type: 'api' | 'behavior' | 'dependency' | 'config' | 'type'
  description: string
  impact: 'low' | 'medium' | 'high'
  affectedFiles: string[]
  migrationPath: string
}

export interface AnalysisResult {
  patterns: DetectedPattern[]
  suggestions: ModernizationSuggestion[]
  breakingChanges: BreakingChange[]
  totalEffort: EffortEstimate
  summary: {
    totalPatterns: number
    autoFixableCount: number
    highSeverityCount: number
    estimatedTotalHours: number
  }
}

// Known legacy patterns to detect
export const LEGACY_PATTERNS = {
  REACT_CLASS_COMPONENT: 'react-class-component',
  REACT_PROPTYPES: 'react-proptypes',
  REACT_OLD_LIFECYCLE: 'react-old-lifecycle',
  NEXTJS_PAGES_ROUTER: 'nextjs-pages-router',
  NEXTJS_GET_INITIAL_PROPS: 'nextjs-get-initial-props',
  VUE_OPTIONS_API: 'vue-options-api',
  CALLBACK_HELL: 'callback-hell',
  COMMONJS_REQUIRE: 'commonjs-require',
  VAR_DECLARATION: 'var-declaration',
  DEPRECATED_DEPENDENCY: 'deprecated-dependency',
} as const

export type LegacyPatternId = typeof LEGACY_PATTERNS[keyof typeof LEGACY_PATTERNS]
