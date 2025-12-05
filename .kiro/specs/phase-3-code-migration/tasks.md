# Implementation Plan

- [x] 1. Set up Phase 3 foundation and type definitions





  - Create type definitions for migration specifications, framework rules, and transformation results
  - Define interfaces for MigrationConfig, TargetSelection, FrameworkOptions
  - Create types for ViolationReport, FixSuggestion, and version upgrade structures
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implement Framework Rules Database









- [x] 2.1 Create framework rules JSON schema and storage structure






  - Design JSON schema for framework definitions, versions, and migration paths
  - Create storage structure in `lib/migration/framework-rules/`
  - Define supported migration paths (React→Next.js, Flask→FastAPI, etc.)
  - _Requirements: 2.1, 14.1_



- [x] 2.2 Implement React to Next.js migration rules
  - Create React framework definition with version-specific rules
  - Define Next.js target configuration (Pages Router and App Router)
  - Specify import mappings, routing mappings, and lifecycle mappings
  - Document breaking changes and deprecations


  - _Requirements: 2.2, 2.3, 14.1_

- [x] 2.3 Implement version upgrade rules for Next.js
  - Define breaking changes between Next.js versions (12→13, 13→14)


  - Create deprecation rules with auto-fix suggestions
  - Document API changes and migration paths
  - _Requirements: 11.3, 11.4_

- [x] 2.4 Create framework rules loader utility

  - Implement function to load framework rules from JSON files
  - Add caching for frequently accessed rules
  - Create validation for rule schema
  - _Requirements: 2.1, 14.1_

- [x] 3. Build Migration Specification Generator





- [x] 3.1 Implement MigrationSpecGenerator class


  - Create class to generate migration specifications from source/target selection
  - Implement `generate()` method that combines source, target, mappings, and rules
  - Add `loadFrameworkRules()` method to fetch framework-specific rules
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 Implement mapping generation logic


  - Create `generateMappings()` method for import, routing, component mappings
  - Generate syntax mappings based on source/target language differences
  - Create state management and build system mappings
  - _Requirements: 3.4, 3.5_



- [x] 3.3 Implement rule generation logic

  - Create `generateRules()` method for mustPreserve, mustTransform, mustRemove
  - Extract breaking changes and deprecations from framework rules
  - Generate validation rules for target framework
  - _Requirements: 3.5_

- [x] 4. Create GitHub Repository Fetcher








- [x] 4.1 Implement GitHubRepositoryFetcher class

  - Set up Octokit client with retry and throttling plugins
  - Implement `fetchRepositoryMetadata()` method
  - Add rate limit checking before expensive operations
  - _Requirements: 4.1, 4.5, 4.6_


- [x] 4.2 Implement file tree fetching

  - Create `fetchFileTree()` method to get repository structure
  - Implement recursive tree traversal
  - Filter files based on .gitignore patterns
  - _Requirements: 4.2, 4.3_


- [x] 4.3 Implement batch file content fetching

  - Create `fetchBatchFiles()` method for parallel file fetching
  - Implement batching logic (20 files per batch)
  - Add progress tracking for large repositories
  - _Requirements: 4.4, 15.5_

- [x] 4.4 Implement source stack detection




  - Create `detectSourceStack()` method to analyze package.json
  - Detect framework, version, language, and build tools
  - Identify routing library and state management
  - _Requirements: 4.1_



- [x] 4.5 Add caching layer for GitHub API responses

  - Implement Redis caching for repository metadata (5 min TTL)
  - Cache file tree structure (10 min TTL)
  - Cache file contents (10 min TTL)
  - _Requirements: 4.5, 15.1_

- [x] 5. Build AST Transformation Engine


- [x] 5.1 Implement ASTTransformationEngine class



  - Create class with support for JavaScript, TypeScript, Python parsers
  - Implement `parseCode()` method using Babel for JS/TS
  - Add error handling for syntax errors
  - _Requirements: 5.1, 5.5, 14.4_

- [x] 5.2 Implement import mapping transformations

  - Create `applyImportMappings()` method to transform import statements
  - Handle default imports, named imports, and namespace imports
  - Update import paths based on migration spec
  - _Requirements: 5.2_

- [x] 5.3 Implement syntax transformations

  - Create `applySyntaxTransformations()` method for language-specific changes
  - Transform JSX syntax if needed
  - Apply TypeScript type annotations if migrating to TS
  - _Requirements: 5.2_

- [x] 5.4 Implement routing transformations

  - Create `applyRoutingTransformations()` method
  - Transform react-router to Next.js routing
  - Update Link components and navigation
  - _Requirements: 5.2_

