/**
 * Hybrid Transformation Engine for Phase 3 Code Migration
 * Orchestrates AST, AI, and Rule engines for comprehensive code transformation
 * Requirements: 5.1, 5.2, 5.3
 * 
 * This engine combines:
 * - AST transformations for deterministic code changes
 * - AI transformations for semantic understanding
 * - Rule validation for compliance checking
 */

console.log('[HybridEngine] Module loaded - version 3.1 - DELETION FILTER ACTIVE')

import { ASTTransformationEngine } from './ast-transformation-engine'
import { AITransformationEngine } from './ai-transformation-engine'
import { EnhancedAITransformer } from './enhanced-ai-transformer'
import { RuleEngine } from './rule-engine'
import { FileStructureManager, type FileStructureChange } from './file-structure-manager'
import { CSSAnalyzer } from './css-analyzer'
import { CSSToTailwindConverter } from './css-to-tailwind-converter'
import { ComponentStyleTransformer } from './component-style-transformer'
import { TailwindConfigGenerator } from './tailwind-config-generator'
import { AppRouterFileGenerator } from './app-router-file-generator'
import traverse from '@babel/traverse'
import * as t from '@babel/types'
import type {
  MigrationSpecification,
  TransformationContext,
  Phase3TransformResult,
  RepositoryFile,
  MigrationMetadata,
} from '@/types/migration'
import {
  TransformationError,
  logMigrationEvent,
  handleMigrationError,
} from './errors'
import {
  RecoveryManager,
  createDefaultRecoveryManager,
  type RecoveryContext,
} from './error-recovery'

/**
 * HybridTransformationEngine
 * 
 * Orchestrates the transformation pipeline combining AST, AI, and Rule engines.
 * Provides a unified interface for transforming code files with validation.
 */
export class HybridTransformationEngine {
  private astEngine: ASTTransformationEngine
  private aiEngine: AITransformationEngine
  private enhancedAI: EnhancedAITransformer
  private ruleEngine: RuleEngine
  private recoveryManager: RecoveryManager
  private fileStructureManager: FileStructureManager
  private cssAnalyzer: CSSAnalyzer
  private cssToTailwind: CSSToTailwindConverter
  private tailwindConfigGenerator: TailwindConfigGenerator
  private appRouterFileGenerator: AppRouterFileGenerator

  constructor(
    astEngine?: ASTTransformationEngine,
    aiEngine?: AITransformationEngine,
    ruleEngine?: RuleEngine,
    recoveryManager?: RecoveryManager
  ) {
    this.astEngine = astEngine || new ASTTransformationEngine()
    this.aiEngine = aiEngine || new AITransformationEngine()
    this.enhancedAI = new EnhancedAITransformer()
    this.ruleEngine = ruleEngine || new RuleEngine()
    this.recoveryManager = recoveryManager || createDefaultRecoveryManager()
    this.fileStructureManager = new FileStructureManager()
    this.cssAnalyzer = new CSSAnalyzer()
    this.cssToTailwind = new CSSToTailwindConverter()
    this.tailwindConfigGenerator = new TailwindConfigGenerator()
    this.appRouterFileGenerator = new AppRouterFileGenerator()
  }

  /**
   * Check if a file can be transformed with AST (JavaScript/TypeScript files only)
   */
  private isTransformableWithAST(filePath: string): boolean {
    const ext = filePath.toLowerCase().split('.').pop()
    return ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'].includes(ext || '')
  }

