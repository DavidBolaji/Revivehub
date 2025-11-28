/**
 * Tests for FileStructureManager
 */

import { describe, it, expect } from 'vitest'
import { FileStructureManager } from '../file-structure-manager'
import type { MigrationSpecification } from '@/types/migration'

describe('FileStructureManager', () => {
  const manager = new FileStructureManager()

  // Mock migration spec for Next.js App Router
  const nextjsAppRouterSpec: MigrationSpecification = {
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
    },
    metadata: {
      estimatedEffort: 'medium',
      breakingChanges: [],
      manualSteps: [],
    },
  }

  describe('planStructureChanges', () => {
    it('should plan page file moves', () => {
      const files = new Map([
        ['pages/index.tsx', 'export default function Home() {}'],
        ['pages/about.tsx', 'export default function About() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      // Find page changes
      const indexChange = changes.find(c => c.originalPath === 'pages/index.tsx')
      const aboutChange = changes.find(c => c.originalPath === 'pages/about.tsx')

      expect(indexChange).toBeDefined()
      expect(indexChange?.newPath).toBe('app/page.tsx')
      expect(indexChange?.action).toBe('move')
      expect(indexChange?.fileType).toBe('page')

      expect(aboutChange).toBeDefined()
      expect(aboutChange?.newPath).toBe('app/about/page.tsx')
      expect(aboutChange?.action).toBe('move')
    })

    it('should plan API route moves', () => {
      const files = new Map([
        ['pages/api/users.ts', 'export default function handler() {}'],
        ['pages/api/posts/[id].ts', 'export default function handler() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const usersChange = changes.find(c => c.originalPath === 'pages/api/users.ts')
      const postsChange = changes.find(c => c.originalPath === 'pages/api/posts/[id].ts')

      expect(usersChange?.newPath).toBe('app/api/users/route.ts')
      expect(usersChange?.fileType).toBe('api')

      expect(postsChange?.newPath).toBe('app/api/posts/[id]/route.ts')
    })

    it('should identify missing required files', () => {
      const files = new Map([
        ['pages/index.tsx', 'export default function Home() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      // Check for generated files
      const layoutChange = changes.find(c => c.newPath === 'app/layout.tsx')
      const errorChange = changes.find(c => c.newPath === 'app/error.tsx')
      const notFoundChange = changes.find(c => c.newPath === 'app/not-found.tsx')
      const globalsCssChange = changes.find(c => c.newPath === 'app/globals.css')

      expect(layoutChange).toBeDefined()
      expect(layoutChange?.action).toBe('create')
      expect(layoutChange?.fileType).toBe('layout')

      expect(errorChange).toBeDefined()
      expect(errorChange?.action).toBe('create')

      expect(notFoundChange).toBeDefined()
      expect(notFoundChange?.action).toBe('create')

      expect(globalsCssChange).toBeDefined()
      expect(globalsCssChange?.action).toBe('create')
    })

    it('should handle dynamic routes', () => {
      const files = new Map([
        ['pages/blog/[id].tsx', 'export default function BlogPost() {}'],
        ['pages/docs/[...slug].tsx', 'export default function Docs() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const blogChange = changes.find(c => c.originalPath === 'pages/blog/[id].tsx')
      const docsChange = changes.find(c => c.originalPath === 'pages/docs/[...slug].tsx')

      expect(blogChange?.newPath).toBe('app/blog/[id]/page.tsx')
      expect(docsChange?.newPath).toBe('app/docs/[...slug]/page.tsx')
    })

    it('should handle nested routes', () => {
      const files = new Map([
        ['pages/blog/posts/index.tsx', 'export default function Posts() {}'],
        ['pages/blog/posts/[id]/comments.tsx', 'export default function Comments() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const postsChange = changes.find(c => c.originalPath === 'pages/blog/posts/index.tsx')
      const commentsChange = changes.find(c => c.originalPath === 'pages/blog/posts/[id]/comments.tsx')

      expect(postsChange?.newPath).toBe('app/blog/posts/page.tsx')
      expect(commentsChange?.newPath).toBe('app/blog/posts/[id]/comments/page.tsx')
    })

    it('should handle globals.css move', () => {
      const files = new Map([
        ['styles/globals.css', '* { margin: 0; }'],
        ['pages/index.tsx', 'export default function Home() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const cssChange = changes.find(c => c.originalPath === 'styles/globals.css')

      expect(cssChange).toBeDefined()
      expect(cssChange?.newPath).toBe('app/globals.css')
      expect(cssChange?.action).toBe('move')
      expect(cssChange?.fileType).toBe('style')
    })

    it('should not change component files', () => {
      const files = new Map([
        ['components/Header.tsx', 'export function Header() {}'],
        ['components/Footer.tsx', 'export function Footer() {}'],
        ['pages/index.tsx', 'export default function Home() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      // Components should not have changes (they stay in place)
      const headerChange = changes.find(c => c.originalPath === 'components/Header.tsx')
      const footerChange = changes.find(c => c.originalPath === 'components/Footer.tsx')

      expect(headerChange).toBeUndefined()
      expect(footerChange).toBeUndefined()
    })

    it('should sort changes by dependency order', () => {
      const files = new Map([
        ['pages/index.tsx', 'export default function Home() {}'],
        ['pages/about.tsx', 'export default function About() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      // Layout should come before pages
      const layoutIndex = changes.findIndex(c => c.fileType === 'layout')
      const pageIndex = changes.findIndex(c => c.fileType === 'page')

      expect(layoutIndex).toBeLessThan(pageIndex)

      // Creates should come before moves
      const createIndex = changes.findIndex(c => c.action === 'create')
      const moveIndex = changes.findIndex(c => c.action === 'move')

      expect(createIndex).toBeLessThan(moveIndex)
    })

    it('should handle src prefix', () => {
      const files = new Map([
        ['src/pages/index.tsx', 'export default function Home() {}'],
        ['src/pages/about.tsx', 'export default function About() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const indexChange = changes.find(c => c.originalPath === 'src/pages/index.tsx')
      const aboutChange = changes.find(c => c.originalPath === 'src/pages/about.tsx')

      expect(indexChange?.newPath).toBe('app/page.tsx')
      expect(aboutChange?.newPath).toBe('app/about/page.tsx')
    })

    it('should set route metadata correctly', () => {
      const files = new Map([
        ['pages/blog/[id].tsx', 'export default function BlogPost() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const blogChange = changes.find(c => c.originalPath === 'pages/blog/[id].tsx')

      expect(blogChange?.metadata.isRouteFile).toBe(true)
      expect(blogChange?.metadata.routeSegment).toBe('blog/[id]')
    })

    it('should not generate files for non-Next.js targets', () => {
      const reactSpec: MigrationSpecification = {
        ...nextjsAppRouterSpec,
        target: {
          ...nextjsAppRouterSpec.target,
          framework: 'react',
          routing: 'react-router',
        },
      }

      const files = new Map([
        ['pages/index.tsx', 'export default function Home() {}'],
      ])

      const changes = manager.planStructureChanges(files, reactSpec)

      // Should not generate Next.js-specific files
      const layoutChange = changes.find(c => c.newPath === 'app/layout.tsx')
      const errorChange = changes.find(c => c.newPath === 'app/error.tsx')

      expect(layoutChange).toBeUndefined()
      expect(errorChange).toBeUndefined()
    })
  })

  describe('file type detection', () => {
    it('should detect page files', () => {
      const files = new Map([
        ['pages/index.tsx', 'export default function Home() {}'],
        ['pages/about.tsx', 'export default function About() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      changes.forEach(change => {
        if (change.originalPath.startsWith('pages/') && !change.originalPath.includes('/api/')) {
          expect(change.fileType).toBe('page')
        }
      })
    })

    it('should detect API files', () => {
      const files = new Map([
        ['pages/api/users.ts', 'export default function handler() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const apiChange = changes.find(c => c.originalPath === 'pages/api/users.ts')
      expect(apiChange?.fileType).toBe('api')
    })

    it('should detect style files', () => {
      const files = new Map([
        ['styles/globals.css', '* { margin: 0; }'],
        ['pages/index.tsx', 'export default function Home() {}'],
      ])

      const changes = manager.planStructureChanges(files, nextjsAppRouterSpec)

      const styleChange = changes.find(c => c.originalPath === 'styles/globals.css')
      expect(styleChange?.fileType).toBe('style')
    })
  })
})
