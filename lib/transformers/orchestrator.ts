/**
 * TransformationOrchestrator - Coordinates execution of multiple transformations from a migration plan
 * 
 * Orchestrates the complete transformation workflow:
 * 1. Fetches repository files from GitHub
 * 2. Extracts selected tasks from migration plan
 * 3. Groups tasks by phase and executes sequentially
 * 4. Routes tasks to appropriate transformers
 * 5. Applies transformations to affected files
 * 6. Emits real-time progress updates via SSE
 * 7. Calculates comprehensive summary metrics
 * 
 * Features:
 * - Phase-based sequential execution respecting dependencies
 * - Real-time progress updates via Server-Sent Events
 * - Graceful handling of missing transformers (skip with warning)
 * - Comprehensive result tracking for each task and file
 * - Partial success support (continues on individual task failures)
 * 
 * Requirements: 3A.3, 3A.4, 3A.5, 3A.6, 3A.7, 3A.8, 12.5, 12.6, 12.7, 12.8
 * 
 * @example
 * ```typescript
 * const orchestrator = new TransformationOrchestrator(octokit)
 * const result = await orchestrator.executeTransformations(
 *   'job_123',
 *   { owner: 'user', name: 'repo' },
 *   migrationPlan,
 *   new Set(['task-1', 'task-2']),
 *   { aggressive: false }
 * )
 * ```
 */

import type { Octokit } from '@octokit/rest'
import type {
  MigrationPlan,
  Phase,
  Task,
  TransformOptions,
  OrchestrationResult,
  TaskResult,
  TransformationSummary,
  RepositoryInfo,
} from '@/types/transformer'
import { TransformationPipeline } from './transformation-pipeline'
import { transformerRegistry, type TransformerRegistry } from './transformer-registry'
import { GitHubContentService } from '@/lib/github/content-service'
import { progressEmitter as globalProgressEmitter, type ProgressEmitter } from '@/lib/sse/progress-emitter'
import { DiffGenerator } from './diff-generator'

/**
 * Orchestrates transformation execution across multiple tasks and phases
 */
export class TransformationOrchestrator {
  private registry: TransformerRegistry
  private githubService: GitHubContentService
  private progressEmitter: ProgressEmitter
  private diffGenerator: DiffGenerator

  /**
   * Creates a new TransformationOrchestrator instance
   * 
   * @param octokit - Authenticated Octokit instance for GitHub API access
   * @param registry - Optional custom transformer registry (defaults to singleton)
   * @param emitter - Optional custom progress emitter (defaults to singleton)
   */
  constructor(
    octokit: Octokit,
    registry?: TransformerRegistry,
    emitter?: ProgressEmitter
  ) {
    this.registry = registry || transformerRegistry
    this.githubService = new GitHubContentService(octokit)
    this.progressEmitter = emitter || globalProgressEmitter
    this.diffGenerator = new DiffGenerator()
    
    console.log(`[ORCHESTRATOR] Using progressEmitter instance:`, this.progressEmitter === globalProgressEmitter ? 'singleton' : 'different instance')
    console.log(`[ORCHESTRATOR] ProgressEmitter instance ID:`, (this.progressEmitter as any).instanceId)
  }

