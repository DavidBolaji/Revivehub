/**
 * DocumentationTransformer - Generates documentation from transformation metadata
 * 
 * Handles automated documentation generation by:
 * - Creating CHANGELOG entries from transformation metadata
 * - Updating README with new framework information
 * - Generating migration guides with step-by-step instructions
 * - Using template system for consistent documentation
 * 
 * Supports all frameworks (category: 'documentation', frameworks: ['*'])
 * 
 * @example
 * ```typescript
 * const transformer = new DocumentationTransformer()
 * const result = await transformer.transform(existingDoc, options, task)
 * ```
 */

import { BaseTransformer } from '../base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
  TransformMetadata,
  MigrationPlan,
} from '@/types/transformer'
import { ClaudeClient } from '@/lib/ai/claude-client'

/**
 * Documentation type for different documentation outputs
 */
export type DocumentationType = 'changelog' | 'readme' | 'migration-guide'

/**
 * Template context for documentation generation
 */
interface DocumentationContext {
  migrationPlan?: MigrationPlan
  transformations: TransformMetadata[]
  timestamp: Date
  version?: string
  framework?: {
    from: string
    to: string
  }
}

/**
 * File tree node for project structure visualization
 */
interface FileTreeNode {
  name: string
  type: 'file' | 'directory'
  children: Map<string, FileTreeNode>
}

/**
 * Project analysis result from repository scanning
 */
interface ProjectAnalysis {
  projectName: string
  description?: string
  framework: string
  language: string
  dependencies: {
    runtime: Record<string, string>
    dev: Record<string, string>
  }
  scripts: Record<string, string>
  structure: {
    directories: string[]
    keyFiles: string[]
    configFiles: string[]
    allFiles: string[]
  }
  features: string[]
  techStack: string[]
  hasTests: boolean
  hasDocumentation: boolean
  hasCI: boolean
  environmentFiles: string[]
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'unknown'
}

/**
 * File tree node for directory structure visualization
 */
interface FileTreeNode {
  name: string
  type: 'file' | 'directory'
  children: Map<string, FileTreeNode>
}

/**
 * Transformer for generating and updating documentation
 */
export class DocumentationTransformer extends BaseTransformer {
  private claudeClient: ClaudeClient | null = null

