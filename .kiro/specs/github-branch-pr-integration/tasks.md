# Implementation Plan

- [x] 1. Set up Octokit SDK and GitHub client infrastructure





  - Install @octokit/rest, @octokit/plugin-retry, @octokit/plugin-throttling packages
  - Create lib/github/client.ts with Octokit instance factory
  - Configure retry and throttling plugins
  - Add TypeScript types for GitHub responses
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Implement GitHub error handling utilities





  - Create lib/github/errors.ts with GitHubError class
  - Implement handleGitHubError function for error categorization
  - Add rate limit detection and formatting
  - Add permission error detection
  - Add network error detection with retry logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Implement caching layer for GitHub API responses















  - Create lib/github/cache.ts with cache utilities
  - Implement in-memory cache for development
  - Implement Redis cache for production (optional)
  - Add cache key generation functions
  - Set TTL to 5 minutes for repository metadata
  - _Requirements: 7.5_

- [x] 4. Create GitHubIntegrationService for repository operations







  - Create lib/github/services/integration.ts
  - Implement validateRepository() method
  - Implement getDefaultBranch() method
  - Implement getBranchSHA() method
  - Add caching for repository metadata
  - _Requirements: 6.1, 6.2, 6.4_

- [ ]* 4.1 Write property test for repository validation
  - **Property 20: Repository validation**
  - **Validates: Requirements 6.1**

- [ ]* 4.2 Write property test for base branch validation
  - **Property 21: Base branch validation**
  - **Validates: Requirements 6.2**

- [x] 5. Implement branch operations in GitHubIntegrationService





  - Implement createBranch() method using GitHub refs API
  - Implement deleteBranch() method
  - Implement branchExists() method
  - Add error handling for branch operations
  - _Requirements: 1.1, 1.3, 9.2_

- [ ]* 5.1 Write property test for branch creation base SHA
  - **Property 1: Branch creation uses latest base commit**
  - **Validates: Requirements 1.3**

- [x] 6. Create BranchNameGenerator utility





  - Create lib/github/branch-name-generator.ts
  - Implement generate() method with pattern revivehub/migration-{framework}-{timestamp}
  - Implement ensureUnique() method with 4-character suffix
  - Implement validate() method for constraints
  - Add length limit check (255 characters)
  - Add character validation (alphanumeric, hyphens, slashes only)
  - _Requirements: 1.2, 1.4, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 6.1 Write property test for branch name pattern
  - **Property 2: Branch names follow pattern**
  - **Validates: Requirements 1.2, 11.1, 11.2**

- [ ]* 6.2 Write property test for branch name uniqueness
  - **Property 3: Branch name uniqueness**
  - **Validates: Requirements 1.4, 11.3**

- [ ]* 6.3 Write property test for branch name constraints
  - **Property 4: Branch name constraints**
  - **Validates: Requirements 11.4, 11.5**

- [x] 7. Implement commit operations in GitHubIntegrationService




  - Implement createTree() method using GitHub tree API
  - Implement createCommit() method with tree and parent SHA
  - Add batching logic for files (max 20 per commit)
  - Implement commit message formatting with batch info
  - Add file path preservation logic
  - Handle create vs update for files
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4_

- [ ]* 7.1 Write property test for all files committed
  - **Property 5: All accepted files are committed**
  - **Validates: Requirements 2.1**

- [ ]* 7.2 Write property test for batch size limit
  - **Property 6: Batch size limit**
  - **Validates: Requirements 2.2, 10.1**

- [ ]* 7.3 Write property test for commit message format
  - **Property 7: Commit message format**
  - **Validates: Requirements 2.3, 10.3**

- [ ]* 7.4 Write property test for file path preservation
  - **Property 8: File path preservation**
  - **Validates: Requirements 2.4**

- [ ]* 7.5 Write property test for create vs update logic
  - **Property 9: Create vs update logic**
  - **Validates: Requirements 2.5**

- [ ]* 7.6 Write property test for tree API usage
  - **Property 32: Tree API usage**
  - **Validates: Requirements 10.2**

