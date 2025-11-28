import Anthropic from '@anthropic-ai/sdk'
import type {
  MigrationSpecification,
  TransformationContext,
  AITransformResult,
  AIServiceError,
} from '@/types/migration'

/**
 * AITransformationEngine
 * 
 * Handles AI-powered semantic code transformations using Claude API.
 * This engine is used for transformations that require semantic understanding
 * beyond what AST transformations can provide.
 * 
 * Key responsibilities:
 * - Transform components with semantic understanding
 * - Generate framework-specific boilerplate
 * - Map lifecycle methods with context awareness
 * - Restructure file layouts according to target conventions
 */
export class AITransformationEngine {
  private client: Anthropic
  private maxRetries: number = 3
  private retryDelayMs: number = 1000

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY
    
    console.log('[AI Engine] ========================================')
    console.log('[AI Engine] Initializing AI Transformation Engine')
    console.log('[AI Engine] ========================================')
    console.log(`[AI Engine] API Key provided: ${!!apiKey}`)
    console.log(`[AI Engine] API Key from env: ${!!process.env.ANTHROPIC_API_KEY}`)
    console.log(`[AI Engine] API Key available: ${!!key}`)
    
    if (key) {
      console.log(`[AI Engine] API Key length: ${key.length}`)
      console.log(`[AI Engine] API Key prefix: ${key.substring(0, 10)}...`)
    }
    
