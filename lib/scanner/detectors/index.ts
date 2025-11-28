// Detector exports
export { BaseDetector } from './base'
export { LanguageDetector } from './language'
export { FrameworkRecognizer } from './framework'
export { BuildToolDetector } from './buildtool'
export { DependencyAnalyzer } from './dependency'

// Re-export types for convenience
export type {
  Detector,
  DetectionResult,
  DetectionError,
  LanguageDetectionResult,
  FrameworkDetectionResult,
  BuildToolDetectionResult,
  DependencyAnalysisResult,
} from '../types'