- [x] 5.5 Implement code generation with formatting preservation

  - Create `generateCode()` method using recast for format preservation
  - Maintain original indentation and style
  - Preserve comments and whitespace
  - _Requirements: 5.4_

- [-] 6. Build AI Transformation Engine


- [x] 6.1 Implement AITransformationEngine class




  - Set up Anthropic client for Claude API
  - Create class with prompt building utilities
  - Implement retry logic for API failures
  - _Requirements: 5.3_

- [x] 6.2 Implement component transformation






  - Create `transformComponent()` method for semantic transformations
  - Build prompts with migration spec and source code
  - Parse AI response and extract transformed code
  - Calculate confidence score from AI response
  - _Requirements: 5.3_

- [x] 6.3 Implement lifecycle method mapping






  - Create `mapLifecycleMethods()` method
  - Transform React lifecycle methods to hooks
  - Handle componentDidMount, componentWillUnmount, etc.
  - _Requirements: 5.3_

- [x] 6.4 Implement file layout restructuring
















  - Create `restructureFileLayout()` method
  - Move files to target framework directory structure
  - Rename files with appropriate extensions
  - Generate missing target-specific files (layouts, configs)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6.5 Implement boilerplate generation





  - Create `generateBoilerplate()` method for new files
  - Generate Next.js layouts, error boundaries, loading states
  - Create API route boilerplate
  - _Requirements: 6.5_

- [x] 7. Build Rule Engine






- [x] 7.1 Implement RuleEngine class


  - Create class to load and apply migration rules
  - Implement `loadRules()` method from migration spec
  - Add rule validation logic
  - _Requirements: 5.2_


- [x] 7.2 Implement rule validation




  - Create `validateAgainstRules()` method
  - Check mustPreserve rules (business logic, behavior)
  - Validate mustTransform rules are applied
  - Ensure mustRemove rules are followed
  - _Requirements: 5.5_


- [ ] 7.3 Implement violation detection



  - Create `detectViolations()` method for breaking changes
  - Scan code for deprecated APIs
  - Identify incompatible patterns
  - Generate violation reports with line numbers
  - _Requirements: 11.5, 11.6_

- [-] 8. Build Hybrid Transformation Engine





- [x] 8.1 Implement HybridTransformationEngine class








  - Create orchestrator class combining AST, AI, and Rule engines
  - Implement `transform()` method for single file transformation
  - Add transformation context building
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8.2 Implement transformation pipeline





  - Apply AST transformations first (deterministic)
  - Apply AI transformations for semantic changes
  - Validate with rule engine
  - Generate diff and metadata
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 8.3 Implement batch transformation





  - Create `transformBatch()` method for parallel processing
  - Process independent files in parallel (5 at a time)
  - Track progress for each file
  - _Requirements: 15.2, 15.5_

- [x] 8.4 Implement transformation validation





  - Create `validateTransformation()` method
  - Check syntax validity of transformed code
  - Verify semantic equivalence
  - Calculate confidence and risk scores
  - _Requirements: 5.5, 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 9. Build Version Upgrade System




- [x] 9.1 Implement VersionUpgradeDetector class


  - Create class to detect version-specific violations
  - Implement `loadBreakingChanges()` method
  - Load deprecations and API changes between versions
  - _Requirements: 11.3, 11.4_




- [x] 9.2 Implement codebase scanning
  - Create `scanCodebase()` method to find violations
  - Use AST to detect deprecated API usage
  - Match patterns against breaking change rules
  - Generate violation report with file paths and line numbers
  - _Requirements: 11.4, 11.5, 11.6_

- [x] 9.3 Implement fix suggestion generation
  - Create `generateFixSuggestions()` method
  - Generate auto-fix code for fixable violations
  - Provide manual steps for complex violations
  - _Requirements: 11.7, 11.13_



- [x] 9.4 Implement VersionUpgradeTransformer class


  - Create class to apply version upgrade fixes
  - Implement `autoFixViolations()` method

  - Apply fixes using AST transformations
  - _Requirements: 11.8, 11.9_

- [x] 9.5 Implement dependency updates


  - Create `updateDependencies()` method

  - Update package.json with new versions
  - Update lock files (package-lock.json, yarn.lock, pnpm-lock.yaml)
  - _Requirements: 11.11, 11.12_

- [x] 9.6 Implement migration guide generation


  - Create `generateMigrationGuide()` method
  - Document all changes made during upgrade
  - List manual steps required
  - Include before/after examples
  - _Requirements: 11.15_

- [x] 10. Build Migration Orchestrator






- [x] 10.1 Implement MigrationOrchestrator class

  - Create job management system
  - Implement `startMigration()` method to create jobs
  - Add job status tracking (pending, running, completed, failed)
  - _Requirements: 7.1, 7.2_

