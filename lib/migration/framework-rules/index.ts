/**
 * Framework Rules Module
 * 
 * Central export point for framework rules, schemas, and loader utilities.
 */

// Export schema types and validators
export * from './schema'

// Export loader class and utilities
export {
  FrameworkRulesLoader,
  getFrameworkRulesLoader,
  resetFrameworkRulesLoader,
  loadFrameworkRules,
  loadMigrationPath,
  loadVersionUpgradeRules,
  findMigrationPath,
  getCompatibleTargets,
} from './loader'

// Re-export commonly used types for convenience
export type {
  FrameworkRules,
  VersionRules,
  MigrationPath,
  FrameworkRulesDatabase,
  DefaultMappings,
  VersionConfiguration,
  MigrationStep,
  CommonIssue,
} from './schema'
