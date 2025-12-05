/**
 * App Router File Generator
 * 
 * Generates Next.js App Router specific files (layout, error, loading, not-found)
 * with proper TypeScript types and best practices.
 */

import type { MigrationSpecification } from '@/types/migration'

export interface FileGenerationOptions {
  appName?: string
  description?: string
  includeMetadata?: boolean
  includeAnalytics?: boolean
}

export class AppRouterFileGenerator {
  /**
   * Format code with proper indentation
   */
  private formatCode(code: string): string {
    // Remove extra blank lines and normalize indentation
    return code
      .split('\n')
      .map(line => line.trimEnd()) // Remove trailing whitespace
      .join('\n')
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .trim() + '\n' // Ensure file ends with newline
  }

  /**
   * Generate root layout.tsx
   */
  generateRootLayout(
    _spec: MigrationSpecification,
    options: FileGenerationOptions = {}
  ): string {
    const {
      appName = 'My App',
      description = 'Migrated to Next.js App Router',
      includeMetadata = true,
      includeAnalytics = false,
    } = options

    const imports = [
      "import type { Metadata } from 'next'",
      "import './globals.css'",
    ]

    if (includeAnalytics) {
      imports.push("import { Analytics } from '@vercel/analytics/react'")
    }

    const metadataBlock = includeMetadata
      ? `
export const metadata: Metadata = {
  title: '${appName}',
  description: '${description}',
}
`
      : ''

    const analyticsComponent = includeAnalytics
      ? '\n      <Analytics />'
      : ''

    const code = `${imports.join('\n')}
${metadataBlock}
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}${analyticsComponent}</body>
    </html>
  )
}
`
    return this.formatCode(code)
  }

  /**
   * Generate error.tsx
   */
  generateErrorBoundary(): string {
    const code = `'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
`
    return this.formatCode(code)
  }

  /**
   * Generate loading.tsx
   */
  generateLoading(): string {
    const code = `export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]">
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}
`
    return this.formatCode(code)
  }

  /**
   * Generate not-found.tsx
   */
  generateNotFound(): string {
    const code = `import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-6">
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go Home
        </Link>
      </div>
    </div>
  )
}
`
    return this.formatCode(code)
  }

  /**
   * Generate globals.css with Tailwind directives
   */
  generateGlobalsCss(includeCustomStyles: boolean = true): string {
    const customStyles = includeCustomStyles
      ? `
/* Custom global styles */
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
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
      : ''

    return `@tailwind base;
@tailwind components;
@tailwind utilities;
${customStyles}`
  }

  /**
   * Generate page.tsx template
   */
  generatePage(pageName: string = 'Home'): string {
    return `export default function ${pageName}Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">${pageName}</h1>
      <p className="text-gray-600">Welcome to your Next.js App Router application.</p>
    </main>
  )
}
`
  }

  /**
   * Generate API route handler
   */
  generateApiRoute(_routeName: string = 'handler'): string {
    return `import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Your GET logic here
    return NextResponse.json({ message: 'Success' })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Your POST logic here
    return NextResponse.json({ message: 'Created', data: body })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}
`
  }

  /**
   * Generate middleware.ts
   */
  generateMiddleware(): string {
    return `import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Add custom middleware logic here
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
`
  }

  /**
   * Generate route segment config
   */
  generateRouteConfig(options: {
    dynamic?: 'auto' | 'force-dynamic' | 'error' | 'force-static'
    revalidate?: number | false
    runtime?: 'nodejs' | 'edge'
  } = {}): string {
    const { dynamic, revalidate, runtime } = options

    const exports: string[] = []

    if (dynamic) {
      exports.push(`export const dynamic = '${dynamic}'`)
    }

    if (revalidate !== undefined) {
      exports.push(`export const revalidate = ${revalidate}`)
    }

    if (runtime) {
      exports.push(`export const runtime = '${runtime}'`)
    }

    return exports.length > 0 ? exports.join('\n') + '\n\n' : ''
  }

  /**
   * Generate tsconfig.json with Next.js and path alias configuration
   * 
   * This generates a TypeScript configuration that includes:
   * - Next.js recommended settings
   * - Path aliases (@/, @components/, @lib/, etc.)
   * - Strict type checking
   * - Modern ES features
   */
  generateTsConfig(_spec: MigrationSpecification): string {
    console.log('[AppRouterFileGenerator] Generating tsconfig.json with path aliases')
    
    const config = {
      compilerOptions: {
        // Next.js recommended settings
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        
        // Path aliases for clean imports
        baseUrl: ".",
        paths: {
          "@/*": ["./*"],
          "@components/*": ["components/*"],
          "@lib/*": ["lib/*"],
          "@app/*": ["app/*"],
          "@hooks/*": ["hooks/*"],
          "@context/*": ["context/*"],
          "@types/*": ["types/*"],
          "@utils/*": ["utils/*"],
          "@services/*": ["services/*"]
        },
        
        // Next.js specific
        plugins: [
          {
            name: "next"
          }
        ]
      },
      include: [
        "next-env.d.ts",
        "**/*.ts",
        "**/*.tsx",
        ".next/types/**/*.ts"
      ],
      exclude: [
        "node_modules"
      ]
    }

    console.log('[AppRouterFileGenerator] ✓ tsconfig.json generated with path aliases:', Object.keys(config.compilerOptions.paths))
    
    return JSON.stringify(config, null, 2) + '\n'
  }
}