- [ ]* 7.7 Write property test for sequential commits
  - **Property 33: Sequential commit creation**
  - **Validates: Requirements 10.4**

- [x] 8. Implement pull request operations in GitHubIntegrationService





  - Implement createPullRequest() method
  - Implement closePullRequest() method
  - Implement getPullRequest() method
  - Add PR title formatting: "ReviveHub Migration: {source} to {target}"
  - Add PR body generation with statistics table
  - Add warning message to PR body
  - Add source/target framework info to PR body
  - Add low-confidence files list to PR body
  - Add ReviveHub link with job ID to PR body
  - Set draft flag to true
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1_

- [ ]* 8.1 Write property test for PR creation after commits
  - **Property 10: PR creation after successful commits**
  - **Validates: Requirements 3.1**

- [ ]* 8.2 Write property test for PR title format
  - **Property 11: PR title format**
  - **Validates: Requirements 3.2**

- [ ]* 8.3 Write property test for PR body statistics
  - **Property 12: PR body contains statistics**
  - **Validates: Requirements 3.3, 8.3**

- [ ]* 8.4 Write property test for PR body warning
  - **Property 13: PR body contains warning**
  - **Validates: Requirements 3.4**

- [ ]* 8.5 Write property test for PR draft mode
  - **Property 14: PR draft mode**
  - **Validates: Requirements 3.5**

- [ ]* 8.6 Write property test for PR body source framework
  - **Property 25: PR body contains source framework**
  - **Validates: Requirements 8.1**

- [ ]* 8.7 Write property test for PR body target framework
  - **Property 26: PR body contains target framework**
  - **Validates: Requirements 8.2**

- [ ]* 8.8 Write property test for PR body review files
  - **Property 27: PR body contains review files**
  - **Validates: Requirements 8.4**

- [ ]* 8.9 Write property test for PR body ReviveHub link
  - **Property 28: PR body contains ReviveHub link**
  - **Validates: Requirements 8.5**

- [x] 9. Create operation lock manager





  - Create lib/github/lock-manager.ts
  - Implement acquireLock() method with repository key
  - Implement releaseLock() method
  - Implement isLocked() method
  - Add automatic lock expiration after 10 minutes
  - Use in-memory Map for lock storage
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ]* 9.1 Write property test for lock acquisition
  - **Property 34: Lock acquisition**
  - **Validates: Requirements 12.2**

- [ ]* 9.2 Write property test for lock release
  - **Property 35: Lock release**
  - **Validates: Requirements 12.4**

- [ ]* 9.3 Write property test for lock expiration
  - **Property 36: Lock expiration**
  - **Validates: Requirements 12.5**

- [x] 10. Implement GitHubApplyOrchestrator





  - Create lib/github/apply-orchestrator.ts
  - Implement applyChanges() main workflow method
  - Add validation step: check repository, branch, permissions
  - Add branch creation step with unique name generation
  - Add commit creation step with batching
  - Add PR creation step with formatted body
  - Add progress emission for each step
  - Add error handling and rollback on failure
  - _Requirements: 1.1, 1.5, 2.1, 3.1, 5.1, 5.2, 5.3, 6.5_

- [ ]* 10.1 Write property test for transformation validation
  - **Property 22: Transformation validation**
  - **Validates: Requirements 6.5**

- [ ]* 10.2 Write property test for progress emission
  - **Property 17: Progress emission**
  - **Validates: Requirements 5.1, 5.2**

- [ ]* 10.3 Write property test for batch progress
  - **Property 18: Batch progress updates**
  - **Validates: Requirements 5.3**

- [ ]* 10.4 Write property test for completion progress
  - **Property 19: Completion progress includes PR URL**
  - **Validates: Requirements 5.5**

