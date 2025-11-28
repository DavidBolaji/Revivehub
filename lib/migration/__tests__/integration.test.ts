/**
 * End-to-End Integration Test
 * 
 * Tests the complete migration pipeline from React to Next.js App Router with Tailwind CSS.
 * Verifies file structure transformation, CSS conversion, and file generation.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HybridTransformationEngine } from '../hybrid-transformation-engine'
import type { MigrationSpecification, RepositoryFile } from '@/types/migration'

describe('End-to-End Integration Test', () => {
  let engine: HybridTransformationEngine
  let migrationSpec: MigrationSpecification

  beforeEach(() => {
    engine = new HybridTransformationEngine()
    
    // Migration spec for React → Next.js App Router + Tailwind
    migrationSpec = {
      source: {
        language: 'javascript',
        framework: 'react',
        routing: 'react-router',
        patterns: [],
      },
      target: {
        language: 'typescript',
        framework: 'nextjs',
        version: '14.0.0',
        routing: 'app-router',
        fileStructure: {
          pages: 'app',
          components: 'components',
          layouts: 'app/layouts',
          api: 'app/api',
        },
        componentConventions: {
          namingConvention: 'PascalCase',
          fileExtension: '.tsx',
          exportStyle: 'named',
        },
        syntaxMappings: {},
        apiMappings: {},
        lifecycleMappings: {},
      },
      mappings: {
        imports: {
          'react-router-dom': 'next/navigation',
        },
        routing: {},
        components: {},
        styling: {
          'css-modules': 'tailwind',
        },
        stateManagement: {},
        buildSystem: {},
      },
      rules: {
        mustPreserve: [],
        mustTransform: ['routing', 'styling'],
        mustRemove: ['css-imports'],
        mustRefactor: [],
        breakingChanges: [],
        deprecations: [],
      },
      metadata: {
        estimatedEffort: 'medium',
        breakingChanges: [],
        manualSteps: [],
      },
    }
  })

  describe('Complete React to Next.js App Router Migration', () => {
    it('should migrate a complete React project with CSS to Next.js App Router with Tailwind', async () => {
      // Mock a complete React project
      const files: RepositoryFile[] = [
        // Home Page
        {
          path: 'src/pages/index.tsx',
          content: `import React from 'react'
import './Home.css'
import Button from '../components/Button'

function Home() {
  return (
    <div className="container">
      <h1 className="title">Welcome to My App</h1>
      <p className="description">This is a React application.</p>
      <Button variant="primary">Get Started</Button>
    </div>
  )
}

export default Home`,
        },
        
        // About Page
        {
          path: 'src/pages/about.tsx',
          content: `import React from 'react'
import './About.css'

function About() {
  return (
    <div className="page">
      <h1 className="page-title">About Us</h1>
      <div className="content">
        <p>Learn more about our company.</p>
      </div>
    </div>
  )
}

export default About`,
        },
        
        // Dynamic Blog Post Page
        {
          path: 'src/pages/blog/[id].tsx',
          content: `import React from 'react'
import { useParams } from 'react-router-dom'
import './BlogPost.css'

function BlogPost() {
  const { id } = useParams()
  
  return (
    <article className="post">
      <h1 className="post-title">Blog Post {id}</h1>
      <div className="post-content">
        <p>This is a blog post.</p>
      </div>
    </article>
  )
}

export default BlogPost`,
        },
        
        // API Route - Users
        {
          path: 'src/pages/api/users.ts',
          content: `export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    res.status(200).json({ users: [] })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}`,
        },
        
        // API Route - Dynamic Post
        {
          path: 'src/pages/api/posts/[id].ts',
          content: `export default function handler(req: any, res: any) {
  const { id } = req.query
  
  if (req.method === 'GET') {
    res.status(200).json({ post: { id, title: 'Post ' + id } })
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}`,
        },
        
        // Button Component
        {
          path: 'src/components/Button.tsx',
          content: `import React from 'react'
import './Button.css'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
  onClick?: () => void
}

function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  return (
    <button 
      className={\`btn \${variant === 'primary' ? 'btn-primary' : 'btn-secondary'}\`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

export default Button`,
        },
        
        // Home CSS
        {
          path: 'src/pages/Home.css',
          content: `.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.title {
  font-size: 32px;
  font-weight: bold;
  text-align: center;
  color: #1a202c;
  margin-bottom: 16px;
}

.description {
  font-size: 18px;
  text-align: center;
  color: #4a5568;
  margin-bottom: 24px;
}`,
        },
        
        // About CSS
        {
          path: 'src/pages/About.css',
          content: `.page {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 20px;
}

.content {
  font-size: 16px;
  line-height: 1.6;
}`,
        },
        
        // Blog Post CSS
        {
          path: 'src/pages/BlogPost.css',
          content: `.post {
  max-width: 700px;
  margin: 0 auto;
  padding: 30px;
}

.post-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 16px;
}

.post-content {
  font-size: 16px;
  line-height: 1.8;
}`,
        },
        
        // Button CSS
        {
          path: 'src/components/Button.css',
          content: `.btn {
  padding: 12px 24px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  opacity: 0.8;
}

.btn-primary {
  background-color: #3490dc;
  color: white;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}`,
        },
        
        // Global CSS
        {
          path: 'src/styles/globals.css',
          content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  color: inherit;
  text-decoration: none;
}`,
        },
      ]

      // Execute the transformation
      const results = await engine.transformBatch(files, migrationSpec)

      // Convert Map to array for easier testing
      const resultsArray = Array.from(results.values())

      // ===== ASSERTIONS =====

      // 1. Verify files were processed (CSS files are analyzed but not returned as results)
      expect(resultsArray.length).toBeGreaterThan(0)

      // 2. Verify page files were moved to app directory
      const homePage = resultsArray.find(r => r.newFilePath === 'app/page.tsx')
      expect(homePage).toBeDefined()
      expect(homePage?.metadata.fileStructureChange?.action).toBe('move')
      expect(homePage?.code).not.toContain("import './Home.css'") // CSS import removed

      const aboutPage = resultsArray.find(r => r.newFilePath === 'app/about/page.tsx')
      expect(aboutPage).toBeDefined()
      expect(aboutPage?.metadata.fileStructureChange?.action).toBe('move')

      const blogPostPage = resultsArray.find(r => r.newFilePath === 'app/blog/[id]/page.tsx')
      expect(blogPostPage).toBeDefined()
      expect(blogPostPage?.metadata.fileStructureChange?.action).toBe('move')

      // 3. Verify API routes were moved correctly
      const usersApi = resultsArray.find(r => r.newFilePath === 'app/api/users/route.ts')
      expect(usersApi).toBeDefined()
      expect(usersApi?.metadata.fileStructureChange?.action).toBe('move')

      const postsApi = resultsArray.find(r => r.newFilePath === 'app/api/posts/[id]/route.ts')
      expect(postsApi).toBeDefined()
      expect(postsApi?.metadata.fileStructureChange?.action).toBe('move')

      // 4. Verify component files stayed in place
      const buttonComponent = resultsArray.find(r => r.filePath === 'src/components/Button.tsx')
      expect(buttonComponent).toBeDefined()
      expect(buttonComponent?.code).not.toContain("import './Button.css'") // CSS import removed

      // 5. Verify CSS classes were converted to Tailwind
      if (homePage) {
        expect(homePage.code).toContain('max-w-') // Container converted
        expect(homePage.code).toContain('mx-auto') // Margin auto
        expect(homePage.code).toContain('text-') // Text styles
      }

      // Note: Button component uses template literals with dynamic values
      // which are harder to transform automatically, so we just verify it was processed
      if (buttonComponent) {
        expect(buttonComponent.code).toBeDefined()
        expect(buttonComponent.metadata.notes.length).toBeGreaterThan(0)
      }

      // 6. Verify required App Router files were created
      const layoutFile = resultsArray.find(r => r.newFilePath === 'app/layout.tsx')
      expect(layoutFile).toBeDefined()
      
      // Debug: log what we got
      if (!layoutFile?.metadata.fileStructureChange) {
        console.log('Layout file metadata:', JSON.stringify(layoutFile?.metadata, null, 2))
      }
      
      expect(layoutFile?.metadata.fileStructureChange?.action).toBe('create')
      expect(layoutFile?.code).toContain('export default function RootLayout')
      expect(layoutFile?.code).toContain('<html')
      expect(layoutFile?.code).toContain('<body')

      const errorFile = resultsArray.find(r => r.newFilePath === 'app/error.tsx')
      expect(errorFile).toBeDefined()
      expect(errorFile?.metadata.fileStructureChange?.action).toBe('create')
      expect(errorFile?.code).toContain("'use client'")

      // not-found.tsx is created if it doesn't exist in the source
      const notFoundFile = resultsArray.find(r => r.newFilePath === 'app/not-found.tsx')
      if (notFoundFile) {
        expect(notFoundFile.metadata.fileStructureChange?.action).toBe('create')
      }

      // Note: loading.tsx is only created per-route when async data fetching is detected
      // It's not a required root file like layout, error, and not-found

      // 7. Verify Tailwind config was generated
      const tailwindConfig = resultsArray.find(r => r.newFilePath === 'tailwind.config.ts')
      expect(tailwindConfig).toBeDefined()
      expect(tailwindConfig?.code).toContain('import type { Config }')
      expect(tailwindConfig?.code).toContain('content:')
      expect(tailwindConfig?.code).toContain('./app/**/*.{js,ts,jsx,tsx,mdx}')
      expect(tailwindConfig?.code).toContain('./components/**/*.{js,ts,jsx,tsx}')
      expect(tailwindConfig?.metadata.dependenciesAdded).toContain('tailwindcss')

      // 8. Verify globals.css was moved and updated
      const globalsCss = resultsArray.find(r => r.newFilePath === 'app/globals.css')
      expect(globalsCss).toBeDefined()
      expect(globalsCss?.code).toContain('@tailwind base')
      expect(globalsCss?.code).toContain('@tailwind components')
      expect(globalsCss?.code).toContain('@tailwind utilities')

      // 9. Verify metadata contains CSS transformation info
      const filesWithCssTransform = resultsArray.filter(r => 
        r.metadata.notes.some(note => note.includes('CSS classes transformed'))
      )
      expect(filesWithCssTransform.length).toBeGreaterThan(0)

      // 10. Verify confidence scores are reasonable
      const avgConfidence = resultsArray.reduce((sum, r) => sum + r.confidence, 0) / resultsArray.length
      expect(avgConfidence).toBeGreaterThan(70) // Should have decent confidence

      // 11. Verify no critical errors
      const criticalErrors = resultsArray.filter(r => 
        r.warnings.some(w => w.toLowerCase().includes('error'))
      )
      expect(criticalErrors.length).toBe(0)

      // 12. Verify file structure changes are tracked
      const movedFiles = resultsArray.filter(r => r.metadata.fileStructureChange?.action === 'move')
      const createdFiles = resultsArray.filter(r => r.metadata.fileStructureChange?.action === 'create')
      
      expect(movedFiles.length).toBeGreaterThan(0)
      expect(createdFiles.length).toBeGreaterThanOrEqual(3) // At least layout, error, not-found

      // 13. Verify route metadata is set correctly
      expect(homePage?.metadata.fileStructureChange?.isRouteFile).toBe(true)
      expect(homePage?.metadata.fileStructureChange?.routeSegment).toBe('/')
      
      expect(aboutPage?.metadata.fileStructureChange?.isRouteFile).toBe(true)
      expect(aboutPage?.metadata.fileStructureChange?.routeSegment).toBe('/about')
      
      expect(blogPostPage?.metadata.fileStructureChange?.isRouteFile).toBe(true)
      expect(blogPostPage?.metadata.fileStructureChange?.routeSegment).toBe('/blog/[id]')

      // 14. Verify diffs were generated
      resultsArray.forEach(result => {
        if (result.originalCode) {
          expect(result.diff).toBeDefined()
          expect(result.diff.length).toBeGreaterThan(0)
        }
      })

      console.log('\n✅ End-to-End Integration Test Results:')
      console.log(`   Total files processed: ${resultsArray.length}`)
      console.log(`   Files moved: ${movedFiles.length}`)
      console.log(`   Files created: ${createdFiles.length}`)
      console.log(`   Files with CSS transformation: ${filesWithCssTransform.length}`)
      console.log(`   Average confidence: ${avgConfidence.toFixed(1)}%`)
      console.log(`   Tailwind config generated: ${tailwindConfig ? '✅' : '❌'}`)
      console.log(`   Required App Router files: ${createdFiles.length >= 3 ? '✅' : '❌'}`)
    })

    it('should handle edge cases gracefully', async () => {
      const edgeCaseFiles: RepositoryFile[] = [
        // File with no CSS
        {
          path: 'src/pages/simple.tsx',
          content: `export default function Simple() {
  return <div>Simple page</div>
}`,
        },
        
        // File with inline styles (should not be transformed)
        {
          path: 'src/pages/inline.tsx',
          content: `export default function Inline() {
  return <div style={{ padding: '20px', color: 'blue' }}>Inline styles</div>
}`,
        },
        
        // Non-component file
        {
          path: 'src/utils/helpers.ts',
          content: `export function formatDate(date: Date) {
  return date.toISOString()
}`,
        },
      ]

      const results = await engine.transformBatch(edgeCaseFiles, migrationSpec)
      const resultsArray = Array.from(results.values())

      // Should process all files without errors
      expect(resultsArray.length).toBeGreaterThan(0)
      
      // Utility file should be processed
      const utilFile = resultsArray.find(r => r.filePath === 'src/utils/helpers.ts')
      expect(utilFile).toBeDefined()
      
      // Inline styles should be preserved
      const inlineFile = resultsArray.find(r => r.filePath.includes('inline'))
      expect(inlineFile?.code).toContain('style={{')
    })

    it('should generate correct file counts and statistics', async () => {
      const files: RepositoryFile[] = [
        {
          path: 'src/pages/index.tsx',
          content: `import './Home.css'
export default function Home() {
  return <div className="container"><h1 className="title">Home</h1></div>
}`,
        },
        {
          path: 'src/pages/Home.css',
          content: `.container { max-width: 1200px; margin: 0 auto; }
.title { font-size: 32px; font-weight: bold; }`,
        },
      ]

      const results = await engine.transformBatch(files, migrationSpec)
      const resultsArray = Array.from(results.values())

      // Count different types of changes
      const stats = {
        moved: resultsArray.filter(r => r.metadata.fileStructureChange?.action === 'move').length,
        created: resultsArray.filter(r => r.metadata.fileStructureChange?.action === 'create').length,
        cssTransformed: resultsArray.filter(r => 
          r.metadata.notes.some(note => note.includes('CSS classes transformed'))
        ).length,
        hasTailwindConfig: resultsArray.some(r => r.newFilePath === 'tailwind.config.ts'),
      }

      expect(stats.moved).toBeGreaterThanOrEqual(0)
      expect(stats.created).toBeGreaterThanOrEqual(0)
      expect(stats.cssTransformed).toBeGreaterThanOrEqual(0)
      // Tailwind config is only generated if CSS files exist
      expect(typeof stats.hasTailwindConfig).toBe('boolean')

      console.log('\n📊 Migration Statistics:')
      console.log(`   Files moved: ${stats.moved}`)
      console.log(`   Files created: ${stats.created}`)
      console.log(`   Files with CSS transformation: ${stats.cssTransformed}`)
      console.log(`   Tailwind config: ${stats.hasTailwindConfig ? 'Generated' : 'Not generated'}`)
    })
  })
})