  /**
   * Executes transformations for selected tasks from a migration plan
   * 
   * Main orchestration method that:
   * 1. Fetches repository files from GitHub
   * 2. Extracts and validates selected tasks
   * 3. Groups tasks by phase for sequential execution
   * 4. Executes each phase and task with progress updates
   * 5. Applies transformations to affected files
   * 6. Calculates comprehensive summary metrics
   * 
   * @param jobId - Unique job identifier for progress tracking
   * @param repository - Repository information (owner, name, branch)
   * @param migrationPlan - Complete migration plan with phases and tasks
   * @param selectedTaskIds - Set of task IDs to execute
   * @param options - Transformation options
   * @returns Promise resolving to orchestration result with transformed files and summary
   */
  async executeTransformations(
    jobId: string,
    repository: RepositoryInfo,
    migrationPlan: MigrationPlan,
    selectedTaskIds: Set<string>,
    options: TransformOptions = {}
  ): Promise<OrchestrationResult> {
    const startTime = Date.now()

    console.log(`rting job ${jobId}`)
    console.log(`[ORCHESTRATOR] Repository: ${repository.owner}/${repository.name}`)
    console.log(`[ORCHESTRATOR] Selected task IDs:`, Array.from(selectedTaskIds))
    console.log(`[ORCHESTRATOR] Migration plan phases:`, migrationPlan.phases.length)

    try {
      // Step 1: Fetch repository files from GitHub
      console.log(`[ORCHESTRATOR] Step 1: Fetching repository files...`)
      this.progressEmitter.emit(jobId, '📥 Fetching repository files from GitHub...')
      
      // Add intermediate progress updates
      this.progressEmitter.emit(jobId, '🔍 Analyzing repository structure...')
      
      const filesResult = await this.githubService.fetchRepositoryFiles(
        repository.owner,
        repository.name,
        {
          ref: repository.branch,
          useCache: true,
        }
      )
      
      console.log(`[ORCHESTRATOR] Fetched ${filesResult.totalFiles} files`)
      this.progressEmitter.emit(jobId, '📊 Processing file contents...')

      this.progressEmitter.emit(
        jobId,
        `✓ Fetched ${filesResult.totalFiles} files (${this.formatBytes(filesResult.totalSize)})`
      )

      if (filesResult.skippedFiles.length > 0) {
        this.progressEmitter.emit(
          jobId,
          `⚠️  Skipped ${filesResult.skippedFiles.length} files (too large or excluded)`
        )
      }

      // Step 2: Extract selected tasks from migration plan
      console.log(`[ORCHESTRATOR] Step 2: Extracting selected tasks...`)
      this.progressEmitter.emit(jobId, '🔍 Extracting selected tasks...')
      this.progressEmitter.emit(jobId, '⚙️ Validating task dependencies...')
      
      const selectedTasks = this.extractSelectedTasks(migrationPlan, selectedTaskIds)
      console.log(`[ORCHESTRATOR] Extracted ${selectedTasks.length} tasks`)
      this.progressEmitter.emit(jobId, '✅ Task validation complete')
      
      if (selectedTasks.length === 0) {
        console.log(`[ORCHESTRATOR] No valid tasks found - completing job`)
        this.progressEmitter.complete(
          jobId,
          '⚠️  No valid tasks selected',
          { filesChanged: 0, tasksCompleted: 0 }
        )
        
        return {
          jobId,
          success: true,
          transformedFiles: new Map(),
          results: [],
          summary: this.createEmptySummary(),
        }
      }

      this.progressEmitter.emit(
        jobId,
        `✓ Found ${selectedTasks.length} tasks to execute`
      )
      console.log(`[ORCHESTRATOR] Tasks to execute:`, selectedTasks.map(t => t.id))

      // Step 3: Group tasks by phase and sort by order
      console.log(`[ORCHESTRATOR] Step 3: Grouping tasks by phase...`)
      const tasksByPhase = this.groupTasksByPhase(selectedTasks, migrationPlan)
      console.log(`[ORCHESTRATOR] Grouped into ${tasksByPhase.size} phases`)
      
      this.progressEmitter.emit(
        jobId,
        `📋 Organized into ${tasksByPhase.size} phases`
      )

      // Initialize result tracking
      const results: TaskResult[] = []
      const transformedFiles = new Map<string, string>()
      const fileContentsMap = new Map<string, string>()

      // Build file contents map for quick lookup
      for (const file of filesResult.files) {
        fileContentsMap.set(file.path, file.content)
      }

      // Step 4: Execute phases sequentially
      console.log(`[ORCHESTRATOR] Step 4: Executing phases...`)
      for (const [phase, tasks] of tasksByPhase) {
        console.log(`[ORCHESTRATOR] Starting phase ${phase.order}: ${phase.name}`)
        // Emit phase name directly (it already includes "Phase X:" prefix)
        this.progressEmitter.emit(
          jobId,
          `\n🚀 ${phase.name}`
        )
        this.progressEmitter.emit(
          jobId,
          `   ${phase.description}`
        )

        // Special handling for dependency phase - consolidate all dependency updates
        if (phase.name.toLowerCase().includes('dependency') || 
            tasks.some(t => t.pattern.category === 'dependency')) {
          
          // Separate dependency tasks from build-tool tasks
          const dependencyTasks = tasks.filter(t => t.pattern.category === 'dependency')
          const buildToolTasks = tasks.filter(t => t.pattern.category === 'build-tool')
          
          console.log(`[ORCHESTRATOR] Phase tasks breakdown:`, {
            total: tasks.length,
            dependency: dependencyTasks.length,
            buildTool: buildToolTasks.length,
            taskCategories: tasks.map(t => ({ id: t.id, category: t.pattern.category }))
          })
          
          // Execute consolidated dependency updates
          if (dependencyTasks.length > 0) {
            await this.executeDependencyPhase(jobId, dependencyTasks, fileContentsMap, transformedFiles, results, options, migrationPlan)
          }
          
          // Execute build tool tasks individually (they create new files)
          for (const task of buildToolTasks) {
            console.log(`[ORCHESTRATOR] Executing build-tool task: ${task.id}`)
            await this.executeTask(jobId, task, fileContentsMap, transformedFiles, results, options, migrationPlan, filesResult)
          }
          
          this.progressEmitter.emit(
            jobId,
            `✓ ${phase.name} complete`
          )
          continue
        }

        // Step 5: Execute tasks within phase
        for (const task of tasks) {
          const taskStartTime = Date.now()
          console.log(`[ORCHESTRATOR] Starting task: ${task.id} - ${task.name}`)
          
          this.progressEmitter.emit(
            jobId,
            `\n⚙️  ${task.name}`
          )

          try {
            // Get appropriate transformer for this task
            console.log(`[ORCHESTRATOR] Getting transformer for task ${task.id}`)
            const transformer = this.registry.getForTask(
              task,
              migrationPlan.sourceStack
            )
            console.log(`[ORCHESTRATOR] Transformer found:`, transformer ? transformer.getMetadata().name : 'none')

            if (!transformer) {
              // No transformer available - skip with warning
              this.progressEmitter.emit(
                jobId,
                `   ⚠️  No transformer available - marked for manual review`
              )

              results.push({
                taskId: task.id,
                success: false,
                error: 'No transformer available for this task',
                skipped: true,
                duration: Date.now() - taskStartTime,
              })
              continue
            }

            this.progressEmitter.emit(
              jobId,
              `   Using transformer: ${transformer.getMetadata().name}`
            )

            // Step 6: Transform affected files
            let taskSuccess = true
            let taskErrors: string[] = []
            
            console.log(`[ORCHESTRATOR] Task ${task.id} affectedFiles:`, task.affectedFiles)

            // Special handling for documentation tasks - ensure README.md is included
            let filesToTransform = [...task.affectedFiles]
            if (task.pattern.category === 'documentation' && filesToTransform.length === 0) {
              console.log(`[ORCHESTRATOR] Documentation task with no affected files, adding README.md`)
              filesToTransform = ['README.md']
            }

            for (const filePath of filesToTransform) {
              const fileContent = fileContentsMap.get(filePath) || ''

              // Allow empty content for documentation and build-tool tasks (they can create new files)
              const canCreateNewFile = task.pattern.category === 'documentation' || 
                                      task.pattern.category === 'build-tool'

              if (!fileContent && !canCreateNewFile) {
                // For other tasks, missing files are an error
                this.progressEmitter.emit(
                  jobId,
                  `   ⚠️  File not found: ${filePath}`
                )
                taskErrors.push(`File not found: ${filePath}`)
                continue
              }

              if (!fileContent) {
                this.progressEmitter.emit(
                  jobId,
                  `   📝 Creating ${filePath}...`
                )
              } else {
                this.progressEmitter.emit(
                  jobId,
                  `   📝 Transforming ${filePath}...`
                )
              }

              try {
                // Add specific progress for documentation tasks
                if (task.pattern.category === 'documentation') {
                  this.progressEmitter.emit(jobId, '🤖 Analyzing project structure with AI...')
                }
                
                // Enhance options for documentation and build-tool transformers with repository files
                let enhancedOptions = options
                if (task.pattern.category === 'documentation' || task.pattern.category === 'build-tool') {
                  enhancedOptions = {
                    ...options,
                    repositoryFiles: filesResult.files.map(file => ({
                      path: file.path,
                      content: file.content
                    }))
                  }
                }
                
                // Execute transformation through pipeline
                // Pass task to transformer for context
                const result = await transformer.transform(fileContent, enhancedOptions, task)

                if (result.success && result.code) {
                  // Store transformed content
                  transformedFiles.set(filePath, result.code)
                  
                  // Update file contents map for subsequent transformations
                  fileContentsMap.set(filePath, result.code)

                  // Generate diff if not already present
                  if (!result.diff) {
                    result.diff = this.diffGenerator.generate(fileContent, result.code)
                  }

                  // Handle additional files from transformation (e.g., Vite config, generated files)
                  if (result.metadata.additionalFiles) {
                    for (const [additionalPath, additionalContent] of result.metadata.additionalFiles) {
                      transformedFiles.set(additionalPath, additionalContent)
                      fileContentsMap.set(additionalPath, additionalContent)
                      this.progressEmitter.emit(
                        jobId,
                        `   ✨ Generated: ${additionalPath}`
                      )
                    }
                  }

                  // Handle JS to JSX conversions
                  if (result.metadata.jsToJsxConversions) {
                    console.log(`[ORCHESTRATOR] Processing ${result.metadata.jsToJsxConversions.length} JS to JSX conversions`)
                    for (const conversion of result.metadata.jsToJsxConversions) {
                      console.log(`[ORCHESTRATOR] Converting: ${conversion.originalPath} → ${conversion.newPath}`)
                      
                      // Get the original .js file content from the repository
                      const originalFileContent = fileContentsMap.get(conversion.originalPath) || conversion.content
                      
                      // Add the original .js file to transformedFiles if not already there
                      // This ensures it shows in the UI as "to be renamed"
                      if (!transformedFiles.has(conversion.originalPath)) {
                        transformedFiles.set(conversion.originalPath, originalFileContent)
                        console.log(`[ORCHESTRATOR] Added original file to transformedFiles: ${conversion.originalPath}`)
                      } else {
                        console.log(`[ORCHESTRATOR] Original file already in transformedFiles: ${conversion.originalPath}`)
                      }
                      
                      // Add the new .jsx file so it shows as a new file
                      transformedFiles.set(conversion.newPath, conversion.content)
                      fileContentsMap.set(conversion.newPath, conversion.content)
                      console.log(`[ORCHESTRATOR] Added new JSX file to transformedFiles: ${conversion.newPath}`)
                      
                      this.progressEmitter.emit(
                        jobId,
                        `   🔄 Converted: ${conversion.originalPath} → ${conversion.newPath}`
                      )

                      // Generate a special "rename" diff that shows full content
                      // For JS to JSX conversions, we want to show the full file content
                      // even though the content is identical
                      console.log(`[ORCHESTRATOR] ===== JS TO JSX CONVERSION DEBUG =====`)
                      console.log(`[ORCHESTRATOR] Original path: ${conversion.originalPath}`)
                      console.log(`[ORCHESTRATOR] New path: ${conversion.newPath}`)
                      console.log(`[ORCHESTRATOR] Content length: ${conversion.content.length}`)
                      
                      const conversionDiff = this.diffGenerator.generateRenameDiff(
                        conversion.content,
                        conversion.originalPath,
                        conversion.newPath
                      )
                      console.log(`[ORCHESTRATOR] Rename diff generated:`, !!conversionDiff)
                      console.log(`[ORCHESTRATOR] Diff unified length:`, conversionDiff?.unified?.length || 0)
                      console.log(`[ORCHESTRATOR] Diff visual length:`, conversionDiff?.visual?.length || 0)
                      
                      // For renames, count the actual lines in the diff
                      // The diff shows all lines as removed then added
                      const totalLines = conversion.content.split('\n').length
                      const linesAdded = conversionDiff.visual.filter(l => l.type === 'added').length
                      const linesRemoved = conversionDiff.visual.filter(l => l.type === 'removed').length
                      
                      console.log(`[ORCHESTRATOR] Total lines: ${totalLines}`)
                      console.log(`[ORCHESTRATOR] Lines added: ${linesAdded}`)
                      console.log(`[ORCHESTRATOR] Lines removed: ${linesRemoved}`)
                      console.log(`[ORCHESTRATOR] ===== END DEBUG =====`)

                      // Add a separate result entry for the conversion
                      results.push({
                        taskId: task.id,
                        filePath: conversion.newPath,
                        success: true,
                        result: {
                          ...result,
                          code: conversion.content,
                          errors: [],
                          warnings: [],
                          diff: conversionDiff,
                          metadata: {
                            ...result.metadata,
                            linesAdded,
                            linesRemoved,
                            transformationType: 'js-to-jsx-conversion',
                            filesModified: [conversion.originalPath, conversion.newPath],
                            fileStructureChange: {
                              action: 'rename',
                              originalPath: conversion.originalPath,
                              isRouteFile: false
                            },
                            newFilePath: conversion.newPath
                          }
                        },
                        duration: Date.now() - taskStartTime,
                      })
                      
                      console.log(`[ORCHESTRATOR] Result pushed for ${conversion.newPath}`)
                      console.log(`[ORCHESTRATOR] Result metadata:`, {
                        linesAdded,
                        linesRemoved,
                        transformationType: 'js-to-jsx-conversion',
                        hasDiff: !!conversionDiff
                      })
                    }
                  }

                  this.progressEmitter.emit(
                    jobId,
                    `   ✓ ${filePath} transformed (+${result.metadata.linesAdded} -${result.metadata.linesRemoved} lines)`
                  )

                  results.push({
                    taskId: task.id,
                    filePath,
                    success: true,
                    result,
                    duration: Date.now() - taskStartTime,
                  })
                } else {
                  // Transformation failed
                  taskSuccess = false
                  const errorMsg = result.errors[0]?.message || 'Transformation failed'
                  taskErrors.push(`${filePath}: ${errorMsg}`)

                  this.progressEmitter.emit(
                    jobId,
                    `   ❌ ${filePath} failed: ${errorMsg}`
                  )

                  results.push({
                    taskId: task.id,
                    filePath,
                    success: false,
                    result,
                    error: errorMsg,
                    duration: Date.now() - taskStartTime,
                  })
                }
              } catch (error) {
                // Unexpected error during transformation
                taskSuccess = false
                const errorMsg = error instanceof Error ? error.message : 'Unknown error'
                taskErrors.push(`${filePath}: ${errorMsg}`)

                this.progressEmitter.emit(
                  jobId,
                  `   ❌ ${filePath} error: ${errorMsg}`
                )

                results.push({
                  taskId: task.id,
                  filePath,
                  success: false,
                  error: errorMsg,
                  duration: Date.now() - taskStartTime,
                })
              }
            }

            // Report task completion
            if (taskSuccess) {
              this.progressEmitter.emit(
                jobId,
                `   ✅ Task completed successfully`
              )
            } else {
              this.progressEmitter.emit(
                jobId,
                `   ⚠️  Task completed with errors: ${taskErrors.join(', ')}`
              )
            }

          } catch (error) {
            // Unexpected error at task level
            const errorMsg = error instanceof Error ? error.message : 'Unknown error'
            
            this.progressEmitter.emit(
              jobId,
              `   ❌ Task failed: ${errorMsg}`
            )

            results.push({
              taskId: task.id,
              success: false,
              error: errorMsg,
              duration: Date.now() - taskStartTime,
            })
          }
        }

        this.progressEmitter.emit(
          jobId,
          `✓ ${phase.name} complete`
        )
      }

      // Step 7: Post-process JS to JSX conversions for all transformed files
      console.log(`[ORCHESTRATOR] Step 7: Post-processing JS to JSX conversions...`)
      this.progressEmitter.emit(jobId, '\n🔄 Checking for JS to JSX conversions...')
      
      const jsToJsxConversions = this.detectAndConvertJsToJsx(transformedFiles)
      
      if (jsToJsxConversions.length > 0) {
        console.log(`[ORCHESTRATOR] Found ${jsToJsxConversions.length} JS files to convert to JSX`)
        console.log(`[ORCHESTRATOR] Skipping duplicate result creation - results already added in executeTask`)
        
        this.progressEmitter.emit(
          jobId,
          `✓ Converted ${jsToJsxConversions.length} JS files to JSX`
        )
      } else {
        console.log(`[ORCHESTRATOR] No JS to JSX conversions needed`)
      }

      // Step 8: Calculate summary metrics
      const summary = this.calculateSummary(
        results,
        transformedFiles,
        Date.now() - startTime
      )

      this.progressEmitter.emit(
        jobId,
        `\n📊 Transformation Summary:`
      )
      this.progressEmitter.emit(
        jobId,
        `   Files changed: ${summary.filesChanged}`
      )
      this.progressEmitter.emit(
        jobId,
        `   Lines added: ${summary.linesAdded}`
      )
      this.progressEmitter.emit(
        jobId,
        `   Lines removed: ${summary.linesRemoved}`
      )
      this.progressEmitter.emit(
        jobId,
        `   Tasks completed: ${summary.tasksCompleted}`
      )
      this.progressEmitter.emit(
        jobId,
        `   Tasks failed: ${summary.tasksFailed}`
      )
      this.progressEmitter.emit(
        jobId,
        `   Estimated time saved: ${summary.estimatedTimeSaved}`
      )

      if (summary.manualReviewNeeded.length > 0) {
        this.progressEmitter.emit(
          jobId,
          `   ⚠️  Manual review needed: ${summary.manualReviewNeeded.length} files`
        )
      }

      // Store the full result for later retrieval
      // Deduplicate results - keep only the LAST result for each file
      // This handles cases where package.json is processed by both dependency and build-tool phases
      const deduplicatedResults = this.deduplicateResults(results)
      
      const fullResult = {
        jobId,
        success: summary.tasksFailed === 0,
        transformedFiles,
        results: deduplicatedResults,
        summary,
      }

      this.progressEmitter.complete(
        jobId,
        '✅ Transformation complete!',
        fullResult
      )

      return {
        jobId,
        success: summary.tasksFailed === 0,
        transformedFiles,
        results: deduplicatedResults,
        summary,
      }

    } catch (error) {
      // Fatal error during orchestration
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[ORCHESTRATOR] Fatal error in job ${jobId}:`, error)
      console.error(`[ORCHESTRATOR] Error stack:`, error instanceof Error ? error.stack : 'N/A')
      
      this.progressEmitter.error(
        jobId,
        `❌ Transformation failed: ${errorMsg}`,
        error
      )

      throw error
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    jobId: string,
    task: Task,
    fileContentsMap: Map<string, string>,
    transformedFiles: Map<string, string>,
    results: TaskResult[],
    options: TransformOptions,
    migrationPlan: MigrationPlan,
    filesResult: any
  ): Promise<void> {
    const taskStartTime = Date.now()
    console.log(`[ORCHESTRATOR] Starting task: ${task.id} - ${task.name}`)
    
    this.progressEmitter.emit(jobId, `\n⚙️  ${task.name}`)

    try {
      const transformer = this.registry.getForTask(task, migrationPlan.sourceStack)
      console.log(`[ORCHESTRATOR] Transformer found:`, transformer ? transformer.getMetadata().name : 'none')

      if (!transformer) {
        this.progressEmitter.emit(jobId, `   ⚠️  No transformer available - marked for manual review`)
        results.push({
          taskId: task.id,
          success: false,
          error: 'No transformer available for this task',
          skipped: true,
          duration: Date.now() - taskStartTime,
        })
        return
      }

      this.progressEmitter.emit(jobId, `   Using transformer: ${transformer.getMetadata().name}`)

      let taskSuccess = true
      let taskErrors: string[] = []
      
      console.log(`[ORCHESTRATOR] Task ${task.id} affectedFiles:`, task.affectedFiles)

      let filesToTransform = [...task.affectedFiles]
      if (task.pattern.category === 'documentation' && filesToTransform.length === 0) {
        filesToTransform = ['README.md']
      }

      // For build-tool tasks, include all affected files (config, package.json, entry points, etc.)
      if (task.pattern.category === 'build-tool') {
        console.log(`[ORCHESTRATOR] Build-tool task, processing files:`, filesToTransform)
      }

      for (const filePath of filesToTransform) {
        const fileContent = fileContentsMap.get(filePath) || ''
        const canCreateNewFile = task.pattern.category === 'documentation' || 
                                task.pattern.category === 'build-tool'

        console.log(`[ORCHESTRATOR] Processing file: ${filePath}, exists: ${!!fileContent}, canCreate: ${canCreateNewFile}, contentLength: ${fileContent.length}`)

        if (!fileContent && !canCreateNewFile) {
          this.progressEmitter.emit(jobId, `   ⚠️  File not found: ${filePath}`)
          taskErrors.push(`File not found: ${filePath}`)
          continue
        }

        this.progressEmitter.emit(jobId, !fileContent ? `   📝 Creating ${filePath}...` : `   📝 Transforming ${filePath}...`)

        try {
          if (task.pattern.category === 'documentation') {
            this.progressEmitter.emit(jobId, '🤖 Analyzing project structure with AI...')
          }
          
          let enhancedOptions = options
          if (task.pattern.category === 'documentation' || task.pattern.category === 'build-tool') {
            enhancedOptions = {
              ...options,
              filePath,
              repositoryFiles: filesResult.files.map((file: any) => ({
                path: file.path,
                content: file.content
              }))
            }
          }
          
          const result = await transformer.transform(fileContent, enhancedOptions, task)

          if (result.success && result.code) {
            transformedFiles.set(filePath, result.code)
            fileContentsMap.set(filePath, result.code)

            // Generate diff if not already present
            if (!result.diff) {
              const originalContent = fileContent || ''
              result.diff = this.diffGenerator.generate(originalContent, result.code)
            }

            // Handle additional files from transformation (e.g., Vite config, generated files)
            if (result.metadata.additionalFiles) {
              for (const [additionalPath, additionalContent] of result.metadata.additionalFiles) {
                transformedFiles.set(additionalPath, additionalContent)
                fileContentsMap.set(additionalPath, additionalContent)
                this.progressEmitter.emit(
                  jobId,
                  `   ✨ Generated: ${additionalPath}`
                )
              }
            }

            // Handle JS to JSX conversions
            if (result.metadata.jsToJsxConversions) {
              console.log(`[ORCHESTRATOR] Processing ${result.metadata.jsToJsxConversions.length} JS to JSX conversions in executeTask`)
              for (const conversion of result.metadata.jsToJsxConversions) {
                console.log(`[ORCHESTRATOR] Converting: ${conversion.originalPath} → ${conversion.newPath}`)
                
                // Get the original .js file content from the repository
                const originalFileContent = fileContentsMap.get(conversion.originalPath) || conversion.content
                
                // Add the original .js file to transformedFiles if not already there
                if (!transformedFiles.has(conversion.originalPath)) {
                  transformedFiles.set(conversion.originalPath, originalFileContent)
                  console.log(`[ORCHESTRATOR] Added original file to transformedFiles: ${conversion.originalPath}`)
                }
                
                // Add the new .jsx file
                transformedFiles.set(conversion.newPath, conversion.content)
                fileContentsMap.set(conversion.newPath, conversion.content)
                console.log(`[ORCHESTRATOR] Added new JSX file to transformedFiles: ${conversion.newPath}`)
                
                this.progressEmitter.emit(
                  jobId,
                  `   🔄 Converted: ${conversion.originalPath} → ${conversion.newPath}`
                )

                // Generate a special "rename" diff that shows full content
                // For JS to JSX conversions, we want to show the full file content
                // even though the content is identical
                console.log(`[ORCHESTRATOR-TASK] ===== JS TO JSX CONVERSION DEBUG (executeTask) =====`)
                console.log(`[ORCHESTRATOR-TASK] Original path: ${conversion.originalPath}`)
                console.log(`[ORCHESTRATOR-TASK] New path: ${conversion.newPath}`)
                console.log(`[ORCHESTRATOR-TASK] Content length: ${conversion.content.length}`)
                
                const conversionDiff = this.diffGenerator.generateRenameDiff(
                  conversion.content,
                  conversion.originalPath,
                  conversion.newPath
                )
                console.log(`[ORCHESTRATOR-TASK] Rename diff generated:`, !!conversionDiff)
                console.log(`[ORCHESTRATOR-TASK] Diff unified length:`, conversionDiff?.unified?.length || 0)
                console.log(`[ORCHESTRATOR-TASK] Diff visual length:`, conversionDiff?.visual?.length || 0)
                
                // For renames, count the actual lines in the diff
                // The diff shows all lines as removed then added
                const totalLines = conversion.content.split('\n').length
                const linesAdded = conversionDiff.visual.filter(l => l.type === 'added').length
                const linesRemoved = conversionDiff.visual.filter(l => l.type === 'removed').length
                
                console.log(`[ORCHESTRATOR-TASK] Total lines: ${totalLines}`)
                console.log(`[ORCHESTRATOR-TASK] Lines added: ${linesAdded}`)
                console.log(`[ORCHESTRATOR-TASK] Lines removed: ${linesRemoved}`)
                console.log(`[ORCHESTRATOR-TASK] ===== END DEBUG =====`)

                // Add a separate result entry for the conversion
                results.push({
                  taskId: task.id,
                  filePath: conversion.newPath,
                  success: true,
                  result: {
                    ...result,
                    code: conversion.content,
                    errors: [],
                    warnings: [],
                    diff: conversionDiff,
                    metadata: {
                      ...result.metadata,
                      linesAdded,
                      linesRemoved,
                      transformationType: 'js-to-jsx-conversion',
                      filesModified: [conversion.originalPath, conversion.newPath],
                      fileStructureChange: {
                        action: 'rename',
                        originalPath: conversion.originalPath,
                        isRouteFile: false
                      },
                      newFilePath: conversion.newPath
                    }
                  },
                  duration: Date.now() - taskStartTime,
                })
                
                console.log(`[ORCHESTRATOR-TASK] Result pushed for ${conversion.newPath}`)
                console.log(`[ORCHESTRATOR-TASK] Result metadata:`, {
                  linesAdded,
                  linesRemoved,
                  transformationType: 'js-to-jsx-conversion',
                  hasDiff: !!conversionDiff
                })
              }
            }

            this.progressEmitter.emit(jobId, `   ✓ ${filePath} transformed (+${result.metadata.linesAdded} -${result.metadata.linesRemoved} lines)`)

            results.push({
              taskId: task.id,
              filePath,
              success: true,
              result,
              duration: Date.now() - taskStartTime,
            })
          } else {
            taskSuccess = false
            const errorMsg = result.errors[0]?.message || 'Transformation failed'
            taskErrors.push(`${filePath}: ${errorMsg}`)
            this.progressEmitter.emit(jobId, `   ❌ ${filePath} failed: ${errorMsg}`)

            results.push({
              taskId: task.id,
              filePath,
              success: false,
              result,
              error: errorMsg,
              duration: Date.now() - taskStartTime,
            })
          }
        } catch (error) {
          taskSuccess = false
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          taskErrors.push(`${filePath}: ${errorMsg}`)
          this.progressEmitter.emit(jobId, `   ❌ ${filePath} error: ${errorMsg}`)

          results.push({
            taskId: task.id,
            filePath,
            success: false,
            error: errorMsg,
            duration: Date.now() - taskStartTime,
          })
        }
      }

      if (taskSuccess) {
        this.progressEmitter.emit(jobId, `   ✅ Task completed successfully`)
      } else {
        this.progressEmitter.emit(jobId, `   ⚠️  Task completed with errors: ${taskErrors.join(', ')}`)
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this.progressEmitter.emit(jobId, `   ❌ Task failed: ${errorMsg}`)

      results.push({
        taskId: task.id,
        success: false,
        error: errorMsg,
        duration: Date.now() - taskStartTime,
      })
    }
  }

  /**
   * Executes dependency phase by consolidating all dependency updates into a single package.json transformation
   * This prevents multiple package.json entries in the result
   */
  private async executeDependencyPhase(
    jobId: string,
    tasks: Task[],
    fileContentsMap: Map<string, string>,
    transformedFiles: Map<string, string>,
    results: TaskResult[],
    options: TransformOptions,
    _migrationPlan: MigrationPlan
  ): Promise<void> {
    console.log(`[ORCHESTRATOR] Executing consolidated dependency phase with ${tasks.length} tasks`)
    
    // Consolidate all package names from all dependency tasks
    const allPackages = new Set<string>()
    const allBreakingChanges: string[] = []
    let maxRiskLevel: 'low' | 'medium' | 'high' = 'low'
    
    // First, collect all packages without emitting individual task messages
    for (const task of tasks) {
      // Extract packages from task
      if (task.pattern?.description) {
        const packages = this.extractPackagesFromDescription(task.pattern.description)
        packages.forEach(pkg => allPackages.add(pkg))
      }
      
      // Collect breaking changes
      if (task.breakingChanges) {
        allBreakingChanges.push(...task.breakingChanges)
      }
      
      // Track highest risk level
      if (task.riskLevel === 'high') {
        maxRiskLevel = 'high'
      } else if (task.riskLevel === 'medium' && maxRiskLevel === 'low') {
        maxRiskLevel = 'medium'
      }
    }
    
    console.log(`[ORCHESTRATOR] Consolidated ${allPackages.size} unique packages to update`)
    
    // Get the dependency transformer
    const transformer = this.registry.getByName('DependencyUpdater')
    
    if (!transformer) {
      this.progressEmitter.emit(jobId, `   ⚠️  No dependency transformer available`)
      return
    }
    
    // Emit a single consolidated task message
    this.progressEmitter.emit(jobId, `\n⚙️  Updating ${allPackages.size} dependencies in package.json...`)
    
    // Get package.json content
    const packageJsonContent = fileContentsMap.get('package.json') || ''
    
    if (!packageJsonContent) {
      this.progressEmitter.emit(jobId, `   ⚠️  package.json not found`)
      return
    }
    
    // Create a consolidated task
    const consolidatedTask: Task = {
      id: 'consolidated-dependencies',
      name: 'Update all dependencies',
      description: `Update packages: ${Array.from(allPackages).join(', ')}`,
      type: 'automated',
      estimatedMinutes: tasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0),
      automatedMinutes: tasks.reduce((sum, t) => sum + (t.automatedMinutes || 0), 0),
      pattern: {
        id: 'consolidated-deps',
        name: 'Consolidated Dependency Updates',
        category: 'dependency',
        severity: maxRiskLevel,
        occurrences: allPackages.size,
        affectedFiles: ['package.json'],
        description: `packages: ${Array.from(allPackages).join(', ')}`,
        automated: true,
        examples: [],
        detectionRules: []
      },
      affectedFiles: ['package.json'],
      estimatedEffort: tasks.reduce((sum, t) => sum + (t.estimatedEffort || 0), 0),
      riskLevel: maxRiskLevel,
      breakingChanges: allBreakingChanges,
      dependencies: []
    }
    
    const taskStartTime = Date.now()
    
    try {
      // Execute single consolidated transformation
      const result = await transformer.transform(packageJsonContent, options, consolidatedTask)
      
      if (result.success && result.code) {
        transformedFiles.set('package.json', result.code)
        fileContentsMap.set('package.json', result.code)
        
        this.progressEmitter.emit(
          jobId,
          `   ✓ package.json updated (+${result.metadata.linesAdded} -${result.metadata.linesRemoved} lines)`
        )
        
        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          result.warnings.forEach(warning => {
            this.progressEmitter.emit(jobId, `   ⚠️  ${warning}`)
          })
        }
        
        // Record success for all tasks
        tasks.forEach(task => {
          results.push({
            taskId: task.id,
            filePath: 'package.json',
            success: true,
            result,
            duration: Date.now() - taskStartTime,
          })
        })
      } else {
        const errorMsg = result.errors[0]?.message || 'Transformation failed'
        this.progressEmitter.emit(jobId, `   ❌ package.json failed: ${errorMsg}`)
        
        // Record failure for all tasks
        tasks.forEach(task => {
          results.push({
            taskId: task.id,
            filePath: 'package.json',
            success: false,
            result,
            error: errorMsg,
            duration: Date.now() - taskStartTime,
          })
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      this.progressEmitter.emit(jobId, `   ❌ Error: ${errorMsg}`)
      
      tasks.forEach(task => {
        results.push({
          taskId: task.id,
          filePath: 'package.json',
          success: false,
          error: errorMsg,
          duration: Date.now() - taskStartTime,
        })
      })
    }
  }
  
  /**
   * Extracts package names from a task description
   */
  private extractPackagesFromDescription(description: string): string[] {
    const packages: string[] = []
    
    // Pattern 1: "packages: pkg1, pkg2, pkg3"
    const listPattern = /packages?:\s*([a-z0-9@\-\/,\s]+)/i
    const listMatch = description.match(listPattern)
    if (listMatch) {
      const pkgList = listMatch[1]
        .split(',')
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && /^[a-z0-9@\-\/]+$/i.test(p))
      packages.push(...pkgList)
    }
    
    // Pattern 2: Package names in backticks
    const backtickPattern = /`([a-z0-9@\-\/]+)`/gi
    let match
    while ((match = backtickPattern.exec(description)) !== null) {
      packages.push(match[1])
    }
    
    // Pattern 3: Extract from task name like "Update react to 18.x"
    const updatePattern = /update\s+([a-z0-9@\-\/]+)/i
    const updateMatch = description.match(updatePattern)
    if (updateMatch) {
      packages.push(updateMatch[1])
    }
    
    return [...new Set(packages)] // Remove duplicates
  }

  /**
   * Deduplicates results by file path, keeping only the LAST result for each file
   * This handles cases where a file is processed multiple times (e.g., package.json
   * by both dependency updater and build tool transformer)
   */
  private deduplicateResults(results: TaskResult[]): TaskResult[] {
    const fileMap = new Map<string, TaskResult>()
    
    // Iterate through results and keep the last one for each file
    for (const result of results) {
      if (result.filePath) {
        fileMap.set(result.filePath, result)
      } else {
        // Keep results without filePath (shouldn't happen, but just in case)
        fileMap.set(`no-file-${result.taskId}`, result)
      }
    }
    
    return Array.from(fileMap.values())
  }

  /**
   * Extracts selected tasks from migration plan by matching task IDs
   * 
   * Iterates through all phases and tasks in the migration plan,
   * collecting tasks whose IDs are in the selectedTaskIds set.
   * 
   * @param plan - Complete migration plan
   * @param selectedIds - Set of task IDs to extract
   * @returns Array of selected tasks
   */
  private extractSelectedTasks(
    plan: MigrationPlan,
    selectedIds: Set<string>
  ): Task[] {
    const tasks: Task[] = []

    for (const phase of plan.phases) {
      for (const task of phase.tasks) {
        if (selectedIds.has(task.id)) {
          tasks.push(task)
        }
      }
    }

    return tasks
  }

  /**
   * Groups tasks by their parent phase and sorts phases by order
   * 
   * Creates a map of Phase -> Task[] where tasks are grouped under
   * their parent phase. Phases are sorted by their order property
   * to ensure correct execution sequence.
   * 
   * @param tasks - Array of tasks to group
   * @param plan - Migration plan containing phase information
   * @returns Map of phases to their tasks, sorted by phase order
   */
  private groupTasksByPhase(
    tasks: Task[],
    plan: MigrationPlan
  ): Map<Phase, Task[]> {
    const phaseMap = new Map<string, Phase>()
    const tasksByPhaseId = new Map<string, Task[]>()

    // Build phase lookup map
    for (const phase of plan.phases) {
      phaseMap.set(phase.id, phase)
    }

    // Group tasks by phase ID
    for (const task of tasks) {
      // Find which phase this task belongs to
      for (const phase of plan.phases) {
        if (phase.tasks.some(t => t.id === task.id)) {
          if (!tasksByPhaseId.has(phase.id)) {
            tasksByPhaseId.set(phase.id, [])
          }
          tasksByPhaseId.get(phase.id)!.push(task)
          break
        }
      }
    }

    // Create result map with phases sorted by order
    const result = new Map<Phase, Task[]>()
    
    // Sort phase IDs by phase order
    const sortedPhaseIds = Array.from(tasksByPhaseId.keys()).sort((a, b) => {
      const phaseA = phaseMap.get(a)
      const phaseB = phaseMap.get(b)
      return (phaseA?.order || 0) - (phaseB?.order || 0)
    })

    // Build final map
    for (const phaseId of sortedPhaseIds) {
      const phase = phaseMap.get(phaseId)
      const phaseTasks = tasksByPhaseId.get(phaseId)
      
      if (phase && phaseTasks) {
        result.set(phase, phaseTasks)
      }
    }

    return result
  }

  /**
   * Calculates comprehensive summary metrics from transformation results
   * 
   * Aggregates metrics across all task results including:
   * - Files changed count
   * - Lines added/removed
   * - Task success/failure/skip counts
   * - Errors and warnings
   * - Files requiring manual review
   * - Estimated time saved
   * 
   * @param results - Array of task results
   * @param transformedFiles - Map of transformed file paths to content
   * @param totalDuration - Total execution time in milliseconds
   * @returns Comprehensive transformation summary
   */
  private calculateSummary(
    results: TaskResult[],
    transformedFiles: Map<string, string>,
    totalDuration: number
  ): TransformationSummary {
    let linesAdded = 0
    let linesRemoved = 0
    const errors: string[] = []
    const warnings: string[] = []
    const manualReviewNeeded: string[] = []
    let totalTimeSavedMinutes = 0

    // Aggregate metrics from all results
    for (const result of results) {
      if (result.result) {
        linesAdded += result.result.metadata.linesAdded
        linesRemoved += result.result.metadata.linesRemoved

        // Collect errors
        for (const error of result.result.errors) {
          errors.push(`${result.filePath || result.taskId}: ${error.message}`)
        }

        // Collect warnings
        for (const warning of result.result.warnings) {
          warnings.push(`${result.filePath || result.taskId}: ${warning}`)
        }

        // Check if manual review is needed
        if (result.result.metadata.requiresManualReview && result.filePath) {
          manualReviewNeeded.push(result.filePath)
        }

        // Parse estimated time saved
        const timeSaved = result.result.metadata.estimatedTimeSaved
        const minutes = this.parseTimeSaved(timeSaved)
        totalTimeSavedMinutes += minutes
      }

      // Collect task-level errors
      if (result.error && !result.result) {
        errors.push(`${result.filePath || result.taskId}: ${result.error}`)
      }
    }

    // Count task statuses
    const tasksCompleted = results.filter(r => r.success).length
    const tasksFailed = results.filter(r => !r.success && !r.skipped).length
    const tasksSkipped = results.filter(r => r.skipped).length

    return {
      filesChanged: transformedFiles.size,
      linesAdded,
      linesRemoved,
      tasksCompleted,
      tasksFailed,
      tasksSkipped,
      errors: Array.from(new Set(errors)), // Deduplicate
      warnings: Array.from(new Set(warnings)), // Deduplicate
      manualReviewNeeded: Array.from(new Set(manualReviewNeeded)), // Deduplicate
      estimatedTimeSaved: this.formatTimeSaved(totalTimeSavedMinutes),
      totalDuration,
    }
  }

  /**
   * Creates an empty summary for cases with no tasks
   */
  private createEmptySummary(): TransformationSummary {
    return {
      filesChanged: 0,
      linesAdded: 0,
      linesRemoved: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      tasksSkipped: 0,
      errors: [],
      warnings: [],
      manualReviewNeeded: [],
      estimatedTimeSaved: '0 minutes',
      totalDuration: 0,
    }
  }

  /**
   * Parses time saved string to minutes
   * 
   * @param timeSaved - Time string like "30 minutes", "2h 15m", "< 1 minute"
   * @returns Total minutes
   */
  private parseTimeSaved(timeSaved: string): number {
    if (timeSaved.includes('< 1')) {
      return 0
    }

    let minutes = 0

    // Parse hours
    const hoursMatch = timeSaved.match(/(\d+)h/)
    if (hoursMatch) {
      minutes += parseInt(hoursMatch[1]) * 60
    }

    // Parse minutes
    const minutesMatch = timeSaved.match(/(\d+)\s*m/)
    if (minutesMatch) {
      minutes += parseInt(minutesMatch[1])
    }

    // Parse standalone minutes
    if (!hoursMatch && !minutesMatch) {
      const standaloneMatch = timeSaved.match(/(\d+)\s*minutes?/)
      if (standaloneMatch) {
        minutes += parseInt(standaloneMatch[1])
      }
    }

    return minutes
  }

  /**
   * Formats minutes into human-readable time string
   * 
   * @param minutes - Total minutes
   * @returns Formatted time string
   */
  private formatTimeSaved(minutes: number): string {
    if (minutes < 1) {
      return '< 1 minute'
    } else if (minutes < 60) {
      return `${minutes} minutes`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours} hours`
    }
  }

