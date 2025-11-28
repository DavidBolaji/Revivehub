// Transformer Architecture Type Definitions for ReviveHub

// ============================================================================
// Migration Plan Types (from existing system)
// ============================================================================

export interface MigrationPlan {
  id: string
  sourceStack: SourceStack
  targetStack: TargetStack
  phases: Phase[]
  summary: Summary
  dependencyGraph: DependencyNode[]
  customization: Customization
  createdAt: string
  aiInsights: AIInsights
  aiMetadata: AIMetadata
}

export interface SourceStack {
  framework: string
  version: string
  language: string
  dependencies: Record<string, string>
  buildTool?: string
  packageManager?: string
}

export interface TargetStack {
  framework: string
  version: string
  language: string
  dependencies: Record<string, string>
  buildTool?: string
  packageManager?: string
}

export interface Phase {
  id: string
  name: string
  description: string
  order: number
  tasks: Task[]
  totalEstimatedMinutes: number
  totalAutomatedMinutes: number
  riskLevel: 'low' | 'medium' | 'high'
  canRunInParallel: boolean
}

export interface Task {
  id: string
  name: string
  description: string
  type: 'automated' | 'manual' | 'review'
  estimatedMinutes: number
  automatedMinutes: number
  estimatedEffort?: number
  riskLevel: 'low' | 'medium' | 'high'
  affectedFiles: string[]
  dependencies: string[]
  breakingChanges: string[]
  pattern: Pattern
}

export interface Pattern {
  id: string
  name: string
  category: 'dependency' | 'structural' | 'code-quality' | 'documentation' | 'build-tool'
  severity: 'low' | 'medium' | 'high'
  occurrences: number
  affectedFiles: string[]
  description: string
  automated: boolean
  examples?: string[]
  detectionRules?: string[]
}

export interface Summary {
  totalPhases: number
  totalTasks: number
  totalEstimatedMinutes: number
  totalAutomatedMinutes: number
  automationPercentage: number
  overallRiskLevel: 'low' | 'medium' | 'high'
}

export interface DependencyNode {
  id: string
  name: string
  dependencies: string[]
  dependents: string[]
}

export interface Customization {
  preferences: Record<string, any>
  constraints: string[]
  priorities: string[]
}

export interface AIInsights {
  recommendations: string[]
  warnings: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
  suggestedApproach: string
}

export interface AIMetadata {
  model: string
  timestamp: string
  tokensUsed: number
  confidence: number
}

// ============================================================================
// Transformation Types
// ============================================================================

export interface TransformOptions {
  aggressive?: boolean
  skipTests?: boolean
  preserveFormatting?: boolean
  dryRun?: boolean
  contextLines?: number
  timeout?: number
  filePath?: string
  repositoryFiles?: Array<{ path: string; content: string }>
  repository?: {
    owner: string
    name: string
  }
}

export interface TransformResult {
  success: boolean
  code?: string
  diff?: Diff
  metadata: TransformMetadata
  errors: TransformError[]
  warnings: string[]
}

export interface TransformMetadata {
  transformationType: string
  filesModified: string[]
  linesAdded: number
  linesRemoved: number
  confidenceScore: number
  riskScore: number
  requiresManualReview: boolean
  estimatedTimeSaved: string
  transformationsApplied: string[]
  timestamp?: Date
  duration?: number
  // Phase 3 Migration Extensions
  notes?: string[]
  newFilePath?: string
  fileStructureChange?: {
    action: 'move' | 'create' | 'rename' | 'delete'
    originalPath: string
    isRouteFile: boolean
    routeSegment?: string
  }
  // Additional files generated or modified during transformation
  additionalFiles?: Map<string, string>
  // JS to JSX conversions tracking
  jsToJsxConversions?: Array<{
    originalPath: string
    newPath: string
    content: string
  }>
}

// ============================================================================
// Diff Types
// ============================================================================

