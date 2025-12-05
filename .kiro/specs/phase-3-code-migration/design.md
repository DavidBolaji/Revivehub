# Design Document

## Overview

Phase 3: Universal Code Migration Engine is a hybrid transformation system that combines AST-based deterministic transformations with AI-powered semantic code generation. The system enables developers to migrate entire codebases from one technology stack to another (e.g., React → Next.js, Flask → FastAPI) while preserving functionality, logic, and business rules.

The design follows a modular architecture with clear separation of concerns:
- **UI Layer**: React components for migration configuration and progress tracking
- **Orchestration Layer**: Job management and task execution coordination
- **Transformation Layer**: Hybrid AST + AI transformation engine
- **Data Layer**: Migration specifications, repository data, and transformation results

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Phase3Card   │  │TargetSelector│  │ DiffViewer   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │/api/migrate  │  │/api/progress │  │/api/validate │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Orchestration Layer                             │
│  ┌──────────────────────────────────────────────────┐           │
│  │         MigrationOrchestrator                     │           │
│  │  - Job Management                                 │           │
│  │  - Task Scheduling                                │           │
│  │  - Progress Tracking                              │           │
│  │  - Error Handling                                 │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Transformation Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AST Engine   │  │  AI Engine   │  │ Rule Engine  │          │
│  │ - Babel      │  │ - Claude API │  │ - JSON Specs │          │
│  │ - TS API     │  │ - Prompts    │  │ - Mappings   │          │
│  │ - LibCST     │  │ - Context    │  │ - Validators │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ GitHub API   │  │ Redis Cache  │  │ File System  │          │
│  │ (Octokit)    │  │              │  │ (Backups)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Selects Target → Generate MigrationSpec → Fetch Repository Code
                                                        │
                                                        ▼
                                              Create Migration Job
                                                        │
                                                        ▼
                                    ┌───────────────────────────────┐
                                    │  For Each File in Repository  │
                                    └───────────────────────────────┘
                                                        │
                                                        ▼
                                    ┌───────────────────────────────┐
                                    │  Analyze File Type & Purpose  │
                                    └───────────────────────────────┘
                                                        │
                                                        ▼
                                    ┌───────────────────────────────┐
                                    │   Apply AST Transformations   │
                                    │   (imports, syntax, exports)  │
                                    └───────────────────────────────┘
                                                        │
                                                        ▼
                                    ┌───────────────────────────────┐
                                    │  Apply AI Transformations     │
                                    │  (semantic, framework-specific)│
                                    └───────────────────────────────┘
                                                        │
                                                        ▼
                                    ┌───────────────────────────────┐
                                    │  Validate Transformed Code    │
                                    └───────────────────────────────┘
                                                        │
                                                        ▼
                                    ┌───────────────────────────────┐
                                    │  Generate Diff & Metadata     │
                                    └───────────────────────────────┘
                                                        │
                                                        ▼
                                              Show Results to User
                                                        │
                                                        ▼
                                    User Reviews → Accept/Reject/Edit
```

## Components and Interfaces

### 1. UI Components

#### Phase3Card Component
```typescript
interface Phase3CardProps {
  sourceStack: SourceStack
  onMigrationStart: (config: MigrationConfig) => void
  repositoryName: string
  repositoryOwner: string
}

interface MigrationConfig {
  targetFramework: string
  targetVersion: string
  options: Record<string, any>
  migrationSpec: MigrationSpecification
}
```

**Responsibilities:**
- Display Phase 3 in migration plan UI
- Show dynamic content based on detected source stack
- Provide target framework selection interface
- Generate migration configuration

#### TargetFrameworkSelector Component
```typescript
interface TargetFrameworkSelectorProps {
  sourceFramework: string
  sourceLanguage: string
  onSelect: (target: TargetSelection) => void
}

interface TargetSelection {
  framework: string
  version: string
  options: FrameworkOptions
}

