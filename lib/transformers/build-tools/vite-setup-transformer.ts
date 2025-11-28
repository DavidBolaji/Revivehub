/**
 * ViteSetupTransformer - Automatically sets up Vite for React projects
 * 
 * This transformer:
 * - Detects React projects without modern build tools
 * - Adds Vite configuration and dependencies
 * - Updates package.json scripts
 * - Creates/updates entry point files (main.jsx, index.html)
 * - Ensures proper React 18+ setup
 * 
 * Triggers when:
 * - Project has React dependencies
 * - Build health score < 20/20
 * - No modern build tool detected (Vite, esbuild, Turbopack)
 * 
 * @example
 * ```typescript
 * const transformer = new ViteSetupTransformer()
 * const results = await transformer.setupVite(projectFiles, packageJson)
 * ```
 */

import { BaseTransformer } from '../base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
} from '@/types/transformer'
import type { SourceStack } from '@/lib/planner/types'

/**
 * Interface for Vite setup configuration
 */
interface ViteSetupConfig {
  projectName: string
  hasTypeScript: boolean
  reactVersion: string
  entryPoint: string // 'src/main.jsx' or 'src/index.js'
}

/**
 * Interface for file generation result
 */
interface GeneratedFile {
  path: string
  content: string
  action: 'create' | 'update' | 'delete'
}

/**
 * Transformer for setting up Vite in React projects
 */
export class ViteSetupTransformer extends BaseTransformer {
  constructor() {
    super('ViteSetup', ['build-tool'], ['React'])
  }

  /**
   * Main transform method - sets up Vite for a React project
   * 
   * @param code - File content (package.json or empty for new files)
   * @param options - Transformation options
   * @param task - Task information
   * @returns Transformation result with all Vite setup files
   */
  async transform(
    code: string,
    options: TransformOptions,
    _task?: Task
  ): Promise<TransformResult> {
    const metadata = this.createBaseMetadata(['package.json', 'vite.config.js', 'index.html', 'src/main.jsx'], 90)

    try {
      // Determine what file we're processing based on filePath
      const filePath = options.filePath || 'package.json'
      
      // Handle different file types
      if (filePath === 'package.json') {
        return this.handlePackageJson(code, options, metadata)
      } else if (filePath === 'vite.config.js') {
        return this.handleViteConfig(code, options, metadata)
      } else if (filePath === 'index.html') {
        return this.handleIndexHtml(code, options, metadata)
      } else if (filePath === 'src/main.jsx') {
        return this.handleMainEntry(code, options, metadata)
      } else if (filePath === '.eslintrc.json') {
        return this.handleEslintConfig(code, options, metadata)
      } else if (filePath === '.prettierrc') {
        return this.handlePrettierConfig(code, options, metadata)
      } else if (filePath === '.eslintignore') {
        return this.handleEslintIgnore(code, options, metadata)
      } else if (filePath === '.prettierignore') {
        return this.handlePrettierIgnore(code, options, metadata)
      }
      
      // Fallback - return unchanged
      return {
        success: true,
        code,
        errors: [],
        warnings: [`Skipped ${filePath} - not handled by ViteSetup transformer`],
        metadata,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to setup Vite'
      return {
        success: false,
        code,
        errors: [{
          message: errorMessage,
          code: 'VITE_SETUP_ERROR',
          suggestions: ['Check if package.json is valid JSON', 'Ensure React dependencies are present'],
          severity: 'error' as const,
        }],
        warnings: [],
        metadata,
      }
    }
  }

  /**
   * Handle vite.config.js creation
   */
  private async handleViteConfig(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    // Get config from repository context
    const packageJson = options.repository ? await this.getPackageJson(options.repository) : null
    const config = packageJson ? this.detectProjectConfig(packageJson) : {
      projectName: 'react-app',
      hasTypeScript: false,
      reactVersion: '^18.3.1',
      entryPoint: 'src/main.jsx'
    }
    
    const viteConfig = this.generateViteConfig(config)
    
    return {
      success: true,
      code: viteConfig,
      errors: [],
      warnings: [],
      metadata: {
        ...metadata,
        linesAdded: viteConfig.split('\n').length,
        transformationsApplied: ['Created Vite configuration'],
      },
    }
  }

  /**
   * Handle index.html creation
   */
  private async handleIndexHtml(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    const packageJson = options.repository ? await this.getPackageJson(options.repository) : null
    const config = packageJson ? this.detectProjectConfig(packageJson) : {
      projectName: 'react-app',
      hasTypeScript: false,
      reactVersion: '^18.3.1',
      entryPoint: 'src/main.jsx'
    }
    
    const indexHtml = this.generateIndexHtml(config)
    
    return {
      success: true,
      code: indexHtml,
      errors: [],
      warnings: [],
      metadata: {
        ...metadata,
        linesAdded: indexHtml.split('\n').length,
        transformationsApplied: ['Created root index.html for Vite'],
      },
    }
  }

  /**
   * Handle src/main.jsx creation
   */
  private async handleMainEntry(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    const packageJson = options.repository ? await this.getPackageJson(options.repository) : null
    const config = packageJson ? this.detectProjectConfig(packageJson) : {
      projectName: 'react-app',
      hasTypeScript: false,
      reactVersion: '^18.3.1',
      entryPoint: 'src/main.jsx'
    }
    
    const mainEntry = this.generateMainEntry(config)
    
    return {
      success: true,
      code: mainEntry,
      errors: [],
      warnings: [],
      metadata: {
        ...metadata,
        linesAdded: mainEntry.split('\n').length,
        transformationsApplied: ['Created Vite entry point'],
      },
    }
  }

  /**
   * Handle .eslintrc.json creation
   */
  private async handleEslintConfig(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    const eslintConfig = {
      "env": {
        "browser": true,
        "es2021": true
      },
      "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:react/jsx-runtime"
      ],
      "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
      },
      "settings": {
        "react": {
          "version": "detect"
        }
      },
      "rules": {}
    }
    
