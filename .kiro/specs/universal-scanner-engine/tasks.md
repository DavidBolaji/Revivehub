# Implementation Plan - Universal Scanner Engine

- [x] 1. Set up core scanner infrastructure and type definitions







  - Create directory structure: `lib/scanner/` with subdirectories for `detectors/`, `services/`, `types/`, and `utils/`
  - Define TypeScript interfaces for `Detector`, `RepositoryContext`, `DetectionResult`, `AnalysisReport`, and all detector-specific result types
  - Create base `Detector` abstract class with common functionality
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [x] 2. Implement Repository Fetcher service





  - [x] 2.1 Create RepositoryFetcher class with GitHub API integration


    - Implement `fetchRepositoryContext()` method using Octokit
    - Implement `fetchFileTree()` using GitHub Trees API with recursive flag
    - Implement `identifyConfigFiles()` to filter relevant configuration files
    - Implement `fetchFileContents()` to retrieve file contents in parallel
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 2.2 Add error handling for GitHub API failures


    - Handle rate limit errors with exponential backoff
    - Handle repository not found errors
    - Handle authentication errors
    - Return partial context when some files fail to fetch
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 3. Implement Language Detector

  - [x] 3.1 Create LanguageDetector class

    - Implement file extension mapping for 8 supported languages (JavaScript, TypeScript, Python, Ruby, PHP, Go, Java, C#)
    - Implement configuration file detection (package.json, tsconfig.json, requirements.txt, Gemfile, composer.json, go.mod, pom.xml, *.csproj)
    - Calculate confidence scores based on file count (40%), lines of code (40%), and config files (20%)
    - Return `LanguageDetectionResult` with all detected languages and primary language
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 3.2 Write unit tests for LanguageDetector

    - Test detection for each supported language
    - Test confidence score calculations
    - Test multi-language repositories
    - Test edge cases (empty repo, no config files)
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 4. Implement Framework Recognizer




  - [x] 4.1 Create FrameworkRecognizer class


    - Implement dependency file parsing for npm (package.json), pip (requirements.txt), bundler (Gemfile), composer (composer.json)
    - Implement framework detection for 6 frontend frameworks (React, Vue, Angular, Svelte, Next.js, Nuxt)
    - Implement framework detection for 6 backend frameworks (Express, Django, Rails, Laravel, FastAPI, NestJS)
    - Extract version numbers from package manifests
    - Categorize frameworks as frontend or backend
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 4.2 Write unit tests for FrameworkRecognizer




    - Test detection for each supported framework
    - Test version extraction
    - Test multi-framework repositories
    - Test framework categorization
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. Implement Build Tool Detector





  - [x] 5.1 Create BuildToolDetector class


    - Implement configuration file detection for 6 build tools (Webpack, Vite, Rollup, esbuild, Parcel, Turbopack)
    - Parse package.json scripts to identify build commands
    - Extract version numbers from dependencies and devDependencies
    - Return `BuildToolDetectionResult` with detected build tools and their configurations
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.2 Write unit tests for BuildToolDetector




    - Test detection for each supported build tool
    - Test version extraction
    - Test build script identification
    - Test multiple build tools in same repository
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. Implement Dependency Analyzer








  - [x] 6.1 Create DependencyAnalyzer class

    - Parse package manager files for 4 ecosystems (npm, pip, gem, composer)
    - Separate direct dependencies from dev dependencies
    - Extract installed version information
    - Implement version comparison logic to identify outdated dependencies
    - Flag dependencies more than 2 major versions behind as critical
    - Return `DependencyAnalysisResult` with dependency lists and outdated package information
    - _Requirements: 4.1, 4.2, 4.3_


  - [x] 6.2 Write unit tests for DependencyAnalyzer


    - Test parsing for each package manager format
    - Test version comparison logic
    - Test outdated dependency detection
    - Test severity classification
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 7. Implement Health Scorer




  - [x] 7.1 Create HealthScorer class with scoring algorithm



    - Implement Dependency Health scoring (25 points max): deduct 5 points per dependency >2 versions outdated, 3 points per dependency 1-2 versions outdated, bonus +2 if all current
    - Implement Framework Modernity scoring (25 points max): deduct 10 points per framework >1 major version behind, 5 points for outdated minor versions, bonus +3 for latest versions
    - Implement Build Health scoring (20 points max): 10 points for config file presence, 5 points for build scripts, 5 points for modern build tools
    - Implement Code Quality scoring (15 points max): 8 points for TypeScript adoption ratio, 7 points for test file presence
    - Implement Documentation scoring (10 points max): 4 points for README presence, 3 points for length >500 chars, 3 points for proper sections
    - Implement Repository Activity scoring (5 points max): linear reduction from 5 points at 30 days to 0 points at 365 days since last commit
    - _Requirements: 5.1, 5.2, 5.3_



  - [x] 7.2 Implement scoring factor tracking

    - Track individual scoring factors for each category
    - Record positive and negative impacts with descriptions
    - Return detailed `CategoryScore` objects with factor breakdowns
    - _Requirements: 5.1, 5.2_


  - [x] 7.3 Write unit tests for HealthScorer


    - Test each category scoring independently
    - Test edge cases (perfect score, zero score)
    - Test scoring factor calculations
    - Test overall score aggregation
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Implement Report Generator




  - [x] 8.1 Create ReportGenerator class


    - Aggregate all detector results into unified report structure
    - Generate issues based on detection findings with severity levels (critical, warning, info)
    - Create prioritized recommendations with action items and effort estimates
    - Add metadata about analysis completeness and errors
    - Serialize report to JSON format matching `AnalysisReport` interface
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 8.2 Implement issue generation logic

    - Generate critical issues for dependencies >2 major versions outdated
    - Generate warnings for outdated frameworks
    - Generate info issues for missing build configurations
    - Include affected files in issue details
    - _Requirements: 6.2_

  - [x] 8.3 Implement recommendation generation logic

    - Create high-priority recommendations for critical dependency updates
    - Create medium-priority recommendations for framework upgrades
    - Create low-priority recommendations for documentation improvements
    - Include actionable steps and effort estimates for each recommendation
    - _Requirements: 6.3_

  - [x] 8.4 Write unit tests for ReportGenerator



    - Test report aggregation with complete data
    - Test report generation with partial data
    - Test issue generation logic
    - Test recommendation prioritization
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Implement Scanner Orchestrator






  - [x] 9.1 Create ScannerOrchestrator class

    - Implement detector registration system with `registerDetector()` method
    - Implement dependency resolution for detector execution order
    - Implement `analyzeRepository()` method that coordinates all detectors
    - Execute detectors in parallel where possible based on dependency graph
    - Aggregate results from all detectors
    - Pass aggregated results to HealthScorer and ReportGenerator
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_


  - [x] 9.2 Implement error handling and graceful degradation

    - Wrap each detector execution in try-catch block
    - Continue analysis even if individual detectors fail
    - Track errors and include in report metadata
    - Set completion status to 'partial' when errors occur
    - Implement 30-second overall timeout with 10-second per-detector timeout
    - _Requirements: 7.1, 7.2, 7.3_


  - [x] 9.3 Implement performance optimizations

    - Execute independent detectors in parallel using Promise.allSettled
    - Implement timeout management for each detector
    - Limit file content caching to files <1MB
    - Process files in batches of 50
    - _Requirements: 7.3_


  - [x] 9.4 Write integration tests for ScannerOrchestrator


    - Test full analysis pipeline with mock repository data
    - Test error handling and partial results
    - Test timeout behavior
    - Test detector dependency resolution
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 7.2, 7.3_

- [x] 10. Implement caching layer





  - [x] 10.1 Create CacheService interface and Redis implementation


    - Implement `get()` method to retrieve cached reports
    - Implement `set()` method with TTL support (10 minutes)
    - Implement `invalidate()` method for pattern-based cache clearing
    - Use cache key format: `scanner:${owner}:${repo}:${commitSha}`
    - _Requirements: 8.1, 8.2_

  - [x] 10.2 Create CachedScannerOrchestrator wrapper


    - Extend ScannerOrchestrator with caching behavior
    - Fetch latest commit SHA before checking cache
    - Check cache before running analysis
    - Store analysis results in cache after completion
    - Handle cache errors gracefully (fallback to direct analysis)
    - _Requirements: 8.1, 8.2_

  - [x] 10.3 Write tests for caching layer



    - Test cache hit behavior
    - Test cache miss behavior
    - Test cache invalidation on commit SHA change
    - Test cache error handling
    - _Requirements: 8.1, 8.2_

- [x] 11. Create API endpoint for scanner






  - [x] 11.1 Implement GET /api/scan/[owner]/[repo] route

    - Add authentication check using NextAuth session
    - Create Octokit instance with user's access token
    - Instantiate CachedScannerOrchestrator with all detectors
    - Execute repository analysis
    - Return JSON response with AnalysisReport
    - Handle GitHub API errors with appropriate status codes
    - Handle scanner errors with error details
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

  - [x] 11.2 Write API endpoint tests



    - Test successful analysis flow
    - Test authentication failure
    - Test GitHub API error handling
    - Test rate limit error responses
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

- [x] 12. Add environment configuration





  - Create environment variables for scanner configuration (SCANNER_TIMEOUT_MS, SCANNER_MAX_FILE_SIZE_MB, SCANNER_CACHE_TTL_SECONDS)
  - Document required environment variables in .env.example
  - Add configuration validation on startup
  - _Requirements: 8.1_