interface FrameworkOptions {
  router?: 'pages' | 'app' | 'file-based'
  styling?: 'css-modules' | 'tailwind' | 'styled-components'
  typescript?: boolean
  ssr?: boolean
  [key: string]: any
}
```

**Responsibilities:**
- Display compatible target frameworks
- Show framework-specific configuration options
- Validate option combinations
- Generate target stack configuration

#### MigrationProgressModal Component
```typescript
interface MigrationProgressModalProps {
  jobId: string
  onComplete: (result: OrchestrationResult) => void
  onError: (error: Error) => void
}
```

**Responsibilities:**
- Display real-time migration progress
- Show current file being processed
- Display progress percentage
- Handle errors and display messages

#### CodeMigrationDiffViewer Component
```typescript
interface CodeMigrationDiffViewerProps {
  originalCode: string
  transformedCode: string
  filePath: string
  metadata: MigrationMetadata
  onAccept: (modifiedCode?: string) => void
  onReject: () => void
  onEdit: (code: string) => void
}

interface MigrationMetadata {
  newFilePath: string
  fileType: 'page' | 'component' | 'layout' | 'api' | 'util' | 'module'
  language: string
  framework: string
  dependenciesAdded: string[]
  dependenciesRemoved: string[]
  notes: string[]
}
```

**Responsibilities:**
- Display before/after code comparison
- Allow inline editing of transformed code
- Show migration metadata
- Provide accept/reject actions

### 2. Migration Specification System

#### MigrationSpecGenerator
```typescript
class MigrationSpecGenerator {
  generate(
    source: SourceStack,
    target: TargetSelection,
    repository: RepositoryInfo
  ): MigrationSpecification
  
  loadFrameworkRules(framework: string, version: string): FrameworkRules
  
  generateMappings(
    source: SourceStack,
    target: TargetSelection
  ): MigrationMappings
  
  generateRules(
    source: SourceStack,
    target: TargetSelection
  ): MigrationRules
}

interface MigrationSpecification {
  source: SourceConfiguration
  target: TargetConfiguration
  mappings: MigrationMappings
  rules: MigrationRules
  metadata: SpecMetadata
}

interface SourceConfiguration {
  language: string
  framework: string
  version: string
  routing: string
  patterns: Record<string, any>
  buildTool: string
  packageManager: string
}

interface TargetConfiguration {
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

interface MigrationMappings {
  imports: ImportMappings
  routing: RoutingMappings
  components: ComponentMappings
  styling: StylingMappings
  stateManagement: StateManagementMappings
  buildSystem: BuildSystemMappings
}

interface MigrationRules {
  mustPreserve: string[]
  mustTransform: string[]
  mustRemove: string[]
  mustRefactor: string[]
  breakingChanges: BreakingChange[]
  deprecations: Deprecation[]
}

interface BreakingChange {
  id: string
  description: string
  affectedAPIs: string[]
  migrationPath: string
  autoFixable: boolean
}

interface Deprecation {
  id: string
  deprecated: string
  replacement: string
  version: string
  removalVersion?: string
}
```

### 3. Repository Code Fetcher

#### GitHubRepositoryFetcher
```typescript
class GitHubRepositoryFetcher {
  constructor(octokit: Octokit, cache: CacheService)
  
  async fetchRepositoryMetadata(
    owner: string,
    repo: string
  ): Promise<RepositoryMetadata>
  
  async fetchFileTree(
    owner: string,
    repo: string,
    branch?: string
  ): Promise<FileTreeNode[]>
  
  async fetchFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string>
  
  async fetchBatchFiles(
    owner: string,
    repo: string,
    paths: string[]
  ): Promise<Map<string, string>>
  
  async detectSourceStack(
    owner: string,
    repo: string
  ): Promise<SourceStack>
}

interface RepositoryMetadata {
  name: string
  owner: string
  defaultBranch: string
  language: string
  size: number
  fileCount: number
}

interface FileTreeNode {
  path: string
  type: 'file' | 'dir'
  sha: string
  size: number
  children?: FileTreeNode[]
}
```

### 4. Hybrid Transformation Engine

#### HybridTransformationEngine
```typescript
class HybridTransformationEngine {
  constructor(
    astEngine: ASTTransformationEngine,
    aiEngine: AITransformationEngine,
    ruleEngine: RuleEngine
  )
  
