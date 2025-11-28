/**
 * Migration Specification Generator
 * 
 * This module generates migration specifications from source/target selection,
 * combining framework rules, mappings, and validation rules.
 */

import type {
  MigrationSpecification,
  SourceConfiguration,
  TargetConfiguration,
  MigrationMappings,
  MigrationRules,
  SpecMetadata,
  TargetSelection,
  SourceStack,
  RepositoryInfo,
  ImportMappings,
  RoutingMappings,
  ComponentMappings,
  StylingMappings,
  StateManagementMappings,
  BuildSystemMappings,
  BreakingChange,
  Deprecation,
  FileStructureRules,
  ComponentConventions,
  SyntaxMappings,
  APIMappings,
  LifecycleMappings,
} from '@/types/migration'

import {
  getFrameworkRulesLoader,
  type FrameworkRules,
  type MigrationPath,
} from './framework-rules'

// ============================================================================
// MigrationSpecGenerator Class
// ============================================================================

export class MigrationSpecGenerator {
  private loader = getFrameworkRulesLoader()

  /**
   * Generate complete migration specification from source and target selection
   */
  async generate(
    source: SourceStack,
    target: TargetSelection,
    repository: RepositoryInfo
  ): Promise<MigrationSpecification> {
    // Load framework rules for source and target
    const sourceRules = await this.loadFrameworkRules(source.framework, source.version)
    const targetRules = await this.loadFrameworkRules(target.framework, target.version)

    // Find migration path
    const migrationPath = await this.loader.findMigrationPath(
      source.framework,
      target.framework,
      target.options.router
    )

    // Generate source configuration
    const sourceConfig = this.buildSourceConfiguration(source)

    // Generate target configuration
    const targetConfig = await this.buildTargetConfiguration(
      target,
      targetRules
    )

    // Generate mappings
    const mappings = await this.generateMappings(
      source,
      target,
      sourceRules,
      targetRules,
      migrationPath
    )

    // Generate rules
    const rules = await this.generateRules(
      source,
      target,
      sourceRules,
      targetRules,
      migrationPath
    )

    // Generate metadata
    const metadata = this.generateMetadata(
      source,
      target,
      migrationPath,
      repository
    )

    return {
      source: sourceConfig,
      target: targetConfig,
      mappings,
      rules,
      metadata,
    }
  }

