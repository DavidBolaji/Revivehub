// Core services
export { ScannerOrchestrator } from './services/orchestrator'
export { CachedScannerOrchestrator } from './services/cached-orchestrator'
export { RepositoryFetcher } from './services/repository-fetcher'
export { HealthScorer } from './services/health-scorer'
export { EnhancedHealthScorer } from './services/enhanced-health-scorer'
export { ReportGenerator } from './services/report-generator'

// Detectors
export { LanguageDetector } from './detectors/language'
export { FrameworkRecognizer } from './detectors/framework'
export { BuildToolDetector } from './detectors/buildtool'
export { DependencyAnalyzer } from './detectors/dependency'
export { BaseDetector } from './detectors/base'

// Cache services
export {
  MemoryCacheService,
  RedisCacheService,
  createCacheService,
  generateScannerCacheKey,
  getScannerCacheTTL,
} from './services/cache'
export type { CacheService } from './services/cache'

// Configuration
export {
  getScannerConfig,
  loadScannerConfig,
  validateScannerConfig,
  resetScannerConfig,
  ConfigurationError,
} from './config'
export type { ScannerConfig } from './config'

// Types
export type * from './types'
export type { HealthScoringInput } from './services/health-scorer'