  constructor() {
    super('DocumentationTransformer', ['documentation'], ['*'])
    
    // Initialize Claude client if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey) {
      this.claudeClient = new ClaudeClient(apiKey)
    }
  }

  /**
   * Transforms documentation by generating or updating based on transformation metadata
   * 
   * Process:
   * 1. Determine documentation type from task or file path
   * 2. Extract transformation metadata from task
   * 3. Apply appropriate template
   * 4. Generate or update documentation
   * 5. Preserve existing content where appropriate
   * 
   * @param code - Existing documentation content (or empty string for new docs)
   * @param options - Transformation options
   * @param task - Task containing pattern information and metadata
   * @returns Transformation result with generated/updated documentation
   */
  async transform(
    code: string,
    options: TransformOptions,
    task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata([], 90)

    try {
      // Determine documentation type from task or default to changelog
      const docType = this.determineDocumentationType(task)
      
      // Extract context from task
      const context = this.extractContext(task)

      // Generate documentation based on type
      let transformed: string
      let filesModified: string[] = []

      switch (docType) {
        case 'changelog':
          transformed = this.generateChangelog(code, context)
          filesModified = ['CHANGELOG.md']
          break
        case 'readme':
          // Check if we have repository files available for comprehensive README generation
          console.log('[DocumentationTransformer] README generation started')
          console.log('[DocumentationTransformer] Existing README length:', code?.length || 0)
          console.log('[DocumentationTransformer] Repository files available:', options.repositoryFiles?.length || 0)
          
          if (options.repositoryFiles && options.repositoryFiles.length > 0) {
            console.log('[DocumentationTransformer] Using repository files for comprehensive README generation')
            console.log('[DocumentationTransformer] Sample files:', options.repositoryFiles.slice(0, 5).map(f => f.path))
            transformed = await this.generateReadmeFromRepository(options.repositoryFiles, code || undefined)
          } else {
            console.log('[DocumentationTransformer] Using context-based README generation')
            console.log('[DocumentationTransformer] Context:', JSON.stringify(context, null, 2))
            transformed = await this.updateReadme(code, context)
          }
          console.log('[DocumentationTransformer] Generated README length:', transformed.length)
          filesModified = ['README.md']
          break
        case 'migration-guide':
          transformed = this.generateMigrationGuide(context)
          filesModified = ['MIGRATION.md']
          break
        default:
          transformed = this.generateChangelog(code, context)
          filesModified = ['CHANGELOG.md']
      }

      // Generate diff
      const diff = this.generateDiff(code, transformed)

      // Build final metadata
      const finalMetadata = {
        ...metadata,
        filesModified,
        linesAdded: diff.visual.filter((l) => l.type === 'added').length,
        linesRemoved: diff.visual.filter((l) => l.type === 'removed').length,
        confidenceScore: 90,
        riskScore: 10, // Documentation changes are low risk
        requiresManualReview: false,
        estimatedTimeSaved: '15 minutes',
        transformationsApplied: [`Generated ${docType}`],
      }

      return {
        success: true,
        code: transformed,
        diff,
        metadata: finalMetadata,
        errors: [],
        warnings: [],
      }
    } catch (error: any) {
      return {
        success: false,
        metadata,
        errors: [
          {
            message: error.message || 'Documentation generation failed',
            code: 'DOC_GENERATION_ERROR',
            location: undefined,
            suggestions: [
              'Check transformation metadata is valid',
              'Ensure template context is complete',
              'Verify documentation type is supported',
            ],
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * Determines the type of documentation to generate
   * 
   * @param task - Task with pattern information
   * @returns Documentation type
   */
  private determineDocumentationType(task?: Task): DocumentationType {
    if (!task) {
      return 'changelog'
    }

    const name = task.name.toLowerCase()
    const description = task.description.toLowerCase()

    if (name.includes('changelog') || description.includes('changelog')) {
      return 'changelog'
    }

    if (name.includes('readme') || description.includes('readme')) {
      return 'readme'
    }

    if (
      name.includes('migration') ||
      name.includes('guide') ||
      description.includes('migration guide')
    ) {
      return 'migration-guide'
    }

    // Check affected files
    if (task?.affectedFiles && task?.affectedFiles.some((f) => f.toLowerCase().includes('changelog'))) {
      return 'changelog'
    }

    if (task?.affectedFiles && task?.affectedFiles.some((f) => f.toLowerCase().includes('readme'))) {
      return 'readme'
    }

    if (
      task?.affectedFiles &&
      task?.affectedFiles.some(
        (f) => f.toLowerCase().includes('migration') || f.toLowerCase().includes('guide')
      )
    ) {
      return 'migration-guide'
    }

    return 'changelog'
  }

  /**
   * Extracts context from task for documentation generation
   * 
   * @param task - Task with metadata
   * @returns Documentation context
   */
  private extractContext(task?: Task): DocumentationContext {
    const context: DocumentationContext = {
      transformations: [],
      timestamp: new Date(),
    }

    if (!task) {
      return context
    }

    // Extract transformation metadata from task description
    // In a real implementation, this would come from the orchestrator
    // For now, we create a basic metadata entry
    const transformationMetadata: TransformMetadata = {
      transformationType: task.pattern.name,
      filesModified: task.affectedFiles || [],
      linesAdded: 0,
      linesRemoved: 0,
      confidenceScore: 85,
      riskScore: task.riskLevel === 'high' ? 70 : task.riskLevel === 'medium' ? 40 : 20,
      requiresManualReview: task.type === 'manual',
      estimatedTimeSaved: `${task.estimatedMinutes} minutes`,
      transformationsApplied: [task.name],
      timestamp: new Date(),
    }

    context.transformations.push(transformationMetadata)

    return context
  }

  /**
   * Generates CHANGELOG entry following Keep a Changelog standards
   * 
   * Creates a proper CHANGELOG entry with:
   * - Standard Keep a Changelog format
   * - Proper categorization (Added, Changed, Fixed, etc.)
   * - Clear, user-focused descriptions
   * - Version and date information
   * 
   * @param existingChangelog - Existing CHANGELOG content
   * @param context - Documentation context with transformation metadata
   * @returns Updated CHANGELOG content
   */
  private generateChangelog(
    existingChangelog: string,
    context: DocumentationContext
  ): string {
    const { transformations, timestamp, version } = context

    // Build new entry following Keep a Changelog format
    const versionString = version || 'Unreleased'
    const dateString = timestamp.toISOString().split('T')[0]

    let entry = `## [${versionString}] - ${dateString}\n\n`

    // Group transformations by Keep a Changelog categories
    const changes: Record<string, string[]> = {
      Added: [],
      Changed: [],
      Deprecated: [],
      Removed: [],
      Fixed: [],
      Security: [],
    }

    transformations.forEach((t) => {
      const changeType = this.categorizeTransformationForChangelog(t)
      const description = this.formatTransformationForChangelog(t)
      changes[changeType].push(description)
    })

    // Add sections with changes (only include sections that have content)
    Object.entries(changes).forEach(([type, items]) => {
      if (items.length > 0) {
        entry += `### ${type}\n\n`
        items.forEach((item) => {
          entry += `- ${item}\n`
        })
        entry += '\n'
      }
    })

    // Create or update changelog following standard format
    if (existingChangelog.trim()) {
      // Find the first ## heading (first version entry)
      const firstVersionIndex = existingChangelog.indexOf('\n## ')

      if (firstVersionIndex !== -1) {
        // Insert after title, before first version
        const beforeVersions = existingChangelog.substring(0, firstVersionIndex + 1)
        const versions = existingChangelog.substring(firstVersionIndex + 1)
        return `${beforeVersions}${entry}${versions}`
      } else {
        // No existing versions, append to end
        return `${existingChangelog}\n\n${entry}`
      }
    } else {
      // Create new changelog with proper header
      return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${entry}`
    }
  }

  /**
   * Updates README with new framework information
   * 
   * Updates README sections with:
   * - New framework version
   * - Updated dependencies
   * - Migration notes
   * - Updated badges
   * 
   * @param existingReadme - Existing README content
   * @param context - Documentation context
   * @returns Updated README content
   */
  private async updateReadme(existingReadme: string, context: DocumentationContext): Promise<string> {
    const { framework, transformations } = context

    let updated = existingReadme

    // Check if we should force a full regeneration
    const shouldRegenerateReadme = this.shouldRegenerateReadme(existingReadme, context)

    // If no existing README or should regenerate, create a comprehensive one
    if (!updated.trim() || shouldRegenerateReadme) {
      updated = await this.createComprehensiveReadme(context)
      return updated
    }

    // Update framework information if available
    if (framework) {
      // Update framework mentions
      const frameworkPattern = new RegExp(
        `${this.escapeRegex(framework.from)}\\s+v?[\\d.]+`,
        'gi'
      )
      updated = updated.replace(frameworkPattern, `${framework.to}`)

      // Add migration notice if not present
      if (!updated.includes('## Migration')) {
        const migrationSection = this.generateMigrationSection(framework, transformations)
        // Insert before ## License or at the end
        const licenseIndex = updated.indexOf('## License')
        if (licenseIndex !== -1) {
          updated =
            updated.substring(0, licenseIndex) +
            migrationSection +
            '\n\n' +
            updated.substring(licenseIndex)
        } else {
          updated += '\n\n' + migrationSection
        }
      }
    }

    // Update or add "Recent Changes" section
    const recentChangesSection = this.generateRecentChangesSection(transformations)
    const recentChangesIndex = updated.indexOf('## Recent Changes')

    if (recentChangesIndex !== -1) {
      // Replace existing section
      const nextSectionIndex = updated.indexOf('\n## ', recentChangesIndex + 1)
      if (nextSectionIndex !== -1) {
        updated =
          updated.substring(0, recentChangesIndex) +
          recentChangesSection +
          '\n' +
          updated.substring(nextSectionIndex)
      } else {
        updated = updated.substring(0, recentChangesIndex) + recentChangesSection
      }
    } else {
      // Add new section after title
      const firstSectionIndex = updated.indexOf('\n## ')
      if (firstSectionIndex !== -1) {
        updated =
          updated.substring(0, firstSectionIndex + 1) +
          '\n' +
          recentChangesSection +
          '\n' +
          updated.substring(firstSectionIndex + 1)
      } else {
        updated += '\n\n' + recentChangesSection
      }
    }

    return updated
  }

  /**
   * Determines if README should be fully regenerated
   * 
   * @param existingReadme - Current README content
   * @param context - Documentation context
   * @returns True if README should be regenerated
   */
  private shouldRegenerateReadme(existingReadme: string, context: DocumentationContext): boolean {
    // Force regeneration if task explicitly requests it
    const task = context.transformations[0]
    if (task && (
      task.transformationType.toLowerCase().includes('generate readme') ||
      task.transformationType.toLowerCase().includes('update readme') ||
      task.transformationType.toLowerCase().includes('ai readme')
    )) {
      return true
    }

    // Check if README is minimal (only has recent changes section)
    const hasOnlyRecentChanges = existingReadme.includes('## Recent Changes') &&
      !existingReadme.includes('## Features') &&
      !existingReadme.includes('## Technology Stack') &&
      !existingReadme.includes('## Installation')

    if (hasOnlyRecentChanges) {
      return true
    }

    // Check if README is outdated (missing key sections)
    const hasBasicSections = existingReadme.includes('## Overview') ||
      existingReadme.includes('## Description') ||
      existingReadme.includes('## Features')

    if (!hasBasicSections && existingReadme.length < 500) {
      return true
    }

    return false
  }

  /**
   * Generates a migration guide following standard structure
   * Only generated when there are breaking changes that require user action
   * 
   * @param context - Documentation context
   * @returns Migration guide content
   */
  private generateMigrationGuide(context: DocumentationContext): string {
    const { framework, transformations, timestamp } = context

    // Determine version info
    const fromVersion = framework?.from || 'Previous Version'
    const toVersion = framework?.to || 'Current Version'

    let guide = `# Migrating from ${fromVersion} to ${toVersion}\n\n`

    // 1. Summary of Breaking Changes
    guide += '## 1. Summary of Breaking Changes\n\n'
    const breakingChanges = transformations.filter(t => t.requiresManualReview || t.riskScore > 50)
    if (breakingChanges.length > 0) {
      breakingChanges.forEach(change => {
        guide += `- ${change.transformationType}\n`
      })
    } else {
      guide += '- Structural changes that may affect imports or configuration\n'
      guide += '- Updated dependencies with potential API changes\n'
    }
    guide += '\n'

    // 2. API Changes
    guide += '## 2. API Changes\n\n'
    guide += '### Removed\n'
    guide += '- Legacy API endpoints or methods that are no longer supported\n\n'
    guide += '### Renamed\n'
    guide += '- Functions, components, or modules with new names\n\n'
    guide += '### Updated Signatures\n'
    guide += '- Methods with changed parameters or return types\n\n'

    // 3. Configuration Changes
    guide += '## 3. Configuration Changes\n\n'
    guide += '- Environment variables that need updating\n'
    guide += '- Configuration files with new structure\n'
    guide += '- Build settings or scripts that require modification\n\n'

    // 4. Database / Schema Migrations
    guide += '## 4. Database / Schema Migrations\n\n'
    guide += '- No database changes required for this migration\n'
    guide += '- If your project uses a database, verify compatibility\n\n'

    // 5. Deprecations
    guide += '## 5. Deprecations\n\n'
    guide += '- Features that still work but will be removed in future versions\n'
    guide += '- Plan to update these before the next major release\n\n'

    // 6. Manual Steps
    guide += '## 6. Manual Steps\n\n'
    guide += '1. **Backup your project** before starting\n'
    guide += '2. **Update dependencies**: `npm install` or `yarn install`\n'
    guide += '3. **Clear build cache**: Remove `node_modules/.cache` and `.next` folders\n'
    guide += '4. **Update imports** if file paths have changed\n'
    guide += '5. **Test thoroughly** in development environment\n'
    guide += '6. **Update CI/CD scripts** if build process changed\n\n'

    // 7. Validation Checklist
    guide += '## 7. Validation Checklist\n\n'
    guide += '- [ ] Project builds without errors\n'
    guide += '- [ ] All tests pass\n'
    guide += '- [ ] Application starts correctly\n'
    guide += '- [ ] Key features work as expected\n'
    guide += '- [ ] No console errors in browser\n'
    guide += '- [ ] Performance is acceptable\n'
    guide += '- [ ] Dependencies are up to date\n\n'

    // 8. Troubleshooting
    guide += '## 8. Troubleshooting\n\n'
    guide += '### Build Errors\n'
    guide += '- **Module not found**: Check import paths and dependency installation\n'
    guide += '- **Type errors**: Update TypeScript types and interfaces\n'
    guide += '- **Syntax errors**: Review breaking changes in language features\n\n'
    guide += '### Runtime Errors\n'
    guide += '- **API errors**: Verify endpoint URLs and request formats\n'
    guide += '- **Component errors**: Check prop types and component usage\n'
    guide += '- **Style issues**: Update CSS classes and styling approaches\n\n'

    // 9. Additional Notes
    guide += '## 9. Additional Notes\n\n'
    guide += `- **Migration Date**: ${timestamp.toISOString().split('T')[0]}\n`
    guide += '- **Rollback Plan**: Keep a backup to revert if issues arise\n'
    guide += '- **Support**: Consult framework documentation for detailed changes\n'
    guide += '- **Team Communication**: Ensure all team members are aware of changes\n\n'

    guide += '---\n\n'
    guide += '*This migration guide was automatically generated. Review and customize as needed for your specific use case.*\n'

    return guide
  }

  /**
   * Categorizes transformation for Keep a Changelog format
   * 
   * @param transformation - Transformation metadata
   * @returns Changelog category following Keep a Changelog standards
   */
  private categorizeTransformationForChangelog(transformation: TransformMetadata): string {
    const type = transformation.transformationType.toLowerCase()
    const description = transformation.transformationsApplied.join(' ').toLowerCase()

    // Added - for new features
    if (type.includes('add') || type.includes('new') || type.includes('create') || 
        description.includes('add') || description.includes('new')) {
      return 'Added'
    }

    // Removed - for removed features
    if (type.includes('remove') || type.includes('delete') || type.includes('drop') ||
        description.includes('remove') || description.includes('delete')) {
      return 'Removed'
    }

    // Deprecated - for soon-to-be removed features
    if (type.includes('deprecat') || description.includes('deprecat')) {
      return 'Deprecated'
    }

    // Fixed - for bug fixes
    if (type.includes('fix') || type.includes('bug') || type.includes('repair') ||
        description.includes('fix') || description.includes('bug')) {
      return 'Fixed'
    }

    // Security - for security improvements
    if (type.includes('security') || type.includes('vulnerab') || type.includes('auth') ||
        description.includes('security') || description.includes('vulnerab')) {
      return 'Security'
    }

    // Changed - for changes in existing functionality (default)
    return 'Changed'
  }

  /**
   * Formats transformation for changelog entry with user-focused descriptions
   * 
   * @param transformation - Transformation metadata
   * @returns User-friendly changelog line
   */
  private formatTransformationForChangelog(transformation: TransformMetadata): string {
    const { transformationType, transformationsApplied } = transformation

    // Create user-friendly descriptions
    const type = transformationType.toLowerCase()
    
    if (type.includes('readme')) {
      return 'Updated project documentation with comprehensive setup and usage instructions'
    }
    
    if (type.includes('changelog')) {
      return 'Added changelog to track project changes and releases'
    }
    
    if (type.includes('migration')) {
      return 'Created migration guide for upgrading between versions'
    }
    
    if (type.includes('dependency')) {
      return 'Updated project dependencies to latest compatible versions'
    }
    
    if (type.includes('component')) {
      return 'Modernized React components with latest patterns and best practices'
    }
    
    if (type.includes('typescript')) {
      return 'Enhanced TypeScript support with improved type definitions'
    }
    
    if (type.includes('test')) {
      return 'Updated test suite for better coverage and reliability'
    }

    // Fallback to transformation applied or type
    if (transformationsApplied.length > 0) {
      return transformationsApplied.join(', ')
    }

    return transformationType
  }

  /**
   * Creates a comprehensive README using AI or falls back to template
   * 
   * @param context - Documentation context
   * @returns Comprehensive README content
   */
  private async createComprehensiveReadme(context: DocumentationContext): Promise<string> {
    // Try AI-powered generation first
    if (this.claudeClient) {
      try {
        return await this.generateAIReadme(context)
      } catch (error) {
        console.warn('[DocumentationTransformer] AI generation failed, falling back to template:', error)
      }
    }

    // Fallback to template-based generation
    return this.createTemplateReadme(context)
  }

  /**
   * Scans repository and generates README based on project analysis
   * 
   * @param repositoryFiles - Repository files from GitHub
   * @param existingReadme - Existing README content if any
   * @returns Generated README content
   */
  async generateReadmeFromRepository(
    repositoryFiles: Array<{ path: string; content: string }>,
    existingReadme?: string
  ): Promise<string> {
    try {
      // Analyze project structure
      const projectAnalysis = this.analyzeProjectStructure(repositoryFiles)
      
      // Try AI-powered generation first
      if (this.claudeClient) {
        try {
          return await this.generateAIReadmeFromAnalysis(projectAnalysis, existingReadme)
        } catch (error) {
          console.warn('[DocumentationTransformer] AI generation failed, falling back to template:', error)
        }
      }

      // Fallback to template-based generation
      return this.createTemplateReadmeFromAnalysis(projectAnalysis, existingReadme)
    } catch (error) {
      console.error('[DocumentationTransformer] Failed to generate README from repository:', error)
      throw error
    }
  }

  /**
   * Generates README using AI based on project analysis
   */
  private async generateAIReadme(context: DocumentationContext): Promise<string> {
    const task = context.transformations[0]
    const projectName = this.extractProjectName(task?.filesModified || [])
    
    console.log('[DocumentationTransformer] Generating AI-powered README...')
    
    // Check if we have a valid API key
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }
    
    const prompt = `Generate a comprehensive, professional README.md for a Next.js project called "${projectName}".

Project Analysis:
- Framework: Next.js 14 with TypeScript
- UI Library: Ant Design
- State Management: React Query (TanStack Query)
- Styling: Tailwind CSS
- Form Handling: Formik with Yup validation
- Animations: Framer Motion
- Icons: React Icons

Key Dependencies:
- @tanstack/react-query for data fetching
- antd for UI components
- formik + yup for forms
- framer-motion for animations
- tailwind-merge for styling
- react-phone-number-input for phone inputs
- react-flags-select for country selection

Please create a README that includes:
1. Project title and brief description
2. Key features (infer from dependencies)
3. Technology stack
4. Installation instructions
5. Getting started guide
6. Project structure
7. Available scripts
8. Environment variables setup
9. Deployment instructions
10. Contributing guidelines

Make it professional, well-structured with emojis, and tailored to this specific tech stack. Focus on what makes this project unique based on the dependencies.`

    const systemPrompt = `You are a technical documentation expert. Create clear, comprehensive, and professional README files that help developers understand and contribute to projects. Use proper markdown formatting, include relevant badges, and make the documentation accessible to developers of all levels.`

    const aiContent = await this.claudeClient!.makeRequest(prompt, systemPrompt, 3000)
    
    // Add recent changes section
    const recentChangesSection = this.generateRecentChangesSection(context.transformations)
    
    return aiContent + '\n\n' + recentChangesSection
  }

  /**
   * Generates README using AI based on repository analysis
   */
  private async generateAIReadmeFromAnalysis(
    analysis: ProjectAnalysis,
    existingReadme?: string
  ): Promise<string> {
    console.log('[DocumentationTransformer] Generating AI-powered README from repository analysis...')
    
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    const prompt = `Generate a comprehensive, professional README.md for the "${analysis.projectName}" project.

PROJECT ANALYSIS:
${this.formatAnalysisForPrompt(analysis)}

EXISTING README:
${existingReadme ? `The project has an existing README:\n\`\`\`\n${existingReadme.substring(0, 2000)}${existingReadme.length > 2000 ? '...' : ''}\n\`\`\`` : 'No existing README found.'}

REQUIREMENTS:
1. Create a comprehensive README that accurately reflects the project structure and technologies
2. Include project title, description, and key features based on the actual codebase
3. List the technology stack based on detected dependencies and frameworks
4. Provide installation and setup instructions
5. Include project structure section showing key directories
6. Add available scripts from package.json
7. Include environment variables section if .env files are detected
8. Add deployment instructions appropriate for the framework
9. Include contributing guidelines
10. Use proper markdown formatting with emojis for visual appeal
11. Make it professional and accessible to developers of all levels

${existingReadme ? 'IMPORTANT: If there is existing content that is still relevant, preserve and enhance it rather than completely replacing it.' : ''}

Focus on accuracy - only include information that can be verified from the project analysis.`

    const systemPrompt = `You are a technical documentation expert specializing in creating accurate, comprehensive README files. You analyze project structures and generate documentation that helps developers understand, set up, and contribute to projects. Always base your documentation on actual project analysis rather than assumptions.`

    return await this.claudeClient!.makeRequest(prompt, systemPrompt, 4000)
  }

  /**
   * Creates a template-based README as fallback
   */
  private createTemplateReadme(context: DocumentationContext): string {
    const task = context.transformations[0]
    const projectName = this.extractProjectName(task?.filesModified || [])
    
    let readme = `# ${projectName}\n\n`
    
    // Add project description
    readme += '## 📋 Description\n\n'
    readme += this.generateProjectDescription(task?.filesModified || [])
    readme += '\n\n'
    
    // Add technology stack
    readme += '## 🚀 Technology Stack\n\n'
    readme += this.generateTechStack()
    readme += '\n\n'
    
    // Add features section
    readme += '## ✨ Features\n\n'
    readme += this.generateFeaturesList()
    readme += '\n\n'
    
    // Add getting started
    readme += '## 🛠️ Getting Started\n\n'
    readme += this.generateGettingStarted()
    readme += '\n\n'
    
    // Add project structure
    readme += '## 📁 Project Structure\n\n'
    readme += this.generateProjectStructure()
    readme += '\n\n'
    
    // Add scripts section
    readme += '## 📜 Available Scripts\n\n'
    readme += this.generateScriptsSection()
    readme += '\n\n'
    
    // Add environment variables
    readme += '## 🔧 Environment Variables\n\n'
    readme += this.generateEnvironmentSection()
    readme += '\n\n'
    
    // Add deployment section
    readme += '## 🚀 Deployment\n\n'
    readme += this.generateDeploymentSection()
    readme += '\n\n'
    
    // Add contributing section
    readme += '## 🤝 Contributing\n\n'
    readme += this.generateContributingSection()
    readme += '\n\n'
    
    // Add license section
    readme += '## 📄 License\n\n'
    readme += 'This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.\n\n'
    
    // Add recent changes
    readme += this.generateRecentChangesSection(context.transformations)

    return readme
  }

  private extractProjectName(_files: string[]): string {
    // Try to extract from package.json or use directory name
    return 'My Next.js Project'
  }

  private generateProjectDescription(_files: string[]): string {
    return 'A modern web application built with Next.js, featuring a responsive design and optimized performance. This project demonstrates best practices in React development with TypeScript support.'
  }

  private generateTechStack(): string {
    return `- **Framework:** Next.js 14
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Ant Design
- **State Management:** React Query (TanStack Query)
- **Form Handling:** Formik with Yup validation
- **Animations:** Framer Motion
- **Icons:** React Icons
- **Development:** ESLint, TypeScript`
  }

  private generateFeaturesList(): string {
    return `- 🎨 Modern and responsive UI design
- ⚡ Fast and optimized performance
- 🔒 Type-safe development with TypeScript
- 📱 Mobile-first responsive design
- 🎭 Smooth animations and transitions
- 🔍 SEO optimized
- 🛠️ Developer-friendly with hot reload
- 📊 Built-in analytics and monitoring`
  }

  private generateGettingStarted(): string {
    return `### Prerequisites

- Node.js 18+ 
- npm or yarn or pnpm

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd <project-name>
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.`
  }

  private generateProjectStructure(): string {
    return `\`\`\`
├── app/                    # Next.js 13+ App Router
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── public/                # Static assets
├── types/                 # TypeScript type definitions
├── .env.example           # Environment variables template
├── next.config.js         # Next.js configuration
├── package.json           # Dependencies and scripts
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
\`\`\``
  }

  private generateScriptsSection(): string {
    return `\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
\`\`\``
  }

  private generateEnvironmentSection(): string {
    return `Create a \`.env.local\` file in the root directory:

\`\`\`env
# Add your environment variables here
NEXT_PUBLIC_API_URL=your_api_url
DATABASE_URL=your_database_url
NEXTAUTH_SECRET=your_nextauth_secret
\`\`\`

> **Note:** Never commit \`.env.local\` to version control.`
  }

  private generateDeploymentSection(): string {
    return `### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

1. Push your code to GitHub
2. Import your repository on Vercel
3. Configure environment variables
4. Deploy!

### Deploy on Other Platforms

- **Netlify:** Use the \`npm run build\` command
- **Railway:** Connect your GitHub repository
- **Docker:** Use the included Dockerfile`
  }

  private generateContributingSection(): string {
    return `1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add some amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

Please make sure to update tests as appropriate and follow the existing code style.`
  }

  /**
   * Generates migration section for README
   * 
   * @param framework - Framework migration info
   * @param transformations - Transformation metadata
   * @returns Migration section content
   */
  private generateMigrationSection(
    framework: { from: string; to: string },
    transformations: TransformMetadata[]
  ): string {
    let section = '## Migration\n\n'
    section += `This project has been migrated from ${framework.from} to ${framework.to}.\n\n`

    if (transformations.length > 0) {
      section += '**Automated Changes:**\n\n'
      transformations.forEach((t) => {
        section += `- ${t.transformationType}\n`
      })
      section += '\n'
    }

    section += 'See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.\n'

    return section
  }

  /**
   * Generates recent changes section for README
   * 
   * @param transformations - Transformation metadata
   * @returns Recent changes section content
   */
  private generateRecentChangesSection(transformations: TransformMetadata[]): string {
    let section = '## Recent Changes\n\n'

    if (transformations.length === 0) {
      section += 'No recent automated changes.\n'
      return section
    }

    transformations.forEach((t) => {
      section += `- **${t.transformationType}**: ${t.filesModified.length} files modified\n`
    })

    section += '\nSee [CHANGELOG.md](./CHANGELOG.md) for complete history.\n'

    return section
  }

  /**
   * Escapes special regex characters
   * 
   * @param str - String to escape
   * @returns Escaped string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Analyzes project structure from repository files
   */
  private analyzeProjectStructure(repositoryFiles: Array<{ path: string; content: string }>): ProjectAnalysis {
    const analysis: ProjectAnalysis = {
      projectName: 'Project',
      framework: 'Unknown',
      language: 'JavaScript',
      dependencies: { runtime: {}, dev: {} },
      scripts: {},
      structure: { directories: [], keyFiles: [], configFiles: [], allFiles: [] },
      features: [],
      techStack: [],
      hasTests: false,
      hasDocumentation: false,
      hasCI: false,
      environmentFiles: [],
      packageManager: 'unknown'
    }

    // Track all files first
    for (const file of repositoryFiles) {
      analysis.structure.allFiles.push(file.path)
    }

    // Analyze each file
    for (const file of repositoryFiles) {
      this.analyzeFile(file, analysis)
    }

    // Post-process analysis
    this.inferProjectDetails(analysis)
    
    return analysis
  }

  /**
   * Analyzes individual file and updates project analysis
   */
  private analyzeFile(file: { path: string; content: string }, analysis: ProjectAnalysis): void {
    const { path, content } = file
    const fileName = path.split('/').pop() || ''
    
    // Track all directory levels, not just the first level
    const pathParts = path.split('/')
    if (pathParts.length > 1) {
      // Add all directory paths (e.g., for "src/components/ui/Button.tsx" add "src", "src/components", "src/components/ui")
      for (let i = 1; i < pathParts.length; i++) {
        const dirPath = pathParts.slice(0, i).join('/')
        if (dirPath && !analysis.structure.directories.includes(dirPath)) {
          analysis.structure.directories.push(dirPath)
        }
      }
    }

    // Analyze package.json
    if (fileName === 'package.json') {
      this.analyzePackageJson(content, analysis)
      analysis.structure.keyFiles.push(path)
    }

    // Analyze configuration files
    if (this.isConfigFile(fileName)) {
      analysis.structure.configFiles.push(path)
      this.analyzeConfigFile(fileName, content, analysis)
    }

    // Check for environment files
    if (fileName.startsWith('.env')) {
      analysis.environmentFiles.push(path)
    }

    // Check for tests
    if (this.isTestFile(path)) {
      analysis.hasTests = true
    }

    // Check for documentation
    if (this.isDocumentationFile(fileName)) {
      analysis.hasDocumentation = true
    }

    // Check for CI/CD
    if (this.isCIFile(path)) {
      analysis.hasCI = true
    }

    // Analyze source code files
    if (this.isSourceFile(path)) {
      this.analyzeSourceFile(path, content, analysis)
    }
  }

  /**
   * Analyzes package.json content
   */
  private analyzePackageJson(content: string, analysis: ProjectAnalysis): void {
    try {
      const pkg = JSON.parse(content)
      
      analysis.projectName = pkg.name || 'Project'
      analysis.description = pkg.description
      analysis.scripts = pkg.scripts || {}
      analysis.dependencies.runtime = pkg.dependencies || {}
      analysis.dependencies.dev = pkg.devDependencies || {}

      // Detect package manager
      if (pkg.packageManager) {
        if (pkg.packageManager.includes('pnpm')) analysis.packageManager = 'pnpm'
        else if (pkg.packageManager.includes('yarn')) analysis.packageManager = 'yarn'
        else analysis.packageManager = 'npm'
      }

      // Detect framework from dependencies
      this.detectFrameworkFromDependencies(analysis)
    } catch (error) {
      console.warn('Failed to parse package.json:', error)
    }
  }

  /**
   * Detects framework and tech stack from dependencies
   */
  private detectFrameworkFromDependencies(analysis: ProjectAnalysis): void {
    const deps = { ...analysis.dependencies.runtime, ...analysis.dependencies.dev }
    
    // Framework detection
    if (deps['next']) {
      analysis.framework = 'Next.js'
      analysis.techStack.push('Next.js', 'React')
    } else if (deps['react']) {
      analysis.framework = 'React'
      analysis.techStack.push('React')
    } else if (deps['vue']) {
      analysis.framework = 'Vue.js'
      analysis.techStack.push('Vue.js')
    } else if (deps['@angular/core']) {
      analysis.framework = 'Angular'
      analysis.techStack.push('Angular')
    } else if (deps['express']) {
      analysis.framework = 'Express.js'
      analysis.techStack.push('Express.js', 'Node.js')
    }

    // Language detection
    if (deps['typescript'] || deps['@types/node']) {
      analysis.language = 'TypeScript'
      analysis.techStack.push('TypeScript')
    }

    // UI Libraries
    if (deps['antd']) analysis.techStack.push('Ant Design')
    if (deps['@mui/material']) analysis.techStack.push('Material-UI')
    if (deps['@chakra-ui/react']) analysis.techStack.push('Chakra UI')

    // Styling
    if (deps['tailwindcss']) analysis.techStack.push('Tailwind CSS')
    if (deps['styled-components']) analysis.techStack.push('Styled Components')
    if (deps['emotion']) analysis.techStack.push('Emotion')

    // State Management
    if (deps['@tanstack/react-query']) analysis.techStack.push('TanStack Query')
    if (deps['redux']) analysis.techStack.push('Redux')
    if (deps['zustand']) analysis.techStack.push('Zustand')
    if (deps['mobx']) analysis.techStack.push('MobX')

    // Testing
    if (deps['jest']) analysis.techStack.push('Jest')
    if (deps['vitest']) analysis.techStack.push('Vitest')
    if (deps['@testing-library/react']) analysis.techStack.push('React Testing Library')

    // Build Tools
    if (deps['vite']) analysis.techStack.push('Vite')
    if (deps['webpack']) analysis.techStack.push('Webpack')
    if (deps['rollup']) analysis.techStack.push('Rollup')

    // Database
    if (deps['prisma']) analysis.techStack.push('Prisma')
    if (deps['mongoose']) analysis.techStack.push('MongoDB', 'Mongoose')
    if (deps['pg']) analysis.techStack.push('PostgreSQL')
  }

  /**
   * Analyzes configuration files
   */
  private analyzeConfigFile(fileName: string, _content: string, analysis: ProjectAnalysis): void {
    // TypeScript config
    if (fileName === 'tsconfig.json') {
      analysis.language = 'TypeScript'
      if (!analysis.techStack.includes('TypeScript')) {
        analysis.techStack.push('TypeScript')
      }
    }

    // Tailwind config
    if (fileName.includes('tailwind')) {
      if (!analysis.techStack.includes('Tailwind CSS')) {
        analysis.techStack.push('Tailwind CSS')
      }
    }

    // Next.js config
    if (fileName.includes('next.config')) {
      analysis.framework = 'Next.js'
      if (!analysis.techStack.includes('Next.js')) {
        analysis.techStack.push('Next.js', 'React')
      }
    }
  }

  /**
   * Analyzes source code files for features
   */
  private analyzeSourceFile(_path: string, content: string, analysis: ProjectAnalysis): void {
    // Check for common patterns
    if (content.includes('useState') || content.includes('useEffect')) {
      if (!analysis.features.includes('React Hooks')) {
        analysis.features.push('React Hooks')
      }
    }

    if (content.includes('async/await') || content.includes('Promise')) {
      if (!analysis.features.includes('Async/Await')) {
        analysis.features.push('Async/Await')
      }
    }

    if (content.includes('API') || content.includes('fetch') || content.includes('axios')) {
      if (!analysis.features.includes('API Integration')) {
        analysis.features.push('API Integration')
      }
    }

    if (content.includes('auth') || content.includes('login') || content.includes('jwt')) {
      if (!analysis.features.includes('Authentication')) {
        analysis.features.push('Authentication')
      }
    }

    if (content.includes('form') || content.includes('input') || content.includes('validation')) {
      if (!analysis.features.includes('Form Handling')) {
        analysis.features.push('Form Handling')
      }
    }
  }

  /**
   * File type detection helpers
   */
  private isConfigFile(fileName: string): boolean {
    const configFiles = [
      'package.json', 'tsconfig.json', 'next.config.js', 'next.config.ts',
      'tailwind.config.js', 'tailwind.config.ts', 'vite.config.js', 'vite.config.ts',
      'webpack.config.js', 'rollup.config.js', '.eslintrc.json', '.prettierrc',
      'jest.config.js', 'vitest.config.ts'
    ]
    return configFiles.includes(fileName) || fileName.endsWith('.config.js') || fileName.endsWith('.config.ts')
  }

  private isTestFile(path: string): boolean {
    return path.includes('test') || path.includes('spec') || path.includes('__tests__')
  }

  private isDocumentationFile(fileName: string): boolean {
    const docFiles = ['README.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'LICENSE', 'docs']
    return docFiles.some(doc => fileName.toLowerCase().includes(doc.toLowerCase()))
  }

  private isCIFile(path: string): boolean {
    return path.includes('.github/workflows') || path.includes('.gitlab-ci') || path.includes('Dockerfile')
  }

  private isSourceFile(path: string): boolean {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.py', '.java', '.go', '.rs']
    return extensions.some(ext => path.endsWith(ext)) && !path.includes('node_modules')
  }

  /**
   * Infers additional project details from analysis
   */
  private inferProjectDetails(analysis: ProjectAnalysis): void {
    // Infer features from tech stack
    if (analysis.techStack.includes('Next.js')) {
      analysis.features.push('Server-Side Rendering', 'Static Site Generation')
    }

    if (analysis.techStack.includes('TanStack Query')) {
      analysis.features.push('Data Fetching', 'Caching')
    }

    if (analysis.techStack.includes('Tailwind CSS')) {
      analysis.features.push('Responsive Design', 'Utility-First CSS')
    }

    // Remove duplicates
    analysis.features = [...new Set(analysis.features)]
    analysis.techStack = [...new Set(analysis.techStack)]
  }

  /**
   * Formats analysis for AI prompt
   */
  private formatAnalysisForPrompt(analysis: ProjectAnalysis): string {
    return `
Project Name: ${analysis.projectName}
Description: ${analysis.description || 'No description provided'}
Framework: ${analysis.framework}
Language: ${analysis.language}
Package Manager: ${analysis.packageManager}

Technology Stack:
${analysis.techStack.map(tech => `- ${tech}`).join('\n')}

Key Features:
${analysis.features.map(feature => `- ${feature}`).join('\n')}

Project Structure:
Directories: ${analysis.structure.directories.join(', ')}
Key Files: ${analysis.structure.keyFiles.join(', ')}
Config Files: ${analysis.structure.configFiles.join(', ')}

Dependencies (Runtime):
${Object.entries(analysis.dependencies.runtime).map(([name, version]) => `- ${name}: ${version}`).join('\n')}

Dependencies (Development):
${Object.entries(analysis.dependencies.dev).map(([name, version]) => `- ${name}: ${version}`).join('\n')}

Available Scripts:
${Object.entries(analysis.scripts).map(([name, command]) => `- ${name}: ${command}`).join('\n')}

Additional Info:
- Has Tests: ${analysis.hasTests ? 'Yes' : 'No'}
- Has Documentation: ${analysis.hasDocumentation ? 'Yes' : 'No'}
- Has CI/CD: ${analysis.hasCI ? 'Yes' : 'No'}
- Environment Files: ${analysis.environmentFiles.join(', ') || 'None'}
`.trim()
  }

  /**
   * Creates template-based README from analysis
   */
  private createTemplateReadmeFromAnalysis(analysis: ProjectAnalysis, _existingReadme?: string): string {
    let readme = `# ${analysis.projectName}\n\n`
    
    // Add description
    if (analysis.description) {
      readme += `${analysis.description}\n\n`
    }

    // Add badges
    readme += this.generateBadges(analysis) + '\n\n'
    
    // Add features
    if (analysis.features.length > 0) {
      readme += '## ✨ Features\n\n'
      readme += analysis.features.map(feature => `- ${feature}`).join('\n') + '\n\n'
    }
    
    // Add tech stack
    if (analysis.techStack.length > 0) {
      readme += '## 🚀 Technology Stack\n\n'
      readme += analysis.techStack.map(tech => `- ${tech}`).join('\n') + '\n\n'
    }
    
    // Add installation
    readme += this.generateInstallationSection(analysis) + '\n\n'
    
    // Add project structure
    readme += this.generateProjectStructureSection(analysis) + '\n\n'
    
    // Add scripts
    if (Object.keys(analysis.scripts).length > 0) {
      readme += '## 📜 Available Scripts\n\n'
      readme += Object.entries(analysis.scripts)
        .map(([name, command]) => `- \`${name}\`: ${command}`)
        .join('\n') + '\n\n'
    }
    
    // Add environment variables if detected
    if (analysis.environmentFiles.length > 0) {
      readme += this.generateEnvironmentSection() + '\n\n'
    }
    
    // Add deployment section
    readme += this.generateDeploymentSection() + '\n\n'
    
    // Add contributing
    readme += this.generateContributingSection() + '\n\n'
    
    // Add license
    readme += '## 📄 License\n\n'
    readme += 'This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.\n'

    return readme
  }

  /**
   * Generates badges for README
   */
  private generateBadges(analysis: ProjectAnalysis): string {
    const badges: string[] = []
    
    if (analysis.language === 'TypeScript') {
      badges.push('![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)')
    }
    
    if (analysis.framework === 'Next.js') {
      badges.push('![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)')
    }
    
    if (analysis.techStack.includes('React')) {
      badges.push('![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)')
    }
    
    if (analysis.techStack.includes('Tailwind CSS')) {
      badges.push('![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)')
    }
    
    return badges.join(' ')
  }

  /**
   * Generates installation section based on package manager
   */
  private generateInstallationSection(analysis: ProjectAnalysis): string {
    const packageManager = analysis.packageManager === 'unknown' ? 'npm' : analysis.packageManager
    
    return `## 🛠️ Installation

### Prerequisites
- Node.js 18+
- ${packageManager}

### Setup

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd ${analysis.projectName}
\`\`\`

2. Install dependencies:
\`\`\`bash
${packageManager === 'npm' ? 'npm install' : packageManager === 'yarn' ? 'yarn install' : 'pnpm install'}
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env.local
\`\`\`

4. Run the development server:
\`\`\`bash
${packageManager === 'npm' ? 'npm run dev' : packageManager === 'yarn' ? 'yarn dev' : 'pnpm dev'}
\`\`\`

5. Open [http://localhost:3000](http://localhost:3000) in your browser.`
  }

  /**
   * Generates project structure section with full directory tree
   */
  private generateProjectStructureSection(analysis: ProjectAnalysis): string {
    let structure = '## 📁 Project Structure\n\n```\n'
    
    // Build a complete directory tree from all files
    const fileTree = this.buildFileTree(analysis)
    structure += this.renderFileTree(fileTree, '', true)
    
    structure += '```'
    
    return structure
  }

  /**
   * Builds a complete file tree structure from all repository files
   */
  private buildFileTree(analysis: ProjectAnalysis): FileTreeNode {
    const root: FileTreeNode = { name: '', type: 'directory', children: new Map() }
    
    // Use ALL repository files to build the complete tree
    const allFiles = analysis.structure.allFiles
    
    // Add all files to the tree (this will automatically create the directory structure)
    allFiles.forEach(filePath => {
      this.addToTree(root, filePath, 'file')
    })
    
    // Add common project files if not already present (these are typical files that should exist)
    const commonFiles = [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      'next.config.ts',
      'tailwind.config.js',
      'tailwind.config.ts',
      'vite.config.js',
      'vite.config.ts',
      'webpack.config.js',
      'rollup.config.js',
      '.gitignore',
      '.eslintrc.json',
      '.prettierrc',
      'README.md',
      'CHANGELOG.md',
      'LICENSE',
      '.env.example',
      '.env.local',
      'jest.config.js',
      'vitest.config.ts',
      'Dockerfile',
      '.dockerignore'
    ]
    
    commonFiles.forEach(file => {
      if (!allFiles.includes(file)) {
        this.addToTree(root, file, 'file')
      }
    })
    
    return root
  }

  /**
   * Adds a path to the file tree
   */
  private addToTree(root: FileTreeNode, path: string, type: 'file' | 'directory'): void {
    const parts = path.split('/').filter(part => part.length > 0)
    let current = root
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const nodeType = isLast && type === 'file' ? 'file' : 'directory'
      
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          type: nodeType,
          children: new Map()
        })
      }
      
      current = current.children.get(part)!
    }
  }

  /**
   * Renders the file tree as ASCII art with complete nesting
   */
  private renderFileTree(node: FileTreeNode, prefix: string, isRoot: boolean, maxDepth: number = 10, currentDepth: number = 0): string {
    let result = ''
    
    // Prevent infinite recursion and overly deep trees
    if (currentDepth >= maxDepth) {
      return result
    }
    
    const entries = Array.from(node.children.entries()).sort(([a, nodeA], [b, nodeB]) => {
      // Directories first, then files
      if (nodeA.type !== nodeB.type) {
        return nodeA.type === 'directory' ? -1 : 1
      }
      return a.localeCompare(b)
    })
    
    entries.forEach(([name, childNode], index) => {
      const isLast = index === entries.length - 1
      const connector = isLast ? '└── ' : '├── '
      const childPrefix = isLast ? '    ' : '│   '
      
      // Add file/directory icon and name
      const icon = childNode.type === 'directory' ? '📁' : this.getFileIcon(name)
      const displayName = childNode.type === 'directory' ? `${name}/` : name
      
      if (!isRoot) {
        result += prefix + connector + icon + ' ' + displayName + '\n'
      } else if (name) {
        result += connector + icon + ' ' + displayName + '\n'
      }
      
      // Recursively render children
      if (childNode.children.size > 0) {
        result += this.renderFileTree(childNode, prefix + childPrefix, false, maxDepth, currentDepth + 1)
      }
    })
    
    return result
  }

  /**
   * Gets an appropriate icon for a file based on its extension
   */
  private getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const iconMap: Record<string, string> = {
      // Code files
      'ts': '🟦',
      'tsx': '⚛️',
      'js': '🟨',
      'jsx': '⚛️',
      'py': '🐍',
      'java': '☕',
      'go': '🐹',
      'rs': '🦀',
      'php': '🐘',
      'rb': '💎',
      'swift': '🍎',
      'kt': '🎯',
      
      // Config files
      'json': '📋',
      'yaml': '📄',
      'yml': '📄',
      'toml': '📄',
      'xml': '📄',
      'ini': '⚙️',
      'conf': '⚙️',
      'config': '⚙️',
      
      // Web files
      'html': '🌐',
      'css': '🎨',
      'scss': '🎨',
      'sass': '🎨',
      'less': '🎨',
      
      // Documentation
      'md': '📖',
      'txt': '📝',
      'pdf': '📕',
      'doc': '📘',
      'docx': '📘',
      
      // Images
      'png': '🖼️',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'gif': '🖼️',
      'svg': '🎨',
      'ico': '🖼️',
      
      // Other
      'lock': '🔒',
      'env': '🔐',
      'gitignore': '🚫',
      'dockerfile': '🐳',
      'makefile': '🔨',
    }
    
    // Special file names
    if (fileName.toLowerCase().includes('readme')) return '📖'
    if (fileName.toLowerCase().includes('license')) return '📜'
    if (fileName.toLowerCase().includes('changelog')) return '📋'
    if (fileName.toLowerCase().includes('package')) return '📦'
    if (fileName.toLowerCase().includes('docker')) return '🐳'
    if (fileName.toLowerCase().includes('test')) return '🧪'
    if (fileName.toLowerCase().includes('spec')) return '🧪'
    
    return iconMap[ext || ''] || '📄'
  }
}