  /**
   * Formats bytes into human-readable size string
   * 
   * @param bytes - Size in bytes
   * @returns Formatted size string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }
  }

  /**
   * Detects and converts JS files to JSX if they contain JSX syntax
   * 
   * Scans all transformed files for .js files that contain JSX syntax
   * and converts them to .jsx files. This is a post-processing step
   * that ensures proper file extensions for JSX content.
   * 
   * @param transformedFiles - Map of file paths to transformed content
   * @returns Array of conversion records
   */
  private detectAndConvertJsToJsx(
    transformedFiles: Map<string, string>
  ): Array<{ originalPath: string; newPath: string; content: string }> {
    const conversions: Array<{ originalPath: string; newPath: string; content: string }> = []
    
    for (const [filePath, content] of transformedFiles.entries()) {
      // Only process .js files (not .jsx, .ts, .tsx, etc.)
      if (filePath.endsWith('.js') && this.containsJsx(content)) {
        const newPath = filePath.replace(/\.js$/, '.jsx')
        conversions.push({
          originalPath: filePath,
          newPath,
          content
        })
      }
    }
    
    return conversions
  }

  /**
   * Checks if file content contains JSX syntax
   * 
   * Uses multiple patterns to detect JSX:
   * - Component tags (e.g., <MyComponent>)
   * - HTML-like tags (e.g., <div>)
   * - React.createElement calls
   * - jsx() function calls
   * - Return statements with JSX
   * - JSX assignments
   * 
   * @param content - File content to check
   * @returns True if JSX syntax is detected
   */
  private containsJsx(content: string): boolean {
    // Simple JSX detection patterns
    const jsxPatterns = [
      /<[A-Z][a-zA-Z0-9]*/, // Component tags like <MyComponent
      /<[a-z]+[^>]*>/, // HTML-like tags
      /React\.createElement/, // React.createElement calls
      /jsx\s*\(/, // jsx() calls
      /return\s*\([\s\n]*</, // return statements with JSX
      /=\s*<[A-Za-z]/, // JSX assignments
    ]
    
    return jsxPatterns.some(pattern => pattern.test(content))
  }
}
