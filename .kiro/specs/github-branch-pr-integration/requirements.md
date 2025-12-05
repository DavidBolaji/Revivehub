# Requirements Document

## Introduction

This document specifies the requirements for implementing GitHub integration that enables users to create branches and pull requests directly from ReviveHub when applying transformation or migration changes. This feature will allow users to safely apply code transformations to their repositories through GitHub's standard workflow, enabling code review and collaboration before merging changes into the main branch.

## Glossary

- **GitHub Integration Service**: The service layer that interfaces with GitHub API using Octokit SDK
- **Transformation Result**: The output from Phase 3 migration containing transformed code files
- **Branch Creation**: The process of creating a new Git branch in a GitHub repository
- **Pull Request**: A GitHub feature that enables code review before merging changes
- **Base Branch**: The target branch where changes will be merged (typically 'main' or 'master')
- **Feature Branch**: A new branch created to contain transformation changes
- **Commit**: A Git commit containing file changes with a descriptive message
- **GitHub API**: GitHub's REST API v3 accessed through Octokit SDK
- **Access Token**: OAuth token stored in user session for GitHub API authentication
- **Rate Limit**: GitHub API request quota that limits the number of API calls
- **Repository Reference**: A Git reference (ref) pointing to a specific commit or branch

## Requirements

### Requirement 1: Branch Creation from Transformations

**User Story:** As a user, I want to create a new branch with my transformation changes, so that I can safely apply changes without affecting the main branch

#### Acceptance Criteria

1. WHEN a user accepts transformation files and clicks "Apply Changes", THE GitHub Integration Service SHALL create a new Feature Branch in the repository
2. THE GitHub Integration Service SHALL generate a branch name using the pattern "revivehub/migration-{timestamp}" where timestamp is ISO format
3. WHEN creating the Feature Branch, THE GitHub Integration Service SHALL use the latest commit SHA from the Base Branch as the starting point
4. IF the Feature Branch already exists, THEN THE GitHub Integration Service SHALL append a unique identifier to the branch name
5. THE GitHub Integration Service SHALL validate that the user has write access to the repository before creating the branch

### Requirement 2: Commit Creation with Transformed Files

**User Story:** As a user, I want my accepted transformation files committed to the new branch, so that the changes are tracked in version control

#### Acceptance Criteria

1. WHEN the Feature Branch is created, THE GitHub Integration Service SHALL create commits for all accepted transformation files
2. THE GitHub Integration Service SHALL batch file changes into commits with a maximum of 20 files per commit to avoid API limits
3. WHEN creating commits, THE GitHub Integration Service SHALL use descriptive commit messages that include the transformation type and file count
4. THE GitHub Integration Service SHALL preserve the original file paths when committing transformed files
5. IF a file does not exist in the repository, THEN THE GitHub Integration Service SHALL create it; IF it exists, THEN THE GitHub Integration Service SHALL update it

### Requirement 3: Pull Request Creation

**User Story:** As a user, I want a pull request created automatically, so that I can review and merge the transformation changes through GitHub's interface

#### Acceptance Criteria

1. WHEN commits are successfully created, THE GitHub Integration Service SHALL create a Pull Request from the Feature Branch to the Base Branch
2. THE Pull Request SHALL have a title following the pattern "ReviveHub Migration: {source} to {target}"
3. THE Pull Request body SHALL include a summary of changes with file count, lines added, lines removed, and dependencies modified
4. THE Pull Request body SHALL include a warning message about reviewing changes before merging
5. THE Pull Request SHALL be created in draft mode to prevent accidental merging

### Requirement 4: GitHub API Error Handling

**User Story:** As a user, I want clear error messages when GitHub operations fail, so that I understand what went wrong and how to fix it

#### Acceptance Criteria

1. IF the GitHub API returns a rate limit error, THEN THE GitHub Integration Service SHALL display the reset time and suggest waiting
2. IF the user lacks write permissions, THEN THE GitHub Integration Service SHALL display "Insufficient permissions to create branch" error
3. IF network errors occur, THEN THE GitHub Integration Service SHALL retry the operation up to 3 times with exponential backoff
4. IF the Access Token is invalid or expired, THEN THE GitHub Integration Service SHALL redirect the user to re-authenticate
5. THE GitHub Integration Service SHALL log all API errors to the server console with request details for debugging

### Requirement 5: Progress Tracking for GitHub Operations

**User Story:** As a user, I want to see progress while changes are being applied to GitHub, so that I know the operation is working

#### Acceptance Criteria

1. WHEN the apply changes process starts, THE GitHub Integration Service SHALL emit progress updates for each major step
2. THE progress updates SHALL include steps: "Creating branch", "Committing files (X/Y)", "Creating pull request", "Complete"
3. WHILE commits are being created, THE GitHub Integration Service SHALL update progress with the current file batch number
4. IF an error occurs, THEN THE progress SHALL update with the error message and stop
5. WHEN the process completes, THE progress SHALL include the Pull Request URL for the user to visit