  async transform(
    file: RepositoryFile,
    spec: MigrationSpecification,
    context: TransformationContext
  ): Promise<TransformResult>
  
  async transformBatch(
    files: RepositoryFile[],
    spec: MigrationSpecification
  ): Promise<Map<string, TransformResult>>
  
  private async applyASTTransformations(
    code: string,
    spec: MigrationSpecification
  ): Promise<string>
  
  private async applyAITransformations(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): Promise<string>
  
  private async validateTransformation(
    original: string,
    transformed: string,
    spec: MigrationSpecification
  ): Promise<ValidationResult>
}

interface TransformationContext {
  filePath: string
  fileType: string
  dependencies: string[]
  imports: string[]
  exports: string[]
  relatedFiles: string[]
}
```

#### ASTTransformationEngine
```typescript
class ASTTransformationEngine {
  async parseCode(code: string, language: string): Promise<AST>
  
  async applyImportMappings(
    ast: AST,
    mappings: ImportMappings
  ): Promise<AST>
  
  async applySyntaxTransformations(
    ast: AST,
    mappings: SyntaxMappings
  ): Promise<AST>
  
  async applyRoutingTransformations(
    ast: AST,
    mappings: RoutingMappings
  ): Promise<AST>
  
  async generateCode(ast: AST, options: CodeGenOptions): Promise<string>
  
  async preserveFormatting(
    original: string,
    transformed: string
  ): Promise<string>
}
```

#### AITransformationEngine
```typescript
class AITransformationEngine {
  constructor(anthropic: Anthropic)
  
  async transformComponent(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): Promise<AITransformResult>
  
  async generateBoilerplate(
    fileType: string,
    spec: MigrationSpecification
  ): Promise<string>
  
  async mapLifecycleMethods(
    code: string,
    mappings: LifecycleMappings
  ): Promise<string>
  
  async restructureFileLayout(
    files: Map<string, string>,
    spec: MigrationSpecification
  ): Promise<Map<string, string>>
  
  private buildPrompt(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): string
}

interface AITransformResult {
  code: string
  confidence: number
  reasoning: string
  warnings: string[]
  requiresReview: boolean
}
```

#### RuleEngine
```typescript
class RuleEngine {
  loadRules(spec: MigrationSpecification): void
  
  validateAgainstRules(
    code: string,
    rules: MigrationRules
  ): RuleValidationResult
  
  applyMustPreserveRules(code: string): string
  
  applyMustTransformRules(code: string): string
  
  applyMustRemoveRules(code: string): string
  
  detectViolations(
    code: string,
    rules: MigrationRules
  ): Violation[]
}

interface Violation {
  id: string
  type: 'breaking-change' | 'deprecation' | 'incompatibility'
  severity: 'error' | 'warning'
  line: number
  column: number
  message: string
  suggestion: string
  autoFixable: boolean
}

interface RuleValidationResult {
  valid: boolean
  violations: Violation[]
  warnings: string[]
}
```

### 5. Version Upgrade System

#### VersionUpgradeDetector
```typescript
class VersionUpgradeDetector {
  async detectViolations(
    repository: RepositoryFile[],
    sourceVersion: string,
    targetVersion: string,
    framework: string
  ): Promise<ViolationReport>
  
  async loadBreakingChanges(
    framework: string,
    fromVersion: string,
    toVersion: string
  ): Promise<BreakingChange[]>
  
  async scanCodebase(
    files: RepositoryFile[],
    breakingChanges: BreakingChange[]
  ): Promise<Map<string, Violation[]>>
  
  async generateFixSuggestions(
    violations: Violation[]
  ): Promise<FixSuggestion[]>
}

interface ViolationReport {
  totalViolations: number
  violationsByFile: Map<string, Violation[]>
  violationsByType: Map<string, Violation[]>
  autoFixableCount: number
  manualReviewCount: number
  summary: string
}

interface FixSuggestion {
  violationId: string
  description: string
  autoFixable: boolean
  fixCode?: string
  manualSteps?: string[]
}
```

#### VersionUpgradeTransformer
```typescript
class VersionUpgradeTransformer {
  async autoFixViolations(
    files: Map<string, string>,
    violations: Map<string, Violation[]>
  ): Promise<Map<string, TransformResult>>
  
