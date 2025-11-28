// Phase 3: Code Migration Type Definitions
// Import and re-export shared types from transformer.ts to avoid duplication
import type {
  SourceStack,
  RepositoryInfo,
  RepositoryFile,
  ValidationResult,
  ValidationError,
  TransformResult,
  ComplexityMetrics,
  OrchestrationResult,
  ProgressUpdate,
  RollbackResult,
} from './transformer'

export type {
  SourceStack,
  RepositoryInfo,
  RepositoryFile,
  ValidationResult,
  ValidationError,
  TransformResult,
  ComplexityMetrics,
  OrchestrationResult,
  ProgressUpdate,
  RollbackResult,
}

// ============================================================================
// Migration Configuration Types (Phase 3 Specific)
// ============================================================================

export interface MigrationConfig {
  targetFramework: string
  targetVersion: string
  options: Record<string, any>
  migrationSpec: MigrationSpecification
}

export interface TargetSelection {
  framework: string
  version: string
  options: FrameworkOptions
}

export interface FrameworkOptions {
  router?: 'pages' | 'app' | 'file-based'
  styling?: 'css-modules' | 'tailwind' | 'styled-components' | 'emotion' | 'sass'
  typescript?: boolean
  ssr?: boolean
  [key: string]: any
}

// ============================================================================
// Source and Target Stack Types (Phase 3 Extensions)
// ============================================================================

export interface SourceConfiguration {
  language: string
  framework: string
  version: string
  routing: string
  patterns: Record<string, any>
  buildTool: string
  packageManager: string
}

export interface TargetConfiguration {
  language: string
  framework: string
  version: string
  routing: string
  fileStructure: FileStructureRules
  componentConventions: ComponentConventions
  syntaxMappings: SyntaxMappings
  apiMappings: APIMappings
  lifecycleMappings: LifecycleMappings
  buildTool: string
  packageManager: string
}

export interface FileStructureRules {
  pages: string
  components: string
  layouts: string
  api: string
  [key: string]: string
}

export interface ComponentConventions {
  fileExtension: string
  namingConvention: 'PascalCase' | 'camelCase' | 'kebab-case'
  exportStyle: 'default' | 'named'
  serverComponents?: boolean
  [key: string]: any
}

export interface SyntaxMappings {
  [key: string]: string
}

export interface APIMappings {
  [key: string]: string
}

export interface LifecycleMappings {
  [key: string]: string
}

// ============================================================================
// Migration Specification Types
// ============================================================================

export interface MigrationSpecification {
  source: SourceConfiguration
  target: TargetConfiguration
  mappings: MigrationMappings
  rules: MigrationRules
  metadata: SpecMetadata
}

export interface MigrationMappings {
  imports: ImportMappings
  routing: RoutingMappings
  components: ComponentMappings
  styling: StylingMappings
  stateManagement: StateManagementMappings
  buildSystem: BuildSystemMappings
}

export interface ImportMappings {
  [sourceImport: string]: string
}

export interface RoutingMappings {
  [sourceRoute: string]: string
}

export interface ComponentMappings {
  [sourceComponent: string]: string
}

export interface StylingMappings {
  [sourceStyle: string]: string
}

export interface StateManagementMappings {
  [sourcePattern: string]: string
}

export interface BuildSystemMappings {
  [sourceConfig: string]: string
}

export interface MigrationRules {
  mustPreserve: string[]
  mustTransform: string[]
  mustRemove: string[]
  mustRefactor: string[]
  breakingChanges: BreakingChange[]
  deprecations: Deprecation[]
}

export interface BreakingChange {
  id: string
  description: string
  affectedAPIs: string[]
  migrationPath: string
  autoFixable: boolean
}

export interface Deprecation {
  id: string
  deprecated: string
  replacement: string
  version: string
  removalVersion?: string
}

export interface SpecMetadata {
  version: string
  generatedAt: string
  estimatedComplexity: 'low' | 'medium' | 'high'
  estimatedDuration: string
}

// ============================================================================
// Framework Rules Database Types
// ============================================================================

export interface FrameworkRulesDatabase {
  frameworks: Map<string, FrameworkDefinition>
}

export interface FrameworkDefinition {
  id: string
  name: string
  language: string
  versions: Map<string, VersionDefinition>
  compatibleTargets: CompatibleTarget[]
}

export interface VersionDefinition {
  version: string
  releaseDate: string
  breakingChanges: BreakingChange[]
  deprecations: Deprecation[]
  newFeatures: Feature[]
  migrationGuides: string[]
}

export interface CompatibleTarget {
  framework: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string
  commonPatterns: string[]
}

export interface Feature {
  id: string
  name: string
  description: string
  examples: string[]
}

// ============================================================================
// Transformation Types
// ============================================================================

// Extended TransformResult for Phase 3 (extends base from transformer.ts)
export interface Phase3TransformResult {
  code: string
  originalCode: string // Add original code for diff viewing
  filePath: string
  newFilePath: string
  metadata: MigrationMetadata
  diff: string
  confidence: number
  requiresReview: boolean
  warnings: string[]
}

