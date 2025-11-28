/**
 * Migration Module
 * 
 * Central export point for migration-related functionality.
 */

// Export framework rules
export * from './framework-rules'

// Export spec generator
export {
  MigrationSpecGenerator,
  getMigrationSpecGenerator,
  resetMigrationSpecGenerator,
  generateMigrationSpec,
} from './spec-generator'

// Export transformation engines
export { ASTTransformationEngine } from './ast-transformation-engine'
export { AITransformationEngine } from './ai-transformation-engine'

// Export rule engine
export {
  RuleEngine,
  getRuleEngine,
  resetRuleEngine,
} from './rule-engine'

// Export version upgrade system
export {
  VersionUpgradeDetector,
  getVersionUpgradeDetector,
  resetVersionUpgradeDetector,
} from './version-upgrade-detector'

export {
  VersionUpgradeTransformer,
  getVersionUpgradeTransformer,
  resetVersionUpgradeTransformer,
} from './version-upgrade-transformer'

// Export migration orchestrator
export {
  MigrationOrchestrator,
  getMigrationOrchestrator,
  resetMigrationOrchestrator,
} from './migration-orchestrator'

// Export GitHub fetcher
export { GitHubRepositoryFetcher } from './github-fetcher'
export type { FetchProgressCallback } from './github-fetcher'

// Export hybrid transformation engine
export { HybridTransformationEngine } from './hybrid-transformation-engine'

// Export error handling
export {
  MigrationError,
  TransformationError,
  ValidationError,
  GitHubAPIError,
  AIServiceError,
  ParseError,
  OrchestrationError,
  BackupError,
  handleMigrationError,
  logMigrationEvent,
} from './errors'

// Export error recovery
export {
  RecoveryManager,
  RetryStrategy,
  FallbackStrategy,
  SkipStrategy,
  CompositeRecoveryStrategy,
  createDefaultRecoveryManager,
} from './error-recovery'
export type {
  ErrorRecoveryStrategy,
  RecoveryContext,
  RecoveryResult,
} from './error-recovery'

// Export backup management
export {
  BackupManager,
  BackupTransaction,
  createBackupTransaction,
} from './backup-manager'
export type {
  BackupEntry,
  BackupSnapshot,
} from './backup-manager'

// Re-export commonly used types
export type {
  MigrationSpecification,
  SourceConfiguration,
  TargetConfiguration,
  MigrationMappings,
  MigrationRules,
  SpecMetadata,
  TargetSelection,
  FrameworkOptions,
  ViolationReport,
  Violation,
  FixSuggestion,
  MigrationRequest,
  MigrationJob,
  MigrationProgress,
  MigrationOptions,
  Phase3OrchestrationResult,
  Phase3TransformResult,
  MigrationSummary,
  Phase3ProgressUpdate,
  RepositoryFile,
  RepositoryMetadata,
  FileTreeNode,
  TransformationContext,
  AITransformResult,
  RuleValidationResult,
  MigrationMetadata,
} from '@/types/migration'