  async applyFix(
    code: string,
    violation: Violation,
    fix: FixSuggestion
  ): Promise<string>
  
  async updateDependencies(
    packageJson: string,
    targetVersion: string
  ): Promise<string>
  
  async generateMigrationGuide(
    violations: ViolationReport,
    fixes: Map<string, TransformResult>
  ): Promise<string>
}
```

### 6. Migration Orchestrator

#### MigrationOrchestrator
```typescript
class MigrationOrchestrator {
  async startMigration(
    request: MigrationRequest
  ): Promise<MigrationJob>
  
  async executeMigration(
    job: MigrationJob
  ): Promise<OrchestrationResult>
  
  async trackProgress(
    jobId: string,
    callback: (progress: ProgressUpdate) => void
  ): void
  
  async pauseMigration(jobId: string): Promise<void>
  
  async resumeMigration(jobId: string): Promise<void>
  
  async cancelMigration(jobId: string): Promise<void>
  
  async rollbackMigration(jobId: string): Promise<RollbackResult>
}

interface MigrationRequest {
  repository: RepositoryInfo
  migrationSpec: MigrationSpecification
  options: MigrationOptions
}

interface MigrationJob {
  id: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  repository: RepositoryInfo
  spec: MigrationSpecification
  progress: MigrationProgress
  startedAt: Date
  completedAt?: Date
  result?: OrchestrationResult
  error?: Error
}

interface MigrationProgress {
  totalFiles: number
  processedFiles: number
  currentFile?: string
  percentage: number
  estimatedTimeRemaining?: number
}

interface MigrationOptions {
  batchSize: number
  parallelism: number
  skipTests: boolean
  dryRun: boolean
  createBackups: boolean
}
```

## Data Models

### Migration Specification Schema
```json
{
  "source": {
    "language": "javascript",
    "framework": "react",
    "version": "18.2.0",
    "routing": "react-router",
    "patterns": {
      "componentStyle": "functional",
      "stateManagement": "redux",
      "styling": "css-modules"
    },
    "buildTool": "webpack",
    "packageManager": "npm"
  },
  "target": {
    "language": "typescript",
    "framework": "nextjs",
    "version": "14.0.0",
    "routing": "app-router",
    "fileStructure": {
      "pages": "app",
      "components": "components",
      "layouts": "app/layouts",
      "api": "app/api"
    },
    "componentConventions": {
      "fileExtension": ".tsx",
      "namingConvention": "PascalCase",
      "exportStyle": "named",
      "serverComponents": true
    },
    "syntaxMappings": {
      "import React from 'react'": "// React import not needed in Next.js 13+",
      "export default": "export"
    },
    "apiMappings": {
      "fetch": "fetch (native)",
      "axios": "fetch or server actions"
    },
    "lifecycleMappings": {
      "componentDidMount": "useEffect(() => {}, [])",
      "componentWillUnmount": "useEffect(() => { return () => {} }, [])"
    },
    "buildTool": "turbopack",
    "packageManager": "pnpm"
  },
  "mappings": {
    "imports": {
      "react-router-dom": "next/navigation",
      "react-router": "next/navigation"
    },
    "routing": {
      "<Route path='/about'>": "app/about/page.tsx",
      "<Link to='/about'>": "<Link href='/about'>"
    },
    "components": {
      "className": "className (unchanged)",
      "style": "style (unchanged)"
    },
    "styling": {
      "import './styles.css'": "import './styles.module.css'",
      ".css": ".module.css"
    },
    "stateManagement": {
      "useSelector": "useState or server state",
      "useDispatch": "server actions or useState"
    },
    "buildSystem": {
      "webpack.config.js": "next.config.js",
      ".babelrc": "next.config.js (swc)"
    }
  },
  "rules": {
    "mustPreserve": [
      "Business logic",
      "Component behavior",
      "Data flow",
      "User interactions"
    ],
    "mustTransform": [
      "Import statements",
      "Routing configuration",
      "File structure",
      "Build configuration"
    ],
    "mustRemove": [
      "react-router dependencies",
      "Redux if using server components",
      "Webpack configuration"
    ],
    "mustRefactor": [
      "Client-side data fetching to server components",
      "Route components to page.tsx files",
      "API routes to app/api structure"
    ],
    "breakingChanges": [
      {
        "id": "next-14-app-router",
        "description": "App Router is now stable and recommended",
        "affectedAPIs": ["pages directory", "getServerSideProps", "getStaticProps"],
        "migrationPath": "Move pages to app directory, use server components",
        "autoFixable": false
      }
    ],
    "deprecations": [
      {
        "id": "next-image-legacy",
        "deprecated": "next/legacy/image",
        "replacement": "next/image",
        "version": "13.0.0",
        "removalVersion": "15.0.0"
      }
    ]
  },
  "metadata": {
    "version": "1.0.0",
    "generatedAt": "2024-01-15T10:30:00Z",
    "estimatedComplexity": "high",
    "estimatedDuration": "4-8 hours"
  }
}
```

### Framework Rules Database Schema
```typescript
interface FrameworkRulesDatabase {
  frameworks: Map<string, FrameworkDefinition>
}

interface FrameworkDefinition {
  id: string
  name: string
  language: string
  versions: Map<string, VersionDefinition>
  compatibleTargets: CompatibleTarget[]
}

interface VersionDefinition {
  version: string
  releaseDate: string
  breakingChanges: BreakingChange[]
  deprecations: Deprecation[]
  newFeatures: Feature[]
  migrationGuides: string[]
}

interface CompatibleTarget {
  framework: string
  difficulty: 'easy' | 'medium' | 'hard'
  estimatedTime: string
  commonPatterns: string[]
}

interface Feature {
  id: string
  name: string
  description: string
  examples: string[]
}
```

## Error Handling

### Error Hierarchy
```typescript
class MigrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean
  ) {
    super(message)
  }
}

