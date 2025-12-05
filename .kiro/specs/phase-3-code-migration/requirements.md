# Requirements Document

## Introduction

This document defines the requirements for Phase 3: Universal Code Migration Engine in ReviveHub. This phase enables users to migrate entire codebases from one technology stack to another (e.g., React → Next.js, Vue → Nuxt, Flask → FastAPI) using a hybrid approach combining AST transformations and AI-powered code generation.

## Glossary

- **Migration Engine**: The system component that orchestrates code transformation from source to target technology
- **AST (Abstract Syntax Tree)**: A tree representation of source code structure used for deterministic transformations
- **Migration Spec**: A JSON configuration defining source-to-target mappings, rules, and conventions
- **Source Stack**: The original technology stack (language + framework + routing + patterns)
- **Target Stack**: The destination technology stack to migrate to
- **Hybrid Transformation**: Combining AST-based transformations with AI-powered semantic code generation
- **Migration Phase**: A distinct stage in the migration plan (Phase 1: Dependencies, Phase 2: Documentation, Phase 3: Code Migration)
- **Octokit**: GitHub API client library for fetching repository data
- **EditableDiffViewer**: UI component showing before/after code comparison with editing capabilities
- **Migration Metadata**: Structured data describing what changed during migration (files moved, dependencies added/removed, etc.)

## Requirements

### Requirement 1: Phase 3 UI Integration

**User Story:** As a developer, I want to see Phase 3 (Code Migration) as a distinct phase in my migration plan, so that I can migrate my codebase to a different technology stack.

#### Acceptance Criteria

1. WHEN THE System displays a migration plan, THE MigrationPlanView SHALL render a Phase 3 card with title "Code Migration" and icon "🔄"
2. WHEN THE user views Phase 3, THE System SHALL display dynamic content based on detected source technology (e.g., "Migrate React App" for React projects)
3. WHEN THE user expands Phase 3, THE System SHALL show available target framework options compatible with the source stack
4. WHERE THE source is React, THE System SHALL display target options including Next.js, Vue 3, Svelte, and Angular
5. WHERE THE source is Vue, THE System SHALL display target options including Nuxt, React, and Svelte

### Requirement 2: Target Framework Selection

**User Story:** As a developer, I want to select a target framework for migration, so that I can specify where my code should be migrated to.

#### Acceptance Criteria

1. WHEN THE user selects a target framework, THE System SHALL display framework-specific configuration options
2. WHERE THE target is Next.js, THE System SHALL provide router type selection options: "Pages Router" and "App Router"
3. WHERE THE target is Next.js, THE System SHALL provide styling options: "CSS Modules", "Tailwind CSS", and "Styled Components"
4. WHERE THE target is Next.js, THE System SHALL provide TypeScript option: true or false
5. WHEN THE user selects multiple incompatible options, THE System SHALL display validation errors
6. WHEN THE user completes target selection, THE System SHALL enable the "Start Migration" button

### Requirement 3: Migration Specification Generation

**User Story:** As a developer, I want the system to generate a migration specification based on my selections, so that the transformation engine knows how to migrate my code.

#### Acceptance Criteria

1. WHEN THE user confirms target selection, THE System SHALL generate a migration specification JSON object
2. THE migration specification SHALL include source object with language, framework, routing, and patterns
3. THE migration specification SHALL include target object with language, framework, routing, fileStructure, componentConventions, syntaxMappings, apiMappings, and lifecycleMappings
4. THE migration specification SHALL include mappings object with imports, routing, components, styling, stateManagement, and buildSystem
5. THE migration specification SHALL include rules object with mustPreserve, mustTransform, mustRemove, and mustRefactor arrays

### Requirement 4: Repository Code Fetching

**User Story:** As a developer, I want the system to fetch my repository code automatically, so that it can be analyzed and transformed.

#### Acceptance Criteria

1. WHEN THE migration starts, THE System SHALL use Octokit to fetch repository metadata
2. THE System SHALL retrieve the repository file tree structure
3. THE System SHALL fetch file contents for all source code files
4. THE System SHALL exclude files matching .gitignore patterns
5. THE System SHALL handle rate limiting with retry logic and exponential backoff
6. IF THE rate limit is exceeded, THEN THE System SHALL display remaining time until reset

### Requirement 5: Hybrid AST and AI Transformation

**User Story:** As a developer, I want my code to be transformed using both AST and AI, so that I get reliable and intelligent migrations.

#### Acceptance Criteria

1. WHEN THE transformation begins, THE System SHALL parse source files into AST using appropriate parser (Babel for JavaScript, TypeScript Compiler API for TypeScript, LibCST for Python)
2. THE System SHALL apply deterministic AST transformations for known patterns (imports, exports, syntax)
3. WHERE THE transformation requires semantic understanding, THE System SHALL invoke Claude AI with migration specification and source code
4. THE System SHALL preserve code formatting and comments during AST transformations
5. THE System SHALL validate transformed code syntax before proceeding

### Requirement 6: File Structure Reorganization

**User Story:** As a developer, I want my files to be reorganized according to target framework conventions, so that my migrated project follows best practices.

#### Acceptance Criteria

1. WHEN THE transformation completes, THE System SHALL reorganize files according to target fileStructure rules
2. WHERE THE target is Next.js App Router, THE System SHALL move page components to app directory with route.tsx naming
3. WHERE THE target is Next.js Pages Router, THE System SHALL move page components to pages directory
4. THE System SHALL rename files with appropriate extensions (.tsx, .vue, .py, .blade.php)
5. THE System SHALL generate missing target-specific files (layouts, configs, routing files)

### Requirement 7: Migration Progress Tracking

**User Story:** As a developer, I want to see real-time progress of my migration, so that I know what's happening and how long it will take.

