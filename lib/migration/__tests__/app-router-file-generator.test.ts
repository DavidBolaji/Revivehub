/**
 * Tests for AppRouterFileGenerator
 */

import { describe, it, expect } from 'vitest'
import { AppRouterFileGenerator } from '../app-router-file-generator'
import type { MigrationSpecification } from '@/types/migration'

describe('AppRouterFileGenerator', () => {
  let generator: AppRouterFileGenerator
  let mockSpec: MigrationSpecification

  beforeEach(() => {
    generator = new AppRouterFileGenerator()
    
    mockSpec = {
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

  describe('generateRootLayout', () => {
    it('should generate basic root layout', () => {
      const layout = generator.generateRootLayout(mockSpec)

      expect(layout).toContain("import type { Metadata } from 'next'")
      expect(layout).toContain("import './globals.css'")
      expect(layout).toContain('export const metadata: Metadata')
      expect(layout).toContain('export default function RootLayout')
      expect(layout).toContain('<html lang="en">')
      expect(layout).toContain('<body>{children}</body>')
    })

    it('should include custom app name and description', () => {
      const layout = generator.generateRootLayout(mockSpec, {
        appName: 'My Custom App',
        description: 'Custom description',
      })

      expect(layout).toContain("title: 'My Custom App'")
      expect(layout).toContain("description: 'Custom description'")
    })

    it('should include analytics when requested', () => {
      const layout = generator.generateRootLayout(mockSpec, {
        includeAnalytics: true,
      })

      expect(layout).toContain("import { Analytics } from '@vercel/analytics/react'")
      expect(layout).toContain('<Analytics />')
    })

    it('should exclude metadata when requested', () => {
      const layout = generator.generateRootLayout(mockSpec, {
        includeMetadata: false,
      })

      expect(layout).not.toContain('export const metadata')
    })
  })

  describe('generateErrorBoundary', () => {
    it('should generate error boundary with use client directive', () => {
      const error = generator.generateErrorBoundary()

      expect(error).toContain("'use client'")
      expect(error).toContain('export default function Error')
      expect(error).toContain('error: Error & { digest?: string }')
      expect(error).toContain('reset: () => void')
      expect(error).toContain('useEffect')
      expect(error).toContain('console.error(error)')
      expect(error).toContain('onClick={() => reset()}')
    })

    it('should include error message display', () => {
      const error = generator.generateErrorBoundary()

      expect(error).toContain('{error.message}')
      expect(error).toContain('Something went wrong!')
    })

    it('should include reset button', () => {
      const error = generator.generateErrorBoundary()

      expect(error).toContain('Try again')
      expect(error).toContain('reset()')
    })
  })

  describe('generateLoading', () => {
    it('should generate loading component with spinner', () => {
      const loading = generator.generateLoading()

      expect(loading).toContain('export default function Loading')
      expect(loading).toContain('animate-spin')
      expect(loading).toContain('Loading...')
    })

    it('should include accessibility text', () => {
      const loading = generator.generateLoading()

      expect(loading).toContain('!absolute')
      expect(loading).toContain('!-m-px')
    })
  })

  describe('generateNotFound', () => {
    it('should generate 404 page', () => {
      const notFound = generator.generateNotFound()

      expect(notFound).toContain("import Link from 'next/link'")
      expect(notFound).toContain('export default function NotFound')
      expect(notFound).toContain('404')
      expect(notFound).toContain('Page Not Found')
    })

    it('should include home link', () => {
      const notFound = generator.generateNotFound()

      expect(notFound).toContain('href="/"')
      expect(notFound).toContain('Go Home')
    })
  })

  describe('generateGlobalsCss', () => {
    it('should generate globals.css with Tailwind directives', () => {
      const css = generator.generateGlobalsCss()

      expect(css).toContain('@tailwind base')
      expect(css).toContain('@tailwind components')
      expect(css).toContain('@tailwind utilities')
    })

    it('should include custom styles by default', () => {
      const css = generator.generateGlobalsCss()

      expect(css).toContain(':root')
      expect(css).toContain('--foreground-rgb')
      expect(css).toContain('prefers-color-scheme: dark')
    })

    it('should exclude custom styles when requested', () => {
      const css = generator.generateGlobalsCss(false)

      expect(css).not.toContain(':root')
      expect(css).not.toContain('--foreground-rgb')
    })
  })

  describe('generatePage', () => {
    it('should generate basic page component', () => {
      const page = generator.generatePage('Home')

      expect(page).toContain('export default function HomePage')
      expect(page).toContain('<h1')
      expect(page).toContain('Home')
    })

    it('should use custom page name', () => {
      const page = generator.generatePage('About')

      expect(page).toContain('AboutPage')
      expect(page).toContain('About')
    })
  })

  describe('generateApiRoute', () => {
    it('should generate API route with GET and POST handlers', () => {
      const route = generator.generateApiRoute()

      expect(route).toContain("import { NextRequest, NextResponse } from 'next/server'")
      expect(route).toContain('export async function GET')
      expect(route).toContain('export async function POST')
    })

    it('should include error handling', () => {
      const route = generator.generateApiRoute()

      expect(route).toContain('try {')
      expect(route).toContain('catch (error)')
      expect(route).toContain('status: 500')
    })

    it('should handle request body in POST', () => {
      const route = generator.generateApiRoute()

      expect(route).toContain('await request.json()')
    })
  })

  describe('generateMiddleware', () => {
    it('should generate middleware with matcher config', () => {
      const middleware = generator.generateMiddleware()

      expect(middleware).toContain("import { NextResponse } from 'next/server'")
      expect(middleware).toContain('export function middleware')
      expect(middleware).toContain('export const config')
      expect(middleware).toContain('matcher:')
    })

    it('should exclude common paths from matching', () => {
      const middleware = generator.generateMiddleware()

      expect(middleware).toContain('api')
      expect(middleware).toContain('_next/static')
      expect(middleware).toContain('_next/image')
      expect(middleware).toContain('favicon.ico')
    })
  })

  describe('generateRouteConfig', () => {
    it('should generate empty string when no options provided', () => {
      const config = generator.generateRouteConfig()

      expect(config).toBe('')
    })

    it('should generate dynamic config', () => {
      const config = generator.generateRouteConfig({ dynamic: 'force-dynamic' })

      expect(config).toContain("export const dynamic = 'force-dynamic'")
    })

    it('should generate revalidate config', () => {
      const config = generator.generateRouteConfig({ revalidate: 60 })

      expect(config).toContain('export const revalidate = 60')
    })

    it('should generate runtime config', () => {
      const config = generator.generateRouteConfig({ runtime: 'edge' })

      expect(config).toContain("export const runtime = 'edge'")
    })

    it('should generate multiple configs', () => {
      const config = generator.generateRouteConfig({
        dynamic: 'force-static',
        revalidate: 3600,
        runtime: 'nodejs',
      })

      expect(config).toContain("export const dynamic = 'force-static'")
      expect(config).toContain('export const revalidate = 3600')
      expect(config).toContain("export const runtime = 'nodejs'")
    })
  })
})