class TransformationError extends MigrationError {
  constructor(
    message: string,
    public filePath: string,
    public line?: number,
    public column?: number
  ) {
    super(message, 'TRANSFORMATION_ERROR', true)
  }
}

class ValidationError extends MigrationError {
  constructor(
    message: string,
    public violations: Violation[]
  ) {
    super(message, 'VALIDATION_ERROR', true)
  }
}

class GitHubAPIError extends MigrationError {
  constructor(
    message: string,
    public statusCode: number,
    public rateLimit?: RateLimitInfo
  ) {
    super(message, 'GITHUB_API_ERROR', true)
  }
}

class AIServiceError extends MigrationError {
  constructor(
    message: string,
    public retryable: boolean
  ) {
    super(message, 'AI_SERVICE_ERROR', retryable)
  }
}
```

### Error Recovery Strategies
```typescript
interface ErrorRecoveryStrategy {
  canRecover(error: MigrationError): boolean
  recover(error: MigrationError, context: any): Promise<RecoveryResult>
}

class RetryStrategy implements ErrorRecoveryStrategy {
  constructor(
    private maxRetries: number = 3,
    private backoffMs: number = 1000
  ) {}
  
  async recover(error: MigrationError): Promise<RecoveryResult> {
    // Exponential backoff retry logic
  }
}

class FallbackStrategy implements ErrorRecoveryStrategy {
  async recover(error: MigrationError): Promise<RecoveryResult> {
    // Use fallback transformation method
  }
}

