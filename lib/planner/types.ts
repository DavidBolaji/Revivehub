// Types for migration planning system

export interface SourceStack {
  framework: string
  version: string
  language: string
  dependencies: Record<string, string>
  patterns: string[]
}

export interface TargetStack {
  framework: string
  version: string
  language: string
  dependencies: Record<string, string>
  features: string[]
}

export interface DetectedPattern {
  id: string
  name: string
  category: 'dependency' | 'structural' | 'component' | 'documentation' | 'build-tool'
  severity: 'low' | 'medium' | 'high'
  occurrences: number
  affectedFiles: string[]
  description: string
  automated: boolean
}

export interface MigrationTask {
  id: string
  name: string
  description: string
  type: 'automated' | 'manual' | 'review'
  estimatedMinutes: number
  automatedMinutes: number
  riskLevel: 'low' | 'medium' | 'high'
  affectedFiles: string[]
  dependencies: string[] // Task IDs this depends on
  breakingChanges: string[]
  transformerId?: string
  pattern?: DetectedPattern
}

export interface MigrationPhase {
  id: string
  name: string
  description: string
  order: number
  tasks: MigrationTask[]
  totalEstimatedMinutes: number
  totalAutomatedMinutes: number
  riskLevel: 'low' | 'medium' | 'high'
  canRunInParallel: boolean
}

export interface MigrationPlan {
  id: string
  sourceStack: SourceStack
  targetStack: TargetStack
  phases: MigrationPhase[]
  summary: {
    totalTasks: number
    automatedTasks: number
    manualTasks: number
    reviewTasks: number
    totalEstimatedMinutes: number
    totalAutomatedMinutes: number
    automationPercentage: number
    overallComplexity: number
    requiredSkills: string[]
  }
  dependencyGraph: DependencyNode[]
  customization: PlanCustomization
  createdAt: Date
}

export interface DependencyNode {
  taskId: string
  dependsOn: string[]
  blockedBy: string[]
  canRunInParallel: boolean
  criticalPath: boolean
}

export interface PlanCustomization {
  aggressiveness: 'conservative' | 'balanced' | 'aggressive'
  enabledTransformations: string[]
  disabledTransformations: string[]
  selectedPatterns: string[]
  skipTests: boolean
  skipDocumentation: boolean
}

export interface ComplexityFactors {
  codebaseSize: number // lines of code
  fileCount: number
  dependencyCount: number
  patternComplexity: number
  frameworkDistance: number // how different are the frameworks
  customCodeRatio: number
  testCoverage: number
}

export interface ComplexityEstimate {
  score: number // 0-100
  level: 'trivial' | 'simple' | 'moderate' | 'complex' | 'very-complex'
  factors: ComplexityFactors
  recommendations: string[]
}

export interface AIInsight {
  type: 'insight' | 'warning' | 'tip' | 'optimization'
  message: string
  confidence: number // 0-100
  category:
    | 'architecture'
    | 'dependencies'
    | 'testing'
    | 'performance'
    | 'security'
    | 'compatibility'
    | 'best-practices'
  affectedItems?: string[]
  suggestedAction?: string
}