    if (!key) {
      console.warn('[AI Engine] ⚠ No ANTHROPIC_API_KEY found. AI transformations will be skipped.')
      console.warn('[AI Engine] Set ANTHROPIC_API_KEY environment variable to enable AI transformations.')
      console.warn('[AI Engine] Example: ANTHROPIC_API_KEY=sk-ant-api03-...')
      // Create client with placeholder to avoid errors, but mark as unavailable
      this.client = new Anthropic({
        apiKey: 'placeholder',
      })
    } else {
      console.log('[AI Engine] ✓ Initialized with API key')
      this.client = new Anthropic({
        apiKey: key,
      })
    }
    console.log('[AI Engine] ========================================')
  }

  /**
   * Check if AI transformations are available (API key is set)
   */
  isAvailable(): boolean {
    const available = !!(process.env.ANTHROPIC_API_KEY)
    console.log(`[AI Engine] isAvailable check: ${available}`)
    return available
  }

  /**
   * Transform a component using AI with semantic understanding
   * 
   * @param code - Source code to transform
   * @param spec - Migration specification with mappings and rules
   * @param context - Transformation context (file path, dependencies, etc.)
   * @returns AI transformation result with confidence score
   */
  async transformComponent(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): Promise<AITransformResult> {
    console.log(`[AI Engine] ========================================`)
    console.log(`[AI Engine] Starting component transformation for: ${context.filePath}`)
    console.log(`[AI Engine] Source: ${spec.source.framework} -> Target: ${spec.target.framework}`)
    console.log(`[AI Engine] ========================================`)
    console.log(`[AI Engine] INPUT CODE:`)
    console.log(`[AI Engine] ----------------------------------------`)
    console.log(code)
    console.log(`[AI Engine] ----------------------------------------`)
    
    const prompt = this.buildComponentTransformPrompt(code, spec, context)
    console.log(`[AI Engine] Generated prompt (${prompt.length} chars)`)

    try {
      const result = await this.callClaudeWithRetry(prompt)
      
      console.log(`[AI Engine] ========================================`)
      console.log(`[AI Engine] RAW AI RESPONSE:`)
      console.log(`[AI Engine] ----------------------------------------`)
      console.log(result)
      console.log(`[AI Engine] ----------------------------------------`)
      
      const parsed = this.parseAIResponse(result)
      
      console.log(`[AI Engine] ========================================`)
      console.log(`[AI Engine] PARSED OUTPUT CODE:`)
      console.log(`[AI Engine] ----------------------------------------`)
      console.log(parsed.code)
      console.log(`[AI Engine] ----------------------------------------`)
      console.log(`[AI Engine] ========================================`)
      
      return parsed
    } catch (error) {
      throw this.handleAIError(error)
    }
  }

  /**
   * Generate boilerplate code for target framework
   * 
   * @param fileType - Type of file to generate (layout, config, etc.)
   * @param spec - Migration specification
   * @returns Generated boilerplate code
   */
  async generateBoilerplate(
    fileType: string,
    spec: MigrationSpecification
  ): Promise<string> {
    const prompt = this.buildBoilerplatePrompt(fileType, spec)

    try {
      const result = await this.callClaudeWithRetry(prompt)
      return this.extractCodeFromResponse(result)
    } catch (error) {
      throw this.handleAIError(error)
    }
  }

  /**
   * Map lifecycle methods from source to target framework
   * 
   * Handles transformation of React class component lifecycle methods to hooks:
   * - componentDidMount → useEffect(() => {}, [])
   * - componentWillUnmount → useEffect(() => { return () => {} }, [])
   * - componentDidUpdate → useEffect(() => {}, [deps])
   * - shouldComponentUpdate → React.memo or useMemo
   * - getDerivedStateFromProps → useState with derived logic
   * - getSnapshotBeforeUpdate → useRef with useEffect
   * - componentDidCatch → Error boundary component
   * 
   * @param code - Source code with lifecycle methods
   * @param spec - Migration specification with lifecycle mappings
   * @returns Transformed code with mapped lifecycle methods
   */
  async mapLifecycleMethods(
    code: string,
    spec: MigrationSpecification
  ): Promise<string> {
    const prompt = this.buildLifecycleMappingPrompt(code, spec)

    try {
      const result = await this.callClaudeWithRetry(prompt)
      return this.extractCodeFromResponse(result)
    } catch (error) {
      throw this.handleAIError(error)
    }
  }

  /**
   * Restructure file layout according to target framework conventions
   * 
   * This method:
   * 1. Moves files to target framework directory structure
   * 2. Renames files with appropriate extensions
   * 3. Generates missing target-specific files (layouts, configs)
   * 
   * @param files - Map of file paths to content
   * @param spec - Migration specification
   * @returns Map of new file paths to transformed content
   */
  async restructureFileLayout(
    files: Map<string, string>,
    spec: MigrationSpecification
  ): Promise<Map<string, string>> {
    const restructuredFiles = new Map<string, string>()

    // Step 1: Process each existing file and determine new location
    for (const [filePath, content] of files) {
      const newPath = this.determineNewFilePath(filePath, spec)
      const fileType = this.determineFileType(filePath)
      
      // Transform content if needed based on file type
      let transformedContent = content
      
      // For page files in Next.js App Router, wrap in proper structure
      if (spec.target.framework === 'nextjs' && 
          spec.target.routing === 'app-router' && 
          fileType === 'page') {
        transformedContent = this.wrapInAppRouterStructure(content, newPath, spec)
      }
      
      restructuredFiles.set(newPath, transformedContent)
    }

    // Step 2: Generate missing target-specific files
    const generatedFiles = await this.generateMissingFiles(files, spec, restructuredFiles)
    
    // Merge generated files with restructured files
    for (const [path, content] of generatedFiles) {
      if (!restructuredFiles.has(path)) {
        restructuredFiles.set(path, content)
      }
    }

    return restructuredFiles
  }

  /**
   * Generate missing target-specific files (layouts, configs, etc.)
   * 
   * @param existingFiles - Map of existing files
   * @param spec - Migration specification
   * @param restructuredFiles - Map of already restructured files
   * @returns Map of generated file paths to content
   */
  private async generateMissingFiles(
    existingFiles: Map<string, string>,
    spec: MigrationSpecification,
    restructuredFiles: Map<string, string>
  ): Promise<Map<string, string>> {
    const generatedFiles = new Map<string, string>()

    // Generate framework-specific files based on target
    if (spec.target.framework === 'nextjs') {
      await this.generateNextJsFiles(existingFiles, spec, generatedFiles, restructuredFiles)
    } else if (spec.target.framework === 'nuxt') {
      await this.generateNuxtFiles(existingFiles, spec, generatedFiles, restructuredFiles)
    } else if (spec.target.framework === 'vue') {
      await this.generateVueFiles(existingFiles, spec, generatedFiles, restructuredFiles)
    } else if (spec.target.framework === 'fastapi') {
      await this.generateFastAPIFiles(existingFiles, spec, generatedFiles, restructuredFiles)
    }

    return generatedFiles
  }

  /**
   * Generate Next.js specific files
   */
  private async generateNextJsFiles(
    existingFiles: Map<string, string>,
    spec: MigrationSpecification,
    generatedFiles: Map<string, string>,
    restructuredFiles: Map<string, string>
  ): Promise<void> {
    const { fileStructure, componentConventions } = spec.target
    const ext = componentConventions.fileExtension

    // Generate root layout if using App Router
    if (spec.target.routing === 'app-router') {
      const layoutPath = `${fileStructure.layouts}/layout${ext}`
      if (!this.fileExists(existingFiles, layoutPath, restructuredFiles)) {
        const layoutContent = await this.generateBoilerplate('root-layout', spec)
        generatedFiles.set(layoutPath, layoutContent)
      }

      // Generate loading.tsx for root
      const loadingPath = `${fileStructure.pages}/loading${ext}`
      if (!this.fileExists(existingFiles, loadingPath, restructuredFiles)) {
        const loadingContent = await this.generateBoilerplate('loading', spec)
        generatedFiles.set(loadingPath, loadingContent)
      }

      // Generate error.tsx for root
      const errorPath = `${fileStructure.pages}/error${ext}`
      if (!this.fileExists(existingFiles, errorPath, restructuredFiles)) {
        const errorContent = await this.generateBoilerplate('error-boundary', spec)
        generatedFiles.set(errorPath, errorContent)
      }

      // Generate not-found.tsx
      const notFoundPath = `${fileStructure.pages}/not-found${ext}`
      if (!this.fileExists(existingFiles, notFoundPath, restructuredFiles)) {
        const notFoundContent = await this.generateBoilerplate('not-found', spec)
        generatedFiles.set(notFoundPath, notFoundContent)
      }
    }

    // Generate next.config.js if missing
    const configPath = 'next.config.js'
    if (!this.fileExists(existingFiles, configPath, restructuredFiles)) {
      const configContent = await this.generateBoilerplate('next-config', spec)
      generatedFiles.set(configPath, configContent)
    }

    // Generate tsconfig.json if using TypeScript
    if (componentConventions.fileExtension.includes('ts')) {
      const tsconfigPath = 'tsconfig.json'
      if (!this.fileExists(existingFiles, tsconfigPath, restructuredFiles)) {
        const tsconfigContent = await this.generateBoilerplate('tsconfig', spec)
        generatedFiles.set(tsconfigPath, tsconfigContent)
      }
    }

    // Generate middleware.ts if needed (for auth, redirects, etc.)
    const middlewarePath = `middleware${ext}`
    if (!this.fileExists(existingFiles, middlewarePath, restructuredFiles)) {
      const middlewareContent = await this.generateBoilerplate('middleware', spec)
      generatedFiles.set(middlewarePath, middlewareContent)
    }

    // Generate example API route if no API routes exist
    const hasApiRoutes = Array.from(existingFiles.keys()).some(path => 
      path.includes('/api/') || path.includes('\\api\\')
    ) || Array.from(restructuredFiles.keys()).some(path => 
      path.includes('/api/') || path.includes('\\api\\')
    )
    
    if (!hasApiRoutes) {
      const apiRoutePath = spec.target.routing === 'app-router' 
        ? `${fileStructure.api}/hello/route${ext}`
        : `${fileStructure.api}/hello${ext}`
      
      const apiRouteContent = await this.generateBoilerplate('api-route', spec)
      generatedFiles.set(apiRoutePath, apiRouteContent)
    }
  }

  /**
   * Generate Nuxt specific files
   */
  private async generateNuxtFiles(
    existingFiles: Map<string, string>,
    spec: MigrationSpecification,
    generatedFiles: Map<string, string>,
    restructuredFiles: Map<string, string>
  ): Promise<void> {
    // Generate nuxt.config.ts
    const configPath = 'nuxt.config.ts'
    if (!this.fileExists(existingFiles, configPath, restructuredFiles)) {
      const configContent = await this.generateBoilerplate('nuxt-config', spec)
      generatedFiles.set(configPath, configContent)
    }

    // Generate app.vue (root component)
    const appPath = 'app.vue'
    if (!this.fileExists(existingFiles, appPath, restructuredFiles)) {
      const appContent = await this.generateBoilerplate('nuxt-app', spec)
      generatedFiles.set(appPath, appContent)
    }

    // Generate error.vue
    const errorPath = 'error.vue'
    if (!this.fileExists(existingFiles, errorPath, restructuredFiles)) {
      const errorContent = await this.generateBoilerplate('nuxt-error', spec)
      generatedFiles.set(errorPath, errorContent)
    }
  }

  /**
   * Generate Vue specific files
   */
  private async generateVueFiles(
    existingFiles: Map<string, string>,
    spec: MigrationSpecification,
    generatedFiles: Map<string, string>,
    restructuredFiles: Map<string, string>
  ): Promise<void> {
    // Generate vite.config.ts or vue.config.js
    const configPath = spec.target.buildTool === 'vite' ? 'vite.config.ts' : 'vue.config.js'
    if (!this.fileExists(existingFiles, configPath, restructuredFiles)) {
      const configContent = await this.generateBoilerplate('vue-config', spec)
      generatedFiles.set(configPath, configContent)
    }

    // Generate main entry file
    const mainPath = `src/main${spec.target.componentConventions.fileExtension}`
    if (!this.fileExists(existingFiles, mainPath, restructuredFiles)) {
      const mainContent = await this.generateBoilerplate('vue-main', spec)
      generatedFiles.set(mainPath, mainContent)
    }

    // Generate App.vue if missing
    const appPath = 'src/App.vue'
    if (!this.fileExists(existingFiles, appPath, restructuredFiles)) {
      const appContent = await this.generateBoilerplate('vue-app', spec)
      generatedFiles.set(appPath, appContent)
    }
  }

  /**
   * Generate FastAPI specific files
   */
  private async generateFastAPIFiles(
    existingFiles: Map<string, string>,
    spec: MigrationSpecification,
    generatedFiles: Map<string, string>,
    restructuredFiles: Map<string, string>
  ): Promise<void> {
    // Generate main.py
    const mainPath = 'main.py'
    if (!this.fileExists(existingFiles, mainPath, restructuredFiles)) {
      const mainContent = await this.generateBoilerplate('fastapi-main', spec)
      generatedFiles.set(mainPath, mainContent)
    }

    // Generate requirements.txt
    const reqPath = 'requirements.txt'
    if (!this.fileExists(existingFiles, reqPath, restructuredFiles)) {
      const reqContent = await this.generateBoilerplate('fastapi-requirements', spec)
      generatedFiles.set(reqPath, reqContent)
    }

    // Generate config.py
    const configPath = 'config.py'
    if (!this.fileExists(existingFiles, configPath, restructuredFiles)) {
      const configContent = await this.generateBoilerplate('fastapi-config', spec)
      generatedFiles.set(configPath, configContent)
    }
  }

  /**
   * Check if a file exists in the file map (case-insensitive path matching)
   * Also checks in the restructured files map to avoid duplicates
   */
  private fileExists(files: Map<string, string>, path: string, restructuredFiles?: Map<string, string>): boolean {
    const normalizedPath = path.toLowerCase().replace(/\\/g, '/')
    const targetFileName = normalizedPath.split('/').pop() || ''
    
    // Check in original files
    for (const existingPath of files.keys()) {
      const normalizedExisting = existingPath.toLowerCase().replace(/\\/g, '/')
      const existingFileName = normalizedExisting.split('/').pop() || ''
      
      // Exact path match
      if (normalizedExisting === normalizedPath) {
        return true
      }
      
      // Path ends with target
      if (normalizedExisting.endsWith(`/${normalizedPath}`)) {
        return true
      }
      
      // Target ends with existing (for already restructured files)
      if (normalizedPath.endsWith(`/${normalizedExisting}`)) {
        return true
      }
      
      // Filename match (for files like layout.tsx, next.config.js)
      if (existingFileName === targetFileName && targetFileName) {
        return true
      }
    }
    
    // Check in restructured files if provided
    if (restructuredFiles) {
      for (const existingPath of restructuredFiles.keys()) {
        const normalizedExisting = existingPath.toLowerCase().replace(/\\/g, '/')
        const existingFileName = normalizedExisting.split('/').pop() || ''
        
        // Exact path match
        if (normalizedExisting === normalizedPath) {
          return true
        }
        
        // Path ends with target
        if (normalizedExisting.endsWith(`/${normalizedPath}`)) {
          return true
        }
        
        // Target ends with existing
        if (normalizedPath.endsWith(`/${normalizedExisting}`)) {
          return true
        }
        
        // Filename match
        if (existingFileName === targetFileName && targetFileName) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Wrap content in Next.js App Router structure
   */
  private wrapInAppRouterStructure(
    content: string,
    _filePath: string,
    _spec: MigrationSpecification
  ): string {
    // If content already exports a default function/component, return as-is
    if (content.includes('export default') || content.includes('export { default }')) {
      return content
    }

    // Otherwise, wrap in basic page structure
    return `${content}

export default function Page() {
  return (
    <div>
      {/* TODO: Implement page content */}
    </div>
  )
}
`
  }

  /**
   * Determine file type from path
   */
  private determineFileType(filePath: string): string {
    const lowerPath = filePath.toLowerCase()
    
    if (lowerPath.includes('/pages/') || lowerPath.includes('/routes/') || lowerPath.includes('/views/')) {
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
   * Build prompt for component transformation
   */
  private buildComponentTransformPrompt(
    code: string,
    spec: MigrationSpecification,
    context: TransformationContext
  ): string {
    return `You are an expert code migration assistant. Transform the following ${spec.source.framework} component to ${spec.target.framework}.

SOURCE FRAMEWORK: ${spec.source.framework} ${spec.source.version}
TARGET FRAMEWORK: ${spec.target.framework} ${spec.target.version}

FILE CONTEXT:
- File Path: ${context.filePath}
- File Type: ${context.fileType}
- Dependencies: ${context.dependencies.join(', ')}

MIGRATION RULES:
Must Preserve: ${spec.rules.mustPreserve.join(', ')}
Must Transform: ${spec.rules.mustTransform.join(', ')}
Must Remove: ${spec.rules.mustRemove.join(', ')}

IMPORT MAPPINGS:
${Object.entries(spec.mappings.imports).map(([from, to]) => `${from} → ${to}`).join('\n')}

LIFECYCLE MAPPINGS:
${Object.entries(spec.target.lifecycleMappings).map(([from, to]) => `${from} → ${to}`).join('\n')}

COMPONENT CONVENTIONS:
- File Extension: ${spec.target.componentConventions.fileExtension}
- Naming Convention: ${spec.target.componentConventions.namingConvention}
- Export Style: ${spec.target.componentConventions.exportStyle}
${spec.target.componentConventions.serverComponents ? '- Use Server Components where possible' : ''}

SOURCE CODE:
\`\`\`${spec.source.language}
${code}
\`\`\`

INSTRUCTIONS:
1. Transform the component to ${spec.target.framework} following the conventions above
2. Apply all import mappings
3. Transform lifecycle methods according to mappings
4. Preserve business logic and component behavior
5. Add comments explaining significant changes
6. Ensure the code follows ${spec.target.framework} best practices
7. **CRITICAL**: The "code" field MUST contain COMPLETE, VALID, RUNNABLE JavaScript/TypeScript code
8. **CRITICAL**: Do NOT use placeholders like "// ... rest of code" or "// implementation here"
9. **CRITICAL**: Every variable declaration MUST have an initializer (e.g., const x = value, not const x)
10. **CRITICAL**: All functions must have complete implementations
11. **CRITICAL**: The code must be syntactically valid and parseable

Respond in the following JSON format:
{
  "code": "COMPLETE transformed code here - must be valid, runnable code with NO placeholders",
  "confidence": 0-100,
  "reasoning": "explanation of changes made",
  "warnings": ["any warnings or concerns"],
  "requiresReview": true/false
}

IMPORTANT: 
- Return ONLY valid JSON, no additional text
- The "code" field must contain COMPLETE, VALID, SYNTACTICALLY CORRECT code
- NO placeholders, NO incomplete declarations, NO "// rest of code" comments
- Every const/let/var MUST have an initializer
- All imports must be complete
- All functions must have complete bodies`
  }

  /**
   * Build prompt for boilerplate generation
   */
  private buildBoilerplatePrompt(
    fileType: string,
    spec: MigrationSpecification
  ): string {
    const isTypeScript = spec.target.componentConventions.fileExtension.includes('ts')
    const useServerComponents = spec.target.componentConventions.serverComponents

    // Specific prompts for different file types
    const fileTypePrompts: Record<string, string> = {
      'root-layout': `Generate a root layout component for Next.js ${spec.target.version} App Router.
- Include <html> and <body> tags
- Add metadata export for SEO
- Include children prop
${isTypeScript ? '- Use TypeScript with proper types' : ''}
${useServerComponents ? '- This is a Server Component by default' : ''}`,

      'loading': `Generate a loading component for Next.js ${spec.target.version} App Router.
- Show a loading skeleton or spinner
- Use Suspense-compatible structure
${isTypeScript ? '- Use TypeScript' : ''}`,

      'error-boundary': `Generate an error boundary component for Next.js ${spec.target.version} App Router.
- Must be a Client Component ('use client')
- Accept error and reset props
- Show user-friendly error message
- Include retry button
${isTypeScript ? '- Use TypeScript with proper types' : ''}`,

      'not-found': `Generate a 404 not found page for Next.js ${spec.target.version}.
- Show user-friendly 404 message
- Include link back to home
${isTypeScript ? '- Use TypeScript' : ''}`,

      'next-config': `Generate a next.config.js for Next.js ${spec.target.version}.
- Include common configuration options
- Enable ${spec.target.routing === 'app-router' ? 'App Router' : 'Pages Router'}
- Configure ${spec.target.buildTool || 'webpack'}
${isTypeScript ? '- Add TypeScript support' : ''}`,

      'tsconfig': `Generate a tsconfig.json for Next.js ${spec.target.version} with TypeScript.
- Include Next.js recommended settings
- Enable strict mode
- Configure path aliases
- Set up proper module resolution`,

      'middleware': `Generate a middleware.ts for Next.js ${spec.target.version}.
- Include basic middleware structure
- Add matcher configuration
- Include common use cases (auth, redirects)
${isTypeScript ? '- Use TypeScript with NextRequest/NextResponse types' : ''}`,

      'nuxt-config': `Generate a nuxt.config.ts for Nuxt ${spec.target.version}.
- Include common configuration
- Set up modules and plugins
- Configure build options
${isTypeScript ? '- Use TypeScript' : ''}`,

      'nuxt-app': `Generate an app.vue for Nuxt ${spec.target.version}.
- Include <NuxtPage /> component
- Add basic layout structure
- Include head/meta configuration`,

      'nuxt-error': `Generate an error.vue for Nuxt ${spec.target.version}.
- Accept error prop
- Show user-friendly error message
- Include navigation back to home`,

      'vue-config': `Generate a ${spec.target.buildTool === 'vite' ? 'vite.config.ts' : 'vue.config.js'} for Vue ${spec.target.version}.
- Include Vue plugin configuration
- Set up path aliases
- Configure build options
${isTypeScript ? '- Use TypeScript' : ''}`,

      'vue-main': `Generate a main entry file for Vue ${spec.target.version}.
- Create Vue app instance
- Mount to #app element
- Import and use router if needed
${isTypeScript ? '- Use TypeScript' : ''}`,

      'vue-app': `Generate an App.vue for Vue ${spec.target.version}.
- Include <router-view /> if using router
- Add basic layout structure
- Use Composition API
${isTypeScript ? '- Use TypeScript with <script setup lang="ts">' : ''}`,

      'fastapi-main': `Generate a main.py for FastAPI ${spec.target.version}.
- Create FastAPI app instance
- Include CORS middleware
- Add basic health check endpoint
- Configure app metadata`,

      'fastapi-requirements': `Generate a requirements.txt for FastAPI ${spec.target.version}.
- Include FastAPI and uvicorn
- Add common dependencies (pydantic, python-dotenv)
- Pin versions for stability`,

      'fastapi-config': `Generate a config.py for FastAPI ${spec.target.version}.
- Use pydantic BaseSettings
- Load from environment variables
- Include common config (database, API keys)
- Add validation`,

      'api-route': `Generate an API route for Next.js ${spec.target.version} ${spec.target.routing === 'app-router' ? 'App Router' : 'Pages Router'}.
${spec.target.routing === 'app-router' ? `- Use route.ts with GET, POST, PUT, DELETE handlers
- Export async functions for each HTTP method
- Use NextRequest and NextResponse types
- Include error handling` : `- Use pages/api structure
- Export default handler function
- Handle different HTTP methods with req.method
- Include error handling`}
- Return JSON responses
- Add input validation
${isTypeScript ? '- Use TypeScript with proper types' : ''}`,
    }

    const specificPrompt = fileTypePrompts[fileType] || `Generate a ${fileType} file.`

    return `${specificPrompt}

TARGET FRAMEWORK: ${spec.target.framework} ${spec.target.version}
FILE TYPE: ${fileType}

CONVENTIONS:
- File Extension: ${spec.target.componentConventions.fileExtension}
- Naming Convention: ${spec.target.componentConventions.namingConvention}
- Export Style: ${spec.target.componentConventions.exportStyle}

FILE STRUCTURE:
${JSON.stringify(spec.target.fileStructure, null, 2)}

Generate a minimal, production-ready ${fileType} file following ${spec.target.framework} best practices.

IMPORTANT: Return ONLY the code, no explanations, no markdown code blocks, no additional text.`
  }

  /**
   * Build prompt for lifecycle method mapping
   */
  private buildLifecycleMappingPrompt(
    code: string,
    spec: MigrationSpecification
  ): string {
    return `Transform lifecycle methods in this ${spec.source.framework} code to ${spec.target.framework}.

SOURCE FRAMEWORK: ${spec.source.framework}
TARGET FRAMEWORK: ${spec.target.framework}

LIFECYCLE MAPPINGS:
${Object.entries(spec.target.lifecycleMappings).map(([from, to]) => `${from} → ${to}`).join('\n')}

TRANSFORMATION GUIDELINES:

1. componentDidMount:
   - Convert to useEffect with empty dependency array: useEffect(() => { /* logic */ }, [])
   - Preserve all initialization logic and side effects

2. componentWillUnmount:
   - Convert to useEffect cleanup function: useEffect(() => { return () => { /* cleanup */ } }, [])
   - Preserve all cleanup logic (event listeners, timers, subscriptions)

3. componentDidUpdate:
   - Convert to useEffect with dependencies: useEffect(() => { /* logic */ }, [dep1, dep2])
   - Identify which props/state trigger the update and add them to dependency array
   - Handle prevProps/prevState comparisons by storing previous values with useRef

4. shouldComponentUpdate:
   - Convert to React.memo for component-level optimization
   - Convert to useMemo for value-level optimization
   - Preserve comparison logic in memo comparison function

5. getDerivedStateFromProps:
   - Convert to useState with derived calculation logic
   - Use useEffect to update derived state when props change
   - Preserve all derivation logic

6. getSnapshotBeforeUpdate:
   - Convert to useRef to store snapshot values
   - Use useEffect to capture values before DOM updates
   - Preserve snapshot logic

7. componentDidCatch:
   - Keep as class component (Error Boundaries require classes in React)
   - Add comment explaining Error Boundaries cannot be hooks
   - Suggest wrapping functional component with Error Boundary

IMPORTANT RULES:
- Preserve ALL business logic exactly as-is
- Maintain the same behavior and side effects
- Keep all data fetching, subscriptions, and event handlers
- Preserve error handling logic
- Add comments explaining complex transformations
- Ensure hooks follow Rules of Hooks (top-level, not in conditions/loops)
- Combine multiple lifecycle methods into appropriate useEffect hooks when logical

SOURCE CODE:
\`\`\`${spec.source.language}
${code}
\`\`\`

Transform all lifecycle methods according to the mappings and guidelines above. Preserve all business logic and behavior.

Return ONLY the transformed code, no explanations or markdown formatting.`
  }

  /**
   * Call Claude API with retry logic
   */
  private async callClaudeWithRetry(prompt: string): Promise<string> {
    // Try multiple models in order of preference
    const modelsToTry = [
      process.env.ANTHROPIC_MODEL,
      'claude-sonnet-4-5-20250929',
      'claude-sonnet-4-5-20250929',
      'claude-3-sonnet-20240229',
      'claude-sonnet-4-5-20250929'
    ].filter(Boolean) as string[]
    
    console.log(`[AI Engine] Calling Claude API`)
    console.log(`[AI Engine] Models to try: ${modelsToTry.join(', ')}`)
    console.log(`[AI Engine] Prompt length: ${prompt.length} characters`)
    
    let lastError: Error | null = null

    // Try each model
    for (const model of modelsToTry) {
      console.log(`[AI Engine] Trying model: ${model}`)
      
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          console.log(`[AI Engine] Attempt ${attempt + 1}/${this.maxRetries} with ${model}`)
          
          const message = await this.client.messages.create({
            model,
            max_tokens: 4096,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          })

          console.log(`[AI Engine] ✓ Received response from Claude`)
          console.log(`[AI Engine] Response ID: ${message.id}`)
          console.log(`[AI Engine] Model used: ${message.model}`)
          console.log(`[AI Engine] Stop reason: ${message.stop_reason}`)
          console.log(`[AI Engine] Input tokens: ${message.usage.input_tokens}`)
          console.log(`[AI Engine] Output tokens: ${message.usage.output_tokens}`)

          const content = message.content[0]
          if (content.type === 'text') {
            console.log(`[AI Engine] ✓ Successfully extracted text response (${content.text.length} chars)`)
            console.log(`[AI Engine] ✓✓✓ SUCCESS with model: ${model} ✓✓✓`)
            return content.text
          }

          console.error(`[AI Engine] ✗ Unexpected response format:`, content.type)
          throw new Error('Unexpected response format from Claude API')
        } catch (error: any) {
          lastError = error as Error
          
          console.error(`[AI Engine] ✗ Attempt ${attempt + 1} with ${model} failed:`, error.message)
          
          // Log detailed error information
          if (error.status) {
            console.error(`[AI Engine] HTTP Status: ${error.status}`)
          }
          if (error.error) {
            console.error(`[AI Engine] Error details:`, JSON.stringify(error.error, null, 2))
          }
          
          // If it's a 404 model not found, try the next model immediately
          if (error.status === 404 && error.error?.error?.type === 'not_found_error') {
            console.warn(`[AI Engine] ⚠ Model ${model} not found, trying next model...`)
            break // Break inner loop to try next model
          }
          
          // Don't retry on certain errors
          if (this.isNonRetryableError(error)) {
            console.error(`[AI Engine] ✗ Non-retryable error detected, trying next model`)
            break // Try next model
          }

          // Wait before retrying with exponential backoff
          if (attempt < this.maxRetries - 1) {
            const delay = this.retryDelayMs * Math.pow(2, attempt)
            console.log(`[AI Engine] Waiting ${delay}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, delay))
          } else {
            console.error(`[AI Engine] ✗ All ${this.maxRetries} attempts failed for ${model}`)
          }
        }
      }
    }

    console.error(`[AI Engine] ✗✗✗ All models failed ✗✗✗`)
    throw lastError || new Error('Failed to call Claude API with all available models')
  }

  /**
   * Parse AI response into structured result
   */
  private parseAIResponse(response: string): AITransformResult {
    console.log(`[AI Engine] Parsing AI response (${response.length} chars)`)
    
    try {
      // Clean the response - remove any leading/trailing whitespace and potential markdown
      let cleanResponse = response.trim()
      
      // Remove markdown code blocks if present
      const jsonBlockStart = '```json'
      const codeBlockStart = '```'
      
      if (cleanResponse.startsWith(jsonBlockStart)) {
        console.log('[AI Engine] Removing JSON markdown wrapper')
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanResponse.startsWith(codeBlockStart)) {
        console.log('[AI Engine] Removing markdown wrapper')
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      cleanResponse = cleanResponse.trim()
      
      console.log(`[AI Engine] Attempting to parse as JSON...`)
      console.log(`[AI Engine] Clean response preview: ${cleanResponse.substring(0, 200)}...`)
      
      const parsed = JSON.parse(cleanResponse)
      
      console.log(`[AI Engine] ✓ Successfully parsed JSON response`)
      console.log(`[AI Engine] Confidence: ${parsed.confidence || 50}`)
      console.log(`[AI Engine] Requires review: ${parsed.requiresReview !== false}`)
      console.log(`[AI Engine] Warnings: ${(parsed.warnings || []).length}`)
      console.log(`[AI Engine] Code length: ${(parsed.code || '').length} chars`)
      
      // Validate that we have the required fields
      if (!parsed.code) {
        console.error(`[AI Engine] ✗ No code field in parsed response`)
        throw new Error('No code field in response')
      }
      
      return {
        code: parsed.code,
        confidence: parsed.confidence || 50,
        reasoning: parsed.reasoning || '',
        warnings: parsed.warnings || [],
        requiresReview: parsed.requiresReview !== false,
      }
    } catch (error) {
      // If not JSON, treat entire response as code
      console.error(`[AI Engine] ✗ JSON parsing failed:`, error)
      console.log(`[AI Engine] Response is not JSON, treating as raw code`)
      console.log(`[AI Engine] Raw response preview: ${response.substring(0, 500)}...`)
      
      return {
        code: response,
        confidence: 50,
        reasoning: 'AI response was not in expected JSON format',
        warnings: ['Response format was unexpected'],
        requiresReview: true,
      }
    }
  }

  /**
   * Extract code from AI response (handles markdown code blocks)
   */
  private extractCodeFromResponse(response: string): string {
    // Remove markdown code blocks if present
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/
    const match = response.match(codeBlockRegex)
    
    if (match) {
      return match[1].trim()
    }

    return response.trim()
  }

  /**
   * Determine new file path based on target conventions
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
    const originalExt = fileName.substring(fileNameWithoutExt.length)

    // Special files that should keep their original name and extension
    const specialFiles = [
      'next.config.js',
      'next.config.mjs',
      'nuxt.config.ts',
      'nuxt.config.js',
      'vite.config.ts',
      'vite.config.js',
      'vue.config.js',
      'tsconfig.json',
      'package.json',
      'requirements.txt',
      'main.py',
      'config.py',
      'app.vue',
      'error.vue',
      'middleware.ts',
      'middleware.js',
    ]

    // If it's a special file, return as-is
    if (specialFiles.includes(fileName)) {
      return originalPath
    }

    // Special Next.js App Router files (layout, loading, error, not-found, page)
    const appRouterFiles = ['layout', 'loading', 'error', 'not-found', 'page']
    if (appRouterFiles.includes(fileNameWithoutExt) && 
        (originalExt === '.tsx' || originalExt === '.jsx' || originalExt === '.ts' || originalExt === '.js')) {
      // Keep these files in their current location if already in target structure
      if (originalPath.startsWith(fileStructure.pages) || 
          originalPath.startsWith(fileStructure.layouts)) {
        return originalPath
      }
    }

    // Determine file type and new directory
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

    // Apply naming convention
    let newFileName = fileNameWithoutExt
    if (componentConventions.namingConvention === 'PascalCase') {
      newFileName = this.toPascalCase(fileNameWithoutExt)
    } else if (componentConventions.namingConvention === 'camelCase') {
      newFileName = this.toCamelCase(fileNameWithoutExt)
    } else if (componentConventions.namingConvention === 'kebab-case') {
      newFileName = this.toKebabCase(fileNameWithoutExt)
    }

    // Add extension
    newFileName += componentConventions.fileExtension

    return `${newDir}/${newFileName}`
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: any): boolean {
    // Authentication errors
    if (error.status === 401 || error.status === 403) {
      return true
    }

    // Invalid request errors
    if (error.status === 400) {
      return true
    }

    return false
  }

  /**
   * Handle AI service errors
   */
  private handleAIError(error: any): AIServiceError {
    const retryable = !this.isNonRetryableError(error)
    
    let message = 'AI transformation failed'
    if (error.message) {
      message = `AI transformation failed: ${error.message}`
    }

    const aiError: AIServiceError = {
      name: 'AIServiceError',
      message,
      code: 'AI_SERVICE_ERROR',
      recoverable: retryable,
      retryable,
    }

    return aiError
  }
}
