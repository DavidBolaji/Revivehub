# Requirements Document

## Introduction

This feature transforms the ReviveHub dashboard flow to provide a dedicated repository detail page with health scanning, issue visualization, and migration planning capabilities. The current dashboard displays all repositories with an analyze button, but lacks a focused workflow for scanning, viewing issues, and generating migration plans. This enhancement creates a streamlined user journey from repository selection through health analysis to actionable migration planning.

## Glossary

- **ReviveHub**: The AI-powered legacy code modernization platform
- **Repository Detail Page**: A dedicated page displaying comprehensive information and actions for a single repository
- **Health Scanner**: The system component that analyzes repository code quality, dependencies, and framework status
- **Issue Severity**: Classification of detected problems as minor, moderate, or major
- **Kanban View**: A visual organization method displaying items in columns by category
- **Migration Plan**: An AI-generated, phased strategy for modernizing legacy code
- **Scan API**: The backend endpoint at `/api/scan/[owner]/[repo]` that performs repository analysis
- **Plan API**: The backend endpoint at `/api/plan` that generates migration strategies
- **MCP Server**: Model Context Protocol server providing Claude AI analysis capabilities
- **Repository Card**: A UI component displaying repository summary information

## Requirements

### Requirement 1: Repository List Navigation

**User Story:** As a developer, I want to view my repositories in a grid layout and navigate to individual repository details, so that I can focus on analyzing specific projects.

#### Acceptance Criteria

1. WHEN the dashboard page loads, THE ReviveHub SHALL display repositories in a three-column grid on medium screens
2. THE ReviveHub SHALL render each repository as a Repository Card component with repository metadata
3. WHEN a user clicks a Repository Card, THE ReviveHub SHALL navigate to the repository detail page at `/dashboard/[owner]/[repo]`
4. THE ReviveHub SHALL maintain existing repository filtering and sorting functionality on the dashboard

### Requirement 2: Repository Detail Page Header

**User Story:** As a developer, I want to see key repository metrics at the top of the detail page, so that I can quickly assess repository popularity and activity.

#### Acceptance Criteria

1. WHEN the repository detail page loads, THE ReviveHub SHALL display three metric cards at the top of the page
2. THE ReviveHub SHALL display the number of stars in the first metric card
3. THE ReviveHub SHALL display the number of forks in the second metric card
4. THE ReviveHub SHALL display the number of open issues in the third metric card
5. THE ReviveHub SHALL fetch repository metadata from the GitHub API to populate metric values

### Requirement 3: Repository Health Scanning

**User Story:** As a developer, I want to scan my repository for health issues, so that I can understand what needs to be modernized.

#### Acceptance Criteria

1. WHEN the repository detail page loads, THE ReviveHub SHALL display a "Scan Repository" button
2. WHEN a user clicks the "Scan Repository" button, THE ReviveHub SHALL call the `/api/scan/[owner]/[repo]` endpoint with the repository owner and name
3. WHILE the scan is in progress, THE ReviveHub SHALL display a loading indicator
4. WHEN the scan completes successfully, THE ReviveHub SHALL display the overall health score
5. IF the scan fails, THEN THE ReviveHub SHALL display an error message with failure details

### Requirement 4: Issue Visualization in Kanban Layout

**User Story:** As a developer, I want to see detected issues organized by severity, so that I can prioritize which problems to address first.

#### Acceptance Criteria

1. WHEN scan results are available, THE ReviveHub SHALL display issues in a Kanban-style layout with three columns
2. THE ReviveHub SHALL create columns labeled "Minor", "Moderate", and "Major" for severity levels
3. THE ReviveHub SHALL categorize each issue from the scan results by its severity property
4. THE ReviveHub SHALL render each issue as a card within its corresponding severity column
5. THE ReviveHub SHALL display issue title, description, and affected files within each issue card

### Requirement 5: Migration Plan Generation

**User Story:** As a developer, I want to generate an AI-powered migration plan after scanning, so that I can understand the steps needed to modernize my codebase.

#### Acceptance Criteria