  /**
   * Load framework rules for a specific framework and version
   */
  async loadFrameworkRules(
    framework: string,
    version?: string
  ): Promise<FrameworkRules> {
    const frameworkRules = await this.loader.loadFrameworkRules(framework)

    // If version specified, validate it exists
    if (version) {
      const versionRules = frameworkRules.versions.find(v => v.version === version)
      if (!versionRules) {
        throw new Error(
          `Version ${version} not found for framework ${framework}`
        )
      }
    }

    return frameworkRules
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Build source configuration from source stack
   */
  private buildSourceConfiguration(source: SourceStack): SourceConfiguration {
    return {
      language: source.language || 'javascript',
      framework: source.framework,
      version: source.version || 'latest',
      routing: 'none', // Will be detected from dependencies
      patterns: {}, // Will be detected during analysis
      buildTool: source.buildTool || 'webpack',
      packageManager: source.packageManager || 'npm',
    }
  }

  /**
   * Build target configuration from target selection and rules
   */
  private async buildTargetConfiguration(
    target: TargetSelection,
    targetRules: FrameworkRules
  ): Promise<TargetConfiguration> {
    // Find version-specific configuration
    const versionRules = targetRules.versions.find(
      v => v.version === target.version
    )

    // Get default configuration or use version-specific
    const config = versionRules?.configuration || this.getDefaultConfiguration(target)

    return {
      language: targetRules.language,
      framework: target.framework,
      version: target.version,
      routing: target.options.router || 'file-based',
      fileStructure: config.fileStructure,
      componentConventions: config.componentConventions,
      syntaxMappings: config.syntaxMappings,
      apiMappings: config.apiMappings,
      lifecycleMappings: config.lifecycleMappings,
      buildTool: config.buildTool,
      packageManager: config.packageManager[0] || 'npm',
    }
  }

  /**
   * Get default configuration for target framework
   */
  private getDefaultConfiguration(target: TargetSelection): {
    fileStructure: FileStructureRules
    componentConventions: ComponentConventions
    syntaxMappings: SyntaxMappings
    apiMappings: APIMappings
    lifecycleMappings: LifecycleMappings
    buildTool: string
    packageManager: string[]
  } {
    // Default configurations for common frameworks
    const defaults: Record<string, any> = {
      nextjs: {
        fileStructure: {
          pages: target.options.router === 'app' ? 'app' : 'pages',
          components: 'components',
          layouts: target.options.router === 'app' ? 'app' : 'components/layouts',
          api: target.options.router === 'app' ? 'app/api' : 'pages/api',
          public: 'public',
          styles: 'styles',
        },
        componentConventions: {
          fileExtension: target.options.typescript ? '.tsx' : '.jsx',
          namingConvention: 'PascalCase' as const,
          exportStyle: target.options.router === 'app' ? 'default' : 'default',
          serverComponents: target.options.router === 'app',
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {},
        buildTool: 'turbopack',
        packageManager: ['pnpm', 'npm', 'yarn'],
      },
      vue3: {
        fileStructure: {
          pages: 'src/views',
          components: 'src/components',
          layouts: 'src/layouts',
          api: 'src/api',
          public: 'public',
          styles: 'src/styles',
        },
        componentConventions: {
          fileExtension: target.options.typescript ? '.vue' : '.vue',
          namingConvention: 'PascalCase' as const,
          exportStyle: 'default' as const,
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {},
        buildTool: 'vite',
        packageManager: ['npm', 'yarn', 'pnpm'],
      },
    }

    return defaults[target.framework] || defaults.nextjs
  }

  /**
   * Generate all mappings for the migration
   */
  async generateMappings(
    source: SourceStack,
    target: TargetSelection,
    sourceRules: FrameworkRules,
    targetRules: FrameworkRules,
    migrationPath: MigrationPath | null
  ): Promise<MigrationMappings> {
    // Load migration-specific mappings if available
    let pathMappings: any = {}
    if (migrationPath) {
      try {
        pathMappings = await this.loader.loadMigrationMappings(migrationPath.id)
      } catch (error) {
        // No specific mappings file, use defaults
        console.warn(`No mappings file found for ${migrationPath.id}, using defaults`)
      }
    }

    // Generate each type of mapping
    const imports = this.generateImportMappings(
      source,
      target,
      sourceRules,
      targetRules,
      pathMappings.imports
    )

    const routing = this.generateRoutingMappings(
      source,
      target,
      sourceRules,
      targetRules,
      pathMappings.routing
    )

    const components = this.generateComponentMappings(
      source,
      target,
      pathMappings.components
    )

    const styling = this.generateStylingMappings(
      source,
      target,
      pathMappings.styling
    )

    const stateManagement = this.generateStateManagementMappings(
      source,
      target,
      pathMappings.stateManagement
    )

    const buildSystem = this.generateBuildSystemMappings(
      source,
      target,
      pathMappings.buildSystem
    )

    return {
      imports,
      routing,
      components,
      styling,
      stateManagement,
      buildSystem,
    }
  }

  /**
   * Generate import mappings based on source/target frameworks
   */
  private generateImportMappings(
    source: SourceStack,
    target: TargetSelection,
    sourceRules: FrameworkRules,
    _targetRules: FrameworkRules,
    pathMappings?: ImportMappings
  ): ImportMappings {
    const mappings: ImportMappings = pathMappings || {}

    // React to Next.js specific mappings
    if (source.framework === 'react' && target.framework === 'nextjs') {
      mappings['react-router-dom'] = 'next/navigation'
      mappings['react-router'] = 'next/navigation'
      mappings['@reach/router'] = 'next/navigation'
      
      // Image optimization
      if (!mappings['next/image']) {
        mappings['react-image'] = 'next/image'
      }
      
      // Head management
      mappings['react-helmet'] = 'next/head'
      mappings['react-helmet-async'] = 'next/head'
    }

    // Vue 2 to Vue 3 mappings
    if (source.framework === 'vue2' && target.framework === 'vue3') {
      mappings['vue'] = 'vue'
      mappings['vue-router'] = 'vue-router'
      mappings['vuex'] = 'pinia'
    }

    // Add default mappings from framework rules
    if (sourceRules.defaultMappings?.imports) {
      Object.assign(mappings, sourceRules.defaultMappings.imports)
    }

    return mappings
  }

  /**
   * Generate routing mappings
   */
  private generateRoutingMappings(
    source: SourceStack,
    target: TargetSelection,
    _sourceRules: FrameworkRules,
    _targetRules: FrameworkRules,
    pathMappings?: RoutingMappings
  ): RoutingMappings {
    const mappings: RoutingMappings = pathMappings || {}

    // React Router to Next.js routing
    if (source.framework === 'react' && target.framework === 'nextjs') {
      if (target.options.router === 'app') {
        // App Router mappings
        mappings['<Route path="/">'] = 'app/page.tsx'
        mappings['<Route path="/about">'] = 'app/about/page.tsx'
        mappings['<Link to="/">'] = '<Link href="/">'
        mappings['useNavigate()'] = 'useRouter() from next/navigation'
        mappings['useParams()'] = 'useParams() from next/navigation'
        mappings['useLocation()'] = 'usePathname() from next/navigation'
      } else {
        // Pages Router mappings
        mappings['<Route path="/">'] = 'pages/index.tsx'
        mappings['<Route path="/about">'] = 'pages/about.tsx'
        mappings['<Link to="/">'] = '<Link href="/">'
        mappings['useNavigate()'] = 'useRouter() from next/router'
        mappings['useParams()'] = 'useRouter().query'
        mappings['useLocation()'] = 'useRouter().pathname'
      }
    }

    // Vue Router mappings
    if (source.framework === 'vue2' && target.framework === 'vue3') {
      mappings['this.$router'] = 'useRouter()'
      mappings['this.$route'] = 'useRoute()'
    }

    return mappings
  }

  /**
   * Generate component mappings
   */
  private generateComponentMappings(
    source: SourceStack,
    target: TargetSelection,
    pathMappings?: ComponentMappings
  ): ComponentMappings {
    const mappings: ComponentMappings = pathMappings || {}

    // Common mappings
    mappings['className'] = 'className'
    mappings['style'] = 'style'

    // Framework-specific
    if (source.framework === 'react' && target.framework === 'vue3') {
      mappings['className'] = 'class'
      mappings['htmlFor'] = 'for'
      mappings['onChange'] = '@change'
      mappings['onClick'] = '@click'
    }

    return mappings
  }

  /**
   * Generate styling mappings
   */
  private generateStylingMappings(
    _source: SourceStack,
    target: TargetSelection,
    pathMappings?: StylingMappings
  ): StylingMappings {
    const mappings: StylingMappings = pathMappings || {}

    // CSS Modules
    if (target.options.styling === 'css-modules') {
      mappings["import './styles.css'"] = "import styles from './styles.module.css'"
      mappings['.css'] = '.module.css'
    }

    // Tailwind CSS
    if (target.options.styling === 'tailwind') {
      mappings["import './styles.css'"] = "// Tailwind classes used directly"
    }

    // Styled Components
    if (target.options.styling === 'styled-components') {
      mappings["import './styles.css'"] = "import styled from 'styled-components'"
    }

    return mappings
  }

  /**
   * Generate state management mappings
   */
  private generateStateManagementMappings(
    source: SourceStack,
    target: TargetSelection,
    pathMappings?: StateManagementMappings
  ): StateManagementMappings {
    const mappings: StateManagementMappings = pathMappings || {}

    // Check if Redux is in dependencies
    const hasRedux = source.dependencies && 
      (source.dependencies['redux'] || source.dependencies['react-redux'])

    // Redux to Next.js patterns
    if (hasRedux && target.framework === 'nextjs') {
      if (target.options.router === 'app') {
        mappings['useSelector'] = 'useState or server state'
        mappings['useDispatch'] = 'server actions or useState'
        mappings['connect()'] = 'use client hooks'
      }
    }

    // Check if Vuex is in dependencies
    const hasVuex = source.dependencies && source.dependencies['vuex']

    // Vuex to Pinia
    if (hasVuex && target.framework === 'vue3') {
      mappings['this.$store'] = 'useStore()'
      mappings['mapState'] = 'storeToRefs()'
      mappings['mapGetters'] = 'computed properties'
      mappings['mapActions'] = 'store methods'
    }

    return mappings
  }

  /**
   * Generate build system mappings
   */
  private generateBuildSystemMappings(
    source: SourceStack,
    target: TargetSelection,
    pathMappings?: BuildSystemMappings
  ): BuildSystemMappings {
    const mappings: BuildSystemMappings = pathMappings || {}

    // Webpack to Next.js
    if (source.buildTool === 'webpack' && target.framework === 'nextjs') {
      mappings['webpack.config.js'] = 'next.config.js'
      mappings['.babelrc'] = 'next.config.js (swc)'
    }

    // Webpack to Vite
    if (source.buildTool === 'webpack' && target.framework === 'vue3') {
      mappings['webpack.config.js'] = 'vite.config.js'
      mappings['.babelrc'] = 'vite.config.js'
    }

    return mappings
  }

  /**
   * Generate migration rules
   */
  async generateRules(
    source: SourceStack,
    target: TargetSelection,
    _sourceRules: FrameworkRules,
    targetRules: FrameworkRules,
    migrationPath: MigrationPath | null
  ): Promise<MigrationRules> {
    // Initialize rule arrays
    const mustPreserve: string[] = []
    const mustTransform: string[] = []
    const mustRemove: string[] = []
    const mustRefactor: string[] = []
    const breakingChanges: BreakingChange[] = []
    const deprecations: Deprecation[] = []

    // Add universal preservation rules
    mustPreserve.push(
      'Business logic',
      'Component behavior',
      'Data flow',
      'User interactions',
      'API contracts',
      'Error handling logic'
    )

    // Generate framework-specific transformation rules
    this.addTransformationRules(
      source,
      target,
      mustTransform,
      mustRemove,
      mustRefactor
    )

    // Extract breaking changes from target framework
    const targetVersion = targetRules.versions.find(v => v.version === target.version)
    if (targetVersion) {
      breakingChanges.push(...targetVersion.breakingChanges)
      deprecations.push(...targetVersion.deprecations)
    }

    // Add breaking changes from migration path
    if (migrationPath) {
      const pathBreakingChanges = this.extractBreakingChangesFromPath(migrationPath)
      breakingChanges.push(...pathBreakingChanges)
    }

    // Add version-specific breaking changes if upgrading
    if (source.framework === target.framework && source.version !== target.version) {
      const versionBreakingChanges = await this.extractVersionBreakingChanges(
        source.framework,
        source.version || 'latest',
        target.version
      )
      breakingChanges.push(...versionBreakingChanges)
    }

    return {
      mustPreserve,
      mustTransform,
      mustRemove,
      mustRefactor,
      breakingChanges,
      deprecations,
    }
  }

  /**
   * Add framework-specific transformation rules
   */
  private addTransformationRules(
    source: SourceStack,
    target: TargetSelection,
    mustTransform: string[],
    mustRemove: string[],
    mustRefactor: string[]
  ): void {
    // React to Next.js rules
    if (source.framework === 'react' && target.framework === 'nextjs') {
      mustTransform.push(
        'Import statements',
        'Routing configuration',
        'File structure',
        'Build configuration',
        'Image components',
        'Head/meta tags'
      )

      mustRemove.push(
        'react-router dependencies',
        'Webpack configuration',
        'Custom routing setup',
        'react-helmet dependencies'
      )

      if (target.options.router === 'app') {
        mustRefactor.push(
          'Client-side data fetching to server components',
          'Route components to page.tsx files',
          'API routes to app/api structure',
          'Layouts to app directory structure'
        )

        // Check if Redux is in dependencies
        const hasRedux = source.dependencies && 
          (source.dependencies['redux'] || source.dependencies['react-redux'])
        
        if (hasRedux) {
          mustRemove.push('Redux if using server components')
        }
      } else {
        mustRefactor.push(
          'Route components to pages directory',
          'API routes to pages/api structure'
        )
      }
    }

    // Vue 2 to Vue 3 rules
    if (source.framework === 'vue2' && target.framework === 'vue3') {
      mustTransform.push(
        'Composition API usage',
        'Event handling syntax',
        'v-model directives',
        'Filters to computed properties',
        'Global API to app instance'
      )

      mustRemove.push(
        'Vue.prototype modifications',
        'Event bus patterns',
        '$on, $off, $once methods'
      )

      mustRefactor.push(
        'Options API to Composition API',
        'Vuex to Pinia',
        'Vue Router v3 to v4'
      )
    }

    // Express to NestJS rules
    if (source.framework === 'express' && target.framework === 'nestjs') {
      mustTransform.push(
        'Route handlers to controllers',
        'Middleware to guards/interceptors',
        'Error handlers to exception filters',
        'Module structure'
      )

      mustRemove.push(
        'Express-specific middleware',
        'Custom routing setup'
      )

      mustRefactor.push(
        'Dependency injection patterns',
        'Configuration management',
        'Database connections to providers'
      )
    }

    // Flask to FastAPI rules
    if (source.framework === 'flask' && target.framework === 'fastapi') {
      mustTransform.push(
        'Route decorators',
        'Request/response handling',
        'Type hints',
        'Async/await patterns'
      )

      mustRemove.push(
        'Flask-specific extensions',
        'Blueprint patterns'
      )

      mustRefactor.push(
        'Synchronous to asynchronous code',
        'SQLAlchemy to async SQLAlchemy',
        'Template rendering to API responses'
      )
    }
  }

  /**
   * Extract breaking changes from migration path
   */
  private extractBreakingChangesFromPath(
    _migrationPath: MigrationPath
  ): BreakingChange[] {
    const breakingChanges: BreakingChange[] = []

    // Convert common issues to breaking changes
    // Note: commonIssues is optional in MigrationPath
    // This will be populated when migration path data is available
    
    return breakingChanges
  }

  /**
   * Extract version-specific breaking changes
   */
  private async extractVersionBreakingChanges(
    framework: string,
    fromVersion: string,
    toVersion: string
  ): Promise<BreakingChange[]> {
    try {
      const upgradeRules = await this.loader.loadVersionUpgradeRules(
        framework,
        fromVersion,
        toVersion
      )

      return upgradeRules.breakingChanges || []
    } catch (error) {
      // No upgrade rules found, return empty array
      console.warn(
        `No version upgrade rules found for ${framework} ${fromVersion} → ${toVersion}`
      )
      return []
    }
  }

  /**
   * Generate metadata for the migration specification
   */
  private generateMetadata(
    _source: SourceStack,
    _target: TargetSelection,
    migrationPath: MigrationPath | null,
    _repository: RepositoryInfo
  ): SpecMetadata {
    // Estimate complexity based on migration path
    let complexity: 'low' | 'medium' | 'high' = 'medium'
    let duration = '2-4 hours'

    if (migrationPath) {
      complexity = migrationPath.difficulty === 'easy' ? 'low' :
                   migrationPath.difficulty === 'hard' ? 'high' : 'medium'
      duration = migrationPath.estimatedTime
    }

    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      estimatedComplexity: complexity,
      estimatedDuration: duration,
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let generatorInstance: MigrationSpecGenerator | null = null

/**
 * Get singleton instance of MigrationSpecGenerator
 */
export function getMigrationSpecGenerator(): MigrationSpecGenerator {
  if (!generatorInstance) {
    generatorInstance = new MigrationSpecGenerator()
  }
  return generatorInstance
}

/**
 * Reset singleton instance (useful for testing)
 */
export function resetMigrationSpecGenerator(): void {
  generatorInstance = null
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Generate migration specification
 */
export async function generateMigrationSpec(
  source: SourceStack,
  target: TargetSelection,
  repository: RepositoryInfo
): Promise<MigrationSpecification> {
  const generator = getMigrationSpecGenerator()
  return generator.generate(source, target, repository)
}
