// Core Scanner Types

export interface Detector {
  name: string
  detect(context: RepositoryContext): Promise<DetectionResult>
  getDependencies(): string[] // Other detectors this depends on
}

export interface RepositoryContext {
  owner: string
  repo: string
  files: FileTree
  contents: Map<string, string> // path -> content
  metadata: RepositoryMetadata
}

export interface FileTree {
  files: FileNode[]
  totalFiles: number
  totalSize: number
}

export interface FileNode {
  path: string
  type: 'file' | 'dir'
  size: number
  sha: string
  content?: string // Lazy-loaded for files
}

export interface RepositoryMetadata {
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  language: string | null
  createdAt: Date
  updatedAt: Date
  pushedAt: Date
  size: number
  stargazersCount: number
  forksCount: number
}

// Base detection result interface
export interface DetectionResult {
  detectorName: string
  success: boolean
  error?: DetectionError
}

export interface DetectionError {
  code: string
  message: string
  recoverable: boolean
}

// Language Detection Types
export interface LanguageDetectionResult extends DetectionResult {
  languages: DetectedLanguage[]
  primaryLanguage: DetectedLanguage | null
}

export interface DetectedLanguage {
  name: 'JavaScript' | 'TypeScript' | 'Python' | 'Ruby' | 'PHP' | 'Go' | 'Java' | 'C#'
  confidence: number // 0-100
  fileCount: number
  linesOfCode: number
  configFiles: string[]
}

// Framework Detection Types
export interface FrameworkDetectionResult extends DetectionResult {
  frontend: DetectedFramework[]
  backend: DetectedFramework[]
}

export interface DetectedFramework {
  name: string
  version: string
  category: 'frontend' | 'backend'
  configFiles: string[]
  confidence: number
}

// Build Tool Detection Types
export interface BuildToolDetectionResult extends DetectionResult {
  buildTools: DetectedBuildTool[]
}

export interface DetectedBuildTool {
  name: 'Webpack' | 'Vite' | 'Rollup' | 'esbuild' | 'Parcel' | 'Turbopack'
  version: string
  configFile?: string
  buildScripts: string[]
}

// Dependency Analysis Types
export interface DependencyAnalysisResult extends DetectionResult {
  dependencies: DependencyInfo[]
  devDependencies: DependencyInfo[]
  outdatedDependencies: OutdatedDependency[]
  totalCount: number
  devCount: number
}

export interface DependencyInfo {
  name: string
  installedVersion: string
  latestVersion?: string
  type: 'direct' | 'dev'
  ecosystem: 'npm' | 'pip' | 'gem' | 'composer'
}

export interface OutdatedDependency extends DependencyInfo {
  majorVersionsBehind: number
  severity: 'critical' | 'warning' | 'info'
}

// Health Scoring Types
export interface HealthScore {
  total: number // 0-100
  categories: {
    dependencyHealth: CategoryScore
    frameworkModernity: CategoryScore
    buildHealth: CategoryScore
    codeQuality: CategoryScore
    documentation: CategoryScore
    repositoryActivity: CategoryScore
  }
}

export interface CategoryScore {
  score: number
  maxScore: number
  factors: ScoringFactor[]
}

export interface ScoringFactor {
  name: string
  impact: number // positive or negative
  description: string
}

// Analysis Report Types
export interface AnalysisReport {
  repository: {
    owner: string
    name: string
    analyzedAt: Date
    commitSha: string
  }
  languages: LanguageDetectionResult
  frameworks: FrameworkDetectionResult
  buildTools: BuildToolDetectionResult
  dependencies: DependencyAnalysisResult
  healthScore: HealthScore
  issues: Issue[]
  recommendations: Recommendation[]
  metadata: {
    analysisVersion: string
    completionStatus: 'complete' | 'partial'
    errors: string[]
  }
}

export interface Issue {
  severity: 'critical' | 'warning' | 'info'
  category: string
  title: string
  description: string
  affectedFiles?: string[]
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  actionItems: string[]
  estimatedEffort: 'low' | 'medium' | 'high'
}

// Detector Result Wrapper
export interface DetectorResult<T extends DetectionResult> {
  success: boolean
  data?: T
  error?: DetectionError
}

// Analysis Data for aggregation
export interface AnalysisData {
  results: Map<string, DetectorResult<any>>
  context: RepositoryContext
  metadata?: {
    completionStatus: 'complete' | 'partial'
    errors: string[]
  }
}