export interface MigrationMetadata {
  newFilePath: string
  fileType: 'page' | 'component' | 'layout' | 'api' | 'util' | 'module' | 'config' | 'test' | 'error' | 'loading' | 'style'
  language: string
  framework: string
  dependenciesAdded: string[]
  dependenciesRemoved: string[]
  notes: string[]
  fileStructureChange?: {
    action: 'move' | 'create' | 'rename' | 'delete'
    originalPath: string
    isRouteFile: boolean
    routeSegment?: string
  }
}

export interface TransformationContext {
  filePath: string
  fileType: string
  dependencies: string[]
  imports: string[]
  exports: string[]
  relatedFiles: string[]
}

export interface AITransformResult {
  code: string
  confidence: number
  reasoning: string
  warnings: string[]
  requiresReview: boolean
}

// Extended validation for Phase 3 migration rules
export interface RuleValidationResult {
  valid: boolean
  violations: Violation[]
  warnings: string[]
}

// ============================================================================
// Version Upgrade Types
// ============================================================================

export interface ViolationReport {
  totalViolations: number
  violationsByFile: Map<string, Violation[]>
  violationsByType: Map<string, Violation[]>
  autoFixableCount: number
  manualReviewCount: number
  summary: string
}

export interface Violation {
  id: string
  type: 'breaking-change' | 'deprecation' | 'incompatibility'
  severity: 'error' | 'warning'
  line: number
  column: number
  message: string
  suggestion: string
  autoFixable: boolean
  filePath?: string
}

export interface FixSuggestion {
  violationId: string
  description: string
  autoFixable: boolean
  fixCode?: string
  manualSteps?: string[]
}

// ============================================================================
// Repository and File Types (Phase 3 Extensions)
// ============================================================================

export interface RepositoryMetadata {
  name: string
  owner: string
  defaultBranch: string
  language: string
  size: number
  fileCount: number
}

export interface FileTreeNode {
  path: string
  type: 'file' | 'dir'
  sha: string
  size: number
  children?: FileTreeNode[]
}

// ============================================================================
// Migration Job and Orchestration Types
// ============================================================================

export interface MigrationRequest {
  repository: RepositoryInfo
  migrationSpec: MigrationSpecification
  options: MigrationOptions
}

export interface MigrationJob {
  id: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  repository: RepositoryInfo
  spec: MigrationSpecification
  progress: MigrationProgress
  startedAt: Date
  completedAt?: Date
  result?: Phase3OrchestrationResult
  error?: Error
  accessToken: string // GitHub access token for API calls
}

export interface MigrationProgress {
  totalFiles: number
  processedFiles: number
  currentFile?: string
  percentage: number
  estimatedTimeRemaining?: number
}

export interface MigrationOptions {
  batchSize: number
  parallelism: number
  skipTests: boolean
  dryRun: boolean
  createBackups: boolean
}

// Extended orchestration result for Phase 3
export interface Phase3OrchestrationResult {
  jobId: string
  status: 'success' | 'partial' | 'failed'
  transformations: Map<string, Phase3TransformResult>
  errors: Map<string, Error>
  summary: MigrationSummary
}

export interface MigrationSummary {
  totalFiles: number
  successfulTransformations: number
  failedTransformations: number
  filesRequiringReview: number
  linesAdded: number
  linesRemoved: number
  dependenciesAdded: string[]
  dependenciesRemoved: string[]
}

// Extended progress update for Phase 3
export interface Phase3ProgressUpdate {
  jobId: string
  progress: MigrationProgress
  currentFile?: string
  message?: string
  timestamp: Date
}

// ============================================================================
// Error Types
// ============================================================================

export class MigrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean
  ) {
    super(message)
    this.name = 'MigrationError'
  }
}

export class TransformationError extends MigrationError {
  constructor(
    message: string,
    public filePath: string,
    public line?: number,
    public column?: number
  ) {
    super(message, 'TRANSFORMATION_ERROR', true)
  }
}

export class MigrationValidationError extends MigrationError {
  constructor(
    message: string,
    public violations: Violation[]
  ) {
    super(message, 'VALIDATION_ERROR', true)
  }
}

export class GitHubAPIError extends MigrationError {
  constructor(
    message: string,
    public statusCode: number,
    public rateLimit?: RateLimitInfo
  ) {
    super(message, 'GITHUB_API_ERROR', true)
  }
}

export class AIServiceError extends MigrationError {
  constructor(
    message: string,
    public retryable: boolean
  ) {
    super(message, 'AI_SERVICE_ERROR', retryable)
  }
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: Date
}

// ============================================================================
// Recovery and Strategy Types
// ============================================================================

export interface RecoveryResult {
  success: boolean
  strategy: string
  code?: string
  error?: Error
}

export interface ErrorRecoveryStrategy {
  canRecover(error: MigrationError): boolean
  recover(error: MigrationError, context: any): Promise<RecoveryResult>
}

// ============================================================================
// Confidence and Complexity Types
// ============================================================================

export interface ConfidenceFactors {
  syntaxValid: boolean
  semanticEquivalence: boolean
  testsPassed: boolean
  complexityScore: number
  patternMatches: number
}

// ComplexityMetrics is re-exported from transformer.ts

// ============================================================================
// Code Generation Types
// ============================================================================

export interface CodeGenOptions {
  preserveFormatting: boolean
  retainComments: boolean
  indentStyle: 'spaces' | 'tabs'
  indentSize: number
  quote: 'single' | 'double'
  trailingComma: boolean
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}