  /**
   * Remove duplicate CSS rules from merged CSS
   */
  private removeDuplicateCSSRules(css: string): string {
    // Split by comments to preserve source attribution
    const sections = css.split(/(\/\* From .*? \*\/)/)
    const seenRules = new Set<string>()
    const dedupedSections: string[] = []
    
    for (const section of sections) {
      if (section.startsWith('/* From')) {
        // Keep comment
        dedupedSections.push(section)
      } else {
        // Process CSS rules
        const rules = section.split(/(?<=})\s*/)
        const dedupedRules: string[] = []
        
        for (const rule of rules) {
          const trimmed = rule.trim()
          if (!trimmed) continue
          
          // Extract selector (everything before {)
          const selectorMatch = trimmed.match(/^([^{]+){/)
          if (selectorMatch) {
            const selector = selectorMatch[1].trim()
            
            // Only keep first occurrence of each selector
            if (!seenRules.has(selector)) {
              seenRules.add(selector)
              dedupedRules.push(trimmed)
            }
          } else {
            // Keep non-rule content (like @import, etc.)
            dedupedRules.push(trimmed)
          }
        }
        
        dedupedSections.push(dedupedRules.join('\n\n'))
      }
    }
    
    return dedupedSections.join('\n')
  }

  /**
   * Transform a single file using the hybrid approach
   * 
   * This method implements the transformation pipeline:
   * 1. Builds transformation context
   * 2. Applies AST transformations first (deterministic)
   * 3. Applies AI transformations for semantic changes
   * 4. Validates with rule engine
   * 5. Generates diff and metadata
   * 
   * Requirements: 5.1, 5.2, 5.3, 5.5
   * 
   * @param file - Repository file to transform
   * @param spec - Migration specification with mappings and rules
   * @param newFilePath - Optional new file path (from FileStructureManager)
   * @returns Transformation result with code, metadata, and confidence
   */
  async transform(
    file: RepositoryFile,
    spec: MigrationSpecification,
    newFilePath?: string,
    cssToTailwindMap?: Map<string, string[]>
  ): Promise<Phase3TransformResult> {
    const recoveryContext: RecoveryContext = {
      filePath: file.path,
      operation: 'transform',
      metadata: { spec: spec.metadata }
    }

    try {
      logMigrationEvent('transformation:start', {
        filePath: file.path,
        sourceFramework: spec.source.framework,
        targetFramework: spec.target.framework
      })

      // Check if file can be transformed with AST
      const canUseAST = this.isTransformableWithAST(file.path)

      // Step 1: Build transformation context
      const context = this.buildTransformationContext(file, spec)

      // Step 2: Load rules into rule engine
      this.ruleEngine.loadRules(spec)

      // Step 3: Apply AST transformations first (deterministic) with error recovery
      // Skip AST transformation for non-JavaScript files
      const astResult = canUseAST
        ? await this.applyASTTransformationsWithRecovery(
            file.content,
            spec,
            context,
            recoveryContext
          )
        : { code: file.content, errors: [] }

      // Step 4: Apply AI transformations for semantic changes with error recovery
      console.log(`[Hybrid Engine] Checking if AI transformation is needed for ${file.path}`)
      console.log(`[Hybrid Engine] - Can use AST: ${canUseAST}`)
      console.log(`[Hybrid Engine] - AI available: ${this.aiEngine.isAvailable()}`)
      
      // Special handling for package.json - always use AI if available
      const isPackageJson = file.path.endsWith('package.json')
      const shouldUseAI = this.aiEngine.isAvailable() && (canUseAST || isPackageJson)
      
      if (!this.aiEngine.isAvailable()) {
        console.warn(`[Hybrid Engine] ⚠ AI transformations disabled: No ANTHROPIC_API_KEY configured`)
        console.warn(`[Hybrid Engine] Set ANTHROPIC_API_KEY environment variable to enable AI transformations`)
      }
      
      if (!canUseAST && !isPackageJson) {
        console.log(`[Hybrid Engine] Skipping AI for non-JavaScript file: ${file.path}`)
      }
      
      if (isPackageJson) {
        console.log(`[Hybrid Engine] Using AI for package.json transformation`)
      }
      
      const aiResult = shouldUseAI
        ? await this.applyAITransformationsWithRecovery(
            astResult.code,
            spec,
            context,
            recoveryContext
          )
        : {
            code: astResult.code,
            confidence: 80,
            warnings: this.aiEngine.isAvailable() 
              ? [] 
              : ['AI transformations skipped: No API key configured'],
            requiresReview: false
          }
      
      console.log(`[Hybrid Engine] AI transformation result for ${file.path}:`)
      console.log(`[Hybrid Engine] - Confidence: ${aiResult.confidence}`)
      console.log(`[Hybrid Engine] - Requires review: ${aiResult.requiresReview}`)
      console.log(`[Hybrid Engine] - Warnings: ${aiResult.warnings.length}`)

      // Step 5: Apply CSS to Tailwind transformation if mapping provided
      let cssTransformResult = {
        code: aiResult.code,
        transformedClasses: 0,
        unmappedClasses: [] as string[],
      }

      // Only apply CSS transformation to JavaScript/TypeScript files
      const canUseCSS = this.isTransformableWithAST(file.path)
      
      if (cssToTailwindMap && cssToTailwindMap.size > 0 && canUseCSS) {
        console.log(`[Hybrid Engine] Applying CSS to Tailwind transformation for ${file.path}`)
        
        try {
          const componentStyleTransformer = new ComponentStyleTransformer(cssToTailwindMap)
          cssTransformResult = await componentStyleTransformer.transformComponent(aiResult.code)
          
          // Remove CSS imports
          cssTransformResult.code = componentStyleTransformer.removeCSSImports(cssTransformResult.code)
          
          console.log(`[Hybrid Engine] Transformed ${cssTransformResult.transformedClasses} CSS classes`)
          if (cssTransformResult.unmappedClasses.length > 0) {
            console.log(`[Hybrid Engine] Unmapped classes: ${cssTransformResult.unmappedClasses.join(', ')}`)
          }
        } catch (error) {
          console.error(`[Hybrid Engine] CSS transformation error for ${file.path}:`, error)
        }
      } else if (cssToTailwindMap && cssToTailwindMap.size > 0 && !canUseCSS) {
        console.log(`[Hybrid Engine] Skipping CSS transformation for non-JS file: ${file.path}`)
      }

      // Step 6: Validate transformation with rule engine
      const validation = await this.validateTransformation(
        file.content,
        cssTransformResult.code,
        spec,
        file.path
      )

      // Step 7: Generate diff between original and transformed code
      const diff = this.generateDiff(file.content, cssTransformResult.code)

      // Step 7: Determine new file path (use provided path or determine from spec)
      const finalNewFilePath = newFilePath || this.determineNewFilePath(file.path, spec)
      console.log(`[Hybrid Engine] transform() for ${file.path}`)
      console.log(`[Hybrid Engine]   - Provided newFilePath: ${newFilePath || 'NONE'}`)
      console.log(`[Hybrid Engine]   - Final newFilePath: ${finalNewFilePath}`)

      // Step 8: Build metadata describing the transformation
      const metadata = this.buildMetadata(
        file,
        finalNewFilePath,
        spec,
        context,
        astResult.errors,
        [...aiResult.warnings, ...cssTransformResult.unmappedClasses.map(c => `Unmapped CSS class: ${c}`)]
      )

      // Add CSS transformation metadata
      if (cssToTailwindMap && cssToTailwindMap.size > 0 && cssTransformResult.transformedClasses > 0) {
        metadata.notes.push(
          `CSS classes transformed: ${cssTransformResult.transformedClasses}`,
          `Unmapped classes: ${cssTransformResult.unmappedClasses.length}`
        )
      }

      // Step 9: Calculate confidence score based on validation and transformation results
      const confidence = this.calculateConfidence(
        validation,
        aiResult.confidence,
        astResult.errors.length
      )

      // Step 10: Determine if manual review is required
      const requiresReview = this.requiresManualReview(
        confidence,
        validation,
        aiResult.requiresReview || cssTransformResult.unmappedClasses.length > 0
      )

      logMigrationEvent('transformation:complete', {
        filePath: file.path,
        confidence,
        requiresReview,
        warningCount: astResult.errors.length + aiResult.warnings.length + cssTransformResult.unmappedClasses.length
      })

      return {
        code: cssTransformResult.code,
        originalCode: file.content, // Store original code for diff viewing
        filePath: file.path,
        newFilePath: finalNewFilePath,
        metadata,
        diff,
        confidence,
        requiresReview,
        warnings: [
          ...astResult.errors,
          ...aiResult.warnings,
          ...validation.warnings,
          ...cssTransformResult.unmappedClasses.map(c => `Unmapped CSS class: ${c}`),
        ],
      }
    } catch (error: any) {
      logMigrationEvent('transformation:failed', {
        filePath: file.path,
        error: error.message
      })

      // Log the error for monitoring
      const errorDetails = handleMigrationError(error)
      
      // If transformation fails completely, return error result
      return {
        code: file.content,
        originalCode: file.content, // Same as code since transformation failed
        filePath: file.path,
        newFilePath: file.path,
        metadata: {
          newFilePath: file.path,
          fileType: 'module',
          language: spec.source.language,
          framework: spec.source.framework,
          dependenciesAdded: [],
          dependenciesRemoved: [],
          notes: [`Transformation failed: ${errorDetails.message}`],
        },
        diff: '',
        confidence: 0,
        requiresReview: true,
        warnings: [`Critical error: ${errorDetails.message}`],
      }
    }
  }

  /**
   * Transform multiple files in batch with parallel processing
   * 
   * This method processes files in parallel batches to improve performance.
   * Files are processed 5 at a time to balance speed with resource usage.
   * Progress is tracked for each file and can be monitored via callback.
   * 
   * Now includes file structure planning to determine new file paths.
   * 
   * Requirements: 15.2, 15.5
   * 
   * @param files - Array of repository files to transform
   * @param spec - Migration specification with mappings and rules
   * @param onProgress - Optional callback for progress updates
   * @returns Map of file paths to transformation results
   */
  async transformBatch(
    files: RepositoryFile[],
    spec: MigrationSpecification,
    onProgress?: (progress: {
      totalFiles: number
      processedFiles: number
      currentFile: string
      percentage: number
    }) => void
  ): Promise<Map<string, Phase3TransformResult>> {
    const results = new Map<string, Phase3TransformResult>()
    const PARALLEL_LIMIT = 5 // Process 5 files at a time
    
    // Step 1: Plan file structure changes
    console.log('[Hybrid Engine] ========================================')
    console.log('[Hybrid Engine] BATCH TRANSFORMATION STARTED')
    console.log('[Hybrid Engine] ========================================')
    console.log('[Hybrid Engine] Planning file structure changes...')
    console.log('[Hybrid Engine] Files count:', files.length)
    console.log('[Hybrid Engine] File list:', files.map(f => f.path).join(', '))
    console.log('[Hybrid Engine] Spec source:', spec.source.framework, spec.source.language)
    console.log('[Hybrid Engine] Spec target:', spec.target.framework, spec.target.routing)
    
    const fileMap = new Map(files.map((f) => [f.path, f.content]))
    console.log('[Hybrid Engine] FileMap size:', fileMap.size)
    console.log('[Hybrid Engine] FileMap keys:', Array.from(fileMap.keys()))
    console.log('[Hybrid Engine] Calling fileStructureManager.planStructureChanges...')
    
    const structureChanges =
      this.fileStructureManager.planStructureChanges(fileMap, spec)

    console.log('[Hybrid Engine] ========================================')
    console.log('[Hybrid Engine] FILE STRUCTURE PLANNING COMPLETE')
    console.log('[Hybrid Engine] ========================================')
    console.log('[Hybrid Engine] Returned from planStructureChanges')
    console.log(
      `[Hybrid Engine] Planned ${structureChanges.length} file structure changes`
    )
    console.log(
      `[Hybrid Engine] - Moves: ${structureChanges.filter((c) => c.action === 'move').length}`
    )
    console.log(
      `[Hybrid Engine] - Creates: ${structureChanges.filter((c) => c.action === 'create').length}`
    )
    console.log(
      `[Hybrid Engine] - Deletes: ${structureChanges.filter((c) => c.action === 'delete').length}`
    )
    console.log('[Hybrid Engine] Detailed changes:')
    structureChanges.forEach((change, index) => {
      console.log(`[Hybrid Engine]   ${index + 1}. ${change.action.toUpperCase()}: ${change.originalPath} → ${change.newPath} (${change.fileType})`)
    })

    // Create a map of original path to new path
    const pathMapping = new Map<string, string>()
    for (const change of structureChanges) {
      if (change.originalPath) {
        pathMapping.set(change.originalPath, change.newPath)
        console.log(`[Hybrid Engine] Path mapping: ${change.originalPath} → ${change.newPath}`)
      }
    }
    console.log(`[Hybrid Engine] Total path mappings: ${pathMapping.size}`)
    console.log(`[Hybrid Engine] Path mapping entries:`, Array.from(pathMapping.entries()))

    // Step 1.5: Analyze CSS files for Tailwind conversion
    console.log('[Hybrid Engine] Analyzing CSS files for Tailwind conversion...')
    const cssFiles = files.filter((f) =>
      /\.(css|scss|sass)$/i.test(f.path)
    )
    
    // Filter out files marked for deletion
    const filesToDelete = new Set(
      structureChanges
        .filter((c) => c.action === 'delete')
        .map((c) => c.originalPath)
    )
    console.log(`[Hybrid Engine] Files marked for deletion: ${Array.from(filesToDelete).join(', ')}`)
    
    const componentFiles = files.filter(
      (f) => !/\.(css|scss|sass)$/i.test(f.path) && !filesToDelete.has(f.path)
    )
    console.log(`[Hybrid Engine] Component files to transform: ${componentFiles.length}`)
    console.log(`[Hybrid Engine] Skipping ${filesToDelete.size} files marked for deletion`)

    // Build CSS to Tailwind mapping
    const cssToTailwindMap = new Map<string, string[]>()
    let totalCSSClasses = 0

    if (cssFiles.length > 0) {
      console.log(`[Hybrid Engine] Found ${cssFiles.length} CSS files to analyze`)

      for (const cssFile of cssFiles) {
        try {
          const cssResult = await this.cssAnalyzer.parseCSS(cssFile.content)
          console.log(
            `[Hybrid Engine] Parsed ${cssResult.classes.length} classes from ${cssFile.path}`
          )

          for (const cssClass of cssResult.classes) {
            const mapping = this.cssToTailwind.convertClass(cssClass)

            if (mapping.confidence > 70) {
              cssToTailwindMap.set(cssClass.name, mapping.tailwindClasses)
              totalCSSClasses++
            }
          }
        } catch (error) {
          console.error(
            `[Hybrid Engine] Error analyzing CSS file ${cssFile.path}:`,
            error
          )
        }
      }

      console.log(
        `[Hybrid Engine] Built mapping for ${totalCSSClasses} CSS classes`
      )
    }

    // Load rules once for all files
    this.ruleEngine.loadRules(spec)

    // Track progress
    let processedFiles = 0
    const totalFiles = componentFiles.length // Only count component files for progress

    // Process component files in parallel batches
    for (let i = 0; i < componentFiles.length; i += PARALLEL_LIMIT) {
      // Get batch of files (up to PARALLEL_LIMIT)
      const batch = componentFiles.slice(i, i + PARALLEL_LIMIT)
      
      // Transform batch in parallel
      const batchPromises = batch.map(async (file) => {
        try {
          // Report progress before starting transformation
          if (onProgress) {
            onProgress({
              totalFiles,
              processedFiles,
              currentFile: file.path,
              percentage: Math.round((processedFiles / totalFiles) * 100),
            })
          }

          // Get new file path from structure changes
          const newPath = pathMapping.get(file.path)
          console.log(`[Hybrid Engine] Transforming ${file.path}`)
          console.log(`[Hybrid Engine]   - New path from mapping: ${newPath || 'NOT FOUND'}`)
          console.log(`[Hybrid Engine]   - Will use: ${newPath || 'determineNewFilePath fallback'}`)

          // Transform the file with new path and CSS context
          const result = await this.transform(file, spec, newPath, cssToTailwindMap)
          
          // Update progress counter
          processedFiles++
          
          // Report progress after completion
          if (onProgress) {
            onProgress({
              totalFiles,
              processedFiles,
              currentFile: file.path,
              percentage: Math.round((processedFiles / totalFiles) * 100),
            })
          }

          return { filePath: file.path, result }
        } catch (error: any) {
          // Update progress counter even on error
          processedFiles++
          
          // Report progress after error
          if (onProgress) {
            onProgress({
              totalFiles,
              processedFiles,
              currentFile: file.path,
              percentage: Math.round((processedFiles / totalFiles) * 100),
            })
          }

          // Return error result for this file
          return {
            filePath: file.path,
            result: {
              code: file.content,
              originalCode: file.content, // Same as code since transformation failed
              filePath: file.path,
              newFilePath: file.path,
              metadata: {
                newFilePath: file.path,
                fileType: 'module',
                language: spec.source.language,
                framework: spec.source.framework,
                dependenciesAdded: [],
                dependenciesRemoved: [],
                notes: [`Batch transformation failed: ${error.message}`],
              },
              diff: '',
              confidence: 0,
              requiresReview: true,
              warnings: [`Critical error in batch: ${error.message}`],
            } as Phase3TransformResult,
          }
        }
      })

      // Wait for all files in batch to complete
      const batchResults = await Promise.all(batchPromises)
      
      // Store results
      for (const { filePath, result } of batchResults) {
        results.set(filePath, result)
      }
    }

    // Step 1.5: Merge CSS files (index.css + App.css → globals.css)
    console.log('[Hybrid Engine] Checking for CSS files to merge...')
    const cssChanges = structureChanges.filter(c => c.fileType === 'style')
    const globalsCssChanges = cssChanges.filter(c => c.newPath === 'app/globals.css')
    
    console.log(`[Hybrid Engine] Found ${cssChanges.length} CSS changes`)
    console.log(`[Hybrid Engine] Found ${globalsCssChanges.length} files mapping to app/globals.css`)
    
    if (globalsCssChanges.length > 0) {
      console.log(`[Hybrid Engine] Processing CSS files for globals.css`)
      
      // Collect all CSS content from source files
      const cssContents: string[] = []
      const sourceFiles: string[] = []
      
      for (const change of globalsCssChanges) {
        // Find the original CSS file
        const cssFile = cssFiles.find(f => f.path === change.originalPath)
        if (cssFile) {
          console.log(`[Hybrid Engine] Adding CSS from ${cssFile.path} (${cssFile.content.length} chars)`)
          cssContents.push(`/* From ${cssFile.path} */\n${cssFile.content}`)
          sourceFiles.push(cssFile.path)
        } else {
          console.warn(`[Hybrid Engine] Could not find CSS file: ${change.originalPath}`)
        }
      }
      
      if (cssContents.length > 0) {
        // Merge CSS and remove duplicates
        const allCss = cssContents.join('\n\n')
        const dedupedCss = this.removeDuplicateCSSRules(allCss)
        
        // Create merged globals.css with Tailwind directives
        const mergedCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n${dedupedCss}`
        
        console.log(`[Hybrid Engine] Created merged globals.css (${mergedCss.length} chars) from: ${sourceFiles.join(', ')}`)
        console.log(`[Hybrid Engine] Removed ${allCss.length - dedupedCss.length} chars of duplicate CSS`)
        
        // Add merged result
        results.set('app/globals.css', {
          code: mergedCss,
          originalCode: cssContents.join('\n\n'),
          filePath: 'app/globals.css',
          newFilePath: 'app/globals.css',
          metadata: {
            newFilePath: 'app/globals.css',
            fileType: 'style',
            language: 'css',
            framework: spec.target.framework,
            dependenciesAdded: [],
            dependenciesRemoved: [],
            notes: [
              `Merged from: ${sourceFiles.join(', ')}`,
              'Added Tailwind directives',
            ],
          },
          diff: '',
          confidence: 100,
          requiresReview: false,
          warnings: [],
        })
      } else {
        console.warn(`[Hybrid Engine] No CSS content found to merge`)
      }
    } else {
      console.log(`[Hybrid Engine] No CSS files to merge into globals.css`)
    }

    // Step 2: Handle file creation for missing files
    const filesToCreate = structureChanges.filter(c => c.action === 'create')
    
    if (filesToCreate.length > 0) {
      console.log(`[Hybrid Engine] Creating ${filesToCreate.length} new files...`)
      console.log(`[Hybrid Engine] Files to create:`, filesToCreate.map(c => `${c.fileType}: ${c.newPath}`))
      
      for (const change of filesToCreate) {
        console.log(`[Hybrid Engine] Generating content for ${change.newPath} (type: ${change.fileType})`)
        
        // Generate content for the new file based on type
        const generatedContent = await this.generateFileContent(change, spec)
        
        console.log(`[Hybrid Engine] Generated content length: ${generatedContent?.length || 0} chars`)
        
        if (generatedContent) {
          console.log(`[Hybrid Engine] Adding ${change.newPath} to results`)
          results.set(change.newPath, {
            code: generatedContent,
            originalCode: '',
            filePath: change.newPath,
            newFilePath: change.newPath,
            metadata: {
              newFilePath: change.newPath,
              fileType: change.fileType as any,
              language: spec.target.language,
              framework: spec.target.framework,
              dependenciesAdded: [],
              dependenciesRemoved: [],
              notes: [
                `Generated ${change.fileType} file`,
                `Action: ${change.action}`,
                change.metadata.routeSegment ? `Route: ${change.metadata.routeSegment}` : '',
              ].filter(Boolean),
              fileStructureChange: {
                action: change.action,
                originalPath: change.newPath,
                isRouteFile: change.metadata.isRouteFile || false,
                routeSegment: change.metadata.routeSegment,
              },
            },
            diff: '',
            confidence: 100,
            requiresReview: false,
            warnings: [],
          })
        }
      }
    }

    // Step 3: Generate Tailwind config if CSS files were processed
    if (cssFiles.length > 0 && totalCSSClasses > 0) {
      console.log('[Hybrid Engine] Generating Tailwind configuration...')

      try {
        // Collect all CSS classes for config generation
        const allCSSClasses = []
        for (const cssFile of cssFiles) {
          const cssResult = await this.cssAnalyzer.parseCSS(cssFile.content)
          allCSSClasses.push(...cssResult.classes)
        }

        // Generate Tailwind config
        const tailwindConfig = this.tailwindConfigGenerator.generateConfig(
          allCSSClasses,
          {
            hasAppDir: spec.target.routing === 'app-router',
            hasPagesDir: spec.target.routing === 'pages-router',
            componentDirs: ['components'],
          }
        )

        const configContent =
          this.tailwindConfigGenerator.generateConfigFile(tailwindConfig)

        results.set('tailwind.config.ts', {
          code: configContent,
          originalCode: '',
          filePath: 'tailwind.config.ts',
          newFilePath: 'tailwind.config.ts',
          metadata: {
            newFilePath: 'tailwind.config.ts',
            fileType: 'config',
            language: spec.target.language,
            framework: spec.target.framework,
            dependenciesAdded: ['tailwindcss', 'autoprefixer', 'postcss'],
            dependenciesRemoved: [],
            notes: [
              'Generated Tailwind CSS configuration',
              `Processed ${totalCSSClasses} CSS classes`,
              `Custom colors: ${Object.keys(tailwindConfig.theme.extend.colors || {}).length}`,
              `Custom spacing: ${Object.keys(tailwindConfig.theme.extend.spacing || {}).length}`,
            ],
            fileStructureChange: {
              action: 'create',
              originalPath: 'tailwind.config.ts',
              isRouteFile: false,
            },
          },
          diff: '',
          confidence: 100,
          requiresReview: false,
          warnings: [],
        })

        console.log('[Hybrid Engine] Tailwind config generated successfully')
      } catch (error) {
        console.error('[Hybrid Engine] Error generating Tailwind config:', error)
      }
    }

    // Report final progress
    if (onProgress) {
      onProgress({
        totalFiles,
        processedFiles: totalFiles,
        currentFile: '',
        percentage: 100,
      })
    }

    return results
  }

  /**
   * Generate content for a new file based on its type
   * 
   * @param change - File structure change describing the file to create
   * @param spec - Migration specification
   * @returns Generated file content or null if generation not supported
   */
  private async generateFileContent(
    change: FileStructureChange,
    spec: MigrationSpecification
  ): Promise<string | null> {
    // For now, return placeholder content
    // This will be replaced with AppRouterFileGenerator in Phase 3
    
    switch (change.fileType) {
      case 'layout':
        return this.appRouterFileGenerator.generateRootLayout(spec, {
          appName: 'My App',
          description: 'Migrated to Next.js App Router',
        })
      case 'error':
        return this.appRouterFileGenerator.generateErrorBoundary()
      case 'loading':
        return this.appRouterFileGenerator.generateLoading()
      case 'style':
        return this.appRouterFileGenerator.generateGlobalsCss()
      case 'page':
        // For not-found and other pages
        if (change.newPath.includes('not-found')) {
          return this.appRouterFileGenerator.generateNotFound()
        }
        return this.appRouterFileGenerator.generatePage()
      default:
        return null
    }
  }

  /**
   * @deprecated Use AppRouterFileGenerator instead
   * Generate placeholder root layout
   */
  private generatePlaceholderLayout(spec: MigrationSpecification): string {
    return `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My App',
  description: 'Migrated to Next.js App Router',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`
  }

  /**
   * Generate placeholder error boundary
   */
  private generatePlaceholderError(): string {
    return `'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
`
  }

  /**
   * Generate placeholder loading component
   */
  private generatePlaceholderLoading(): string {
    return `export default function Loading() {
  return <div>Loading...</div>
}
`
  }

  /**
   * Generate placeholder globals.css
   */
  private generatePlaceholderGlobalsCss(): string {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}
`
  }

  /**
   * Build transformation context from file and spec
   * 
   * Context includes:
   * - File path and type
   * - Dependencies and imports
   * - Related files
   * 
   * Requirements: 5.1
   */
  private buildTransformationContext(
    file: RepositoryFile,
    _spec: MigrationSpecification
  ): TransformationContext {
    // Determine file type from path
    const fileType = this.determineFileType(file.path)

    // Extract dependencies from content (basic extraction)
    const dependencies = this.extractDependencies(file.content)

    // Extract imports from content
    const imports = this.extractImports(file.content)

    // Extract exports from content
    const exports = this.extractExports(file.content)

    return {
      filePath: file.path,
      fileType,
      dependencies,
      imports,
      exports,
      relatedFiles: [], // Will be populated by orchestrator if needed
    }
  }

  /**
   * Apply AST transformations with error recovery
   * 
   * Wraps AST transformations with error recovery strategies.
   * If transformation fails, attempts recovery based on error type.
   * 
   * Requirements: 12.1, 12.2
   */
  private async applyASTTransformationsWithRecovery(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext,
    recoveryContext: RecoveryContext
  ): Promise<{ code: string; errors: string[] }> {
    try {
      return await this.applyASTTransformations(code, spec, context)
    } catch (error: any) {
      // Create transformation error
      const transformError = new TransformationError(
        `AST transformation failed: ${error.message}`,
        context.filePath,
        undefined,
        undefined,
        ['Check syntax validity', 'Verify import statements', 'Review code structure']
      )

      logMigrationEvent('transformation:ast:error', {
        filePath: context.filePath,
        error: error.message
      })

      // Attempt recovery
      const recoveryResult = await this.recoveryManager.recover(
        transformError,
        { ...recoveryContext, operation: 'ast-transformation' },
        async () => this.applyASTTransformations(code, spec, context)
      )

      if (recoveryResult.success && recoveryResult.data) {
        logMigrationEvent('transformation:ast:recovered', {
          filePath: context.filePath,
          strategy: recoveryResult.strategy,
          attempts: recoveryResult.attempts
        })
        return recoveryResult.data
      }

      // Recovery failed, return original code with error
      logMigrationEvent('transformation:ast:recovery-failed', {
        filePath: context.filePath
      })

      return {
        code,
        errors: [`AST transformation failed and recovery unsuccessful: ${error.message}`]
      }
    }
  }

  /**
   * Apply AI transformations with error recovery
   * 
   * Wraps AI transformations with error recovery strategies.
   * If transformation fails, attempts recovery or falls back to AST-only result.
   * 
   * Requirements: 12.1, 12.2
   */
  private async applyAITransformationsWithRecovery(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext,
    recoveryContext: RecoveryContext
  ): Promise<{
    code: string
    confidence: number
    warnings: string[]
    requiresReview: boolean
  }> {
    console.log(`[Hybrid Engine] Starting AI transformation with recovery for ${context.filePath}`)
    
    try {
      const result = await this.applyAITransformations(code, spec, context)
      console.log(`[Hybrid Engine] ✓ AI transformation succeeded without recovery`)
      return result
    } catch (error: any) {
      console.error(`[Hybrid Engine] ✗ AI transformation failed, attempting recovery...`)
      console.error(`[Hybrid Engine] Error: ${error.message}`)
      
      // Create transformation error
      const transformError = new TransformationError(
        `AI transformation failed: ${error.message}`,
        context.filePath,
        undefined,
        undefined,
        ['Review component complexity', 'Check AI service availability', 'Consider manual transformation']
      )

      logMigrationEvent('transformation:ai:error', {
        filePath: context.filePath,
        error: error.message
      })

      // Attempt recovery
      console.log(`[Hybrid Engine] Attempting error recovery for ${context.filePath}`)
      const recoveryResult = await this.recoveryManager.recover(
        transformError,
        { ...recoveryContext, operation: 'ai-transformation' },
        async () => this.applyAITransformations(code, spec, context)
      )

      if (recoveryResult.success && recoveryResult.data) {
        console.log(`[Hybrid Engine] ✓ Recovery successful using strategy: ${recoveryResult.strategy}`)
        console.log(`[Hybrid Engine] Recovery attempts: ${recoveryResult.attempts}`)
        
        logMigrationEvent('transformation:ai:recovered', {
          filePath: context.filePath,
          strategy: recoveryResult.strategy,
          attempts: recoveryResult.attempts
        })
        return recoveryResult.data
      }

      // Recovery failed, return fallback result (AST-only with low confidence)
      console.warn(`[Hybrid Engine] ⚠ Recovery failed, using fallback (AST-only) for ${context.filePath}`)
      
      logMigrationEvent('transformation:ai:fallback', {
        filePath: context.filePath
      })

      return {
        code,
        confidence: 40, // Low confidence for failed AI transformation
        warnings: [`AI transformation failed: ${error.message}. Using AST-only result.`],
        requiresReview: true
      }
    }
  }

  /**
   * Apply AST transformations (deterministic)
   * 
   * AST transformations handle structural code changes:
   * - Import statement mappings
   * - Syntax transformations
   * - Routing transformations
   * - Export statement changes
   * 
   * These transformations are deterministic and don't require semantic understanding.
   * 
   * Requirements: 5.1, 5.2
   */
  private async applyASTTransformations(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): Promise<{ code: string; errors: string[] }> {
    try {
      const result = await this.astEngine.transformCode(code, spec, context)
      
      // Log transformation details if errors occurred
      if (result.errors.length > 0) {
        console.warn(`AST transformation warnings for ${context.filePath}:`, result.errors)
      }
      
      return result
    } catch (error: any) {
      console.error(`AST transformation failed for ${context.filePath}:`, error)
      return {
        code,
        errors: [`AST transformation failed: ${error.message}`],
      }
    }
  }

  /**
   * Apply AI transformations (semantic)
   * 
   * AI transformations handle semantic code changes that require understanding:
   * - Component lifecycle method mappings
   * - Complex refactoring patterns
   * - Framework-specific idioms
   * - Business logic preservation
   * - Pattern recognition and best practices
   * 
   * Uses EnhancedAITransformer for advanced features including:
   * - Pattern recognition (15+ patterns)
   * - Refactoring suggestions
   * - Semantic analysis
   * - Context-aware transformations
   * 
   * Requirements: 5.3
   */
  private async applyAITransformations(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): Promise<{
    code: string
    confidence: number
    warnings: string[]
    requiresReview: boolean
  }> {
    try {
      // Check if AI transformation is needed
      const needsAI = this.needsAITransformation(code, spec, context)
      console.log(`[Hybrid Engine] AI transformation needed for ${context.filePath}: ${needsAI}`)
      
      if (needsAI) {
        console.log(`[Hybrid Engine] ▶ Applying Enhanced AI transformation for ${context.filePath}`)
        console.log(`[Hybrid Engine] Code length: ${code.length} chars`)
        
        // Step 1: Recognize patterns in the code
        const patterns = this.enhancedAI.recognizePatterns(code, 'react-to-nextjs')
        if (patterns.length > 0) {
          console.log(`[Hybrid Engine] 🎯 Recognized ${patterns.length} patterns:`)
          patterns.forEach(p => console.log(`[Hybrid Engine]    - ${p.name} (${p.confidence}% confidence)`))
        }
        
        const startTime = Date.now()
        
        // Step 2: Use enhanced transformer with context-aware transformation
        const aiResult = await this.enhancedAI.transformWithContext(
          code,
          spec,
          context,
          {
            preserveComments: true,
            applyBestPractices: true,
            modernizeSyntax: true,
            optimizePerformance: spec.target.framework === 'Next.js',
            improveAccessibility: true,
          }
        )
        
        const duration = Date.now() - startTime

        // Log AI transformation results
        console.log(`[Hybrid Engine] ✓ Enhanced AI transformation completed for ${context.filePath} in ${duration}ms`)
        console.log(`[Hybrid Engine] - Confidence: ${aiResult.confidence}%`)
        console.log(`[Hybrid Engine] - Requires review: ${aiResult.requiresReview}`)
        console.log(`[Hybrid Engine] - Warnings: ${aiResult.warnings.length}`)
        console.log(`[Hybrid Engine] - Output length: ${aiResult.code.length} chars`)
        console.log(`[Hybrid Engine] - Patterns applied: ${patterns.length}`)
        
        if (aiResult.warnings.length > 0) {
          console.warn(`[Hybrid Engine] ⚠ AI warnings:`, aiResult.warnings)
        }

        return {
          code: aiResult.code,
          confidence: aiResult.confidence,
          warnings: aiResult.warnings,
          requiresReview: aiResult.requiresReview,
        }
      }

      // No AI transformation needed, return AST result with high confidence
      console.log(`[Hybrid Engine] Skipping AI transformation for ${context.filePath} (AST-only)`)
      return {
        code,
        confidence: 80, // High confidence for AST-only transformations
        warnings: [],
        requiresReview: false,
      }
    } catch (error: any) {
      console.error(`[Hybrid Engine] ✗ AI transformation failed for ${context.filePath}:`, error.message)
      console.error(`[Hybrid Engine] Error stack:`, error.stack)
      
      return {
        code,
        confidence: 0,
        warnings: [`AI transformation failed: ${error.message}`],
        requiresReview: true,
      }
    }
  }

  /**
   * Validate transformation with comprehensive checks
   * 
   * This method implements comprehensive validation including:
   * 1. Syntax validity checking for target language
   * 2. Semantic equivalence verification (control flow comparison)
   * 3. Import resolution verification
   * 4. Old framework reference checking
   * 5. Migration rule compliance
   * 6. Confidence score calculation
   * 
   * Requirements: 5.5, 13.1, 13.2, 13.3, 13.4, 13.5
   * 
   * @param original - Original source code
   * @param transformed - Transformed code
   * @param spec - Migration specification
   * @param filePath - File path for logging
   * @returns Validation result with validity, violations, and warnings
   */
  private async validateTransformation(
    original: string,
    transformed: string,
    spec: MigrationSpecification,
    filePath: string
  ): Promise<{
    valid: boolean
    violations: any[]
    warnings: string[]
    semanticEquivalence: boolean
    importsResolved: boolean
    oldFrameworkReferencesRemoved: boolean
    confidenceScore: number
  }> {
    try {
      const validationResults = {
        valid: true,
        violations: [] as any[],
        warnings: [] as string[],
        semanticEquivalence: false,
        importsResolved: false,
        oldFrameworkReferencesRemoved: false,
        confidenceScore: 0,
      }

      // Check if file can be validated with AST
      const canUseAST = this.isTransformableWithAST(filePath)

      // Step 1: Validate transformed code against migration rules (only for JS/TS files)
      // Requirements: 5.5
      const ruleValidation = canUseAST
        ? this.ruleEngine.validateAgainstRules(transformed, filePath)
        : { valid: true, violations: [], warnings: [] }
      validationResults.violations.push(...ruleValidation.violations)
      validationResults.warnings.push(...ruleValidation.warnings)

      // Step 2: Check syntax validity in target language (only for JS/TS files)
      // Requirements: 5.5, 13.1
      const syntaxValid = canUseAST ? await this.validateSyntax(transformed, spec) : true
      if (!syntaxValid) {
        validationResults.valid = false
        validationResults.warnings.push('Syntax validation failed for target language')
      }

      // Step 3: Verify semantic equivalence (control flow comparison) (only for JS/TS files)
      // Requirements: 13.1, 13.2
      const semanticCheck = canUseAST
        ? await this.verifySemanticEquivalence(original, transformed, spec)
        : { equivalent: true, reason: 'Skipped for non-JS file' }
      validationResults.semanticEquivalence = semanticCheck.equivalent
      if (!semanticCheck.equivalent) {
        validationResults.warnings.push(
          `Semantic equivalence check: ${semanticCheck.reason || 'Control flow differs'}`
        )
      }

      // Step 4: Verify that all imports resolve correctly (only for JS/TS files)
      // Requirements: 13.3
      const importCheck = canUseAST
        ? await this.verifyImportsResolved(transformed, spec)
        : { resolved: true, unresolvedImports: [] }
      validationResults.importsResolved = importCheck.resolved
      if (!importCheck.resolved) {
        validationResults.warnings.push(
          `Import resolution issues: ${importCheck.unresolvedImports.join(', ')}`
        )
      }

      // Step 5: Check that no references to old framework remain
      // Requirements: 13.4
      const frameworkCheck = this.checkOldFrameworkReferences(
        transformed,
        spec
      )
      validationResults.oldFrameworkReferencesRemoved = frameworkCheck.clean
      if (!frameworkCheck.clean) {
        validationResults.warnings.push(
          `Old framework references found: ${frameworkCheck.references.join(', ')}`
        )
      }

      // Step 6: Calculate confidence score based on validation results
      // Requirements: 13.5
      validationResults.confidenceScore = this.calculateValidationConfidence({
        syntaxValid,
        semanticEquivalent: semanticCheck.equivalent,
        importsResolved: importCheck.resolved,
        oldFrameworkRemoved: frameworkCheck.clean,
        ruleViolations: validationResults.violations.length,
        warnings: validationResults.warnings.length,
      })

      // Determine overall validity
      validationResults.valid =
        ruleValidation.valid &&
        syntaxValid &&
        validationResults.violations.filter((v) => v.severity === 'error')
          .length === 0

      // Log validation results
      if (!validationResults.valid || validationResults.warnings.length > 0) {
        console.warn(`Validation results for ${filePath}:`, {
          valid: validationResults.valid,
          ruleViolations: validationResults.violations.length,
          syntaxValid,
          semanticEquivalent: semanticCheck.equivalent,
          importsResolved: importCheck.resolved,
          oldFrameworkRemoved: frameworkCheck.clean,
          confidenceScore: validationResults.confidenceScore,
          warnings: validationResults.warnings.length,
        })
      }

      return validationResults
    } catch (error: any) {
      console.error(`Validation failed for ${filePath}:`, error)
      return {
        valid: false,
        violations: [],
        warnings: [`Validation failed: ${error.message}`],
        semanticEquivalence: false,
        importsResolved: false,
        oldFrameworkReferencesRemoved: false,
        confidenceScore: 0,
      }
    }
  }

  /**
   * Validate syntax of transformed code
   * 
   * Requirements: 5.5, 13.1
   */
  private async validateSyntax(
    code: string,
    spec: MigrationSpecification
  ): Promise<boolean> {
    try {
      // Auto-detect TypeScript syntax in the generated code
      const hasTypeScriptSyntax = this.detectTypeScriptSyntax(code)
      const language = hasTypeScriptSyntax ? 'typescript' : spec.target.language
      
      console.log(`[Hybrid Engine] Validating syntax with language: ${language}`)
      if (hasTypeScriptSyntax && spec.target.language !== 'typescript') {
        console.log(`[Hybrid Engine] Auto-detected TypeScript syntax in generated code`)
      }
      
      const ast = this.astEngine.parseCode(code, language)
      const validation = this.astEngine.validateAST(ast)
      return validation.valid
    } catch (error) {
      console.error('[Hybrid Engine] ✗ Syntax validation error:', error)
      console.error('[Hybrid Engine] ✗ Code that failed validation:')
      console.error('[Hybrid Engine] ----------------------------------------')
      console.error(code)
      console.error('[Hybrid Engine] ----------------------------------------')
      return false
    }
  }

  /**
   * Detect if code contains TypeScript-specific syntax
   */
  private detectTypeScriptSyntax(code: string): boolean {
    // Check for TypeScript-specific keywords and syntax
    const typeScriptPatterns = [
      /\binterface\s+\w+/,           // interface declarations
      /\btype\s+\w+\s*=/,           // type aliases
      /:\s*\w+(\[\]|\||\&)/,        // type annotations
      /\bas\s+\w+/,                 // type assertions
      /\bpublic\s+\w+/,             // access modifiers
      /\bprivate\s+\w+/,            // access modifiers
      /\bprotected\s+\w+/,          // access modifiers
      /\breadonly\s+\w+/,           // readonly modifier
      /\benum\s+\w+/,               // enum declarations
      /\bnamespace\s+\w+/,          // namespace declarations
      /\bgeneric\s*<.*>/,           // generic syntax
      /<.*>\s*\(/,                  // generic function calls
      /\?\s*:/,                     // optional properties
      /!\s*\./,                     // non-null assertion
    ]
    
    return typeScriptPatterns.some(pattern => pattern.test(code))
  }

  /**
   * Verify semantic equivalence between original and transformed code
   * 
   * This method compares the control flow graphs of both code versions
   * to ensure the transformation preserves the original behavior.
   * 
   * Requirements: 13.1, 13.2
   * 
   * @param original - Original source code
   * @param transformed - Transformed code
   * @param spec - Migration specification
   * @returns Equivalence check result with reason
   */
  private async verifySemanticEquivalence(
    original: string,
    transformed: string,
    spec: MigrationSpecification
  ): Promise<{ equivalent: boolean; reason?: string }> {
    try {
      // Auto-detect TypeScript syntax in the generated code
      const hasTypeScriptSyntax = this.detectTypeScriptSyntax(transformed)
      const targetLanguage = hasTypeScriptSyntax ? 'typescript' : spec.target.language
      
      // Parse both versions
      const originalAST = this.astEngine.parseCode(
        original,
        spec.source.language
      )
      const transformedAST = this.astEngine.parseCode(
        transformed,
        targetLanguage
      )

      // Build control flow graphs for both
      const originalCFG = this.buildControlFlowGraph(originalAST)
      const transformedCFG = this.buildControlFlowGraph(transformedAST)

      // Compare control flow structures
      const cfgMatch = this.compareControlFlowGraphs(originalCFG, transformedCFG)

      if (!cfgMatch.matches) {
        return {
          equivalent: false,
          reason: cfgMatch.reason || 'Control flow structure differs',
        }
      }

      // Check that critical patterns are preserved
      const patternsPreserved = this.verifyPatternsPreserved(
        originalAST,
        transformedAST,
        spec
      )

      if (!patternsPreserved.preserved) {
        return {
          equivalent: false,
          reason: patternsPreserved.reason || 'Critical patterns not preserved',
        }
      }

      return { equivalent: true }
    } catch (error: any) {
      console.error('Semantic equivalence check error:', error)
      return {
        equivalent: false,
        reason: `Semantic check failed: ${error.message}`,
      }
    }
  }

  /**
   * Build a simplified control flow graph from AST
   * 
   * This creates a representation of the code's control flow including:
   * - Function declarations and calls
   * - Conditional statements (if/else)
   * - Loops (for/while)
   * - Return statements
   * 
   * Requirements: 13.2
   */
  private buildControlFlowGraph(ast: t.File): {
    functions: string[]
    conditionals: number
    loops: number
    returns: number
    functionCalls: string[]
  } {
    const cfg = {
      functions: [] as string[],
      conditionals: 0,
      loops: 0,
      returns: 0,
      functionCalls: [] as string[],
    }

    traverse(ast, {
      FunctionDeclaration(path) {
        if (path.node.id) {
          cfg.functions.push(path.node.id.name)
        }
      },
      ArrowFunctionExpression() {
        cfg.functions.push('(arrow)')
      },
      FunctionExpression() {
        cfg.functions.push('(anonymous)')
      },
      IfStatement() {
        cfg.conditionals++
      },
      ConditionalExpression() {
        cfg.conditionals++
      },
      SwitchStatement() {
        cfg.conditionals++
      },
      ForStatement() {
        cfg.loops++
      },
      WhileStatement() {
        cfg.loops++
      },
      DoWhileStatement() {
        cfg.loops++
      },
      ForInStatement() {
        cfg.loops++
      },
      ForOfStatement() {
        cfg.loops++
      },
      ReturnStatement() {
        cfg.returns++
      },
      CallExpression(path) {
        if (t.isIdentifier(path.node.callee)) {
          cfg.functionCalls.push(path.node.callee.name)
        } else if (
          t.isMemberExpression(path.node.callee) &&
          t.isIdentifier(path.node.callee.property)
        ) {
          cfg.functionCalls.push(path.node.callee.property.name)
        }
      },
    })

    return cfg
  }

  /**
   * Compare two control flow graphs for equivalence
   * 
   * Requirements: 13.2
   */
  private compareControlFlowGraphs(
    original: ReturnType<typeof this.buildControlFlowGraph>,
    transformed: ReturnType<typeof this.buildControlFlowGraph>
  ): { matches: boolean; reason?: string } {
    // Allow some tolerance for framework-specific differences
    const TOLERANCE = 0.2 // 20% difference allowed

    // Compare function counts (with tolerance)
    const functionDiff = Math.abs(
      original.functions.length - transformed.functions.length
    )
    if (
      functionDiff >
      Math.max(1, original.functions.length * TOLERANCE)
    ) {
      return {
        matches: false,
        reason: `Function count differs significantly: ${original.functions.length} vs ${transformed.functions.length}`,
      }
    }

    // Compare conditional counts (with tolerance)
    const conditionalDiff = Math.abs(
      original.conditionals - transformed.conditionals
    )
    if (conditionalDiff > Math.max(1, original.conditionals * TOLERANCE)) {
      return {
        matches: false,
        reason: `Conditional count differs: ${original.conditionals} vs ${transformed.conditionals}`,
      }
    }

    // Compare loop counts (with tolerance)
    const loopDiff = Math.abs(original.loops - transformed.loops)
    if (loopDiff > Math.max(1, original.loops * TOLERANCE)) {
      return {
        matches: false,
        reason: `Loop count differs: ${original.loops} vs ${transformed.loops}`,
      }
    }

    // Compare return statement counts (with tolerance)
    const returnDiff = Math.abs(original.returns - transformed.returns)
    if (returnDiff > Math.max(1, original.returns * TOLERANCE)) {
      return {
        matches: false,
        reason: `Return statement count differs: ${original.returns} vs ${transformed.returns}`,
      }
    }

    return { matches: true }
  }

  /**
   * Verify that critical patterns are preserved during transformation
   * 
   * Requirements: 13.2
   */
  private verifyPatternsPreserved(
    originalAST: t.File,
    transformedAST: t.File,
    spec: MigrationSpecification
  ): { preserved: boolean; reason?: string } {
    // Check that mustPreserve rules are followed
    const mustPreserve = spec.rules.mustPreserve

    // For now, we do a basic check that business logic patterns are preserved
    // This could be enhanced with more sophisticated pattern matching

    // Count JSX elements (for React/Next.js)
    let originalJSXCount = 0
    let transformedJSXCount = 0

    traverse(originalAST, {
      JSXElement() {
        originalJSXCount++
      },
    })

    traverse(transformedAST, {
      JSXElement() {
        transformedJSXCount++
      },
    })

    // Allow some difference for framework-specific changes
    const jsxDiff = Math.abs(originalJSXCount - transformedJSXCount)
    if (jsxDiff > Math.max(2, originalJSXCount * 0.3)) {
      return {
        preserved: false,
        reason: `JSX element count differs significantly: ${originalJSXCount} vs ${transformedJSXCount}`,
      }
    }

    // Check for preserved patterns in mustPreserve rules
    for (const pattern of mustPreserve) {
      // This is a simplified check - could be enhanced with AST pattern matching
      if (pattern.toLowerCase().includes('business logic')) {
        // Business logic should have similar complexity
        continue
      }
    }

    return { preserved: true }
  }

  /**
   * Verify that all imports in transformed code resolve correctly
   * 
   * This checks that:
   * - All import statements use valid module paths
   * - Imports are mapped correctly from source to target framework
   * - No broken import references remain
   * 
   * Requirements: 13.3
   * 
   * @param transformed - Transformed code
   * @param spec - Migration specification
   * @returns Import resolution result
   */
  private async verifyImportsResolved(
    transformed: string,
    spec: MigrationSpecification
  ): Promise<{ resolved: boolean; unresolvedImports: string[] }> {
    try {
      // Auto-detect TypeScript syntax in the generated code
      const hasTypeScriptSyntax = this.detectTypeScriptSyntax(transformed)
      const targetLanguage = hasTypeScriptSyntax ? 'typescript' : spec.target.language
      
      const ast = this.astEngine.parseCode(transformed, targetLanguage)
      const unresolvedImports: string[] = []

      // Extract all imports from transformed code
      const imports: string[] = []
      traverse(ast, {
        ImportDeclaration(path) {
          imports.push(path.node.source.value)
        },
      })

      // Check each import
      for (const importPath of imports) {
        // Check if import is from old framework (should have been mapped)
        const isOldFrameworkImport = this.isOldFrameworkImport(
          importPath,
          spec.source.framework
        )

        if (isOldFrameworkImport) {
          // This import should have been transformed
          unresolvedImports.push(
            `${importPath} (old framework import not transformed)`
          )
        }

        // Check if import path is valid for target framework
        const isValidTargetImport = this.isValidTargetImport(
          importPath,
          spec.target.framework
        )

        if (!isValidTargetImport && !importPath.startsWith('.')) {
          // Relative imports are assumed valid
          unresolvedImports.push(
            `${importPath} (invalid for target framework)`
          )
        }
      }

      return {
        resolved: unresolvedImports.length === 0,
        unresolvedImports,
      }
    } catch (error: any) {
      console.error('Import resolution check error:', error)
      return {
        resolved: false,
        unresolvedImports: [`Import check failed: ${error.message}`],
      }
    }
  }

  /**
   * Check if an import is from the old framework
   */
  private isOldFrameworkImport(
    importPath: string,
    sourceFramework: string
  ): boolean {
    const frameworkPackages: Record<string, string[]> = {
      React: ['react-router', 'react-router-dom'],
      Vue: ['vue-router', 'vuex'],
      Angular: ['@angular/router', '@angular/common'],
      Flask: ['flask'],
      Django: ['django'],
    }

    const packages = frameworkPackages[sourceFramework] || []
    return packages.some((pkg) => importPath.startsWith(pkg))
  }

  /**
   * Check if an import is valid for the target framework
   */
  private isValidTargetImport(
    importPath: string,
    targetFramework: string
  ): boolean {
    const validPackages: Record<string, string[]> = {
      'Next.js': ['next/', 'react', '@vercel/'],
      'Nuxt': ['nuxt/', 'vue', '@nuxt/'],
      FastAPI: ['fastapi', 'pydantic', 'starlette'],
      NestJS: ['@nestjs/', 'express'],
    }

    const packages = validPackages[targetFramework] || []

    // If no specific packages defined, assume valid
    if (packages.length === 0) {
      return true
    }

    return packages.some((pkg) => importPath.startsWith(pkg))
  }

  /**
   * Check that no references to old framework remain in transformed code
   * 
   * This verifies that all framework-specific code has been properly
   * transformed to the target framework.
   * 
   * Requirements: 13.4
   * 
   * @param transformed - Transformed code
   * @param spec - Migration specification
   * @returns Check result with found references
   */
  private checkOldFrameworkReferences(
    transformed: string,
    spec: MigrationSpecification
  ): { clean: boolean; references: string[] } {
    const references: string[] = []

    // Define old framework patterns to check for
    const oldFrameworkPatterns: Record<string, RegExp[]> = {
      React: [
        /react-router/g,
        /\bRoute\b/g,
        /\bSwitch\b/g,
        /\bBrowserRouter\b/g,
        /useNavigate\(/g,
      ],
      Vue: [/vue-router/g, /\bVuex\b/g, /\$router/g, /\$route/g],
      Flask: [/from flask import/g, /@app\.route/g],
    }

    const patterns = oldFrameworkPatterns[spec.source.framework] || []

    // Check for old framework patterns
    for (const pattern of patterns) {
      const matches = transformed.match(pattern)
      if (matches) {
        references.push(
          `${pattern.source} (found ${matches.length} occurrence(s))`
        )
      }
    }

    // Check for imports that should have been removed
    const mustRemove = spec.rules.mustRemove
    for (const item of mustRemove) {
      if (transformed.includes(item)) {
        references.push(`${item} (should have been removed)`)
      }
    }

    return {
      clean: references.length === 0,
      references,
    }
  }

  /**
   * Calculate confidence score based on validation results
   * 
   * This combines multiple validation factors into a single confidence score:
   * - Syntax validity (30%)
   * - Semantic equivalence (30%)
   * - Import resolution (20%)
   * - Old framework removal (10%)
   * - Rule violations (10% penalty per violation)
   * 
   * Requirements: 13.5
   * 
   * @param factors - Validation factors
   * @returns Confidence score (0-100)
   */
  private calculateValidationConfidence(factors: {
    syntaxValid: boolean
    semanticEquivalent: boolean
    importsResolved: boolean
    oldFrameworkRemoved: boolean
    ruleViolations: number
    warnings: number
  }): number {
    let confidence = 0

    // Syntax validity (30%)
    if (factors.syntaxValid) {
      confidence += 30
    }

    // Semantic equivalence (30%)
    if (factors.semanticEquivalent) {
      confidence += 30
    }

    // Import resolution (20%)
    if (factors.importsResolved) {
      confidence += 20
    }

    // Old framework removal (10%)
    if (factors.oldFrameworkRemoved) {
      confidence += 10
    }

    // Additional 10% for clean validation
    if (factors.ruleViolations === 0 && factors.warnings === 0) {
      confidence += 10
    }

    // Penalties
    // Reduce confidence for rule violations (10% per violation, max 30%)
    const violationPenalty = Math.min(30, factors.ruleViolations * 10)
    confidence -= violationPenalty

    // Reduce confidence for warnings (2% per warning, max 10%)
    const warningPenalty = Math.min(10, factors.warnings * 2)
    confidence -= warningPenalty

    // Ensure confidence is between 0 and 100
    return Math.max(0, Math.min(100, confidence))
  }

  /**
   * Generate diff between original and transformed code
   * 
   * Creates a unified diff format showing additions and deletions.
   * This format is compatible with standard diff viewers and tools.
   * 
   * Requirements: 5.5
   */
  private generateDiff(original: string, transformed: string): string {
    // If no changes, return empty diff
    if (original === transformed) {
      return ''
    }

    // Simple unified diff format
    const originalLines = original.split('\n')
    const transformedLines = transformed.split('\n')

    const diff: string[] = []

    // Add diff header
    diff.push('--- original')
    diff.push('+++ transformed')
    diff.push(`@@ -1,${originalLines.length} +1,${transformedLines.length} @@`)

    // Generate line-by-line diff
    let i = 0
    let j = 0

    while (i < originalLines.length || j < transformedLines.length) {
      const originalLine = originalLines[i]
      const transformedLine = transformedLines[j]

      if (i >= originalLines.length) {
        // Only transformed lines remain (additions)
        diff.push(`+${transformedLine}`)
        j++
      } else if (j >= transformedLines.length) {
        // Only original lines remain (deletions)
        diff.push(`-${originalLine}`)
        i++
      } else if (originalLine === transformedLine) {
        // Lines match (context)
        diff.push(` ${originalLine}`)
        i++
        j++
      } else {
        // Lines differ (deletion + addition)
        diff.push(`-${originalLine}`)
        diff.push(`+${transformedLine}`)
        i++
        j++
      }
    }

    return diff.join('\n')
  }

  /**
   * Determine new file path based on target framework conventions
   */
  private determineNewFilePath(
    originalPath: string,
    spec: MigrationSpecification
  ): string {
    const { fileStructure, componentConventions } = spec.target

    // Extract file name and directory
    const parts = originalPath.split('/')
    const fileName = parts[parts.length - 1]
    const fileNameWithoutExt = fileName.replace(/\.[^.]+$/, '')

    // Check if this is a JavaScript/TypeScript file that should be transformed
    const isJSFile = /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(fileName)
    
    // Non-JS files (CSS, JSON, MD, etc.) keep their original path and extension
    if (!isJSFile) {
      return originalPath
    }

    // Determine file type and new directory for JS files
    let newDir = ''
    if (originalPath.includes('/pages/') || originalPath.includes('/routes/')) {
      newDir = fileStructure.pages
    } else if (originalPath.includes('/components/')) {
      newDir = fileStructure.components
    } else if (originalPath.includes('/layouts/')) {
      newDir = fileStructure.layouts
    } else if (originalPath.includes('/api/')) {
      newDir = fileStructure.api
    } else {
      // Keep in same relative location
      newDir = parts.slice(0, -1).join('/')
    }

    // Apply naming convention and extension for JS files
    let newFileName = fileNameWithoutExt
    if (componentConventions.namingConvention === 'PascalCase') {
      newFileName = this.toPascalCase(fileNameWithoutExt)
    } else if (componentConventions.namingConvention === 'camelCase') {
      newFileName = this.toCamelCase(fileNameWithoutExt)
    } else if (componentConventions.namingConvention === 'kebab-case') {
      newFileName = this.toKebabCase(fileNameWithoutExt)
    }

    newFileName += componentConventions.fileExtension

    return `${newDir}/${newFileName}`
  }

  /**
   * Build migration metadata
   * 
   * Metadata includes:
   * - New file path and type
   * - Target language and framework
   * - Dependencies added/removed
   * - Transformation notes
   * 
   * Requirements: 5.5
   */
  private buildMetadata(
    file: RepositoryFile,
    newFilePath: string,
    spec: MigrationSpecification,
    context: TransformationContext,
    astErrors: string[],
    aiWarnings: string[]
  ): MigrationMetadata {
    // Extract dependencies added/removed
    const originalDeps = this.extractDependencies(file.content)
    const transformedDeps = context.dependencies

    const dependenciesAdded = transformedDeps.filter(
      (dep) => !originalDeps.includes(dep)
    )
    const dependenciesRemoved = originalDeps.filter(
      (dep) => !transformedDeps.includes(dep)
    )

    // Build transformation notes
    const notes: string[] = []
    
    // Add transformation method notes
    if (astErrors.length > 0) {
      notes.push(`AST transformations applied with ${astErrors.length} warnings`)
    } else {
      notes.push('AST transformations applied successfully')
    }
    
    if (aiWarnings.length > 0) {
      notes.push(`AI transformations applied with ${aiWarnings.length} warnings`)
    }
    
    // Add file relocation note
    if (file.path !== newFilePath) {
      notes.push(`File relocated from ${file.path} to ${newFilePath}`)
    }
    
    // Add dependency change notes
    if (dependenciesAdded.length > 0) {
      notes.push(`Added ${dependenciesAdded.length} new dependencies`)
    }
    if (dependenciesRemoved.length > 0) {
      notes.push(`Removed ${dependenciesRemoved.length} old dependencies`)
    }
    
    // Add framework-specific notes
    if (spec.source.framework !== spec.target.framework) {
      notes.push(`Migrated from ${spec.source.framework} to ${spec.target.framework}`)
    }

    // Determine if this is a route file
    const isRouteFile = file.path.includes('/pages/') || file.path.includes('/app/')

    return {
      newFilePath,
      fileType: context.fileType as any,
      language: spec.target.language,
      framework: spec.target.framework,
      dependenciesAdded,
      dependenciesRemoved,
      notes,
      fileStructureChange: file.path !== newFilePath ? {
        action: 'move',
        originalPath: file.path,
        isRouteFile,
        routeSegment: isRouteFile ? this.extractRouteSegment(file.path) : undefined,
      } : undefined,
    }
  }

  /**
   * Extract route segment from file path
   */
  private extractRouteSegment(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/')
    let route = normalized
      .replace(/^src\/pages\//, '')
      .replace(/^pages\//, '')
      .replace(/^src\/app\//, '')
      .replace(/^app\//, '')
    
    route = route.replace(/\.(tsx?|jsx?)$/, '')
    
    if (route === 'index' || route.endsWith('/index')) {
      route = route.replace(/\/?index$/, '')
    }
    
    return route || '(root)'
  }

  /**
   * Get transformation statistics from a batch of results
   * 
   * @param results - Map of transformation results
   * @returns Statistics about the transformations
   */
  getTransformationStatistics(
    results: Map<string, Phase3TransformResult>
  ): {
    totalFiles: number
    successfulTransformations: number
    requiresReview: number
    averageConfidence: number
    totalWarnings: number
    filesWithErrors: number
  } {
    const stats = {
      totalFiles: results.size,
      successfulTransformations: 0,
      requiresReview: 0,
      averageConfidence: 0,
      totalWarnings: 0,
      filesWithErrors: 0,
    }

    let totalConfidence = 0

    for (const result of results.values()) {
      // Count successful transformations (confidence > 70)
      if (result.confidence > 70) {
        stats.successfulTransformations++
      }

      // Count files requiring review
      if (result.requiresReview) {
        stats.requiresReview++
      }

      // Sum confidence scores
      totalConfidence += result.confidence

      // Count warnings
      stats.totalWarnings += result.warnings.length

      // Count files with errors (confidence < 50)
      if (result.confidence < 50) {
        stats.filesWithErrors++
      }
    }

    // Calculate average confidence
    stats.averageConfidence = stats.totalFiles > 0 
      ? Math.round(totalConfidence / stats.totalFiles) 
      : 0

    return stats
  }

  /**
   * Calculate overall confidence score
   * 
   * This combines multiple confidence factors:
   * - Validation confidence score (from semantic checks)
   * - AI transformation confidence
   * - AST transformation success
   * 
   * Requirements: 13.5
   */
  private calculateConfidence(
    validation: {
      valid: boolean
      violations: any[]
      warnings: string[]
      confidenceScore?: number
    },
    aiConfidence: number,
    astErrorCount: number
  ): number {
    // Start with validation confidence score if available
    let confidence = validation.confidenceScore || 50

    // Reduce confidence for validation failures
    if (!validation.valid) {
      confidence -= 20
    }

    // Reduce confidence for high-severity violations
    const errorViolations = validation.violations.filter(
      (v) => v.severity === 'error'
    ).length
    confidence -= errorViolations * 10

    // Reduce confidence for AST errors
    confidence -= astErrorCount * 5

    // Factor in AI confidence (weighted average: 60% validation, 40% AI)
    confidence = confidence * 0.6 + aiConfidence * 0.4

    return Math.max(0, Math.min(100, Math.round(confidence)))
  }

  /**
   * Determine if manual review is required
   */
  private requiresManualReview(
    confidence: number,
    validation: { valid: boolean; violations: any[] },
    aiRequiresReview: boolean
  ): boolean {
    // Low confidence requires review
    if (confidence < 70) {
      return true
    }

    // Validation failures require review
    if (!validation.valid) {
      return true
    }

    // AI flagged for review
    if (aiRequiresReview) {
      return true
    }

    // High severity violations require review
    const hasHighSeverityViolations = validation.violations.some(
      (v) => v.severity === 'error'
    )

    return hasHighSeverityViolations
  }

  /**
   * Check if AI transformation is needed
   */
  private needsAITransformation(
    code: string,
    _spec: MigrationSpecification,
    context: TransformationContext
  ): boolean {
    // AI needed for package.json transformation
    if (context.filePath.endsWith('package.json')) {
      console.log(`[Hybrid Engine] AI needed for package.json`)
      return true
    }
    
    // AI needed for component transformations
    if (context.fileType === 'component' || context.fileType === 'page') {
      return true
    }

    // AI needed for lifecycle method mappings
    if (code.includes('componentDidMount') || 
        code.includes('componentWillUnmount') ||
        code.includes('componentDidUpdate')) {
      return true
    }

    // AI needed for complex refactoring (currently not checking spec)
    // Future enhancement: check spec.rules.mustRefactor

    return false
  }

  /**
   * Determine file type from path
   */
  private determineFileType(filePath: string): string {
    const lowerPath = filePath.toLowerCase()

    if (lowerPath.includes('/pages/') || lowerPath.includes('/routes/')) {
      return 'page'
    } else if (lowerPath.includes('/components/')) {
      return 'component'
    } else if (lowerPath.includes('/layouts/')) {
      return 'layout'
    } else if (lowerPath.includes('/api/')) {
      return 'api'
    } else if (lowerPath.includes('/utils/') || lowerPath.includes('/helpers/')) {
      return 'util'
    } else if (lowerPath.includes('/config')) {
      return 'config'
    } else if (lowerPath.includes('.test.') || lowerPath.includes('.spec.')) {
      return 'test'
    }

    return 'module'
  }

  /**
   * Extract dependencies from code (basic extraction)
   */
  private extractDependencies(code: string): string[] {
    const dependencies: string[] = []
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g

    let match
    while ((match = importRegex.exec(code)) !== null) {
      dependencies.push(match[1])
    }

    while ((match = requireRegex.exec(code)) !== null) {
      dependencies.push(match[1])
    }

    return [...new Set(dependencies)]
  }

  /**
   * Extract imports from code
   */
  private extractImports(code: string): string[] {
    const imports: string[] = []
    const importRegex = /import\s+(.*?)\s+from\s+['"]([^'"]+)['"]/g

    let match
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(`${match[1]} from '${match[2]}'`)
    }

    return imports
  }

  /**
   * Extract exports from code
   */
  private extractExports(code: string): string[] {
    const exports: string[] = []
    const exportRegex = /export\s+(default\s+)?(.*?)(?:\n|;)/g

    let match
    while ((match = exportRegex.exec(code)) !== null) {
      exports.push(match[0].trim())
    }

    return exports
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('')
  }

  /**
   * Convert string to camelCase
   */
  private toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
  }

  /**
   * Convert string to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase()
  }
}
