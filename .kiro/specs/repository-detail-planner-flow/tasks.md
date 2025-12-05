# Implementation Plan

- [x] 1. Update dashboard repository navigation






  - Update RepositoryCard component to navigate to detail page instead of inline scanning
  - Wrap card content in Next.js Link component pointing to `/dashboard/[owner]/[repo]`
  - Remove inline scan functionality from RepositoryCard
  - Keep existing visual design and hover effects
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Create repository detail page structure





  - [x] 2.1 Create new route at `app/dashboard/[owner]/[repo]/page.tsx`


    - Set up Next.js dynamic route with owner and repo params
    - Implement server component for initial repository metadata fetch
    - Add authentication check and redirect to login if needed
    - Create page layout with back button to dashboard
    - _Requirements: 1.3, 2.1, 10.3, 10.4_
  

  - [x] 2.2 Implement repository metadata fetching

    - Use GitHub API via Octokit to fetch repository details
    - Extract stars, forks, and open issues count
    - Handle repository not found errors (404)
    - Handle rate limit errors gracefully
    - _Requirements: 2.1, 2.5_

- [x] 3. Create metric cards component






  - [x] 3.1 Build MetricCards component (`components/repository/MetricCards.tsx`)

    - Create three-column responsive grid layout
    - Display stars, forks, and open issues with icons
    - Apply ReviveHub theme gradients (purple/orange)
    - Add hover effects and animations
    - Make responsive (stack on mobile, grid on medium+)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1_

- [x] 4. Implement repository scanning functionality





  - [x] 4.1 Create ScanButton component (`components/repository/ScanButton.tsx`)


    - Add button with loading state and spinner
    - Call `/api/scan/[owner]/[repo]` endpoint on click
    - Display progress messages during scan
    - Handle scan errors and display user-friendly messages
    - Disable button during scan operation
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [x] 4.2 Display health score after scan



    - Show overall health score from scan results
    - Use existing HealthScore component if available
    - Add visual feedback animation on score display
    - _Requirements: 3.4_

- [x] 5. Create issue visualization components






  - [x] 5.1 Build IssueKanban component (`components/repository/IssueKanban.tsx`)

    - Create three-column layout for Minor, Moderate, Major severities
    - Implement issue categorization logic based on severity
    - Add horizontal scroll for mobile devices
    - Display column headers with issue count badges
    - Add empty state for columns with no issues
    - _Requirements: 4.1, 4.2, 4.3, 10.2_
  

  - [x] 5.2 Build IssueCard component (`components/repository/IssueCard.tsx`)

    - Display issue title, description, and category
    - Apply severity-based color coding (blue/yellow/red)
    - Add expand/collapse for affected files list
    - Implement truncated description with "Show more"
    - _Requirements: 4.4, 4.5_

- [ ] 6. Enhance plan API implementation





  - [x] 6.1 Add request validation to `/api/plan` route


    - Create Zod schema for request validation
    - Validate source stack, target stack, and patterns
    - Return 400 error for invalid requests
    - _Requirements: 6.1, 6.7_
  
  - [x] 6.2 Implement source stack extraction utility

    - Create function to transform AnalysisReport to SourceStack
    - Extract primary framework and version
    - Build dependency map from scan results
    - Extract pattern names from issues
    - _Requirements: 6.1, 6.2_
  
  - [x] 6.3 Implement issue-to-pattern conversion utility

    - Create function to convert Issue[] to DetectedPattern[]
    - Map issue categories to pattern categories
    - Map severity levels appropriately
    - Set conservative automation defaults
    - _Requirements: 6.1, 6.3_
  
  - [x] 6.4 Integrate MigrationPlanner service


    - Instantiate MigrationPlanner from lib/planner
    - Call createPlan with source, target, patterns, and stats
    - Enable AI enhancement via AIEnhancer
    - Optimize and validate generated plan
    - _Requirements: 6.2, 6.3, 6.4, 6.6_
  
  - [x] 6.5 Integrate MCP server tools

    - Import ClaudeAnalyzerTools from mcp/claude-server
    - Call detectPatterns for legacy pattern detection
    - Call analyzeCode for code structure analysis
    - Call generateMigrationPlan for AI insights
    - Merge MCP results with planner output
    - _Requirements: 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 6.6 Integrate PatternDetector from lib/ai

    - Use PatternDetector for additional pattern analysis
    - Detect legacy patterns in code snippets
    - Deduplicate patterns from multiple sources
    - _Requirements: 6.5_
  
  - [x] 6.7 Add comprehensive error handling

    - Handle missing AI API key gracefully
    - Return appropriate error codes (400, 500)
    - Log errors for monitoring
    - Provide fallback to basic plan without AI
    - _Requirements: 6.7_

