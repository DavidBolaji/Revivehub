/**
 * BuildToolConfigGenerator - Generates appropriate build tool configuration
 * 
 * Intelligently detects project type and generates the right build config:
 * - Next.js: Uses Next.js built-in build (no additional config needed)
 * - React (non-Next.js): Generates Vite configuration
 * - Vue: Generates Vite configuration with Vue plugin
 * - Plain TypeScript: Generates tsconfig build configuration
 * 
 * This transformer is smart enough to skip if build tools already exist.
 */

import { BaseTransformer } from '../base-transformer'
import type {
  TransformOptions,
  TransformResult,
  Task,
} from '@/types/transformer'

export class BuildToolConfigGenerator extends BaseTransformer {
  constructor() {
    super('BuildToolConfigGenerator', ['build-tool'], ['*'])
  }

  async transform(
    code: string,
    options: TransformOptions,
    task?: Task
  ): Promise<TransformResult> {
    try {
      // Detect project type from options or repository files
      const projectType = this.detectProjectType(options)
      const filePath = options.filePath || ''
      
      // Detect entry point from task's affectedFiles
      const entryPoint = this.detectEntryPointFromTask(task)
      
      console.log(`[BuildToolConfigGenerator] Detected project type: ${projectType}, file: ${filePath}, entry point: ${entryPoint}`)

      // Next.js doesn't need additional build tool config
      if (projectType === 'nextjs') {
        return {
          success: true,
          code: '',
          metadata: this.createBaseMetadata([], 100),
          errors: [],
          warnings: ['Next.js uses its own build system - no additional build tool configuration needed'],
        }
      }

      // Handle different file types
      let generatedCode: string
      let transformationDesc: string
      let warnings: string[] = []

      console.log(`[BuildToolConfigGenerator] Processing file: ${filePath}`)

      if (filePath.includes('vite.config')) {
        // Generate Vite config
        switch (projectType) {
          case 'react':
            generatedCode = this.generateViteConfigForReact()
            transformationDesc = 'Generated Vite configuration for React'
            break
          case 'vue':
            generatedCode = this.generateViteConfigForVue()
            transformationDesc = 'Generated Vite configuration for Vue'
            break
          default:
            generatedCode = this.generateViteConfigGeneric()
            transformationDesc = 'Generated generic Vite configuration'
        }
        warnings = [
          'Review path aliases to ensure they match your tsconfig.json',
          'Adjust test configuration based on your testing needs',
        ]
      } else if (filePath === 'package.json') {
        // Update package.json with Vite scripts and dependencies
        console.log(`[BuildToolConfigGenerator] Received package.json content length: ${code.length}`)
        console.log(`[BuildToolConfigGenerator] First 200 chars:`, code.substring(0, 200))
        generatedCode = this.updatePackageJsonForVite(code, projectType)
        transformationDesc = 'Updated package.json with Vite scripts and dependencies'
        warnings = ['Run npm install or pnpm install to install new dependencies']
      } else if (filePath === 'index.html') {
        // Generate index.html for Vite
        generatedCode = this.generateIndexHtml(options, entryPoint)
        transformationDesc = 'Generated index.html for Vite'
      } else if (filePath.includes('src/main.') || filePath.includes('src/index.')) {
        // Generate entry point
        generatedCode = this.generateEntryPoint(code, projectType)
        transformationDesc = 'Generated Vite entry point'
      } else if (filePath === '.eslintrc.json') {
        generatedCode = this.generateESLintConfig()
        transformationDesc = 'Generated ESLint configuration'
      } else if (filePath === '.prettierrc') {
        generatedCode = this.generatePrettierConfig()
        transformationDesc = 'Generated Prettier configuration'
      } else if (filePath === '.eslintignore' || filePath === '.prettierignore') {
        generatedCode = this.generateIgnoreFile()
        transformationDesc = `Generated ${filePath}`
      } else if (filePath.includes('tsconfig')) {
        generatedCode = this.generateTSConfigBuild()
        transformationDesc = 'Generated TypeScript build configuration'
      } else {
        // Unknown file type
        return {
          success: false,
          metadata: this.createBaseMetadata([], 0),
          errors: [{
            message: `Unknown file type for build tool setup: ${filePath}`,
            code: 'UNKNOWN_FILE_TYPE',
            severity: 'error',
            suggestions: ['Check that the file is in the affectedFiles list'],
          }],
          warnings: [],
        }
      }

      const diff = this.generateDiff(code, generatedCode)

      return {
        success: true,
        code: generatedCode,
        diff,
        metadata: {
          ...this.createBaseMetadata([filePath], 85),
          linesAdded: generatedCode.split('\n').length,
          linesRemoved: code.split('\n').length,
          confidenceScore: 85,
          riskScore: 20,
          requiresManualReview: filePath === 'package.json',
          estimatedTimeSaved: '20 minutes',
          transformationsApplied: [transformationDesc],
        },
        errors: [],
        warnings,
      }
    } catch (error: any) {
      return {
        success: false,
        metadata: this.createBaseMetadata([], 0),
        errors: [
          {
            message: error.message || 'Failed to generate build tool config',
            code: 'GENERATION_ERROR',
            location: undefined,
            suggestions: [
              'Check project structure',
              'Ensure package.json is valid',
            ],
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * Detects the project type from options or repository files
   */
  private detectProjectType(options: TransformOptions): string {
    // Check repository files if available
    if (options.repositoryFiles) {
      const packageJsonFile = options.repositoryFiles.find(f => f.path === 'package.json')
      
      if (packageJsonFile) {
        try {
          const packageJson = JSON.parse(packageJsonFile.content)
          const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
          
          // Check for Next.js
          if (deps.next) return 'nextjs'
          
          // Check for Vue
          if (deps.vue) return 'vue'
          
          // Check for React (but not Next.js)
          if (deps.react) return 'react'
          
          // Check for TypeScript only
          if (deps.typescript && !deps.react && !deps.vue) return 'typescript'
        } catch (error) {
          console.error('[BuildToolConfigGenerator] Failed to parse package.json:', error)
        }
      }
    }
    
    // Default to generic
    return 'generic'
  }

  private generateViteConfigForReact(): string {
    return `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
`
  }

  private generateViteConfigForVue(): string {
    return `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
`
  }

  private generateViteConfigGeneric(): string {
    return `import { defineConfig } from 'vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MyLibrary',
      fileName: (format) => \`my-library.\${format}.js\`,
    },
  },
})
`
  }

  private generateTSConfigBuild(): string {
    return `{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
`
  }

  private updatePackageJsonForVite(existingContent: string, projectType: string): string {
    try {
      const packageJson = existingContent ? JSON.parse(existingContent) : {}
      
      console.log(`[BuildToolConfigGenerator] Current package.json scripts:`, packageJson.scripts)
      console.log(`[BuildToolConfigGenerator] Current package.json devDependencies:`, packageJson.devDependencies)
      
      // Detect if TypeScript is used
      const isTypeScript = projectType === 'typescript' || 
                          packageJson.dependencies?.typescript || 
                          packageJson.devDependencies?.typescript
      
      // Create clean scripts object (remove CRA scripts)
      packageJson.scripts = {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        test: 'vitest',
        lint: 'eslint .',
        format: 'prettier --write .',
      }
      
      // Move testing libraries from dependencies to devDependencies
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {}
      }
      
      const testingLibs = ['@testing-library/jest-dom', '@testing-library/react', '@testing-library/user-event']
      testingLibs.forEach(lib => {
        if (packageJson.dependencies && packageJson.dependencies[lib]) {
          packageJson.devDependencies[lib] = packageJson.dependencies[lib]
          delete packageJson.dependencies[lib]
        }
      })
      
      // Add Vite and Vitest dependencies
      packageJson.devDependencies.vite = '^5.2.0'
      packageJson.devDependencies.vitest = '^1.6.0'
      
      // Add ESLint and Prettier
      packageJson.devDependencies.eslint = '^9.0.0'
      packageJson.devDependencies.prettier = '^3.3.0'
      
      // Framework-specific plugins
      if (projectType === 'react') {
        packageJson.devDependencies['@vitejs/plugin-react'] = '^4.3.0'
        packageJson.devDependencies['eslint-plugin-react-hooks'] = '^5.0.0'
        packageJson.devDependencies['eslint-plugin-react-refresh'] = '^0.4.7'
        
        // Add TypeScript types for React if TypeScript is used
        if (isTypeScript) {
          packageJson.devDependencies.typescript = '^5.6.0'
          packageJson.devDependencies['@types/react'] = '^19.0.0'
          packageJson.devDependencies['@types/react-dom'] = '^19.0.0'
        }
      } else if (projectType === 'vue') {
        packageJson.devDependencies['@vitejs/plugin-vue'] = '^5.0.0'
      }
      
      // Remove react-scripts if present
      if (packageJson.dependencies && packageJson.dependencies['react-scripts']) {
        delete packageJson.dependencies['react-scripts']
      }
      if (packageJson.devDependencies && packageJson.devDependencies['react-scripts']) {
        delete packageJson.devDependencies['react-scripts']
      }
      
      // Remove CRA-specific configurations
      delete packageJson.eslintConfig
      delete packageJson.browserslist
      
      // Add Node engine requirement
      const engines = {
        node: '>=18'
      }
      
      // Reorder fields for clean output
      const orderedPackageJson = {
        name: packageJson.name,
        version: packageJson.version,
        private: packageJson.private,
        type: 'module',
        scripts: packageJson.scripts,
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies,
        engines,
      }
      
      console.log(`[BuildToolConfigGenerator] Updated package.json scripts:`, orderedPackageJson.scripts)
      console.log(`[BuildToolConfigGenerator] Updated package.json devDependencies:`, orderedPackageJson.devDependencies)
      
      return JSON.stringify(orderedPackageJson, null, 2)
    } catch (error) {
      console.error('[BuildToolConfigGenerator] Failed to parse package.json:', error)
      throw error
    }
  }

  private generateIndexHtml(options: TransformOptions, entryPoint: string): string {
    // Try to get project name from package.json
    let projectName = 'React App'
    
    if (options.repositoryFiles) {
      const packageJsonFile = options.repositoryFiles.find(f => f.path === 'package.json')
      if (packageJsonFile) {
        try {
          const packageJson = JSON.parse(packageJsonFile.content)
          projectName = packageJson.name || projectName
          // Convert kebab-case to Title Case
          projectName = projectName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        } catch (error) {
          console.error('[BuildToolConfigGenerator] Failed to parse package.json for title:', error)
        }
      }
    }
    
    console.log(`[BuildToolConfigGenerator] Using entry point in index.html: ${entryPoint}`)
    
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entryPoint}"></script>
  </body>
</html>
`
  }

  private generateEntryPoint(existingContent: string, projectType: string): string {
    // If there's existing content and it looks like a valid entry point, keep it
    if (existingContent && existingContent.includes('ReactDOM') && existingContent.includes('render')) {
      // Just ensure it uses the modern createRoot API
      if (!existingContent.includes('createRoot')) {
        // Update to use createRoot
        return existingContent
          .replace(/ReactDOM\.render\(/g, 'ReactDOM.createRoot(document.getElementById("root")).render(')
          .replace(/,\s*document\.getElementById\(['"]root['"]\)\s*\)/g, ')')
      }
      return existingContent
    }
    
    // Generate new entry point
    if (projectType === 'react') {
      return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
    } else if (projectType === 'vue') {
      return `import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
`
    }
    
    return existingContent
  }

  /**
   * Detects the entry point file from the task's affectedFiles
   */
  private detectEntryPointFromTask(task?: Task): string {
    if (!task?.affectedFiles) {
      return '/src/main.jsx' // default
    }
    
    // Find the entry point in affectedFiles (src/main.* or src/index.*)
    const entryPointFile = task.affectedFiles.find(f => 
      f.startsWith('src/main.') || f.startsWith('src/index.')
    )
    
    if (entryPointFile) {
      return `/${entryPointFile}`
    }
    
    return '/src/main.jsx' // default
  }

  private generateESLintConfig(): string {
    return `{
  "env": {
    "browser": true,
    "es2023": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react-hooks/recommended"
  ],
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": "latest"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
`
  }

  private generatePrettierConfig(): string {
    return `{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "es5"
}
`
  }

  private generateIgnoreFile(): string {
    return `dist
node_modules
`
  }

  canHandle(task: Task): boolean {
    console.log(`[BuildToolConfigGenerator] canHandle called for task: ${task.id}, pattern: ${task.pattern?.id}`)
    
    if (!task.pattern) {
      console.log(`[BuildToolConfigGenerator] No pattern found`)
      return false
    }
    
    // Don't handle Vite-specific tasks - let ViteSetupTransformer handle those
    if (task.id === 'dep-vite-setup' || task.pattern?.id === 'vite-setup') {
      console.log(`[BuildToolConfigGenerator] Rejecting Vite-specific task: ${task.id}`)
      return false
    }
    
    const description = task.pattern.description?.toLowerCase() || ''
    const taskName = task.name?.toLowerCase() || ''
    
    // Don't handle if task name specifically mentions vite setup
    if (taskName.includes('vite') && (taskName.includes('setup') || taskName.includes('install'))) {
      console.log(`[BuildToolConfigGenerator] Rejecting Vite setup task: ${taskName}`)
      return false
    }
    
    const canHandle = (
      task.pattern.category === 'build-tool' ||
      description.includes('build tool') ||
      description.includes('build config') ||
      taskName.includes('build') ||
      taskName.includes('webpack') ||
      taskName.includes('rollup')
    )
    
    console.log(`[BuildToolConfigGenerator] Can handle: ${canHandle}`)
    return canHandle
  }
}

// Export with both names for compatibility
export { BuildToolConfigGenerator as ViteConfigGenerator }