    const content = JSON.stringify(eslintConfig, null, 2)
    
    return {
      success: true,
      code: content,
      errors: [],
      warnings: [],
      metadata: {
        ...metadata,
        linesAdded: content.split('\n').length,
        transformationsApplied: ['Created ESLint configuration'],
      },
    }
  }

  /**
   * Handle .prettierrc creation
   */
  private async handlePrettierConfig(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    const prettierConfig = {
      "semi": true,
      "singleQuote": true,
      "tabWidth": 2,
      "trailingComma": "es5"
    }
    
    const content = JSON.stringify(prettierConfig, null, 2)
    
    return {
      success: true,
      code: content,
      errors: [],
      warnings: [],
      metadata: {
        ...metadata,
        linesAdded: content.split('\n').length,
        transformationsApplied: ['Created Prettier configuration'],
      },
    }
  }

  /**
   * Handle .eslintignore creation
   */
  private async handleEslintIgnore(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    const content = `node_modules
dist
build
.env
*.config.js
`
    
    return {
      success: true,
      code: content,
      errors: [],
      warnings: [],
      metadata: {
        ...metadata,
        linesAdded: content.split('\n').length,
        transformationsApplied: ['Created ESLint ignore file'],
      },
    }
  }

  /**
   * Handle .prettierignore creation
   */
  private async handlePrettierIgnore(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    const content = `node_modules
dist
build
.env
package-lock.json
pnpm-lock.yaml
yarn.lock
`
    
    return {
      success: true,
      code: content,
      errors: [],
      warnings: [],
      metadata: {
        ...metadata,
        linesAdded: content.split('\n').length,
        transformationsApplied: ['Created Prettier ignore file'],
      },
    }
  }

  /**
   * Get package.json from repository
   */
  private async getPackageJson(repository: { owner: string; name: string }): Promise<any> {
    try {
      const response = await fetch(`/api/github/content/${repository.owner}/${repository.name}/package.json`)
      if (response.ok) {
        const data = await response.json()
        if (data.content) {
          return JSON.parse(data.content)
        }
      }
    } catch (error) {
      console.warn('Failed to fetch package.json:', error)
    }
    return null
  }

  /**
   * Handle package.json transformation
   */
  private async handlePackageJson(
    code: string,
    options: TransformOptions,
    metadata: any
  ): Promise<TransformResult> {
    try {
      // Parse package.json - this should have content
      if (!code.trim()) {
        return {
          success: false,
          code,
          errors: [{
            message: 'package.json is empty',
            code: 'EMPTY_PACKAGE_JSON',
            suggestions: ['Ensure package.json exists and has valid content'],
            severity: 'error' as const,
          }],
          warnings: [],
          metadata,
        }
      }

      const packageJson = JSON.parse(code)
      
      // Detect configuration
      const config = this.detectProjectConfig(packageJson)
      
      // Check if Vite setup is needed
      if (!this.shouldSetupVite(packageJson)) {
        return {
          success: false,
          code,
          errors: [],
          warnings: ['Vite setup not needed - modern build tool already present'],
          metadata: {
            ...metadata,
            requiresManualReview: false,
          },
        }
      }

      // Process repository files for JS to JSX conversion
      let repositoryFiles: Map<string, string> = new Map()
      let jsToJsxConversions: Array<{originalPath: string, newPath: string, content: string}> = []
      
      if (options.repositoryFiles) {
        console.log(`[ViteSetupTransformer] Processing ${options.repositoryFiles.length} repository files for JS to JSX conversion`)
        
        // Convert array to Map and filter for JS files
        for (const file of options.repositoryFiles) {
          if (file.path.endsWith('.js') && 
              !file.path.includes('.min.') &&
              !file.path.includes('node_modules') &&
              (file.path.includes('src/') || file.path.includes('components/') || file.path.includes('pages/'))) {
            repositoryFiles.set(file.path, file.content)
          }
        }
        
        console.log(`[ViteSetupTransformer] Found ${repositoryFiles.size} JS files to analyze`)
        jsToJsxConversions = await this.convertJsFilesToJsx(repositoryFiles)
        console.log(`[ViteSetupTransformer] Converted ${jsToJsxConversions.length} JS files to JSX`)
      }

      // Generate all necessary files
      const generatedFiles = this.generateViteFiles(config)
      
      // Update package.json
      const updatedPackageJson = this.updatePackageJson(packageJson, config)
      
      // Create transformation result
      const transformedCode = JSON.stringify(updatedPackageJson, null, 2)
      
      // Calculate changes
      const linesAdded = transformedCode.split('\n').length - code.split('\n').length
      
      return {
        success: true,
        code: transformedCode,
        errors: [],
        warnings: [],
        metadata: {
          ...metadata,
          linesAdded: Math.max(0, linesAdded),
          linesRemoved: Math.max(0, -linesAdded),
          transformationsApplied: [
            'Added Vite dependencies',
            'Updated build scripts',
            'Created Vite configuration',
            'Updated entry points',
            ...(jsToJsxConversions.length > 0 ? [`Converted ${jsToJsxConversions.length} JS files to JSX`] : [])
          ],
          notes: [
            `Vite ${config.hasTypeScript ? 'with TypeScript' : ''} setup complete`,
            `Entry point: ${config.entryPoint}`,
            `Generated ${generatedFiles.length} configuration files`,
            ...generatedFiles.map(f => {
              if (f.action === 'create') return `✨ Created: ${f.path}`
              if (f.action === 'delete') return `🗑️  Removed: ${f.path} (moved to root)`
              return `📝 Updated: ${f.path}`
            }),
            ...(jsToJsxConversions.length > 0 ? [
              `🔄 Converted ${jsToJsxConversions.length} JS files to JSX`
            ] : []),
          ],
          additionalFiles: new Map([
            ...generatedFiles.filter(f => f.action !== 'delete').map(f => [f.path, f.content] as [string, string]),
            ...jsToJsxConversions.map(c => [c.newPath, c.content] as [string, string])
          ]),
          jsToJsxConversions
        },
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to setup Vite'
      return {
        success: false,
        code,
        errors: [{
          message: errorMessage,
          code: 'VITE_SETUP_ERROR',
          suggestions: ['Check if package.json is valid JSON', 'Ensure React dependencies are present'],
          severity: 'error' as const,
        }],
        warnings: [],
        metadata,
      }
    }
  }

  /**
   * Detect project configuration from package.json
   */
  private detectProjectConfig(packageJson: any): ViteSetupConfig {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    const hasTypeScript = 'typescript' in dependencies || '@types/react' in dependencies
    const reactVersion = dependencies.react || '^18.3.1'
    const projectName = packageJson.name || 'react-app'
    
    // Determine entry point based on existing structure
    const entryPoint = hasTypeScript ? 'src/main.tsx' : 'src/main.jsx'
    
    return {
      projectName,
      hasTypeScript,
      reactVersion,
      entryPoint,
    }
  }

  /**
   * Check if Vite setup is needed
   */
  private shouldSetupVite(packageJson: any): boolean {
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
    
    // Check if modern build tools already exist
    const modernBuildTools = ['vite', 'esbuild', 'turbopack', '@vitejs/plugin-react']
    const hasModernTool = modernBuildTools.some(tool => tool in dependencies)
    
    if (hasModernTool) {
      return false
    }
    
    // Check if React is present
    const hasReact = 'react' in dependencies || 'react' in (packageJson.dependencies || {})
    
    return hasReact
  }

  /**
   * Generate all Vite-related files
   */
  private generateViteFiles(config: ViteSetupConfig): GeneratedFile[] {
    const files: GeneratedFile[] = []
    
    // 1. vite.config.js (or .ts)
    files.push({
      path: config.hasTypeScript ? 'vite.config.ts' : 'vite.config.js',
      content: this.generateViteConfig(config),
      action: 'create',
    })
    
    // 2. index.html - Vite requires it in root, not public/
    // If there's a public/index.html, this will replace it
    files.push({
      path: 'index.html',
      content: this.generateIndexHtml(config),
      action: 'update',
    })
    
    // 3. Mark old public/index.html for deletion if it exists
    files.push({
      path: 'public/index.html',
      content: '', // Empty content signals deletion
      action: 'delete' as any,
    })
    
    // 4. src/main.jsx (or .tsx)
    files.push({
      path: config.entryPoint,
      content: this.generateMainEntry(config),
      action: 'update',
    })
    
    return files
  }

  /**
   * Generate vite.config.js content
   */
  private generateViteConfig(config: ViteSetupConfig): string {
    if (config.hasTypeScript) {
      return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
`
    }
    
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`
  }

  /**
   * Generate index.html content
   */
  private generateIndexHtml(config: ViteSetupConfig): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${config.entryPoint}"></script>
  </body>
</html>
`
  }

  /**
   * Generate src/main.jsx content
   */
  private generateMainEntry(config: ViteSetupConfig): string {
    if (config.hasTypeScript) {
      return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
    }
    
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
  }

  /**
   * Update package.json with Vite dependencies and scripts
   */
  private updatePackageJson(packageJson: any, config: ViteSetupConfig): any {
    const updated = { ...packageJson }
    
    // Update scripts
    updated.scripts = {
      ...updated.scripts,
      dev: 'vite',
      build: 'vite build',
      preview: 'vite preview',
      // Keep existing test script or add default
      test: updated.scripts?.test || 'jest',
    }
    
    // Update dependencies - ensure React 18+
    updated.dependencies = {
      ...updated.dependencies,
      react: '^18.3.1',
      'react-dom': '^18.3.1',
    }
    
    // Update devDependencies
    updated.devDependencies = {
      ...updated.devDependencies,
      '@vitejs/plugin-react': '^4.3.0',
      vite: '^5.2.0',
    }
    
    // Add TypeScript dependencies if needed
    if (config.hasTypeScript) {
      updated.devDependencies = {
        ...updated.devDependencies,
        typescript: '^5.2.2',
        '@types/react': '^18.3.1',
        '@types/react-dom': '^18.3.0',
      }
    }
    
    // Add testing dependencies if not present
    if (!updated.devDependencies.jest && !updated.devDependencies.vitest) {
      updated.devDependencies = {
        ...updated.devDependencies,
        jest: '^29.7.0',
        '@testing-library/react': '^14.1.2',
        '@testing-library/jest-dom': '^6.4.2',
        '@testing-library/user-event': '^14.5.2',
      }
    }
    
    return updated
  }



  /**
   * Convert JS files to JSX if they contain JSX syntax
   */
  private async convertJsFilesToJsx(files: Map<string, string>): Promise<Array<{originalPath: string, newPath: string, content: string}>> {
    const conversions: Array<{originalPath: string, newPath: string, content: string}> = []
    
    for (const [filePath, content] of files.entries()) {
      if (filePath.endsWith('.js') && this.containsJsx(content)) {
        // Convert .js to .jsx
        const newPath = filePath.replace(/\.js$/, '.jsx')
        files.delete(filePath)
        files.set(newPath, content)
        conversions.push({
          originalPath: filePath,
          newPath: newPath,
          content: content
        })
      }
    }
    
    return conversions
  }

  /**
   * Check if file content contains JSX syntax
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

  /**
   * Override canHandle to specifically handle Vite setup tasks
   */
  canHandle(task: Task, sourceStack: SourceStack): boolean {
    console.log(`[ViteSetupTransformer] canHandle called for task: ${task.id}, pattern: ${task.pattern?.id}`)
    
    // First check the base implementation
    if (!super.canHandle(task, sourceStack)) {
      console.log(`[ViteSetupTransformer] Base canHandle returned false`)
      return false
    }
    
    // Specifically handle Vite setup tasks
    if (task.id === 'dep-vite-setup' || task.pattern?.id === 'vite-setup') {
      console.log(`[ViteSetupTransformer] Handling Vite setup task: ${task.id}`)
      return true
    }
    
    // Also handle if task name contains "vite"
    if (task.name?.toLowerCase().includes('vite')) {
      console.log(`[ViteSetupTransformer] Handling task with 'vite' in name: ${task.name}`)
      return true
    }
    
    console.log(`[ViteSetupTransformer] Cannot handle task: ${task.id}`)
    return false
  }

  /**
   * Check if a project needs Vite setup based on health score
   */
  static needsViteSetup(buildHealthScore: number, hasReact: boolean, hasModernBuildTool: boolean): boolean {
    return hasReact && buildHealthScore < 20 && !hasModernBuildTool
  }
}

export default ViteSetupTransformer