- [x] 7. Create migration plan display components







  - [x] 7.1 Create MigrationPlanButton component (`components/repository/MigrationPlanButton.tsx`)


    - Add button that appears after successful scan
    - Show loading state during plan generation
    - Display progress messages
    - Handle plan generation errors
    - Pass scan results context to API
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 7.2 Integrate MigrationPlanView component


    - Use existing MigrationPlanView from components/planner
    - Pass generated plan data to component
    - Display plan summary statistics
    - Render phases using PhaseTimeline component
    - Show AI insights using AIInsights component
    - _Requirements: 5.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 8. Implement task interaction








  - [x] 8.1 Add task card click handlers



    - Make task cards clickable in TaskList component
    - Display task details modal or expanded view
    - Show task description, affected files, and risk level
    - _Requirements: 8.1, 8.2_
  
  - [x] 8.2 Display task metadata


    - Show task type (automated, manual, review)
    - Display task dependencies and prerequisites
    - Show breaking changes if any
    - _Requirements: 8.3, 8.4_
  
  - [x] 8.3 Add task action buttons


    - Show "Execute Task" button for automated tasks
    - Disable button for tasks with unmet dependencies
    - Add confirmation dialog for high-risk tasks
    - _Requirements: 8.5_

- [x] 9. Add responsive design and navigation





  - [x] 9.1 Implement responsive layouts


    - Make metric cards stack on mobile
    - Add horizontal scroll to Kanban on mobile
    - Ensure migration plan is readable on small screens
    - _Requirements: 10.1, 10.2_
  
  - [x] 9.2 Add navigation elements


    - Create back button to return to dashboard
    - Display repository name and owner in header
    - Add breadcrumb navigation
    - _Requirements: 10.3, 10.4_
  
  - [x] 9.3 Apply ReviveHub theme



    - Use purple and orange gradient backgrounds
    - Apply consistent border colors and hover effects
    - Add spooky glow effects on interactive elements
    - Maintain dark theme consistency
    - _Requirements: 10.5_

- [x] 10. Add error handling and loading states





  - [x] 10.1 Implement scan error handling



    - Handle rate limit errors with retry information
    - Show repository not found errors
    - Display timeout errors with helpful messages
    - Add retry button for failed scans
    - _Requirements: 3.5_
  
  - [x] 10.2 Implement plan error handling


    - Handle AI service unavailable errors
    - Show invalid stack configuration errors
    - Display pattern detection failures gracefully
    - Provide fallback to basic plan
    - _Requirements: 5.4_
  
  - [x] 10.3 Add loading skeletons


    - Create skeleton for metric cards during load
    - Add skeleton for scan results
    - Show skeleton for migration plan generation
    - Use shimmer effect for better UX
    - _Requirements: 3.3, 5.4_

- [-] 11. Implement caching and performance optimizations














  - [x] 11.1 Add client-side caching






















    - Cache scan results in localStorage for 5 minutes
    - Cache repository metadata using SWR
    - Implement cache invalidation on rescan
    - _Requirements: Performance considerations_
  
  - [ ] 11.2 Implement code splitting




    - Lazy load MigrationPlanView component
    - Add loading fallback for heavy components
    - Split large utility functions into separate chunks
    - _Requirements: Performance considerations_

- [ ]* 12. Add accessibility features
  - [ ]* 12.1 Implement keyboard navigation
    - Make all interactive elements keyboard accessible
    - Add Tab navigation support
    - Implement Escape key for closing modals
    - Add arrow key navigation for Kanban columns
    - _Requirements: Accessibility_
  
  - [ ]* 12.2 Add ARIA labels and roles
    - Add aria-label to all buttons
    - Implement aria-busy for loading states
    - Add aria-live regions for dynamic content
    - Use semantic HTML with proper landmarks
    - _Requirements: Accessibility_
  
  - [ ]* 12.3 Ensure color contrast compliance
    - Verify severity colors meet WCAG AA standards
    - Add visible focus indicators
    - Ensure text is readable on gradients
    - _Requirements: Accessibility_

- [ ]* 13. Write tests
  - [ ]* 13.1 Write component unit tests
    - Test MetricCards rendering with various data
    - Test IssueKanban categorization logic
    - Test ScanButton loading states
    - Test MigrationPlanButton error handling
    - _Requirements: Testing strategy_
  
  - [ ]* 13.2 Write utility function tests
    - Test extractSourceStack transformation
    - Test convertIssuesToPatterns conversion
    - Test categorizeIssues logic
    - _Requirements: Testing strategy_
  
  - [ ]* 13.3 Write API route tests
    - Test /api/plan with valid input
    - Test error handling for invalid requests
    - Test AI service fallback behavior
    - Test MCP integration
    - _Requirements: Testing strategy_
  
  - [ ]* 13.4 Write end-to-end tests
    - Test navigation from dashboard to detail page
    - Test complete scan workflow
    - Test migration plan generation flow
    - Test task interaction
    - _Requirements: Testing strategy_

- [ ]* 14. Documentation and deployment
  - [ ]* 14.1 Update documentation
    - Document new API endpoints
    - Add component usage examples
    - Create migration guide for developers
    - _Requirements: Deployment considerations_
  
  - [ ]* 14.2 Set up environment variables
    - Document required environment variables
    - Add optional variables for feature flags
    - Update .env.example file
    - _Requirements: Deployment considerations_
  
  - [ ]* 14.3 Configure monitoring
    - Add error tracking for API routes
    - Track scan success/failure metrics
    - Monitor AI service availability
    - Log user navigation patterns
    - _Requirements: Deployment considerations_
