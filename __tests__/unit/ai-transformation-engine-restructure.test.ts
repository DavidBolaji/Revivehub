import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AITransformationEngine } from '@/lib/migration/ai-transformation-engine'
import type { MigrationSpecification } from '@/types/migration'

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: '// Generated boilerplate code',
            },
          ],
        }),
      },
    })),
  }
})

describe('AITransformationEngine - File Layout Restructuring', () => {
  let engine: AITransformationEngine
  let mockSpec: MigrationSpecification

  beforeEach(() => {
    engine = new AITransformationEngine('test-api-key')

    mockSpec = {
      source: {
        language: 'javascript',
        framework: 'react',
        version: '18.2.0',
        routing: 'react-router',
        patterns: {},
        buildTool: 'webpack',
        packageManager: 'npm',
      },
      target: {
        language: 'typescript',
        framework: 'nextjs',
        version: '14.0.0',
        routing: 'app-router',
        fileStructure: {
          pages: 'app',
          components: 'components',
          layouts: 'app',
          api: 'app/api',
        },
        componentConventions: {
          fileExtension: '.tsx',
          namingConvention: 'PascalCase',
          exportStyle: 'default',
          serverComponents: true,
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {},
        buildTool: 'turbopack',
        packageManager: 'pnpm',
      },
      mappings: {
        imports: {},
        routing: {},
        components: {},
        styling: {},
        stateManagement: {},
        buildSystem: {},
      },
      rules: {
        mustPreserve: [],
        mustTransform: [],
        mustRemove: [],
        mustRefactor: [],
        breakingChanges: [],
        deprecations: [],
      },
      metadata: {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        estimatedComplexity: 'medium',
        estimatedDuration: '2-4 hours',
      },
    }
  })

  describe('restructureFileLayout', () => {
    it('should move files to target directory structure', async () => {
      const files = new Map([
        ['src/pages/Home.jsx', 'export default function Home() {}'],
        ['src/components/Button.jsx', 'export default function Button() {}'],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      // Check that files were moved to new locations
      expect(result.size).toBeGreaterThan(0)
      
      // Check that page files moved to app directory
      const pageFiles = Array.from(result.keys()).filter(path => path.includes('app/'))
      expect(pageFiles.length).toBeGreaterThan(0)
    })

    it('should rename files with appropriate extensions', async () => {
      const files = new Map([
        ['src/pages/Home.jsx', 'export default function Home() {}'],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      // Check that files have .tsx extension
      const tsxFiles = Array.from(result.keys()).filter(path => path.endsWith('.tsx'))
      expect(tsxFiles.length).toBeGreaterThan(0)
    })

    it('should generate missing Next.js App Router files', async () => {
      const files = new Map([
        ['src/pages/Home.jsx', 'export default function Home() {}'],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      // Check for generated files
      const paths = Array.from(result.keys())
      
      // Should generate layout
      const hasLayout = paths.some(p => p.includes('layout.tsx'))
      expect(hasLayout).toBe(true)

      // Should generate config
      const hasConfig = paths.some(p => p.includes('next.config.js'))
      expect(hasConfig).toBe(true)
    })

    it('should not duplicate existing files', async () => {
      const files = new Map([
        ['app/layout.tsx', 'export default function Layout() {}'],
        ['next.config.js', 'module.exports = {}'],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      // Count layout files
      const layoutFiles = Array.from(result.keys()).filter(p => p.includes('layout.tsx'))
      expect(layoutFiles.length).toBe(1)

      // Count config files
      const configFiles = Array.from(result.keys()).filter(p => p.includes('next.config.js'))
      expect(configFiles.length).toBe(1)
    })

    it('should handle Nuxt framework', async () => {
      const nuxtSpec = {
        ...mockSpec,
        target: {
          ...mockSpec.target,
          framework: 'nuxt',
          version: '3.0.0',
          routing: 'file-based',
        },
      }

      const files = new Map([
        ['src/pages/index.vue', '<template><div>Home</div></template>'],
      ])

      const result = await engine.restructureFileLayout(files, nuxtSpec)

      // Should generate nuxt.config.ts
      const hasNuxtConfig = Array.from(result.keys()).some(p => p.includes('nuxt.config.ts'))
      expect(hasNuxtConfig).toBe(true)

      // Should generate app.vue
      const hasAppVue = Array.from(result.keys()).some(p => p.includes('app.vue'))
      expect(hasAppVue).toBe(true)
    })

    it('should handle Vue framework', async () => {
      const vueSpec = {
        ...mockSpec,
        target: {
          ...mockSpec.target,
          framework: 'vue',
          version: '3.0.0',
          buildTool: 'vite',
          componentConventions: {
            ...mockSpec.target.componentConventions,
            fileExtension: '.ts',
          },
        },
      }

      const files = new Map([
        ['src/components/Button.vue', '<template><button>Click</button></template>'],
      ])

      const result = await engine.restructureFileLayout(files, vueSpec)

      // Should generate vite.config.ts
      const hasViteConfig = Array.from(result.keys()).some(p => p.includes('vite.config.ts'))
      expect(hasViteConfig).toBe(true)

      // Should generate main entry
      const hasMain = Array.from(result.keys()).some(p => p.includes('main.ts'))
      expect(hasMain).toBe(true)
    })

    it('should handle FastAPI framework', async () => {
      const fastapiSpec = {
        ...mockSpec,
        source: {
          ...mockSpec.source,
          language: 'python',
          framework: 'flask',
        },
        target: {
          ...mockSpec.target,
          language: 'python',
          framework: 'fastapi',
          version: '0.100.0',
          componentConventions: {
            fileExtension: '.py',
            namingConvention: 'kebab-case' as const,
            exportStyle: 'named' as const,
          },
        },
      }

      const files = new Map([
        ['app/routes/users.py', 'def get_users(): pass'],
      ])

      const result = await engine.restructureFileLayout(files, fastapiSpec)

      // Should generate main.py
      const hasMain = Array.from(result.keys()).some(p => p.includes('main.py'))
      expect(hasMain).toBe(true)

      // Should generate requirements.txt
      const hasRequirements = Array.from(result.keys()).some(p => p.includes('requirements.txt'))
      expect(hasRequirements).toBe(true)
    })

    it('should apply PascalCase naming convention', async () => {
      const files = new Map([
        ['src/components/my-button.jsx', 'export default function MyButton() {}'],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      // Check that file names are in PascalCase
      const hasPascalCase = Array.from(result.keys()).some(p => p.includes('MyButton.tsx'))
      expect(hasPascalCase).toBe(true)
    })

    it('should preserve file content during restructuring', async () => {
      const originalContent = 'export default function Home() { return <div>Hello</div> }'
      const files = new Map([
        ['src/pages/Home.jsx', originalContent],
      ])

      const result = await engine.restructureFileLayout(files, mockSpec)

      // Find the restructured file
      const restructuredFile = Array.from(result.entries()).find(([path]) => 
        path.includes('Home.tsx')
      )

      expect(restructuredFile).toBeDefined()
      expect(restructuredFile![1]).toContain('Hello')
    })
  })

  describe('generateBoilerplate', () => {
    it('should generate Next.js root layout', async () => {
      const result = await engine.generateBoilerplate('root-layout', mockSpec)

      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should generate Next.js error boundary', async () => {
      const result = await engine.generateBoilerplate('error-boundary', mockSpec)

      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should generate Next.js config', async () => {
      const result = await engine.generateBoilerplate('next-config', mockSpec)

      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })
  })
})