class SkipStrategy implements ErrorRecoveryStrategy {
  async recover(error: MigrationError): Promise<RecoveryResult> {
    // Skip problematic file and continue
  }
}
```

## Testing Strategy

### Unit Tests
- Test each transformer independently
- Test AST parsing and generation
- Test rule engine validation
- Test migration spec generation
- Test violation detection

### Integration Tests
- Test AST + AI hybrid transformation
- Test GitHub API integration with mocks
- Test end-to-end file transformation
- Test progress tracking
- Test error recovery

### E2E Tests
- Test complete migration flow (React → Next.js)
- Test version upgrade flow
- Test violation detection and fixing
- Test diff viewing and editing
- Test rollback functionality

### Performance Tests
- Test large repository handling (1000+ files)
- Test parallel transformation
- Test memory usage
- Test API rate limiting
- Test caching effectiveness

## Security Considerations

1. **GitHub Token Security**
   - Store tokens securely in session
   - Never log or expose tokens
   - Use token with minimal required scopes

2. **Code Injection Prevention**
   - Sanitize all user inputs
   - Validate generated code before execution
   - Use AST manipulation instead of string concatenation

3. **Rate Limiting**
   - Implement client-side rate limiting
   - Cache GitHub API responses
   - Handle 429 responses gracefully

4. **AI Prompt Injection**
   - Sanitize code before sending to AI
   - Validate AI responses
   - Implement output filtering

5. **Data Privacy**
   - Don't store repository code permanently
   - Clear backups after migration
   - Respect repository privacy settings

## Performance Optimizations

1. **Parallel Processing**
   - Process independent files in parallel
   - Use worker threads for CPU-intensive tasks
   - Batch API requests

2. **Caching Strategy**
   - Cache GitHub API responses (5-10 minutes)
   - Cache parsed ASTs
   - Cache migration specs
   - Cache AI responses for identical inputs

3. **Streaming**
   - Stream large file transformations
   - Stream progress updates via SSE
   - Stream diff generation

4. **Lazy Loading**
   - Load framework rules on demand
   - Lazy load UI components
   - Defer non-critical transformations

## Deployment Considerations

1. **Environment Variables**
   ```
   ANTHROPIC_API_KEY=<claude-api-key>
   GITHUB_TOKEN=<github-token>
   REDIS_URL=<redis-connection-string>
   MAX_PARALLEL_TRANSFORMATIONS=5
   TRANSFORMATION_TIMEOUT_MS=300000
   ```

2. **Resource Requirements**
   - Memory: 2GB minimum, 4GB recommended
   - CPU: 2 cores minimum, 4 cores recommended
   - Storage: 10GB for backups and cache

3. **Monitoring**
   - Track transformation success rate
   - Monitor API usage and rate limits
   - Track average transformation time
   - Monitor error rates by type

4. **Scaling**
   - Horizontal scaling for API endpoints
   - Queue-based job processing
   - Distributed caching with Redis
   - CDN for static assets

## Migration Paths

### Supported Migration Paths (Initial Release)

#### JavaScript Ecosystem
- React → Next.js (Pages Router)
- React → Next.js (App Router)
- React → Vue 3
- Vue 2 → Vue 3
- Vue 3 → Nuxt 3
- Express → NestJS
- Next.js 12 → Next.js 14 (version upgrade)

#### Python Ecosystem
- Flask → FastAPI
- Django 3 → Django 4 (version upgrade)

#### Future Migration Paths
- Angular → React
- React → Svelte
- Laravel → Symfony
- React Native → Flutter

## Open Questions and Future Enhancements

1. **Multi-file Context**
   - How to handle cross-file dependencies during transformation?
   - Should we analyze entire codebase before transforming?

2. **Test Migration**
   - Should we automatically migrate test files?
   - How to handle different testing frameworks?

3. **Incremental Migration**
   - Support for partial migrations (migrate one route at a time)?
   - How to handle mixed codebases during transition?

4. **Custom Transformers**
   - Allow users to define custom transformation rules?
   - Plugin system for community transformers?

5. **AI Model Selection**
   - Support multiple AI providers (OpenAI, Anthropic, local models)?
   - Allow users to choose model based on cost/quality tradeoff?

6. **Confidence Scoring**
   - How to accurately calculate transformation confidence?
   - What threshold should trigger manual review?

7. **Rollback Granularity**
   - Support per-file rollback?
   - Support partial rollback (undo last N transformations)?