1. WHEN scan results show a health score, THE ReviveHub SHALL display a "Get Migration Plan" button
2. WHEN a user clicks "Get Migration Plan", THE ReviveHub SHALL call the `/api/plan` endpoint with scan results and repository context
3. THE ReviveHub SHALL pass source stack information including detected frameworks, languages, and patterns to the Plan API
4. WHILE plan generation is in progress, THE ReviveHub SHALL display a loading indicator with progress message
5. WHEN plan generation completes, THE ReviveHub SHALL display the migration plan using the MigrationPlanView component

### Requirement 6: Plan API Implementation

**User Story:** As a developer, I want the plan API to leverage AI and planner services, so that I receive intelligent, context-aware migration strategies.

#### Acceptance Criteria

1. WHEN the `/api/plan` endpoint receives a request, THE ReviveHub SHALL extract source stack, target stack, and detected patterns from the request body
2. THE ReviveHub SHALL instantiate the MigrationPlanner service from `lib/planner/migration-planner`
3. THE ReviveHub SHALL invoke the MigrationPlanner with source stack, target stack, patterns, and codebase statistics
4. THE ReviveHub SHALL enable AI enhancement using the AIEnhancer service from `lib/planner/ai-enhancer`
5. THE ReviveHub SHALL utilize the ClaudeClient from `lib/ai/claude-client` for pattern analysis
6. THE ReviveHub SHALL return an EnhancedMigrationPlan with phases, tasks, AI insights, and timeline
7. IF plan generation fails, THEN THE ReviveHub SHALL return an error response with status code 500 and error details

### Requirement 7: Migration Plan Display

**User Story:** As a developer, I want to view my migration plan with phases and tasks, so that I can understand the modernization roadmap.

#### Acceptance Criteria

1. WHEN a migration plan is generated, THE ReviveHub SHALL render the plan using the existing MigrationPlanView component
2. THE ReviveHub SHALL display plan summary statistics including total tasks, automation percentage, and estimated time
3. THE ReviveHub SHALL render each migration phase with its tasks using the PhaseTimeline component
4. THE ReviveHub SHALL display AI insights using the AIInsights component when available
5. THE ReviveHub SHALL allow users to expand and collapse phase details

### Requirement 8: Migration Task Interaction

**User Story:** As a developer, I want to click on individual migration tasks, so that I can initiate or review specific modernization actions.

#### Acceptance Criteria

1. WHEN a migration plan is displayed, THE ReviveHub SHALL render each task as a clickable card
2. WHEN a user clicks a task card, THE ReviveHub SHALL display task details including description, affected files, and risk level
3. THE ReviveHub SHALL indicate task type as automated, manual, or review-required
4. THE ReviveHub SHALL display task dependencies and prerequisites
5. WHERE a task is automated, THE ReviveHub SHALL provide an "Execute Task" action button

### Requirement 9: MCP Server Integration for Analysis

**User Story:** As a developer, I want the system to use MCP server capabilities for enhanced analysis, so that I receive more accurate pattern detection and recommendations.

#### Acceptance Criteria

1. WHEN generating a migration plan, THE ReviveHub SHALL utilize MCP server tools from `mcp/claude-server/src/tools`
2. THE ReviveHub SHALL invoke the `detectPatterns` tool to identify legacy patterns in the codebase
3. THE ReviveHub SHALL invoke the `analyzeCode` tool to assess code structure and quality
4. THE ReviveHub SHALL invoke the `generateMigrationPlan` tool to create migration strategies
5. THE ReviveHub SHALL incorporate MCP analysis results into the final migration plan

### Requirement 10: Responsive Layout and Navigation

**User Story:** As a developer, I want the repository detail page to work well on different screen sizes, so that I can analyze repositories on any device.

#### Acceptance Criteria

1. THE ReviveHub SHALL display metric cards in a responsive grid that stacks on small screens
2. THE ReviveHub SHALL render the Kanban issue view with horizontal scrolling on mobile devices
3. THE ReviveHub SHALL provide a back button to return to the dashboard repository list
4. THE ReviveHub SHALL display the repository name and owner in the page header
5. THE ReviveHub SHALL maintain the existing ReviveHub theme with purple and orange gradients