- [x] 10.2 Implement migration execution

  - Create `executeMigration()` method
  - Fetch repository code
  - Generate migration spec
  - Execute transformations in batches
  - _Requirements: 7.3, 7.4_

- [x] 10.3 Implement progress tracking

  - Create `trackProgress()` method with callback
  - Emit progress events via Server-Sent Events
  - Calculate percentage and estimated time remaining
  - _Requirements: 7.2, 7.3, 7.4_


- [x] 10.4 Implement job control methods

  - Create `pauseMigration()` method
  - Create `resumeMigration()` method
  - Create `cancelMigration()` method
  - _Requirements: 7.1_

- [x] 10.5 Implement rollback functionality

  - Create `rollbackMigration()` method
  - Restore files from backups
  - Clean up partial transformations
  - _Requirements: 12.3, 12.4_

- [x] 11. Create API Routes



- [x] 11.1 Create /api/migration/start endpoint

  - Accept MigrationRequest with repository info and spec
  - Validate request parameters
  - Create migration job
  - Return job ID
  - _Requirements: 2.6, 3.1_

- [x] 11.2 Create /api/migration/progress endpoint


  - Accept job ID parameter
  - Stream progress updates via SSE
  - Send file-level progress events
  - _Requirements: 7.2, 7.3_



- [x] 11.3 Create /api/migration/result endpoint

  - Accept job ID parameter
  - Return transformation results
  - Include diffs and metadata

  - _Requirements: 8.1, 8.2, 9.1_



- [x] 11.4 Create /api/migration/validate endpoint
  - Accept transformed code
  - Run validation checks
  - Return validation results
  - _Requirements: 13.1, 13.2, 13.3_




- [x] 11.5 Create /api/migration/rollback endpoint
  - Accept job ID parameter
  - Execute rollback
  - Return rollback results
  - _Requirements: 12.3, 12.4_

- [x] 11.6 Create /api/frameworks/rules endpoint
  - Return available frameworks and versions
  - Return migration paths
  - Cache responses
  - _Requirements: 2.1, 14.1_

- [x] 11.7 Create /api/version-upgrade/detect endpoint


  - Accept repository info and version range
  - Scan for violations
  - Return violation report

  - _Requirements: 11.4, 11.5, 11.6_


- [x] 11.8 Create /api/version-upgrade/fix endpoint

  - Accept violation report
  - Apply auto-fixes
  - Return fixed code with diffs
  - _Requirements: 11.8, 11.9, 11.10_

- [x] 12. Build UI Components




- [x] 12.1 Create Phase3Card component


  - Display Phase 3 in migration plan UI
  - Show dynamic title based on source framework
  - Add expand/collapse functionality
  - Show migration options when expanded
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 12.2 Create TargetFrameworkSelector component


  - Display compatible target frameworks based on source
  - Show framework cards with descriptions
  - Handle framework selection
  - _Requirements: 1.4, 2.1, 2.2_

- [x] 12.3 Create FrameworkOptionsForm component



  - Display framework-specific options (router type, styling, TypeScript)
  - Validate option combinations
  - Show option descriptions and recommendations
  - _Requirements: 2.3, 2.4, 2.5_


- [x] 12.4 Create MigrationConfigReview component


  - Display selected target and options
  - Show generated migration spec summary
  - Provide "Start Migration" button
  - _Requirements: 2.6, 3.1_

- [x] 12.5 Create MigrationProgressModal component


  - Display real-time progress with percentage
  - Show current file being processed
  - Display estimated time remaining
  - Show progress bar and file count
  - _Requirements: 7.1, 7.2, 7.3, 7.4_


- [x] 12.6 Create CodeMigrationDiffViewer component

  - Extend EditableDiffViewer for migration-specific features
  - Display migration metadata (new file path, dependencies)
  - Show transformation notes
  - Allow inline editing
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_



- [x] 12.7 Create ViolationReportViewer component


  - Display violation report with file grouping
  - Show violation details (line, type, severity)
  - Display fix suggestions
  - Provide "Auto-fix All" and per-file fix buttons

  - _Requirements: 11.6, 11.7, 11.8, 11.9_



- [ ] 12.8 Create MigrationResultsSummary component
  - Display transformation summary (files changed, lines added/removed)
  - Show success/failure counts
  - List files requiring manual review
  - Provide accept/reject actions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.1, 10.2_

- [x] 13. Integrate Phase 3 into MigrationPlanView




- [x] 13.1 Add Phase 3 to migration plan phases


  - Detect when Phase 3 should be shown (after Phase 1 and 2)
  - Add Phase 3 to phases array with proper ordering
  - Create Phase 3 tasks dynamically based on source stack
  - _Requirements: 1.1, 1.2_

