/**
 * Framework Rules JSON Schema and Type Definitions
 * 
 * This module defines the JSON schema for framework rules database,
 * including framework definitions, version-specific rules, and migration paths.
 */

import type {
  BreakingChange,
  Deprecation,
  Feature,
  CompatibleTarget,
  ImportMappings,
  RoutingMappings,
  ComponentMappings,
  StylingMappings,
  StateManagementMappings,
  BuildSystemMappings,
  FileStructureRules,
  ComponentConventions,
  SyntaxMappings,
  APIMappings,
  LifecycleMappings,
} from '@/types/migration'

// ============================================================================
// Framework Rules Schema
// ============================================================================

/**
 * Complete framework rules definition
 */
export interface FrameworkRules {
  id: string
  name: string
  displayName: string
  language: string
  category: 'frontend' | 'backend' | 'fullstack' | 'mobile'
  description: string
  officialWebsite: string
  versions: VersionRules[]
  compatibleTargets: CompatibleTarget[]
  defaultMappings?: DefaultMappings
}

/**
 * Version-specific rules for a framework
 */
export interface VersionRules {
  version: string
  releaseDate: string
  status: 'stable' | 'beta' | 'deprecated' | 'eol'
  breakingChanges: BreakingChange[]
  deprecations: Deprecation[]
  newFeatures: Feature[]
  migrationGuides: string[]
  configuration?: VersionConfiguration
}

/**
 * Version-specific configuration
 */
export interface VersionConfiguration {
  fileStructure: FileStructureRules
  componentConventions: ComponentConventions
  syntaxMappings: SyntaxMappings
  apiMappings: APIMappings
  lifecycleMappings: LifecycleMappings
  buildTool: string
  packageManager: string[]
}

/**
 * Default mappings for framework migrations
 */
export interface DefaultMappings {
  imports: ImportMappings
  routing: RoutingMappings
  components: ComponentMappings
  styling: StylingMappings
  stateManagement: StateManagementMappings
  buildSystem: BuildSystemMappings
}

/**
 * Migration path definition between frameworks
 */
export interface MigrationPath {
  id: string
  sourceFramework: string
  sourceVersionRange: string
  targetFramework: string
  targetVersionRange: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string
  automationLevel: 'full' | 'partial' | 'manual'
  description: string
  prerequisites: string[]
  steps: MigrationStep[]
  commonIssues: CommonIssue[]
}

/**
 * Individual migration step
 */
export interface MigrationStep {
  order: number
  title: string
  description: string
  automated: boolean
  estimatedTime: string
  commands?: string[]
  manualSteps?: string[]
}

/**
 * Common issues during migration
 */
export interface CommonIssue {
  id: string
  title: string
  description: string
  severity: 'error' | 'warning' | 'info'
  solution: string
  affectedVersions: string[]
}

/**
 * Framework rules database structure
 */
export interface FrameworkRulesDatabase {
  version: string
  lastUpdated: string
  frameworks: Record<string, string>
  migrationPaths: Record<string, string>
}

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Validates framework rules structure
 */
export function validateFrameworkRules(rules: unknown): rules is FrameworkRules {
  if (!rules || typeof rules !== 'object') return false
  
  const r = rules as any
  
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.displayName === 'string' &&
    typeof r.language === 'string' &&
    ['frontend', 'backend', 'fullstack', 'mobile'].includes(r.category) &&
    typeof r.description === 'string' &&
    typeof r.officialWebsite === 'string' &&
    Array.isArray(r.versions) &&
    Array.isArray(r.compatibleTargets)
  )
}

/**
 * Validates version rules structure
 */
export function validateVersionRules(rules: unknown): rules is VersionRules {
  if (!rules || typeof rules !== 'object') return false
  
  const r = rules as any
  
  return (
    typeof r.version === 'string' &&
    typeof r.releaseDate === 'string' &&
    ['stable', 'beta', 'deprecated', 'eol'].includes(r.status) &&
    Array.isArray(r.breakingChanges) &&
    Array.isArray(r.deprecations) &&
    Array.isArray(r.newFeatures) &&
    Array.isArray(r.migrationGuides)
  )
}

/**
 * Validates migration path structure
 */
export function validateMigrationPath(path: unknown): path is MigrationPath {
  if (!path || typeof path !== 'object') return false
  
  const p = path as any
  
  return (
    typeof p.id === 'string' &&
    typeof p.sourceFramework === 'string' &&
    typeof p.targetFramework === 'string' &&
    ['easy', 'medium', 'hard'].includes(p.difficulty) &&
    ['full', 'partial', 'manual'].includes(p.automationLevel) &&
    Array.isArray(p.steps)
  )
}

/**
 * Validates complete framework rules database
 */
export function validateFrameworkRulesDatabase(
  db: unknown
): db is FrameworkRulesDatabase {
  if (!db || typeof db !== 'object') return false
  
  const d = db as any
  
  return (
    typeof d.version === 'string' &&
    typeof d.lastUpdated === 'string' &&
    typeof d.frameworks === 'object' &&
    typeof d.migrationPaths === 'object'
  )
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Supported migration paths enum
 */
export enum SupportedMigrationPath {
  REACT_TO_NEXTJS_PAGES = 'react-to-nextjs-pages',
  REACT_TO_NEXTJS_APP = 'react-to-nextjs-app',
  REACT_TO_VUE3 = 'react-to-vue3',
  VUE2_TO_VUE3 = 'vue2-to-vue3',
  VUE3_TO_NUXT3 = 'vue3-to-nuxt3',
  EXPRESS_TO_NESTJS = 'express-to-nestjs',
  FLASK_TO_FASTAPI = 'flask-to-fastapi',
  NEXTJS_12_TO_14 = 'nextjs-12-to-14',
  NEXTJS_13_TO_14 = 'nextjs-13-to-14',
}

/**
 * Framework identifiers
 */
export enum FrameworkId {
  REACT = 'react',
  NEXTJS = 'nextjs',
  VUE2 = 'vue2',
  VUE3 = 'vue3',
  NUXT3 = 'nuxt3',
  ANGULAR = 'angular',
  SVELTE = 'svelte',
  EXPRESS = 'express',
  NESTJS = 'nestjs',
  FLASK = 'flask',
  FASTAPI = 'fastapi',
  DJANGO = 'django',
  LARAVEL = 'laravel',
}
