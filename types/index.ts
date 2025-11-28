// Core types for ReviveHub

export interface Repository {
  id: string
  name: string
  owner: string
  url: string
  language: string
  description?: string
}

export interface CodeFile {
  path: string
  content: string
  language: string
  size: number
}

export interface AnalysisResult {
  id: string
  repositoryId: string
  timestamp: Date
  issues: Issue[]
  recommendations: Recommendation[]
  metrics: CodeMetrics
}

export interface Issue {
  id: string
  type: IssueType
  severity: 'critical' | 'high' | 'medium' | 'low'
  file: string
  line: number
  message: string
  pattern: string
}

export type IssueType =
  | 'deprecated-api'
  | 'security-vulnerability'
  | 'performance'
  | 'code-smell'
  | 'outdated-dependency'
  | 'compatibility'

export interface Recommendation {
  id: string
  issueId: string
  title: string
  description: string
  modernCode: string
  legacyCode: string
  confidence: number
  effort: 'low' | 'medium' | 'high'
}

export interface CodeMetrics {
  totalFiles: number
  totalLines: number
  technicalDebt: number
  maintainabilityIndex: number
  complexity: number
}

export interface TransformationRule {
  id: string
  name: string
  pattern: RegExp | string
  replacement: string
  language: string
  category: string
}

export interface AIAnalysisRequest {
  code: string
  language: string
  context?: string
}

export interface AIAnalysisResponse {
  issues: Issue[]
  recommendations: Recommendation[]
  summary: string
}

// Export transformer types
export * from './transformer'

// Export migration types (Phase 3)
export * from './migration'