- [x] 13.2 Implement Phase 3 task generation


  - Generate "Select Target Framework" task
  - Generate "Configure Migration Options" task
  - Generate "Execute Code Migration" task
  - Add tasks to Phase 3 with proper dependencies
  - _Requirements: 1.3, 1.4, 2.1_

- [x] 13.3 Connect Phase 3 UI to transformation flow


  - Handle "Start Migration" button click
  - Create migration request with spec
  - Start migration job via API
  - Show progress modal
  - _Requirements: 2.6, 7.1_



- [x] 13.4 Handle migration completion






  - Receive transformation results
  - Display results in modal
  - Show diffs for each file
  - Allow accept/reject/edit actions
  - _Requirements: 8.1, 10.1, 10.3, 10.4, 10.5_

- [x] 14. Implement Error Handling and Recovery









- [x] 14.1 Create error hierarchy classes

  - Implement MigrationError base class
  - Create TransformationError, ValidationError, GitHubAPIError
  - Add error codes and recovery flags
  - _Requirements: 12.1, 12.2_


- [x] 14.2 Implement error recovery strategies

  - Create RetryStrategy with exponential backoff
  - Create FallbackStrategy for alternative transformations
  - Create SkipStrategy for non-critical failures
  - _Requirements: 12.1, 12.2, 12.5_


- [x] 14.3 Add error handling to transformation pipeline


  - Wrap transformations in try-catch blocks
  - Apply recovery strategies based on error type
  - Log errors with context
  - Continue processing remaining files on error
  - _Requirements: 12.1, 12.2_


- [x] 14.4 Implement backup and rollback system

  - Create backups before transformations
  - Store backups with job ID
  - Implement restore from backup
  - Clean up backups after success
  - _Requirements: 12.3, 12.4, 12.5_

- [-] 15. Add Caching and Performance Optimizations





- [ ] 15.1 Implement Redis caching layer
  - Set up Redis client
  - Cache GitHub API responses with TTLs
  - Cache parsed ASTs
  - Cache migration specs
  - _Requirements: 15.1, 15.2_



- [ ] 15.2 Implement parallel processing
  - Process independent files in parallel (5 workers)
  - Use worker threads for CPU-intensive tasks
  - Batch API requests
  - _Requirements: 15.2, 15.3_

- [x] 15.3 Implement streaming for large files


  - Stream file transformations for files > 1MB
  - Stream progress updates via SSE
  - Stream diff generation
  - _Requirements: 15.3_

- [x] 15.4 Add lazy loading for UI components






  - Lazy load framework rules on demand
  - Defer non-critical transformations
  - Load diff viewer only when needed
  - _Requirements: 15.4_

- [ ] 16. Add Testing
- [ ]* 16.1 Write unit tests for transformation engines
  - Test AST parsing and generation
  - Test import mapping transformations
  - Test syntax transformations
  - Test AI prompt building
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 16.2 Write unit tests for rule engine
  - Test rule validation
  - Test violation detection
  - Test fix suggestion generation
  - _Requirements: 7.3, 11.5, 11.7_

- [ ]* 16.3 Write integration tests for hybrid engine
  - Test AST + AI transformation flow
  - Test transformation validation
  - Test error recovery
  - _Requirements: 5.1, 5.2, 5.3, 12.1, 12.2_

- [ ]* 16.4 Write integration tests for GitHub fetcher
  - Test repository metadata fetching with mocks
  - Test file tree fetching
  - Test batch file fetching
  - Test rate limiting handling
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

- [ ]* 16.5 Write E2E tests for migration flow
  - Test complete React → Next.js migration
  - Test version upgrade flow
  - Test violation detection and fixing
  - Test rollback functionality
  - _Requirements: 1.1-15.5_

- [ ] 17. Documentation and Deployment
- [ ] 17.1 Create migration guide documentation
  - Document supported migration paths
  - Provide examples for each migration type
  - Document configuration options
  - Add troubleshooting guide
  - _Requirements: 14.1, 14.2_

- [ ] 17.2 Create API documentation
  - Document all API endpoints
  - Provide request/response examples
  - Document error codes
  - _Requirements: All API requirements_

- [ ] 17.3 Set up environment variables
  - Configure ANTHROPIC_API_KEY
  - Configure GITHUB_TOKEN
  - Configure REDIS_URL
  - Set transformation limits and timeouts
  - _Requirements: All requirements_

- [ ] 17.4 Add monitoring and logging
  - Track transformation success rate
  - Monitor API usage and rate limits
  - Log errors with context
  - Track performance metrics
  - _Requirements: 15.1, 15.2, 15.3_