#### Acceptance Criteria

1. WHEN THE migration starts, THE System SHALL display a progress modal with current step
2. THE System SHALL update progress percentage as files are transformed
3. THE System SHALL display current file being processed
4. THE System SHALL show estimated time remaining
5. IF THE transformation fails, THEN THE System SHALL display error message with file path and reason

### Requirement 8: Before/After Diff Viewing

**User Story:** As a developer, I want to see before and after code comparison, so that I can review changes before accepting them.

#### Acceptance Criteria

1. WHEN THE migration completes, THE System SHALL display transformation results with file list
2. WHEN THE user clicks on a file, THE System SHALL open EditableDiffViewer component
3. THE EditableDiffViewer SHALL display original code on left and transformed code on right
4. THE EditableDiffViewer SHALL highlight additions in green and deletions in red
5. THE EditableDiffViewer SHALL allow inline editing of transformed code

### Requirement 9: Migration Metadata Generation

**User Story:** As a developer, I want to see metadata about what changed during migration, so that I understand the transformation impact.

#### Acceptance Criteria

1. WHEN THE transformation completes, THE System SHALL generate migration metadata for each file
2. THE metadata SHALL include newFilePath, fileType, language, and framework
3. THE metadata SHALL include dependenciesAdded array listing new dependencies
4. THE metadata SHALL include dependenciesRemoved array listing removed dependencies
5. THE metadata SHALL include notes array describing transformation steps applied

### Requirement 10: Change Acceptance and Rejection

**User Story:** As a developer, I want to accept or reject migration changes, so that I have control over what gets applied to my repository.

#### Acceptance Criteria

1. WHEN THE user reviews changes, THE System SHALL provide "Accept All" and "Reject All" buttons
2. WHEN THE user clicks "Accept All", THE System SHALL prepare changes for commit or PR creation
3. WHEN THE user clicks "Reject All", THE System SHALL discard all transformation results
4. THE System SHALL allow per-file acceptance or rejection
5. WHERE THE user edits transformed code, THE System SHALL save modifications before acceptance

### Requirement 11: Version Upgrade Support with Violation Detection

**User Story:** As a developer, I want to upgrade framework versions (e.g., Next.js 12 → 14) and automatically detect and fix code violations, so that my codebase remains compatible and nothing breaks.

#### Acceptance Criteria

1. WHERE THE source and target frameworks are the same, THE System SHALL display version upgrade option
2. THE System SHALL fetch available versions for the selected framework
3. THE System SHALL retrieve breaking changes and deprecation rules for the version upgrade
4. WHEN THE user selects a target version, THE System SHALL scan the entire codebase for rule violations
5. THE System SHALL identify files using deprecated APIs, removed features, or incompatible patterns
6. THE System SHALL generate a violation report listing affected files with line numbers and violation types
7. WHEN THE user reviews violations, THE System SHALL display each violation with explanation and suggested fix
8. THE System SHALL provide "Auto-fix All" option to automatically apply fixes to all violations
9. THE System SHALL provide per-file fix options allowing selective violation fixes
10. WHERE THE System applies auto-fixes, THE System SHALL show before/after diff for each modified file
11. THE System SHALL update package.json with new version numbers
12. THE System SHALL update lock files (package-lock.json, yarn.lock, pnpm-lock.yaml) with new dependency versions
13. WHERE THE violation cannot be auto-fixed, THE System SHALL flag it for manual review with detailed instructions
14. THE System SHALL validate that all fixes maintain semantic equivalence with original code
15. WHEN THE upgrade completes, THE System SHALL generate a migration guide documenting all changes made

### Requirement 12: Error Handling and Rollback

**User Story:** As a developer, I want the system to handle errors gracefully and allow rollback, so that my code is never left in a broken state.

#### Acceptance Criteria

1. IF THE transformation fails for any file, THEN THE System SHALL continue processing remaining files
2. THE System SHALL collect all errors and display them in a summary
3. THE System SHALL provide rollback capability to restore original code
4. THE System SHALL create backups before applying any transformations
5. WHERE THE confidence score is below 70%, THE System SHALL flag transformation for manual review

### Requirement 13: Semantic Equivalence Validation

**User Story:** As a developer, I want the system to validate that transformed code behaves the same as original code, so that I can trust the migration.

#### Acceptance Criteria

1. WHEN THE transformation completes, THE System SHALL perform semantic equivalence checks
2. THE System SHALL compare control flow graphs of original and transformed code
3. THE System SHALL verify that all imports resolve correctly
4. THE System SHALL check that no references to old framework remain
5. THE System SHALL calculate confidence score based on validation results

### Requirement 14: Multi-Language Support

**User Story:** As a developer, I want to migrate projects in different languages (JavaScript, Python, PHP), so that I can use the tool for various projects.

#### Acceptance Criteria

1. THE System SHALL support JavaScript/TypeScript migrations (React, Vue, Angular, Express)
2. THE System SHALL support Python migrations (Flask, Django)
3. THE System SHALL support PHP migrations (Laravel, Symfony)
4. THE System SHALL use language-appropriate parsers (Babel, TypeScript API, LibCST)
5. THE System SHALL apply language-specific transformation rules

### Requirement 15: Caching and Performance

**User Story:** As a developer, I want migrations to be fast and efficient, so that I don't waste time waiting.

#### Acceptance Criteria

1. THE System SHALL cache GitHub API responses with appropriate TTLs
2. THE System SHALL process files in parallel where possible
3. THE System SHALL use streaming for large file transformations
4. THE System SHALL display progress updates at least every 2 seconds
5. WHERE THE repository has more than 100 files, THE System SHALL batch process in groups of 20