- [x] 11. Implement rollback functionality in GitHubApplyOrchestrator




  - Implement rollbackChanges() method
  - Add PR closure logic
  - Add branch deletion logic
  - Add merged PR check to prevent rollback
  - Add user confirmation requirement
  - Add success message display
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 11.1 Write property test for rollback PR closure
  - **Property 29: Rollback closes PR**
  - **Validates: Requirements 9.1**

- [ ]* 11.2 Write property test for rollback branch deletion
  - **Property 30: Rollback deletes branch**
  - **Validates: Requirements 9.2**

- [ ]* 11.3 Write property test for rollback success message
  - **Property 31: Rollback success message**
  - **Validates: Requirements 9.5**

- [x] 12. Create API route for apply changes





  - Create app/api/github/apply/route.ts
  - Implement POST handler
  - Add session validation and token extraction
  - Add request body validation
  - Call GitHubApplyOrchestrator.applyChanges()
  - Return operation ID and initial status
  - Add error handling with user-friendly messages
  - _Requirements: 1.1, 4.4, 7.2_

- [ ]* 12.1 Write property test for Octokit token configuration
  - **Property 23: Octokit token configuration**
  - **Validates: Requirements 7.2**

- [x] 13. Create API route for progress tracking












  - Create app/api/github/apply/progress/[operationId]/route.ts
  - Implement GET handler with Server-Sent Events (SSE)
  - Subscribe to orchestrator progress events
  - Stream progress updates to client
  - Handle client disconnect
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 14. Create API route for rollback










  - Create app/api/github/rollback/route.ts
  - Implement POST handler
  - Add session validation
  - Call GitHubApplyOrchestrator.rollbackChanges()
  - Return rollback result
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 15. Update Phase3Card component to integrate apply changes





  - Modify handleFinish() to call apply API instead of just closing
  - Add loading state during apply operation
  - Add progress modal for apply operation
  - Display PR URL on success
  - Add error display for apply failures
  - Disable "Apply Changes" button during operation
  - _Requirements: 1.1, 5.1, 12.1_

- [x] 16. Create ApplyChangesModal component





  - Create components/github/ApplyChangesModal.tsx
  - Display progress steps with visual indicators
  - Show current step and percentage
  - Display batch progress during commits
  - Show PR URL on completion
  - Add "View PR" button linking to GitHub
  - Add error display with retry option
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [ ] 17. Add rollback UI to Phase3Card







  - Add "Rollback" button to results view
  - Add confirmation dialog before rollback
  - Call rollback API endpoint
  - Display rollback progress
  - Show success message on completion
  - Handle rollback errors
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ] 18. Add TypeScript types for GitHub integration
  - Create types/github.ts
  - Add ApplyChangesRequest interface
  - Add ApplyChangesResult interface
  - Add ApplyProgress interface
  - Add RepositoryValidation interface
  - Add CreateCommitParams interface
  - Add CreatePRParams interface
  - Add RollbackResult interface
  - _Requirements: 7.4_

- [ ] 19. Update environment variables documentation
  - Update .env.example with GitHub integration notes
  - Document required OAuth scopes (repo)
  - Add notes about rate limits
  - Add Redis cache configuration (optional)
  - _Requirements: 7.1, 7.5_

- [ ]* 20. Write integration tests for complete apply flow
  - Create __tests__/integration/github-apply.test.ts
  - Test complete apply workflow end-to-end
  - Test with mock GitHub API responses
  - Test error scenarios
  - Test rollback flow
  - _Requirements: All_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 22. Write property test for retry logic
  - **Property 15: Retry logic for network errors**
  - **Validates: Requirements 4.3**

- [ ]* 23. Write property test for error logging
  - **Property 16: Error logging**
  - **Validates: Requirements 4.5**

- [ ]* 24. Write property test for repository metadata caching
  - **Property 24: Repository metadata caching**
  - **Validates: Requirements 7.5**

- [ ] 25. Add documentation for GitHub integration
  - Create docs/github-integration.md
  - Document apply changes workflow
  - Document rollback process
  - Document error handling
  - Add troubleshooting guide
  - Add API endpoint documentation
  - _Requirements: All_

- [ ] 26. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