### Requirement 6: Repository State Validation

**User Story:** As a developer, I want the system to validate repository state before applying changes, so that operations don't fail due to invalid state

#### Acceptance Criteria

1. WHEN starting the apply process, THE GitHub Integration Service SHALL verify the repository exists and is accessible
2. THE GitHub Integration Service SHALL verify the Base Branch exists before creating the Feature Branch
3. THE GitHub Integration Service SHALL check that no uncommitted changes exist on the Base Branch
4. IF the repository is archived or read-only, THEN THE GitHub Integration Service SHALL prevent the operation and display an error
5. THE GitHub Integration Service SHALL validate that all accepted files have valid transformation results before proceeding

### Requirement 7: Octokit SDK Integration

**User Story:** As a developer, I want to use Octokit SDK for GitHub API calls, so that we have reliable, well-tested GitHub integration

#### Acceptance Criteria

1. THE GitHub Integration Service SHALL use Octokit SDK with retry and throttling plugins for all GitHub API calls
2. THE GitHub Integration Service SHALL configure Octokit with the user's Access Token from the session
3. WHEN rate limits are approached, THE Octokit throttling plugin SHALL automatically wait and retry requests
4. THE GitHub Integration Service SHALL use Octokit's TypeScript types for all API request and response objects
5. THE GitHub Integration Service SHALL cache repository metadata for 5 minutes to reduce API calls

### Requirement 8: Transformation Metadata in Pull Request

**User Story:** As a user, I want detailed transformation information in the pull request description, so that reviewers understand what changed

#### Acceptance Criteria

1. THE Pull Request body SHALL include the source framework and version
2. THE Pull Request body SHALL include the target framework and version
3. THE Pull Request body SHALL include a table of statistics: files changed, lines added, lines removed, dependencies added, dependencies removed
4. THE Pull Request body SHALL include a list of files that required manual review with their confidence scores
5. THE Pull Request body SHALL include a link back to ReviveHub with the migration job ID for reference

### Requirement 9: Rollback Support

**User Story:** As a user, I want to close and delete the branch if I decide not to proceed with changes, so that my repository stays clean

#### Acceptance Criteria

1. WHEN a user clicks "Rollback" after applying changes, THE GitHub Integration Service SHALL close the Pull Request
2. THE GitHub Integration Service SHALL delete the Feature Branch after closing the Pull Request
3. IF the Pull Request has already been merged, THEN THE GitHub Integration Service SHALL prevent rollback and display an error
4. THE rollback operation SHALL require user confirmation before proceeding
5. WHEN rollback completes, THE GitHub Integration Service SHALL display a success message confirming the branch was deleted

### Requirement 10: Multi-File Commit Strategy

**User Story:** As a developer, I want files committed in logical batches, so that commits are manageable and don't exceed API limits

#### Acceptance Criteria

1. THE GitHub Integration Service SHALL group files into batches of maximum 20 files per commit
2. WHEN creating commits, THE GitHub Integration Service SHALL use GitHub's tree API to create commits with multiple files atomically
3. THE commit message SHALL indicate the batch number and total batches (e.g., "Migration batch 1/3: Transform components")
4. THE GitHub Integration Service SHALL create commits sequentially to maintain proper Git history
5. IF a commit fails, THEN THE GitHub Integration Service SHALL stop processing and report which batch failed

### Requirement 11: Branch Naming Conventions

**User Story:** As a user, I want branch names to be descriptive and unique, so that I can identify migration branches easily

#### Acceptance Criteria

1. THE Feature Branch name SHALL follow the pattern "revivehub/migration-{framework}-{timestamp}"
2. THE timestamp SHALL use ISO 8601 format with hyphens instead of colons for compatibility
3. IF a branch with the generated name exists, THEN THE GitHub Integration Service SHALL append a 4-character random suffix
4. THE branch name SHALL not exceed 255 characters to comply with Git limitations
5. THE branch name SHALL only contain alphanumeric characters, hyphens, and forward slashes

### Requirement 12: Concurrent Operation Prevention

**User Story:** As a user, I want to prevent multiple simultaneous apply operations, so that changes don't conflict

#### Acceptance Criteria

1. WHEN an apply operation is in progress, THE GitHub Integration Service SHALL disable the "Apply Changes" button
2. THE GitHub Integration Service SHALL track active operations per repository using a lock mechanism
3. IF a user attempts to start a second apply operation, THEN THE GitHub Integration Service SHALL display "Operation already in progress" error
4. WHEN an operation completes or fails, THE GitHub Integration Service SHALL release the lock
5. THE lock SHALL automatically expire after 10 minutes to prevent permanent locks from crashed operations