export interface Diff {
  original: string
  transformed: string
  unified: string
  visual: DiffLine[]
  characterLevel: CharacterDiff[]
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified'
  lineNumber: number
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

export interface CharacterDiff {
  value: string
  added: boolean
  removed: boolean
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: string[]
  syntaxValid: boolean
  semanticValid: boolean
  buildValid?: boolean
  testsValid?: boolean
}

export interface ValidationError {
  message: string
  line?: number
  column?: number
  severity: 'error' | 'warning'
  code?: string
  suggestion?: string
}

// ============================================================================
// Error Types
// ============================================================================

export interface TransformError {
  message: string
  code: string
  location?: ErrorLocation
  suggestions: string[]
  severity: 'error' | 'warning'
  stack?: string
}

export interface ErrorLocation {
  line: number
  column: number
  file?: string
}

// ============================================================================
// Orchestration Types
// ============================================================================

export interface OrchestrationResult {
  jobId: string
  success: boolean
  transformedFiles: Map<string, string>
  results: TaskResult[]
  summary: TransformationSummary
}

export interface TaskResult {
  taskId: string
  filePath?: string
  success: boolean
  result?: TransformResult
  error?: string
  skipped?: boolean
  duration?: number
}

export interface TransformationSummary {
  filesChanged: number
  linesAdded: number
  linesRemoved: number
  tasksCompleted: number
  tasksFailed: number
  tasksSkipped: number
  errors: string[]
  warnings: string[]
  manualReviewNeeded: string[]
  estimatedTimeSaved: string
  totalDuration?: number
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface PipelineStage {
  name: string
  execute: (
    code: string,
    transformer: any,
    options: TransformOptions
  ) => Promise<StageResult>
}

export interface StageResult {
  success: boolean
  output: string
  error?: string
  metadata?: Record<string, any>
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface ProgressEvent {
  type: 'progress' | 'complete' | 'error'
  jobId: string
  message: string
  timestamp: Date
  data?: any
}

export interface ProgressUpdate {
  phase?: string
  task?: string
  file?: string
  percentage?: number
  status: 'pending' | 'in-progress' | 'complete' | 'failed'
}

// ============================================================================
// GitHub Integration Types
// ============================================================================

export interface RepositoryInfo {
  owner: string
  name: string
  branch?: string
  accessToken?: string
}

export interface RepositoryFile {
  path: string
  content: string
  sha: string
  size: number
  type: 'file' | 'dir' | 'symlink' | 'submodule'
}

// ============================================================================
// Transformer Registry Types
// ============================================================================

export interface TransformerMetadata {
  name: string
  version: string
  supportedPatternCategories: string[]
  supportedFrameworks: string[]
  supportedLanguages: string[]
  description: string
}

export interface TransformerConfig {
  enabled: boolean
  priority: number
  options?: Record<string, any>
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface TransformationRequest {
  repository: RepositoryInfo
  selectedTaskIds: string[]
  migrationPlan: MigrationPlan
  options?: TransformOptions
}

export interface TransformationResponse {
  jobId: string
  status: 'processing' | 'complete' | 'failed'
  message: string
  result?: OrchestrationResult
}

// ============================================================================
// Backup and Rollback Types
// ============================================================================

export interface Backup {
  id: string
  filePath: string
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface RollbackResult {
  success: boolean
  filesRestored: string[]
  errors: string[]
}

// ============================================================================
// Complexity Analysis Types
// ============================================================================

export interface ComplexityMetrics {
  cyclomaticComplexity: number
  nestingDepth: number
  linesChanged: number
  scopeChanges: number
  cognitiveComplexity?: number
}

export interface RiskAssessment {
  score: number
  factors: RiskFactor[]
  recommendation: 'safe' | 'review' | 'manual'
}

export interface RiskFactor {
  name: string
  impact: number
  description: string
}

// ============================================================================
// Type Guards
// ============================================================================

export function isTransformError(error: unknown): error is TransformError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error &&
    'severity' in error
  )
}

export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'severity' in error
  )
}

export function isTaskResult(result: unknown): result is TaskResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'taskId' in result &&
    'success' in result
  )
}
